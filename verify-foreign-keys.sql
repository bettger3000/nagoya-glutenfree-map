-- 外部キー制約の詳細確認

-- 1. store_reviewsテーブルの存在確認
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'store_reviews'
        ) THEN '✅ store_reviewsテーブル存在'
        ELSE '❌ store_reviewsテーブルなし'
    END as table_status;

-- 2. store_reviewsのカラム確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'store_reviews' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 外部キー制約の詳細確認
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema as foreign_schema,
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
    AND tc.table_name = 'store_reviews'
    AND tc.table_schema = 'public';

-- 4. RLSポリシーの確認
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'store_reviews'
ORDER BY policyname;

-- 5. 現在のユーザー確認
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_email,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN '✅ ログイン中'
        ELSE '❌ 未ログイン'
    END as auth_status;