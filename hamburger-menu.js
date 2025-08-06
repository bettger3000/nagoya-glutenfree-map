// ハンバーガーメニュー管理システム
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase設定
const SUPABASE_URL = 'https://lywfaolwvkewuouvkzlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5d2Zhb2x3dmtld3VvdXZremxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MDg2NjcsImV4cCI6MjA2OTk4NDY2N30.wBGCHOLbP6ew7Bnvxrq0sKSm1EnHk5NNE1sWWH7ff60';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class HamburgerMenu {
    constructor() {
        this.isOpen = false;
        this.currentUser = null;
        this.userProfile = null;
        this.userStats = null;
        
        this.hamburgerBtn = document.getElementById('hamburgerBtn');
        this.hamburgerMenu = document.getElementById('hamburgerMenu');
        this.hamburgerOverlay = document.getElementById('hamburgerOverlay');
        this.hamburgerUserName = document.getElementById('hamburgerUserName');
        this.hamburgerUserStats = document.getElementById('hamburgerUserStats');
        
        this.init();
    }
    
    // 初期化
    async init() {
        console.log('🍔 ハンバーガーメニューを初期化中...');
        
        // 現在のユーザー情報を取得
        await this.loadCurrentUser();
        
        // イベントリスナーを設定
        this.setupEventListeners();
        
        // ユーザー情報を更新
        this.updateUserDisplay();
        
        console.log('✅ ハンバーガーメニュー初期化完了');
    }
    
    // 現在のユーザー情報を読み込み
    async loadCurrentUser() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
                await this.loadUserProfile();
                await this.loadUserStats();
            }
        } catch (error) {
            console.error('❌ ユーザー情報取得エラー:', error);
        }
    }
    
    // ユーザープロフィールを読み込み
    async loadUserProfile() {
        if (!this.currentUser) return;
        
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            this.userProfile = data;
        } catch (error) {
            console.error('❌ プロフィール取得エラー:', error);
        }
    }
    
    // ユーザー統計を読み込み
    async loadUserStats() {
        if (!this.currentUser) return;
        
        try {
            // レビュー投稿数を取得
            const { data: reviewData, error: reviewError } = await supabase
                .from('store_reviews')
                .select('id')
                .eq('user_id', this.currentUser.id);
            
            if (reviewError) throw reviewError;
            
            this.userStats = {
                reviewCount: reviewData ? reviewData.length : 0
            };
            
        } catch (error) {
            console.error('❌ 統計取得エラー:', error);
            this.userStats = { reviewCount: 0 };
        }
    }
    
    // イベントリスナー設定
    setupEventListeners() {
        // ハンバーガーボタン
        this.hamburgerBtn.addEventListener('click', () => {
            this.toggleMenu();
        });
        
        // オーバーレイクリック
        this.hamburgerOverlay.addEventListener('click', () => {
            this.closeMenu();
        });
        
        // ESCキーでメニューを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });
        
        // メニュー項目のクリック処理
        document.getElementById('myReviewsLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleMyReviews();
        });
        
        document.getElementById('myStatsLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleMyStats();
        });
        
        document.getElementById('aboutLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleAbout();
        });
        
        document.getElementById('hamburgerLogout').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });
    }
    
    // メニュー切り替え
    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    // メニューを開く
    async openMenu() {
        // 最新のユーザー情報を取得
        await this.loadCurrentUser();
        this.updateUserDisplay();
        
        this.isOpen = true;
        this.hamburgerBtn.classList.add('active');
        this.hamburgerMenu.classList.add('show');
        this.hamburgerOverlay.classList.add('show');
        
        // スクロールを無効化
        document.body.style.overflow = 'hidden';
    }
    
    // メニューを閉じる
    closeMenu() {
        this.isOpen = false;
        this.hamburgerBtn.classList.remove('active');
        this.hamburgerMenu.classList.remove('show');
        this.hamburgerOverlay.classList.remove('show');
        
        // スクロールを復活
        document.body.style.overflow = '';
    }
    
    // ユーザー表示を更新
    updateUserDisplay() {
        const loginItem = document.getElementById('hamburgerLoginItem');
        const logoutItem = document.getElementById('hamburgerLogoutItem');
        
        if (this.currentUser && this.userProfile) {
            this.hamburgerUserName.textContent = this.userProfile.nickname || 'ユーザー';
            
            if (this.userStats) {
                this.hamburgerUserStats.textContent = `レビュー ${this.userStats.reviewCount}件投稿`;
            } else {
                this.hamburgerUserStats.textContent = 'データ読み込み中...';
            }
            
            // ログイン済み：ログアウトボタンを表示
            if (loginItem) loginItem.style.display = 'none';
            if (logoutItem) logoutItem.style.display = 'block';
            
        } else if (this.currentUser) {
            this.hamburgerUserName.textContent = 'プロフィール未設定';
            this.hamburgerUserStats.textContent = 'プロフィールを設定してください';
            
            // ログイン済み（プロフィール未設定）：ログアウトボタンを表示
            if (loginItem) loginItem.style.display = 'none';
            if (logoutItem) logoutItem.style.display = 'block';
            
        } else {
            this.hamburgerUserName.textContent = '未ログイン';
            this.hamburgerUserStats.textContent = 'ログインしてください';
            
            // 未ログイン：ログインボタンを表示
            if (loginItem) loginItem.style.display = 'block';
            if (logoutItem) logoutItem.style.display = 'none';
        }
    }
    
    // マイレビュー表示
    async handleMyReviews() {
        this.closeMenu();
        
        if (!this.currentUser) {
            alert('ログインが必要です');
            return;
        }
        
        // マイレビューモーダルを表示
        this.showMyReviewsModal();
    }
    
    // マイ統計表示
    async handleMyStats() {
        this.closeMenu();
        
        if (!this.currentUser) {
            alert('ログインが必要です');
            return;
        }
        
        // 統計モーダルを表示
        this.showMyStatsModal();
    }
    
    // アプリについて
    handleAbout() {
        this.closeMenu();
        this.showAboutModal();
    }
    
    // ログアウト処理
    async handleLogout() {
        if (confirm('ログアウトしますか？')) {
            this.closeMenu();
            
            try {
                // auth.jsのログアウト機能を利用
                if (window.authManager) {
                    await window.authManager.signOut();
                } else {
                    // フォールバック
                    await supabase.auth.signOut();
                    window.location.reload();
                }
            } catch (error) {
                console.error('❌ ログアウトエラー:', error);
                alert('ログアウトに失敗しました');
            }
        }
    }
    
    // レビューに店舗情報を追加
    async enrichReviewsWithStoreData(reviews) {
        if (!reviews || reviews.length === 0) return [];
        
        try {
            // 店舗IDのリストを取得
            const storeIds = [...new Set(reviews.map(r => r.store_id))];
            
            // 店舗情報を取得
            const { data: stores, error } = await supabase
                .from('stores')
                .select('id, name, category')
                .in('id', storeIds);
            
            if (error) throw error;
            
            // 店舗情報をマップに変換
            const storeMap = {};
            stores.forEach(store => {
                storeMap[store.id] = store;
            });
            
            // レビューに店舗情報を追加
            return reviews.map(review => ({
                ...review,
                store: storeMap[review.store_id] || { name: '不明な店舗', category: '' }
            }));
            
        } catch (error) {
            console.error('店舗情報の取得エラー:', error);
            return reviews;
        }
    }
    
    // マイレビューモーダル表示
    async showMyReviewsModal() {
        if (!this.currentUser) return;
        
        try {
            // ユーザーのレビューを取得
            const { data: reviews, error } = await supabase
                .from('store_reviews')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // 店舗情報を追加で取得
            const reviewsWithStores = await this.enrichReviewsWithStoreData(reviews || []);
            
            // モーダルを表示
            this.displayMyReviews(reviewsWithStores);
            
        } catch (error) {
            console.error('❌ マイレビュー取得エラー:', error);
            alert('レビューの取得に失敗しました');
        }
    }
    
    // マイレビュー表示
    displayMyReviews(reviews) {
        const modalHTML = `
            <div class="modal" id="myReviewsModal" style="display: block;">
                <div class="modal-content" style="max-width: 800px;">
                    <span class="close-btn" onclick="document.getElementById('myReviewsModal').remove()">&times;</span>
                    <div class="modal-header">
                        <h2>📝 マイレビュー (${reviews.length}件)</h2>
                    </div>
                    <div class="my-reviews-list">
                        ${reviews.length > 0 ? 
                            reviews.map(review => this.generateMyReviewHTML(review)).join('') :
                            '<div class="no-reviews">まだレビューを投稿していません</div>'
                        }
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // モーダル外クリックで閉じる
        const modal = document.getElementById('myReviewsModal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // マイレビューHTML生成
    generateMyReviewHTML(review) {
        const isEdited = new Date(review.updated_at) - new Date(review.created_at) > 60000;
        const dateStr = isEdited ? 
            `${this.formatDate(review.created_at)} ✏️ ${this.formatDate(review.updated_at)}に編集` :
            this.formatDate(review.created_at);
        
        return `
            <div class="my-review-item">
                <div class="my-review-header">
                    <h4>🏪 ${review.store?.name || '店舗名不明'}</h4>
                    <span class="store-category category-${review.store?.category}">${review.store?.category || ''}</span>
                </div>
                <div class="my-review-content">${review.comment}</div>
                <div class="my-review-footer">
                    <span class="my-review-date">📅 ${dateStr}</span>
                    <span class="my-review-status ${review.is_public ? 'public' : 'private'}">
                        ${review.is_public ? '🌐 公開' : '🔒 非公開'}
                    </span>
                </div>
            </div>
        `;
    }
    
    // 統計モーダル表示
    showMyStatsModal() {
        const modalHTML = `
            <div class="modal" id="myStatsModal" style="display: block;">
                <div class="modal-content" style="max-width: 600px;">
                    <span class="close-btn" onclick="document.getElementById('myStatsModal').remove()">&times;</span>
                    <div class="modal-header">
                        <h2>📊 統計・実績</h2>
                    </div>
                    <div class="stats-content">
                        <div class="stats-item">
                            <div class="stats-icon">📝</div>
                            <div class="stats-details">
                                <div class="stats-number">${this.userStats?.reviewCount || 0}</div>
                                <div class="stats-label">レビュー投稿数</div>
                            </div>
                        </div>
                        <div class="stats-item">
                            <div class="stats-icon">👤</div>
                            <div class="stats-details">
                                <div class="stats-number">${this.userProfile?.nickname || 'なし'}</div>
                                <div class="stats-label">ニックネーム</div>
                            </div>
                        </div>
                        <div class="stats-item">
                            <div class="stats-icon">📅</div>
                            <div class="stats-details">
                                <div class="stats-number">${this.formatDate(this.userProfile?.created_at) || 'なし'}</div>
                                <div class="stats-label">参加日</div>
                            </div>
                        </div>
                        <p style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
                            今後さらに詳細な統計機能を追加予定です！
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // モーダル外クリックで閉じる
        const modal = document.getElementById('myStatsModal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // アプリについてモーダル
    showAboutModal() {
        const modalHTML = `
            <div class="modal" id="aboutModal" style="display: block;">
                <div class="modal-content" style="max-width: 600px;">
                    <span class="close-btn" onclick="document.getElementById('aboutModal').remove()">&times;</span>
                    <div class="modal-header">
                        <h2>ℹ️ このアプリについて</h2>
                    </div>
                    <div class="about-content">
                        <div class="about-section">
                            <h3>🗾 グルテンフリーマップ</h3>
                            <p>日本全国のグルテンフリー対応店舗を共有するコミュニティプラットフォームです。</p>
                        </div>
                        
                        <div class="about-section">
                            <h3>✨ 主な機能</h3>
                            <ul>
                                <li>📍 全国のGF店舗検索</li>
                                <li>💬 レビュー投稿・閲覧</li>
                                <li>👤 プロフィール管理</li>
                                <li>📊 統計・実績表示</li>
                                <li>🔍 高度な検索機能</li>
                            </ul>
                        </div>
                        
                        <div class="about-section">
                            <h3>🎯 運営理念</h3>
                            <p>グルテンフリー生活を送る方々が、安心して食事を楽しめる情報を共有し、支え合うコミュニティを目指しています。</p>
                        </div>
                        
                        <div class="about-section">
                            <h3>👥 提供</h3>
                            <p><strong>ビヨグル倶楽部 presents by naco</strong></p>
                        </div>
                        
                        <div class="about-version">
                            <small>Version 2.0 - Review System Edition</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // モーダル外クリックで閉じる
        const modal = document.getElementById('aboutModal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // 日付フォーマット
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
    }
}

// グローバルインスタンス作成
window.hamburgerMenu = new HamburgerMenu();