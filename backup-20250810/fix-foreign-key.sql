-- 外部キー制約の修正SQL

-- 1. 既存の外部キー制約を削除（存在する場合）
DO $$
BEGIN
    -- store_reviewsの既存外部キー制約を削除
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'store_reviews_user_id_fkey' 
        AND table_name = 'store_reviews'
    ) THEN
        ALTER TABLE store_reviews DROP CONSTRAINT store_reviews_user_id_fkey;
    END IF;
END $$;

-- 2. 正しい外部キー制約を追加
ALTER TABLE store_reviews 
ADD CONSTRAINT store_reviews_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. user_profilesテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname VARCHAR(50) NOT NULL UNIQUE,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. user_profilesの外部キー制約も確認
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_profiles_user_id_fkey' 
        AND table_name = 'user_profiles'
    ) THEN
        ALTER TABLE user_profiles 
        ADD CONSTRAINT user_profiles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. 現在のユーザー用のプロフィールを作成（存在しない場合）
DO $$
BEGIN
    -- 現在ログインしているユーザーのプロフィールを作成
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO user_profiles (user_id, nickname)
        SELECT 
            auth.uid(),
            'ユーザー' || substr(auth.uid()::text, 1, 8)
        WHERE NOT EXISTS (
            SELECT 1 FROM user_profiles WHERE user_id = auth.uid()
        );
    END IF;
END $$;

-- 6. 確認
SELECT 
    'store_reviews外部キー' as check_type,
    constraint_name,
    column_name,
    foreign_table_name,
    foreign_column_name
FROM (
    SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'store_reviews'
        AND kcu.column_name = 'user_id'
) as fk_info;