# アバター機能セットアップ手順書

## 🎯 目的
プロフィール画像アップロード機能の「Bucket not found」エラーを解決し、アバター機能を完全に動作させる。

## 📋 必要な作業（順番に実行）

### ステップ1: データベースにアバター用カラムを追加

1. Supabaseダッシュボードにログイン
2. プロジェクト「nagoya-glutenfree-map」を選択
3. 左側メニューから「SQL Editor」を選択
4. 「New Query」をクリック
5. 以下のSQLをコピー&ペーストして実行:

```sql
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
```

### ステップ2: Supabase Storageでavatarsバケットを作成

1. Supabaseダッシュボードで「Storage」をクリック
2. 「Create a new bucket」をクリック
3. バケット設定:
   - **Name**: `avatars`
   - **Public**: ✅ チェックを入れる（画像に公開アクセスが必要）
   - **File size limit**: `5MB` (デフォルト)
   - **Allowed MIME types**: `image/*` (画像ファイルのみ)
4. 「Create bucket」をクリック

### ステップ3: avatarsバケットのRLSポリシーを設定

1. 作成した「avatars」バケットを選択
2. 「Policies」タブをクリック
3. 以下のポリシーを追加:

**アップロード許可ポリシー (INSERT)**
```sql
CREATE POLICY "Users can upload their own avatars" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**閲覧許可ポリシー (SELECT)**
```sql
CREATE POLICY "Anyone can view avatars" ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'avatars');
```

**更新許可ポリシー (UPDATE)**  
```sql
CREATE POLICY "Users can update their own avatars" ON storage.objects 
FOR UPDATE TO authenticated 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**削除許可ポリシー (DELETE)**
```sql
CREATE POLICY "Users can delete their own avatars" ON storage.objects 
FOR DELETE TO authenticated 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### ステップ4: 設定確認

1. **データベース確認**:
   - SQL Editorで以下を実行:
   ```sql
   SELECT column_name, data_type FROM information_schema.columns 
   WHERE table_name = 'user_profiles' AND column_name LIKE 'avatar%';
   ```
   - 3つのカラム（avatar_url, avatar_color, avatar_emoji）が表示されることを確認

2. **Storageバケット確認**:
   - Storage画面で「avatars」バケットが存在することを確認
   - バケットがPublicに設定されていることを確認

3. **ポリシー確認**:
   - avatarsバケットのPoliciesタブで4つのポリシーが設定されていることを確認

## ✅ 完了後のテスト手順

1. プロフィール画面にアクセス
2. アバター変更ボタンをクリック
3. 画像をアップロードしてエラーが発生しないことを確認
4. 絵文字とカラー変更が動作することを確認
5. プロフィール保存が成功することを確認
6. レビュー画面でアバターが表示されることを確認

## ❗ 重要な注意事項

- **順番を守る**: 必ずステップ1→2→3→4の順で実行してください
- **バックアップ**: 作業前に重要なデータのバックアップを取ることを推奨
- **確認**: 各ステップ完了後に必ず確認作業を行ってください
- **エラー**: 何かエラーが発生した場合は、作業を中断して状況を報告してください

## 🔧 トラブルシューティング

### よくあるエラーと対処法

1. **"relation does not exist"エラー**
   - user_profilesテーブルが存在しない場合のエラー
   - 先にuser_profilesテーブルを作成する必要があります

2. **"bucket not found"エラー**
   - avatarsバケットが作成されていない
   - ステップ2を確実に実行してください

3. **アップロード権限エラー**
   - RLSポリシーが正しく設定されていない
   - ステップ3のポリシーを再確認してください