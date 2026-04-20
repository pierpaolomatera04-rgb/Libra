-- ============================================
-- LIBRA — SISTEMA XP V5
-- ============================================
-- Riscrittura completa del sistema XP con:
--   - Curva lineare: 100 XP/livello, infiniti (no cap 50)
--   - Ranghi: Bronzo (1-9), Argento (10-24), Oro (25-49), Diamante (50+)
--   - Ricompense automatiche: Argento +80 REWARD_TOKEN, Oro +200 + badge,
--                             Diamante +500 + badge + 1 mese Gold gratis
--   - Nuovo tipo REWARD_TOKEN (bonus, NON spendibile per mance, no payout)
--   - Cap giornalieri/settimanali via tabella xp_event_log
--   - Eventi one-time idempotenti (profilo, primo abbonamento, upgrade, annual)
--   - Trigger abbonamenti: Silver +30/mese, Gold +60/mese, primo +100,
--                          upgrade +50, annual Silver +360, annual Gold +720
--   - Trigger profilo: +30 XP quando avatar+bio completi (una tantum)
--   - Trigger signup: +20 XP al primo accesso
--   - Streak weekly: +50 XP ogni 7 giorni consecutivi (max 1/settimana)
-- ============================================


-- ============================================
-- 1. Aggiungi 'REWARD_TOKEN' al check constraint di tokens + token_transactions
-- ============================================
ALTER TABLE public.tokens DROP CONSTRAINT IF EXISTS tokens_type_check;
ALTER TABLE public.tokens ADD CONSTRAINT tokens_type_check
  CHECK (type IN ('WELCOME_TOKEN', 'MONTHLY_TOKEN', 'PURCHASED_TOKEN', 'ANNUAL_BONUS_TOKEN', 'REWARD_TOKEN'));

ALTER TABLE public.token_transactions DROP CONSTRAINT IF EXISTS token_transactions_token_type_check;
ALTER TABLE public.token_transactions ADD CONSTRAINT token_transactions_token_type_check
  CHECK (token_type IN ('WELCOME_TOKEN', 'MONTHLY_TOKEN', 'PURCHASED_TOKEN', 'ANNUAL_BONUS_TOKEN', 'REWARD_TOKEN'));


-- ============================================
-- 2. Tabella xp_event_log: tracking per cap e idempotenza
-- ============================================
CREATE TABLE IF NOT EXISTS public.xp_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,        -- es. 'comment', 'share_sentence', 'book_complete:<uuid>'
  period_key TEXT NOT NULL,    -- es. '2026-04-20' per daily, '2026-W16' per weekly, 'once' per one-time
  xp_awarded INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_event_log_user_reason
  ON public.xp_event_log(user_id, reason);
CREATE INDEX IF NOT EXISTS idx_xp_event_log_user_period
  ON public.xp_event_log(user_id, reason, period_key);


