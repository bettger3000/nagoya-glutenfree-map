// 店舗ステータス管理（訪問済み・行きたい店）
import { getSupabaseClient } from './supabase-client.js';

const supabase = getSupabaseClient();

// 店舗ステータス管理クラス
class StoreStatusManager {
    constructor() {
        this.currentUser = null;
        this.visitedStores = new Set();
        this.wishlistStores = new Set();
        this.showVisited = true;
        this.showWishlist = true;
        this.init();
    }

    // 初期化
    async init() {
        console.log('🏪 店舗ステータス管理を初期化中...');
        
        // 認証状態を確認
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            await this.loadUserStoreStatus();
        }

        // 認証状態変更を監視
        supabase.auth.onAuthStateChange(async (event, session) => {
            this.currentUser = session?.user || null;
            if (this.currentUser) {
                await this.loadUserStoreStatus();
            } else {
                this.visitedStores.clear();
                this.wishlistStores.clear();
            }
            // マップ更新を通知
            this.notifyMapUpdate();
        });

        console.log('✅ 店舗ステータス管理初期化完了');
    }

    // ユーザーの店舗ステータスを読み込み
    async loadUserStoreStatus() {
        if (!this.currentUser) return;

        try {
            console.log('📊 ユーザーの店舗ステータスを読み込み中...');

            // 訪問済み店舗を取得
            const { data: visitedData, error: visitedError } = await supabase
                .from('visited_stores')
                .select('store_id')
                .eq('user_id', this.currentUser.id);

            if (visitedError) throw visitedError;

            // 行きたい店舗を取得
            const { data: wishlistData, error: wishlistError } = await supabase
                .from('wishlist_stores')
                .select('store_id')
                .eq('user_id', this.currentUser.id);

            if (wishlistError) throw wishlistError;

            // セットに変換
            this.visitedStores = new Set(visitedData?.map(item => item.store_id) || []);
            this.wishlistStores = new Set(wishlistData?.map(item => item.store_id) || []);

            console.log(`✅ 訪問済み: ${this.visitedStores.size}件, 行きたい店: ${this.wishlistStores.size}件`);

            // マップ更新を通知
            this.notifyMapUpdate();

        } catch (error) {
            console.error('❌ 店舗ステータス読み込みエラー:', error);
        }
    }

    // 訪問済みステータスをトグル
    async toggleVisited(storeId) {
        if (!this.currentUser) {
            alert('この機能を使うにはログインが必要です。');
            return false;
        }

        try {
            const isVisited = this.visitedStores.has(storeId);
            
            if (isVisited) {
                // 削除
                const { error } = await supabase
                    .from('visited_stores')
                    .delete()
                    .eq('user_id', this.currentUser.id)
                    .eq('store_id', storeId);

                if (error) throw error;
                this.visitedStores.delete(storeId);
                console.log('✅ 訪問済み削除:', storeId);
            } else {
                // 追加
                const { error } = await supabase
                    .from('visited_stores')
                    .insert({
                        user_id: this.currentUser.id,
                        store_id: storeId
                    });

                if (error) throw error;
                this.visitedStores.add(storeId);
                console.log('✅ 訪問済み追加:', storeId);
            }

            // マップ更新を通知
            this.notifyMapUpdate();
            return true;

        } catch (error) {
            console.error('❌ 訪問済みステータス変更エラー:', error);
            alert('処理に失敗しました。再度お試しください。');
            return false;
        }
    }

    // 行きたい店ステータスをトグル
    async toggleWishlist(storeId) {
        if (!this.currentUser) {
            alert('この機能を使うにはログインが必要です。');
            return false;
        }

        try {
            const isWishlisted = this.wishlistStores.has(storeId);
            
            if (isWishlisted) {
                // 削除
                const { error } = await supabase
                    .from('wishlist_stores')
                    .delete()
                    .eq('user_id', this.currentUser.id)
                    .eq('store_id', storeId);

                if (error) throw error;
                this.wishlistStores.delete(storeId);
                console.log('⭐ 行きたい店削除:', storeId);
            } else {
                // 追加
                const { error } = await supabase
                    .from('wishlist_stores')
                    .insert({
                        user_id: this.currentUser.id,
                        store_id: storeId
                    });

                if (error) throw error;
                this.wishlistStores.add(storeId);
                console.log('⭐ 行きたい店追加:', storeId);
            }

            // マップ更新を通知
            this.notifyMapUpdate();
            return true;

        } catch (error) {
            console.error('❌ 行きたい店ステータス変更エラー:', error);
            alert('処理に失敗しました。再度お試しください。');
            return false;
        }
    }

    // ステータス確認
    isVisited(storeId) {
        return this.visitedStores.has(storeId);
    }

    isWishlisted(storeId) {
        return this.wishlistStores.has(storeId);
    }

    // 表示設定変更
    setShowVisited(show) {
        this.showVisited = show;
        this.notifyMapUpdate();
    }

    setShowWishlist(show) {
        this.showWishlist = show;
        this.notifyMapUpdate();
    }

    // 統計情報取得
    getStats() {
        return {
            visitedCount: this.visitedStores.size,
            wishlistCount: this.wishlistStores.size,
            isLoggedIn: !!this.currentUser
        };
    }

    // 他のユーザーの訪問数を取得（公開設定の場合のみ）
    async getUserVisitCount(userId) {
        try {
            const { data, error } = await supabase
                .from('user_visit_stats')
                .select('visit_count, show_visit_count')
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            // 公開設定がfalseの場合は非表示
            if (!data.show_visit_count) {
                return null;
            }

            return data.visit_count || 0;

        } catch (error) {
            console.error('❌ ユーザー訪問数取得エラー:', error);
            return null;
        }
    }

    // 店舗の表示判定
    shouldShowStore(storeId) {
        const isVisited = this.isVisited(storeId);
        const isWishlisted = this.isWishlisted(storeId);

        // 全店舗表示モードの場合は常に表示
        if (this.showVisited && this.showWishlist) {
            return true;
        }

        // 訪問済みのみ表示
        if (this.showVisited && !this.showWishlist) {
            return isVisited;
        }

        // 行きたい店のみ表示
        if (!this.showVisited && this.showWishlist) {
            return isWishlisted;
        }

        // 両方オフの場合は全て表示
        return true;
    }

    // マップ更新通知
    notifyMapUpdate() {
        if (window.updateMapMarkers) {
            window.updateMapMarkers();
        }
        
        // カスタムイベント発火
        window.dispatchEvent(new CustomEvent('storeStatusChanged', {
            detail: {
                visited: Array.from(this.visitedStores),
                wishlist: Array.from(this.wishlistStores),
                showVisited: this.showVisited,
                showWishlist: this.showWishlist
            }
        }));
    }
}

// グローバルインスタンス作成
window.storeStatusManager = new StoreStatusManager();

export default StoreStatusManager;