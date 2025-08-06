# データベースエラー修正手順

## エラーの原因
プロフィール機能とレビュー機能に必要なテーブルがSupabaseデータベースに存在しないため、以下のエラーが発生しています：
- `relation "public.user_profiles" does not exist`
- `relation "public.store_reviews" does not exist`

## 修正手順

### 1. Supabaseダッシュボードにログイン
1. https://supabase.com にアクセス
2. プロジェクトを選択

### 2. SQL Editorを開く
1. 左側のメニューから「SQL Editor」をクリック
2. 「New query」をクリック

### 3. SQLスクリプトを実行
1. `fix-database.sql`ファイルの内容をコピー
2. SQL Editorに貼り付け
3. 「Run」ボタンをクリック

### 4. 実行結果の確認
実行後、以下の3つのテーブルが表示されることを確認：
- `user_profiles` - ユーザープロフィール用
- `store_reviews` - レビュー用  
- `stores` - 店舗情報（既存）

### 5. ブラウザで動作確認
1. ブラウザのキャッシュをクリア（Ctrl+Shift+R）
2. https://bettger3000.github.io/nagoya-glutenfree-map/ にアクセス
3. ログイン後、プロフィール設定を試す

## トラブルシューティング

### エラーが続く場合
1. **テーブルの存在確認**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

2. **RLSポリシーの確認**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename IN ('user_profiles', 'store_reviews');
   ```

3. **手動でテーブル作成**
   もしテーブルが存在しない場合は、SQL Editorで個別に作成してください。

## 注意事項
- このSQLスクリプトは既存のデータを削除しません
- `IF NOT EXISTS`句により、既存のテーブルは上書きされません
- RLSポリシーは再作成されるため、カスタマイズしている場合は注意してください

## サポート
問題が解決しない場合は、以下の情報と共にご連絡ください：
- エラーメッセージのスクリーンショット
- Supabaseのログ（Table Editor → Logs）
- ブラウザのコンソールエラー（F12 → Console）