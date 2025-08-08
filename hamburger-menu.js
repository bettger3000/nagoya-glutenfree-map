// ハンバーガーメニュー管理システム
import { getSupabaseClient } from './supabase-client.js';

const supabase = getSupabaseClient();

class HamburgerMenu {
    constructor() {
        this.isOpen = false;
        this.currentUser = null;
        this.userProfile = null;
        this.userStats = null;
        
        // DOM要素は後で取得
        this.hamburgerBtn = null;
        this.hamburgerMenu = null;
        this.hamburgerOverlay = null;
        this.hamburgerUserName = null;
        this.hamburgerUserStats = null;
        
        this.init();
    }
    
    // 初期化
    async init() {
        console.log('🍔 ハンバーガーメニューを初期化中...');
        
        // DOM要素を取得
        this.getDOMElements();
        
        // 現在のユーザー情報を取得
        await this.loadCurrentUser();
        
        // イベントリスナーを設定
        this.setupEventListeners();
        
        // ユーザー情報を更新
        this.updateUserDisplay();
        
        console.log('✅ ハンバーガーメニュー初期化完了');
    }
    
    // DOM要素を取得
    getDOMElements() {
        this.hamburgerBtn = document.getElementById('hamburgerBtn');
        this.hamburgerMenu = document.getElementById('hamburgerMenu');  
        this.hamburgerOverlay = document.getElementById('hamburgerOverlay');
        this.hamburgerUserName = document.getElementById('hamburgerUserName');
        this.hamburgerUserStats = document.getElementById('hamburgerUserStats');
        
        // メニュー項目も確認
        const myReviewsLink = document.getElementById('myReviewsLink');
        const myStatsLink = document.getElementById('myStatsLink');
        const aboutLink = document.getElementById('aboutLink');
        const hamburgerLogout = document.getElementById('hamburgerLogout');
        
        console.log('🔍 詳細DOM要素取得結果:', {
            device: window.innerWidth > 768 ? 'PC' : 'Mobile',
            screenWidth: window.innerWidth,
            btn: !!this.hamburgerBtn,
            menu: !!this.hamburgerMenu,
            overlay: !!this.hamburgerOverlay,
            userName: !!this.hamburgerUserName,
            userStats: !!this.hamburgerUserStats,
            myReviewsLink: !!myReviewsLink,
            myStatsLink: !!myStatsLink,
            aboutLink: !!aboutLink,
            hamburgerLogout: !!hamburgerLogout
        });
        
        // PC版で要素が見つからない場合の特別処理
        if (window.innerWidth > 768 && (!myReviewsLink || !myStatsLink || !aboutLink)) {
            console.error('🚨 PC版でメニュー要素が見つからない！DOM構造を確認:', {
                hamburgerMenu: document.getElementById('hamburgerMenu'),
                menuHTML: document.getElementById('hamburgerMenu')?.innerHTML
            });
        }
        
        // PC版専用デバッグ：要素の計算スタイルを確認
        if (window.innerWidth > 768) {
            [myReviewsLink, myStatsLink, aboutLink].forEach((element, index) => {
                const names = ['myReviewsLink', 'myStatsLink', 'aboutLink'];
                if (element) {
                    const computedStyle = window.getComputedStyle(element);
                    console.log(`🔍 PC版 ${names[index]} 計算スタイル:`, {
                        display: computedStyle.display,
                        visibility: computedStyle.visibility,
                        pointerEvents: computedStyle.pointerEvents,
                        zIndex: computedStyle.zIndex,
                        position: computedStyle.position,
                        opacity: computedStyle.opacity,
                        transform: computedStyle.transform
                    });
                }
            });
        }
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
        if (this.hamburgerBtn && this.hamburgerMenu) {
            this.hamburgerBtn.addEventListener('click', () => {
                this.toggleMenu();
            });
            console.log('✅ ハンバーガーボタンイベント設定完了');
        } else {
            console.error('❌ ハンバーガー要素が見つからない:', {
                btn: !!this.hamburgerBtn,
                menu: !!this.hamburgerMenu
            });
        }
        
        // オーバーレイクリック
        if (this.hamburgerOverlay) {
            this.hamburgerOverlay.addEventListener('click', () => {
                this.closeMenu();
            });
        }
        
        // ESCキーでメニューを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });
        
        // メニュー項目のクリック処理（nullチェック付き）
        const myReviewsLink = document.getElementById('myReviewsLink');
        if (myReviewsLink) {
            myReviewsLink.addEventListener('click', (e) => {
                console.log('🖱️ マイレビューリンククリック', {
                    target: e.target,
                    currentTarget: e.currentTarget,
                    deviceType: window.innerWidth > 768 ? 'PC' : 'Mobile',
                    timestamp: new Date().toLocaleTimeString()
                });
                e.preventDefault();
                e.stopPropagation();
                try {
                    this.handleMyReviews();
                } catch (error) {
                    console.error('❌ マイレビューハンドラエラー:', error);
                }
            });
            
            // PC版でホバー確認
            if (window.innerWidth > 768) {
                myReviewsLink.addEventListener('mouseenter', () => {
                    console.log('🖱️ PC版マイレビューリンクホバー開始');
                });
                myReviewsLink.addEventListener('mouseleave', () => {
                    console.log('🖱️ PC版マイレビューリンクホバー終了');
                });
            }
            
            console.log('✅ マイレビューリンク設定完了');
        } else {
            console.error('❌ myReviewsLink要素が見つからない');
        }
        
        const myStatsLink = document.getElementById('myStatsLink');
        if (myStatsLink) {
            myStatsLink.addEventListener('click', (e) => {
                console.log('🖱️ 統計リンククリック', {
                    target: e.target,
                    deviceType: window.innerWidth > 768 ? 'PC' : 'Mobile',
                    timestamp: new Date().toLocaleTimeString()
                });
                e.preventDefault();
                e.stopPropagation();
                try {
                    this.handleMyStats();
                } catch (error) {
                    console.error('❌ 統計ハンドラエラー:', error);
                }
            });
            
            if (window.innerWidth > 768) {
                myStatsLink.addEventListener('mouseenter', () => {
                    console.log('🖱️ PC版統計リンクホバー開始');
                });
            }
            
            console.log('✅ 統計リンク設定完了');
        } else {
            console.error('❌ myStatsLink要素が見つからない');
        }
        
        const aboutLink = document.getElementById('aboutLink');
        if (aboutLink) {
            aboutLink.addEventListener('click', (e) => {
                console.log('🖱️ このアプリについてリンククリック', {
                    target: e.target,
                    deviceType: window.innerWidth > 768 ? 'PC' : 'Mobile',
                    timestamp: new Date().toLocaleTimeString()
                });
                e.preventDefault();
                e.stopPropagation();
                try {
                    this.handleAbout();
                } catch (error) {
                    console.error('❌ このアプリについてハンドラエラー:', error);
                }
            });
            
            if (window.innerWidth > 768) {
                aboutLink.addEventListener('mouseenter', () => {
                    console.log('🖱️ PC版このアプリについてリンクホバー開始');
                });
            }
            
            console.log('✅ このアプリについてリンク設定完了');
        } else {
            console.error('❌ aboutLink要素が見つからない');
        }
        
        const hamburgerLogout = document.getElementById('hamburgerLogout');
        if (hamburgerLogout) {
            hamburgerLogout.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
            console.log('✅ ログアウトリンク設定完了');
        }
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
        // DOM要素を再取得（確実性のため）
        const btn = document.getElementById('hamburgerBtn');
        const menu = document.getElementById('hamburgerMenu');
        const overlay = document.getElementById('hamburgerOverlay');
        
        if (!menu) {
            console.error('❌ メニュー要素が見つかりません');
            return;
        }
        
        // 最新のユーザー情報を取得
        await this.loadCurrentUser();
        this.updateUserDisplay();
        
        this.isOpen = true;
        if (btn) btn.classList.add('active');
        menu.classList.add('show');
        if (overlay) overlay.classList.add('show');
        
        // スクロールを無効化
        document.body.style.overflow = 'hidden';
        
        console.log('✅ メニューを開きました');
    }
    
