-- =====================================================================
-- Salvataggio posizione di lettura per blocco (resume reading).
-- Quando l'utente esce a meta' blocco, salviamo dove si era fermato:
--   page_number       = pagina visiva (floor(scrollY / vh) + 1)
--   progress_fraction = 0..1, scroll relativo al contenuto del blocco
--   scroll_top        = pixel assoluti (per resume preciso)
-- Una sola riga per (user_id, block_id): l'ultimo salvataggio vince.
-- Idempotente: eseguibile piu' volte.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.block_reading_progress (
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id          UUID NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
  book_id           UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  page_number       INT  NOT NULL DEFAULT 1,
  progress_fraction NUMERIC(5,4) NOT NULL DEFAULT 0,
  scroll_top        INT  NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, block_id)
);

CREATE INDEX IF NOT EXISTS block_reading_progress_user_book
  ON public.block_reading_progress(user_id, book_id);

ALTER TABLE public.block_reading_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brp_self_select ON public.block_reading_progress;
CREATE POLICY brp_self_select ON public.block_reading_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS brp_self_insert ON public.block_reading_progress;
CREATE POLICY brp_self_insert ON public.block_reading_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS brp_self_update ON public.block_reading_progress;
CREATE POLICY brp_self_update ON public.block_reading_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS brp_self_delete ON public.block_reading_progress;
CREATE POLICY brp_self_delete ON public.block_reading_progress
  FOR DELETE USING (auth.uid() = user_id);
