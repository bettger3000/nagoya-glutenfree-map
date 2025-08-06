-- Supabaseデータベース修正用SQL
-- このSQLをSupabaseのSQL Editorで実行してください

-- 1. user_profilesテーブルが存在しない場合のみ作成
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname VARCHAR(50) NOT NULL UNIQUE,  -- 文字数制限を緩和
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約（正規表現チェックを削除してより柔軟に）
  CONSTRAINT nickname_length CHECK (char_length(nickname) >= 2 AND char_length(nickname) <= 20)
);

-- 2. store_reviewsテーブルが存在しない場合のみ作成
CREATE TABLE IF NOT EXISTS store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL,
  comment TEXT NOT NULL CHECK (char_length(comment) >= 10 AND char_length(comment) <= 300),
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約: 1ユーザー1店舗1レビューまで
  UNIQUE(user_id, store_id)
);

-- 3. インデックスの作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_user_profiles_nickname ON user_profiles(nickname);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_store_id ON store_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_user_id ON store_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_created_at ON store_reviews(created_at DESC);

-- 4. RLS (Row Level Security) 設定
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;

-- 5. user_profilesのポリシー（存在する場合は削除して再作成）
DROP POLICY IF EXISTS "Anyone can view profiles" ON user_profiles;
CREATE POLICY "Anyone can view profiles" ON user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
CREATE POLICY "Users can create own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- 6. store_reviewsのポリシー（存在する場合は削除して再作成）
DROP POLICY IF EXISTS "Anyone can view public reviews" ON store_reviews;
CREATE POLICY "Anyone can view public reviews" ON store_reviews
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can view own reviews" ON store_reviews;
CREATE POLICY "Users can view own reviews" ON store_reviews
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own reviews" ON store_reviews;
CREATE POLICY "Users can create own reviews" ON store_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reviews" ON store_reviews;
CREATE POLICY "Users can update own reviews" ON store_reviews
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reviews" ON store_reviews;
CREATE POLICY "Users can delete own reviews" ON store_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- 7. updated_atを自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. user_profilesのupdated_atトリガー
DROP TRIGGER IF EXISTS update_user_profile_timestamp ON user_profiles;
CREATE TRIGGER update_user_profile_timestamp
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 9. store_reviewsのupdated_atトリガー
DROP TRIGGER IF EXISTS update_review_timestamp ON store_reviews;
CREATE TRIGGER update_review_timestamp
  BEFORE UPDATE ON store_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 10. テーブルの状態を確認
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as row_count
FROM user_profiles
UNION ALL
SELECT 
  'store_reviews' as table_name,
  COUNT(*) as row_count
FROM store_reviews
UNION ALL
SELECT 
  'stores' as table_name,
  COUNT(*) as row_count
FROM stores;