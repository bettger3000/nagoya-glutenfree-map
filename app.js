// グルテンフリーマップ v2 - メインアプリケーション
// import { getSupabaseClient } from './supabase-client.js';

// グローバル変数
let map;
let markers = [];
let storesData = [];
let activeFilter = 'all';
let searchQuery = '';
let currentUser = null;

// 認証チェック関数
async function checkAuthentication() {
    try {
        console.log('🔒 認証チェック開始...');
        
        // Supabaseクライアントを作成
        if (!window.supabase) {
            console.warn('❗ window.supabaseが利用できません、直接作成します');
        }
        
        // タイムアウトを設定 (3秒)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('認証チェックタイムアウト')), 3000)
        );
        
        // 認証をスキップ（パブリックアクセス版）
        console.log('🔓 認証をスキップしています（パブリックアクセス版）');
        return { data: { session: null }, error: null };
        
        const { data: { session }, error } = await Promise.race([
            sessionCheckPromise,
            timeoutPromise
        ]);
        
        if (error) {
            console.error('❗ 認証エラー:', error);
            // エラー時はログインページへリダイレクト
            setTimeout(() => window.location.href = 'login.html', 1000);
            return false;
        }
        
        if (!session || !session.user) {
            console.log('🚪 認証セッションがありません');
            // ログインページへリダイレクト
            setTimeout(() => window.location.href = 'login.html', 1000);
            return false;
        }
        
        currentUser = session.user;
        console.log('✅ 認証確認完了:', currentUser.email);
        return true;
        
    } catch (error) {
        console.error('❗ 認証チェックエラー:', error);
        // エラー時はログインページへリダイレクト
        setTimeout(() => window.location.href = 'login.html', 1000);
        return false;
    }
}

// Supabaseクライアント設定は supabase-client.js で一元管理

let supabase;

// カテゴリー別スタイル
const categoryStyles = {
    '和食': { color: '#ff6b6b', icon: 'fa-utensils' },
    '洋食': { color: '#4ecdc4', icon: 'fa-pizza-slice' },
    'カフェ': { color: '#f7b731', icon: 'fa-coffee' },
    'パン屋': { color: '#5f27cd', icon: 'fa-bread-slice' },
    '販売店': { color: '#00d2d3', icon: 'fa-gift' },
    'スイーツ': { color: '#ff9ff3', icon: 'fa-ice-cream' },
    'その他': { color: '#98D8C8', icon: 'fa-store' }
};

// アプリケーション初期化
async function initApp() {
    console.log('🚀 グルテンフリーマップ v2 Social 初期化開始');
    
    try {
        // 認証チェックを一時的にスキップ（デバッグ用）
        console.log('⚠️ 認証チェックをスキップしています（デバッグモード）');
        // const authResult = await checkAuthentication();
        // if (!authResult) {
        //     console.log('認証に失敗しました。リダイレクト中...');
        //     return; // 初期化を中断
        // }
        
        // 必要な要素の存在確認
        const requiredElements = ['map', 'totalStores', 'visibleStores', 'loadingStatus'];
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            throw new Error(`必要な要素が見つかりません: ${missingElements.join(', ')}`);
        }
        
        // Supabaseクライアント初期化（共有クライアント使用）
        if (window.supabase) {
            supabase = window.supabase;
            console.log('✅ 共有Supabaseクライアント利用');
        } else {
            console.warn('⚠️ Supabaseクライアントが利用できません（パブリックアクセス版）');
        }
        
        // ハンバーガーメニュー初期化
        setTimeout(() => {
            if (window.initHamburgerMenu) {
                window.initHamburgerMenu();
                console.log('✅ ハンバーガーメニュー初期化完了');
            }
        }, 1000);
        
        // レビューシステム初期化
        setTimeout(() => {
            if (window.initReviewSystem) {
                window.reviewSystem = window.initReviewSystem();
                console.log('✅ レビューシステム初期化完了');
            }
        }, 1500);
        
        // 地図を初期化
        initMap();
        
        // 店舗データを読み込み
        await loadStores();
        
        // 統計を更新
        updateStats();
        
        // フィルターボタンを生成
        generateFilterButtons();
        
        // 検索機能を初期化
        initializeSearch();
        
        console.log('✅ アプリケーション初期化完了');
        
        // 初期化完了を示すイベントを発行
        document.dispatchEvent(new CustomEvent('mapInitialized', {
            detail: { 
                totalStores: storesData.length,
                validCoordinates: storesData.filter(s => isValidLatLng(parseFloat(s.latitude), parseFloat(s.longitude))).length
            }
        }));
        
    } catch (error) {
        console.error('❌ 初期化エラー:', error);
        showError('アプリケーションの初期化に失敗しました: ' + error.message);
        
        // 初期化失敗を示すイベントを発行
        document.dispatchEvent(new CustomEvent('mapInitializationFailed', {
            detail: { error: error.message }
        }));
    }
}

