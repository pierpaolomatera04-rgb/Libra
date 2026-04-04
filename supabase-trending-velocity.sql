-- ============================================
-- LIBRA - Trending Score v2 (Velocity-based)
-- Eseguire nel SQL Editor di Supabase
-- ============================================

-- 1. TABELLA CACHE TRENDING
CREATE TABLE IF NOT EXISTS public.trending_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL UNIQUE,
  score NUMERIC(12,4) DEFAULT 0,
  retention_rate NUMERIC(5,4) DEFAULT 0,
  retention_bonus_applied BOOLEAN DEFAULT FALSE,
  unlock_points NUMERIC(10,2) DEFAULT 0,
  save_points NUMERIC(10,2) DEFAULT 0,
  comment_points NUMERIC(10,2) DEFAULT 0,
  like_points NUMERIC(10,2) DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trending_cache_score ON public.trending_cache(score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_cache_book ON public.trending_cache(book_id);

-- RLS: tutti possono leggere, solo sistema scrive
ALTER TABLE public.trending_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trending cache visibile a tutti" ON public.trending_cache
  FOR SELECT USING (true);

-- Per INSERT/UPDATE usiamo SECURITY DEFINER nella funzione


-- 2. FUNZIONE: Calcolo Velocity Trending Score
-- Pesi: unlock=50pt, save=20pt, comment=10pt, like=5pt
-- Decadimento: azione di oggi vale 1x, azione di 7gg fa vale ~0.14x
-- Retention bonus: se >50% dei lettori del blocco 1 sblocca anche gli ultimi, x1.2

CREATE OR REPLACE FUNCTION public.calculate_velocity_trending()
RETURNS void AS $$
DECLARE
  rec RECORD;
  v_unlock_pts NUMERIC;
  v_save_pts NUMERIC;
  v_comment_pts NUMERIC;
  v_like_pts NUMERIC;
  v_raw_score NUMERIC;
  v_retention NUMERIC;
  v_bonus BOOLEAN;
  v_final_score NUMERIC;
  v_first_block_unlockers INTEGER;
  v_last_block_unlockers INTEGER;
  v_max_block INTEGER;
BEGIN
  -- Svuota la cache precedente
  DELETE FROM public.trending_cache;

  -- Ciclo su tutti i libri attivi
  FOR rec IN
    SELECT id, total_blocks
    FROM public.books
    WHERE status IN ('published', 'ongoing', 'completed')
  LOOP

    -- ═══ UNLOCK POINTS (50pt ciascuno, con decay) ═══
    SELECT COALESCE(SUM(
      50.0 * (1.0 - EXTRACT(EPOCH FROM (NOW() - bu.unlocked_at)) / (7.0 * 86400.0))
    ), 0)
    INTO v_unlock_pts
    FROM public.block_unlocks bu
    WHERE bu.book_id = rec.id
      AND bu.unlocked_at >= NOW() - INTERVAL '7 days';

    -- ═══ SAVE POINTS (20pt ciascuno, con decay) ═══
    SELECT COALESCE(SUM(
      20.0 * (1.0 - EXTRACT(EPOCH FROM (NOW() - ul.created_at)) / (7.0 * 86400.0))
    ), 0)
    INTO v_save_pts
    FROM public.user_library ul
    WHERE ul.book_id = rec.id
      AND ul.created_at >= NOW() - INTERVAL '7 days';

    -- ═══ COMMENT POINTS (10pt ciascuno, con decay) ═══
    SELECT COALESCE(SUM(
      10.0 * (1.0 - EXTRACT(EPOCH FROM (NOW() - c.created_at)) / (7.0 * 86400.0))
    ), 0)
    INTO v_comment_pts
    FROM public.comments c
    WHERE c.book_id = rec.id
      AND c.created_at >= NOW() - INTERVAL '7 days';

    -- ═══ LIKE POINTS (5pt ciascuno, con decay) ═══
    SELECT COALESCE(SUM(
      5.0 * (1.0 - EXTRACT(EPOCH FROM (NOW() - l.created_at)) / (7.0 * 86400.0))
    ), 0)
    INTO v_like_pts
    FROM public.likes l
    WHERE l.book_id = rec.id
      AND l.created_at >= NOW() - INTERVAL '7 days';

    -- Clip negativi a zero (azioni esattamente al limite dei 7gg)
    v_unlock_pts := GREATEST(v_unlock_pts, 0);
    v_save_pts := GREATEST(v_save_pts, 0);
    v_comment_pts := GREATEST(v_comment_pts, 0);
    v_like_pts := GREATEST(v_like_pts, 0);

    v_raw_score := v_unlock_pts + v_save_pts + v_comment_pts + v_like_pts;

    -- ═══ RETENTION BONUS ═══
    -- Trova il blocco massimo del libro
    SELECT COALESCE(MAX(block_number), 0) INTO v_max_block
    FROM public.blocks WHERE book_id = rec.id;

    v_retention := 0;
    v_bonus := FALSE;

    IF v_max_block >= 2 THEN
      -- Quanti utenti hanno sbloccato il blocco 1
      SELECT COUNT(DISTINCT bu.user_id) INTO v_first_block_unlockers
      FROM public.block_unlocks bu
      JOIN public.blocks b ON bu.block_id = b.id
      WHERE bu.book_id = rec.id AND b.block_number = 1;

      -- Quanti di quelli hanno sbloccato anche l'ultimo blocco (o penultimo)
      SELECT COUNT(DISTINCT bu.user_id) INTO v_last_block_unlockers
      FROM public.block_unlocks bu
      JOIN public.blocks b ON bu.block_id = b.id
      WHERE bu.book_id = rec.id
        AND b.block_number >= v_max_block - 1
        AND bu.user_id IN (
          SELECT bu2.user_id
          FROM public.block_unlocks bu2
          JOIN public.blocks b2 ON bu2.block_id = b2.id
          WHERE bu2.book_id = rec.id AND b2.block_number = 1
        );

      IF v_first_block_unlockers > 0 THEN
        v_retention := v_last_block_unlockers::NUMERIC / v_first_block_unlockers::NUMERIC;
      END IF;

      IF v_retention > 0.50 THEN
        v_bonus := TRUE;
      END IF;
    END IF;

    -- Score finale
    v_final_score := v_raw_score;
    IF v_bonus THEN
      v_final_score := v_final_score * 1.2;
    END IF;

    -- Inserisci nella cache (solo se score > 0)
    IF v_final_score > 0 THEN
      INSERT INTO public.trending_cache (
        book_id, score, retention_rate, retention_bonus_applied,
        unlock_points, save_points, comment_points, like_points, computed_at
      ) VALUES (
        rec.id, ROUND(v_final_score, 4), ROUND(v_retention, 4), v_bonus,
        ROUND(v_unlock_pts, 2), ROUND(v_save_pts, 2),
        ROUND(v_comment_pts, 2), ROUND(v_like_pts, 2),
        NOW()
      );
    END IF;

    -- Aggiorna anche il campo trending_score nella tabella books
    UPDATE public.books
    SET trending_score = ROUND(v_final_score, 4),
        updated_at = NOW()
    WHERE id = rec.id;

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. ESEGUI SUBITO IL PRIMO CALCOLO
SELECT public.calculate_velocity_trending();