-- ============================================
-- 3. Funzione calc_xp_level — curva lineare 100 XP/livello
-- ============================================
CREATE OR REPLACE FUNCTION public.calc_xp_level(p_total_xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_total_xp IS NULL OR p_total_xp < 0 THEN
    RETURN 1;
  END IF;
  RETURN FLOOR(p_total_xp / 100)::INTEGER + 1;
END;
$$;


-- ============================================
-- 4. Funzione rank_tier — restituisce il rango dal livello
-- ============================================
CREATE OR REPLACE FUNCTION public.calc_rank_tier(p_level INTEGER)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_level >= 50 THEN RETURN 'diamante'; END IF;
  IF p_level >= 25 THEN RETURN 'oro'; END IF;
  IF p_level >= 10 THEN RETURN 'argento'; END IF;
  RETURN 'bronzo';
END;
$$;


-- ============================================
-- 5. award_xp RPC
-- ============================================
-- Parametri:
--   p_user_id  — utente
--   p_amount   — XP da accreditare (prima dei cap)
--   p_reason   — chiave evento. Determina cap e idempotenza:
--                 * 'comment'         → max 5/giorno, cap XP 25/giorno
--                 * 'share_sentence'  → max 2/giorno, cap XP 20/giorno
--                 * 'follow_author'   → max 3/giorno, cap XP 15/giorno
--                 * 'streak_weekly'   → max 1/settimana
--                 * 'book_complete:<bookId>' → una tantum per libro
--                 * 'profile_complete','signup_first_login','first_subscription',
--                   'upgrade_silver_to_gold','annual_silver','annual_gold' → una tantum
--                 * 'tip','boost','block_complete','subscription_silver',
--                   'subscription_gold' → senza cap
--
-- Ritorna JSONB con: success, xp_added, old_level, new_level, new_total_xp,
--                    level_up, reward_tokens, granted_exclusive_badge,
--                    granted_gold_month, capped, cap_reason
-- ============================================
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'activity'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old_xp INTEGER;
  v_new_xp INTEGER;
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_reward_tokens INTEGER := 0;
  v_exclusive_badge BOOLEAN := FALSE;
  v_gold_month BOOLEAN := FALSE;
  v_level_check INTEGER;
  v_period TEXT;
  v_today TEXT;
  v_week TEXT;
  v_daily_count INTEGER;
  v_daily_cap_count INTEGER := NULL;
  v_is_one_time BOOLEAN := FALSE;
  v_is_weekly BOOLEAN := FALSE;
  v_already_awarded BOOLEAN := FALSE;
  v_capped BOOLEAN := FALSE;
  v_cap_reason TEXT := NULL;
  v_reason_prefix TEXT;
  v_amount INTEGER := COALESCE(p_amount, 0);
BEGIN
  IF v_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', TRUE, 'xp_added', 0, 'capped', FALSE
    );
  END IF;

  v_today := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  v_week  := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'IYYY-"W"IW');

  -- Determina tipo di cap dal reason
  v_reason_prefix := split_part(p_reason, ':', 1);

  IF v_reason_prefix = 'comment' THEN
    v_daily_cap_count := 5; v_period := v_today;
  ELSIF v_reason_prefix = 'share_sentence' THEN
    v_daily_cap_count := 2; v_period := v_today;
  ELSIF v_reason_prefix = 'follow_author' THEN
    v_daily_cap_count := 3; v_period := v_today;
  ELSIF v_reason_prefix = 'streak_weekly' THEN
    v_is_weekly := TRUE; v_period := v_week;
  ELSIF v_reason_prefix IN (
    'profile_complete', 'signup_first_login', 'first_subscription',
    'upgrade_silver_to_gold', 'annual_silver', 'annual_gold', 'book_complete'
  ) THEN
    v_is_one_time := TRUE; v_period := 'once';
  ELSE
    v_period := v_today; -- log informativo per azioni senza cap
  END IF;

  -- Controllo idempotenza per one-time e weekly (su reason completo)
  IF v_is_one_time OR v_is_weekly THEN
    v_already_awarded := EXISTS (
      SELECT 1 FROM public.xp_event_log
      WHERE user_id = p_user_id
        AND reason = p_reason
        AND period_key = v_period
    );

    IF v_already_awarded THEN
      v_old_xp := COALESCE((SELECT total_xp FROM public.profiles WHERE id = p_user_id), 0);
      v_new_level := public.calc_xp_level(v_old_xp);
      RETURN jsonb_build_object(
        'success', TRUE, 'xp_added', 0, 'old_level', v_new_level,
        'new_level', v_new_level, 'new_total_xp', v_old_xp,
        'level_up', FALSE, 'reward_tokens', 0,
        'granted_exclusive_badge', FALSE, 'granted_gold_month', FALSE,
        'capped', TRUE, 'cap_reason', CASE WHEN v_is_weekly THEN 'weekly' ELSE 'one_time' END
      );
    END IF;
  END IF;

  -- Controllo cap giornalieri (per reason con count)
  IF v_daily_cap_count IS NOT NULL THEN
    v_daily_count := (
      SELECT COUNT(*)::INTEGER
      FROM public.xp_event_log
      WHERE user_id = p_user_id
        AND reason = p_reason
        AND period_key = v_period
    );

    IF v_daily_count >= v_daily_cap_count THEN
      v_old_xp := COALESCE((SELECT total_xp FROM public.profiles WHERE id = p_user_id), 0);
      v_new_level := public.calc_xp_level(v_old_xp);
      RETURN jsonb_build_object(
        'success', TRUE, 'xp_added', 0, 'old_level', v_new_level,
        'new_level', v_new_level, 'new_total_xp', v_old_xp,
        'level_up', FALSE, 'reward_tokens', 0,
        'granted_exclusive_badge', FALSE, 'granted_gold_month', FALSE,
        'capped', TRUE, 'cap_reason', 'daily'
      );
    END IF;
  END IF;

  -- Leggi XP attuali
  SELECT COALESCE(total_xp, 0) INTO v_old_xp FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Utente non trovato');
  END IF;

  v_new_xp := v_old_xp + v_amount;
  v_old_level := public.calc_xp_level(v_old_xp);
  v_new_level := public.calc_xp_level(v_new_xp);

  -- Aggiorna XP
  UPDATE public.profiles SET total_xp = v_new_xp WHERE id = p_user_id;

  -- Registra evento (per tracking cap)
  INSERT INTO public.xp_event_log (user_id, reason, period_key, xp_awarded)
  VALUES (p_user_id, p_reason, v_period, v_amount);

  -- Gestisci level-up e ricompense (Argento/Oro/Diamante)
  IF v_new_level > v_old_level THEN
    FOR v_level_check IN (v_old_level + 1)..v_new_level LOOP
      IF v_level_check = 10 THEN
        v_reward_tokens := v_reward_tokens + 80;
      ELSIF v_level_check = 25 THEN
        v_reward_tokens := v_reward_tokens + 200;
        v_exclusive_badge := TRUE;
      ELSIF v_level_check = 50 THEN
        v_reward_tokens := v_reward_tokens + 500;
        v_exclusive_badge := TRUE;
        v_gold_month := TRUE;
      END IF;
    END LOOP;

    -- Accredita REWARD_TOKEN (non spendibili per mance, no payout)
    IF v_reward_tokens > 0 THEN
      INSERT INTO public.tokens (user_id, amount, type, expires_at, spent)
      VALUES (p_user_id, v_reward_tokens, 'REWARD_TOKEN', NULL, FALSE);
    END IF;

    -- Accredita 1 mese Gold gratis al raggiungimento del livello 50
    IF v_gold_month THEN
      UPDATE public.profiles
      SET subscription_plan = 'gold',
          subscription_end_date = GREATEST(
            COALESCE(subscription_end_date, NOW()),
            NOW()
          ) + INTERVAL '1 month',
          plan_expires_at = GREATEST(
            COALESCE(plan_expires_at, NOW()),
            NOW()
          ) + INTERVAL '1 month'
      WHERE id = p_user_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'xp_added', v_amount,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'new_total_xp', v_new_xp,
    'level_up', v_new_level > v_old_level,
    'reward_tokens', v_reward_tokens,
    'granted_exclusive_badge', v_exclusive_badge,
    'granted_gold_month', v_gold_month,
    'capped', FALSE,
    'cap_reason', NULL
  );