// 地図初期化
function initMap() {
    console.log('🗺️ 地図を初期化中...');
    
    // 名古屋市中心部を中心とした地図
    map = L.map('map').setView([35.1694, 136.8754], 12);
    
    // OpenStreetMapタイル
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // 地図コンテナのスタイルを調整
    const mapContainer = document.getElementById('map');
    mapContainer.classList.remove('loading');
    
    console.log('✅ 地図初期化完了');
}

// 店舗データ読み込み
async function loadStores() {
    console.log('🏪 店舗データを読み込み中...');
    
    try {
        const { data: stores, error } = await supabase
            .from('stores')
            .select('*')
            .order('name');
        
        if (error) {
            console.error('Supabaseエラー:', error);
            throw error;
        }
        
        storesData = stores || [];
        console.log(`📊 ${storesData.length}件の店舗データを取得`);
        
        // デバッグ: 最初の店舗データ構造を確認
        if (storesData.length > 0) {
            console.log('🔍 店舗データサンプル:', storesData[0]);
            console.log('🔍 利用可能なフィールド:', Object.keys(storesData[0]));
            
            // 座標データの状況を確認
            let validCoords = 0;
            let invalidCoords = 0;
            storesData.forEach(store => {
                const lat = parseFloat(store.latitude);
                const lng = parseFloat(store.longitude);
                if (isValidLatLng(lat, lng)) {
                    validCoords++;
                } else {
                    invalidCoords++;
                }
            });
            console.log(`📍 座標状況: 有効 ${validCoords}件, 無効 ${invalidCoords}件`);
        }
        
        // Googleマップリンクから座標を抽出
        const processedStores = storesData.map(store => {
            return processStoreCoordinates(store);
        });
        
        // マーカーを表示
        displayStores(processedStores);
        
    } catch (error) {
        console.error('❌ 店舗データ取得エラー:', error);
        showError('店舗データの取得に失敗しました: ' + error.message);
    }
}

// 店舗をマップに表示
function displayStores(stores) {
    console.log('📍 マーカーを配置中...');
    
    // 既存マーカーをクリア
    clearMarkers();
    
    let validMarkers = 0;
    let invalidMarkers = 0;
    
    stores.forEach(store => {
        const marker = createStoreMarker(store);
        if (marker) {
            markers.push(marker);
            marker.addTo(map);
            validMarkers++;
        } else {
            invalidMarkers++;
        }
    });
    
    console.log(`✅ ${validMarkers}個の有効マーカーを配置完了`);
    if (invalidMarkers > 0) {
        console.warn(`⚠️ ${invalidMarkers}個の無効な店舗データをスキップ`);
    }
}

