-- RLSポリシー設定SQL
-- safe-database-setup.sqlの実行後に、このSQLを実行してください

-- ========================================
-- user_profiles用のRLSポリシー
-- ========================================

-- 既存のポリシーを確認して作成
DO $$
BEGIN
  -- 閲覧ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Anyone can view profiles'
  ) THEN
    CREATE POLICY "Anyone can view profiles" ON user_profiles
      FOR SELECT USING (true);
  END IF;

  -- 更新ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON user_profiles
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- 作成ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can create own profile'
  ) THEN
    CREATE POLICY "Users can create own profile" ON user_profiles
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- 削除ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can delete own profile'
  ) THEN
    CREATE POLICY "Users can delete own profile" ON user_profiles
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ========================================
-- store_reviews用のRLSポリシー
-- ========================================

DO $$
BEGIN
  -- 公開レビュー閲覧ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'store_reviews' 
    AND policyname = 'Anyone can view public reviews'
  ) THEN
    CREATE POLICY "Anyone can view public reviews" ON store_reviews
      FOR SELECT USING (is_public = true);
  END IF;

  -- 自分のレビュー閲覧ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'store_reviews' 
    AND policyname = 'Users can view own reviews'
  ) THEN
    CREATE POLICY "Users can view own reviews" ON store_reviews
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- 作成ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'store_reviews' 
    AND policyname = 'Users can create own reviews'
  ) THEN
    CREATE POLICY "Users can create own reviews" ON store_reviews
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- 更新ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'store_reviews' 
    AND policyname = 'Users can update own reviews'
  ) THEN
    CREATE POLICY "Users can update own reviews" ON store_reviews
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- 削除ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'store_reviews' 
    AND policyname = 'Users can delete own reviews'
  ) THEN
    CREATE POLICY "Users can delete own reviews" ON store_reviews
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ========================================
-- 自動更新トリガー
-- ========================================

-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- user_profilesのトリガー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_profile_timestamp'
  ) THEN
    CREATE TRIGGER update_user_profile_timestamp
      BEFORE UPDATE ON user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- store_reviewsのトリガー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_review_timestamp'
  ) THEN
    CREATE TRIGGER update_review_timestamp
      BEFORE UPDATE ON store_reviews
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ========================================
-- 設定の確認
-- ========================================

-- RLSポリシーの確認
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('user_profiles', 'store_reviews')
ORDER BY tablename, policyname;