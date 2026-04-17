-- ============================================
-- FIX: block_unlocks.token_type CHECK constraint
-- Permette il valore 'free' per i libri open/gratuiti
-- e 'plan' per gli sblocchi tramite abbonamento
-- ============================================

ALTER TABLE public.block_unlocks
  DROP CONSTRAINT IF EXISTS block_unlocks_token_type_check;

ALTER TABLE public.block_unlocks
  ADD CONSTRAINT block_unlocks_token_type_check
  CHECK (token_type IN ('bonus', 'premium', 'mixed', 'free', 'plan'));

-- Verifica
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.block_unlocks'::regclass
  AND conname LIKE '%token_type%';
