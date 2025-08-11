// グローバル変数
let map;
let markers = [];
let storesData = [];
let currentFilter = 'all';
let currentVisitStatus = 'all';
let userLocation = null;

// カテゴリー別の色とアイコン
const categoryStyles = {
    '和食': { color: '#ff6b6b', icon: 'fa-utensils' },
    '洋食': { color: '#4ecdc4', icon: 'fa-pizza-slice' },
    'カフェ': { color: '#f7b731', icon: 'fa-coffee' },
    'パン屋': { color: '#5f27cd', icon: 'fa-bread-slice' },
    '販売店': { color: '#00d2d3', icon: 'fa-gift' },
    'スイーツ': { color: '#ff69b4', icon: 'fa-ice-cream' }
};

// 初期化
document.addEventListener('DOMContentLoaded', async function() {
    // URLパラメータをチェック
    const urlParams = new URLSearchParams(window.location.search);
    const targetStoreId = urlParams.get('store');
    console.log('🎯 対象店舗ID:', targetStoreId);
    // 現在地取得を最初に試みる
    await initMapWithUserLocation();
    await loadStores();
    setupEventListeners();
    
    // 対象店舗がある場合はその店舗を強調表示
    if (targetStoreId) {
        setTimeout(() => {
            focusOnStore(parseInt(targetStoreId));
        }, 1000); // マップとマーカーの初期化を待つ
    }
});

// 地図の初期化（デフォルト座標）
function initMap(centerLat = 35.1815, centerLng = 136.9066, zoom = 12) {
    map = L.map('map').setView([centerLat, centerLng], zoom);
    
    // OpenStreetMapタイルを追加（パステル調のスタイル）
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        opacity: 0.9
    }).addTo(map);
}

// 現在地を取得してから地図を初期化
async function initMapWithUserLocation() {
    return new Promise((resolve) => {
        if (navigator.geolocation) {
            // タイムアウトを設定（3秒以内に位置情報を取得）
            const timeoutId = setTimeout(() => {
                console.log('現在地取得タイムアウト。デフォルト位置で初期化');
                initMap();
                resolve();
            }, 3000);
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeoutId);
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    console.log('現在地を取得:', userLocation);
                    
                    // 現在地を中心に地図を初期化
                    initMap(userLocation.lat, userLocation.lng, 13);
                    
                    // 現在地マーカーを追加
                    L.marker([userLocation.lat, userLocation.lng], {
                        icon: L.divIcon({
                            html: '<div class="user-location-marker"><i class="fas fa-user"></i></div>',
                            className: 'user-location-icon',
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        })
                    }).addTo(map).bindPopup('現在地');
                    
                    resolve();
                },
                (error) => {
                    clearTimeout(timeoutId);
                    console.log('現在地取得エラー:', error.message);
                    // エラーの場合はデフォルト位置で初期化
                    initMap();
                    resolve();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 3000,
                    maximumAge: 0
                }
            );
        } else {
            console.log('Geolocation APIが利用できません');
            initMap();
            resolve();
        }
    });
}

