-- ============================================
-- READER — Paginazione + pages_read per libreria
-- ============================================
-- Aggiunge la colonna library.pages_read usata per il pagamento
-- agli autori, indipendentemente dalla dimensione testo scelta
-- dal lettore.
--
-- Definizione "pagina standard": 250 parole lette per ≥30s.
-- L'app client aggrega le parole delle pagine visive e chiama
-- questa RPC ogni volta che supera un multiplo di 250.
-- ============================================

ALTER TABLE public.user_library
  ADD COLUMN IF NOT EXISTS pages_read INTEGER NOT NULL DEFAULT 0;

-- Incrementa atomicamente user_library.pages_read per l'utente loggato.
-- Se la riga non esiste (utente non ancora nella libreria), la crea
-- con status='reading'.
CREATE OR REPLACE FUNCTION public.increment_library_pages_read(
  p_book_id UUID,
  p_delta INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_new INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN 0;
  END IF;
  IF p_delta IS NULL OR p_delta <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.user_library (user_id, book_id, status, pages_read, started_at)
  VALUES (v_user, p_book_id, 'reading', p_delta, NOW())
  ON CONFLICT (user_id, book_id)
  DO UPDATE SET
    pages_read = public.user_library.pages_read + EXCLUDED.pages_read,
    updated_at = NOW()
  RETURNING pages_read INTO v_new;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_library_pages_read(UUID, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