// 店舗マーカー作成
function createStoreMarker(store) {
    // みちのり弁当の特別処理（二重チェック）
    if (store.name && (store.name === 'みちのり弁当' || store.name.includes('みちのり弁当'))) {
        store.latitude = 35.193814797252664;
        store.longitude = 136.89012908157014;
        console.log(`🎯 マーカー作成時: みちのり弁当の座標を確認 (${store.latitude}, ${store.longitude})`);
    }
    
    // 成城石井の特別処理（二重チェック）
    if (store.name && store.name.includes('成城石井')) {
        store.latitude = 35.169551;
        store.longitude = 136.883121;
        console.log(`🎯 マーカー作成時: 成城石井の座標を確認 (${store.latitude}, ${store.longitude})`);
    }
    
    // 緯度経度の検証
    const lat = parseFloat(store.latitude);
    const lng = parseFloat(store.longitude);
    
    if (!isValidLatLng(lat, lng)) {
        console.warn(`❌ 無効な座標データ: ${store.name} (${store.latitude}, ${store.longitude})`);
        return null; // 無効な座標の場合はnullを返す
    }
    
    const category = store.category || 'その他';
    const style = categoryStyles[category] || categoryStyles['その他'];
    
    try {
        const marker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `
                    <div class="marker-pin category-${category.replace(/[^a-zA-Z0-9]/g, '')}" style="background-color: ${style.color}; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        <i class="fas ${style.icon}" style="color: white; font-size: 12px;"></i>
                    </div>
                `,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            })
        });
        
        // クリックイベント
        marker.on('click', () => {
            if (adminMode) {
                selectStoreForCoordinates(store);
            } else {
                showStorePopup(store);
            }
        });
        
        // ストアデータを保存
        marker.storeData = store;
        
        return marker;
        
    } catch (error) {
        console.error(`❌ マーカー作成エラー: ${store.name}`, error);
        return null;
    }
}

// 緯度経度の妥当性チェック
function isValidLatLng(lat, lng) {
    return (
        !isNaN(lat) && 
        !isNaN(lng) && 
        lat >= -90 && 
        lat <= 90 && 
        lng >= -180 && 
        lng <= 180 &&
        lat !== 0 && 
        lng !== 0
    );
}

// 店舗データの座標処理
function processStoreCoordinates(store) {
    // みちのり弁当の特別処理
    if (store.name && (store.name === 'みちのり弁当' || store.name.includes('みちのり弁当'))) {
        store.latitude = 35.193814797252664;
        store.longitude = 136.89012908157014;
        console.log(`🎯 みちのり弁当の正確な座標を設定: (${store.latitude}, ${store.longitude})`);
        return store;
    }
    
    // 成城石井の特別処理
    if (store.name && store.name.includes('成城石井')) {
        store.latitude = 35.169551;
        store.longitude = 136.883121;
        console.log(`🎯 成城石井の正確な座標を設定: (${store.latitude}, ${store.longitude})`);
        return store;
    }
    
    // 既に有効な latitude, longitude がある場合はそのまま使用
    const existingLat = parseFloat(store.latitude);
    const existingLng = parseFloat(store.longitude);
    
    if (isValidLatLng(existingLat, existingLng)) {
        // 既存の座標が有効ならそのまま使用
        return store;
    }
    
    // 座標が無効またはない場合のみ、Googleマップリンクから座標を抽出
    const coordinates = extractCoordinatesFromGoogleMaps(store);
    
    if (coordinates) {
        store.latitude = coordinates.lat;
        store.longitude = coordinates.lng;
        console.log(`📍 ${store.name}: 座標抽出成功 (${coordinates.lat}, ${coordinates.lng})`);
    } else {
        console.warn(`⚠️ ${store.name}: 座標抽出失敗`);
    }
    
    return store;
}

// GoogleマップリンクやURLから座標を抽出
function extractCoordinatesFromGoogleMaps(store) {
    // 検索するフィールド名のリスト
    const urlFields = ['google_maps_url', 'maps_url', 'url', 'link', 'google_maps', 'map_link', 'website'];
    
    let mapUrl = null;
    
    // URLを含むフィールドを探す
    for (const field of urlFields) {
        if (store[field] && typeof store[field] === 'string' && store[field].includes('google')) {
            mapUrl = store[field];
            break;
        }
    }
    
    if (!mapUrl) {
        // 全フィールドからGoogleマップURLを探す
        for (const [key, value] of Object.entries(store)) {
            if (typeof value === 'string' && (
                value.includes('maps.google') || 
                value.includes('goo.gl/maps') ||
                value.includes('@') && value.includes(',')
            )) {
                mapUrl = value;
                console.log(`🔍 ${store.name}: URLフィールド "${key}" で発見: ${value.substring(0, 50)}...`);
                break;
            }
        }
    }
    
    if (!mapUrl) {
        return null;
    }
    
    // 座標抽出のパターン
    const patterns = [
        // @lat,lng,zoom パターン
        /@(-?\d+\.?\d*),(-?\d+\.?\d*),/,
        // !3d緯度!4d経度 パターン  
        /!3d(-?\d+\.?\d*).*!4d(-?\d+\.?\d*)/,
        // ll=lat,lng パターン
        /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        // q=lat,lng パターン
        /q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        // center=lat,lng パターン
        /center=(-?\d+\.?\d*),(-?\d+\.?\d*)/
    ];
    
    for (const pattern of patterns) {
        const match = mapUrl.match(pattern);
        if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            
            if (isValidLatLng(lat, lng)) {
                return { lat, lng };
            }
        }
    }
    
    return null;
}

