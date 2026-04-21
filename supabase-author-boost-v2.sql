-- ============================================
-- LIBRA — AUTHOR BOOST v2 (giorni + token separati)
-- ============================================
-- Patch della RPC create_author_boost:
--   - Nuovi parametri: p_tokens + p_days (1..30)
--   - Min 10 token, tokens non più vincolati a multipli di 10
--   - Multiplier dinamico: 1.0 + (tokens/days) * 0.1, cap 5.0
--   - Più token al giorno = boost più potente
-- ============================================

DROP FUNCTION IF EXISTS public.create_author_boost(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.create_author_boost(
  p_book_id UUID,
  p_tokens INTEGER,
  p_days INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_book_author UUID;
  v_book_total_reads INTEGER;
  v_tokens_per_day NUMERIC;
  v_multiplier NUMERIC(4,2);
  v_remaining INTEGER;
  v_token RECORD;
  v_use INTEGER;
  v_bonus_used INTEGER := 0;
  v_purchased_used INTEGER := 0;
  v_total_bonus INTEGER;
  v_total_purchased INTEGER;
  v_existing_expires_at TIMESTAMPTZ;
  v_new_expires_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Non autenticato');
  END IF;

  IF p_tokens IS NULL OR p_tokens < 10 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Minimo 10 token per boost');
  END IF;

  IF p_days IS NULL OR p_days < 1 OR p_days > 30 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Durata deve essere tra 1 e 30 giorni');
  END IF;

  -- tokens/giorno → multiplier (più spendi al giorno più è potente)
  v_tokens_per_day := p_tokens::NUMERIC / p_days;
  v_multiplier := LEAST(5.0, ROUND((1.0 + v_tokens_per_day * 0.1)::NUMERIC, 2));
  IF v_multiplier < 1.1 THEN v_multiplier := 1.1; END IF;

  -- Ownership check
  SELECT author_id, COALESCE(total_reads, 0)
  INTO v_book_author, v_book_total_reads
  FROM public.books
  WHERE id = p_book_id;

  IF v_book_author IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Libro non trovato');
  END IF;

  IF v_book_author <> v_user_id THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Non sei l''autore di questo libro');
  END IF;

  -- Saldo
  SELECT COALESCE(SUM(amount), 0) INTO v_total_bonus
  FROM public.tokens
  WHERE user_id = v_user_id
    AND spent = FALSE
    AND type IN ('WELCOME_TOKEN', 'REWARD_TOKEN', 'MONTHLY_TOKEN', 'ANNUAL_BONUS_TOKEN')
    AND (expires_at IS NULL OR expires_at > NOW());

  SELECT COALESCE(SUM(amount), 0) INTO v_total_purchased
  FROM public.tokens
  WHERE user_id = v_user_id
    AND spent = FALSE
    AND type = 'PURCHASED_TOKEN'
    AND (expires_at IS NULL OR expires_at > NOW());

  IF (v_total_bonus + v_total_purchased) < p_tokens THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Token insufficienti',
      'available', v_total_bonus + v_total_purchased,
      'needed', p_tokens
    );
  END IF;

  -- Spesa: bonus prima, poi PURCHASED
  v_remaining := p_tokens;

  FOR v_token IN
    SELECT id, amount, type
    FROM public.tokens
    WHERE user_id = v_user_id
      AND spent = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND type IN ('WELCOME_TOKEN', 'REWARD_TOKEN', 'MONTHLY_TOKEN', 'ANNUAL_BONUS_TOKEN', 'PURCHASED_TOKEN')
    ORDER BY
      CASE type
        WHEN 'WELCOME_TOKEN'      THEN 1
        WHEN 'REWARD_TOKEN'       THEN 2
        WHEN 'MONTHLY_TOKEN'      THEN 3
        WHEN 'ANNUAL_BONUS_TOKEN' THEN 4
        WHEN 'PURCHASED_TOKEN'    THEN 5
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
    ELSE
      v_bonus_used := v_bonus_used + v_use;
    END IF;

    v_remaining := v_remaining - v_use;
  END LOOP;

  -- Estende se già attivo, altrimenti NOW() + days
  SELECT boost_expires_at INTO v_existing_expires_at
  FROM public.books WHERE id = p_book_id;

  IF v_existing_expires_at IS NOT NULL AND v_existing_expires_at > NOW() THEN
    v_new_expires_at := v_existing_expires_at + (p_days || ' days')::INTERVAL;
  ELSE
    v_new_expires_at := NOW() + (p_days || ' days')::INTERVAL;
  END IF;

  INSERT INTO public.author_boosts (
    user_id, book_id, tokens_spent, tokens_from_bonus, tokens_from_purchased,
    duration_days, multiplier, reads_at_start, started_at, expires_at
  ) VALUES (
    v_user_id, p_book_id, p_tokens, v_bonus_used, v_purchased_used,
    p_days, v_multiplier, v_book_total_reads, NOW(), v_new_expires_at
  );

  UPDATE public.books
  SET boost_expires_at = v_new_expires_at,
      boost_multiplier = v_multiplier
  WHERE id = p_book_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'tokens_spent', p_tokens,
    'duration_days', p_days,
    'tokens_per_day', ROUND(v_tokens_per_day, 2),
    'multiplier', v_multiplier,
    'expires_at', v_new_expires_at,
    'tokens_from_bonus', v_bonus_used,
    'tokens_from_purchased', v_purchased_used,
    'reads_at_start', v_book_total_reads
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_author_boost(UUID, INTEGER, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
