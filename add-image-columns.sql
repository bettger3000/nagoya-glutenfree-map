-- 画像カラム追加SQL
-- Supabaseダッシュボードの SQL Editor で実行してください

-- 現在のテーブル構造を確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'stores' 
ORDER BY ordinal_position;

-- image_url_2 と image_url_3 カラムを追加
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS image_url_2 TEXT,
ADD COLUMN IF NOT EXISTS image_url_3 TEXT;

-- 更新結果を確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'stores' 
AND column_name LIKE 'image%'
ORDER BY column_name;

-- サンプルデータで動作確認
SELECT id, name, image_url, image_url_2, image_url_3 
FROM stores 
LIMIT 3;