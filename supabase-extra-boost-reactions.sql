-- ============================================
-- LIBRA — EXTRA BLOCKS, BOOST VISIBILITA, REAZIONI PREMIUM
-- ============================================
-- 1. Blocchi EXTRA: blocchi premium NON inclusi in nessun abbonamento,
--    sbloccabili SOLO con token reali (purchased), non bonus.
-- 2. Boost Visibilita: 10 token (bonus o premium) per spinta visibilita libro,
--    1 boost per utente per libro ogni 24h. 70/30 split solo per token reali.
-- 3. Reazioni Premium: 1 token (bonus o premium) per reazione, +5 XP a entrambi.
-- ============================================

-- ============================================
-- 1. BLOCKS.is_extra
-- ============================================
ALTER TABLE public.blocks
  ADD COLUMN IF NOT EXISTS is_extra BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_blocks_is_extra
  ON public.blocks(book_id) WHERE is_extra = TRUE;


-- ============================================
-- 2. TABELLA BOOK_BOOSTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.book_boosts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  tokens_spent INTEGER NOT NULL DEFAULT 10,
  author_payout DECIMAL(10,2) DEFAULT 0.00,
  platform_payout DECIMAL(10,2) DEFAULT 0.00,
  used_real_tokens BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_boosts_user_book_time
  ON public.book_boosts(user_id, book_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_boosts_book
  ON public.book_boosts(book_id);

ALTER TABLE public.book_boosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utenti vedono propri boost" ON public.book_boosts;
CREATE POLICY "Utenti vedono propri boost"
  ON public.book_boosts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Tutti vedono boost di un libro" ON public.book_boosts;
CREATE POLICY "Tutti vedono boost di un libro"
  ON public.book_boosts FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Utenti creano propri boost" ON public.book_boosts;
CREATE POLICY "Utenti creano propri boost"
  ON public.book_boosts FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- 3. TABELLA COMMENT_REACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('fire', 'heart', 'star', 'gem', 'crown')),
  tokens_spent INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, comment_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment
  ON public.comment_reactions(comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_user
  ON public.comment_reactions(user_id);

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutti vedono reazioni" ON public.comment_reactions;
CREATE POLICY "Tutti vedono reazioni"
  ON public.comment_reactions FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Utenti creano proprie reazioni" ON public.comment_reactions;
CREATE POLICY "Utenti creano proprie reazioni"
  ON public.comment_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- 4. RPC: spend_tokens_internal
-- Helper interno: spende token nell'ordine MONTHLY -> ANNUAL_BONUS -> PURCHASED.
-- Se p_premium_only = TRUE spende SOLO PURCHASED_TOKEN.
-- Restituisce JSON con success, total_purchased_used (per calcolo payout).
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
AS $$
DECLARE
  v_remaining INTEGER := p_amount;
  v_purchased_used INTEGER := 0;
  v_token RECORD;
  v_use INTEGER;
  v_total_available INTEGER;
BEGIN
  -- Verifica disponibilita totale
  IF p_premium_only THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_available
    FROM public.tokens
    WHERE user_id = p_user_id
      AND spent = FALSE
      AND type = 'PURCHASED_TOKEN'
      AND (expires_at IS NULL OR expires_at > NOW());
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO v_total_available
    FROM public.tokens
    WHERE user_id = p_user_id
      AND spent = FALSE
      AND type IN ('MONTHLY_TOKEN', 'ANNUAL_BONUS_TOKEN', 'PURCHASED_TOKEN')
      AND (expires_at IS NULL OR expires_at > NOW());
  END IF;

  IF v_total_available < p_amount THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Token insufficienti', 'available', v_total_available, 'needed', p_amount);
  END IF;

  -- Ordine di spesa
  FOR v_token IN
    SELECT id, amount, type
    FROM public.tokens
    WHERE user_id = p_user_id
      AND spent = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (
        (NOT p_premium_only AND type IN ('MONTHLY_TOKEN', 'ANNUAL_BONUS_TOKEN', 'PURCHASED_TOKEN'))
        OR (p_premium_only AND type = 'PURCHASED_TOKEN')
      )
    ORDER BY
      CASE type
        WHEN 'MONTHLY_TOKEN' THEN 1
        WHEN 'ANNUAL_BONUS_TOKEN' THEN 2
        WHEN 'PURCHASED_TOKEN' THEN 3
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
    END IF;
    v_remaining := v_remaining - v_use;
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'spent', p_amount - v_remaining,
    'purchased_used', v_purchased_used
  );