// 店舗ポップアップ表示
function showStorePopup(store) {
    // みちのり弁当の座標を再確認
    if (store.name && (store.name === 'みちのり弁当' || store.name.includes('みちのり弁当'))) {
        store.latitude = 35.193814797252664;
        store.longitude = 136.89012908157014;
    }
    
    // 成城石井の座標を再確認
    if (store.name && store.name.includes('成城石井')) {
        store.latitude = 35.169551;
        store.longitude = 136.883121;
    }
    
    const category = store.category || 'その他';
    const style = categoryStyles[category] || categoryStyles['その他'];
    
    const popupContent = `
        <div style="padding: 15px; min-width: 250px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="display: flex; align-items: center; margin-bottom: 12px; border-bottom: 2px solid ${style.color}; padding-bottom: 8px;">
                <i class="fas ${style.icon}" style="color: ${style.color}; margin-right: 10px; font-size: 16px;"></i>
                <h3 style="margin: 0; color: #333; font-size: 18px;">${store.name}</h3>
            </div>
            
            ${store.address ? `
                <div style="margin-bottom: 10px; display: flex; align-items: flex-start;">
                    <i class="fas fa-map-marker-alt" style="color: #666; margin-right: 8px; margin-top: 2px; font-size: 14px;"></i>
                    <span style="color: #666; font-size: 14px; line-height: 1.4;">${store.address}</span>
                </div>
            ` : ''}
            
            ${store.phone ? `
                <div style="margin-bottom: 10px; display: flex; align-items: center;">
                    <i class="fas fa-phone" style="color: #666; margin-right: 8px; font-size: 14px;"></i>
                    <span style="color: #666; font-size: 14px;">${store.phone}</span>
                </div>
            ` : ''}
            
            ${store.hours ? `
                <div style="margin-bottom: 10px; display: flex; align-items: center;">
                    <i class="fas fa-clock" style="color: #666; margin-right: 8px; font-size: 14px;"></i>
                    <span style="color: #666; font-size: 14px;">${store.hours}</span>
                </div>
            ` : ''}
            
            <div style="margin-bottom: 12px;">
                <span style="background: ${style.color}; color: white; padding: 4px 10px; border-radius: 15px; font-size: 12px; font-weight: 600;">
                    ${category}
                </span>
            </div>
            
            ${store.description ? `
                <div style="color: #555; font-size: 14px; margin-top: 10px; line-height: 1.5; padding: 8px; background: #f8f9fa; border-radius: 6px;">
                    <i class="fas fa-info-circle" style="color: #007bff; margin-right: 6px;"></i>
                    ${store.description}
                </div>
            ` : ''}
            
            <!-- レビュー情報 -->
            <div id="storeRating-${store.id}" style="margin: 12px 0; padding: 8px; background: #f8f9fa; border-radius: 6px; text-align: center;">
                <div style="color: #999; font-size: 12px;">評価読み込み中...</div>
            </div>
            
            ${store.website || store.google_maps_url ? `
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    ${store.website ? `<a href="${store.website}" target="_blank" style="color: #007bff; font-size: 12px; text-decoration: none;"><i class="fas fa-external-link-alt"></i> サイト</a>` : ''}
                    ${store.google_maps_url ? `<a href="${store.google_maps_url}" target="_blank" style="color: #4285f4; font-size: 12px; text-decoration: none;"><i class="fas fa-map"></i> MAP</a>` : ''}
                </div>
            ` : ''}
            
            <!-- レビューボタン -->
            <div style="display: flex; gap: 8px; margin-top: 12px;">
                <button 
                    onclick="openReviewModal('${store.id}', '${store.name?.replace(/'/g, '\\'')}')" 
                    style="flex: 1; background: ${style.color}; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: opacity 0.2s;"
                    onmouseover="this.style.opacity='0.8'" 
                    onmouseout="this.style.opacity='1'"
                >
                    ✨ レビューを書く
                </button>
                <button 
                    onclick="showStoreReviews('${store.id}', '${store.name?.replace(/'/g, '\\'')}')" 
                    style="flex: 1; background: #6c757d; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: opacity 0.2s;"
                    onmouseover="this.style.opacity='0.8'" 
                    onmouseout="this.style.opacity='1'"
                >
                    📄 レビュー一覧
                </button>
            </div>
        </div>
    `;
    
    const popup = L.popup({
        maxWidth: 300,
        closeButton: true
    })
        .setLatLng([store.latitude, store.longitude])
        .setContent(popupContent)
        .openOn(map);
    
    // ポップアップ表示後に評価情報を読み込み
    loadStoreRating(store.id);
}

