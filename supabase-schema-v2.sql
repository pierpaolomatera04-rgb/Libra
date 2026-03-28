-- ============================================
-- LIBRA v2 — Schema Database da Specifiche Tecniche
-- Eseguire nel SQL Editor di Supabase
-- ============================================
-- NOTA: Questo schema aggiorna/estende la struttura esistente
-- basandosi sulla sezione 1 del documento specifiche_tecniche.docx
-- ============================================

-- ============================================
-- 1. AGGIORNAMENTO TABELLA PROFILES (users)
-- Aggiunge i nuovi campi richiesti dalle specifiche
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'
    CHECK (plan IN ('free', 'silver_monthly', 'silver_annual', 'gold_monthly', 'gold_annual')),
  ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plan_auto_renew BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS monthly_books_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_books_reset_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS welcome_tokens_used BOOLEAN DEFAULT FALSE;


-- ============================================
-- 2. TABELLA TOKENS
-- Gestione granulare dei token per utente
-- ============================================
CREATE TABLE IF NOT EXISTS public.tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('WELCOME_TOKEN', 'MONTHLY_TOKEN', 'PURCHASED_TOKEN', 'ANNUAL_BONUS_TOKEN')),
  expires_at TIMESTAMPTZ DEFAULT NULL,  -- null = non scade. Popolato solo per MONTHLY_TOKEN (30 giorni)
  spent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per query frequenti
CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON public.tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_user_unspent ON public.tokens(user_id) WHERE spent = FALSE;
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON public.tokens(expires_at) WHERE expires_at IS NOT NULL AND spent = FALSE;


-- ============================================
-- 3. AGGIORNAMENTO TABELLA BOOKS
-- Aggiunge i nuovi campi richiesti dalle specifiche
-- ============================================
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free'
    CHECK (tier IN ('free', 'silver', 'gold')),
  ADD COLUMN IF NOT EXISTS max_blocks INTEGER DEFAULT 16,
  ADD COLUMN IF NOT EXISTS price_per_block INTEGER DEFAULT 10
    CHECK (price_per_block >= 5 AND price_per_block <= 30),
  ADD COLUMN IF NOT EXISTS price_full INTEGER DEFAULT 50
    CHECK (price_full >= 0 AND price_full <= 200),
  ADD COLUMN IF NOT EXISTS serialization_start TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS serialization_end TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS visibility_score INTEGER DEFAULT 0;

-- Aggiorna status per includere i nuovi valori
-- (il campo 'status' esiste già, aggiungiamo il check)
-- ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_status_check;
-- ALTER TABLE public.books ADD CONSTRAINT books_status_check
--   CHECK (status IN ('draft', 'serializing', 'complete', 'ongoing', 'published', 'completed', 'suspended'));


-- ============================================
-- 4. AGGIORNAMENTO TABELLA BLOCKS
-- Aggiunge i campi per anteprime Silver/Gold
-- ============================================
ALTER TABLE public.blocks
  ADD COLUMN IF NOT EXISTS release_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS silver_release_at TIMESTAMPTZ DEFAULT NULL,  -- release_at - 24h
  ADD COLUMN IF NOT EXISTS gold_release_at TIMESTAMPTZ DEFAULT NULL,    -- release_at - 48h
  ADD COLUMN IF NOT EXISTS is_first_block BOOLEAN DEFAULT FALSE;


-- ============================================
-- 5. TABELLA LIBRARY (libri utente)
-- Traccia i libri nella libreria dell'utente
-- ============================================
CREATE TABLE IF NOT EXISTS public.library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  ownership_type TEXT NOT NULL CHECK (ownership_type IN ('OWNED', 'PLAN')),
  pages_read INTEGER DEFAULT 0,  -- Per calcolo ricavi autore
  added_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un utente non può avere lo stesso libro due volte
  UNIQUE(user_id, book_id)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_library_user_id ON public.library(user_id);
CREATE INDEX IF NOT EXISTS idx_library_book_id ON public.library(book_id);


-- ============================================
-- 6. TABELLA TOKEN_TRANSACTIONS
-- Registra ogni spesa di token per tracciare pagamenti autori
-- ============================================
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  token_type TEXT NOT NULL CHECK (token_type IN ('WELCOME_TOKEN', 'MONTHLY_TOKEN', 'PURCHASED_TOKEN', 'ANNUAL_BONUS_TOKEN')),
  tokens_spent INTEGER NOT NULL CHECK (tokens_spent > 0),
  author_payout DECIMAL(10,2) DEFAULT 0.00,   -- Quanto spetta all'autore in euro. 0 se WELCOME_TOKEN
  platform_payout DECIMAL(10,2) DEFAULT 0.00,  -- Quota piattaforma
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON public.token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_book_id ON public.token_transactions(book_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON public.token_transactions(created_at);


-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Tokens: utente vede solo i propri
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utente vede propri token"
  ON public.tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Sistema inserisce token"
  ON public.tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sistema aggiorna token"
  ON public.tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- Library: utente vede solo la propria libreria
ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utente vede propria libreria"
  ON public.library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Utente aggiunge a libreria"
  ON public.library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utente aggiorna propria libreria"
  ON public.library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Utente rimuove da libreria"
  ON public.library FOR DELETE
  USING (auth.uid() = user_id);

-- Token Transactions: utente vede solo le proprie transazioni
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utente vede proprie transazioni"
  ON public.token_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Sistema crea transazioni"
  ON public.token_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- TRIGGER: Calcola automaticamente silver_release_at e gold_release_at
-- quando viene impostato release_at su un blocco
-- ============================================
CREATE OR REPLACE FUNCTION public.calc_preview_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.release_at IS NOT NULL THEN
    NEW.silver_release_at := NEW.release_at - INTERVAL '24 hours';
    NEW.gold_release_at := NEW.release_at - INTERVAL '48 hours';
  END IF;
  -- Primo blocco = block_number 1
  IF NEW.block_number = 1 THEN
    NEW.is_first_block := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_calc_preview_dates
  BEFORE INSERT OR UPDATE ON public.blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.calc_preview_dates();


-- ============================================
-- TRIGGER: Assegna 10 welcome token al primo accesso
-- ============================================
CREATE OR REPLACE FUNCTION public.assign_welcome_tokens()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.welcome_tokens_used = FALSE OR NEW.welcome_tokens_used IS NULL THEN
    INSERT INTO public.tokens (user_id, amount, type, expires_at)
    VALUES (NEW.id, 10, 'WELCOME_TOKEN', NULL);  -- Welcome token non scadono

    UPDATE public.profiles SET welcome_tokens_used = TRUE WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Questo trigger si attiva quando un nuovo profilo viene creato
-- (il trigger esistente handle_new_user già crea il profilo,
--  questo aggiunge i welcome token)
CREATE OR REPLACE TRIGGER trg_welcome_tokens
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_welcome_tokens();