END;
$$;


-- ============================================
-- 5. RPC: boost_book
-- 10 token per boost, max 1 per utente per libro ogni 24h.
-- 70/30 split applicato solo alla quota di token reali (PURCHASED).
-- ============================================
DROP FUNCTION IF EXISTS public.boost_book(UUID, UUID);

CREATE OR REPLACE FUNCTION public.boost_book(
  p_user_id UUID,
  p_book_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_boost_cost INTEGER := 10;
  v_recent_count INTEGER;
  v_spend_result JSONB;
  v_purchased_used INTEGER;
  v_author_payout DECIMAL(10,2) := 0;
  v_platform_payout DECIMAL(10,2) := 0;
  v_euro_value DECIMAL(10,2);
BEGIN
  -- Anti-abuso: nessun boost dello stesso utente sullo stesso libro nelle ultime 24h
  SELECT COUNT(*) INTO v_recent_count
  FROM public.book_boosts
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND created_at > NOW() - INTERVAL '24 hours';

  IF v_recent_count > 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Hai gia boostato questo libro nelle ultime 24 ore');
  END IF;

  -- Spendi 10 token (bonus prima, poi reali)
  v_spend_result := public.spend_tokens_internal(p_user_id, v_boost_cost, FALSE);
  IF NOT (v_spend_result->>'success')::BOOLEAN THEN
    RETURN v_spend_result;
  END IF;

  v_purchased_used := COALESCE((v_spend_result->>'purchased_used')::INTEGER, 0);

  -- Calcolo payout solo sui token reali — 1 token = 0.10 euro
  IF v_purchased_used > 0 THEN
    v_euro_value := v_purchased_used * 0.10;
    v_author_payout := ROUND(v_euro_value * 0.70, 2);
    v_platform_payout := ROUND(v_euro_value * 0.30, 2);
  END IF;

  -- Incrementa visibility_score (1 token = 1 punto)
  UPDATE public.books
  SET visibility_score = COALESCE(visibility_score, 0) + v_boost_cost
  WHERE id = p_book_id;

  -- Registra boost
  INSERT INTO public.book_boosts (user_id, book_id, tokens_spent, author_payout, platform_payout, used_real_tokens)
  VALUES (p_user_id, p_book_id, v_boost_cost, v_author_payout, v_platform_payout, v_purchased_used > 0);

  -- Registra anche in token_transactions per coerenza con resto del sistema
  IF v_purchased_used > 0 THEN
    INSERT INTO public.token_transactions (user_id, book_id, token_type, tokens_spent, author_payout, platform_payout)
    VALUES (p_user_id, p_book_id, 'PURCHASED_TOKEN', v_purchased_used, v_author_payout, v_platform_payout);
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'tokens_spent', v_boost_cost,
    'author_payout', v_author_payout,
    'visibility_added', v_boost_cost
  );
END;
$$;


