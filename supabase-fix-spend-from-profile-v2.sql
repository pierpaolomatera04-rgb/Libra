-- ============================================
-- FIX v2: spend_tokens_internal — rimuove enforcement scadenza bonus
-- ============================================
-- v1 azzerava bonus_tokens se bonus_tokens_expire_date < NOW(),
-- ma il wallet UI li mostra comunque come disponibili.
-- Risultato: utenti con saldo "visibile" ma "scaduto" → "Token insufficienti".
--
-- v2: il saldo profilo (bonus + premium) è AUTHORITATIVE.
-- Niente check scadenza qui. Se in futuro vorremo gestire la scadenza,
-- la facciamo girare via cron job (azzera bonus_tokens dove expire_date < NOW())
-- in modo che wallet e spend siano sempre coerenti.
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
SET search_path = public
AS $$
DECLARE
  v_bonus INTEGER := 0;
  v_premium INTEGER := 0;
  v_use_bonus INTEGER := 0;
  v_use_premium INTEGER := 0;
  v_remaining INTEGER := p_amount;
  v_total_available INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Utente non autenticato');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Importo non valido');
  END IF;

  -- Lock riga profilo
  SELECT COALESCE(bonus_tokens, 0), COALESCE(premium_tokens, 0)
    INTO v_bonus, v_premium
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Profilo non trovato');
  END IF;

  -- Saldo profilo è authoritative — nessun check scadenza qui
  IF p_premium_only THEN
    v_total_available := v_premium;
  ELSE
    v_total_available := v_bonus + v_premium;
  END IF;

  IF v_total_available < p_amount THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Token insufficienti',
      'available', v_total_available,
      'needed', p_amount,
      'bonus_available', v_bonus,
      'premium_available', v_premium,
      'premium_only', p_premium_only
    );
  END IF;

  IF p_premium_only THEN
    v_use_premium := p_amount;
  ELSE
    -- Spendi prima bonus (gratuiti), poi premium (acquistati)
    v_use_bonus := LEAST(v_bonus, v_remaining);
    v_remaining := v_remaining - v_use_bonus;
    v_use_premium := v_remaining;
  END IF;

  UPDATE public.profiles
  SET
    bonus_tokens   = COALESCE(bonus_tokens, 0)   - v_use_bonus,
    premium_tokens = COALESCE(premium_tokens, 0) - v_use_premium
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'spent', p_amount,
    'bonus_used', v_use_bonus,
    'purchased_used', v_use_premium,
    'premium_used', v_use_premium,
    'bonus_remaining', v_bonus - v_use_bonus,
    'premium_remaining', v_premium - v_use_premium
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ============================================
-- Bonus: rinfresca la scadenza per i profili esistenti
-- (cosi non li perdi se in futuro reintrodurremo l'enforcement)
-- ============================================
UPDATE public.profiles
SET bonus_tokens_expire_date = GREATEST(
  COALESCE(bonus_tokens_expire_date, NOW()),
  NOW() + INTERVAL '30 days'
)
WHERE bonus_tokens > 0;

-- Verifica
SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc WHERE proname = 'spend_tokens_internal';
