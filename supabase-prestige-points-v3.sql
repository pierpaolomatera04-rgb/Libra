-- ============================================
-- LIBRA — PRESTIGE POINTS V3 — RICALIBRAZIONE
-- ============================================
-- Aggiorna le regole di accredito punti prestigio:
--   - Mance: +1 pt per ogni Token, ma SOLO se mancia >= 5 Token
--   - Acquisti singoli (unlocks): +5 pt per capitolo sbloccato con Token (invariato)
--   - Boost: +10 pt per Boost attivato (invariato, gestito in RPC boost_book)
--   - Abbonamento Silver: +15 pt/mese (accredito automatico su cambio piano)
--   - Abbonamento Gold:   +30 pt/mese (accredito automatico su cambio piano)
--
-- Nuove soglie badge (applicate lato UI, MecenateBadge.tsx):
--   NESSUNO   0 - 149
--   BRONZO    150 - 600
--   ARGENTO   601 - 1500
--   ORO       1501 - 3000
--   DIAMANTE  3000+
-- ============================================


-- ============================================
-- 1. Aggiorna trigger su donations — soglia minima 5 Token
-- ============================================
CREATE OR REPLACE FUNCTION public.award_tip_prestige()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo mance >= 5 Token accreditano prestige (1 pt per Token)
  IF COALESCE(NEW.amount, 0) >= 5 THEN
    UPDATE public.profiles
    SET prestige_points = COALESCE(prestige_points, 0) + NEW.amount
    WHERE id = NEW.donor_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Ricrea il trigger (idempotente)
DROP TRIGGER IF EXISTS trg_tip_prestige ON public.donations;
CREATE TRIGGER trg_tip_prestige
AFTER INSERT ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.award_tip_prestige();


-- ============================================
-- 2. Trigger su profiles — accredito automatico prestige al cambio abbonamento
--    Rileva passaggio a silver/gold (attivazione o rinnovo) e chiama
--    award_subscription_prestige per accreditare i punti del mese corrente.
--    Idempotente: il vincolo UNIQUE su (user_id, plan, period_key) nel log
--    impedisce doppi accrediti nello stesso mese.
-- ============================================
CREATE OR REPLACE FUNCTION public.award_subscription_prestige_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan TEXT;
BEGIN
  v_plan := COALESCE(NEW.subscription_plan, 'free');

  -- Accredita prestige ogni volta che il piano e' silver/gold.
  -- Per INSERT: sempre. Per UPDATE: se piano cambiato o end_date rinnovata.
  IF v_plan IN ('silver', 'gold') THEN
    IF TG_OP = 'INSERT'
       OR OLD.subscription_plan IS DISTINCT FROM NEW.subscription_plan
       OR OLD.subscription_end_date IS DISTINCT FROM NEW.subscription_end_date THEN
      PERFORM public.award_subscription_prestige(NEW.id, v_plan, NULL);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_prestige ON public.profiles;
CREATE TRIGGER trg_subscription_prestige
AFTER INSERT OR UPDATE OF subscription_plan, subscription_end_date ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.award_subscription_prestige_on_change();


-- ============================================
-- 3. Backfill correttivo per mance < 5 Token erroneamente premiate in V2
--    Sottrae i punti accreditati a mance con amount < 5 (one-shot, guardia).
-- ============================================
DO $$
DECLARE
  v_applied BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.migrations_applied WHERE key = 'prestige_v3_tip_correction'
  ) INTO v_applied;

  IF NOT v_applied THEN
    UPDATE public.profiles p
    SET prestige_points = GREATEST(0, COALESCE(p.prestige_points, 0) - d.pts)
    FROM (
      SELECT donor_id AS user_id, SUM(amount) AS pts
      FROM public.donations
      WHERE amount > 0 AND amount < 5
      GROUP BY donor_id
    ) d
    WHERE p.id = d.user_id;

    INSERT INTO public.migrations_applied (key) VALUES ('prestige_v3_tip_correction');
  END IF;
END $$;


NOTIFY pgrst, 'reload schema';
