-- =====================================================
-- CITATION COMMENTS — commenti specifici per citazione
-- =====================================================
-- Tabella separata dai block_comments: i commenti qui
-- sono agganciati a una specifica citazione (highlight),
-- non al blocco intero.
-- =====================================================

-- Tabella commenti
CREATE TABLE IF NOT EXISTS citation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id UUID NOT NULL REFERENCES highlights(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citation_comments_highlight ON citation_comments(highlight_id, created_at);
CREATE INDEX IF NOT EXISTS idx_citation_comments_user ON citation_comments(user_id);

-- Contatore denormalizzato su highlights
ALTER TABLE highlights ADD COLUMN IF NOT EXISTS citation_comments_count INTEGER NOT NULL DEFAULT 0;

-- Trigger di mantenimento del contatore
CREATE OR REPLACE FUNCTION citation_comments_count_sync()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE highlights
      SET citation_comments_count = citation_comments_count + 1
      WHERE id = NEW.highlight_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE highlights
      SET citation_comments_count = GREATEST(0, citation_comments_count - 1)
      WHERE id = OLD.highlight_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_citation_comments_count ON citation_comments;
CREATE TRIGGER trg_citation_comments_count
AFTER INSERT OR DELETE ON citation_comments
FOR EACH ROW EXECUTE FUNCTION citation_comments_count_sync();

-- Backfill contatori per eventuali inserimenti pre-trigger
UPDATE highlights h
SET citation_comments_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT highlight_id, COUNT(*)::int AS cnt
  FROM citation_comments
  GROUP BY highlight_id
) sub
WHERE sub.highlight_id = h.id;

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE citation_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "citation_comments_select_all" ON citation_comments;
CREATE POLICY "citation_comments_select_all" ON citation_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "citation_comments_insert_own" ON citation_comments;
CREATE POLICY "citation_comments_insert_own" ON citation_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "citation_comments_delete_own" ON citation_comments;
CREATE POLICY "citation_comments_delete_own" ON citation_comments
  FOR DELETE USING (auth.uid() = user_id);
