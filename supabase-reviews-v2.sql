-- =====================================================
-- RECENSIONI v2: media pesata (recensioni 0.7 + voti blocco 0.3)
-- =====================================================
-- Due tipi di voto:
--  - reviews          : stelle + testo, sbloccata dopo N blocchi letti
--  - block_ratings    : stelle veloci a fine blocco
--
-- La media di un utente sui voti blocchi entra UNA VOLTA sola nel
-- calcolo (come media singola dell'utente).
-- =====================================================

-- Tabella voti per blocco (veloci, 1-5)
CREATE TABLE IF NOT EXISTS block_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, block_id)
);

CREATE INDEX IF NOT EXISTS idx_block_ratings_book ON block_ratings(book_id);
CREATE INDEX IF NOT EXISTS idx_block_ratings_user_book ON block_ratings(user_id, book_id);

ALTER TABLE books ADD COLUMN IF NOT EXISTS total_block_ratings INTEGER NOT NULL DEFAULT 0;

-- =====================================================
-- Funzione: ricalcola average_rating (formula pesata)
-- =====================================================
CREATE OR REPLACE FUNCTION recompute_book_rating(p_book_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_avg_reviews NUMERIC(5,2);
  v_cnt_reviews INT;
  v_avg_blocks  NUMERIC(5,2);
  v_cnt_block_users INT;
  v_final NUMERIC(3,2);
BEGIN
  SELECT AVG(stars)::NUMERIC(5,2), COUNT(*)::INT
    INTO v_avg_reviews, v_cnt_reviews
    FROM reviews WHERE book_id = p_book_id;

  SELECT AVG(u_avg)::NUMERIC(5,2), COUNT(*)::INT
    INTO v_avg_blocks, v_cnt_block_users
    FROM (
      SELECT AVG(stars)::NUMERIC(5,2) AS u_avg
      FROM block_ratings
      WHERE book_id = p_book_id
      GROUP BY user_id
    ) per_user;

  IF v_cnt_reviews > 0 AND v_cnt_block_users > 0 THEN
    v_final := (COALESCE(v_avg_reviews,0) * 0.7 + COALESCE(v_avg_blocks,0) * 0.3)::NUMERIC(3,2);
  ELSIF v_cnt_reviews > 0 THEN
    v_final := COALESCE(v_avg_reviews, 0)::NUMERIC(3,2);
  ELSIF v_cnt_block_users > 0 THEN
    v_final := COALESCE(v_avg_blocks, 0)::NUMERIC(3,2);
  ELSE
    v_final := 0;
  END IF;

  UPDATE books
    SET average_rating = v_final,
        total_reviews = COALESCE(v_cnt_reviews, 0),
        total_block_ratings = COALESCE((SELECT COUNT(*) FROM block_ratings WHERE book_id = p_book_id), 0),
        updated_at = NOW()
  WHERE id = p_book_id;
END;
$$;

-- Trigger su reviews (rimpiazza quello precedente)
CREATE OR REPLACE FUNCTION reviews_trigger_recompute()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM recompute_book_rating(COALESCE(NEW.book_id, OLD.book_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_stats ON reviews;
DROP TRIGGER IF EXISTS trg_reviews_recompute ON reviews;
CREATE TRIGGER trg_reviews_recompute
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION reviews_trigger_recompute();

-- Trigger su block_ratings
CREATE OR REPLACE FUNCTION block_ratings_trigger_recompute()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM recompute_book_rating(COALESCE(NEW.book_id, OLD.book_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_block_ratings_recompute ON block_ratings;
CREATE TRIGGER trg_block_ratings_recompute
AFTER INSERT OR UPDATE OR DELETE ON block_ratings
FOR EACH ROW EXECUTE FUNCTION block_ratings_trigger_recompute();

-- touch updated_at
CREATE OR REPLACE FUNCTION block_ratings_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_block_ratings_touch ON block_ratings;
CREATE TRIGGER trg_block_ratings_touch
BEFORE UPDATE ON block_ratings
FOR EACH ROW EXECUTE FUNCTION block_ratings_touch_updated_at();

-- Backfill: ricalcola tutti i libri che hanno almeno una review o un block_rating
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT DISTINCT book_id FROM reviews
    UNION
    SELECT DISTINCT book_id FROM block_ratings
  ) LOOP
    PERFORM recompute_book_rating(r.book_id);
  END LOOP;
END $$;

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE block_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "block_ratings_select_all" ON block_ratings;
CREATE POLICY "block_ratings_select_all" ON block_ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "block_ratings_insert_own" ON block_ratings;
CREATE POLICY "block_ratings_insert_own" ON block_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "block_ratings_update_own" ON block_ratings;
CREATE POLICY "block_ratings_update_own" ON block_ratings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "block_ratings_delete_own" ON block_ratings;
CREATE POLICY "block_ratings_delete_own" ON block_ratings
  FOR DELETE USING (auth.uid() = user_id);
