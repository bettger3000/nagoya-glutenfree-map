// レビューシステム - store_reviews テーブル操作
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase設定
const SUPABASE_URL = 'https://lywfaolwvkewuouvkzlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5d2Zhb2x3dmtld3VvdXZremxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MDg2NjcsImV4cCI6MjA2OTk4NDY2N30.wBGCHOLbP6ew7Bnvxrq0sKSm1EnHk5NNE1sWWH7ff60';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// セキュリティ: HTMLサニタイズ関数
function sanitizeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => {
        return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'}[m];
    });
}

// レビューシステムクラス
class ReviewSystem {
    constructor() {
        this.currentUser = null;
        this.reviewModal = null;
        this.currentStoreId = null;
        this.currentReview = null; // 編集時に使用
        this.init();
    }

    // 初期化
    async init() {
        console.log('🔧 レビューシステムを初期化中...');
        
        // 現在のユーザーを取得
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.currentUser = session.user;
        }

        // モーダルHTML作成
        this.createReviewModal();
        this.setupEventListeners();
        
        console.log('✅ レビューシステム初期化完了');
    }

    // レビューモーダルのHTML作成
    createReviewModal() {
        const modalHTML = `
            <div class="modal" id="reviewModal" style="display: none;">
                <div class="modal-content review-modal-content">
                    <span class="close-btn" id="closeReviewModal">&times;</span>
                    <div class="review-modal-header">
                        <h2 id="reviewModalTitle">✍️ 感想を書く</h2>
                        <p id="reviewModalSubtitle">あなたの体験をシェアしてください</p>
                    </div>
                    
                    <div id="reviewMessageArea"></div>
                    
                    <form id="reviewForm">
                        <div class="form-group">
                            <label for="reviewComment">感想・コメント *</label>
                            <textarea 
                                id="reviewComment" 
                                name="comment" 
                                required
                                placeholder="料理の味、店舗の雰囲気、サービス、アクセスなど、自由にお書きください..."
                                maxlength="300"
                                minlength="10"
                            ></textarea>
                            <div class="character-count">
                                <span id="characterCount">0</span>/300文字 (最低10文字)
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="isPublic" checked> 
                                他のユーザーに公開する
                            </label>
                        </div>
                        
                        <div class="review-actions">
                            <button type="button" class="btn btn-secondary" id="cancelReview">
                                キャンセル
                            </button>
                            <button type="submit" class="btn btn-primary" id="submitReview">
                                <span class="loading" style="display: none;">
                                    <i class="fas fa-spinner fa-spin"></i>
                                </span>
                                <span class="text">投稿する</span>
                            </button>
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
        // モーダル閉じるボタン
        document.getElementById('closeReviewModal').addEventListener('click', () => {
            this.closeReviewModal();
        });

        document.getElementById('cancelReview').addEventListener('click', () => {
            this.closeReviewModal();
        });

        // モーダル外クリックで閉じる
        this.reviewModal.addEventListener('click', (e) => {
            if (e.target === this.reviewModal) {
                this.closeReviewModal();
            }
        });

        // フォーム送信
        document.getElementById('reviewForm').addEventListener('submit', (e) => {
            this.handleReviewSubmit(e);
        });

        // 文字数カウント
        document.getElementById('reviewComment').addEventListener('input', (e) => {
            this.updateCharacterCount(e.target.value);
        });
    }

    // 店舗のレビューを取得
    async getStoreReviews(storeId) {
        try {
            const { data, error } = await supabase
                .from('store_reviews')
                .select(`
                    *,
                    user_profiles:user_id (
                        nickname
                    )
                `)
                .eq('store_id', storeId)
                .eq('is_public', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ レビュー取得エラー:', error);
            return [];
        }
    }

    // ユーザーの特定店舗への既存レビューを取得
    async getUserReviewForStore(storeId) {
        if (!this.currentUser) return null;
        
        try {
            const { data, error } = await supabase
                .from('store_reviews')
                .select('*')
                .eq('store_id', storeId)
                .eq('user_id', this.currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = レコードなし
                throw error;
            }

            return data;
        } catch (error) {
            console.error('❌ ユーザーレビュー取得エラー:', error);
            return null;
        }
    }

    // レビュー投稿モーダルを開く
    async openReviewModal(storeId, storeName) {
        if (!this.currentUser) {
            alert('レビューを投稿するにはログインが必要です。');
            return;
        }

        this.currentStoreId = storeId;
        
        // 既存レビューをチェック
        const existingReview = await this.getUserReviewForStore(storeId);
        
        if (existingReview) {
            // 編集モード
            this.currentReview = existingReview;
            document.getElementById('reviewModalTitle').textContent = '✏️ 感想を編集';
            document.getElementById('reviewModalSubtitle').textContent = '投稿済みの感想を編集できます';
            document.getElementById('reviewComment').value = existingReview.comment;
            document.getElementById('isPublic').checked = existingReview.is_public;
            document.getElementById('submitReview').querySelector('.text').textContent = '更新する';
        } else {
            // 新規投稿モード
            this.currentReview = null;
            document.getElementById('reviewModalTitle').textContent = `✍️ ${storeName} の感想を書く`;
            document.getElementById('reviewModalSubtitle').textContent = 'あなたの体験をシェアしてください';
            document.getElementById('reviewComment').value = '';
            document.getElementById('isPublic').checked = true;
            document.getElementById('submitReview').querySelector('.text').textContent = '投稿する';
        }

        this.updateCharacterCount(document.getElementById('reviewComment').value);
        this.reviewModal.style.display = 'flex';
        document.getElementById('reviewComment').focus();
    }

    // レビューモーダルを閉じる
    closeReviewModal() {
        this.reviewModal.style.display = 'none';
        this.currentStoreId = null;
        this.currentReview = null;
        document.getElementById('reviewMessageArea').innerHTML = '';
        document.getElementById('reviewForm').reset();
    }

    // レビュー送信処理
    async handleReviewSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const comment = formData.get('comment').trim();
        const isPublic = document.getElementById('isPublic').checked;

        // バリデーション
        if (comment.length < 10) {
            this.showReviewError('コメントは10文字以上で入力してください。');
            return;
        }

        if (comment.length > 300) {
            this.showReviewError('コメントは300文字以内で入力してください。');
            return;
        }

        try {
            this.setReviewLoading(true);

            const reviewData = {
                user_id: this.currentUser.id,
                store_id: this.currentStoreId,
                comment: comment,
                is_public: isPublic
            };

            if (this.currentReview) {
                // 更新
                const { data, error } = await supabase
                    .from('store_reviews')
                    .update(reviewData)
                    .eq('id', this.currentReview.id)
                    .select()
                    .single();

                if (error) throw error;

                console.log('✅ レビュー更新完了:', data);
                this.showReviewSuccess('感想を更新しました！');
            } else {
                // 新規作成
                const { data, error } = await supabase
                    .from('store_reviews')
                    .insert(reviewData)
                    .select()
                    .single();

                if (error) throw error;

                console.log('✅ レビュー投稿完了:', data);
                this.showReviewSuccess('感想を投稿しました！');
            }

            // 2秒後にモーダルを閉じて、レビュー一覧を更新
            setTimeout(() => {
                this.closeReviewModal();
                // レビュー表示を更新（グローバル関数を呼び出し）
                if (window.updateStoreReviews) {
                    window.updateStoreReviews(this.currentStoreId);
                }
            }, 1500);

        } catch (error) {
            console.error('❌ レビュー投稿エラー:', error);

            if (error.code === '23505') { // unique_violation
                this.showReviewError('この店舗には既にレビューを投稿済みです。');
            } else {
                this.showReviewError('投稿に失敗しました。再度お試しください。');
            }

            this.setReviewLoading(false);
        }
    }

    // レビュー削除
    async deleteReview(reviewId) {
        if (!confirm('この感想を削除しますか？')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('store_reviews')
                .delete()
                .eq('id', reviewId)
                .eq('user_id', this.currentUser.id); // 安全性のため

            if (error) throw error;

            console.log('✅ レビュー削除完了');
            
            // レビュー表示を更新
            if (window.updateStoreReviews) {
                window.updateStoreReviews(this.currentStoreId);
            }

        } catch (error) {
            console.error('❌ レビュー削除エラー:', error);
            alert('削除に失敗しました。再度お試しください。');
        }
    }

    // 文字数更新
    updateCharacterCount(text) {
        const count = text.length;
        const countElement = document.getElementById('characterCount');
        countElement.textContent = count;
        
        // 色分け
        if (count < 10) {
            countElement.style.color = '#ff6b6b';
        } else if (count > 280) {
            countElement.style.color = '#ff6b6b';
        } else {
            countElement.style.color = '#666';
        }
    }

    // ローディング状態設定
    setReviewLoading(isLoading) {
        const submitBtn = document.getElementById('submitReview');
        const loading = submitBtn.querySelector('.loading');
        const text = submitBtn.querySelector('.text');

        if (isLoading) {
            loading.style.display = 'inline-block';
            text.style.display = 'none';
            submitBtn.disabled = true;
        } else {
            loading.style.display = 'none';
            text.style.display = 'inline';
            submitBtn.disabled = false;
        }
    }

    // エラーメッセージ表示
    showReviewError(message) {
        const messageArea = document.getElementById('reviewMessageArea');
        messageArea.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i> ${message}
            </div>
        `;
        
        setTimeout(() => {
            messageArea.innerHTML = '';
        }, 5000);
    }

    // 成功メッセージ表示
    showReviewSuccess(message) {
        const messageArea = document.getElementById('reviewMessageArea');
        messageArea.innerHTML = `
            <div class="success-message">
                <i class="fas fa-check-circle"></i> ${message}
            </div>
        `;
    }

    // 日付フォーマット（編集履歴対応）
    formatReviewDate(createdAt, updatedAt) {
        const created = new Date(createdAt);
        const updated = new Date(updatedAt);
        
        // 1分以上の差があれば編集済みとみなす
        const timeDiff = updated - created;
        const isEdited = timeDiff > 60000; // 60秒
        
        const formatOptions = {
            year: 'numeric',
            month: 'numeric', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        if (isEdited) {
            return `${created.toLocaleDateString('ja-JP', formatOptions)} ✏️ ${updated.toLocaleDateString('ja-JP', formatOptions)}に編集`;
        } else {
            return created.toLocaleDateString('ja-JP', formatOptions);
        }
    }

    // レビューHTMLを生成
    generateReviewHTML(review) {
        const isOwn = this.currentUser && review.user_id === this.currentUser.id;
        const dateStr = this.formatReviewDate(review.created_at, review.updated_at);
        
        return `
            <div class="review-item" data-review-id="${review.id}">
                <div class="review-header">
                    <div class="review-author">
                        👤 ${sanitizeHTML(review.user_profiles?.nickname || '匿名ユーザー')}
                        ${isOwn ? '（あなた）' : ''}
                    </div>
                    ${isOwn ? `
                        <div class="review-actions">
                            <button class="btn-edit-review" data-store-id="${review.store_id}" title="編集">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-delete-review" data-review-id="${review.id}" title="削除">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="review-content">
                    ${sanitizeHTML(review.comment)}
                </div>
                <div class="review-date">
                    📅 ${sanitizeHTML(dateStr)}
                </div>
            </div>
        `;
    }
}

// グローバルインスタンス作成
window.reviewSystem = new ReviewSystem();