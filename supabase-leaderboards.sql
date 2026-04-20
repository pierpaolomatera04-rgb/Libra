-- ============================================================
-- LEADERBOARDS — RPC functions per /classifica
-- Tutte le funzioni ritornano SETOF jsonb per semplificare il client.
-- Limit default 20. SECURITY DEFINER per aggregare dati pubblici.
-- ============================================================

-- ============================================
-- BOOKS — Più letti
-- Ordina per books.total_reads, tiebreaker = lettori attivi
-- (user_library.status='reading').
-- ============================================
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

-- ============================================
-- BOOKS — Più votati
-- Ordina per total_likes, tiebreaker total_comments.
-- ============================================
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

-- ============================================
-- BOOKS — In tendenza (7gg)
-- score = reads7*0.4 + likes7*0.3 + new_readers7*0.2 + active_boost*0.1
-- ============================================
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

-- ============================================
-- BOOKS — Nuovi (ultimi 30gg)
-- ============================================
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

-- ============================================
-- BOOKS — Serializzazioni (status='ongoing')
-- Ordina per lettori attivi con blocchi non ancora letti.
-- "blocchi non letti" = total_blocks del libro > blocchi letti da quell'utente
-- (user_library.status='reading' con progress < 100).
-- ============================================
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


-- ============================================
-- AUTHORS — Più seguiti (follower + tiebreaker total_reads)
-- ============================================
CREATE OR REPLACE FUNCTION public.leaderboard_authors_followers(p_limit INTEGER DEFAULT 20)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
    fol AS (
      SELECT following_id, COUNT(*)::INTEGER AS follower_count
      FROM public.follows
      GROUP BY following_id
    ),
    reads AS (
      SELECT author_id, COALESCE(SUM(total_reads),0)::BIGINT AS total_reads
      FROM public.books
      WHERE status IN ('published','ongoing','completed')
      GROUP BY author_id
    ),
    bcount AS (
      SELECT author_id, COUNT(*)::INTEGER AS books_count
      FROM public.books
      WHERE status IN ('published','ongoing','completed')
      GROUP BY author_id
    )
  SELECT to_jsonb(t.*) FROM (
    SELECT
      p.id, p.name, p.username, p.avatar_url, p.author_pseudonym, p.total_xp,
      COALESCE(fol.follower_count,0) AS follower_count,
      COALESCE(reads.total_reads,0) AS total_reads,
      COALESCE(bcount.books_count,0) AS books_count
    FROM public.profiles p
    LEFT JOIN fol ON fol.following_id = p.id
    LEFT JOIN reads ON reads.author_id = p.id
    LEFT JOIN bcount ON bcount.author_id = p.id
    WHERE p.is_author = TRUE AND COALESCE(fol.follower_count,0) > 0
    ORDER BY COALESCE(fol.follower_count,0) DESC, COALESCE(reads.total_reads,0) DESC
    LIMIT p_limit
  ) t;
$$;

-- ============================================
-- AUTHORS — Più letti (somma pagine lette su tutti i libri)
-- ============================================
CREATE OR REPLACE FUNCTION public.leaderboard_authors_reads(p_limit INTEGER DEFAULT 20)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
    reads AS (
      SELECT author_id,
        COALESCE(SUM(total_reads),0)::BIGINT AS total_reads,
        COUNT(*)::INTEGER AS books_count
      FROM public.books
      WHERE status IN ('published','ongoing','completed')
      GROUP BY author_id
    ),
    fol AS (
      SELECT following_id, COUNT(*)::INTEGER AS follower_count
      FROM public.follows
      GROUP BY following_id
    )
  SELECT to_jsonb(t.*) FROM (
    SELECT
      p.id, p.name, p.username, p.avatar_url, p.author_pseudonym, p.total_xp,
      COALESCE(fol.follower_count,0) AS follower_count,
      COALESCE(reads.total_reads,0) AS total_reads,
      COALESCE(reads.books_count,0) AS books_count
    FROM public.profiles p
    JOIN reads ON reads.author_id = p.id
    LEFT JOIN fol ON fol.following_id = p.id
    WHERE p.is_author = TRUE AND COALESCE(reads.total_reads,0) > 0
    ORDER BY reads.total_reads DESC
    LIMIT p_limit
  ) t;
$$;

-- ============================================
-- AUTHORS — Più attivi (blocchi pubblicati ultimi 30gg)
-- Tiebreaker: data ultimo blocco pubblicato (più recente vince).
-- ============================================
CREATE OR REPLACE FUNCTION public.leaderboard_authors_active(p_limit INTEGER DEFAULT 20)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH activity AS (
    SELECT b.author_id,
      COUNT(*)::INTEGER AS blocks_30d,
      MAX(bl.released_at) AS last_block_at
    FROM public.blocks bl
    JOIN public.books b ON b.id = bl.book_id
    WHERE bl.released_at >= NOW() - INTERVAL '30 days'
      AND bl.is_released = TRUE
    GROUP BY b.author_id
  ),
  fol AS (
    SELECT following_id, COUNT(*)::INTEGER AS follower_count
    FROM public.follows GROUP BY following_id
  )
  SELECT to_jsonb(t.*) FROM (
    SELECT
      p.id, p.name, p.username, p.avatar_url, p.author_pseudonym, p.total_xp,
      a.blocks_30d, a.last_block_at,
      COALESCE(fol.follower_count,0) AS follower_count
    FROM public.profiles p
    JOIN activity a ON a.author_id = p.id
    LEFT JOIN fol ON fol.following_id = p.id
    WHERE p.is_author = TRUE
    ORDER BY a.blocks_30d DESC, a.last_block_at DESC NULLS LAST
    LIMIT p_limit
  ) t;
