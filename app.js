// グルテンフリーマップ v2 - メインアプリケーション
// import { getSupabaseClient } from './supabase-client.js';

// グローバル変数
let map;
let markers = [];
let storesData = [];

// Supabaseクライアント（直接設定）
const SUPABASE_URL = 'https://lywfaolwvkewuouvkzlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5d2Zhb2x3dmtld3VvdXZremxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MDg2NjcsImV4cCI6MjA2OTk4NDY2N30.wBGCHOLbP6ew7Bnvxrq0sKSm1EnHk5NNE1sWWH7ff60';

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
    console.log('🚀 グルテンフリーマップ v2 初期化開始');
    
    try {
        // Supabaseクライアント初期化
        if (window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabaseクライアント初期化完了');
        } else {
            throw new Error('Supabaseライブラリが読み込まれていません');
        }
        
        // 地図を初期化
        initMap();
        
        // 店舗データを読み込み
        await loadStores();
        
        // 統計を更新
        updateStats();
        
        console.log('✅ アプリケーション初期化完了');
        
    } catch (error) {
        console.error('❌ 初期化エラー:', error);
        showError('アプリケーションの初期化に失敗しました: ' + error.message);
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
            throw error;
        }
        
        storesData = stores || [];
        console.log(`📊 ${storesData.length}件の店舗データを取得`);
        
        // デバッグ: 最初の店舗データ構造を確認
        if (storesData.length > 0) {
            console.log('🔍 店舗データサンプル:', storesData[0]);
            console.log('🔍 利用可能なフィールド:', Object.keys(storesData[0]));
        }
        
        // マーカーを表示
        displayStores(storesData);
        
    } catch (error) {
        console.error('❌ 店舗データ取得エラー:', error);
        throw new Error('店舗データの取得に失敗しました');
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
                    <div class="marker-pin category-${category}" style="background-color: ${style.color};">
                        <i class="fas ${style.icon}"></i>
                    </div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            })
        });
        
        // クリックイベント
        marker.on('click', () => {
            showStorePopup(store);
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

// 店舗ポップアップ表示
function showStorePopup(store) {
    const category = store.category || 'その他';
    const style = categoryStyles[category] || categoryStyles['その他'];
    
    const popupContent = `
        <div style="padding: 10px; min-width: 200px;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <i class="fas ${style.icon}" style="color: ${style.color}; margin-right: 8px;"></i>
                <h3 style="margin: 0; color: #333;">${store.name}</h3>
            </div>
            
            <div style="margin-bottom: 8px;">
                <i class="fas fa-map-marker-alt" style="color: #666; margin-right: 8px;"></i>
                <span style="color: #666; font-size: 14px;">${store.address}</span>
            </div>
            
            <div style="margin-bottom: 10px;">
                <span style="background: ${style.color}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px;">
                    ${category}
                </span>
            </div>
            
            ${store.description ? `
                <div style="color: #666; font-size: 14px; margin-top: 8px;">
                    ${store.description}
                </div>
            ` : ''}
        </div>
    `;
    
    L.popup()
        .setLatLng([store.latitude, store.longitude])
        .setContent(popupContent)
        .openOn(map);
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
    const loadingStatusElement = document.getElementById('loadingStatus');
    
    if (totalStoresElement) {
        totalStoresElement.textContent = storesData.length;
    }
    
    if (loadingStatusElement) {
        loadingStatusElement.textContent = '読み込み完了';
    }
    
    // カテゴリー別統計（将来の拡張用）
    const categoryStats = {};
    storesData.forEach(store => {
        const category = store.category || 'その他';
        categoryStats[category] = (categoryStats[category] || 0) + 1;
    });
    
    console.log('📊 カテゴリー別統計:', categoryStats);
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

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', initApp);