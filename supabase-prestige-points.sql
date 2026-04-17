-- ============================================
-- LIBRA — SISTEMA MECENATI / PRESTIGE POINTS
-- ============================================
-- Ogni utente guadagna prestige_points quando spende token per
-- supportare libri/community:
--   - Boost Visibilita (10 token)  => +10 prestige points
--   - Reazione Premium (1 token)   => +1  prestige point
--
-- Livelli Mecenate (calcolati client-side dal valore):
--   - Bronzo:  1   - 50
--   - Argento: 51  - 200
--   - Oro:     201+
-- ============================================

-- 1. Colonna prestige_points su profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS prestige_points INTEGER DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_prestige_points
  ON public.profiles(prestige_points DESC)
  WHERE prestige_points > 0;


-- ============================================
-- 2. boost_book — aggiorna per incrementare prestige_points (+10)
-- ============================================
DROP FUNCTION IF EXISTS public.boost_book(UUID, UUID);

CREATE OR REPLACE FUNCTION public.boost_book(
  p_user_id UUID,
  p_book_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_boost_cost INTEGER := 10;
  v_prestige_gain INTEGER := 10;
  v_recent_count INTEGER;
  v_total_today INTEGER;
  v_spend_result JSONB;
  v_purchased_used INTEGER;
  v_author_payout DECIMAL(10,2) := 0;
  v_platform_payout DECIMAL(10,2) := 0;
  v_euro_value DECIMAL(10,2);
BEGIN
  -- Anti-abuso: 1 boost per utente per libro ogni 24h
  SELECT COUNT(*) INTO v_recent_count
  FROM public.book_boosts
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND created_at > NOW() - INTERVAL '24 hours';

  IF v_recent_count > 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Hai gia boostato questo libro nelle ultime 24 ore');
  END IF;

  -- Anti-abuso: max 3 boost totali sullo stesso libro nelle ultime 24h
  SELECT COUNT(*) INTO v_total_today
  FROM public.book_boosts
  WHERE book_id = p_book_id
    AND created_at > NOW() - INTERVAL '24 hours';

  IF v_total_today >= 3 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Questo libro ha gia ricevuto il massimo di 3 boost giornalieri');
  END IF;

  -- Spendi 10 token (welcome/bonus prima, poi reali)
  v_spend_result := public.spend_tokens_internal(p_user_id, v_boost_cost, FALSE);
  IF NOT (v_spend_result->>'success')::BOOLEAN THEN
    RETURN v_spend_result;
  END IF;

  v_purchased_used := COALESCE((v_spend_result->>'purchased_used')::INTEGER, 0);

  -- Payout 70/30 solo sui token reali (1 token = 0.10 euro)
  IF v_purchased_used > 0 THEN
    v_euro_value := v_purchased_used * 0.10;
    v_author_payout := ROUND(v_euro_value * 0.70, 2);
    v_platform_payout := ROUND(v_euro_value * 0.30, 2);
  END IF;

  -- Incrementa visibility_score del libro
  UPDATE public.books
  SET visibility_score = COALESCE(visibility_score, 0) + v_boost_cost
  WHERE id = p_book_id;

  -- Prestige points +10 (indipendente dal tipo di token)
  UPDATE public.profiles
  SET prestige_points = COALESCE(prestige_points, 0) + v_prestige_gain
  WHERE id = p_user_id;

  -- Registra boost
  INSERT INTO public.book_boosts (user_id, book_id, tokens_spent, author_payout, platform_payout, used_real_tokens)
  VALUES (p_user_id, p_book_id, v_boost_cost, v_author_payout, v_platform_payout, v_purchased_used > 0);

  -- Token transactions per coerenza col resto del sistema
  IF v_purchased_used > 0 THEN
    INSERT INTO public.token_transactions (user_id, book_id, token_type, tokens_spent, author_payout, platform_payout)
    VALUES (p_user_id, p_book_id, 'PURCHASED_TOKEN', v_purchased_used, v_author_payout, v_platform_payout);
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'tokens_spent', v_boost_cost,
    'author_payout', v_author_payout,
    'visibility_added', v_boost_cost,
    'prestige_gained', v_prestige_gain
  );
END;
$$;


-- ============================================
-- 3. react_to_comment — aggiorna per incrementare prestige_points (+1)
-- ============================================
DROP FUNCTION IF EXISTS public.react_to_comment(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.react_to_comment(
  p_user_id UUID,
  p_comment_id UUID,
  p_reaction_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reaction_cost INTEGER := 1;
  v_prestige_gain INTEGER := 1;
  v_xp_reward INTEGER := 5;
  v_comment_author UUID;
  v_spend_result JSONB;
  v_already_reacted INTEGER;
BEGIN
  IF p_reaction_type NOT IN ('fire', 'heart', 'star', 'gem', 'crown') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Reazione non valida');
  END IF;

  SELECT user_id INTO v_comment_author
  FROM public.comments
  WHERE id = p_comment_id;

  IF v_comment_author IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Commento non trovato');
  END IF;

  SELECT COUNT(*) INTO v_already_reacted
  FROM public.comment_reactions
  WHERE user_id = p_user_id AND comment_id = p_comment_id AND reaction_type = p_reaction_type;

  IF v_already_reacted > 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Hai gia reagito con questo tipo');
  END IF;

  v_spend_result := public.spend_tokens_internal(p_user_id, v_reaction_cost, FALSE);
  IF NOT (v_spend_result->>'success')::BOOLEAN THEN
    RETURN v_spend_result;
  END IF;

  INSERT INTO public.comment_reactions (user_id, comment_id, reaction_type, tokens_spent)
  VALUES (p_user_id, p_comment_id, p_reaction_type, v_reaction_cost);

  -- +5 XP a entrambi
  UPDATE public.profiles SET total_xp = COALESCE(total_xp, 0) + v_xp_reward WHERE id = p_user_id;
  IF v_comment_author <> p_user_id THEN
    UPDATE public.profiles SET total_xp = COALESCE(total_xp, 0) + v_xp_reward WHERE id = v_comment_author;
  END IF;

  -- Prestige points +1 al reactor (anche reazioni su propri commenti / firme premium)
  UPDATE public.profiles
  SET prestige_points = COALESCE(prestige_points, 0) + v_prestige_gain
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'reaction_type', p_reaction_type,
    'xp_earned', v_xp_reward,
    'prestige_gained', v_prestige_gain
  );
END;
$$;


-- ============================================
-- 4. Backfill (ricostruisci prestige_points storici dagli insert esistenti)
-- ============================================
UPDATE public.profiles p
SET prestige_points = COALESCE(boost_sum.pts, 0) + COALESCE(reaction_sum.pts, 0)
FROM (
  SELECT user_id, COUNT(*) * 10 AS pts
  FROM public.book_boosts
  GROUP BY user_id
) boost_sum
FULL OUTER JOIN (
  SELECT user_id, COUNT(*) AS pts
  FROM public.comment_reactions
  GROUP BY user_id
) reaction_sum USING (user_id)
WHERE p.id = COALESCE(boost_sum.user_id, reaction_sum.user_id);


NOTIFY pgrst, 'reload schema';
