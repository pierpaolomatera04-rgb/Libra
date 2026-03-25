-- ============================================
-- LIBRA - Schema Database Completo
-- Eseguire nel SQL Editor di Supabase
-- ============================================

-- 1. PROFILI UTENTE (estende auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,

  -- Ruolo autore
  is_author BOOLEAN DEFAULT FALSE,
  author_pseudonym TEXT,
  author_bio TEXT,
  author_banner_url TEXT,

  -- Abbonamento
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'silver', 'gold')),
  subscription_end_date TIMESTAMPTZ,

  -- Token
  bonus_tokens INTEGER DEFAULT 10,
  premium_tokens INTEGER DEFAULT 0,
  bonus_tokens_expire_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- Preferenze
  preferred_genres TEXT[] DEFAULT '{}',
  completed_onboarding BOOLEAN DEFAULT FALSE,

  -- Social
  instagram_url TEXT,
  tiktok_url TEXT,
  newsletter_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LIBRI
CREATE TABLE public.books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  genre TEXT,
  mood TEXT,

  -- Stato pubblicazione
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'ongoing', 'completed', 'suspended')),
  total_blocks INTEGER DEFAULT 0,

  -- Accesso
  access_level TEXT DEFAULT 'open' CHECK (access_level IN ('open', 'silver_choice', 'gold_exclusive')),
  first_block_free BOOLEAN DEFAULT TRUE,
  token_price_per_block INTEGER DEFAULT 5,

  -- Calendario uscite
  scheduled_releases JSONB DEFAULT '[]',
  publication_start_date TIMESTAMPTZ,
  publication_end_date TIMESTAMPTZ,

  -- Statistiche
  total_reads INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_tips INTEGER DEFAULT 0,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,

  -- Trending
  trending_score NUMERIC(10,4) DEFAULT 0,
  weekly_trending_score NUMERIC(10,4) DEFAULT 0,

  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BLOCCHI (capitoli/sezioni del libro)
CREATE TABLE public.blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  block_number INTEGER NOT NULL,

  title TEXT,
  content TEXT NOT NULL,
  character_count INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,

  -- Prezzo specifico del blocco (override del libro)
  token_price INTEGER,

  -- Programmazione uscita
  scheduled_date TIMESTAMPTZ,
  is_released BOOLEAN DEFAULT FALSE,
  released_at TIMESTAMPTZ,

  -- Statistiche blocco
  total_reads INTEGER DEFAULT 0,
  total_unlocks INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(book_id, block_number)
);

-- 4. LIBRERIA UTENTE (stato lettura)
CREATE TABLE public.user_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,

  status TEXT DEFAULT 'reading' CHECK (status IN ('reading', 'completed', 'saved', 'abandoned')),
  last_read_block_id UUID REFERENCES public.blocks(id),
  progress_percentage NUMERIC(5,2) DEFAULT 0,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  saved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, book_id)
);

-- 5. LETTURE BLOCCHI (tracking)
CREATE TABLE public.block_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,

  read_completed BOOLEAN DEFAULT FALSE,
  reading_time_seconds INTEGER DEFAULT 0,

  read_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, block_id)
);

-- 6. SBLOCCHI BLOCCHI (acquisti con token)
CREATE TABLE public.block_unlocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,

  tokens_spent INTEGER NOT NULL,
  token_type TEXT CHECK (token_type IN ('bonus', 'premium', 'mixed')),

  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, block_id)
);

-- 7. TRANSAZIONI TOKEN
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  type TEXT NOT NULL CHECK (type IN ('unlock', 'purchase', 'donation', 'signup_bonus', 'subscription_bonus', 'refund')),
  amount INTEGER NOT NULL,
  token_type TEXT CHECK (token_type IN ('bonus', 'premium')),

  -- Riferimenti opzionali
  block_id UUID REFERENCES public.blocks(id),
  book_id UUID REFERENCES public.books(id),
  recipient_id UUID REFERENCES public.profiles(id),

  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. LIKE
CREATE TABLE public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, book_id)
);

-- 9. COMMENTI
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,

  content TEXT NOT NULL,
  is_spoiler BOOLEAN DEFAULT FALSE,
  is_author_reply BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  parent_comment_id UUID REFERENCES public.comments(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. FOLLOW AUTORI
CREATE TABLE public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(follower_id, following_id)
);

