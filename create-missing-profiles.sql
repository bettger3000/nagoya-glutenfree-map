-- 既存ユーザー用のプロフィール作成SQL

-- プロフィールがないユーザーを確認
SELECT 
    u.id,
    u.email,
    'プロフィールなし - 作成します' as status
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles p WHERE p.user_id = u.id
);

-- プロフィールを作成
INSERT INTO user_profiles (user_id, nickname, bio)
SELECT 
    u.id,
    CASE 
        WHEN u.email = 'bettger1000@gmail.com' THEN '金釘誠'
        WHEN u.email = 'bettger3000@yahoo.co.jp' THEN 'ユーザー2'
        ELSE 'ユーザー' || substr(u.id::text, 1, 8)
    END as nickname,
    'プロフィール未設定' as bio
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 作成後の確認
SELECT 
    u.email,
    p.nickname,
    p.created_at,
    '✅ プロフィール作成完了' as status
FROM auth.users u
JOIN user_profiles p ON u.id = p.user_id
ORDER BY p.created_at DESC;