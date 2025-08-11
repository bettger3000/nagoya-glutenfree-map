/**
 * パフォーマンス管理システム
 * 画像の遅延読み込み、キャッシュ管理、マーカー最適化を統合管理
 */

class PerformanceManager {
    constructor() {
        this.cache = new Map();
        this.imageObserver = null;
        this.markerClusterLayer = null;
        this.lazyImages = new Set();
        this.cacheExpiry = 30 * 60 * 1000; // 30分
        this.maxCacheSize = 100;
        
        this.initLazyLoading();
        this.initCacheCleanup();
        
        console.log('✅ PerformanceManager初期化完了');
    }

    /**
     * 遅延読み込み初期化
     */
    initLazyLoading() {
        // Intersection Observer のサポートチェック
        if ('IntersectionObserver' in window) {
            this.imageObserver = new IntersectionObserver(
                (entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.loadLazyImage(entry.target);
                            observer.unobserve(entry.target);
                            this.lazyImages.delete(entry.target);
                        }
                    });
                },
                {
                    root: null,
                    rootMargin: '50px', // 表示エリアの50px手前で読み込み開始
                    threshold: 0.1
                }
            );
        } else {
            console.warn('⚠️ IntersectionObserver未対応：フォールバック処理');
            // フォールバック: 即座に全画像読み込み
            this.loadAllImages();
        }
    }

    /**
     * キャッシュクリーンアップの初期化
     */
    initCacheCleanup() {
        // 15分ごとにキャッシュクリーンアップ
        setInterval(() => {
            this.cleanupCache();
        }, 15 * 60 * 1000);

        // ページ離脱時にキャッシュを保存
        window.addEventListener('beforeunload', () => {
            this.saveCacheToStorage();
        });

        // ページ読み込み時にキャッシュを復元
        this.loadCacheFromStorage();
    }

    /**
     * 画像を遅延読み込み登録
     * @param {HTMLImageElement} img - 画像要素
     * @param {string} src - 実際の画像URL
     * @param {string} alt - alt属性
     */
    registerLazyImage(img, src, alt = '') {
        if (!img || !src) return;

        // プレースホルダー画像を設定
        img.src = this.generatePlaceholder(300, 200);
        img.dataset.lazySrc = src;
        img.alt = alt;
        img.className += ' lazy-image loading';

        this.lazyImages.add(img);

        if (this.imageObserver) {
            this.imageObserver.observe(img);
        } else {
            // フォールバック
            this.loadLazyImage(img);
        }
    }

    /**
     * 遅延読み込み画像を実際に読み込み
     * @param {HTMLImageElement} img - 画像要素
     */
    async loadLazyImage(img) {
        const src = img.dataset.lazySrc;
        if (!src) return;

        try {
            // キャッシュから確認
            const cachedImage = this.getCachedImage(src);
            if (cachedImage) {
                img.src = cachedImage;
                img.className = img.className.replace('loading', 'loaded');
                return;
            }

            // 新しい画像を読み込み
            const newImg = new Image();
            newImg.onload = () => {
                img.src = src;
                img.className = img.className.replace('loading', 'loaded');
                
                // キャッシュに保存
                this.cacheImage(src, src);
                console.log(`📸 画像読み込み完了: ${src}`);
            };
            
            newImg.onerror = () => {
                img.className = img.className.replace('loading', 'error');
                console.warn(`⚠️ 画像読み込み失敗: ${src}`);
            };

            newImg.src = src;

        } catch (error) {
            console.error('❌ 画像読み込みエラー:', error);
            img.className = img.className.replace('loading', 'error');
        }
    }

    /**
     * フォールバック用：すべての画像を即座に読み込み
     */
    loadAllImages() {
        this.lazyImages.forEach(img => {
            this.loadLazyImage(img);
        });
    }

    /**
     * プレースホルダー画像を生成
     * @param {number} width - 幅
     * @param {number} height - 高さ
     * @returns {string} Data URL
     */
    generatePlaceholder(width = 300, height = 200) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // グラデーション背景
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#f8f9fa');
        gradient.addColorStop(1, '#e9ecef');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // アイコン
        ctx.fillStyle = '#6c757d';
        ctx.font = `${Math.min(width, height) / 6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🖼️', width / 2, height / 2);
        
        return canvas.toDataURL('image/png');
    }

    // ==================== キャッシュ管理 ====================

    /**
     * データをキャッシュ
     * @param {string} key - キー
     * @param {*} data - データ
     * @param {number} customTTL - カスタムTTL（ミリ秒）
     */
    setCache(key, data, customTTL = null) {
        const ttl = customTTL || this.cacheExpiry;
        const cacheItem = {
            data,
            timestamp: Date.now(),
            expiry: Date.now() + ttl
        };

        this.cache.set(key, cacheItem);
        
        // サイズ制限チェック
        if (this.cache.size > this.maxCacheSize) {
            this.cleanupCache();
        }

        console.log(`📦 キャッシュ保存: ${key}`);
    }

    /**
     * キャッシュからデータ取得
     * @param {string} key - キー
     * @returns {*} データ（期限切れの場合はnull）
     */
    getCache(key) {
        const cacheItem = this.cache.get(key);
        
        if (!cacheItem) {
            return null;
        }

        // 期限チェック
        if (Date.now() > cacheItem.expiry) {
            this.cache.delete(key);
            console.log(`🗑️ キャッシュ期限切れ削除: ${key}`);
            return null;
        }

        console.log(`📦 キャッシュヒット: ${key}`);
        return cacheItem.data;
    }

    /**
     * 画像をキャッシュ
     * @param {string} url - 画像URL
     * @param {string} dataUrl - Data URL
     */
    cacheImage(url, dataUrl) {
        this.setCache(`img_${url}`, dataUrl, 60 * 60 * 1000); // 1時間
    }

    /**
     * キャッシュされた画像を取得
     * @param {string} url - 画像URL
     * @returns {string|null} Data URL
     */
    getCachedImage(url) {
        return this.getCache(`img_${url}`);
    }

    /**
     * APIレスポンスをキャッシュ
     * @param {string} endpoint - エンドポイント
     * @param {*} response - レスポンス
     */
    cacheApiResponse(endpoint, response) {
        this.setCache(`api_${endpoint}`, response, 10 * 60 * 1000); // 10分
    }

    /**
     * キャッシュされたAPIレスポンスを取得
     * @param {string} endpoint - エンドポイント
     * @returns {*} レスポンス
     */
    getCachedApiResponse(endpoint) {
        return this.getCache(`api_${endpoint}`);
    }

    /**
     * キャッシュクリーンアップ
     */
    cleanupCache() {
        const now = Date.now();
        let deletedCount = 0;

        for (const [key, cacheItem] of this.cache.entries()) {
            if (now > cacheItem.expiry) {
                this.cache.delete(key);
                deletedCount++;
            }
        }

        // サイズ制限による追加削除
        if (this.cache.size > this.maxCacheSize) {
            const entries = Array.from(this.cache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp); // 古い順
            
            const excessCount = this.cache.size - this.maxCacheSize;
            for (let i = 0; i < excessCount; i++) {
                this.cache.delete(entries[i][0]);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            console.log(`🧹 キャッシュクリーンアップ: ${deletedCount}件削除`);
        }
    }

    /**
     * キャッシュをlocalStorageに保存
     */
    saveCacheToStorage() {
        try {
            const cacheData = {};
            for (const [key, value] of this.cache.entries()) {
                // 画像キャッシュは除外（サイズが大きいため）
                if (!key.startsWith('img_')) {
                    cacheData[key] = value;
                }
            }
            
            localStorage.setItem('nacoMapCache', JSON.stringify(cacheData));
            console.log('💾 キャッシュをlocalStorageに保存');
        } catch (error) {
            console.warn('⚠️ キャッシュ保存失敗:', error);
        }
    }

    /**
     * localStorageからキャッシュを復元
     */
    loadCacheFromStorage() {
        try {
            const cacheData = localStorage.getItem('nacoMapCache');
            if (cacheData) {
                const parsed = JSON.parse(cacheData);
                for (const [key, value] of Object.entries(parsed)) {
                    this.cache.set(key, value);
                }
                console.log('📥 キャッシュをlocalStorageから復元');
            }
        } catch (error) {
            console.warn('⚠️ キャッシュ復元失敗:', error);
        }
    }

    // ==================== マーカー最適化 ====================

    /**
     * マーカーのバッチ作成
     * @param {Array} stores - 店舗データ
     * @param {Function} createMarkerFn - マーカー作成関数
     * @returns {Array} マーカー配列
     */
    createMarkersInBatches(stores, createMarkerFn) {
        return new Promise((resolve) => {
            const markers = [];
            const batchSize = 20; // バッチサイズ
            let currentIndex = 0;

            const processBatch = () => {
                const endIndex = Math.min(currentIndex + batchSize, stores.length);
                
                for (let i = currentIndex; i < endIndex; i++) {
                    const store = stores[i];
                    if (store.lat && store.lng) {
                        try {
                            const marker = createMarkerFn(store);
                            if (marker) {
                                markers.push(marker);
                            }
                        } catch (error) {
                            console.warn(`⚠️ マーカー作成失敗 (${store.name}):`, error);
                        }
                    }
                }

                currentIndex = endIndex;

                if (currentIndex < stores.length) {
                    // 次のバッチを非同期で処理
                    setTimeout(processBatch, 10);
                } else {
                    console.log(`✅ マーカー作成完了: ${markers.length}件`);
                    resolve(markers);
                }
            };

            processBatch();
        });
    }

    /**
     * 可視領域のマーカーのみ表示する最適化
     * @param {L.Map} map - Leafletマップ
     * @param {Array} allMarkers - 全マーカー
     */
    optimizeMarkerVisibility(map, allMarkers) {
        const visibleMarkers = new Set();

        const updateVisibleMarkers = () => {
            const bounds = map.getBounds();
            
            allMarkers.forEach(marker => {
                const markerLatLng = marker.getLatLng();
                const isVisible = bounds.contains(markerLatLng);
                
                if (isVisible && !visibleMarkers.has(marker)) {
                    map.addLayer(marker);
                    visibleMarkers.add(marker);
                } else if (!isVisible && visibleMarkers.has(marker)) {
                    map.removeLayer(marker);
                    visibleMarkers.delete(marker);
                }
            });
        };

        // 初期表示
        updateVisibleMarkers();

        // マップイベントでの更新（デバウンス付き）
        let timeout;
        map.on('moveend zoomend', () => {
            clearTimeout(timeout);
            timeout = setTimeout(updateVisibleMarkers, 100);
        });

        return {
            updateVisibleMarkers,
            getVisibleCount: () => visibleMarkers.size
        };
    }

    // ==================== パフォーマンス測定 ====================

    /**
     * パフォーマンス測定開始
     * @param {string} label - ラベル
     */
    startMeasure(label) {
        if (performance && performance.mark) {
            performance.mark(`${label}-start`);
        }
    }

    /**
     * パフォーマンス測定終了
     * @param {string} label - ラベル
     */
    endMeasure(label) {
        if (performance && performance.mark && performance.measure) {
            try {
                performance.mark(`${label}-end`);
                performance.measure(label, `${label}-start`, `${label}-end`);
                
                const measure = performance.getEntriesByName(label)[0];
                console.log(`⏱️ ${label}: ${measure.duration.toFixed(2)}ms`);
            } catch (error) {
                console.warn('⚠️ パフォーマンス測定失敗:', error);
            }
        }
    }

    /**
     * メモリ使用量を取得
     * @returns {Object} メモリ情報
     */
    getMemoryInfo() {
        if (performance && performance.memory) {
            return {
                usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }

    /**
     * リソース統計を取得
     * @returns {Object} リソース統計
     */
    getResourceStats() {
        if (performance && performance.getEntriesByType) {
            const resources = performance.getEntriesByType('resource');
            const stats = {
                total: resources.length,
                images: resources.filter(r => r.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)).length,
                scripts: resources.filter(r => r.name.match(/\.js$/i)).length,
                styles: resources.filter(r => r.name.match(/\.css$/i)).length
            };
            return stats;
        }
        return null;
    }

    /**
     * 統計情報をコンソールに出力
     */
    logStats() {
        console.group('📊 パフォーマンス統計');
        
        const memory = this.getMemoryInfo();
        if (memory) {
            console.log(`💾 メモリ使用量: ${memory.usedJSHeapSize}MB / ${memory.totalJSHeapSize}MB`);
        }

        const resources = this.getResourceStats();
        if (resources) {
            console.log(`📦 リソース: 計${resources.total}件 (画像:${resources.images}, JS:${resources.scripts}, CSS:${resources.styles})`);
        }

        console.log(`🗂️ キャッシュサイズ: ${this.cache.size}件`);
        console.log(`🖼️ 遅延読み込み画像: ${this.lazyImages.size}件`);
        
        console.groupEnd();
    }

    /**
     * クリーンアップ（メモリリーク防止）
     */
    cleanup() {
        if (this.imageObserver) {
            this.imageObserver.disconnect();
        }
        
        this.cache.clear();
        this.lazyImages.clear();
        
        console.log('🧹 PerformanceManager クリーンアップ完了');
    }
}

// グローバルインスタンス作成
const performanceManager = new PerformanceManager();

// エクスポート
if (typeof window !== 'undefined') {
    window.PerformanceManager = PerformanceManager;
    window.performanceManager = performanceManager;
}