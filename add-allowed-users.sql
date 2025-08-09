-- 許可ユーザーを追加
INSERT INTO allowed_users (email, name, added_by, notes) VALUES 
  ('bettger3000@yahoo.co.jp', '管理者', 'system', '初期管理者アカウント')
ON CONFLICT (email) DO NOTHING;

-- 確認
SELECT * FROM allowed_users;