$$;

-- ============================================
-- AUTHORS — Nuovi (registrati ultimi 30gg, ordinati per follower)
-- ============================================
CREATE OR REPLACE FUNCTION public.leaderboard_authors_new(p_limit INTEGER DEFAULT 20)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH fol AS (
    SELECT following_id, COUNT(*)::INTEGER AS follower_count
    FROM public.follows GROUP BY following_id
  )
  SELECT to_jsonb(t.*) FROM (
    SELECT
      p.id, p.name, p.username, p.avatar_url, p.author_pseudonym, p.total_xp,
      p.created_at,
      COALESCE(fol.follower_count,0) AS follower_count
    FROM public.profiles p
    LEFT JOIN fol ON fol.following_id = p.id
    WHERE p.is_author = TRUE
      AND p.created_at >= NOW() - INTERVAL '30 days'
    ORDER BY COALESCE(fol.follower_count,0) DESC, p.created_at DESC
    LIMIT p_limit
  ) t;
$$;


-- ============================================
-- COMMUNITY — Top XP (solo utenti con XP > 0)
-- ============================================
CREATE OR REPLACE FUNCTION public.leaderboard_community_xp(p_limit INTEGER DEFAULT 20)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(t.*) FROM (
    SELECT
      p.id, p.name, p.username, p.avatar_url,
      p.total_xp, p.daily_streak
    FROM public.profiles p
    WHERE COALESCE(p.total_xp,0) > 0
    ORDER BY p.total_xp DESC NULLS LAST
    LIMIT p_limit
  ) t;
$$;

-- ============================================
-- COMMUNITY — Più attivi (comments + highlight_reshares + likes ultimi 30gg)
-- Tiebreaker: più commenti.
-- ============================================
CREATE OR REPLACE FUNCTION public.leaderboard_community_active(p_limit INTEGER DEFAULT 20)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
    c AS (
      SELECT user_id, COUNT(*)::INTEGER AS comments_30d
      FROM public.comments
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY user_id
    ),
    l AS (
      SELECT user_id, COUNT(*)::INTEGER AS likes_30d
      FROM public.likes
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY user_id
    ),
    s AS (
      SELECT user_id, COUNT(*)::INTEGER AS shares_30d
      FROM public.highlight_reshares
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY user_id
    )
  SELECT to_jsonb(t.*) FROM (
    SELECT
      p.id, p.name, p.username, p.avatar_url,
      p.total_xp, p.daily_streak,
      COALESCE(c.comments_30d,0) AS comments_30d,
      COALESCE(l.likes_30d,0) AS likes_30d,
      COALESCE(s.shares_30d,0) AS shares_30d,
      (COALESCE(c.comments_30d,0) + COALESCE(l.likes_30d,0) + COALESCE(s.shares_30d,0)) AS activity_total
    FROM public.profiles p
    LEFT JOIN c ON c.user_id = p.id
    LEFT JOIN l ON l.user_id = p.id
    LEFT JOIN s ON s.user_id = p.id
    WHERE (
      COALESCE(c.comments_30d,0) +
      COALESCE(l.likes_30d,0) +
      COALESCE(s.shares_30d,0)
    ) > 0
    ORDER BY activity_total DESC, COALESCE(c.comments_30d,0) DESC
    LIMIT p_limit
  ) t;
$$;

-- ============================================
-- COMMUNITY — Top donatori (solo PURCHASED_TOKEN come mance)
-- Join token_transactions (book_id NULL = mancia) con donations per
-- contare autori distinti.
-- ============================================
CREATE OR REPLACE FUNCTION public.leaderboard_community_donors(p_limit INTEGER DEFAULT 20)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
    donors AS (
      SELECT user_id, COALESCE(SUM(tokens_spent),0)::BIGINT AS tokens_donated
      FROM public.token_transactions
      WHERE book_id IS NULL
        AND token_type = 'PURCHASED_TOKEN'
      GROUP BY user_id
    ),
    authors AS (
      SELECT donor_id, COUNT(DISTINCT author_id)::INTEGER AS authors_count
      FROM public.donations
      GROUP BY donor_id
    )
  SELECT to_jsonb(t.*) FROM (
    SELECT
      p.id, p.name, p.username, p.avatar_url,
      p.total_xp,
      d.tokens_donated,
      COALESCE(a.authors_count,0) AS authors_count
    FROM public.profiles p
    JOIN donors d ON d.user_id = p.id
    LEFT JOIN authors a ON a.donor_id = p.id
    WHERE d.tokens_donated > 0
    ORDER BY d.tokens_donated DESC
    LIMIT p_limit
  ) t;
$$;


-- ============================================
-- GRANTS
-- ============================================
GRANT EXECUTE ON FUNCTION public.leaderboard_books_reads(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_books_likes(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_books_trending(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_books_new(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_books_serializing(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_authors_followers(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_authors_reads(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_authors_active(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_authors_new(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_community_xp(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_community_active(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_community_donors(INTEGER) TO anon, authenticated;
