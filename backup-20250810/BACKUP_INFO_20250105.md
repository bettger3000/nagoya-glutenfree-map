# 名古屋グルテンフリーマップ バックアップ情報
**バックアップ作成日**: 2025年1月5日

## プロジェクト情報
- **プロジェクト名**: nagoya-glutenfree-map
- **GitHub Pages URL**: https://bettger3000.github.io/nagoya-glutenfree-map/
- **管理画面URL**: https://bettger3000.github.io/nagoya-glutenfree-map/admin.html

## 現在の設定情報

### 1. GitHub設定
- **リポジトリ**: bettger3000/nagoya-glutenfree-map
- **GitHub Pages**: mainブランチから配信
- **Personal Access Token権限**: repo（フルアクセス）
  - ⚠️ **重要**: セキュリティ改善前の設定のため、このトークンは使用しないでください

### 2. Google Analytics設定
- **GA4測定ID**: G-CL6YY713PG
- **Search Console確認タグ**: Czv7Zz2W6KDA9hY2uEteTv_7EU0_w66ISz_qTO3NmPQ

### 3. 主要機能の状態
- **訪問ステータス機能**: 実装済み（🔴naco、🟡メンバー、🤍未確認）
- **CSV入力機能**: 実装済み（ドラッグ&ドロップ対応）
- **座標自動丸め機能**: 実装済み（小数第4位）
- **店舗数**: 6店舗登録

### 4. ファイル構成
```
nagoya-glutenfree-map/
├── index.html          # メインページ
├── admin.html          # 管理画面（統合版）
├── app.js              # メインJavaScript（1,437行）
├── admin.js            # 削除予定（未削除）
├── visit-status-admin.html  # 削除予定（未削除）
├── stores.json         # 店舗データ
├── style.css           # スタイルシート
├── SETUP.md            # セットアップ手順
└── その他アセットファイル
```

### 5. 重要な実装詳細
- **トークン保存場所**: localStorage（キー: 'githubToken'）
- **データ更新方法**: GitHub Contents API経由
- **カテゴリー**: 和食、洋食、カフェ、パン屋、販売店、スイーツ
- **フィルター機能**: カテゴリー別、訪問ステータス別

## バックアップからの復元方法

### Gitタグから復元
```bash
# タグ一覧確認
git tag -l

# 特定のタグに戻る
git checkout v1.0-before-security-fix

# または、バックアップブランチに切り替え
git checkout backup-original-state
```

### 設定の復元
1. Personal Access Tokenの再設定（必要な場合）
2. GitHub Pages設定の確認
3. Google Analytics設定の確認

## 注意事項
- このバックアップは**セキュリティ改善前**の状態です
- Personal Access Tokenの扱いには十分注意してください
- 本番環境での使用は推奨されません

## 今後の改善予定
1. GitHub Actions実装によるセキュリティ強化
2. 管理画面の認証機能追加
3. トークンの安全な管理方法への移行