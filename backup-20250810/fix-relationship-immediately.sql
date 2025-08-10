-- 外部キーリレーションの緊急修正

-- 1. store_reviewsテーブルの現在の構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'store_reviews' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. 既存のstore_reviewsテーブルを削除して再作成（データがない場合）
DROP TABLE IF EXISTS store_reviews CASCADE;

-- 3. store_reviewsテーブルを正しい外部キーで再作成
CREATE TABLE store_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT comment_length CHECK (char_length(comment) >= 10 AND char_length(comment) <= 300),
    CONSTRAINT unique_user_store UNIQUE(user_id, store_id)
);

-- 4. インデックスの作成
CREATE INDEX idx_store_reviews_store_id ON store_reviews(store_id);
CREATE INDEX idx_store_reviews_user_id ON store_reviews(user_id);
CREATE INDEX idx_store_reviews_created_at ON store_reviews(created_at DESC);

-- 5. RLSを有効化
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;

-- 6. RLSポリシーの作成
-- 公開レビュー閲覧
CREATE POLICY "Anyone can view public reviews" ON store_reviews
    FOR SELECT USING (is_public = true);

-- 自分のレビュー閲覧
CREATE POLICY "Users can view own reviews" ON store_reviews
    FOR SELECT USING (auth.uid() = user_id);

-- レビュー作成
CREATE POLICY "Users can create own reviews" ON store_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- レビュー更新
CREATE POLICY "Users can update own reviews" ON store_reviews
    FOR UPDATE USING (auth.uid() = user_id);

-- レビュー削除
CREATE POLICY "Users can delete own reviews" ON store_reviews
    FOR DELETE USING (auth.uid() = user_id);

-- 7. 自動更新トリガーの作成
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

-- 8. 確認
SELECT 
    'テーブル再作成完了' as status,
    COUNT(*) as column_count,
    'store_reviews' as table_name
FROM information_schema.columns 
WHERE table_name = 'store_reviews' 
AND table_schema = 'public';

-- 9. 外部キー制約の確認
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'store_reviews';