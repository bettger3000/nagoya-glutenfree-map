-- user_profilesテーブルにアバター関連のカラムを追加

-- 1. avatar_urlカラムを追加（Supabase Storageに保存した画像のURL）
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. avatar_colorカラムを追加（デフォルトアバターの背景色）
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(7) DEFAULT '#4A90E2';

-- 3. avatar_emojiカラムを追加（絵文字アバターのオプション）
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS avatar_emoji VARCHAR(10) DEFAULT '👤';

-- 4. 確認
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
    AND column_name IN ('avatar_url', 'avatar_color', 'avatar_emoji')
ORDER BY ordinal_position;

-- 5. Supabase Storageにアバター用のバケットを作成（手動で実行が必要）
-- Supabaseダッシュボード > Storage > New Bucket
-- バケット名: avatars
-- Public: true（公開アクセス可能）