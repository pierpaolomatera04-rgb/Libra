-- ============================================================
-- Aggiunge la colonna published_blocks alla tabella books
-- e la mantiene aggiornata automaticamente via trigger sui blocks
-- Esegui nel Supabase SQL Editor (una volta sola)
-- ============================================================

-- 1. Aggiunge la colonna (se non esiste già)
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS published_blocks integer NOT NULL DEFAULT 0;

-- 2. Popola i valori esistenti contando i blocchi rilasciati
UPDATE books b
SET published_blocks = (
  SELECT COUNT(*)::integer
  FROM blocks bl
  WHERE bl.book_id = b.id
    AND bl.is_released = true
);

-- 3. Funzione trigger che aggiorna il contatore al cambiare dei blocchi
CREATE OR REPLACE FUNCTION fn_sync_published_blocks()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_released = true THEN
      UPDATE books SET published_blocks = published_blocks + 1 WHERE id = NEW.book_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.is_released, false) IS DISTINCT FROM COALESCE(NEW.is_released, false) THEN
      IF NEW.is_released = true THEN
        UPDATE books SET published_blocks = published_blocks + 1 WHERE id = NEW.book_id;
      ELSE
        UPDATE books SET published_blocks = GREATEST(0, published_blocks - 1) WHERE id = NEW.book_id;
      END IF;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_released = true THEN
      UPDATE books SET published_blocks = GREATEST(0, published_blocks - 1) WHERE id = OLD.book_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Crea il trigger (DROP + CREATE per sicurezza)
DROP TRIGGER IF EXISTS trg_sync_published_blocks ON blocks;
CREATE TRIGGER trg_sync_published_blocks
  AFTER INSERT OR UPDATE OF is_released OR DELETE
  ON blocks
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_published_blocks();

-- Verifica rapida (opzionale)
-- SELECT id, title, status, total_blocks, published_blocks FROM books ORDER BY updated_at DESC LIMIT 10;
