-- 訪問済み・行きたい店機能のためのデータベース設定

-- 1. 訪問済み店舗テーブル作成
CREATE TABLE IF NOT EXISTS visited_stores (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, store_id) -- 同じユーザー・店舗の重複を防ぐ
);

-- 2. 行きたい店舗テーブル作成
CREATE TABLE IF NOT EXISTS wishlist_stores (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, store_id) -- 同じユーザー・店舗の重複を防ぐ
);

-- 3. user_profilesテーブルに訪問数公開設定を追加
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS show_visit_count BOOLEAN DEFAULT true;

-- 4. visited_stores テーブルのRLSポリシー設定
ALTER TABLE visited_stores ENABLE ROW LEVEL SECURITY;

-- 訪問済み店舗: 読み取りポリシー（自分のデータのみ）
CREATE POLICY "Users can view own visited stores" ON visited_stores
    FOR SELECT USING (auth.uid() = user_id);

-- 訪問済み店舗: 挿入ポリシー（自分のデータのみ）
CREATE POLICY "Users can insert own visited stores" ON visited_stores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 訪問済み店舗: 削除ポリシー（自分のデータのみ）
CREATE POLICY "Users can delete own visited stores" ON visited_stores
    FOR DELETE USING (auth.uid() = user_id);

-- 5. wishlist_stores テーブルのRLSポリシー設定
ALTER TABLE wishlist_stores ENABLE ROW LEVEL SECURITY;

-- 行きたい店舗: 読み取りポリシー（自分のデータのみ）
CREATE POLICY "Users can view own wishlist stores" ON wishlist_stores
    FOR SELECT USING (auth.uid() = user_id);

-- 行きたい店舗: 挿入ポリシー（自分のデータのみ）
CREATE POLICY "Users can insert own wishlist stores" ON wishlist_stores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 行きたい店舗: 削除ポリシー（自分のデータのみ）
CREATE POLICY "Users can delete own wishlist stores" ON wishlist_stores
    FOR DELETE USING (auth.uid() = user_id);

-- 6. インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_visited_stores_user_id ON visited_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_visited_stores_store_id ON visited_stores(store_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_stores_user_id ON wishlist_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_stores_store_id ON wishlist_stores(store_id);

-- 7. 統計用のビュー作成（オプション）
CREATE OR REPLACE VIEW user_visit_stats AS
SELECT 
    u.id as user_id,
    up.nickname,
    up.show_visit_count,
    COUNT(vs.id) as visit_count,
    COUNT(ws.id) as wishlist_count
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN visited_stores vs ON u.id = vs.user_id
LEFT JOIN wishlist_stores ws ON u.id = ws.user_id
GROUP BY u.id, up.nickname, up.show_visit_count;

-- 実行完了メッセージ
SELECT 'Visited stores and wishlist tables created successfully!' as status;