-- ============================================
-- SOCIAL FEATURES: followers, badges, profile settings
-- Esegui in Supabase SQL Editor
-- ============================================

-- 1. FOLLOWERS TABLE
CREATE TABLE IF NOT EXISTS followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);

ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chiunque puo vedere i follower" ON followers
  FOR SELECT USING (true);

CREATE POLICY "Utenti autenticati possono seguire" ON followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Utenti possono smettere di seguire" ON followers
  FOR DELETE USING (auth.uid() = follower_id);


-- 2. USER BADGES TABLE
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chiunque puo vedere i badge" ON user_badges
  FOR SELECT USING (true);

CREATE POLICY "Sistema inserisce badge" ON user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 3. PROFILE SETTINGS: bio e library_public
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS library_public BOOLEAN DEFAULT true;


-- 4. THREADED COMMENTS: parent_comment_id gia esiste, aggiungiamo indice
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_block ON comments(block_id);


-- 5. FUNZIONE: conta blocchi letti per macro-area (per badge)
CREATE OR REPLACE FUNCTION get_user_macro_area_reads(p_user_id UUID)
RETURNS TABLE(macro_category TEXT, blocks_read BIGINT)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT b.macro_category, COUNT(DISTINCT rp.block_id) as blocks_read
  FROM reading_progress rp
  JOIN books b ON b.id = rp.book_id
  WHERE rp.user_id = p_user_id
    AND b.macro_category IS NOT NULL
  GROUP BY b.macro_category;
$$;


-- 6. FUNZIONE: check e assegna badge automaticamente
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS TABLE(badge_id TEXT, just_earned BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r RECORD;
  badge TEXT;
  threshold INT;
  already_has BOOLEAN;
BEGIN
  -- Per ogni macro-area, controlla i livelli
  FOR r IN SELECT * FROM get_user_macro_area_reads(p_user_id) LOOP
    -- Livello 1: 3 blocchi
    badge := r.macro_category || '_level1';
    SELECT EXISTS(SELECT 1 FROM user_badges WHERE user_id = p_user_id AND user_badges.badge_id = badge) INTO already_has;
    IF r.blocks_read >= 3 AND NOT already_has THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, badge) ON CONFLICT DO NOTHING;
      RETURN QUERY SELECT badge, true;
    ELSE
      RETURN QUERY SELECT badge, false;
    END IF;

    -- Livello 2: 10 blocchi
    badge := r.macro_category || '_level2';
    SELECT EXISTS(SELECT 1 FROM user_badges WHERE user_id = p_user_id AND user_badges.badge_id = badge) INTO already_has;
    IF r.blocks_read >= 10 AND NOT already_has THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, badge) ON CONFLICT DO NOTHING;
      RETURN QUERY SELECT badge, true;
    ELSE
      RETURN QUERY SELECT badge, false;
    END IF;
  END LOOP;
END;
$$;


-- 7. FUNZIONE: profilo pubblico con contatori
CREATE OR REPLACE FUNCTION get_public_profile(p_username TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
  p_user_id UUID;
BEGIN
  SELECT id INTO p_user_id FROM profiles WHERE username = p_username;
  IF p_user_id IS NULL THEN RETURN NULL; END IF;

  SELECT json_build_object(
    'id', p.id,
    'name', p.name,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'is_author', p.is_author,
    'author_pseudonym', p.author_pseudonym,
    'daily_streak', p.daily_streak,
    'total_xp', p.total_xp,
    'longest_streak', p.longest_streak,
    'library_public', COALESCE(p.library_public, true),
    'created_at', p.created_at,
    'followers_count', (SELECT COUNT(*) FROM followers WHERE following_id = p.id),
    'following_count', (SELECT COUNT(*) FROM followers WHERE follower_id = p.id),
    'books_completed', (
      SELECT COUNT(DISTINCT rp.book_id) FROM reading_progress rp
      JOIN books b ON b.id = rp.book_id
      JOIN blocks bl ON bl.book_id = b.id
      WHERE rp.user_id = p.id
      GROUP BY rp.book_id
      HAVING COUNT(DISTINCT rp.block_id) = (SELECT COUNT(*) FROM blocks WHERE book_id = rp.book_id)
    ),
    'badges', (SELECT COALESCE(json_agg(json_build_object('badge_id', ub.badge_id, 'earned_at', ub.earned_at)), '[]'::json) FROM user_badges ub WHERE ub.user_id = p.id)
  ) INTO result
  FROM profiles p
  WHERE p.id = p_user_id;

  RETURN result;
END;
$$;


-- 8. FUNZIONE: leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(p_type TEXT DEFAULT 'streak', p_limit INT DEFAULT 10)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
BEGIN
  IF p_type = 'streak' THEN
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
    FROM (
      SELECT p.id, p.name, p.username, p.avatar_url, p.daily_streak, p.longest_streak, p.total_xp,
        (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = p.id) as badge_count
      FROM profiles p
      WHERE p.daily_streak > 0
      ORDER BY p.daily_streak DESC, p.total_xp DESC
      LIMIT p_limit
    ) t;
  ELSE
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
    FROM (
      SELECT p.id, p.name, p.username, p.avatar_url, p.daily_streak, p.longest_streak, p.total_xp,
        (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = p.id) as badge_count
      FROM profiles p
      WHERE EXISTS (SELECT 1 FROM user_badges ub WHERE ub.user_id = p.id)
      ORDER BY (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = p.id) DESC, p.total_xp DESC
      LIMIT p_limit
    ) t;
  END IF;

  RETURN result;
END;
$$;
