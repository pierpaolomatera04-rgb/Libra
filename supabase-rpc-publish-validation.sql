-- ============================================
-- RPC: validate_block_publication
-- Valida che un autore possa pubblicare blocchi
-- Regole:
--   1. Max 16 blocchi per libro (HARD LIMIT)
--   2. Max 2 blocchi per settimana per libro
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_block_publication(
  p_book_id UUID,
  p_author_id UUID,
  p_block_count INTEGER  -- quanti blocchi si vogliono pubblicare
)
RETURNS JSON AS $$
DECLARE
  v_book RECORD;
  v_existing_blocks INTEGER;
  v_blocks_last_7_days INTEGER;
  v_max_blocks INTEGER := 16;
  v_max_per_week INTEGER := 2;
BEGIN
  -- 1. Verifica che il libro esista e appartenga all'autore
  SELECT id, author_id, total_blocks, max_blocks, status
  INTO v_book
  FROM public.books
  WHERE id = p_book_id AND author_id = p_author_id;

  IF v_book IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'BOOK_NOT_FOUND',
      'message', 'Libro non trovato o non sei l''autore'
    );
  END IF;

  -- Usa max_blocks dal libro se impostato, altrimenti default 16
  v_max_blocks := COALESCE(v_book.max_blocks, 16);

  -- 2. Conta blocchi esistenti
  SELECT COUNT(*)
  INTO v_existing_blocks
  FROM public.blocks
  WHERE book_id = p_book_id;

  -- Check: troppi blocchi totali
  IF (v_existing_blocks + p_block_count) > v_max_blocks THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'MAX_BLOCKS_EXCEEDED',
      'message', format('Limite massimo di %s blocchi per libro raggiunto. Blocchi attuali: %s, richiesti: %s', v_max_blocks, v_existing_blocks, p_block_count),
      'existing_blocks', v_existing_blocks,
      'max_blocks', v_max_blocks,
      'requested', p_block_count
    );
  END IF;

  -- 3. Conta blocchi pubblicati negli ultimi 7 giorni
  SELECT COUNT(*)
  INTO v_blocks_last_7_days
  FROM public.blocks
  WHERE book_id = p_book_id
    AND created_at > NOW() - INTERVAL '7 days';

  -- Check: troppi blocchi questa settimana
  -- Nota: questo check si applica solo quando si aggiungono blocchi a un libro esistente,
  -- non alla prima pubblicazione (dove v_existing_blocks = 0)
  IF v_existing_blocks > 0 AND (v_blocks_last_7_days + p_block_count) > v_max_per_week THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'WEEKLY_LIMIT_EXCEEDED',
      'message', format('Puoi pubblicare massimo %s blocchi a settimana. Blocchi pubblicati negli ultimi 7 giorni: %s', v_max_per_week, v_blocks_last_7_days),
      'blocks_this_week', v_blocks_last_7_days,
      'max_per_week', v_max_per_week,
      'requested', p_block_count
    );
  END IF;

  -- Tutto ok
  RETURN json_build_object(
    'valid', true,
    'existing_blocks', v_existing_blocks,
    'blocks_this_week', v_blocks_last_7_days,
    'max_blocks', v_max_blocks,
    'max_per_week', v_max_per_week,
    'remaining_total', v_max_blocks - v_existing_blocks,
    'remaining_week', v_max_per_week - v_blocks_last_7_days
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permetti l'accesso agli utenti autenticati
GRANT EXECUTE ON FUNCTION public.validate_block_publication(UUID, UUID, INTEGER) TO authenticated;


-- ============================================
-- TRIGGER: enforce_max_blocks
-- Blocca l'inserimento se si supera il limite di 16 blocchi
-- Questo è il VERO hard limit a livello DB
-- ============================================

CREATE OR REPLACE FUNCTION public.enforce_max_blocks()
RETURNS TRIGGER AS $$
DECLARE
  v_current_count INTEGER;
  v_max_blocks INTEGER;
BEGIN
  -- Conta blocchi esistenti per questo libro
  SELECT COUNT(*) INTO v_current_count
  FROM public.blocks
  WHERE book_id = NEW.book_id;

  -- Recupera il limite dal libro
  SELECT COALESCE(max_blocks, 16) INTO v_max_blocks
  FROM public.books
  WHERE id = NEW.book_id;

  -- Blocca se il limite è raggiunto
  IF v_current_count >= v_max_blocks THEN
    RAISE EXCEPTION 'Limite massimo di % blocchi raggiunto per questo libro', v_max_blocks;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crea il trigger (drop se esiste già)
DROP TRIGGER IF EXISTS trg_enforce_max_blocks ON public.blocks;
CREATE TRIGGER trg_enforce_max_blocks
  BEFORE INSERT ON public.blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_blocks();