-- ============================================
-- 6. RPC: react_to_comment
-- 1 token per reazione, +5 XP a reactor e autore commento, no payout.
-- ============================================
DROP FUNCTION IF EXISTS public.react_to_comment(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.react_to_comment(
  p_user_id UUID,
  p_comment_id UUID,
  p_reaction_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reaction_cost INTEGER := 1;
  v_xp_reward INTEGER := 5;
  v_comment_author UUID;
  v_spend_result JSONB;
  v_already_reacted INTEGER;
BEGIN
  IF p_reaction_type NOT IN ('fire', 'heart', 'star', 'gem', 'crown') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Reazione non valida');
  END IF;

  -- Trova autore commento
  SELECT user_id INTO v_comment_author
  FROM public.comments
  WHERE id = p_comment_id;

  IF v_comment_author IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Commento non trovato');
  END IF;

  -- Evita doppia reazione dello stesso tipo
  SELECT COUNT(*) INTO v_already_reacted
  FROM public.comment_reactions
  WHERE user_id = p_user_id AND comment_id = p_comment_id AND reaction_type = p_reaction_type;

  IF v_already_reacted > 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Hai gia reagito con questo tipo');
  END IF;

  -- Spendi 1 token (bonus prima, poi reali)
  v_spend_result := public.spend_tokens_internal(p_user_id, v_reaction_cost, FALSE);
  IF NOT (v_spend_result->>'success')::BOOLEAN THEN
    RETURN v_spend_result;
  END IF;

  -- Inserisci reazione
  INSERT INTO public.comment_reactions (user_id, comment_id, reaction_type, tokens_spent)
  VALUES (p_user_id, p_comment_id, p_reaction_type, v_reaction_cost);

  -- +5 XP a entrambi
  UPDATE public.profiles SET total_xp = COALESCE(total_xp, 0) + v_xp_reward WHERE id = p_user_id;
  IF v_comment_author <> p_user_id THEN
    UPDATE public.profiles SET total_xp = COALESCE(total_xp, 0) + v_xp_reward WHERE id = v_comment_author;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'reaction_type', p_reaction_type,
    'xp_earned', v_xp_reward
  );
END;
$$;


-- ============================================
-- 7. RPC: unlock_extra_block
-- Sblocca un blocco EXTRA usando SOLO token reali (PURCHASED).
-- ============================================
DROP FUNCTION IF EXISTS public.unlock_extra_block(UUID, UUID);

CREATE OR REPLACE FUNCTION public.unlock_extra_block(
  p_user_id UUID,
  p_block_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_block RECORD;
  v_book RECORD;
  v_price INTEGER;
  v_already_unlocked INTEGER;
  v_spend_result JSONB;
  v_euro_value DECIMAL(10,2);
  v_author_payout DECIMAL(10,2);
  v_platform_payout DECIMAL(10,2);
BEGIN
  SELECT id, book_id, token_price, is_extra
  INTO v_block
  FROM public.blocks
  WHERE id = p_block_id;

  IF v_block.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Blocco non trovato');
  END IF;

  IF NOT v_block.is_extra THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Questo blocco non e EXTRA');
  END IF;

  SELECT id, price_per_block FROM public.books WHERE id = v_block.book_id INTO v_book;
  v_price := COALESCE(v_block.token_price, v_book.price_per_block, 10);

  -- Gia sbloccato?
  SELECT COUNT(*) INTO v_already_unlocked
  FROM public.block_unlocks
  WHERE user_id = p_user_id AND block_id = p_block_id;

  IF v_already_unlocked > 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Blocco gia sbloccato');
  END IF;

  -- Spendi SOLO token reali (premium_only = TRUE)
  v_spend_result := public.spend_tokens_internal(p_user_id, v_price, TRUE);
  IF NOT (v_spend_result->>'success')::BOOLEAN THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'I blocchi EXTRA richiedono token reali (acquistati). Token bonus non utilizzabili.');
  END IF;

  -- Registra unlock
  INSERT INTO public.block_unlocks (user_id, block_id, book_id, tokens_spent, token_type)
  VALUES (p_user_id, p_block_id, v_block.book_id, v_price, 'premium')
  ON CONFLICT (user_id, block_id) DO NOTHING;

  -- Payout 70/30 sui token reali
  v_euro_value := v_price * 0.10;
  v_author_payout := ROUND(v_euro_value * 0.70, 2);
  v_platform_payout := ROUND(v_euro_value * 0.30, 2);

  INSERT INTO public.token_transactions (user_id, book_id, token_type, tokens_spent, author_payout, platform_payout)
  VALUES (p_user_id, v_block.book_id, 'PURCHASED_TOKEN', v_price, v_author_payout, v_platform_payout);

  RETURN jsonb_build_object(
    'success', TRUE,
    'tokens_spent', v_price,
    'author_payout', v_author_payout
  );
END;
$$;


-- ============================================
-- Reload PostgREST schema cache
-- ============================================
NOTIFY pgrst, 'reload schema';
