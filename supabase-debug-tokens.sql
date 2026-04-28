-- ============================================
-- DIAGNOSTICA TOKEN — esegui in SQL Editor LOGGATO con il tuo utente
-- (oppure sostituisci auth.uid() con il tuo UUID)
-- ============================================

-- 1) Cosa vede il wallet (profilo)
SELECT
  id,
  email,
  bonus_tokens,
  premium_tokens,
  bonus_tokens_expire_date,
  (bonus_tokens_expire_date IS NULL OR bonus_tokens_expire_date > NOW()) AS bonus_validi,
  COALESCE(bonus_tokens, 0) + COALESCE(premium_tokens, 0) AS totale_wallet
FROM public.profiles
WHERE id = auth.uid();

-- 2) Versione attuale di spend_tokens_internal (per capire se la fix è andata)
SELECT
  proname,
  pg_get_function_identity_arguments(oid) AS args,
  pg_get_functiondef(oid) AS body
FROM pg_proc
WHERE proname = 'spend_tokens_internal';

-- 3) Test diretto: simula la spesa di 1 token
SELECT public.spend_tokens_internal(auth.uid(), 1, FALSE) AS risultato_spesa;

-- 4) Dopo il test (3) ricontrolla saldi
SELECT bonus_tokens, premium_tokens FROM public.profiles WHERE id = auth.uid();
