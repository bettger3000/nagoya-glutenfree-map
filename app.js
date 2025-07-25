// グローバル変数
let map;
let markers = [];
let storesData = [];
let currentFilter = 'all';
let userLocation = null;
let favorites = [];

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
    initMap();
    await loadStores();
    setupEventListeners();
    requestUserLocation();
    loadFavorites();
});

// 地図の初期化
function initMap() {
    // 名古屋市の中心座標
    map = L.map('map').setView([35.1815, 136.9066], 12);
    
    // OpenStreetMapタイルを追加（パステル調のスタイル）
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        opacity: 0.9
    }).addTo(map);
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
        updateFavoriteCount();
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
            <button class="favorite-btn ${isFavorite(store.id) ? 'active' : ''}" 
                    data-store-id="${store.id}" 
                    onclick="event.stopPropagation(); toggleFavorite(${store.id})">
                <i class="${isFavorite(store.id) ? 'fas' : 'far'} fa-heart"></i>
            </button>
            <div class="store-card-image">
                <img src="${store.imageUrl || ''}" alt="${store.name}" onerror="this.style.display='none'">
            </div>
            <div class="store-card-content">
                <h4>${store.name}</h4>
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
    
    const modal = document.getElementById('storeModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <div class="modal-header">
            ${store.imageUrl ? `<div class="modal-image">
                <img src="${store.imageUrl}" alt="${store.name}" onerror="this.parentElement.style.display='none'">
            </div>` : ''}
            <div class="modal-title-section">
                <h2>${store.name}</h2>
                <button class="favorite-btn modal-favorite ${isFavorite(store.id) ? 'active' : ''}" 
                        data-store-id="${store.id}" 
                        onclick="toggleFavorite(${store.id})">
                    <i class="${isFavorite(store.id) ? 'fas' : 'far'} fa-heart"></i>
                    <span>${isFavorite(store.id) ? 'お気に入り済み' : 'お気に入りに追加'}</span>
                </button>
            </div>
            <span class="store-category category-${store.category}">${store.category}</span>
        </div>
        
        ${(store.imageUrl2 || store.imageUrl3) ? `<div class="modal-additional-images">
            ${store.imageUrl2 ? `<div class="modal-image">
                <img src="${store.imageUrl2}" alt="${store.name} - 画像2" onerror="this.parentElement.style.display='none'">
            </div>` : ''}
            ${store.imageUrl3 ? `<div class="modal-image">
                <img src="${store.imageUrl3}" alt="${store.name} - 画像3" onerror="this.parentElement.style.display='none'">
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
                <span>${store.tel}</span>
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

// イベントリスナーの設定
function setupEventListeners() {
    // カテゴリーフィルター
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentFilter = this.dataset.category;
            filterStores();
        });
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

// フィルタリング機能
function filterStores() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filteredStores = storesData;
    
    // カテゴリーフィルター
    if (currentFilter === 'favorites') {
        // お気に入りフィルター
        filteredStores = filteredStores.filter(store => isFavorite(store.id));
    } else if (currentFilter !== 'all') {
        filteredStores = filteredStores.filter(store => store.category === currentFilter);
    }
    
    // 検索フィルター
    if (searchTerm) {
        filteredStores = filteredStores.filter(store => 
            store.name.toLowerCase().includes(searchTerm) ||
            store.address.toLowerCase().includes(searchTerm) ||
            store.description.toLowerCase().includes(searchTerm)
        );
    }
    
    displayStores(filteredStores);
    updateStoreList(filteredStores);
    
    // お気に入りフィルターの件数を更新
    updateFavoriteCount();
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

// 現在地を取得
function requestUserLocation() {
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

// お気に入りをローカルストレージから読み込み
function loadFavorites() {
    const stored = localStorage.getItem('glutenFreeFavorites');
    if (stored) {
        favorites = JSON.parse(stored);
    }
}

// お気に入りを保存
function saveFavorites() {
    localStorage.setItem('glutenFreeFavorites', JSON.stringify(favorites));
}

// お気に入りの追加/削除
function toggleFavorite(storeId) {
    const index = favorites.indexOf(storeId);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(storeId);
    }
    saveFavorites();
    
    // UIを更新
    updateFavoriteButtons();
    if (currentFilter === 'favorites') {
        filterStores();
    }
}

// お気に入りかどうかチェック
function isFavorite(storeId) {
    return favorites.includes(storeId);
}

// お気に入りボタンの状態を更新
function updateFavoriteButtons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const storeId = parseInt(btn.dataset.storeId);
        if (isFavorite(storeId)) {
            btn.classList.add('active');
            if (btn.classList.contains('modal-favorite')) {
                btn.innerHTML = '<i class="fas fa-heart"></i><span>お気に入り済み</span>';
            } else {
                btn.innerHTML = '<i class="fas fa-heart"></i>';
            }
        } else {
            btn.classList.remove('active');
            if (btn.classList.contains('modal-favorite')) {
                btn.innerHTML = '<i class="far fa-heart"></i><span>お気に入りに追加</span>';
            } else {
                btn.innerHTML = '<i class="far fa-heart"></i>';
            }
        }
    });
}

// お気に入り数を更新
function updateFavoriteCount() {
    const favoriteBtn = document.querySelector('.favorites-filter');
    if (favoriteBtn && favorites.length > 0) {
        favoriteBtn.innerHTML = `<i class="fas fa-heart"></i> お気に入り (${favorites.length})`;
    } else if (favoriteBtn) {
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> お気に入り';
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
    
    /* お気に入りボタン */
    .favorite-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: white;
        border: 2px solid #e0e0e0;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s;
        z-index: 10;
        color: #999;
        font-size: 18px;
    }
    
    .favorite-btn:hover {
        transform: scale(1.1);
        border-color: #ff69b4;
        color: #ff69b4;
    }
    
    .favorite-btn.active {
        color: #ff69b4;
        border-color: #ff69b4;
        background: #fff0f5;
    }
    
    .store-card {
        position: relative;
    }
    
    /* モーダル内のお気に入りボタン */
    .modal-favorite {
        position: static;
        width: auto;
        height: auto;
        padding: 8px 16px;
        border-radius: 20px;
        display: inline-flex;
        gap: 8px;
        margin-left: 15px;
    }
    
    .modal-title-section {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
    }
    
    /* お気に入りフィルターボタン */
    .favorites-filter {
        background: #fff0f5;
        border-color: #ff69b4;
        color: #ff69b4;
    }
    
    .favorites-filter.active {
        background: #ff69b4;
        color: white;
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