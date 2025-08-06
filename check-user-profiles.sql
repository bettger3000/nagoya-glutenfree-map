-- user_profilesテーブルの詳細確認

-- 1. user_profilesテーブルが存在するか確認
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
) as user_profiles_exists;

-- 2. user_profilesテーブルの構造確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. user_profilesテーブルにデータがあるか確認
SELECT COUNT(*) as user_profiles_count FROM user_profiles;

-- 4. 現在ログインしているユーザーのプロフィールがあるか確認
SELECT 
    up.id,
    up.user_id,
    up.nickname,
    up.created_at,
    auth.uid() as current_auth_id
FROM user_profiles up
WHERE up.user_id = auth.uid();

-- 5. store_reviewsの外部キー制約確認
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'store_reviews';

-- 6. 全ユーザーリスト（auth.users）
SELECT 
    id as user_id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 5;