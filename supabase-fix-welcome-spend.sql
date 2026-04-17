-- ============================================
-- FIX: permetti WELCOME_TOKEN per spesa reazioni e boost
-- ============================================
-- I welcome token (10 al signup) devono poter essere spesi per:
--   - Reazioni premium (1 token)
--   - Boost visibilita (10 token)
-- MA NON per sbloccare blocchi EXTRA (che richiedono solo PURCHASED).
-- ============================================

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
  -- Verifica disponibilita totale
  IF p_premium_only THEN
    -- Solo token reali acquistati
    SELECT COALESCE(SUM(amount), 0) INTO v_total_available
    FROM public.tokens
    WHERE user_id = p_user_id
      AND spent = FALSE
      AND type = 'PURCHASED_TOKEN'
      AND (expires_at IS NULL OR expires_at > NOW());
  ELSE
    -- Tutti i tipi (bonus welcome, mensile, annuale, acquistati)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_available
    FROM public.tokens
    WHERE user_id = p_user_id
      AND spent = FALSE
      AND type IN ('WELCOME_TOKEN', 'MONTHLY_TOKEN', 'ANNUAL_BONUS_TOKEN', 'PURCHASED_TOKEN')
      AND (expires_at IS NULL OR expires_at > NOW());
  END IF;

  IF v_total_available < p_amount THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Token insufficienti', 'available', v_total_available, 'needed', p_amount);
  END IF;

  -- Ordine di spesa: WELCOME -> MONTHLY (scadono) -> ANNUAL_BONUS -> PURCHASED
  -- I welcome vengono spesi per primi perche' non generano payout e non scadono
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

NOTIFY pgrst, 'reload schema';

-- Verifica
SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE proname = 'spend_tokens_internal';
