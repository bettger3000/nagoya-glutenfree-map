-- ユーザープロフィールテーブル
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname VARCHAR(20) NOT NULL UNIQUE,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT nickname_length CHECK (char_length(nickname) >= 2),
  CONSTRAINT nickname_format CHECK (nickname ~ '^[a-zA-Z0-9ぁ-んァ-ヶ一-龠々ー\s\-_]+$')
);

-- インデックス
CREATE UNIQUE INDEX idx_user_profiles_nickname ON user_profiles(nickname);
CREATE UNIQUE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- RLS (Row Level Security) 設定
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ポリシー: 全ユーザーが全プロフィールを読み取り可能
CREATE POLICY "Anyone can view profiles" ON user_profiles
  FOR SELECT USING (true);

-- ポリシー: ユーザーは自分のプロフィールのみ編集可能
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ポリシー: ユーザーは自分のプロフィールのみ作成可能
CREATE POLICY "Users can create own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ポリシー: ユーザーは自分のプロフィールのみ削除可能
CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- レビューテーブル
CREATE TABLE store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL, -- 既存のstoresテーブルのidに合わせる
  comment TEXT NOT NULL CHECK (char_length(comment) >= 10 AND char_length(comment) <= 300),
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約: 1ユーザー1店舗1レビューまで
  UNIQUE(user_id, store_id)
);

-- レビューテーブルのインデックス
CREATE INDEX idx_store_reviews_store_id ON store_reviews(store_id);
CREATE INDEX idx_store_reviews_user_id ON store_reviews(user_id);
CREATE INDEX idx_store_reviews_created_at ON store_reviews(created_at DESC);

-- レビューテーブルのRLS
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public reviews" ON store_reviews
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own reviews" ON store_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reviews" ON store_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON store_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON store_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- 編集時に updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_timestamp
  BEFORE UPDATE ON store_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 既存ユーザー用のデフォルトプロフィール作成関数
CREATE OR REPLACE FUNCTION create_default_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- 新規ユーザーにデフォルトプロフィールを作成
  INSERT INTO public.user_profiles (user_id, nickname)
  VALUES (
    NEW.id,
    'ユーザー' || substr(NEW.id::text, 1, 8)  -- 一意性確保
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー: 新規ユーザー登録時に自動でプロフィール作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_profile();

-- 既存ユーザー用の一括プロフィール作成（手動実行用）
DO $$
DECLARE
  user_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR user_record IN 
    SELECT id FROM auth.users 
    WHERE id NOT IN (SELECT user_id FROM user_profiles)
  LOOP
    BEGIN
      INSERT INTO user_profiles (user_id, nickname)
      VALUES (
        user_record.id,
        'ユーザー' || counter
      );
      counter := counter + 1;
    EXCEPTION WHEN unique_violation THEN
      -- ニックネームが重複した場合は番号を増やして再試行
      counter := counter + 1;
      INSERT INTO user_profiles (user_id, nickname)
      VALUES (
        user_record.id,
        'ユーザー' || counter
      );
      counter := counter + 1;
    END;
  END LOOP;
END $$;