-- ============================================
-- GAMIFICATION: Streak, XP, Reading Progress
-- ============================================

-- 1. Aggiungi colonne gamification alla tabella profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reading_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_xp integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0;

-- 2. Tabella per tracciare i blocchi letti per utente/libro
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  block_id uuid REFERENCES public.blocks(id) ON DELETE CASCADE NOT NULL,
  block_number integer NOT NULL,
  completed_at timestamptz DEFAULT now(),
  xp_earned integer DEFAULT 10,
  UNIQUE(user_id, block_id)
);

-- 3. RLS per reading_progress
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utenti leggono i propri progressi"
  ON public.reading_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Utenti inseriscono i propri progressi"
  ON public.reading_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Indici per performance
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_book
  ON public.reading_progress(user_id, book_id);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user
  ON public.reading_progress(user_id);

-- 5. Funzione per aggiornare streak e XP quando un blocco viene completato
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
  v_xp_earned integer := 10;
  v_streak_bonus integer := 0;
BEGIN
  -- Controlla se il blocco è già stato letto
  SELECT EXISTS(
    SELECT 1 FROM public.reading_progress
    WHERE user_id = p_user_id AND block_id = p_block_id
  ) INTO v_already_read;

  IF v_already_read THEN
    RETURN jsonb_build_object('already_read', true, 'xp_earned', 0);
  END IF;

  -- Inserisci progresso lettura
  INSERT INTO public.reading_progress (user_id, book_id, block_id, block_number, xp_earned)
  VALUES (p_user_id, p_book_id, p_block_id, p_block_number, v_xp_earned);

  -- Leggi lo stato attuale dell'utente
  SELECT daily_streak, last_reading_date, total_xp, longest_streak
  INTO v_streak, v_last_date, v_xp, v_longest
  FROM public.profiles
  WHERE id = p_user_id;

  -- Aggiorna streak
  IF v_last_date IS NULL OR v_last_date < v_today - 1 THEN
    -- Streak rotto o primo giorno
    v_streak := 1;
  ELSIF v_last_date = v_today - 1 THEN
    -- Giorno consecutivo!
    v_streak := v_streak + 1;
    -- Bonus XP per streak
    IF v_streak >= 7 THEN
      v_streak_bonus := 25;
    ELSIF v_streak >= 3 THEN
      v_streak_bonus := 10;
    ELSE
      v_streak_bonus := 5;
    END IF;
  ELSIF v_last_date = v_today THEN
    -- Già letto oggi, non cambiare streak
    v_streak := v_streak;
  END IF;

  -- Aggiorna longest streak
  IF v_streak > COALESCE(v_longest, 0) THEN
    v_longest := v_streak;
  END IF;

  -- Aggiorna profilo
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