-- 11. DONAZIONI
CREATE TABLE public.donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id),

  amount INTEGER NOT NULL,
  message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ABBONAMENTI
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  plan_type TEXT NOT NULL CHECK (plan_type IN ('silver', 'gold')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),

  start_date TIMESTAMPTZ DEFAULT NOW(),
  renewal_date TIMESTAMPTZ,
  cancelled_date TIMESTAMPTZ,

  monthly_price NUMERIC(10,2),
  stripe_subscription_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDICI PER PERFORMANCE
-- ============================================

CREATE INDEX idx_books_author ON public.books(author_id);
CREATE INDEX idx_books_status ON public.books(status);
CREATE INDEX idx_books_genre ON public.books(genre);
CREATE INDEX idx_books_trending ON public.books(trending_score DESC);
CREATE INDEX idx_books_weekly_trending ON public.books(weekly_trending_score DESC);
CREATE INDEX idx_books_published_at ON public.books(published_at DESC);

CREATE INDEX idx_blocks_book ON public.blocks(book_id);
CREATE INDEX idx_blocks_scheduled ON public.blocks(scheduled_date);
CREATE INDEX idx_blocks_released ON public.blocks(is_released);

CREATE INDEX idx_user_library_user ON public.user_library(user_id);
CREATE INDEX idx_user_library_book ON public.user_library(book_id);

CREATE INDEX idx_block_reads_user ON public.block_reads(user_id);
CREATE INDEX idx_block_reads_book ON public.block_reads(book_id);
CREATE INDEX idx_block_reads_completed ON public.block_reads(read_completed);

CREATE INDEX idx_block_unlocks_user ON public.block_unlocks(user_id);

CREATE INDEX idx_likes_book ON public.likes(book_id);
CREATE INDEX idx_likes_user ON public.likes(user_id);

CREATE INDEX idx_comments_block ON public.comments(block_id);
CREATE INDEX idx_comments_book ON public.comments(book_id);

CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);

CREATE INDEX idx_transactions_user ON public.transactions(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Profili: tutti possono leggere, solo il proprietario modifica
CREATE POLICY "Profili visibili a tutti" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Utente modifica proprio profilo" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Utente inserisce proprio profilo" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Libri: pubblicati visibili a tutti, bozze solo all'autore
CREATE POLICY "Libri pubblicati visibili" ON public.books FOR SELECT USING (status != 'draft' OR author_id = auth.uid());
CREATE POLICY "Autore gestisce propri libri" ON public.books FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "Autore modifica propri libri" ON public.books FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "Autore elimina propri libri" ON public.books FOR DELETE USING (author_id = auth.uid());

-- Blocchi: rilasciati visibili, non rilasciati solo all'autore
CREATE POLICY "Blocchi rilasciati visibili" ON public.blocks FOR SELECT
  USING (is_released = true OR EXISTS (SELECT 1 FROM public.books WHERE id = book_id AND author_id = auth.uid()));
CREATE POLICY "Autore gestisce blocchi" ON public.blocks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.books WHERE id = book_id AND author_id = auth.uid()));
CREATE POLICY "Autore modifica blocchi" ON public.blocks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.books WHERE id = book_id AND author_id = auth.uid()));
CREATE POLICY "Autore elimina blocchi" ON public.blocks FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.books WHERE id = book_id AND author_id = auth.uid()));

-- Libreria utente
CREATE POLICY "Utente vede propria libreria" ON public.user_library FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Utente gestisce propria libreria" ON public.user_library FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Utente modifica propria libreria" ON public.user_library FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Utente elimina dalla libreria" ON public.user_library FOR DELETE USING (user_id = auth.uid());

-- Letture blocchi
CREATE POLICY "Utente vede proprie letture" ON public.block_reads FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Utente registra letture" ON public.block_reads FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Utente aggiorna letture" ON public.block_reads FOR UPDATE USING (user_id = auth.uid());

-- Sblocchi
CREATE POLICY "Utente vede propri sblocchi" ON public.block_unlocks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Utente sblocca blocchi" ON public.block_unlocks FOR INSERT WITH CHECK (user_id = auth.uid());

