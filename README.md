# Nagoya Gluten-Free Map v2

名古屋グルテンフリーマップ - クリーンリビルド版

## 技術スタック
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Map: Leaflet.js
- Backend: Supabase
- Authentication: Supabase Auth
- Hosting: GitHub Pages

## 開発進捗
- [x] プロジェクト初期化
- [x] 基本地図表示 (Leaflet.js)
- [x] 店舗データ表示 (Supabase連携)
- [x] カテゴリー別フィルタリング
- [x] リアルタイム検索機能
- [x] 統計表示とUI改善
- [x] レスポンシブデザイン
- [ ] 認証機能
- [ ] レビューシステム
- [ ] 管理機能

## 実装済み機能

### 🗺️ マップ表示
- Leaflet.jsによる高速地図表示
- カスタムマーカー（カテゴリー別色分け）
- 店舗詳細ポップアップ

### 🔍 検索・フィルタリング
- リアルタイム文字検索（店名・住所・説明文）
- カテゴリー別フィルタリング
- 統計表示（総店舗数・表示中）

### 🎨 UI/UX
- レスポンシブデザイン（PC・スマホ対応）
- モダンなグリーン系デザイン
- 滑らかなアニメーション

## ブランチについて
- `main`: 旧版（安定版）
- `rebuild-clean`: 新版（開発中）