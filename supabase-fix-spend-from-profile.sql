-- ============================================
-- FIX CRITICO: spend_tokens_internal usa profiles.bonus_tokens / premium_tokens
-- ============================================
-- Bug: la versione precedente leggeva dalla tabella `tokens` (granulare),
-- ma il wallet UI e il flusso d'acquisto aggiornano i contatori sul profilo
-- (`bonus_tokens`, `premium_tokens`). Risultato: utenti con saldo positivo
-- nel wallet ricevono "Token insufficienti" quando provano a reagire / boostare.
--
-- Questa versione rende il "saldo profilo" la single source of truth:
--   - spende prima i bonus_tokens (welcome/monthly, gratuiti)
--   - poi i premium_tokens (acquistati)
--   - in modalita p_premium_only=TRUE spende SOLO i premium_tokens
-- Mantiene la stessa firma e lo stesso JSON di ritorno.
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
  v_bonus_expire TIMESTAMPTZ;
  v_use_bonus INTEGER := 0;
  v_use_premium INTEGER := 0;
  v_remaining INTEGER := p_amount;
  v_total_available INTEGER;
  v_bonus_valid BOOLEAN;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Importo non valido');
  END IF;

  -- Lock riga profilo per evitare race condition
  SELECT COALESCE(bonus_tokens, 0), COALESCE(premium_tokens, 0), bonus_tokens_expire_date
    INTO v_bonus, v_premium, v_bonus_expire
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- I bonus token sono validi solo se non scaduti (o senza scadenza)
  v_bonus_valid := (v_bonus_expire IS NULL OR v_bonus_expire > NOW());
  IF NOT v_bonus_valid THEN
    v_bonus := 0;
  END IF;

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

  -- Strategia di spesa:
  --   - premium_only: tutto da premium
  --   - default: prima bonus (gratuiti, scadono), poi premium (acquistati, valore reale)
  IF p_premium_only THEN
    v_use_premium := p_amount;
  ELSE
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

-- Verifica firma
SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE proname = 'spend_tokens_internal';

-- Diagnostica: saldi del tuo utente (sostituisci YOUR_USER_ID se vuoi controllare)
-- SELECT id, email, bonus_tokens, premium_tokens, bonus_tokens_expire_date
-- FROM public.profiles
-- WHERE id = auth.uid();