    // メニューを閉じる
    closeMenu() {
        // DOM要素を再取得（確実性のため）
        const btn = document.getElementById('hamburgerBtn');
        const menu = document.getElementById('hamburgerMenu');
        const overlay = document.getElementById('hamburgerOverlay');
        
        this.isOpen = false;
        if (btn) btn.classList.remove('active');
        if (menu) menu.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
        
        // スクロールを復活
        document.body.style.overflow = '';
        
        console.log('✅ メニューを閉じました');
    }
    
    // ユーザー表示を更新
    updateUserDisplay() {
        const loginItem = document.getElementById('hamburgerLoginItem');
        const logoutItem = document.getElementById('hamburgerLogoutItem');
        const avatarElement = document.querySelector('.hamburger-user-avatar');
        const userName = document.getElementById('hamburgerUserName');
        const userStats = document.getElementById('hamburgerUserStats');
        
        if (this.currentUser && this.userProfile) {
            if (userName) userName.textContent = this.userProfile.nickname || 'ユーザー';
            
            if (userStats) {
                if (this.userStats) {
                    userStats.textContent = `レビュー ${this.userStats.reviewCount}件投稿`;
                } else {
                    userStats.textContent = 'データ読み込み中...';
                }
            }
            
            // アバター画像を設定
            this.updateAvatarDisplay(avatarElement);
            
            // ログイン済み：ログアウトボタンを表示
            if (loginItem) loginItem.style.display = 'none';
            if (logoutItem) logoutItem.style.display = 'block';
            
        } else if (this.currentUser) {
            if (userName) userName.textContent = 'プロフィール未設定';
            if (userStats) userStats.textContent = 'プロフィールを設定してください';
            
            // デフォルトアバターを表示
            this.updateAvatarDisplay(avatarElement);
            
            // ログイン済み（プロフィール未設定）：ログアウトボタンを表示
            if (loginItem) loginItem.style.display = 'none';
            if (logoutItem) logoutItem.style.display = 'block';
            
        } else {
            if (userName) userName.textContent = '未ログイン';
            if (userStats) userStats.textContent = 'ログインしてください';
            
            // デフォルトアバターを表示
            this.updateAvatarDisplay(avatarElement);
            
            // 未ログイン：ログインボタンを表示
            if (loginItem) loginItem.style.display = 'block';
            if (logoutItem) logoutItem.style.display = 'none';
        }
    }
    
