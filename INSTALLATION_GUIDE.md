# 📋 名古屋グルテンフリーマップ v2 完全構築指示書

## 🎯 プロジェクト概要
名古屋のグルテンフリー対応店舗を地図上で検索・管理できるWebアプリケーション

## ✨ 主要機能
- 📍 インタラクティブマップ表示（Leaflet.js）
- 🔍 リアルタイム店舗検索・フィルタリング
- ⭐ レビューシステム（投稿・編集・削除）
- 🔐 Google認証システム（Supabase Auth）
- 📱 レスポンシブデザイン（PC・スマホ対応）
- 🔧 管理者モード（座標修正機能）
- 📊 統計表示・カテゴリ別表示

## 🛠️ 技術スタック
```
Frontend: HTML5, CSS3, Vanilla JavaScript (ES6 modules)
Map Library: Leaflet.js
Backend: Supabase (PostgreSQL + Auth)
Authentication: Google OAuth via Supabase
Icons: Font Awesome 6.4.0
Hosting: GitHub Pages
```

## 🗄️ データベース設計

### Supabaseテーブル構造

#### 1. stores（店舗情報）
```sql
CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    description TEXT,
    phone VARCHAR(20),
    website VARCHAR(255),
    opening_hours TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. user_profiles（ユーザープロフィール）
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    avatar_emoji VARCHAR(10) DEFAULT '🍰',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. store_reviews（店舗レビュー）
```sql
CREATE TABLE store_reviews (
    id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    visited BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 📁 ファイル構造
```
nagoya-glutenfree-map/
├── index.html              # メインエントリー（認証付き）
├── index-simple.html       # 認証なし版
├── map.html                # メインマップページ
├── login.html              # ログインページ
├── style.css               # メインCSS
├── robots.txt              # 検索エンジン対策
│
├── app.js                  # メインアプリケーション
├── supabase-client.js      # Supabaseクライアント
├── auth.js                 # 認証システム
├── hamburger-menu.js       # ハンバーガーメニュー
├── review-system.js        # レビューシステム
│
└── README.md
```

## ⚙️ 実装手順

### Phase 1: 基盤構築

#### 1. Supabaseプロジェクト作成
```bash
# 1. https://supabase.com でプロジェクト作成
# 2. 上記SQLを実行してテーブル作成
# 3. Row Level Security (RLS) 設定
```

#### 2. 認証設定
```sql
-- Google OAuth設定をSupabaseで有効化
-- Redirect URLs設定: https://yourdomain.com/map.html
```

#### 3. 共有Supabaseクライアント作成
```javascript
// supabase-client.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let globalSupabaseClient = null;

export function getSupabaseClient() {
    if (!globalSupabaseClient) {
        globalSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        });
    }
    return globalSupabaseClient;
}
```

### Phase 2: UI構築

#### 4. メインHTML構造（map.html）
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
    <title>グルテンフリーマップ - 名古屋</title>
    
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <div class="header-content">
            <div class="header-left">
                <button class="hamburger-btn" id="hamburgerBtn">
                    <span class="hamburger-line"></span>
                    <span class="hamburger-line"></span>
                    <span class="hamburger-line"></span>
                </button>
                <h1><i class="fas fa-map-marked-alt"></i>グルテンフリーマップ</h1>
            </div>
            <div class="header-right">
                <button onclick="toggleAdminMode()" class="admin-toggle-btn" id="adminToggleBtn">
                    <i class="fas fa-cog"></i> 管理
                </button>
            </div>
        </div>
    </header>

    <!-- 統計表示 -->
    <div class="stats">
        <div class="stat-item">
            <div class="stat-number" id="totalStores">-</div>
            <div class="stat-label">総店舗数</div>
        </div>
        <div class="stat-item">
            <div class="stat-number" id="visibleStores">-</div>
            <div class="stat-label">表示中</div>
        </div>
    </div>

    <!-- 検索・フィルター -->
    <div class="search-section">
        <input type="text" id="searchInput" placeholder="店名・住所で検索...">
        <div class="filter-buttons" id="filterButtons"></div>
    </div>

    <!-- 地図 -->
    <div id="map"></div>

    <!-- 管理者モード -->
    <div id="adminSection" class="admin-section" style="display: none;">
        <h3>管理者モード</h3>
        <button id="coordinateFixBtn">座標を修正</button>
    </div>

    <!-- スクリプト -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script type="module" src="supabase-client.js"></script>
    <script type="module" src="auth.js"></script>
    <script type="module" src="hamburger-menu.js"></script>
    <script type="module" src="review-system.js"></script>
    <script src="app.js"></script>
</body>
</html>
```

### Phase 3: 地図機能実装

#### 5. メインアプリケーション（app.js）
```javascript
// グローバル変数
let map, markers = [], storesData = [];
let currentUser = null, adminMode = false;

// アプリケーション初期化
async function initApp() {
    console.log('🚀 グルテンフリーマップ初期化開始');
    
    try {
        // 地図初期化
        initMap();
        
        // 店舗データ読み込み
        await loadStores();
        
        // 統計更新
        updateStats();
        
        // フィルターボタン生成
        generateFilterButtons();
        
        // 検索機能初期化
        initializeSearch();
        
    } catch (error) {
        console.error('❌ 初期化エラー:', error);
    }
}

// 地図初期化
function initMap() {
    map = L.map('map').setView([35.1694, 136.8754], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// 店舗データ読み込み
async function loadStores() {
    try {
        const supabase = window.supabase;
        const { data: stores, error } = await supabase
            .from('stores')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        storesData = stores;
        displayStores(stores);
    } catch (error) {
        console.error('❌ 店舗データ取得エラー:', error);
    }
}

// カテゴリ別スタイル
const categoryStyles = {
    '和食': { color: '#ff6b6b', icon: 'fa-utensils' },
    '洋食': { color: '#4ecdc4', icon: 'fa-pizza-slice' },
    'カフェ': { color: '#f7b731', icon: 'fa-coffee' },
    'パン屋': { color: '#5f27cd', icon: 'fa-bread-slice' },
    '販売店': { color: '#00d2d3', icon: 'fa-gift' },
    'スイーツ': { color: '#ff9ff3', icon: 'fa-ice-cream' }
};

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', initApp);
```

### Phase 4: 認証システム

#### 6. 認証システム（auth.js）
```javascript
import { getSupabaseClient } from './supabase-client.js';
const supabase = getSupabaseClient();

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // セッション確認
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await this.handleAuthSuccess(session.user);
        }
        
        // 認証状態監視
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                await this.handleAuthSuccess(session.user);
            } else if (event === 'SIGNED_OUT') {
                this.handleAuthSignOut();
            }
        });
    }

    async signInWithGoogle() {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/map.html`
            }
        });
    }
}

window.authManager = new AuthManager();
```

### Phase 5: レビューシステム

#### 7. レビューシステム（review-system.js）
```javascript
import { getSupabaseClient } from './supabase-client.js';
const supabase = getSupabaseClient();

class ReviewSystem {
    constructor() {
        this.init();
    }

    async submitReview(storeId, rating, comment, visited) {
        try {
            const { data, error } = await supabase
                .from('store_reviews')
                .insert([{
                    store_id: storeId,
                    user_id: currentUser.id,
                    rating,
                    comment,
                    visited
                }]);
            
            if (error) throw error;
            console.log('✅ レビュー投稿完了');
        } catch (error) {
            console.error('❌ レビュー投稿エラー:', error);
        }
    }
}

export function initReviewSystem() {
    return new ReviewSystem();
}
```

## 🎨 デザイン仕様

### カラーパレット
```css
:root {
    --primary-green: #98D8C8;
    --light-green: #B8E8D8;
    --dark-green: #78C8B8;
    --white: #ffffff;
    --bg-cream: #faf8f5;
    --text-dark: #333333;
    --shadow: rgba(0,0,0,0.1);
}
```

### レスポンシブブレークポイント
- モバイル: ~768px
- タブレット: 768px~1024px  
- デスクトップ: 1024px~

## 🚀 デプロイ手順

### GitHub Pages設定
```bash
# 1. GitHubリポジトリ作成
git init
git add .
git commit -m "Initial commit"
git push origin main

# 2. GitHub Pages有効化
# Settings > Pages > Source: main branch

# 3. カスタムドメイン設定（オプション）
```

### 環境変数設定
```javascript
// supabase-client.jsで設定
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

## 🔒 セキュリティ設定

### Row Level Security (RLS)
```sql
-- user_profilesテーブル
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON user_profiles 
    FOR SELECT USING (auth.uid() = id);

-- store_reviewsテーブル  
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all reviews" ON store_reviews 
    FOR SELECT TO authenticated USING (true);
```

### プライバシー設定
```html
<!-- 検索エンジン対策 -->
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
```

```
# robots.txt
User-agent: *
Disallow: /
```

## ✅ 完成チェックリスト

### 必須機能
- [ ] 地図表示・店舗マーカー表示
- [ ] 検索・フィルタリング機能
- [ ] レビューシステム（投稿・表示）
- [ ] Google認証
- [ ] レスポンシブデザイン
- [ ] 管理者モード

### オプション機能
- [ ] 統計表示
- [ ] カテゴリ別フィルタリング
- [ ] ハンバーガーメニュー
- [ ] 座標修正機能

## 🐛 トラブルシューティング

### よくある問題
1. **認証が動作しない**
   - Supabase OAuth設定確認
   - リダイレクトURL設定確認

2. **店舗が表示されない**  
   - コンソールエラー確認
   - Supabase接続確認

3. **レビューが表示されない**
   - RLS設定確認
   - 認証状態確認

---

この指示書に従って実装すれば、現在のグルテンフリーマップと同等の機能を持つアプリケーションを0から構築できます。

🎯 **最終確認URL**: https://bettger3000.github.io/nagoya-glutenfree-map/