END;
$$;


-- ============================================
-- 6. Trigger abbonamenti — v5
-- ============================================
-- Logica:
--   - Primo abbonamento (qualsiasi): +100 XP (one-time)
--   - Upgrade Silver → Gold: +50 XP (one-time)
--   - Rinnovo mensile Silver: +30 XP
--   - Rinnovo mensile Gold:   +60 XP
--   - Attivazione annual Silver: +360 XP (one-time)
--   - Attivazione annual Gold:   +720 XP (one-time)
--
-- Usa il campo `plan` ('silver_monthly','silver_annual','gold_monthly','gold_annual')
-- quando presente, altrimenti cade su subscription_plan per compatibilità.
-- ============================================

DROP TRIGGER IF EXISTS trg_subscription_xp_bonus ON public.profiles;

CREATE OR REPLACE FUNCTION public.award_subscription_xp_v5()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_full TEXT;
  v_plan_base TEXT;        -- 'silver' | 'gold'
  v_is_annual BOOLEAN := FALSE;
  v_old_plan TEXT;
  v_old_plan_base TEXT;
  v_renewed BOOLEAN := FALSE;
BEGIN
  v_plan_full := COALESCE(NEW.plan, '');
  v_old_plan := COALESCE(OLD.plan, '');

  -- Ricava plan_base da `plan` o fallback a subscription_plan
  IF v_plan_full LIKE 'silver%' THEN
    v_plan_base := 'silver';
    v_is_annual := v_plan_full = 'silver_annual';
  ELSIF v_plan_full LIKE 'gold%' THEN
    v_plan_base := 'gold';
    v_is_annual := v_plan_full = 'gold_annual';
  ELSE
    v_plan_base := COALESCE(NEW.subscription_plan, 'free');
  END IF;

  IF v_old_plan LIKE 'silver%' THEN
    v_old_plan_base := 'silver';
  ELSIF v_old_plan LIKE 'gold%' THEN
    v_old_plan_base := 'gold';
  ELSE
    v_old_plan_base := COALESCE(OLD.subscription_plan, 'free');
  END IF;

  -- Se non è su un piano a pagamento, stop
  IF v_plan_base NOT IN ('silver', 'gold') THEN
    RETURN NEW;
  END IF;

  -- Determina se è un rinnovo (stesso piano, ma end_date spinto avanti)
  IF TG_OP = 'UPDATE'
     AND v_old_plan_base = v_plan_base
     AND OLD.plan IS NOT DISTINCT FROM NEW.plan
     AND OLD.subscription_end_date IS DISTINCT FROM NEW.subscription_end_date THEN
    v_renewed := TRUE;
  END IF;

  -- Primo abbonamento (una tantum): se prima era free
  IF v_old_plan_base = 'free' THEN
    PERFORM public.award_xp(NEW.id, 100, 'first_subscription');
  END IF;

  -- Upgrade Silver → Gold (una tantum)
  IF v_old_plan_base = 'silver' AND v_plan_base = 'gold' THEN
    PERFORM public.award_xp(NEW.id, 50, 'upgrade_silver_to_gold');
  END IF;

  -- Attivazione annual (una tantum per tipo)
  IF v_is_annual AND OLD.plan IS DISTINCT FROM NEW.plan THEN
    IF v_plan_base = 'silver' THEN
      PERFORM public.award_xp(NEW.id, 360, 'annual_silver');
    ELSE
      PERFORM public.award_xp(NEW.id, 720, 'annual_gold');
    END IF;
  END IF;

  -- Rinnovo mensile (solo se il piano corrente è *_monthly o manca e c'è rinnovo)
  IF v_renewed AND NOT v_is_annual THEN
    IF v_plan_base = 'silver' THEN
      PERFORM public.award_xp(NEW.id, 30, 'subscription_silver');
    ELSE
      PERFORM public.award_xp(NEW.id, 60, 'subscription_gold');
    END IF;
  END IF;

  -- Attivazione mensile (prima volta su questo piano mensile, non annual)
  IF TG_OP = 'UPDATE'
     AND NOT v_is_annual
     AND OLD.plan IS DISTINCT FROM NEW.plan
     AND v_old_plan_base <> v_plan_base THEN
    IF v_plan_base = 'silver' THEN
      PERFORM public.award_xp(NEW.id, 30, 'subscription_silver');
    ELSE
      PERFORM public.award_xp(NEW.id, 60, 'subscription_gold');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_subscription_xp_bonus
AFTER INSERT OR UPDATE OF plan, subscription_plan, subscription_end_date ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.award_subscription_xp_v5();


-- ============================================
-- 7. Trigger profilo completato — +30 XP una tantum quando avatar+bio impostati
-- ============================================
CREATE OR REPLACE FUNCTION public.award_profile_complete_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_complete BOOLEAN;
  v_old_complete BOOLEAN;
BEGIN
  v_new_complete := (NEW.avatar_url IS NOT NULL AND NEW.avatar_url <> '')
                AND (NEW.bio IS NOT NULL AND NEW.bio <> '');
  v_old_complete := (OLD.avatar_url IS NOT NULL AND OLD.avatar_url <> '')
                AND (OLD.bio IS NOT NULL AND OLD.bio <> '');

  IF v_new_complete AND NOT v_old_complete THEN
    PERFORM public.award_xp(NEW.id, 30, 'profile_complete');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_complete_xp ON public.profiles;
CREATE TRIGGER trg_profile_complete_xp
AFTER UPDATE OF avatar_url, bio ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.award_profile_complete_xp();


-- ============================================
-- 8. Trigger signup — +20 XP al primo insert profilo
-- ============================================
CREATE OR REPLACE FUNCTION public.award_signup_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.award_xp(NEW.id, 20, 'signup_first_login');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_signup_xp ON public.profiles;
CREATE TRIGGER trg_signup_xp
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.award_signup_xp();


-- ============================================
-- 9. Trigger streak — +50 XP quando daily_streak raggiunge un multiplo di 7
--     (una volta per settimana, idempotente via period_key settimanale)
-- ============================================
CREATE OR REPLACE FUNCTION public.award_streak_weekly_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.daily_streak IS NULL OR NEW.daily_streak < 7 THEN
    RETURN NEW;
  END IF;

  -- Scatta solo se lo streak è un multiplo di 7 e non accreditato questa settimana
  IF (NEW.daily_streak % 7) = 0
     AND (OLD.daily_streak IS DISTINCT FROM NEW.daily_streak) THEN
    PERFORM public.award_xp(NEW.id, 50, 'streak_weekly');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_streak_weekly_xp ON public.profiles;
CREATE TRIGGER trg_streak_weekly_xp
AFTER UPDATE OF daily_streak ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.award_streak_weekly_xp();


-- ============================================
-- 10. RLS per xp_event_log: solo SECURITY DEFINER scrive, utente legge suoi
-- ============================================
ALTER TABLE public.xp_event_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utente legge propri eventi xp" ON public.xp_event_log;
CREATE POLICY "Utente legge propri eventi xp"
  ON public.xp_event_log FOR SELECT
  USING (auth.uid() = user_id);


NOTIFY pgrst, 'reload schema';
