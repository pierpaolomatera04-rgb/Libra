-- ============================================
-- XP: Blocco letto = +5 XP, una sola volta per blocco
-- ============================================
-- Aggiorna record_block_completion:
--   - xp_earned passa da 10 a 5
--   - L'idempotenza è già garantita da UNIQUE(user_id, block_id)
--     su reading_progress: se il blocco è già stato letto, ritorna
--     already_read=true e xp_earned=0 senza aggiornare il profilo.
-- ============================================

CREATE OR REPLACE FUNCTION public.record_block_completion(
  p_user_id uuid,
  p_book_id uuid,
  p_block_id uuid,
  p_block_number integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_last_date date;
  v_streak integer;
  v_longest integer;
  v_xp integer;
  v_already_read boolean;
  v_xp_earned integer := 5;    -- era 10
  v_streak_bonus integer := 0;
BEGIN
  -- Blocco già letto? Nessun XP nuovo (idempotente).
  SELECT EXISTS(
    SELECT 1 FROM public.reading_progress
    WHERE user_id = p_user_id AND block_id = p_block_id
  ) INTO v_already_read;

  IF v_already_read THEN
    RETURN jsonb_build_object('already_read', true, 'xp_earned', 0);
  END IF;

  INSERT INTO public.reading_progress (user_id, book_id, block_id, block_number, xp_earned)
  VALUES (p_user_id, p_book_id, p_block_id, p_block_number, v_xp_earned);

  SELECT daily_streak, last_reading_date, total_xp, longest_streak
  INTO v_streak, v_last_date, v_xp, v_longest
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_last_date IS NULL OR v_last_date < v_today - 1 THEN
    v_streak := 1;
  ELSIF v_last_date = v_today - 1 THEN
    v_streak := v_streak + 1;
    IF v_streak >= 7 THEN
      v_streak_bonus := 25;
    ELSIF v_streak >= 3 THEN
      v_streak_bonus := 10;
    ELSE
      v_streak_bonus := 5;
    END IF;
  ELSIF v_last_date = v_today THEN
    v_streak := v_streak;
  END IF;

  IF v_streak > COALESCE(v_longest, 0) THEN
    v_longest := v_streak;
  END IF;

  UPDATE public.profiles
  SET
    daily_streak = v_streak,
    last_reading_date = v_today,
    total_xp = COALESCE(v_xp, 0) + v_xp_earned + v_streak_bonus,
    longest_streak = v_longest
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'already_read', false,
    'xp_earned', v_xp_earned + v_streak_bonus,
    'streak', v_streak,
    'streak_bonus', v_streak_bonus,
    'total_xp', COALESCE(v_xp, 0) + v_xp_earned + v_streak_bonus
  );
END;
$$;

-- Default XP storico per nuove righe (estetico, non-blocking)
ALTER TABLE public.reading_progress
  ALTER COLUMN xp_earned SET DEFAULT 5;

NOTIFY pgrst, 'reload schema';
