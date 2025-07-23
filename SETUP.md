# 🚀 GitHub自動連携セットアップ手順

管理画面から直接GitHubに保存できるようにするための設定手順です。

## 📋 手順

### 1. GitHub Personal Access Token の作成

1. **GitHubにログイン**して、右上のアイコン → **Settings**をクリック

2. 左メニューの一番下 **Developer settings**をクリック

3. **Personal access tokens** → **Tokens (classic)**をクリック

4. **Generate new token** → **Generate new token (classic)**をクリック

5. 設定項目を入力：
   - **Note**: `nagoya-glutenfree-map管理`（わかりやすい名前）
   - **Expiration**: `90 days`または`No expiration`
   - **Select scopes**: ✅ **repo**にチェック（Contents権限が含まれます）

6. **Generate token**をクリック

7. **🚨重要🚨 表示されたトークンをコピー**（再表示されません）
   - 例：`ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. 管理画面での設定

1. **管理画面にアクセス**
   - https://bettger3000.github.io/nagoya-glutenfree-map/admin.html

2. **🚀 GitHubに直接保存**ボタンをクリック

3. **GitHub設定モーダル**が開くので、コピーしたトークンを貼り付け

4. **保存**ボタンをクリック

## ✅ 完了

これで管理画面から**🚀 GitHubに直接保存**ボタンで、自動的にマップに反映されるようになります！

## 🔐 セキュリティ

- トークンはブラウザのローカルストレージに保存されます
- 他の人がアクセスしても、あなたのトークンは見えません
- トークンは必要最小限の権限（repo）のみです

## 🆘 トラブルシューティング

### エラー「401 Unauthorized」
- トークンの有効期限が切れています
- 新しいトークンを作成してください

### エラー「403 Forbidden」
- トークンの権限が不足しています
- 「repo」権限が選択されているか確認してください

### 保存できない
- インターネット接続を確認してください
- ブラウザのコンソールでエラーを確認してください

## 📞 サポート

問題が解決しない場合は、GitHubのIssuesでお知らせください。