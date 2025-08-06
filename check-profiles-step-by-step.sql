-- ステップ1: user_profilesテーブルの存在確認
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_profiles'
        ) THEN 'user_profilesテーブルは存在します ✅'
        ELSE 'user_profilesテーブルが存在しません ❌'
    END as table_status;

-- ステップ2: user_profilesのデータ数確認
SELECT 
    COUNT(*) as profile_count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'プロフィールデータあり ✅'
        ELSE 'プロフィールデータなし ❌'
    END as data_status
FROM user_profiles;

-- ステップ3: 各ユーザーのプロフィール状況
SELECT 
    u.id as user_id,
    u.email,
    p.nickname,
    CASE 
        WHEN p.id IS NOT NULL THEN 'プロフィールあり ✅'
        ELSE 'プロフィールなし ❌ - 作成が必要'
    END as profile_status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
ORDER BY u.created_at DESC;