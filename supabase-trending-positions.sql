-- ============================================
-- LIBRA - Trending Positions (upgrade)
-- Aggiunge posizione corrente e precedente
-- Eseguire nel SQL Editor di Supabase
-- ============================================

-- 1. Aggiungi colonne posizione
ALTER TABLE public.trending_cache
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prev_position INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_new_entry BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS positions_changed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_at_top INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_trending_cache_position ON public.trending_cache(position ASC);


-- 2. FUNZIONE AGGIORNATA: Calcola score + posizioni + delta
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
  v_pos INTEGER;
  v_old_position INTEGER;
  v_old_days_at_top INTEGER;
BEGIN

  -- ═══ FASE 1: Salva le posizioni attuali come "precedenti" ═══
  -- Crea tabella temporanea con le posizioni correnti
  CREATE TEMP TABLE _prev_positions AS
    SELECT book_id, position AS old_position, days_at_top AS old_days_at_top
    FROM public.trending_cache
    WHERE position > 0;

  -- Svuota la cache
  DELETE FROM public.trending_cache;

  -- ═══ FASE 2: Calcola score per ogni libro ═══
  FOR rec IN
    SELECT id, total_blocks
    FROM public.books
    WHERE status IN ('published', 'ongoing', 'completed')
  LOOP

    -- UNLOCK POINTS (50pt, con decay 7gg)
    SELECT COALESCE(SUM(
      50.0 * GREATEST(1.0 - EXTRACT(EPOCH FROM (NOW() - bu.unlocked_at)) / (7.0 * 86400.0), 0)
    ), 0)
    INTO v_unlock_pts
    FROM public.block_unlocks bu
    WHERE bu.book_id = rec.id
      AND bu.unlocked_at >= NOW() - INTERVAL '7 days';

    -- SAVE POINTS (20pt, con decay 7gg)
    SELECT COALESCE(SUM(
      20.0 * GREATEST(1.0 - EXTRACT(EPOCH FROM (NOW() - ul.created_at)) / (7.0 * 86400.0), 0)
    ), 0)
    INTO v_save_pts
    FROM public.user_library ul
    WHERE ul.book_id = rec.id
      AND ul.created_at >= NOW() - INTERVAL '7 days';

    -- COMMENT POINTS (10pt, con decay 7gg)
    SELECT COALESCE(SUM(
      10.0 * GREATEST(1.0 - EXTRACT(EPOCH FROM (NOW() - c.created_at)) / (7.0 * 86400.0), 0)
    ), 0)
    INTO v_comment_pts
    FROM public.comments c
    WHERE c.book_id = rec.id
      AND c.created_at >= NOW() - INTERVAL '7 days';

    -- LIKE POINTS (5pt, con decay 7gg)
    SELECT COALESCE(SUM(
      5.0 * GREATEST(1.0 - EXTRACT(EPOCH FROM (NOW() - l.created_at)) / (7.0 * 86400.0), 0)
    ), 0)
    INTO v_like_pts
    FROM public.likes l
    WHERE l.book_id = rec.id
      AND l.created_at >= NOW() - INTERVAL '7 days';

    v_raw_score := v_unlock_pts + v_save_pts + v_comment_pts + v_like_pts;

    -- RETENTION BONUS
    SELECT COALESCE(MAX(block_number), 0) INTO v_max_block
    FROM public.blocks WHERE book_id = rec.id;

    v_retention := 0;
    v_bonus := FALSE;

    IF v_max_block >= 2 THEN
      SELECT COUNT(DISTINCT bu.user_id) INTO v_first_block_unlockers
      FROM public.block_unlocks bu
      JOIN public.blocks b ON bu.block_id = b.id
      WHERE bu.book_id = rec.id AND b.block_number = 1;

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

    v_final_score := v_raw_score;
    IF v_bonus THEN
      v_final_score := v_final_score * 1.2;
    END IF;

    -- Inserisci se score > 0
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

    -- Aggiorna books.trending_score
    UPDATE public.books
    SET trending_score = ROUND(v_final_score, 4), updated_at = NOW()
    WHERE id = rec.id;

  END LOOP;

  -- ═══ FASE 3: Assegna posizioni e calcola delta ═══
  v_pos := 0;
  FOR rec IN
    SELECT id, book_id FROM public.trending_cache ORDER BY score DESC
  LOOP
    v_pos := v_pos + 1;

    -- Cerca posizione precedente
    SELECT old_position, old_days_at_top INTO v_old_position, v_old_days_at_top
    FROM _prev_positions WHERE book_id = rec.book_id;

    UPDATE public.trending_cache
    SET
      position = v_pos,
      prev_position = COALESCE(v_old_position, 0),
      is_new_entry = (v_old_position IS NULL),
      positions_changed = CASE
        WHEN v_old_position IS NULL THEN 0
        ELSE v_old_position - v_pos  -- positivo = salita, negativo = discesa
      END,
      days_at_top = CASE
        WHEN v_pos = 1 AND COALESCE(v_old_position, 0) = 1
          THEN COALESCE(v_old_days_at_top, 0) + 1
        WHEN v_pos = 1
          THEN 1
        ELSE 0
      END
    WHERE id = rec.id;
  END LOOP;

  -- Pulizia
  DROP TABLE IF EXISTS _prev_positions;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Ricalcola subito
SELECT public.calculate_velocity_trending();