// グローバル関数: レビューモーダルを開く
window.openReviewModal = function(storeId, storeName) {
    if (window.reviewSystem) {
        window.reviewSystem.openReviewModal(storeId, storeName);
    } else {
        alert('レビューシステムが初期化されていません');
    }
};

// グローバル関数: 店舗レビュー一覧を表示
window.showStoreReviews = function(storeId, storeName) {
    // TODO: レビュー一覧モーダルを実装
    alert(`${storeName}のレビュー一覧機能は次回アップデートで実装します`);
};

// 店舗の評価情報を読み込み
async function loadStoreRating(storeId) {
    try {
        const ratingElement = document.getElementById(`storeRating-${storeId}`);
        if (!ratingElement || !window.reviewSystem) return;
        
        const rating = await window.reviewSystem.getStoreRating(storeId);
        
        if (rating.count > 0) {
            const stars = '★'.repeat(Math.floor(rating.average)) + '☆'.repeat(5 - Math.floor(rating.average));
            ratingElement.innerHTML = `
                <div style="color: #ffd700; font-size: 14px; margin-bottom: 2px;">${stars}</div>
                <div style="color: #666; font-size: 11px;">${rating.average.toFixed(1)} (${rating.count}件のレビュー)</div>
            `;
        } else {
            ratingElement.innerHTML = `
                <div style="color: #999; font-size: 11px;">まだレビューがありません</div>
            `;
        }
    } catch (error) {
        console.error('評価情報読み込みエラー:', error);
    }
}

// マーカークリア
function clearMarkers() {
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];
}

// 統計更新
function updateStats() {
    const totalStoresElement = document.getElementById('totalStores');
    const visibleStoresElement = document.getElementById('visibleStores');
    const loadingStatusElement = document.getElementById('loadingStatus');
    
    const visibleMarkers = markers.filter(marker => map && map.hasLayer(marker));
    
    if (totalStoresElement) {
        totalStoresElement.textContent = storesData.length;
    }
    
    if (visibleStoresElement) {
        visibleStoresElement.textContent = visibleMarkers.length;
    }
    
    if (loadingStatusElement) {
        if (storesData.length > 0) {
            const validCoords = storesData.filter(store => {
                const lat = parseFloat(store.latitude);
                const lng = parseFloat(store.longitude);
                return isValidLatLng(lat, lng);
            }).length;
            
            loadingStatusElement.textContent = `完了 (${validCoords}/${storesData.length})`;
        } else {
            loadingStatusElement.textContent = '読み込み中';
        }
    }
    
    // カテゴリー別統計
    const categoryStats = {};
    storesData.forEach(store => {
        const category = store.category || 'その他';
        categoryStats[category] = (categoryStats[category] || 0) + 1;
    });
    
    console.log('📊 カテゴリー別統計:', categoryStats);
}

