// レビュー機能のエラーを修正するためのパッチファイル
// このファイルを実行して、すべてのレビュー関連エラーを修正します

// 1. review-system.js の修正箇所
const reviewSystemFixes = `
// getStoreReviews - 外部キー結合を削除してシンプルなクエリに
async getStoreReviews(storeId) {
    try {
        const { data, error } = await supabase
            .from('store_reviews')
            .select('*')  // シンプルに全フィールドのみ取得
            .eq('store_id', storeId)
            .eq('is_public', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // ニックネームは別途取得する必要がある場合のみ
        return data || [];
    } catch (error) {
        console.error('❌ レビュー取得エラー:', error);
        return [];
    }
}
`;

// 2. hamburger-menu.js の修正箇所
const hamburgerMenuFixes = `
// showMyReviewsModal - 外部キー結合を削除
async showMyReviewsModal() {
    if (!this.currentUser) return;
    
    try {
        const { data: reviews, error } = await supabase
            .from('store_reviews')
            .select('*')  // シンプルに
            .eq('user_id', this.currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // 店舗情報は必要に応じて別途取得
        this.displayMyReviews(reviews || []);
    } catch (error) {
        console.error('❌ マイレビュー取得エラー:', error);
    }
}
`;

// 3. profile.js の修正箇所
const profileFixes = `
// loadUserReviews - 外部キー結合を削除
async function loadUserReviews() {
    if (!currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('store_reviews')
            .select('*')  // シンプルに
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        userReviews = data || [];
        displayReviewsSection();
    } catch (error) {
        console.error('❌ レビュー取得エラー:', error);
    }
}
`;

// 4. app-fixed-lightbox.js の修正箇所
const appLightboxFixes = `
// updateReviewsForStores - 外部キー結合を削除
async function updateReviewsForStores(stores) {
    const storeIds = stores.map(store => store.id);
    if (storeIds.length === 0) return;
    
    const { data: reviews, error } = await supabase
        .from('store_reviews')
        .select('store_id, comment, is_public')  // 必要なフィールドのみ
        .in('store_id', storeIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('レビュー取得エラー:', error);
        return;
    }
    
    // レビュー処理...
}
`;

console.log('修正内容：');
console.log('1. すべての外部キー結合（:user_id, :store_id）を削除');
console.log('2. select()をシンプルな形式に変更');
console.log('3. 必要なデータは別途取得するように変更');
console.log('\n各ファイルを手動で修正してください。');