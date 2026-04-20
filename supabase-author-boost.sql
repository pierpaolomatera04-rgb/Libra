-- ============================================
-- LIBRA — AUTHOR BOOST (promozione libri da dashboard)
-- ============================================
-- Permette all'autore di promuovere i propri libri spendendo token:
--   - Costo: 10 token = 1 giorno di boost (minimo 10 token)
--   - Moltiplicatore visibility_score ×2.0 mentre il boost è attivo
--   - Spesa bonus prima (WELCOME + REWARD + MONTHLY + ANNUAL_BONUS),
--     poi reali (PURCHASED). Zero payout (nessuno viene pagato).
--   - Decadimento dinamico: niente cron, il boost cessa quando expires_at < NOW()
--
-- NB: tabella separata da public.book_boosts che gestisce i boost lettore→autore
-- ============================================


-- ============================================
-- 1. Colonne boost sul libro (snapshot del boost più recente/attivo)
-- ============================================
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS boost_multiplier NUMERIC(4,2) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_books_boost_active
  ON public.books(boost_expires_at)
  WHERE boost_expires_at IS NOT NULL;


-- ============================================
-- 2. Tabella author_boosts (storico completo)
-- ============================================
CREATE TABLE IF NOT EXISTS public.author_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  tokens_spent INTEGER NOT NULL CHECK (tokens_spent >= 10),
  tokens_from_bonus INTEGER NOT NULL DEFAULT 0,
  tokens_from_purchased INTEGER NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL CHECK (duration_days >= 1),
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 2.0,
  reads_at_start INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_author_boosts_user
  ON public.author_boosts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_author_boosts_book
  ON public.author_boosts(book_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_author_boosts_active
  ON public.author_boosts(book_id, expires_at);

ALTER TABLE public.author_boosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autore vede propri author boost" ON public.author_boosts;
CREATE POLICY "Autore vede propri author boost"
  ON public.author_boosts FOR SELECT
  USING (auth.uid() = user_id);

-- Inserimento gestito via RPC SECURITY DEFINER


-- ============================================
-- 3. VIEW books_with_boost — visibility score effettivo
-- ============================================
CREATE OR REPLACE VIEW public.books_with_boost AS
SELECT
  b.*,
  CASE
    WHEN b.boost_expires_at IS NOT NULL AND b.boost_expires_at > NOW()
      THEN COALESCE(b.visibility_score, 0) * COALESCE(b.boost_multiplier, 1.0)
    ELSE COALESCE(b.visibility_score, 0)::NUMERIC
  END AS effective_visibility_score,
  (b.boost_expires_at IS NOT NULL AND b.boost_expires_at > NOW()) AS is_boost_active
FROM public.books b;


-- ============================================
-- 4. RPC create_author_boost
-- ============================================
-- Parametri:
--   p_book_id — libro da promuovere (dev'essere dell'utente corrente)
--   p_tokens  — token totali da spendere (min 10, step 10)
--
-- Logica:
--   - Verifica ownership del libro
--   - duration_days = p_tokens / 10
--   - Spende bonus first (WELCOME, REWARD, MONTHLY, ANNUAL_BONUS) poi PURCHASED
--   - Inserisce riga in author_boosts con snapshot reads_at_start = books.total_reads
--   - Se c'è già un boost attivo, estende expires_at sommando la durata
--   - Altrimenti imposta expires_at = NOW() + duration_days
--   - Aggiorna books.boost_expires_at e boost_multiplier = 2.0
--
-- Ritorna JSONB: success, tokens_spent, duration_days, expires_at, tokens_from_bonus, tokens_from_purchased
-- ============================================
CREATE OR REPLACE FUNCTION public.create_author_boost(
  p_book_id UUID,
  p_tokens INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_book_author UUID;
  v_book_total_reads INTEGER;
  v_duration_days INTEGER;
  v_multiplier NUMERIC(4,2) := 2.0;
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
  -- Auth check
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Non autenticato');
  END IF;

  -- Validazione input
  IF p_tokens IS NULL OR p_tokens < 10 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Minimo 10 token per boost');
  END IF;

  IF p_tokens % 10 <> 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'I token devono essere multipli di 10');
  END IF;

  v_duration_days := p_tokens / 10;

  -- Verifica ownership del libro e preleva total_reads snapshot
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

  -- Verifica saldo sufficiente (bonus + purchased)
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

  -- Spesa token: bonus prima (WELCOME → REWARD → MONTHLY → ANNUAL_BONUS), poi PURCHASED
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

  -- Calcolo nuovo expires_at (estende boost esistente se attivo)
  SELECT boost_expires_at INTO v_existing_expires_at
  FROM public.books WHERE id = p_book_id;

  IF v_existing_expires_at IS NOT NULL AND v_existing_expires_at > NOW() THEN
    v_new_expires_at := v_existing_expires_at + (v_duration_days || ' days')::INTERVAL;
  ELSE
    v_new_expires_at := NOW() + (v_duration_days || ' days')::INTERVAL;
  END IF;

  -- Registra boost in author_boosts
  INSERT INTO public.author_boosts (
    user_id, book_id, tokens_spent, tokens_from_bonus, tokens_from_purchased,
    duration_days, multiplier, reads_at_start, started_at, expires_at
  ) VALUES (
    v_user_id, p_book_id, p_tokens, v_bonus_used, v_purchased_used,
    v_duration_days, v_multiplier, v_book_total_reads, NOW(), v_new_expires_at
  );

  -- Aggiorna books con nuovo expires_at e multiplier
  UPDATE public.books
  SET boost_expires_at = v_new_expires_at,
      boost_multiplier = v_multiplier
  WHERE id = p_book_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'tokens_spent', p_tokens,
    'duration_days', v_duration_days,
    'expires_at', v_new_expires_at,
    'tokens_from_bonus', v_bonus_used,
    'tokens_from_purchased', v_purchased_used,
    'multiplier', v_multiplier,
    'reads_at_start', v_book_total_reads
  );
END;
$$;


-- ============================================
-- 5. Helper: saldo segmentato (bonus vs reali) per API/UI
-- ============================================
CREATE OR REPLACE FUNCTION public.get_token_balance_split(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_bonus INTEGER;
  v_purchased INTEGER;
  v_tippable INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_bonus
  FROM public.tokens
  WHERE user_id = p_user_id
    AND spent = FALSE
    AND type IN ('WELCOME_TOKEN', 'REWARD_TOKEN', 'MONTHLY_TOKEN', 'ANNUAL_BONUS_TOKEN')
    AND (expires_at IS NULL OR expires_at > NOW());

  SELECT COALESCE(SUM(amount), 0) INTO v_purchased
  FROM public.tokens
  WHERE user_id = p_user_id
    AND spent = FALSE
    AND type = 'PURCHASED_TOKEN'
    AND (expires_at IS NULL OR expires_at > NOW());

  -- Tippable = solo ANNUAL_BONUS + PURCHASED (MONTHLY non più, come da policy v2)
  SELECT COALESCE(SUM(amount), 0) INTO v_tippable
  FROM public.tokens
  WHERE user_id = p_user_id
    AND spent = FALSE
    AND type IN ('ANNUAL_BONUS_TOKEN', 'PURCHASED_TOKEN')
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN jsonb_build_object(
    'bonus', v_bonus,
    'purchased', v_purchased,
    'total', v_bonus + v_purchased,
    'tippable', v_tippable,
    'boostable', v_bonus + v_purchased
  );
END;
$$;


NOTIFY pgrst, 'reload schema';
