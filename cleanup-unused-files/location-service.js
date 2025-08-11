/**
 * 位置情報サービス
 * 現在地取得、距離計算、近くの店舗検索を提供
 */

class LocationService {
    constructor() {
        this.currentPosition = null;
        this.watchId = null;
        this.isWatching = false;
        this.positionOptions = {
            enableHighAccuracy: true,
            timeout: 15000, // 15秒でタイムアウト
            maximumAge: 300000 // 5分間はキャッシュを使用
        };
        this.defaultLocation = {
            lat: 35.1815, // 名古屋駅
            lng: 136.9066,
            accuracy: null
        };
        
        console.log('📍 LocationService初期化完了');
    }

    /**
     * 位置情報取得サポート確認
     * @returns {boolean} サポートされているかどうか
     */
    isSupported() {
        return 'geolocation' in navigator;
    }

    /**
     * 現在地を取得
     * @param {Object} options - オプション
     * @returns {Promise<Object>} 位置情報
     */
    async getCurrentPosition(options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.isSupported()) {
                console.warn('⚠️ 位置情報API未対応');
                resolve(this.defaultLocation);
                return;
            }

            const config = { ...this.positionOptions, ...options };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date(position.timestamp)
                    };

                    this.currentPosition = location;
                    console.log('✅ 現在地取得成功:', location);
                    resolve(location);
                },
                (error) => {
                    console.error('❌ 位置情報取得エラー:', error);
                    this.handleGeolocationError(error);
                    
                    // フォールバック: デフォルト位置を返す
                    resolve(this.defaultLocation);
                },
                config
            );
        });
    }

    /**
     * 位置情報の監視開始
     * @param {Function} callback - 位置更新時のコールバック
     * @param {Object} options - オプション
     */
    startWatching(callback, options = {}) {
        if (!this.isSupported() || this.isWatching) {
            return;
        }

        const config = { ...this.positionOptions, ...options };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: new Date(position.timestamp)
                };

                this.currentPosition = location;
                console.log('📍 位置更新:', location);
                
                if (callback && typeof callback === 'function') {
                    callback(location);
                }
            },
            (error) => {
                console.error('❌ 位置監視エラー:', error);
                this.handleGeolocationError(error);
            },
            config
        );

        this.isWatching = true;
        console.log('🔄 位置監視開始');
    }

    /**
     * 位置情報の監視停止
     */
    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.isWatching = false;
            console.log('⏹️ 位置監視停止');
        }
    }

    /**
     * 位置情報エラーハンドリング
     * @param {GeolocationPositionError} error - エラー
     */
    handleGeolocationError(error) {
        let message;
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = "位置情報の使用が拒否されました。ブラウザの設定を確認してください。";
                break;
            case error.POSITION_UNAVAILABLE:
                message = "位置情報を取得できませんでした。";
                break;
            case error.TIMEOUT:
                message = "位置情報の取得がタイムアウトしました。";
                break;
            default:
                message = "位置情報の取得中に不明なエラーが発生しました。";
                break;
        }

        if (window.errorHandler) {
            window.errorHandler.handle(error, 'LocationService', {
                customMessage: message
            });
        } else {
            console.error('位置情報エラー:', message);
        }
    }

    /**
     * 2点間の距離を計算（ハヴァサイン公式）
     * @param {number} lat1 - 緯度1
     * @param {lng1} lng1 - 経度1
     * @param {number} lat2 - 緯度2
     * @param {number} lng2 - 経度2
     * @returns {number} 距離（km）
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // 地球の半径 (km)
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * 度をラジアンに変換
     * @param {number} degrees - 度
     * @returns {number} ラジアン
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * 距離をフォーマット
     * @param {number} distance - 距離（km）
     * @returns {string} フォーマットされた距離
     */
    formatDistance(distance) {
        if (distance < 1) {
            return Math.round(distance * 1000) + 'm';
        } else if (distance < 10) {
            return distance.toFixed(1) + 'km';
        } else {
            return Math.round(distance) + 'km';
        }
    }

    /**
     * 店舗に距離情報を追加
     * @param {Array} stores - 店舗一覧
     * @param {Object} userLocation - ユーザーの位置
     * @returns {Array} 距離情報付き店舗一覧
     */
    addDistanceToStores(stores, userLocation = null) {
        const location = userLocation || this.currentPosition;
        
        if (!location) {
            return stores.map(store => ({ ...store, distance: null, distanceText: '' }));
        }

        return stores.map(store => {
            if (!store.lat || !store.lng) {
                return { ...store, distance: null, distanceText: '' };
            }

            const distance = this.calculateDistance(
                location.lat,
                location.lng,
                store.lat,
                store.lng
            );

            return {
                ...store,
                distance: distance,
                distanceText: this.formatDistance(distance)
            };
        });
    }

    /**
     * 距離順で店舗をソート
     * @param {Array} stores - 店舗一覧
     * @returns {Array} 距離順にソートされた店舗一覧
     */
    sortByDistance(stores) {
        return stores
            .filter(store => store.distance !== null)
            .sort((a, b) => a.distance - b.distance)
            .concat(stores.filter(store => store.distance === null));
    }

    /**
     * 指定半径内の店舗を取得
     * @param {Array} stores - 店舗一覧
     * @param {number} radius - 半径（km）
     * @param {Object} userLocation - ユーザーの位置
     * @returns {Array} 半径内の店舗一覧
     */
    getStoresWithinRadius(stores, radius = 5, userLocation = null) {
        const storesWithDistance = this.addDistanceToStores(stores, userLocation);
        return storesWithDistance.filter(store => 
            store.distance !== null && store.distance <= radius
        );
    }

    /**
     * 最寄りの店舗を取得
     * @param {Array} stores - 店舗一覧
     * @param {number} count - 取得件数
     * @param {Object} userLocation - ユーザーの位置
     * @returns {Array} 最寄りの店舗一覧
     */
    getNearestStores(stores, count = 10, userLocation = null) {
        const storesWithDistance = this.addDistanceToStores(stores, userLocation);
        const sortedStores = this.sortByDistance(storesWithDistance);
        return sortedStores.slice(0, count);
    }

    /**
     * 現在地マーカーを作成
     * @param {Object} location - 位置情報
     * @returns {L.Marker} Leafletマーカー
     */
    createCurrentLocationMarker(location) {
        const accuracy = location.accuracy || 100;
        
        // カスタムアイコンを作成
        const iconHtml = `
            <div class="current-location-marker">
                <div class="location-dot"></div>
                <div class="location-pulse"></div>
            </div>
        `;
        
        const customIcon = L.divIcon({
            html: iconHtml,
            className: 'current-location-wrapper',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        // マーカーを作成
        const marker = L.marker([location.lat, location.lng], { 
            icon: customIcon,
            zIndexOffset: 1000 // 他のマーカーより前面に
        });

        // 精度円を追加（精度が100m以下の場合）
        if (accuracy <= 1000) {
            const accuracyCircle = L.circle([location.lat, location.lng], {
                radius: accuracy,
                color: '#4285f4',
                fillColor: '#4285f4',
                fillOpacity: 0.1,
                weight: 1
            });

            // マーカーにサークル情報を保存
            marker.accuracyCircle = accuracyCircle;
        }

        return marker;
    }

    /**
     * 住所から座標を取得（ジオコーディング）
     * @param {string} address - 住所
     * @returns {Promise<Object|null>} 座標情報
     */
    async geocodeAddress(address) {
        // OpenStreetMap Nominatim APIを使用（無料）
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=jp`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    display_name: data[0].display_name
                };
            }
            
            return null;
        } catch (error) {
            console.error('❌ ジオコーディングエラー:', error);
            return null;
        }
    }

    /**
     * 座標から住所を取得（逆ジオコーディング）
     * @param {number} lat - 緯度
     * @param {number} lng - 経度
     * @returns {Promise<string|null>} 住所
     */
    async reverseGeocode(lat, lng) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.display_name) {
                return data.display_name;
            }
            
            return null;
        } catch (error) {
            console.error('❌ 逆ジオコーディングエラー:', error);
            return null;
        }
    }

    /**
     * 現在の位置情報を取得
     * @returns {Object|null} 現在の位置情報
     */
    getCurrentLocation() {
        return this.currentPosition;
    }

    /**
     * デフォルト位置を設定
     * @param {number} lat - 緯度
     * @param {number} lng - 経度
     */
    setDefaultLocation(lat, lng) {
        this.defaultLocation = { lat, lng, accuracy: null };
    }

    /**
     * サービスのクリーンアップ
     */
    cleanup() {
        this.stopWatching();
        this.currentPosition = null;
        console.log('🧹 LocationService クリーンアップ完了');
    }
}

// グローバルインスタンス作成
const locationService = new LocationService();

// エクスポート
if (typeof window !== 'undefined') {
    window.LocationService = LocationService;
    window.locationService = locationService;
}