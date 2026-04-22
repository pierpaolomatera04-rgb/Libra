-- =====================================================
-- FIX: Backfill books.tier da access_level
-- =====================================================
-- Problema: il flusso di pubblicazione impostava solo `access_level`
-- e lasciava `tier` al default 'free'. L'access check (lib/access.ts)
-- usa `tier` come campo autoritativo, quindi libri Silver/Gold
-- risultavano accessibili gratis a tutti gli utenti.
--
-- Questa migrazione sincronizza i libri esistenti:
--   access_level='silver_choice'   -> tier='silver'
--   access_level='gold_exclusive'  -> tier='gold'
--   access_level='open'            -> tier='free'
-- =====================================================

UPDATE books
SET tier = 'silver'
WHERE access_level = 'silver_choice'
  AND tier IS DISTINCT FROM 'silver';

UPDATE books
SET tier = 'gold'
WHERE access_level = 'gold_exclusive'
  AND tier IS DISTINCT FROM 'gold';

UPDATE books
SET tier = 'free'
WHERE access_level = 'open'
  AND tier IS DISTINCT FROM 'free';
