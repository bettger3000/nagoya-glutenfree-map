// レビューシステム - v2 Social統合版
class ReviewSystem {
    constructor() {
        this.currentUser = null;
        this.reviewModal = null;
        this.currentStoreId = null;
        this.currentReview = null;
        this.init();
    }

    // セキュリティ: HTMLサニタイズ関数
    sanitizeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, (m) => {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'}[m];
        });
    }

    // 初期化
    async init() {
        console.log('🔧 レビューシステムを初期化中...');
        
        // 現在のユーザーを取得
        await this.loadCurrentUser();
        
        // モーダルHTML作成
        this.createReviewModal();
        this.setupEventListeners();
        
        console.log('✅ レビューシステム初期化完了');
    }

    // 現在のユーザーを読み込み
    async loadCurrentUser() {
        try {
            if (window.supabase) {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (session) {
                    this.currentUser = session.user;
                }
            }
        } catch (error) {
            console.error('ユーザー読み込みエラー:', error);
        }
    }

    // レビューモーダルのHTML作成
    createReviewModal() {
        const modalHTML = `
            <div class="review-modal" id="reviewModal" style="display: none;">
                <div class="review-modal-content">
                    <div class="review-modal-header">
                        <h2 id="reviewModalTitle">✍️ レビューを書く</h2>
                        <button class="close-btn" id="closeReviewModal">&times;</button>
                    </div>
                    
                    <div id="reviewMessageArea"></div>
                    
                    <form id="reviewForm">
                        <div class="form-group">
                            <label for="reviewRating">評価 *</label>
                            <div class="rating-input" id="ratingInput">
                                <span class="star" data-rating="1">★</span>
                                <span class="star" data-rating="2">★</span>
                                <span class="star" data-rating="3">★</span>
                                <span class="star" data-rating="4">★</span>
                                <span class="star" data-rating="5">★</span>
                            </div>
                            <input type="hidden" id="reviewRating" name="rating" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="reviewComment">コメント *</label>
                            <textarea 
                                id="reviewComment" 
                                name="comment" 
                                required
                                placeholder="料理の味、店舗の雰囲気、サービスなど、自由にお書きください..."
                                maxlength="500"
                            ></textarea>
                            <div class="character-count">
                                <span id="characterCount">0</span>/500文字
                            </div>
                        </div>
                        
                        <div class="form-group checkbox-group">
                            <label>
                                <input type="checkbox" id="reviewVisited" name="visited">
                                実際に訪問しました
                            </label>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="cancel-btn" id="cancelReviewBtn">キャンセル</button>
                            <button type="submit" class="submit-btn" id="submitReviewBtn">投稿する</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.reviewModal = document.getElementById('reviewModal');
    }

    // イベントリスナー設定
    setupEventListeners() {
        // モーダル閉じる
        const closeBtn = document.getElementById('closeReviewModal');
        const cancelBtn = document.getElementById('cancelReviewBtn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        // オーバーレイクリック
        this.reviewModal?.addEventListener('click', (e) => {
            if (e.target === this.reviewModal) {
                this.closeModal();
            }
        });

        // 星評価
        const stars = document.querySelectorAll('.star');
        stars.forEach(star => {
            star.addEventListener('click', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                this.setRating(rating);
            });
        });

        // 文字数カウント
        const commentTextarea = document.getElementById('reviewComment');
        const characterCount = document.getElementById('characterCount');
        
        if (commentTextarea && characterCount) {
            commentTextarea.addEventListener('input', () => {
                characterCount.textContent = commentTextarea.value.length;
            });
        }

        // フォーム送信
        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitReview();
            });
        }
    }

    // レビューモーダルを開く
    openReviewModal(storeId, storeName) {
        if (!this.currentUser) {
            alert('レビューを投稿するにはログインが必要です。');
            return;
        }

        this.currentStoreId = storeId;
        
        const title = document.getElementById('reviewModalTitle');
        if (title) {
            title.textContent = `✍️ ${storeName} のレビュー`;
        }

        // フォームリセット
        this.resetForm();
        
        // モーダル表示
        if (this.reviewModal) {
            this.reviewModal.style.display = 'block';
            document.body.classList.add('modal-open');
        }
    }

    // モーダルを閉じる
    closeModal() {
        if (this.reviewModal) {
            this.reviewModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
        this.currentStoreId = null;
        this.currentReview = null;
    }

    // 星評価を設定
    setRating(rating) {
        const stars = document.querySelectorAll('.star');
        const ratingInput = document.getElementById('reviewRating');
        
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('selected');
            } else {
                star.classList.remove('selected');
            }
        });
        
        if (ratingInput) {
            ratingInput.value = rating;
        }
    }

    // フォームリセット
    resetForm() {
        const form = document.getElementById('reviewForm');
        if (form) {
            form.reset();
        }
        
        // 星評価リセット
        document.querySelectorAll('.star').forEach(star => {
            star.classList.remove('selected');
        });
        
        // 文字数カウントリセット
        const characterCount = document.getElementById('characterCount');
        if (characterCount) {
            characterCount.textContent = '0';
        }
    }

    // レビュー投稿
    async submitReview() {
        try {
            if (!this.currentUser || !this.currentStoreId) {
                throw new Error('ユーザー情報または店舗情報が不足しています');
            }

            const rating = document.getElementById('reviewRating').value;
            const comment = document.getElementById('reviewComment').value.trim();
            const visited = document.getElementById('reviewVisited').checked;

            if (!rating || !comment) {
                alert('評価とコメントを入力してください。');
                return;
            }

            // レビューデータを準備
            const reviewData = {
                store_id: this.currentStoreId,
                user_id: this.currentUser.id,
                rating: parseInt(rating),
                comment: this.sanitizeHTML(comment),
                visited: visited,
                created_at: new Date().toISOString()
            };

            // Supabaseに投稿
            const { data, error } = await window.supabase
                .from('store_reviews')
                .insert([reviewData]);

            if (error) {
                throw error;
            }

            console.log('✅ レビュー投稿成功:', data);
            this.showMessage('レビューを投稿しました！', 'success');
            
            // モーダルを閉じる
            setTimeout(() => {
                this.closeModal();
                // マップを更新
                if (window.refreshStoreData) {
                    window.refreshStoreData();
                }
            }, 1500);

        } catch (error) {
            console.error('❌ レビュー投稿エラー:', error);
            this.showMessage('レビューの投稿に失敗しました。もう一度お試しください。', 'error');
        }
    }

    // メッセージ表示
    showMessage(message, type = 'info') {
        const messageArea = document.getElementById('reviewMessageArea');
        if (!messageArea) return;

        messageArea.innerHTML = `
            <div class="review-message review-message-${type}">
                ${this.sanitizeHTML(message)}
            </div>
        `;

        // 3秒後にメッセージを削除
        setTimeout(() => {
            messageArea.innerHTML = '';
        }, 3000);
    }

    // 店舗のレビューを取得
    async getStoreReviews(storeId) {
        try {
            const { data, error } = await window.supabase
                .from('store_reviews')
                .select(`
                    *,
                    user_profiles (
                        name,
                        avatar_emoji
                    )
                `)
                .eq('store_id', storeId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('レビュー取得エラー:', error);
            return [];
        }
    }

    // 店舗の平均評価を取得
    async getStoreRating(storeId) {
        try {
            const { data, error } = await window.supabase
                .from('store_reviews')
                .select('rating')
                .eq('store_id', storeId);

            if (error || !data || data.length === 0) {
                return { average: 0, count: 0 };
            }

            const average = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
            return {
                average: Math.round(average * 10) / 10,
                count: data.length
            };
        } catch (error) {
            console.error('評価取得エラー:', error);
            return { average: 0, count: 0 };
        }
    }
}

// グローバルインスタンスを作成
let reviewSystem = null;

// 初期化関数
export function initReviewSystem() {
    if (!reviewSystem) {
        reviewSystem = new ReviewSystem();
    }
    return reviewSystem;
}

// グローバルアクセス用
window.initReviewSystem = initReviewSystem;
window.reviewSystem = reviewSystem;