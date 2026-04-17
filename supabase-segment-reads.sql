-- ============================================
-- LIBRA — TRACCIAMENTO PAGINE VIRTUALI (250 parole)
-- ============================================
-- Regole:
--   1 pagina virtuale = 250 parole
--   Una pagina viene contata SOLO se l'utente sosta almeno 5 secondi
--   sul segmento corrispondente (controllo viewport + timer client-side)
--   Protezione: UNIQUE(user_id, block_id, segment_index) — nessun doppio
--   conteggio dello stesso segmento per lo stesso utente.
--
-- Usato per:
--   - profiles.pages_read (statistica lettore)
--   - user_library.pages_read (per calcolo pool autori 70% a fine mese)
-- ============================================

-- 1. Tabella segment_reads
CREATE TABLE IF NOT EXISTS public.segment_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE NOT NULL,
  segment_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, block_id, segment_index)
);

CREATE INDEX IF NOT EXISTS idx_segment_reads_user_book
  ON public.segment_reads(user_id, book_id);

CREATE INDEX IF NOT EXISTS idx_segment_reads_book_created
  ON public.segment_reads(book_id, created_at DESC);

ALTER TABLE public.segment_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utenti vedono propri segment_reads" ON public.segment_reads;
CREATE POLICY "Utenti vedono propri segment_reads"
  ON public.segment_reads FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utenti creano propri segment_reads" ON public.segment_reads;
CREATE POLICY "Utenti creano propri segment_reads"
  ON public.segment_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- 2. user_library.pages_read (per calcolo pool autori)
ALTER TABLE public.user_library
  ADD COLUMN IF NOT EXISTS pages_read INTEGER DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_library_book_pages
  ON public.user_library(book_id, pages_read DESC)
  WHERE pages_read > 0;


-- 3. Drop vecchio sistema basato su block_reads (250 parole invece di 300)
DROP TRIGGER IF EXISTS block_reads_pages_trigger ON public.block_reads;
DROP FUNCTION IF EXISTS public.trg_block_reads_update_pages();
DROP FUNCTION IF EXISTS public.recalc_user_pages_read(UUID);


-- 4. RPC: record_segment_read
-- Incrementa pagine lette (profilo + library) solo se segmento non gia registrato.
CREATE OR REPLACE FUNCTION public.record_segment_read(
  p_block_id UUID,
  p_segment_index INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_book_id UUID;
  v_inserted BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Non autenticato');
  END IF;

  IF p_segment_index < 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'segment_index non valido');
  END IF;

  SELECT book_id INTO v_book_id
  FROM public.blocks
  WHERE id = p_block_id;

  IF v_book_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Blocco non trovato');
  END IF;

  -- Insert con ON CONFLICT DO NOTHING
  INSERT INTO public.segment_reads (user_id, book_id, block_id, segment_index)
  VALUES (v_user_id, v_book_id, p_block_id, p_segment_index)
  ON CONFLICT (user_id, block_id, segment_index) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted THEN
    -- Incrementa profiles.pages_read
    UPDATE public.profiles
    SET pages_read = COALESCE(pages_read, 0) + 1
    WHERE id = v_user_id;

    -- Incrementa user_library.pages_read (upsert)
    INSERT INTO public.user_library (user_id, book_id, status, pages_read, last_read_block_id)
    VALUES (v_user_id, v_book_id, 'reading', 1, p_block_id)
    ON CONFLICT (user_id, book_id) DO UPDATE
      SET pages_read = COALESCE(public.user_library.pages_read, 0) + 1,
          last_read_block_id = p_block_id,
          updated_at = NOW();
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'inserted', v_inserted
  );
END;
$$;


-- 5. Assicurati che esista il constraint UNIQUE(user_id, book_id) su user_library
-- (necessario per l'ON CONFLICT sopra)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_library_user_book_unique'
      AND conrelid = 'public.user_library'::regclass
  ) THEN
    BEGIN
      ALTER TABLE public.user_library
        ADD CONSTRAINT user_library_user_book_unique UNIQUE (user_id, book_id);
    EXCEPTION WHEN duplicate_table OR unique_violation THEN
      -- Ignora se gia presente con altro nome o violazioni
      NULL;
    END;
  END IF;
END $$;


-- 6. Backfill user_library.pages_read dallo storico block_reads (1 pagina ogni 250 parole)
WITH per_library AS (
  SELECT
    br.user_id,
    br.book_id,
    SUM(
      GREATEST(
        1,
        CEIL(
          array_length(
            regexp_split_to_array(COALESCE(b.content, ''), '\s+'),
            1
          )::numeric / 250
        )::INTEGER
      )
    )::INTEGER AS pages
  FROM public.block_reads br
  JOIN public.blocks b ON b.id = br.block_id
  WHERE br.read_completed = TRUE
  GROUP BY br.user_id, br.book_id
)
UPDATE public.user_library ul
SET pages_read = per_library.pages
FROM per_library
WHERE ul.user_id = per_library.user_id
  AND ul.book_id = per_library.book_id;


-- 7. Backfill profiles.pages_read = somma pages_read dei libri in user_library
WITH per_user AS (
  SELECT user_id, SUM(pages_read)::INTEGER AS total
  FROM public.user_library
  WHERE pages_read > 0
  GROUP BY user_id
)
UPDATE public.profiles p
SET pages_read = per_user.total
FROM per_user
WHERE p.id = per_user.user_id;


NOTIFY pgrst, 'reload schema';
