-- ============================================
-- PAGES READ TRACKING
-- Aggiunge colonna pages_read a profiles, trigger automatico, backfill
-- Esegui in Supabase SQL Editor
-- ============================================

-- 1. COLONNA pages_read SU PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pages_read INTEGER DEFAULT 0;

-- 2. FUNZIONE RICALCOLO
-- Conta le pagine: 1 pagina ogni ~300 parole, minimo 1 pagina per blocco letto
CREATE OR REPLACE FUNCTION recalc_user_pages_read(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    GREATEST(
      1,
      CEIL(
        array_length(
          regexp_split_to_array(COALESCE(b.content, ''), '\s+'),
          1
        )::numeric / 300
      )::int
    )
  ), 0)::int
  INTO total
  FROM block_reads br
  JOIN blocks b ON b.id = br.block_id
  WHERE br.user_id = p_user_id AND br.read_completed = true;

  UPDATE profiles SET pages_read = total WHERE id = p_user_id;
  RETURN total;
END;
$$;

-- 3. TRIGGER AUTOMATICO
-- Quando block_reads viene inserito o read_completed cambia, ricalcola
CREATE OR REPLACE FUNCTION trg_block_reads_update_pages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM recalc_user_pages_read(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_reads_pages_trigger ON block_reads;
CREATE TRIGGER block_reads_pages_trigger
AFTER INSERT OR UPDATE OF read_completed ON block_reads
FOR EACH ROW
EXECUTE FUNCTION trg_block_reads_update_pages();

-- 4. BACKFILL UTENTI ESISTENTI
-- Ricalcola pages_read per tutti gli utenti che hanno gia letto blocchi
DO $$
DECLARE
  uid UUID;
BEGIN
  FOR uid IN SELECT DISTINCT user_id FROM block_reads WHERE read_completed = true LOOP
    PERFORM recalc_user_pages_read(uid);
  END LOOP;
END $$;

-- 5. VERIFICA
-- Mostra i top 10 lettori per pagine lette
SELECT id, username, name, pages_read
FROM profiles
WHERE pages_read > 0
ORDER BY pages_read DESC
LIMIT 10;
