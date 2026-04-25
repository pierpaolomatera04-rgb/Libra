-- =====================================================
-- Leaderboard autori v4 — campi aggiuntivi per metriche contestuali
-- =====================================================

-- AUTHORS — Più attivi: aggiunge total_reads e books_count
-- (ordinamento invariato: per blocks_30d DESC)
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
  ),
  reads AS (
    SELECT author_id,
      COALESCE(SUM(total_reads),0)::BIGINT AS total_reads,
      COUNT(*)::INTEGER AS books_count
    FROM public.books
    WHERE status IN ('published','ongoing','completed')
    GROUP BY author_id
  )
  SELECT to_jsonb(t.*) FROM (
    SELECT
      p.id, p.name, p.username, p.avatar_url, p.author_pseudonym, p.total_xp,
      a.blocks_30d, a.last_block_at,
      COALESCE(fol.follower_count,0) AS follower_count,
      COALESCE(reads.total_reads,0) AS total_reads,
      COALESCE(reads.books_count,0) AS books_count
    FROM public.profiles p
    JOIN activity a ON a.author_id = p.id
    LEFT JOIN fol ON fol.following_id = p.id
    LEFT JOIN reads ON reads.author_id = p.id
    WHERE p.is_author = TRUE
    ORDER BY a.blocks_30d DESC, a.last_block_at DESC NULLS LAST
    LIMIT p_limit
  ) t;
$$;

-- AUTHORS — Nuovi: aggiunge total_reads e books_count
CREATE OR REPLACE FUNCTION public.leaderboard_authors_new(p_limit INTEGER DEFAULT 20)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH fol AS (
    SELECT following_id, COUNT(*)::INTEGER AS follower_count
    FROM public.follows GROUP BY following_id
  ),
  reads AS (
    SELECT author_id,
      COALESCE(SUM(total_reads),0)::BIGINT AS total_reads,
      COUNT(*)::INTEGER AS books_count
    FROM public.books
    WHERE status IN ('published','ongoing','completed')
    GROUP BY author_id
  )
  SELECT to_jsonb(t.*) FROM (
    SELECT
      p.id, p.name, p.username, p.avatar_url, p.author_pseudonym, p.total_xp,
      p.created_at,
      COALESCE(fol.follower_count,0) AS follower_count,
      COALESCE(reads.total_reads,0) AS total_reads,
      COALESCE(reads.books_count,0) AS books_count
    FROM public.profiles p
    LEFT JOIN fol ON fol.following_id = p.id
    LEFT JOIN reads ON reads.author_id = p.id
    WHERE p.is_author = TRUE
      AND p.created_at >= NOW() - INTERVAL '30 days'
    ORDER BY COALESCE(fol.follower_count,0) DESC, p.created_at DESC
    LIMIT p_limit
  ) t;
$$;