-- Transazioni
CREATE POLICY "Utente vede proprie transazioni" ON public.transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Sistema crea transazioni" ON public.transactions FOR INSERT WITH CHECK (user_id = auth.uid());

-- Like
CREATE POLICY "Like visibili a tutti" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Utente mette like" ON public.likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Utente rimuove like" ON public.likes FOR DELETE USING (user_id = auth.uid());

-- Commenti
CREATE POLICY "Commenti visibili a tutti" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Utente commenta" ON public.comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Utente modifica propri commenti" ON public.comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Utente elimina propri commenti" ON public.comments FOR DELETE USING (user_id = auth.uid());

-- Follow
CREATE POLICY "Follow visibili a tutti" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Utente segue" ON public.follows FOR INSERT WITH CHECK (follower_id = auth.uid());
CREATE POLICY "Utente smette di seguire" ON public.follows FOR DELETE USING (follower_id = auth.uid());

-- Donazioni
CREATE POLICY "Donazioni visibili ai coinvolti" ON public.donations FOR SELECT USING (donor_id = auth.uid() OR author_id = auth.uid());
CREATE POLICY "Utente dona" ON public.donations FOR INSERT WITH CHECK (donor_id = auth.uid());

-- Abbonamenti
CREATE POLICY "Utente vede propri abbonamenti" ON public.subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Sistema crea abbonamenti" ON public.subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Sistema modifica abbonamenti" ON public.subscriptions FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- FUNZIONE: Crea profilo automatico alla registrazione
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, bonus_tokens, bonus_tokens_expire_date)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    10,
    NOW() + INTERVAL '30 days'
  );

  -- Registra la transazione bonus di benvenuto
  INSERT INTO public.transactions (user_id, type, amount, token_type, description)
  VALUES (NEW.id, 'signup_bonus', 10, 'bonus', 'Token bonus di benvenuto');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger alla registrazione
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNZIONE: Calcolo trending score
-- Basato su: letture complete, like, salvataggi, commenti
-- Con boost 48h per libri nuovi
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_trending_score(
  p_book_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_completions INTEGER;
  v_likes INTEGER;
  v_saves INTEGER;
  v_comments INTEGER;
  v_total_reads INTEGER;
  v_completion_rate NUMERIC;
  v_published_at TIMESTAMPTZ;
  v_hours_since_publish NUMERIC;
  v_new_book_multiplier NUMERIC;
  v_score NUMERIC;
BEGIN
  -- Prendi statistiche del libro
  SELECT total_completions, total_likes, total_saves, total_comments, total_reads, published_at
  INTO v_completions, v_likes, v_saves, v_comments, v_total_reads, v_published_at
  FROM public.books WHERE id = p_book_id;

  -- Calcola tasso di completamento (chi finisce vs chi inizia)
  IF v_total_reads > 0 THEN
    v_completion_rate := v_completions::NUMERIC / v_total_reads::NUMERIC;
  ELSE
    v_completion_rate := 0;
  END IF;

  -- Score base: pesi diversi per ogni metrica
  -- Completamento ha il peso maggiore (come YouTube: watch time)
  v_score := (v_completions * 5.0) +    -- Peso massimo: chi finisce il libro
             (v_likes * 2.0) +           -- Like
             (v_saves * 3.0) +           -- Salvataggi (alta intenzione)
             (v_comments * 1.5) +        -- Commenti
             (v_completion_rate * 20.0);  -- Bonus tasso completamento

  -- Boost per libri nuovi (prime 48 ore)
  IF v_published_at IS NOT NULL THEN
    v_hours_since_publish := EXTRACT(EPOCH FROM (NOW() - v_published_at)) / 3600.0;

    IF v_hours_since_publish <= 48 THEN
      -- Moltiplicatore decrescente: 3x nelle prime ore, 1x dopo 48h
      v_new_book_multiplier := 3.0 - (v_hours_since_publish / 48.0 * 2.0);
      v_score := v_score * GREATEST(v_new_book_multiplier, 1.0);
    END IF;
  END IF;

  -- Decay temporale: score diminuisce nel tempo (come YouTube)
  -- I libri vecchi senza interazioni perdono posizioni
  IF v_published_at IS NOT NULL AND v_hours_since_publish > 48 THEN
    v_score := v_score / (1 + LN(1 + v_hours_since_publish / 168.0)); -- decay settimanale
  END IF;

  RETURN ROUND(v_score, 4);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNZIONE: Aggiorna trending di tutti i libri
-- Da chiamare periodicamente (es. ogni ora)
-- ============================================

CREATE OR REPLACE FUNCTION public.update_all_trending_scores()
RETURNS void AS $$
BEGIN
  UPDATE public.books
  SET
    trending_score = public.calculate_trending_score(id),
    weekly_trending_score = public.calculate_trending_score(id),
    updated_at = NOW()
  WHERE status IN ('published', 'ongoing', 'completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNZIONE: Aggiorna statistiche libro dopo lettura
-- ============================================

CREATE OR REPLACE FUNCTION public.update_book_stats_on_read()
RETURNS TRIGGER AS $$
BEGIN
  -- Aggiorna conteggio letture
  UPDATE public.books
  SET
    total_reads = (SELECT COUNT(*) FROM public.block_reads WHERE book_id = NEW.book_id),
    total_completions = (
      SELECT COUNT(DISTINCT br.user_id)
      FROM public.block_reads br
      JOIN public.blocks b ON br.block_id = b.id
      WHERE br.book_id = NEW.book_id
        AND br.read_completed = true
        AND b.block_number = (SELECT MAX(block_number) FROM public.blocks WHERE book_id = NEW.book_id)
    ),
    updated_at = NOW()
  WHERE id = NEW.book_id;

  -- Ricalcola trending
  UPDATE public.books
  SET trending_score = public.calculate_trending_score(NEW.book_id)
  WHERE id = NEW.book_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_block_read
  AFTER INSERT OR UPDATE ON public.block_reads
  FOR EACH ROW EXECUTE FUNCTION public.update_book_stats_on_read();

-- ============================================
-- FUNZIONE: Aggiorna like count
-- ============================================

CREATE OR REPLACE FUNCTION public.update_book_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.books SET total_likes = total_likes + 1, updated_at = NOW() WHERE id = NEW.book_id;
    UPDATE public.books SET trending_score = public.calculate_trending_score(NEW.book_id) WHERE id = NEW.book_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.books SET total_likes = total_likes - 1, updated_at = NOW() WHERE id = OLD.book_id;
    UPDATE public.books SET trending_score = public.calculate_trending_score(OLD.book_id) WHERE id = OLD.book_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.update_book_likes();

-- ============================================
-- FUNZIONE: Aggiorna save count (dalla libreria)
-- ============================================

CREATE OR REPLACE FUNCTION public.update_book_saves()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'saved' THEN
    UPDATE public.books
    SET total_saves = (SELECT COUNT(*) FROM public.user_library WHERE book_id = NEW.book_id AND status = 'saved'),
        updated_at = NOW()
    WHERE id = NEW.book_id;

    UPDATE public.books SET trending_score = public.calculate_trending_score(NEW.book_id) WHERE id = NEW.book_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_library_change
  AFTER INSERT OR UPDATE ON public.user_library
  FOR EACH ROW EXECUTE FUNCTION public.update_book_saves();

-- ============================================
-- FUNZIONE: Aggiorna comment count
-- ============================================

CREATE OR REPLACE FUNCTION public.update_book_comments()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.books SET total_comments = total_comments + 1, updated_at = NOW() WHERE id = NEW.book_id;
    UPDATE public.books SET trending_score = public.calculate_trending_score(NEW.book_id) WHERE id = NEW.book_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.books SET total_comments = total_comments - 1, updated_at = NOW() WHERE id = OLD.book_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_book_comments();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('book-files', 'book-files', false);

-- Storage policies
CREATE POLICY "Covers visibili a tutti" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Autori caricano covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.uid() IS NOT NULL);
CREATE POLICY "Autori modificano covers" ON storage.objects FOR UPDATE USING (bucket_id = 'covers' AND auth.uid() IS NOT NULL);

CREATE POLICY "Avatar visibili a tutti" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Utenti caricano avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "Utenti modificano avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "File libri privati" ON storage.objects FOR SELECT USING (bucket_id = 'book-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "Autori caricano file" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'book-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "Autori eliminano file" ON storage.objects FOR DELETE USING (bucket_id = 'book-files' AND auth.uid() IS NOT NULL);
