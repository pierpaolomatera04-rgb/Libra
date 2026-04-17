-- ============================================
-- FIX: Reazione "pen" (penna stilografica) + garanzia WELCOME_TOKEN
-- ============================================
-- 1. Aggiunge 'pen' al CHECK constraint di comment_reactions
-- 2. Rigenera spend_tokens_internal (include WELCOME_TOKEN)
-- 3. Rigenera react_to_comment per accettare 'pen' + prestige_points
-- ============================================

-- 1. CHECK constraint su reaction_type
ALTER TABLE public.comment_reactions
  DROP CONSTRAINT IF EXISTS comment_reactions_reaction_type_check;

ALTER TABLE public.comment_reactions
  ADD CONSTRAINT comment_reactions_reaction_type_check
  CHECK (reaction_type IN ('fire', 'heart', 'star', 'gem', 'crown', 'pen'));


-- 2. spend_tokens_internal (sicuramente con WELCOME_TOKEN)
DROP FUNCTION IF EXISTS public.spend_tokens_internal(UUID, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION public.spend_tokens_internal(
  p_user_id UUID,
  p_amount INTEGER,
  p_premium_only BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining INTEGER := p_amount;
  v_purchased_used INTEGER := 0;
  v_token RECORD;
  v_use INTEGER;
  v_total_available INTEGER;
BEGIN
  IF p_premium_only THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_available
    FROM public.tokens
    WHERE user_id = p_user_id
      AND spent = FALSE
      AND type = 'PURCHASED_TOKEN'
      AND (expires_at IS NULL OR expires_at > NOW());
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO v_total_available
    FROM public.tokens
    WHERE user_id = p_user_id
      AND spent = FALSE
      AND type IN ('WELCOME_TOKEN', 'MONTHLY_TOKEN', 'ANNUAL_BONUS_TOKEN', 'PURCHASED_TOKEN')
      AND (expires_at IS NULL OR expires_at > NOW());
  END IF;

  IF v_total_available < p_amount THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Token insufficienti',
      'available', v_total_available,
      'needed', p_amount
    );
  END IF;

  -- Spende prima i WELCOME (non generano payout, non scadono),
  -- poi MONTHLY, poi ANNUAL_BONUS, infine PURCHASED
  FOR v_token IN
    SELECT id, amount, type
    FROM public.tokens
    WHERE user_id = p_user_id
      AND spent = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (
        (NOT p_premium_only AND type IN ('WELCOME_TOKEN', 'MONTHLY_TOKEN', 'ANNUAL_BONUS_TOKEN', 'PURCHASED_TOKEN'))
        OR (p_premium_only AND type = 'PURCHASED_TOKEN')
      )
    ORDER BY
      CASE type
        WHEN 'WELCOME_TOKEN' THEN 0
        WHEN 'MONTHLY_TOKEN' THEN 1
        WHEN 'ANNUAL_BONUS_TOKEN' THEN 2
        WHEN 'PURCHASED_TOKEN' THEN 3
        ELSE 99
      END,
      expires_at NULLS LAST,
      created_at
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_use := LEAST(v_token.amount, v_remaining);
    IF v_use >= v_token.amount THEN
      UPDATE public.tokens SET spent = TRUE WHERE id = v_token.id;
    ELSE
      UPDATE public.tokens SET amount = amount - v_use WHERE id = v_token.id;
    END IF;
    IF v_token.type = 'PURCHASED_TOKEN' THEN
      v_purchased_used := v_purchased_used + v_use;
    END IF;
    v_remaining := v_remaining - v_use;
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'spent', p_amount - v_remaining,
    'purchased_used', v_purchased_used
  );
END;
$$;


-- 3. react_to_comment — include 'pen' e prestige_points +1
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
  IF p_reaction_type NOT IN ('fire', 'heart', 'star', 'gem', 'crown', 'pen') THEN
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

  UPDATE public.profiles SET total_xp = COALESCE(total_xp, 0) + v_xp_reward WHERE id = p_user_id;
  IF v_comment_author <> p_user_id THEN
    UPDATE public.profiles SET total_xp = COALESCE(total_xp, 0) + v_xp_reward WHERE id = v_comment_author;
  END IF;

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


-- 4. Assicura che ogni utente abbia il suo welcome token caricato
-- (alcuni utenti storici potrebbero non avere mai ricevuto il token via trigger).
INSERT INTO public.tokens (user_id, amount, type, expires_at, spent)
SELECT p.id, 10, 'WELCOME_TOKEN', NULL, FALSE
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.tokens t
  WHERE t.user_id = p.id AND t.type = 'WELCOME_TOKEN'
);


NOTIFY pgrst, 'reload schema';

-- Verifica: quanti token welcome disponibili per utente
SELECT user_id, SUM(amount) AS welcome_available
FROM public.tokens
WHERE type = 'WELCOME_TOKEN' AND spent = FALSE
GROUP BY user_id
ORDER BY welcome_available DESC
LIMIT 10;
