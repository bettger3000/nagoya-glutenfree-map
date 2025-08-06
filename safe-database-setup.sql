-- Supabaseデータベース安全セットアップSQL
-- このSQLは既存のデータを削除せず、必要なテーブルのみを作成します

-- ========================================
-- STEP 1: テーブルの作成（存在しない場合のみ）
-- ========================================

-- user_profilesテーブル
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname VARCHAR(50) NOT NULL,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- store_reviewsテーブル
CREATE TABLE IF NOT EXISTS store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL,
  comment TEXT NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STEP 2: 制約の追加（エラーを無視）
-- ========================================

-- ユニーク制約を追加（既に存在する場合はエラーになるが無視）
DO $$ 
BEGIN
  -- user_profilesのユニーク制約
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_nickname_key'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_nickname_key UNIQUE (nickname);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_user_id_key'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
  END IF;

  -- store_reviewsのユニーク制約
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'store_reviews_user_id_store_id_key'
  ) THEN
    ALTER TABLE store_reviews ADD CONSTRAINT store_reviews_user_id_store_id_key UNIQUE (user_id, store_id);
  END IF;
END $$;

-- チェック制約を追加
DO $$
BEGIN
  -- nicknameの長さチェック
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'nickname_length'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT nickname_length 
      CHECK (char_length(nickname) >= 2 AND char_length(nickname) <= 20);
  END IF;
  
  -- コメントの長さチェック
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'comment_length'
  ) THEN
    ALTER TABLE store_reviews ADD CONSTRAINT comment_length 
      CHECK (char_length(comment) >= 10 AND char_length(comment) <= 300);
  END IF;
END $$;

-- ========================================
-- STEP 3: インデックスの作成
-- ========================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_nickname ON user_profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_store_id ON store_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_user_id ON store_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_created_at ON store_reviews(created_at DESC);

-- ========================================
-- STEP 4: RLS (Row Level Security) を有効化
-- ========================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 5: 確認クエリ
-- ========================================

-- テーブルの存在確認
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ 作成済み'
    ELSE '❌ 未作成'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'store_reviews', 'stores')
ORDER BY table_name;