// フィルターボタン生成
function generateFilterButtons() {
    const filterButtonsContainer = document.getElementById('filterButtons');
    
    if (!filterButtonsContainer) return;
    
    // カテゴリー統計を作成
    const categoryStats = {};
    storesData.forEach(store => {
        const category = store.category || 'その他';
        categoryStats[category] = (categoryStats[category] || 0) + 1;
    });
    
    // 「すべて」ボタンの店舗数を更新
    const allButton = filterButtonsContainer.querySelector('[data-category="all"]');
    if (allButton) {
        allButton.innerHTML = `<i class="fas fa-th"></i> すべて (${storesData.length})`;
    }
    
    // カテゴリーボタンを追加
    Object.entries(categoryStats).forEach(([category, count]) => {
        const style = categoryStyles[category] || categoryStyles['その他'];
        
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.setAttribute('data-category', category);
        button.innerHTML = `
            <i class="fas ${style.icon}" style="color: ${style.color};"></i>
            ${category} (${count})
        `;
        
        button.addEventListener('click', () => filterStores(category));
        filterButtonsContainer.appendChild(button);
    });
    
    // 「すべて」ボタンのイベント
    if (allButton) {
        allButton.addEventListener('click', () => filterStores('all'));
    }
}

// 店舗フィルター
function filterStores(category) {
    activeFilter = category;
    console.log(`🔍 フィルター適用: ${category}`);
    
    // フィルターボタンのアクティブ状態を更新
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-category') === category) {
            btn.classList.add('active');
        }
    });
    
    // 統合検索・フィルターを適用
    applyFiltersAndSearch();
    
    // 統計を更新
    updateStats();
}

// 検索機能初期化
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    
    if (!searchInput || !clearSearchBtn) {
        console.warn('検索要素が見つかりません');
        return;
    }
    
    // 検索入力時の処理（デバウンス付き）
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        // デバウンス（300ms）
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = query;
            
            // クリアボタンの表示/非表示
            if (query) {
                clearSearchBtn.classList.add('show');
            } else {
                clearSearchBtn.classList.remove('show');
            }
            
            // 検索を実行
            applyFiltersAndSearch();
            updateStats();
            
            console.log(`🔍 検索実行: "${query}"`);
        }, 300);
    });
    
    // クリアボタンのクリック処理
    clearSearchBtn.addEventListener('click', function() {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.remove('show');
        applyFiltersAndSearch();
        updateStats();
        searchInput.focus();
        console.log('🔍 検索クリア');
    });
    
    // Enterキーでの検索
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            // 即座に検索を実行
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            searchQuery = query;
            applyFiltersAndSearch();
            updateStats();
        }
    });
    
    console.log('✅ 検索機能初期化完了');
}

// 検索とフィルターを統合して適用
function applyFiltersAndSearch() {
    markers.forEach(marker => {
        const store = marker.storeData;
        const storeCategory = store.category || 'その他';
        
        // カテゴリーフィルター判定
        const matchesCategory = activeFilter === 'all' || storeCategory === activeFilter;
        
        // 検索クエリ判定
        const matchesSearch = matchesSearchQuery(store);
        
        // 両方の条件を満たす場合のみ表示
        if (matchesCategory && matchesSearch) {
            if (!map.hasLayer(marker)) {
                marker.addTo(map);
            }
        } else {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        }
    });
    
    // 統計を更新
    updateStats();
}

// 検索クエリマッチング
function matchesSearchQuery(store) {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const searchableFields = [
        store.name || '',
        store.address || '',
        store.description || '',
        store.category || ''
    ];
    
    // いずれかのフィールドにクエリが含まれているかチェック
    return searchableFields.some(field => 
        field.toLowerCase().includes(query)
    );
}

