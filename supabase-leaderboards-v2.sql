-- =====================================================
-- Leaderboard libri v2 — aggiunge average_rating e unique_readers
-- Eseguire su Supabase SQL Editor
-- =====================================================

-- BOOKS — Più letti
CREATE OR REPLACE FUNCTION public.leaderboard_books_reads(p_limit INTEGER DEFAULT 20)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active AS (
    SELECT book_id, COUNT(*)::INTEGER AS active_readers
    FROM public.user_library
    WHERE status = 'reading'
    GROUP BY book_id
  )
  SELECT to_jsonb(t.*) FROM (
    SELECT
      b.id, b.title, b.cover_image_url, b.status,
      b.total_reads, b.total_likes, b.total_comments,
      COALESCE(b.average_rating, 0) AS average_rating,
      COALESCE(b.unique_readers, 0) AS unique_readers,
      COALESCE(a.active_readers, 0) AS active_readers,
      jsonb_build_object(
        'id', p.id, 'name', p.name, 'username', p.username,
        'author_pseudonym', p.author_pseudonym
      ) AS author
    FROM public.books b
    LEFT JOIN active a ON a.book_id = b.id
    LEFT JOIN public.profiles p ON p.id = b.author_id
    WHERE b.status IN ('published','ongoing','completed')
    ORDER BY b.total_reads DESC NULLS LAST, COALESCE(a.active_readers,0) DESC
    LIMIT p_limit
  ) t;
$$;

-- BOOKS — Più votati
CREATE OR REPLACE FUNCTION public.leaderboard_books_likes(p_limit INTEGER DEFAULT 20)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(t.*) FROM (
    SELECT
      b.id, b.title, b.cover_image_url, b.status,
      b.total_reads, b.total_likes, b.total_comments,
      COALESCE(b.average_rating, 0) AS average_rating,
      COALESCE(b.unique_readers, 0) AS unique_readers,
      jsonb_build_object(
        'id', p.id, 'name', p.name, 'username', p.username,
        'author_pseudonym', p.author_pseudonym
      ) AS author
    FROM public.books b
    LEFT JOIN public.profiles p ON p.id = b.author_id
    WHERE b.status IN ('published','ongoing','completed')
    ORDER BY b.total_likes DESC NULLS LAST, b.total_comments DESC NULLS LAST
    LIMIT p_limit
  ) t;
$$;

-- BOOKS — In tendenza (7gg)
CREATE OR REPLACE FUNCTION public.leaderboard_books_trending(p_limit INTEGER DEFAULT 20)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
    r7 AS (
      SELECT book_id, COUNT(*)::INTEGER AS reads7
      FROM public.block_reads
      WHERE read_at >= NOW() - INTERVAL '7 days'
      GROUP BY book_id
    ),
    l7 AS (
      SELECT book_id, COUNT(*)::INTEGER AS likes7
      FROM public.likes
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY book_id
    ),
    nr7 AS (
      SELECT book_id, COUNT(DISTINCT user_id)::INTEGER AS new_readers7
      FROM public.user_library
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY book_id
    ),
    boost AS (
      SELECT book_id, 1 AS is_boosted
      FROM public.author_boosts
      WHERE expires_at > NOW()
      GROUP BY book_id
    )
  SELECT to_jsonb(t.*) FROM (
    SELECT
      b.id, b.title, b.cover_image_url, b.status,
      b.total_reads, b.total_likes, b.total_comments,
      COALESCE(b.average_rating, 0) AS average_rating,
      COALESCE(b.unique_readers, 0) AS unique_readers,
      COALESCE(r7.reads7,0) AS reads7,
      COALESCE(l7.likes7,0) AS likes7,
      COALESCE(nr7.new_readers7,0) AS new_readers7,
      COALESCE(boost.is_boosted,0) AS is_boosted,
      ROUND((
        COALESCE(r7.reads7,0) * 0.4 +
        COALESCE(l7.likes7,0) * 0.3 +
        COALESCE(nr7.new_readers7,0) * 0.2 +
        COALESCE(boost.is_boosted,0) * 0.1
      )::NUMERIC, 2) AS trending_score_7d,
      jsonb_build_object(
        'id', p.id, 'name', p.name, 'username', p.username,
        'author_pseudonym', p.author_pseudonym
      ) AS author
    FROM public.books b
    LEFT JOIN r7 ON r7.book_id = b.id
    LEFT JOIN l7 ON l7.book_id = b.id
    LEFT JOIN nr7 ON nr7.book_id = b.id
    LEFT JOIN boost ON boost.book_id = b.id
    LEFT JOIN public.profiles p ON p.id = b.author_id
    WHERE b.status IN ('published','ongoing','completed')
      AND (
        COALESCE(r7.reads7,0) +
        COALESCE(l7.likes7,0) +
        COALESCE(nr7.new_readers7,0) +
        COALESCE(boost.is_boosted,0)
      ) > 0
    ORDER BY trending_score_7d DESC NULLS LAST
    LIMIT p_limit
  ) t;
$$;

-- BOOKS — Nuovi (ultimi 30gg)
CREATE OR REPLACE FUNCTION public.leaderboard_books_new(p_limit INTEGER DEFAULT 20)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(t.*) FROM (
    SELECT
      b.id, b.title, b.cover_image_url, b.status,
      b.total_reads, b.total_likes, b.total_comments,
      COALESCE(b.average_rating, 0) AS average_rating,
      COALESCE(b.unique_readers, 0) AS unique_readers,
      b.published_at,
      jsonb_build_object(
        'id', p.id, 'name', p.name, 'username', p.username,
        'author_pseudonym', p.author_pseudonym
      ) AS author
    FROM public.books b
    LEFT JOIN public.profiles p ON p.id = b.author_id
    WHERE b.status IN ('published','ongoing','completed')
      AND b.published_at IS NOT NULL
      AND b.published_at >= NOW() - INTERVAL '30 days'
    ORDER BY b.published_at DESC
    LIMIT p_limit
  ) t;
$$;

-- BOOKS — Serializzazioni (status='ongoing')
CREATE OR REPLACE FUNCTION public.leaderboard_books_serializing(p_limit INTEGER DEFAULT 20)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_followers AS (
    SELECT ul.book_id, COUNT(DISTINCT ul.user_id)::INTEGER AS followers
    FROM public.user_library ul
    WHERE ul.status = 'reading'
      AND COALESCE(ul.progress_percentage, 0) < 100
    GROUP BY ul.book_id
  )
  SELECT to_jsonb(t.*) FROM (
    SELECT
      b.id, b.title, b.cover_image_url, b.status,
      b.total_reads, b.total_likes, b.total_comments,
      COALESCE(b.average_rating, 0) AS average_rating,
      COALESCE(b.unique_readers, 0) AS unique_readers,
      b.total_blocks,
      COALESCE(af.followers, 0) AS active_followers,
      jsonb_build_object(
        'id', p.id, 'name', p.name, 'username', p.username,
        'author_pseudonym', p.author_pseudonym
      ) AS author
    FROM public.books b
    LEFT JOIN active_followers af ON af.book_id = b.id
    LEFT JOIN public.profiles p ON p.id = b.author_id
    WHERE b.status = 'ongoing'
    ORDER BY COALESCE(af.followers,0) DESC, b.total_reads DESC NULLS LAST
    LIMIT p_limit
  ) t;
$$;
