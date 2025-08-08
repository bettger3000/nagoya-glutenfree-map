// 名古屋グルテンフリーマップ v3 - メインアプリケーション
import { getSupabaseClient } from './supabase-client.js';

class GlutenFreeMap {
    constructor() {
        this.supabase = getSupabaseClient();
        this.map = null;
        this.markers = [];
        this.stores = [];
        this.filteredStores = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        
        // DOM要素
        this.elements = {
            loading: document.getElementById('loading'),
            storeCount: document.getElementById('store-count'),
            searchInput: document.getElementById('search-input'),
            filterTabs: document.getElementById('filter-tabs'),
            modal: document.getElementById('store-modal'),
            modalTitle: document.getElementById('modal-title'),
            modalBody: document.getElementById('modal-body'),
            closeModal: document.getElementById('close-modal')
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 グルテンフリーマップ v3 初期化開始');
        
        try {
            // 地図初期化
            this.initMap();
            
            // 店舗データ読み込み
            await this.loadStores();
            
            // UI初期化
            this.initUI();
            
            // ローディング完了
            this.hideLoading();
            
            console.log('✅ 初期化完了');
            
        } catch (error) {
            console.error('❌ 初期化エラー:', error);
            this.showError('アプリケーションの初期化に失敗しました');
        }
    }
    
    initMap() {
        console.log('🗺️ 地図を初期化中...');
        
        // 名古屋市中心部
        this.map = L.map('map').setView([35.1694, 136.8754], 12);
        
        // OpenStreetMapタイル
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);
        
        console.log('✅ 地図初期化完了');
    }
    
    async loadStores() {
        console.log('🏪 店舗データを読み込み中...');
        
        try {
            const { data: stores, error } = await this.supabase
                .from('stores')
                .select('*')
                .order('name');
            
            if (error) {
                throw error;
            }
            
            this.stores = stores || [];
            this.filteredStores = [...this.stores];
            
            console.log(`✅ ${this.stores.length} 店舗のデータを読み込み完了`);
            
            // 店舗を地図に表示
            this.displayStores();
            
            // フィルタータブを生成
            this.generateFilterTabs();
            
            // 統計更新
            this.updateStats();
            
        } catch (error) {
            console.error('❌ 店舗データ読み込みエラー:', error);
            throw new Error(`店舗データの読み込みに失敗しました: ${error.message}`);
        }
    }
    
    displayStores() {
        console.log(`📍 ${this.filteredStores.length} 店舗を地図に表示中...`);
        
        // 既存マーカーをクリア
        this.clearMarkers();
        
        // 各店舗にマーカーを追加
        this.filteredStores.forEach(store => {
            if (this.isValidCoordinate(store.latitude, store.longitude)) {
                const marker = this.createStoreMarker(store);
                this.markers.push(marker);
            }
        });
        
        console.log(`✅ ${this.markers.length} 個のマーカーを表示完了`);
    }
    
