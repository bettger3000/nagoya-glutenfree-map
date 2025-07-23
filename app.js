// グローバル変数
let map;
let markers = [];
let storesData = [];
let currentFilter = 'all';

// カテゴリー別の色とアイコン
const categoryStyles = {
    '和食': { color: '#ff6b6b', icon: 'fa-utensils' },
    '洋食': { color: '#4ecdc4', icon: 'fa-pizza-slice' },
    'カフェ': { color: '#f7b731', icon: 'fa-coffee' },
    'パン屋': { color: '#5f27cd', icon: 'fa-bread-slice' },
    '土産店': { color: '#00d2d3', icon: 'fa-gift' },
    'スイーツ': { color: '#ff69b4', icon: 'fa-ice-cream' }
};

// 初期化
document.addEventListener('DOMContentLoaded', async function() {
    initMap();
    await loadStores();
    setupEventListeners();
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
        const response = await fetch('stores.json');
        const data = await response.json();
        console.log('読み込んだデータ:', data);
        storesData = data.stores;
        console.log('店舗数:', storesData.length);
        displayStores(storesData);
        updateStoreList(storesData);
    } catch (error) {
        console.error('店舗データの読み込みに失敗しました:', error);
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
    });
}

// 店舗リストの更新
function updateStoreList(stores) {
    const listContent = document.getElementById('storeListContent');
    listContent.innerHTML = '';
    
    stores.forEach(store => {
        const card = document.createElement('div');
        card.className = 'store-card';
        card.innerHTML = `
            <h4>${store.name}</h4>
            <span class="store-category category-${store.category}">${store.category}</span>
            <div class="store-info">
                <i class="fas fa-map-marker-alt"></i> ${store.address}
            </div>
            <div class="store-info">
                <i class="fas fa-clock"></i> ${store.hours}
            </div>
        `;
        card.onclick = () => {
            showStoreDetail(store.id);
            // 地図を該当店舗にズーム
            map.setView([store.lat, store.lng], 16);
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
            <h2>${store.name}</h2>
            <span class="store-category category-${store.category}">${store.category}</span>
        </div>
        
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
            <h3>nacoのおすすめポイント</h3>
            <p>${store.nacoComment}</p>
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
               class="map-link">
                <i class="fab fa-instagram"></i> Instagram
            </a>
            ` : ''}
            
            <a href="${store.googleMapsUrl || `https://www.google.com/maps?q=${store.lat},${store.lng}`}" 
               target="_blank" 
               class="map-link">
                <i class="fas fa-map"></i> Google マップで開く
            </a>
        </div>
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
    if (currentFilter !== 'all') {
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
`;
document.head.appendChild(markerStyles);