// レビュー機能のクエリを完全にクリーンにするためのコード
// これをコピーして各ファイルの該当箇所を置き換える

// 1. review-system.js - getStoreReviews関数を完全に置き換え
const cleanGetStoreReviews = `
    // 店舗のレビューを取得（クリーン版）
    async getStoreReviews(storeId) {
        try {
            // シンプルなクエリでレビューを取得
            const { data: reviews, error } = await supabase
                .from('store_reviews')
                .select('id, user_id, store_id, comment, is_public, created_at, updated_at')
                .eq('store_id', storeId)
                .eq('is_public', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('レビュー取得エラー:', error);
                throw error;
            }

            // レビューがある場合はユーザー情報を別途取得
            if (reviews && reviews.length > 0) {
                const userIds = [...new Set(reviews.map(r => r.user_id))];
                
                try {
                    const { data: profiles, error: profileError } = await supabase
                        .from('user_profiles')
                        .select('user_id, nickname')
                        .in('user_id', userIds);
                    
                    if (!profileError && profiles) {
                        const profileMap = {};
                        profiles.forEach(p => {
                            profileMap[p.user_id] = p.nickname;
                        });
                        
                        // レビューにニックネームを追加
                        return reviews.map(review => ({
                            ...review,
                            nickname: profileMap[review.user_id] || '匿名ユーザー'
                        }));
                    }
                } catch (err) {
                    console.warn('プロフィール取得エラー:', err);
                    // プロフィール取得に失敗してもレビューは返す
                    return reviews.map(review => ({
                        ...review,
                        nickname: '匿名ユーザー'
                    }));
                }
            }

            return reviews || [];
        } catch (error) {
            console.error('❌ レビュー取得エラー:', error);
            return [];
        }
    }
`;

// 2. review-system.js - generateReviewHTML関数の修正
const cleanGenerateReviewHTML = `
    // レビューHTMLを生成（クリーン版）
    generateReviewHTML(review, isOwn = false) {
        const sanitizeHTML = (str) => {
            if (!str) return '';
            return str.replace(/[&<>"']/g, (m) => {
                return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'}[m];
            });
        };
        
        return \`
            <div class="review-item" data-review-id="\${review.id}">
                <div class="review-header">
                    <div class="review-author">
                        👤 \${sanitizeHTML(review.nickname || '匿名ユーザー')}
                        \${isOwn ? '（あなた）' : ''}
                    </div>
                    \${isOwn ? \`
                        <div class="review-actions">
                            <button class="btn-edit-review" data-store-id="\${review.store_id}" title="編集">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    \` : ''}
                </div>
                <div class="review-content">
                    \${sanitizeHTML(review.comment)}
                </div>
                <div class="review-footer">
                    <span class="review-date">📅 \${this.formatDate(review.created_at)}</span>
                </div>
            </div>
        \`;
    }
`;

console.log('修正内容をコピーして、review-system.jsの該当箇所を置き換えてください');