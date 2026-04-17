-- ============================================
-- LIBRA — TRENDING HISTORY & DELTA %
-- ============================================
-- Aggiunge un tracciamento giornaliero dello score trending per ogni libro,
-- così la pagina Classifica può mostrare indicatori reali di crescita del tipo
-- "+73% attività negli ultimi 7 giorni" senza inventare numeri.
--
-- Ogni run del cron:
--   1) calcola il nuovo trending_score (funzione esistente)
--   2) upsert in trending_history la riga (book_id, today) = score corrente
--   3) confronta lo score di oggi con quello di 7 giorni fa e calcola la
--      variazione percentuale, scritta in trending_cache.activity_delta_7d
--
-- Integrato in maniera non-distruttiva: non tocca la funzione esistente,
-- ma offre un nuovo helper update_trending_history() da chiamare subito dopo.
-- ============================================


-- ============================================
-- 1. Tabella storico giornaliero dello score
-- ============================================
CREATE TABLE IF NOT EXISTS public.trending_history (
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  position INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (book_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_trending_history_date
  ON public.trending_history(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_trending_history_book
  ON public.trending_history(book_id, snapshot_date DESC);


-- ============================================
-- 2. Nuove colonne su trending_cache
-- ============================================
ALTER TABLE public.trending_cache
  ADD COLUMN IF NOT EXISTS score_7d_ago NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activity_delta_7d NUMERIC DEFAULT 0;


-- ============================================
-- 3. Helper: registra snapshot di oggi + calcola delta % a 7 giorni
-- ============================================
CREATE OR REPLACE FUNCTION public.update_trending_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  rec RECORD;
  v_old_score NUMERIC;
  v_delta NUMERIC;
BEGIN
  -- Per ogni libro in cache, upsert snapshot odierno (idempotente per data)
  FOR rec IN
    SELECT book_id, score, position FROM public.trending_cache
  LOOP
    INSERT INTO public.trending_history (book_id, snapshot_date, score, position, recorded_at)
    VALUES (rec.book_id, v_today, rec.score, rec.position, NOW())
    ON CONFLICT (book_id, snapshot_date) DO UPDATE
      SET score = EXCLUDED.score,
          position = EXCLUDED.position,
          recorded_at = NOW();

    -- Recupera lo score di 7 giorni fa (o il piu' vecchio disponibile nel range 6-8 gg)
    SELECT score INTO v_old_score
    FROM public.trending_history
    WHERE book_id = rec.book_id
      AND snapshot_date BETWEEN v_today - INTERVAL '8 days' AND v_today - INTERVAL '6 days'
    ORDER BY snapshot_date ASC
    LIMIT 1;

    -- Calcola delta percentuale
    IF v_old_score IS NULL OR v_old_score <= 0 THEN
      -- nessun dato storico => rappresenta come "nuovo" (NULL, gestito in UI)
      v_delta := NULL;
    ELSE
      v_delta := ROUND(((rec.score - v_old_score) / v_old_score) * 100, 1);
    END IF;

    UPDATE public.trending_cache
    SET score_7d_ago = COALESCE(v_old_score, 0),
        activity_delta_7d = COALESCE(v_delta, 0)
    WHERE book_id = rec.book_id;
  END LOOP;

  -- Pulizia storico: scarta snapshot piu' vecchi di 30 giorni (basta per delta 7gg)
  DELETE FROM public.trending_history
  WHERE snapshot_date < v_today - INTERVAL '30 days';
END;
$$;


-- ============================================
-- 4. Backfill: crea subito uno snapshot iniziale per i libri in cache
--    così dalla prossima settimana avremo già un baseline per i delta.
-- ============================================
SELECT public.update_trending_history();


NOTIFY pgrst, 'reload schema';
