-- ============================================
-- LIBRA — UNIFICAZIONE XP V4
-- ============================================
-- Rimuove la separazione "Punti Prestigio" e convoglia tutto il supporto
-- economico nel sistema XP esistente.
--
-- Azioni:
--   1) Drop dei trigger prestige esistenti (tip, unlock, subscription)
--   2) Nuovo trigger su profiles: al cambio piano Silver/Gold accredita
--      un BONUS XP consistente (1000 Silver, 2000 Gold) idempotente per mese
--
-- NOTA: il bonus XP delle mance e' gestito lato API (/api/tips/route.ts)
-- perche' passa attraverso la RPC award_xp che calcola anche i level-up
-- e le ricompense token dei livelli chiave.
--
-- La colonna `prestige_points` su profiles NON viene rimossa per sicurezza;
-- resta come dato storico congelato. L'UI non la mostra piu'.
-- ============================================


-- ============================================
-- 1. Rimuovi trigger prestige esistenti
-- ============================================
DROP TRIGGER IF EXISTS trg_tip_prestige ON public.donations;
DROP TRIGGER IF EXISTS trg_unlock_prestige ON public.block_unlocks;
DROP TRIGGER IF EXISTS trg_subscription_prestige ON public.profiles;


-- ============================================
-- 2. Nuovo trigger su profiles: bonus XP al cambio abbonamento
--    Idempotente per mese grazie alla tabella subscription_prestige_log
--    (viene riusata con period_key='YYYY-MM-xp' per separarlo dai vecchi
--    accrediti prestige, evitando collisioni con lo storico)
-- ============================================
CREATE OR REPLACE FUNCTION public.award_subscription_xp_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan TEXT;
  v_bonus INTEGER;
  v_period TEXT;
BEGIN
  v_plan := COALESCE(NEW.subscription_plan, 'free');

  IF v_plan NOT IN ('silver', 'gold') THEN
    RETURN NEW;
  END IF;

  -- Accredita solo all'attivazione o al rinnovo (cambio data fine)
  IF TG_OP = 'UPDATE'
     AND OLD.subscription_plan IS NOT DISTINCT FROM NEW.subscription_plan
     AND OLD.subscription_end_date IS NOT DISTINCT FROM NEW.subscription_end_date THEN
    RETURN NEW;
  END IF;

  v_bonus := CASE WHEN v_plan = 'gold' THEN 2000 ELSE 1000 END;
  v_period := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM') || '-xp';

  BEGIN
    INSERT INTO public.subscription_prestige_log (user_id, plan, period_key, prestige_awarded)
    VALUES (NEW.id, v_plan, v_period, v_bonus);
  EXCEPTION WHEN unique_violation THEN
    -- Gia' accreditato per questo mese
    RETURN NEW;
  END;

  -- Accredita tramite la RPC ufficiale award_xp cosi' da gestire
  -- correttamente i level-up e le ricompense dei livelli chiave.
  PERFORM public.award_xp(NEW.id, v_bonus, 'subscription_' || v_plan);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_xp_bonus ON public.profiles;
CREATE TRIGGER trg_subscription_xp_bonus
AFTER INSERT OR UPDATE OF subscription_plan, subscription_end_date ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.award_subscription_xp_bonus();


NOTIFY pgrst, 'reload schema';
