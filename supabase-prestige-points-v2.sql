-- ============================================
-- LIBRA — PRESTIGE POINTS V2 — ESPANSIONE TRIGGER
-- ============================================
-- Integra il sistema Mecenati con nuovi trigger automatici:
--   - Mance (donations)          => +1 prestige point per ogni Token reale
--   - Acquisti singoli (unlocks) => +5 prestige points per capitolo sbloccato
--   - Abbonamento Silver         => +15 prestige points/mese (via RPC)
--   - Abbonamento Gold           => +30 prestige points/mese (via RPC)
--
-- I trigger esistenti (boost +10, reazione premium +1) restano invariati.
-- I punti accumulati persistono anche se l'abbonamento viene cancellato;
-- l'accredito si ferma al mancato rinnovo.
-- ============================================


-- ============================================
-- 1. Trigger su donations — +1 prestige per ogni Token mandato in mancia
-- ============================================
CREATE OR REPLACE FUNCTION public.award_tip_prestige()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo mance con importo positivo (sicurezza)
  IF COALESCE(NEW.amount, 0) > 0 THEN
    UPDATE public.profiles
    SET prestige_points = COALESCE(prestige_points, 0) + NEW.amount
    WHERE id = NEW.donor_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tip_prestige ON public.donations;
CREATE TRIGGER trg_tip_prestige
AFTER INSERT ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.award_tip_prestige();


-- ============================================
-- 2. Trigger su block_unlocks — +5 prestige per ogni capitolo sbloccato con Token
--    (Esclude sblocchi gratuiti: primo blocco, libri open, tokens_spent = 0)
-- ============================================
CREATE OR REPLACE FUNCTION public.award_unlock_prestige()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF COALESCE(NEW.tokens_spent, 0) > 0 THEN
    UPDATE public.profiles
    SET prestige_points = COALESCE(prestige_points, 0) + 5
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unlock_prestige ON public.block_unlocks;
CREATE TRIGGER trg_unlock_prestige
AFTER INSERT ON public.block_unlocks
FOR EACH ROW
EXECUTE FUNCTION public.award_unlock_prestige();


-- ============================================
-- 3. Log abbonamenti per accredito prestige idempotente per periodo (mese)
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_prestige_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('silver', 'gold')),
  period_key TEXT NOT NULL, -- es. '2026-04' per rinnovo mensile univoco
  prestige_awarded INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, plan, period_key)
);

CREATE INDEX IF NOT EXISTS idx_sub_prestige_user
  ON public.subscription_prestige_log(user_id);


-- ============================================
-- 4. RPC award_subscription_prestige — chiamata a ogni attivazione/rinnovo
--    Sicura contro doppi accrediti nello stesso mese grazie al vincolo UNIQUE
-- ============================================
CREATE OR REPLACE FUNCTION public.award_subscription_prestige(
  p_user_id UUID,
  p_plan TEXT,                 -- 'silver' | 'gold'
  p_period_key TEXT DEFAULT NULL  -- default: anno-mese corrente (UTC)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prestige INTEGER;
  v_period TEXT;
BEGIN
  IF p_plan NOT IN ('silver', 'gold') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Plan non valido');
  END IF;

  v_prestige := CASE WHEN p_plan = 'gold' THEN 30 ELSE 15 END;
  v_period := COALESCE(p_period_key, TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM'));

  BEGIN
    INSERT INTO public.subscription_prestige_log (user_id, plan, period_key, prestige_awarded)
    VALUES (p_user_id, p_plan, v_period, v_prestige);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'already_awarded', TRUE,
      'error', 'Prestige gia accreditato per questo periodo',
      'period', v_period
    );
  END;

  UPDATE public.profiles
  SET prestige_points = COALESCE(prestige_points, 0) + v_prestige
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'plan', p_plan,
    'period', v_period,
    'prestige_gained', v_prestige
  );
END;
$$;


-- ============================================
-- 5. Backfill prestige per mance e sblocchi storici (one-shot)
--    Usa una guardia: segna in una tabella di meta-migrazione per non ripetere
-- ============================================
CREATE TABLE IF NOT EXISTS public.migrations_applied (
  key TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
  v_applied BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.migrations_applied WHERE key = 'prestige_v2_backfill'
  ) INTO v_applied;

  IF NOT v_applied THEN
    -- Backfill da block_unlocks (+5 per ogni sblocco con tokens > 0)
    UPDATE public.profiles p
    SET prestige_points = COALESCE(p.prestige_points, 0) + u.pts
    FROM (
      SELECT user_id, COUNT(*) * 5 AS pts
      FROM public.block_unlocks
      WHERE COALESCE(tokens_spent, 0) > 0
      GROUP BY user_id
    ) u
    WHERE p.id = u.user_id;

    -- Backfill da donations (+1 per ogni Token)
    UPDATE public.profiles p
    SET prestige_points = COALESCE(p.prestige_points, 0) + d.pts
    FROM (
      SELECT donor_id AS user_id, SUM(amount) AS pts
      FROM public.donations
      GROUP BY donor_id
    ) d
    WHERE p.id = d.user_id;

    INSERT INTO public.migrations_applied (key) VALUES ('prestige_v2_backfill');
  END IF;
END $$;


NOTIFY pgrst, 'reload schema';