    // アバター表示を更新
    updateAvatarDisplay(avatarElement) {
        if (!avatarElement) return;
        
        // アバターURLが設定されているかチェック
        const avatarUrl = this.userProfile?.avatar_url;
        
        if (avatarUrl) {
            // アバター画像を表示
            avatarElement.innerHTML = `<img src="${avatarUrl}" alt="アバター" class="hamburger-avatar-img">`;
        } else {
            // デフォルトのアイコンを表示
            avatarElement.innerHTML = '<i class="fas fa-user-circle"></i>';
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

// DOMContentLoaded後にインスタンス作成
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔄 DOM準備完了、ハンバーガーメニューを初期化');
        window.hamburgerMenu = new HamburgerMenu();
        
        // 強制的なフォールバック: 確実にイベント設定
        setTimeout(() => {
            const btn = document.getElementById('hamburgerBtn');
            const menu = document.getElementById('hamburgerMenu');
            
            // ハンバーガーボタンのフォールバック
            if (btn && menu) {
                console.log('🔧 強制フォールバック: ハンバーガーボタン設定');
                btn.onclick = function() {
                    menu.classList.toggle('show');
                    console.log('強制フォールバック: メニュー切り替え');
                };
            }
            
            // メニュー項目の強制フォールバック（buttonタグ対応）
            const myReviewsLink = document.getElementById('myReviewsLink');
            const myStatsLink = document.getElementById('myStatsLink');
            const aboutLink = document.getElementById('aboutLink');
            
            console.log('🔍 強制フォールバック要素チェック:', {
                myReviewsLink: !!myReviewsLink,
                myStatsLink: !!myStatsLink,
                aboutLink: !!aboutLink,
                myReviewsTagName: myReviewsLink?.tagName,
                myStatsTagName: myStatsLink?.tagName,
                aboutTagName: aboutLink?.tagName
            });
            
            if (myReviewsLink) {
                console.log('🔧 強制フォールバック: マイレビューボタン設定');
                myReviewsLink.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🖱️ 強制フォールバック: マイレビュークリック');
                    alert('マイレビュー機能（強制フォールバック）\n\nPC版で正常に動作しています！');
                    menu.classList.remove('show');
                };
            }
            
            if (myStatsLink) {
                console.log('🔧 強制フォールバック: 統計ボタン設定');
                myStatsLink.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🖱️ 強制フォールバック: 統計クリック');
                    alert('統計・実績機能（強制フォールバック）\n\nPC版で正常に動作しています！');
                    menu.classList.remove('show');
                };
            }
            
            if (aboutLink) {
                console.log('🔧 強制フォールバック: このアプリについてボタン設定');
                aboutLink.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🖱️ 強制フォールバック: このアプリについてクリック');
                    alert('このアプリについて（強制フォールバック）\n\nPC版で正常に動作しています！');
                    menu.classList.remove('show');
                };
            }
            
            // マウスイベントでも確認
            [myReviewsLink, myStatsLink, aboutLink].forEach((element, index) => {
                if (element) {
                    const names = ['マイレビュー', '統計', 'このアプリについて'];
                    element.onmouseenter = function() {
                        console.log(`🖱️ ${names[index]}ホバー検知`);
                        element.style.backgroundColor = 'rgba(152, 216, 200, 0.2)';
                    };
                    element.onmouseleave = function() {
                        element.style.backgroundColor = '';
                    };
                }
            });
            
        }, 2000);
    });
} else {
    // 既にDOMが読み込み済み
    console.log('🔄 DOM既に準備済み、ハンバーガーメニューを初期化');
    window.hamburgerMenu = new HamburgerMenu();
    
    // フォールバック: 手動でイベント設定
    setTimeout(() => {
        const btn = document.getElementById('hamburgerBtn');
        const menu = document.getElementById('hamburgerMenu');
        
        // ハンバーガーボタンのフォールバック
        if (btn && menu && !btn.onclick) {
            console.log('🔧 フォールバック: 手動でハンバーガーボタンクリックイベント設定');
            btn.onclick = function() {
                menu.classList.toggle('show');
                console.log('フォールバック: メニュー切り替え');
            };
        }
        
        // メニュー項目のフォールバック
        const myReviewsLink = document.getElementById('myReviewsLink');
        const myStatsLink = document.getElementById('myStatsLink');
        const aboutLink = document.getElementById('aboutLink');
        
        if (myReviewsLink && !myReviewsLink.onclick) {
            console.log('🔧 フォールバック: マイレビューリンクに手動設定');
            myReviewsLink.onclick = function(e) {
                e.preventDefault();
                console.log('🖱️ フォールバック: マイレビュークリック');
                alert('マイレビュー機能（フォールバック）');
            };
        }
        
        if (myStatsLink && !myStatsLink.onclick) {
            console.log('🔧 フォールバック: 統計リンクに手動設定');
            myStatsLink.onclick = function(e) {
                e.preventDefault();
                console.log('🖱️ フォールバック: 統計クリック');
                alert('統計・実績機能（フォールバック）');
            };
        }
        
        if (aboutLink && !aboutLink.onclick) {
            console.log('🔧 フォールバック: このアプリについてリンクに手動設定');
            aboutLink.onclick = function(e) {
                e.preventDefault();
                console.log('🖱️ フォールバック: このアプリについてクリック');
                alert('このアプリについて（フォールバック）');
            };
        }
        
    }, 1000);
}