// エラー表示
function showError(message) {
    const mapContainer = document.getElementById('map');
    mapContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ff6b6b;">
            <i class="fas fa-exclamation-triangle" style="margin-right: 10px;"></i>
            ${message}
        </div>
    `;
}

// 管理者モード関連の変数
let adminMode = false;
let selectedStoreForCoordinates = null;
let extractedCoordinates = null;

// 管理者モード切り替え
function toggleAdminMode() {
    adminMode = !adminMode;
    const adminSection = document.getElementById('adminSection');
    const adminToggleBtn = document.getElementById('adminToggleBtn');
    
    if (adminMode) {
        adminSection.style.display = 'block';
        adminToggleBtn.classList.add('active');
        adminToggleBtn.innerHTML = '<i class="fas fa-times"></i> 閉じる';
        
        // マーカークリックで店舗選択を有効化
        enableStoreSelection();
        console.log('管理者モードON: 店舗マーカーをクリックして選択してください');
    } else {
        adminSection.style.display = 'none';
        adminToggleBtn.classList.remove('active');
        adminToggleBtn.innerHTML = '<i class="fas fa-cog"></i> 管理';
        
        // 店舗選択を無効化
        disableStoreSelection();
        resetAdminState();
        console.log('管理者モードOFF');
    }
}

// 店舗選択機能を有効化
function enableStoreSelection() {
    markers.forEach(marker => {
        marker.off('click'); // 既存のクリックイベントを削除
        marker.on('click', function() {
            if (adminMode) {
                selectStoreForCoordinates(marker.storeData);
            } else {
                showStorePopup(marker.storeData);
            }
        });
    });
}

// 店舗選択機能を無効化
function disableStoreSelection() {
    markers.forEach(marker => {
        marker.off('click');
        marker.on('click', () => {
            showStorePopup(marker.storeData);
        });
    });
}

// 座標修正用の店舗選択
function selectStoreForCoordinates(store) {
    selectedStoreForCoordinates = store;
    document.getElementById('targetStore').textContent = store.name;
    
    // 既存のGoogleマップURLを検索して設定
    const googleMapUrl = findGoogleMapUrl(store);
    document.getElementById('googleMapUrlInput').value = googleMapUrl;
    
    console.log(`座標修正対象店舗を選択: ${store.name}`);
    
    // 自動で座標抽出を試行
    if (googleMapUrl) {
        extractCoordinatesFromUrl();
    }
}

// Googleマップリンク検索
function findGoogleMapUrl(store) {
    const urlFields = ['google_maps_url', 'maps_url', 'url', 'link', 'website', 'google_maps'];
    
    // 定義されたフィールドから検索
    for (const field of urlFields) {
        const url = store[field];
        if (url && typeof url === 'string' && 
            (url.includes('maps.google') || url.includes('goo.gl/maps'))) {
            return url;
        }
    }
    
    // 全フィールドから検索
    for (const [key, value] of Object.entries(store)) {
        if (typeof value === 'string' && 
            (value.includes('maps.google') || value.includes('goo.gl/maps'))) {
            return value;
        }
    }
    
    return '';
}

// URLから座標を抽出
function extractCoordinatesFromUrl() {
    const url = document.getElementById('googleMapUrlInput').value.trim();
    
    if (!url) {
        alert('GoogleマップのURLを入力してください');
        return;
    }
    
    console.log(`座標抽出中: ${url}`);
    
    // みちのり弁当の特別処理
    if (selectedStoreForCoordinates && selectedStoreForCoordinates.name && 
        selectedStoreForCoordinates.name.includes('みちのり弁当')) {
        extractedCoordinates = { lat: 35.193814797252664, lng: 136.89012908157014 };
        displayExtractedCoordinates();
        console.log('みちのり弁当の正確な座標を使用');
        return;
    }
    
    // 成城石井の特別処理
    if (selectedStoreForCoordinates && selectedStoreForCoordinates.name && 
        selectedStoreForCoordinates.name.includes('成城石井')) {
        extractedCoordinates = { lat: 35.169551, lng: 136.883121 };
        displayExtractedCoordinates();
        console.log('成城石井の正確な座標を使用');
        return;
    }
    
    // 座標抽出のパターン
    const patterns = [
        // @lat,lng,zoom パターン
        /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        // !3d緯度!4d経度 パターン  
        /!3d(-?\d+\.?\d*).*!4d(-?\d+\.?\d*)/,
        // ll=lat,lng パターン
        /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        // q=lat,lng パターン（数字のみ）
        /q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        // center=lat,lng パターン
        /center=(-?\d+\.?\d*),(-?\d+\.?\d*)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            
            if (isValidLatLng(lat, lng)) {
                extractedCoordinates = { lat, lng };
                displayExtractedCoordinates();
                console.log(`座標抽出成功: ${lat}, ${lng}`);
                return;
            }
        }
    }
    
    alert('URLから座標を抽出できませんでした。手動で座標を入力してください。');
    extractedCoordinates = null;
    resetExtractedCoordinatesDisplay();
}

// 抽出した座標を表示
function displayExtractedCoordinates() {
    if (!extractedCoordinates) return;
    
    const coordsDisplay = document.getElementById('coordsDisplay');
    const extractedCoordsDiv = document.getElementById('extractedCoords');
    const saveBtn = document.getElementById('saveCoordinatesBtn');
    
    coordsDisplay.textContent = `${extractedCoordinates.lat.toFixed(6)}, ${extractedCoordinates.lng.toFixed(6)}`;
    extractedCoordsDiv.style.display = 'block';
    saveBtn.disabled = false;
    
    // マップに一時マーカーを追加
    if (map) {
        // 既存の一時マーカーを削除
        if (window.tempMarker) {
            map.removeLayer(window.tempMarker);
        }
        
        // 新しい一時マーカーを追加
        window.tempMarker = L.marker([extractedCoordinates.lat, extractedCoordinates.lng], {
            icon: L.divIcon({
                className: 'temp-marker',
                html: '<div style="background: red; border: 2px solid white; border-radius: 50%; width: 12px; height: 12px;"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }).addTo(map);
        
        window.tempMarker.bindPopup(`新しい座標候補<br>${extractedCoordinates.lat.toFixed(6)}, ${extractedCoordinates.lng.toFixed(6)}`);
        
        // マップをその位置に移動
        map.setView([extractedCoordinates.lat, extractedCoordinates.lng], 16);
    }
}

// 抽出座標表示をリセット
function resetExtractedCoordinatesDisplay() {
    document.getElementById('extractedCoords').style.display = 'none';
    document.getElementById('saveCoordinatesBtn').disabled = true;
    
    // 一時マーカーを削除
    if (window.tempMarker && map) {
        map.removeLayer(window.tempMarker);
        window.tempMarker = null;
    }
}

// 抽出した座標を保存
async function saveExtractedCoordinates() {
    if (!selectedStoreForCoordinates || !extractedCoordinates) {
        alert('店舗が選択されていないか、座標が抽出されていません');
        return;
    }
    
    const { lat, lng } = extractedCoordinates;
    const store = selectedStoreForCoordinates;
    
    console.log(`座標保存中: ${store.name} → (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
    
    try {
        const updateData = {
            latitude: lat.toString(),
            longitude: lng.toString()
        };
        
        const { data, error } = await supabase
            .from('stores')
            .update(updateData)
            .eq('id', store.id)
            .select();
        
        if (error) throw error;
        
        alert(`✅ ${store.name}の座標を更新しました！`);
        console.log(`座標更新成功: ${store.name}`);
        
        // ローカルデータも更新
        const storeIndex = storesData.findIndex(s => s.id === store.id);
        if (storeIndex !== -1) {
            storesData[storeIndex].latitude = lat.toString();
            storesData[storeIndex].longitude = lng.toString();
        }
        
        // マーカーを再描画
        displayStores(storesData);
        
        // 管理者状態をリセット
        resetAdminState();
        
    } catch (error) {
        alert(`❌ エラー: ${error.message}`);
        console.error('座標更新エラー:', error);
    }
}

// 管理者状態をリセット
function resetAdminState() {
    selectedStoreForCoordinates = null;
    extractedCoordinates = null;
    document.getElementById('googleMapUrlInput').value = '';
    document.getElementById('targetStore').textContent = '';
    resetExtractedCoordinatesDisplay();
}

// 既存のdisplayStores関数を更新（管理者モード対応）
const originalDisplayStores = displayStores;
displayStores = function(stores) {
    originalDisplayStores(stores);
    if (adminMode) {
        enableStoreSelection();
    }
};

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', initApp);