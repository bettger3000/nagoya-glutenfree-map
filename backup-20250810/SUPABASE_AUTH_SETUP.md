# Supabase Google認証セットアップガイド

## 📋 1. Supabase Auth設定手順

### 1.1 Google OAuth設定
1. **Supabaseダッシュボード**にアクセス
2. **Settings** → **Authentication** に移動
3. **Providers** タブを選択
4. **Google** を有効化
5. Google Cloud Consoleで以下を設定：
   - **承認済みのJavaScript生成元**: `https://bettger3000.github.io`
   - **承認済みのリダイレクトURI**: `https://lywfaolwvkewuouvkzlk.supabase.co/auth/v1/callback`

### 1.2 セッション設定（30日間）
1. **Settings** → **Authentication** → **Settings**
2. **JWT expiry**: `2592000` （30日 = 30 * 24 * 60 * 60秒）
3. **Refresh token rotation**: 有効化

## 🗄️ 2. データベース設定SQL

### 2.1 allowed_usersテーブル作成
```sql
-- 許可されたユーザーのメールアドレスを管理するテーブル
CREATE TABLE IF NOT EXISTS allowed_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成（検索高速化）
CREATE INDEX IF NOT EXISTS idx_allowed_users_email ON allowed_users(email);

-- 初期データ挿入（管理者アカウント）
INSERT INTO allowed_users (email) VALUES 
  ('bettger3000@yahoo.co.jp'),
  ('bettger1000@gmail.com')
ON CONFLICT (email) DO NOTHING;
```

### 2.2 RLS（Row Level Security）ポリシー設定
```sql
-- storesテーブルにRLSを有効化
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（もしあれば）
DROP POLICY IF EXISTS "Allow access to allowed users only" ON stores;

-- 許可されたユーザーのみアクセス可能なポリシーを作成
CREATE POLICY "Allow access to allowed users only" ON stores
FOR ALL USING (
  auth.email() IN (
    SELECT email FROM allowed_users
  )
);

-- allowed_usersテーブルにもRLSを設定
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- 認証されたユーザーのみ自分の情報を確認可能
CREATE POLICY "Users can check if they are allowed" ON allowed_users
FOR SELECT USING (
  auth.email() = email
);
```

### 2.3 確認用クエリ
```sql
-- 設定確認
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- ポリシー確認  
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- 許可ユーザー一覧確認
SELECT * FROM allowed_users;
```

## 🔧 3. 実装後のテスト手順

### 3.1 認証テスト
1. **未許可メールアドレス**でGoogleログイン
2. → `login.html`にリダイレクトされエラーメッセージ表示
3. **許可済みメールアドレス**でGoogleログイン  
4. → `map.html`にアクセス成功

### 3.2 データアクセステスト
1. 許可ユーザーでログイン → 店舗データ表示
2. 未許可ユーザーでログイン → 店舗データ取得エラー

### 3.3 セッション保持テスト
1. ログイン後ブラウザを閉じる
2. 30日以内に再アクセス → 自動ログイン
3. 30日後にアクセス → ログイン画面表示

## 📝 4. 管理者向けユーザー追加方法

```sql
-- 新しいユーザーを許可リストに追加
INSERT INTO allowed_users (email) VALUES ('newuser@example.com');

-- ユーザーを削除
DELETE FROM allowed_users WHERE email = 'olduser@example.com';

-- 全許可ユーザーを確認
SELECT email, created_at FROM allowed_users ORDER BY created_at DESC;
```

## ⚠️ 5. セキュリティ注意事項

1. **Google OAuth設定**のリダイレクトURIは正確に設定
2. **RLSポリシー**は必ず有効化してテスト
3. **allowed_users**テーブルへの直接アクセスは管理者のみ
4. **本番環境**では適切なドメイン設定を確認

---
このガイドに従ってSupabaseを設定してください。