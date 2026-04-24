-- =====================================================
-- SISTEMA RECENSIONI — stars (1-5) + testo opzionale
-- =====================================================
-- Solo chi ha letto almeno un blocco può recensire (vincolo
-- applicato lato app; qui la tabella è aperta via RLS a
-- utenti autenticati che inseriscono con user_id = auth.uid()).
-- Un utente può avere al massimo UNA recensione per libro
-- (unique constraint). Gli update aggiornano il voto.
-- =====================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  text TEXT CHECK (text IS NULL OR char_length(text) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_book ON reviews(book_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

-- Aggiungi colonne statistiche su books (se mancanti)
ALTER TABLE books ADD COLUMN IF NOT EXISTS total_reviews INTEGER NOT NULL DEFAULT 0;
-- `average_rating` e `total_comments` esistono già dallo schema base

-- Lettori unici (distinct user_id in block_reads)
ALTER TABLE books ADD COLUMN IF NOT EXISTS unique_readers INTEGER NOT NULL DEFAULT 0;

-- =====================================================
-- TRIGGER: mantieni books.average_rating e total_reviews
-- =====================================================
CREATE OR REPLACE FUNCTION reviews_stats_sync()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_book_id UUID;
BEGIN
  v_book_id := COALESCE(NEW.book_id, OLD.book_id);
  UPDATE books b
  SET
    total_reviews = COALESCE((SELECT COUNT(*) FROM reviews WHERE book_id = v_book_id), 0),
    average_rating = COALESCE((SELECT AVG(stars)::NUMERIC(3,2) FROM reviews WHERE book_id = v_book_id), 0),
    updated_at = NOW()
  WHERE b.id = v_book_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_stats ON reviews;
CREATE TRIGGER trg_reviews_stats
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION reviews_stats_sync();

-- Aggiorna updated_at su modifica
CREATE OR REPLACE FUNCTION reviews_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_touch ON reviews;
CREATE TRIGGER trg_reviews_touch
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION reviews_touch_updated_at();

-- =====================================================
-- TRIGGER: mantieni books.unique_readers
-- Incrementa solo quando un user_id legge il libro per la PRIMA volta
-- =====================================================
CREATE OR REPLACE FUNCTION unique_readers_sync()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM block_reads
      WHERE user_id = NEW.user_id AND book_id = NEW.book_id AND id <> NEW.id
    ) THEN
      UPDATE books SET unique_readers = unique_readers + 1 WHERE id = NEW.book_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM block_reads
      WHERE user_id = OLD.user_id AND book_id = OLD.book_id
    ) THEN
      UPDATE books SET unique_readers = GREATEST(0, unique_readers - 1) WHERE id = OLD.book_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_unique_readers ON block_reads;
CREATE TRIGGER trg_unique_readers
AFTER INSERT OR DELETE ON block_reads
FOR EACH ROW EXECUTE FUNCTION unique_readers_sync();

-- Backfill unique_readers per i libri esistenti
UPDATE books b
SET unique_readers = COALESCE(sub.cnt, 0)
FROM (
  SELECT book_id, COUNT(DISTINCT user_id)::INT AS cnt
  FROM block_reads
  GROUP BY book_id
) sub
WHERE b.id = sub.book_id;

-- Backfill total_reviews/average_rating
UPDATE books b
SET
  total_reviews = COALESCE(sub.cnt, 0),
  average_rating = COALESCE(sub.avg_rating, 0)
FROM (
  SELECT book_id, COUNT(*)::INT AS cnt, AVG(stars)::NUMERIC(3,2) AS avg_rating
  FROM reviews
  GROUP BY book_id
) sub
WHERE b.id = sub.book_id;

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
CREATE POLICY "reviews_delete_own" ON reviews
  FOR DELETE USING (auth.uid() = user_id);