// 店舗データの読み込み
async function loadStores() {
    try {
        console.log('店舗データを読み込み中...');
        // 強力なキャッシュバスティング
        const timestamp = new Date().getTime();
        const randomId = Math.random().toString(36).substring(7);
        const response = await fetch(`stores.json?v=${timestamp}&r=${randomId}`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('読み込んだデータ:', data);
        console.log('JSONファイルのstores配列:', data.stores);
        
        if (!data.stores || !Array.isArray(data.stores)) {
            throw new Error('stores配列が見つかりません');
        }
        
        storesData = data.stores;
        console.log('店舗数:', storesData.length);
        console.log('店舗リスト:', storesData.map(s => s.name));
        
        if (storesData.length === 0) {
            console.warn('店舗データが空です');
            return;
        }
        
        if (storesData.length < 6) {
            console.warn(`期待される店舗数は6件ですが、${storesData.length}件しか読み込めませんでした`);
            console.warn('GitHub Pagesのキャッシュが古い可能性があります。5-10分後に再度お試しください。');
        }
        
        displayStores(storesData);
        updateStoreList(storesData);
        updateSearchResults(storesData.length, '');
        console.log('店舗データの読み込み完了');
    } catch (error) {
        console.error('店舗データの読み込みに失敗しました:', error);
        console.error('エラー詳細:', error.message);
    }
}

// カスタムアイコンの作成
function createCustomIcon(category) {
    const style = categoryStyles[category] || { color: '#666', icon: 'fa-store' };
    
    return L.divIcon({
        html: `<div class="custom-marker" style="background-color: ${style.color}">
                <i class="fas ${style.icon}"></i>
               </div>`,
        className: 'custom-div-icon',
        iconSize: [35, 35],
        iconAnchor: [17.5, 35],
        popupAnchor: [0, -35]
    });
}

// 地図上に店舗を表示
function displayStores(stores) {
    // 既存のマーカーをクリア
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    stores.forEach(store => {
        // 座標がある店舗のみ地図に表示
        if (store.lat && store.lng) {
            const marker = L.marker([store.lat, store.lng], {
                icon: createCustomIcon(store.category)
            });
            
            // ポップアップの内容
            const popupContent = `
                <div class="popup-content">
                    <h4>${store.name}</h4>
                    <span class="store-category category-${store.category}">${store.category}</span>
                    <p>${store.address}</p>
                    <button class="popup-detail-btn" onclick="showStoreDetail(${store.id})">
                        詳細を見る
                    </button>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            marker.addTo(map);
            markers.push(marker);
        }
    });
}

// 店舗リストの更新
function updateStoreList(stores) {
    const listContent = document.getElementById('storeListContent');
    listContent.innerHTML = '';
    
    // 現在地がある場合は距離でソート
    let sortedStores = [...stores];
    if (userLocation) {
        sortedStores = sortedStores
            .map(store => ({
                ...store,
                distance: store.lat && store.lng ? calculateDistance(userLocation.lat, userLocation.lng, store.lat, store.lng) : Infinity
            }))
            .sort((a, b) => a.distance - b.distance);
    }
    
    sortedStores.forEach(store => {
        const card = document.createElement('div');
        card.className = 'store-card';
        card.innerHTML = `
            <div class="store-card-image">
                <img src="${store.imageUrl || ''}" alt="${store.name}" class="clickable-image" data-image-url="${store.imageUrl || ''}" data-alt-text="${store.name}" onclick="event.stopPropagation();" onerror="this.style.display='none'">
            </div>
            <div class="store-card-content">
                <h4>${store.name} ${getVisitStatusBadge(store)}</h4>
                <span class="store-category category-${store.category}">${store.category}</span>
                <div class="store-info">
                    <i class="fas fa-map-marker-alt"></i> ${store.address}
                </div>
                <div class="store-info">
                    <i class="fas fa-clock"></i> ${store.hours}
                </div>
                ${userLocation && store.distance !== Infinity ? `
                <div class="store-info store-distance">
                    <i class="fas fa-route"></i> ${formatDistance(store.distance)}
                </div>
                ` : ''}
            </div>
        `;
        card.onclick = () => {
            showStoreDetail(store.id);
            // 座標がある場合のみ地図をズーム
            if (store.lat && store.lng) {
                map.setView([store.lat, store.lng], 16);
            }
        };
        listContent.appendChild(card);
    });
}

// 店舗詳細表示
function showStoreDetail(storeId) {
    const store = storesData.find(s => s.id === storeId);
    if (!store) return;
    
    // Google Analytics イベント送信
    if (typeof gtag !== 'undefined') {
        gtag('event', 'view_store_detail', {
            'store_id': store.id,
            'store_name': store.name,
            'store_category': store.category,
            'visit_status': store.visitStatus || 'unvisited'
        });
    }
    
    const modal = document.getElementById('storeModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <div class="modal-header">
            ${store.imageUrl ? `<div class="modal-image">
                <img src="${store.imageUrl}" alt="${store.name}" class="clickable-image" data-image-url="${store.imageUrl}" data-alt-text="${store.name}" onerror="this.parentElement.style.display='none'">
            </div>` : ''}
            <div class="modal-title-section">
                <h2>${store.name}</h2>
                ${store.visitedByNaco ? '<span class="naco-visited-badge" title="nacoさん訪問済み"><img src="naco-visited-icon.png" alt="naco訪問済み" class="naco-visited-icon"><span class="naco-visited-text">naco訪問済み</span></span>' : ''}
            </div>
            <span class="store-category category-${store.category}">${store.category}</span>
        </div>
        
        ${(store.imageUrl2 || store.imageUrl3) ? `<div class="modal-additional-images">
            ${store.imageUrl2 ? `<div class="modal-image">
                <img src="${store.imageUrl2}" alt="${store.name} - 画像2" class="clickable-image" data-image-url="${store.imageUrl2}" data-alt-text="${store.name} - 画像2" onerror="this.parentElement.style.display='none'">
            </div>` : ''}
            ${store.imageUrl3 ? `<div class="modal-image">
                <img src="${store.imageUrl3}" alt="${store.name} - 画像3" class="clickable-image" data-image-url="${store.imageUrl3}" data-alt-text="${store.name} - 画像3" onerror="this.parentElement.style.display='none'">
            </div>` : ''}
        </div>` : ''}
        
        <div class="modal-info">
            <div class="modal-info-item">
                <i class="fas fa-map-marker-alt"></i>
                <span>${store.address}</span>
            </div>
            
            <div class="modal-info-item">
                <i class="fas fa-clock"></i>
                <span>${store.hours}</span>
            </div>
            
            <div class="modal-info-item">
                <i class="fas fa-calendar-times"></i>
                <span>定休日: ${store.closed}</span>
            </div>
            
            ${store.tel ? `
            <div class="modal-info-item">
                <i class="fas fa-phone"></i>
                <a href="tel:${store.tel}" class="phone-link">${store.tel}</a>
            </div>
            ` : ''}
            
            ${store.seats > 0 ? `
            <div class="modal-info-item">
                <i class="fas fa-chair"></i>
                <span>席数: ${store.seats}席</span>
            </div>
            ` : ''}
            
            ${store.takeout ? `
            <div class="modal-info-item">
                <i class="fas fa-shopping-bag"></i>
                <span>テイクアウト可</span>
            </div>
            ` : ''}
            
            <div class="modal-info-item">
                <i class="fas fa-info-circle"></i>
                <span>${store.description}</span>
            </div>
            
            <div class="gf-badge ${store.glutenFreeType === '完全GF' ? 'complete' : 'partial'}">
                ${store.glutenFreeType}
            </div>
        </div>
        
        ${store.nacoComment ? `
        <div class="naco-comment">
            <div class="naco-comment-header">
                <img src="03-A_0.png" alt="nacoキャラクター" class="naco-character-small">
                <h3>nacoのおすすめポイント</h3>
            </div>
            <div class="naco-comment-content">
                <p>${store.nacoComment}</p>
            </div>
        </div>
        ` : ''}
        
        <div class="store-links">
            ${store.website ? `
            <a href="${store.website}" 
               target="_blank" 
               class="map-link">
                <i class="fas fa-globe"></i> 公式ウェブサイト
            </a>
            ` : ''}
            
            ${store.instagram ? `
            <a href="${store.instagram}" 
               target="_blank" 
               class="map-link"
               onclick="openInstagram('${store.instagram}'); return false;">
                <i class="fab fa-instagram"></i> Instagram
            </a>
            ` : ''}
            
            <a href="${store.googleMapsUrl || `https://www.google.com/maps?q=${store.lat},${store.lng}`}" 
               target="_blank" 
               class="map-link">
                <i class="fas fa-map"></i> Google マップで開く
            </a>
        </div>
        
        ${store.lat && store.lng ? `
        <div class="route-section">
            <h4><i class="fas fa-route"></i> ルート案内</h4>
            <div class="route-buttons">
                <button class="route-btn" onclick="openGoogleMapsRoute(${store.lat}, ${store.lng}, 'walking', '${store.name.replace(/'/g, "\\'")}')">
                    <i class="fas fa-walking"></i>
                    <span>徒歩</span>
                </button>
                <button class="route-btn" onclick="openGoogleMapsRoute(${store.lat}, ${store.lng}, 'driving', '${store.name.replace(/'/g, "\\'")}')">
                    <i class="fas fa-car"></i>
                    <span>車</span>
                </button>
                <button class="route-btn" onclick="openGoogleMapsRoute(${store.lat}, ${store.lng}, 'transit', '${store.name.replace(/'/g, "\\'")}')">
                    <i class="fas fa-train"></i>
                    <span>公共交通</span>
                </button>
                <button class="route-btn" onclick="openGoogleMapsRoute(${store.lat}, ${store.lng}, 'bicycling', '${store.name.replace(/'/g, "\\'")}')">
                    <i class="fas fa-bicycle"></i>
                    <span>自転車</span>
                </button>
            </div>
        </div>
        ` : ''}
    `;
    
    modal.style.display = 'block';
}

// 特定の店舗にフォーカスする関数
function focusOnStore(storeId) {
    console.log('🎯 店舗フォーカス:', storeId);
    
    // 対象店舗を検索
    const targetStore = storesData.find(store => store.id === storeId);
    if (!targetStore) {
        console.error('❌ 店舗が見つかりません:', storeId);
        return;
    }
    
    console.log('✅ 対象店舗:', targetStore.name);
    
    // マップを対象店舗の位置に移動
    map.setView([targetStore.lat, targetStore.lng], 16);
    
    // 対象店舗のマーカーを検索してポップアップを開く
    const targetMarker = markers.find(marker => 
        marker.options.storeData && marker.options.storeData.id === storeId
    );
    
    if (targetMarker) {
        console.log('🗺️ ポップアップを開きます');
        // 少し遅延してポップアップを開く
        setTimeout(() => {
            targetMarker.openPopup();
        }, 500);
    }
}

// イベントリスナーの設定
function setupEventListeners() {
    // カテゴリーフィルター
    document.querySelectorAll('.category-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-filters .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentFilter = this.dataset.category;
            filterStores();
        });
    });
    
    // 訪問ステータスフィルター（店舗リスト内）
    document.querySelectorAll('.visit-status-filters-inline .filter-btn-small').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.visit-status-filters-inline .filter-btn-small').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentVisitStatus = this.dataset.visitStatus;
            filterStores();
        });
    });
    
    // 画像クリックイベントをdocumentに委譲
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('clickable-image')) {
            e.preventDefault();
            e.stopPropagation();
            const imageUrl = e.target.dataset.imageUrl;
            const altText = e.target.dataset.altText;
            if (imageUrl) {
                openImageLightbox(imageUrl, altText);
            }
        }
    });
    
    // 検索機能
    document.getElementById('searchInput').addEventListener('input', function(e) {
        filterStores();
    });
    
    // モーダルを閉じる
    document.getElementById('closeModal').addEventListener('click', function() {
        document.getElementById('storeModal').style.display = 'none';
    });
    
    // モーダル外をクリックで閉じる
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('storeModal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // モバイル用リストトグル
    document.getElementById('mobileListToggle').addEventListener('click', function() {
        const storeList = document.querySelector('.store-list');
        storeList.classList.toggle('show');
        
        const icon = this.querySelector('i');
        const text = this.querySelector('i').nextSibling;
        
        if (storeList.classList.contains('show')) {
            icon.className = 'fas fa-times';
            text.textContent = ' 閉じる';
        } else {
            icon.className = 'fas fa-list';
            text.textContent = ' リストを表示';
        }
    });
}

// エリア検索用のキーワードマッピング
const areaKeywords = {
    // 東京エリア
    '渋谷': ['渋谷区', '神宮前', '表参道', '原宿'],
    '吉祥寺': ['武蔵野市', '吉祥寺'],
    '新宿': ['新宿区'],
    '池袋': ['豊島区'],
    '銀座': ['中央区', '銀座'],
    '浅草': ['台東区', '浅草'],
    
    // 名古屋エリア
    '名古屋駅': ['名古屋市中村区', '名駅', 'ゲートタワー', 'ゲートウォーク'],
    '大須': ['大須'],
    '栄': ['中区栄', '錦'],
    '千種': ['千種区'],
    '中区': ['名古屋市中区'],
    '西区': ['名古屋市西区', '浄心'],
    '昭和区': ['名古屋市昭和区', '御器所'],
    '名東区': ['名古屋市名東区'],
    '中川区': ['名古屋市中川区', '荒子']
};

// エリア検索の判定
function matchesAreaSearch(store, searchTerm) {
    // areaKeywordsが定義されているか確認
    if (typeof areaKeywords === 'undefined') {
        console.warn('areaKeywords is not defined');
        return false;
    }
    
    const address = store.address.toLowerCase();
    const name = store.name.toLowerCase();
    
    // 直接的な住所マッチ
    if (address.includes(searchTerm) || name.includes(searchTerm)) {
        return true;
    }
    
    // エリアキーワードでのマッチ
    for (const [area, keywords] of Object.entries(areaKeywords)) {
        if (area.toLowerCase().includes(searchTerm) || searchTerm.includes(area.toLowerCase())) {
            return keywords.some(keyword => address.includes(keyword.toLowerCase()));
        }
    }
    
    return false;
}

// フィルタリング機能
function filterStores() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filteredStores = storesData;
    
    // カテゴリーフィルター
    if (currentFilter !== 'all') {
        filteredStores = filteredStores.filter(store => store.category === currentFilter);
    }
    
    // 訪問ステータスフィルター
    if (currentVisitStatus !== 'all') {
        filteredStores = filteredStores.filter(store => store.visitStatus === currentVisitStatus);
    }
    
    // 検索フィルター（エリア検索を含む）
    if (searchTerm) {
        filteredStores = filteredStores.filter(store => 
            store.name.toLowerCase().includes(searchTerm) ||
            store.description.toLowerCase().includes(searchTerm) ||
            store.glutenFreeType.toLowerCase().includes(searchTerm) ||
            matchesAreaSearch(store, searchTerm)
        );
        
        // エリア検索の場合、地図をそのエリアに移動
        zoomToArea(searchTerm, filteredStores);
    } else {
        // 検索がクリアされた場合、全店舗を表示
        if (storesData.length > 0) {
            const storesWithCoords = storesData.filter(store => store.lat && store.lng);
            if (storesWithCoords.length > 0) {
                const bounds = L.latLngBounds(
                    storesWithCoords.map(store => [store.lat, store.lng])
                );
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
            }
        }
    }
    
    displayStores(filteredStores);
    updateStoreList(filteredStores);
    updateSearchResults(filteredStores.length, searchTerm);
}

// エリア検索時に地図を移動する関数
function zoomToArea(searchTerm, filteredStores) {
    console.log('zoomToArea called with:', searchTerm);
    
    // エリアの中心座標を定義（全国主要都市）
    const areaCenters = {
        // === 北海道・東北 ===
        // 北海道
        '札幌': { lat: 43.0642, lng: 141.3469, zoom: 12 },
        '札幌駅': { lat: 43.0686, lng: 141.3508, zoom: 14 },
        'すすきの': { lat: 43.0556, lng: 141.3527, zoom: 14 },
        '函館': { lat: 41.7688, lng: 140.7290, zoom: 13 },
        '旭川': { lat: 43.7708, lng: 142.3650, zoom: 13 },
        '小樽': { lat: 43.1907, lng: 140.9947, zoom: 13 },
        
        // 青森県
        '青森': { lat: 40.8244, lng: 140.7400, zoom: 13 },
        '弘前': { lat: 40.6031, lng: 140.4636, zoom: 13 },
        
        // 岩手県
        '盛岡': { lat: 39.7036, lng: 141.1527, zoom: 13 },
        
        // 宮城県
        '仙台': { lat: 38.2682, lng: 140.8694, zoom: 12 },
        '仙台駅': { lat: 38.2602, lng: 140.8826, zoom: 14 },
        
        // 秋田県
        '秋田': { lat: 39.7186, lng: 140.1025, zoom: 13 },
        
        // 山形県
        '山形': { lat: 38.2405, lng: 140.3636, zoom: 13 },
        
        // 福島県
        '福島': { lat: 37.7500, lng: 140.4678, zoom: 13 },
        '郡山': { lat: 37.4005, lng: 140.3594, zoom: 13 },
        
        // === 関東 ===
        // 東京都
        '東京': { lat: 35.6762, lng: 139.6503, zoom: 11 },
        '新宿': { lat: 35.6938, lng: 139.7034, zoom: 14 },
        '渋谷': { lat: 35.6580, lng: 139.7016, zoom: 14 },
        '池袋': { lat: 35.7295, lng: 139.7109, zoom: 14 },
        '上野': { lat: 35.7141, lng: 139.7774, zoom: 14 },
        '浅草': { lat: 35.7118, lng: 139.7966, zoom: 14 },
        '銀座': { lat: 35.6717, lng: 139.7650, zoom: 14 },
        '東京駅': { lat: 35.6812, lng: 139.7671, zoom: 14 },
        '品川': { lat: 35.6284, lng: 139.7387, zoom: 14 },
        '原宿': { lat: 35.6721, lng: 139.7038, zoom: 14 },
        '表参道': { lat: 35.6652, lng: 139.7123, zoom: 14 },
        '六本木': { lat: 35.6628, lng: 139.7315, zoom: 14 },
        'お台場': { lat: 35.6298, lng: 139.7755, zoom: 14 },
        '吉祥寺': { lat: 35.7023, lng: 139.5803, zoom: 14 },
        '立川': { lat: 35.6978, lng: 139.4135, zoom: 14 },
        '八王子': { lat: 35.6556, lng: 139.3389, zoom: 13 },
        
        // 神奈川県
        '横浜': { lat: 35.4437, lng: 139.6380, zoom: 12 },
        '横浜駅': { lat: 35.4658, lng: 139.6223, zoom: 14 },
        'みなとみらい': { lat: 35.4572, lng: 139.6363, zoom: 14 },
        '関内': { lat: 35.4444, lng: 139.6389, zoom: 14 },
        '川崎': { lat: 35.5308, lng: 139.7029, zoom: 13 },
        '鎌倉': { lat: 35.3192, lng: 139.5466, zoom: 13 },
        '藤沢': { lat: 35.3387, lng: 139.4900, zoom: 13 },
        '小田原': { lat: 35.2556, lng: 139.1539, zoom: 13 },
        
        // 埼玉県
        'さいたま': { lat: 35.8617, lng: 139.6455, zoom: 12 },
        '大宮': { lat: 35.9063, lng: 139.6238, zoom: 14 },
        '浦和': { lat: 35.8617, lng: 139.6570, zoom: 14 },
        '川越': { lat: 35.9251, lng: 139.4859, zoom: 13 },
        
        // 千葉県
        '千葉': { lat: 35.6074, lng: 140.1065, zoom: 13 },
        '船橋': { lat: 35.6947, lng: 139.9826, zoom: 13 },
        '柏': { lat: 35.8676, lng: 139.9758, zoom: 13 },
        '成田': { lat: 35.7764, lng: 140.3184, zoom: 13 },
        
        // 茨城県
        '水戸': { lat: 36.3659, lng: 140.4711, zoom: 13 },
        'つくば': { lat: 36.0834, lng: 140.1133, zoom: 13 },
        
        // 栃木県
        '宇都宮': { lat: 36.5596, lng: 139.8821, zoom: 13 },
        '日光': { lat: 36.7199, lng: 139.6985, zoom: 13 },
        
        // 群馬県
        '前橋': { lat: 36.3895, lng: 139.0634, zoom: 13 },
        '高崎': { lat: 36.3228, lng: 139.0032, zoom: 13 },
        
        // === 中部 ===
        // 新潟県
        '新潟': { lat: 37.9026, lng: 139.0236, zoom: 12 },
        '新潟駅': { lat: 37.9122, lng: 139.0621, zoom: 14 },
        
        // 富山県
        '富山': { lat: 36.6953, lng: 137.2113, zoom: 13 },
        
        // 石川県
        '金沢': { lat: 36.5611, lng: 136.6564, zoom: 13 },
        '金沢駅': { lat: 36.5780, lng: 136.6475, zoom: 14 },
        
        // 福井県
        '福井': { lat: 36.0652, lng: 136.2218, zoom: 13 },
        
        // 山梨県
        '甲府': { lat: 35.6635, lng: 138.5685, zoom: 13 },
        
        // 長野県
        '長野': { lat: 36.6513, lng: 138.1810, zoom: 13 },
        '松本': { lat: 36.2381, lng: 137.9720, zoom: 13 },
        '軽井沢': { lat: 36.3481, lng: 138.5970, zoom: 13 },
        
        // 岐阜県
        '岐阜': { lat: 35.3912, lng: 136.7223, zoom: 13 },
        '高山': { lat: 36.1461, lng: 137.2521, zoom: 13 },
        
        // 静岡県
        '静岡': { lat: 34.9769, lng: 138.3831, zoom: 13 },
        '浜松': { lat: 34.7108, lng: 137.7261, zoom: 13 },
        '熱海': { lat: 35.0959, lng: 139.0717, zoom: 13 },
        
        // 愛知県
        '名古屋': { lat: 35.1815, lng: 136.9066, zoom: 12 },
        '名古屋駅': { lat: 35.1709, lng: 136.8815, zoom: 14 },
        '名駅': { lat: 35.1709, lng: 136.8815, zoom: 14 },
        '栄': { lat: 35.1698, lng: 136.9095, zoom: 14 },
        '大須': { lat: 35.1599, lng: 136.9004, zoom: 14 },
        '金山': { lat: 35.1430, lng: 136.9006, zoom: 14 },
        '豊橋': { lat: 34.7692, lng: 137.3914, zoom: 13 },
        
        // === 近畿 ===
        // 三重県
        '津': { lat: 34.7303, lng: 136.5086, zoom: 13 },
        '四日市': { lat: 34.9652, lng: 136.6245, zoom: 13 },
        '伊勢': { lat: 34.4873, lng: 136.7097, zoom: 13 },
        
        // 滋賀県
        '大津': { lat: 35.0045, lng: 135.8686, zoom: 13 },
        
        // 京都府
        '京都': { lat: 35.0116, lng: 135.7681, zoom: 12 },
        '京都駅': { lat: 34.9859, lng: 135.7587, zoom: 14 },
        '祇園': { lat: 35.0037, lng: 135.7751, zoom: 14 },
        '河原町': { lat: 35.0035, lng: 135.7686, zoom: 14 },
        '嵐山': { lat: 35.0094, lng: 135.6667, zoom: 14 },
        
        // 大阪府
        '大阪': { lat: 34.6937, lng: 135.5023, zoom: 12 },
        '梅田': { lat: 34.7025, lng: 135.4959, zoom: 14 },
        'なんば': { lat: 34.6627, lng: 135.5024, zoom: 14 },
        '難波': { lat: 34.6627, lng: 135.5024, zoom: 14 },
        '心斎橋': { lat: 34.6716, lng: 135.5019, zoom: 14 },
        '天王寺': { lat: 34.6466, lng: 135.5139, zoom: 14 },
        '新大阪': { lat: 34.7338, lng: 135.5002, zoom: 14 },
        
        // 兵庫県
        '神戸': { lat: 34.6901, lng: 135.1955, zoom: 12 },
        '三宮': { lat: 34.6948, lng: 135.1980, zoom: 14 },
        '元町': { lat: 34.6870, lng: 135.1890, zoom: 14 },
        '姫路': { lat: 34.8352, lng: 134.6939, zoom: 13 },
        
        // 奈良県
        '奈良': { lat: 34.6851, lng: 135.8048, zoom: 13 },
        
        // 和歌山県
        '和歌山': { lat: 34.2305, lng: 135.1708, zoom: 13 },
        
        // === 中国・四国 ===
        // 鳥取県
        '鳥取': { lat: 35.5036, lng: 134.2383, zoom: 13 },
        
        // 島根県
        '松江': { lat: 35.4723, lng: 133.0505, zoom: 13 },
        '出雲': { lat: 35.3668, lng: 132.7545, zoom: 13 },
        
        // 岡山県
        '岡山': { lat: 34.6555, lng: 133.9195, zoom: 13 },
        '倉敷': { lat: 34.6019, lng: 133.7720, zoom: 13 },
        
        // 広島県
        '広島': { lat: 34.3853, lng: 132.4553, zoom: 12 },
        '広島駅': { lat: 34.3978, lng: 132.4752, zoom: 14 },
        '福山': { lat: 34.4878, lng: 133.3629, zoom: 13 },
        
        // 山口県
        '山口': { lat: 34.1786, lng: 131.4737, zoom: 13 },
        '下関': { lat: 33.9578, lng: 130.9408, zoom: 13 },
        
        // 徳島県
        '徳島': { lat: 34.0658, lng: 134.5594, zoom: 13 },
        
        // 香川県
        '高松': { lat: 34.3428, lng: 134.0467, zoom: 13 },
        
        // 愛媛県
        '松山': { lat: 33.8392, lng: 132.7658, zoom: 13 },
        
        // 高知県
        '高知': { lat: 33.5597, lng: 133.5311, zoom: 13 },
        
        // === 九州・沖縄 ===
        // 福岡県
        '福岡': { lat: 33.5904, lng: 130.4017, zoom: 12 },
        '博多': { lat: 33.5904, lng: 130.4206, zoom: 14 },
        '天神': { lat: 33.5902, lng: 130.3989, zoom: 14 },
        '北九州': { lat: 33.8835, lng: 130.8752, zoom: 12 },
        '小倉': { lat: 33.8835, lng: 130.8836, zoom: 14 },
        
        // 佐賀県
        '佐賀': { lat: 33.2494, lng: 130.2988, zoom: 13 },
        
        // 長崎県
        '長崎': { lat: 32.7503, lng: 129.8779, zoom: 13 },
        
        // 熊本県
        '熊本': { lat: 32.8032, lng: 130.7079, zoom: 13 },
        
        // 大分県
        '大分': { lat: 33.2382, lng: 131.6126, zoom: 13 },
        '別府': { lat: 33.2846, lng: 131.4912, zoom: 13 },
        
        // 宮崎県
        '宮崎': { lat: 31.9111, lng: 131.4239, zoom: 13 },
        
        // 鹿児島県
        '鹿児島': { lat: 31.5966, lng: 130.5571, zoom: 13 },
        
        // 沖縄県
        '那覇': { lat: 26.2124, lng: 127.6792, zoom: 13 },
        '国際通り': { lat: 26.2146, lng: 127.6876, zoom: 14 }
    };
    
    // エリア名にマッチする座標があるか確認
    for (const [area, coords] of Object.entries(areaCenters)) {
        if (searchTerm.includes(area.toLowerCase())) {
            console.log('Moving map to:', area, coords);
            // アニメーション付きで地図を移動
            try {
                if (map && typeof map.flyTo === 'function') {
                    map.flyTo([coords.lat, coords.lng], coords.zoom, {
                        duration: 1.5,
                        easeLinearity: 0.5
                    });
                } else {
                    console.warn('Map is not ready or flyTo is not available');
                }
            } catch (error) {
                console.error('Error moving map:', error);
            }
            return;
        }
    }
    
    // エリア座標が見つからない場合、検索結果の店舗を全て表示できるようにズーム
    if (filteredStores.length > 0) {
        const storesWithCoords = filteredStores.filter(store => store.lat && store.lng);
        if (storesWithCoords.length > 0) {
            const bounds = L.latLngBounds(
                storesWithCoords.map(store => [store.lat, store.lng])
            );
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }
}

// 検索結果表示の更新
function updateSearchResults(count, searchTerm) {
    let resultElement = document.getElementById('searchResults');
    if (!resultElement) {
        resultElement = document.createElement('div');
        resultElement.id = 'searchResults';
        resultElement.className = 'search-results';
        
        const storeList = document.querySelector('.store-list');
        const storeListH3 = storeList.querySelector('h3');
        storeListH3.parentNode.insertBefore(resultElement, storeListH3.nextSibling);
    }
    
    if (searchTerm && searchTerm.trim()) {
        if (count === 0) {
            resultElement.innerHTML = `<p class="no-results">「${searchTerm}」の検索結果: 該当する店舗が見つかりません</p>`;
        } else {
            resultElement.innerHTML = `<p class="search-count">「${searchTerm}」の検索結果: ${count}件の店舗</p>`;
        }
        resultElement.style.display = 'block';
    } else {
        resultElement.innerHTML = `<p class="total-count">全${count}件の店舗</p>`;
        resultElement.style.display = 'block';
    }
}

// Instagram アプリで開く関数
function openInstagram(url) {
    // Instagram URLからユーザー名を抽出
    const username = extractInstagramUsername(url);
    
    if (username) {
        // まずInstagramアプリのdeep linkを試す
        const appLink = `instagram://user?username=${username}`;
        
        // iOSの場合
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            window.location = appLink;
            // アプリが開かなかった場合のフォールバック
            setTimeout(() => {
                window.open(url, '_blank');
            }, 500);
        }
        // Androidの場合
        else if (/Android/.test(navigator.userAgent)) {
            const intent = `intent://instagram.com/_u/${username}/#Intent;package=com.instagram.android;scheme=https;end`;
            window.location = intent;
            // フォールバック
            setTimeout(() => {
                window.open(url, '_blank');
            }, 500);
        }
        // その他のデバイス（PC等）
        else {
            window.open(url, '_blank');
        }
    } else {
        // ユーザー名が抽出できない場合はブラウザで開く
        window.open(url, '_blank');
    }
}

// Instagram URLからユーザー名を抽出する関数
function extractInstagramUsername(url) {
    try {
        // 様々なInstagram URLパターンに対応
        const patterns = [
            /instagram\.com\/([^\/\?\#]+)/i,
            /instagram\.com\/p\/[^\/]+\/\?.*taken-by=([^&]+)/i,
            /instagram\.com\/explore\/tags\/([^\/\?\#]+)/i
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    } catch (error) {
        console.error('Instagram username extraction failed:', error);
        return null;
    }
}

// 訪問ステータスのバッジを取得
function getVisitStatusBadge(store) {
    // 未入力時は自動的に「未確認店舗」として表示
    let visitStatus = store.visitStatus;
    if (!visitStatus || visitStatus === '') {
        visitStatus = 'unvisited';
    }
    
    switch (visitStatus) {
        case 'naco':
            return '<span class="visit-status-badge naco-badge" title="naco訪問済み">🔴</span>';
        case 'member':
            return '<span class="visit-status-badge member-badge" title="メンバー訪問済み">🟡</span>';
        case 'unvisited':
            return '<span class="visit-status-badge unvisited-badge" title="未確認店舗">🤍</span>';
        default:
            return '<span class="visit-status-badge unvisited-badge" title="未確認店舗">🤍</span>';
    }
}

// 現在地を更新（初期化後の再取得用）
function requestUserLocation() {
    // 既に現在地が取得済みの場合は何もしない
    if (userLocation) {
        filterStores();
        return;
    }
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // 現在地マーカーを追加
                L.marker([userLocation.lat, userLocation.lng], {
                    icon: L.divIcon({
                        html: '<div class="user-location-marker"><i class="fas fa-user"></i></div>',
                        className: 'user-location-icon',
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    })
                }).addTo(map).bindPopup('現在地');
                
                // 店舗リストを更新（距離順にソート）
                filterStores();
            },
            (error) => {
                console.log('現在地を取得できませんでした:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }
}

// 2点間の距離を計算（km）
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // 地球の半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 距離をフォーマット
function formatDistance(distance) {
    if (distance < 1) {
        return Math.round(distance * 1000) + 'm';
    } else {
        return distance.toFixed(1) + 'km';
    }
}


// 画像圧縮機能
function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            let { width, height } = img;
            
            // アスペクト比を維持してリサイズ
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        
        if (typeof file === 'string') {
            img.src = file;
        } else {
            const reader = new FileReader();
            reader.onload = (e) => img.src = e.target.result;
            reader.readAsDataURL(file);
        }
    });
}

// 画像サイズをチェックして必要に応じて圧縮
function checkAndCompressImage(imageUrl, callback) {
    const img = new Image();
    img.onload = () => {
        const maxSize = 5 * 1024 * 1024; // 5MB制限
        
        // 大体のファイルサイズを推定（実際のファイルサイズではないが目安）
        const estimatedSize = img.width * img.height * 3; // RGB 各1バイトとして概算
        
        if (estimatedSize > maxSize || img.width > 2048 || img.height > 2048) {
            console.log('Large image detected, compressing...');
            compressImage(imageUrl, 1920, 1080, 0.7).then(blob => {
                const compressedUrl = URL.createObjectURL(blob);
                callback(compressedUrl);
            });
        } else {
            callback(imageUrl);
        }
    };
    img.onerror = () => callback(imageUrl); // エラー時は元の画像を使用
    img.src = imageUrl;
}

// 画像ライトボックスを開く
function openImageLightbox(imageUrl, altText) {
    if (!imageUrl) return;
    
    console.log('Opening lightbox for:', altText);
    console.log('Image URL:', imageUrl);
    
    // 画像をチェックして必要に応じて圧縮
    checkAndCompressImage(imageUrl, (processedImageUrl) => {
        console.log('Lightbox shown with CSS transition');
        
        // ライトボックスが既に存在する場合は削除
        const existingLightbox = document.getElementById('imageLightbox');
        if (existingLightbox) {
            existingLightbox.remove();
        }
        
        // ライトボックス要素を作成
        const lightbox = document.createElement('div');
        lightbox.id = 'imageLightbox';
        lightbox.className = 'image-lightbox';
        
        lightbox.innerHTML = `
            <div class="lightbox-backdrop" onclick="closeImageLightbox()"></div>
            <div class="lightbox-content">
                <button class="lightbox-close" onclick="closeImageLightbox()">
                    <i class="fas fa-times"></i>
                </button>
                <img src="${processedImageUrl}" alt="${altText}" class="lightbox-image">
                <div class="lightbox-caption">${altText}</div>
            </div>
        `;
        
        document.body.appendChild(lightbox);
        
        // 画像は既にHTMLで lightbox-image クラスが設定済み
        
        // フェードイン効果
        setTimeout(() => {
            lightbox.classList.add('show');
        }, 10);
        
        // Escキーで閉じる
        document.addEventListener('keydown', closeLightboxOnEscape);
    });
}

// ライトボックスを閉じる
function closeImageLightbox() {
    console.log('Lightbox close triggered');
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        console.log('Lightbox hide animation started');
        lightbox.classList.remove('show');
        setTimeout(() => {
            console.log('Lightbox removed after animation');
            lightbox.remove();
        }, 300);
    }
    
    // Escキーイベントリスナーを削除
    document.removeEventListener('keydown', closeLightboxOnEscape);
}

// Escキーでライトボックスを閉じる
function closeLightboxOnEscape(event) {
    if (event.key === 'Escape') {
        closeImageLightbox();
    }
}

// Google Mapsでルート案内を開く
function openGoogleMapsRoute(destLat, destLng, travelMode, storeName) {
    let modeParam = '';
    switch(travelMode) {
        case 'driving':
            modeParam = 'driving';
            break;
        case 'walking':
            modeParam = 'walking';
            break;
        case 'bicycling':
            modeParam = 'bicycling';
            break;
        case 'transit':
            modeParam = 'transit';
            break;
        default:
            modeParam = 'driving';
    }
    
    // 店舗情報を取得
    const store = storesData.find(s => s.name === storeName);
    
    // 店舗名をシンプルにする（括弧内の説明を除去）
    let searchQuery = storeName;
    if (storeName.includes('（')) {
        searchQuery = storeName.split('（')[0];
    }
    
    // 店舗のGoogle Maps URLがある場合は、そこからPlace IDを抽出する可能性も考慮
    if (store && store.googleMapsUrl) {
        // Google Maps URLから直接ルート案内を作成
        const placeMatch = store.googleMapsUrl.match(/place\/([^\/]+)/);
        if (placeMatch) {
            const placeName = decodeURIComponent(placeMatch[1]);
            searchQuery = placeName;
        }
    }
    
    // 検索クエリに住所を追加して精度を上げる
    const fullQuery = store && store.address ? `${searchQuery} ${store.address}` : searchQuery;
    const encodedQuery = encodeURIComponent(fullQuery);
    
    // 現在地がある場合は現在地から、ない場合は名古屋駅から
    if (userLocation) {
        const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${encodedQuery}&travelmode=${modeParam}`;
        window.open(url, '_blank');
    } else {
        // 名古屋駅を起点に
        const nagoyaStation = { lat: 35.1709, lng: 136.8815 };
        const url = `https://www.google.com/maps/dir/?api=1&origin=${nagoyaStation.lat},${nagoyaStation.lng}&destination=${encodedQuery}&travelmode=${modeParam}`;
        window.open(url, '_blank');
    }
}

// カスタムマーカーのスタイル（CSSに追加）
const markerStyles = document.createElement('style');
markerStyles.textContent = `
    .custom-div-icon {
        background: transparent;
        border: none;
    }
    
    .custom-marker {
        width: 35px;
        height: 35px;
        border-radius: 50% 50% 50% 0;
        background: #89CFF0;
        position: relative;
        transform: rotate(-45deg);
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .custom-marker:hover {
        transform: rotate(-45deg) scale(1.1);
    }
    
    .custom-marker i {
        transform: rotate(45deg);
        color: white;
        font-size: 16px;
    }
    
    /* モバイルでマーカーを小さく */
    @media (max-width: 768px) {
        .custom-marker {
            width: 30px;
            height: 30px;
        }
        
        .custom-marker i {
            font-size: 14px;
        }
    }
    
    .popup-content {
        text-align: center;
        padding: 10px;
    }
    
    .popup-content h4 {
        margin-bottom: 10px;
        color: #4a4a4a;
    }
    
    .popup-detail-btn {
        background: #98d8c8;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        margin-top: 10px;
        font-size: 14px;
        transition: all 0.3s;
    }
    
    .popup-detail-btn:hover {
        background: #ffb6c1;
        transform: translateY(-2px);
    }
    
    /* 現在地マーカー */
    .user-location-marker {
        width: 30px;
        height: 30px;
        background: #4285f4;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        border: 3px solid white;
    }
    
    .user-location-marker i {
        color: white;
        font-size: 14px;
    }
    
    /* 距離表示 */
    .store-distance {
        color: #4285f4;
        font-weight: bold;
    }
    
    
    /* 画像ライトボックス */
    .image-lightbox {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
    }
    
    .image-lightbox.show {
        opacity: 1;
        visibility: visible;
    }
    
    .lightbox-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        cursor: pointer;
    }
    
    .lightbox-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0;
    }
    
    .lightbox-close {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.6);
        border: none;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        color: white;
        font-size: 24px;
        cursor: pointer;
        transition: all 0.3s;
        z-index: 10001;
    }
    
    .lightbox-close:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
    }
    
    
    .lightbox-caption {
        color: white;
        margin-top: 15px;
        font-size: 20px;
        text-align: center;
        background: rgba(0, 0, 0, 0.8);
        padding: 15px 30px;
        border-radius: 25px;
        max-width: 85%;
        line-height: 1.4;
        position: absolute;
        bottom: 40px;
        font-weight: 500;
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
    }
    
    /* モバイル対応 */
    @media (max-width: 768px) {
        .lightbox-content {
            width: 100vw;
            height: 100vh;
            padding: 0;
        }
        
        .lightbox-close {
            top: 15px;
            right: 15px;
            width: 40px;
            height: 40px;
            font-size: 18px;
            background: rgba(0, 0, 0, 0.6);
        }
        
        
        .lightbox-caption {
            font-size: 16px;
            margin-top: 10px;
            padding: 12px 20px;
            position: absolute;
            bottom: 25px;
            font-weight: 500;
        }
    }
    
    /* PC版用の大きな画像表示 */
    @media (min-width: 1024px) {
        
        .lightbox-caption {
            font-size: 22px;
            padding: 18px 35px;
            font-weight: 500;
        }
    }
    
    
    /* 画像クリック可能な表示 */
    .modal-image img, .store-card-image img {
        cursor: pointer;
        transition: transform 0.2s;
    }
    
    .modal-image img:hover, .store-card-image img:hover {
        transform: scale(1.02);
    }
    
    /* ルート案内セクション */
    .route-section {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #eee;
    }
    
    .route-section h4 {
        color: #4a4a4a;
        font-size: 16px;
        margin-bottom: 15px;
    }
    
    .route-section h4 i {
        color: var(--primary-green);
        margin-right: 8px;
    }
    
    .route-buttons {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }
    
    .route-btn {
        background: white;
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        font-size: 14px;
        color: #4a4a4a;
    }
    
    .route-btn:hover {
        background: var(--primary-green);
        color: white;
        border-color: var(--primary-green);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .route-btn i {
        font-size: 20px;
    }
    
    @media (max-width: 768px) {
        .route-buttons {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .route-btn {
            padding: 10px;
            font-size: 13px;
        }
        
        .route-btn i {
            font-size: 18px;
        }
    }
`;
document.head.appendChild(markerStyles);