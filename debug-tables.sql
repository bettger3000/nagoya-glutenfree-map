-- テーブル構造の確認とデバッグ用SQL

-- 1. テーブルの存在確認
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'store_reviews', 'stores')
ORDER BY table_name;

-- 2. store_reviewsのカラム構造確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'store_reviews' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. user_profilesのカラム構造確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. 外部キー制約の確認
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc 
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('user_profiles', 'store_reviews');

-- 5. RLSポリシーの確認
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'store_reviews')
ORDER BY tablename, policyname;

-- 6. 現在のユーザーの認証状態確認（テスト用）
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_user_email;