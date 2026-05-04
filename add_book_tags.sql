-- =====================================================================
-- Hashtag (tags) sui libri
--
-- - Colonna `tags TEXT[]` su books, sempre lowercased dal client.
-- - Indice GIN per ricerca per array (operatori @>, &&, ANY).
-- - RPC `get_popular_tags(prefix, max_results)` per autocomplete:
--     restituisce i tag piu' usati (con conteggio) eventualmente
--     filtrati per prefisso (case-insensitive).
-- Idempotente: eseguibile piu' volte.
-- =====================================================================

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS books_tags_gin
  ON public.books USING GIN (tags);

CREATE OR REPLACE FUNCTION public.get_popular_tags(
  p_prefix TEXT DEFAULT '',
  p_limit  INT  DEFAULT 8
)
RETURNS TABLE (tag TEXT, usage_count BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT t AS tag, COUNT(*) AS usage_count
  FROM public.books b, UNNEST(b.tags) AS t
  WHERE b.tags IS NOT NULL
    AND array_length(b.tags, 1) > 0
    AND (p_prefix = '' OR t ILIKE (p_prefix || '%'))
  GROUP BY t
  ORDER BY usage_count DESC, t ASC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_popular_tags(TEXT, INT) TO anon, authenticated;
