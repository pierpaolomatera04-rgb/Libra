-- ============================================
-- HIGHLIGHTS SYSTEM
-- Esegui in Supabase SQL Editor
-- ============================================

-- 1. HIGHLIGHTS TABLE
CREATE TABLE IF NOT EXISTS highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  block_id UUID REFERENCES blocks(id) ON DELETE CASCADE NOT NULL,
  block_number INT NOT NULL,
  content TEXT NOT NULL,
  color TEXT DEFAULT 'sage',
  is_public BOOLEAN DEFAULT false,
  likes_count INT DEFAULT 0,
  reshares_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_highlights_user ON highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_highlights_book ON highlights(book_id);
CREATE INDEX IF NOT EXISTS idx_highlights_public ON highlights(is_public) WHERE is_public = true;

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chiunque vede highlights pubblici" ON highlights;
CREATE POLICY "Chiunque vede highlights pubblici" ON highlights
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Utenti creano propri highlights" ON highlights;
CREATE POLICY "Utenti creano propri highlights" ON highlights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utenti modificano propri highlights" ON highlights;
CREATE POLICY "Utenti modificano propri highlights" ON highlights
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utenti eliminano propri highlights" ON highlights;
CREATE POLICY "Utenti eliminano propri highlights" ON highlights
  FOR DELETE USING (auth.uid() = user_id);

-- 2. HIGHLIGHT LIKES TABLE
CREATE TABLE IF NOT EXISTS highlight_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  highlight_id UUID REFERENCES highlights(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, highlight_id)
);

ALTER TABLE highlight_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chiunque vede i like highlights" ON highlight_likes;
CREATE POLICY "Chiunque vede i like highlights" ON highlight_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Utenti mettono like" ON highlight_likes;
CREATE POLICY "Utenti mettono like" ON highlight_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utenti rimuovono like" ON highlight_likes;
CREATE POLICY "Utenti rimuovono like" ON highlight_likes
  FOR DELETE USING (auth.uid() = user_id);

-- 3. HIGHLIGHT RESHARES TABLE
CREATE TABLE IF NOT EXISTS highlight_reshares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  highlight_id UUID REFERENCES highlights(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, highlight_id)
);

ALTER TABLE highlight_reshares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chiunque vede le ricondivisioni" ON highlight_reshares;
CREATE POLICY "Chiunque vede le ricondivisioni" ON highlight_reshares
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Utenti ricondividono" ON highlight_reshares;
CREATE POLICY "Utenti ricondividono" ON highlight_reshares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utenti rimuovono ricondivisione" ON highlight_reshares;
CREATE POLICY "Utenti rimuovono ricondivisione" ON highlight_reshares
  FOR DELETE USING (auth.uid() = user_id);

-- 4. HIGHLIGHT COMMENTS TABLE
CREATE TABLE IF NOT EXISTS highlight_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  highlight_id UUID REFERENCES highlights(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_highlight_comments ON highlight_comments(highlight_id);

ALTER TABLE highlight_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chiunque vede commenti highlights" ON highlight_comments;
CREATE POLICY "Chiunque vede commenti highlights" ON highlight_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Utenti commentano highlights" ON highlight_comments;
CREATE POLICY "Utenti commentano highlights" ON highlight_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utenti eliminano propri commenti hl" ON highlight_comments;
CREATE POLICY "Utenti eliminano propri commenti hl" ON highlight_comments
  FOR DELETE USING (auth.uid() = user_id);
