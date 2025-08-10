-- 許可ユーザーテーブルを作成
CREATE TABLE allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by VARCHAR(255),
  notes TEXT
);

-- インデックス
CREATE UNIQUE INDEX idx_allowed_users_email ON allowed_users(email);

-- RLS (Row Level Security) 設定
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- ポリシー: 認証済みユーザーのみが読み取り可能
CREATE POLICY "Authenticated users can view allowed users" ON allowed_users
  FOR SELECT USING (auth.role() = 'authenticated');

-- テスト用ユーザーを追加（必要に応じて変更してください）
INSERT INTO allowed_users (email, name, added_by, notes) VALUES 
  ('bettger3000@yahoo.co.jp', '管理者', 'system', '初期管理者アカウント'),
  ('test@example.com', 'テストユーザー', 'system', 'テスト用アカウント')
ON CONFLICT (email) DO NOTHING;

-- 確認
SELECT * FROM allowed_users;