    createStoreMarker(store) {
        const categoryColors = {
            '和食': '#ff6b6b',
            '洋食': '#4ecdc4', 
            'カフェ': '#f7b731',
            'パン屋': '#5f27cd',
            '販売店': '#00d2d3',
            'スイーツ': '#ff9ff3'
        };
        
        const color = categoryColors[store.category] || '#98D8C8';
        
        // カスタムアイコン作成
        const icon = L.divIcon({
            html: `<div class="custom-marker" style="background-color: ${color};">
                     <i class="fas fa-utensils"></i>
                   </div>`,
            className: 'custom-marker-container',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        const marker = L.marker([store.latitude, store.longitude], { icon })
            .addTo(this.map);
        
        // クリックイベント
        marker.on('click', () => {
            this.showStoreDetail(store);
        });
        
        // ホバーでポップアップ
        marker.bindTooltip(
            `<strong>${store.name}</strong><br>${store.category}`,
            { direction: 'top', offset: [0, -15] }
        );
        
        return marker;
    }
    
    showStoreDetail(store) {
        console.log('📋 店舗詳細を表示:', store.name);
        
        this.elements.modalTitle.textContent = store.name;
        
        this.elements.modalBody.innerHTML = `
            <div class="store-info">
                <div class="store-category">${store.category}</div>
                <div class="store-address">
                    <i class="fas fa-map-marker-alt"></i>
                    ${store.address}
                </div>
                ${store.description ? `
                    <div class="store-description">
                        <p>${store.description}</p>
                    </div>
                ` : ''}
                ${store.phone ? `
                    <div class="store-contact">
                        <i class="fas fa-phone"></i>
                        <a href="tel:${store.phone}">${store.phone}</a>
                    </div>
                ` : ''}
                ${store.website ? `
                    <div class="store-website">
                        <i class="fas fa-globe"></i>
                        <a href="${store.website}" target="_blank">ウェブサイト</a>
                    </div>
                ` : ''}
                ${store.opening_hours ? `
                    <div class="store-hours">
                        <i class="fas fa-clock"></i>
                        ${store.opening_hours}
                    </div>
                ` : ''}
            </div>
        `;
        
        this.elements.modal.classList.add('show');
    }
    
    generateFilterTabs() {
        const categories = [...new Set(this.stores.map(store => store.category))];
        
        // すべて以外のタブを追加
        categories.forEach(category => {
            const count = this.stores.filter(store => store.category === category).length;
            const tab = document.createElement('button');
            tab.className = 'filter-tab';
            tab.dataset.category = category;
            tab.textContent = `${category} (${count})`;
            
            tab.addEventListener('click', () => {
                this.setFilter(category);
            });
            
            this.elements.filterTabs.appendChild(tab);
        });
        
        console.log(`✅ ${categories.length} 個のフィルタータブを生成`);
    }
    
    setFilter(category) {
        this.currentFilter = category;
        
        // アクティブタブ更新
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', 
                tab.dataset.category === category || 
                (category === 'all' && tab.textContent.includes('すべて'))
            );
        });
        
        // フィルター適用
        this.applyFilters();
        
        console.log(`🏷️ フィルター変更: ${category}`);
    }
    
    applyFilters() {
        let filtered = [...this.stores];
        
        // カテゴリーフィルター
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(store => store.category === this.currentFilter);
        }
        
        // 検索フィルター
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(store => 
                store.name.toLowerCase().includes(query) ||
                store.address.toLowerCase().includes(query) ||
                (store.description && store.description.toLowerCase().includes(query))
            );
        }
        
        this.filteredStores = filtered;
        this.displayStores();
        this.updateStats();
    }
    
    initUI() {
        // 検索機能
        this.elements.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.trim();
            this.applyFilters();
        });
        
        // モーダル閉じる
        this.elements.closeModal.addEventListener('click', () => {
            this.elements.modal.classList.remove('show');
        });
        
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.elements.modal.classList.remove('show');
            }
        });
        
        // 「すべて」タブのクリックイベント
        document.querySelector('[data-category="all"]').addEventListener('click', () => {
            this.setFilter('all');
        });
        
        console.log('✅ UI初期化完了');
    }
    
    updateStats() {
        this.elements.storeCount.textContent = this.filteredStores.length;
    }
    
    clearMarkers() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
    }
    
    isValidCoordinate(lat, lng) {
        return lat && lng && 
               !isNaN(lat) && !isNaN(lng) &&
               lat >= -90 && lat <= 90 &&
               lng >= -180 && lng <= 180;
    }
    
    hideLoading() {
        this.elements.loading.classList.add('hide');
        setTimeout(() => {
            this.elements.loading.style.display = 'none';
        }, 500);
    }
    
    showError(message) {
        this.elements.loading.innerHTML = `
            <div class="loading-content">
                <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                <h2>エラー</h2>
                <p>${message}</p>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: white; border: none; border-radius: 5px; cursor: pointer;">
                    再読み込み
                </button>
            </div>
        `;
    }
}

// DOMContentLoaded時にアプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM読み込み完了 - アプリ開始');
    new GlutenFreeMap();
});

// グローバルアクセス用
window.GlutenFreeMap = GlutenFreeMap;