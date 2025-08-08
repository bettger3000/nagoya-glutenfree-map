// ハンバーガーメニュー管理システム
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
    }
    
    // 現在のユーザー情報を読み込み
    async loadCurrentUser() {
        try {
            if (window.supabase) {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (session) {
                    this.currentUser = session.user;
                    await this.loadUserProfile();
                    await this.loadUserStats();
                }
            }
        } catch (error) {
            console.error('ユーザー情報読み込みエラー:', error);
        }
    }
    
    // ユーザープロフィール読み込み
    async loadUserProfile() {
        if (!this.currentUser) return;
        
        try {
            const { data, error } = await window.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();
                
            if (error) {
                console.error('プロフィール読み込みエラー:', error);
            } else {
                this.userProfile = data;
            }
        } catch (error) {
            console.error('プロフィール取得エラー:', error);
        }
    }
    
    // ユーザー統計読み込み
    async loadUserStats() {
        if (!this.currentUser) return;
        
        try {
            // レビュー数を取得
            const { count: reviewCount } = await window.supabase
                .from('store_reviews')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', this.currentUser.id);
            
            // 訪問済み店舗数を取得
            const { count: visitedCount } = await window.supabase
                .from('store_reviews')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', this.currentUser.id)
                .eq('visited', true);
            
            this.userStats = {
                reviews: reviewCount || 0,
                visited: visitedCount || 0
            };
        } catch (error) {
            console.error('統計読み込みエラー:', error);
            this.userStats = { reviews: 0, visited: 0 };
        }
    }
    
    // イベントリスナー設定
    setupEventListeners() {
        // ハンバーガーボタン
        if (this.hamburgerBtn) {
            this.hamburgerBtn.addEventListener('click', () => this.toggleMenu());
        }
        
        // オーバーレイクリック
        if (this.hamburgerOverlay) {
            this.hamburgerOverlay.addEventListener('click', () => this.closeMenu());
        }
        
        // ESCキーでメニューを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });
        
        // ログアウトボタン
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }
    
    // メニューの開閉切り替え
    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    // メニューを開く
    openMenu() {
        if (!this.hamburgerMenu || !this.hamburgerOverlay) return;
        
        this.isOpen = true;
        this.hamburgerMenu.classList.add('open');
        this.hamburgerOverlay.classList.add('active');
        document.body.classList.add('menu-open');
        
        // ハンバーガーボタンのアニメーション
        if (this.hamburgerBtn) {
            this.hamburgerBtn.classList.add('active');
        }
    }
    
    // メニューを閉じる
    closeMenu() {
        if (!this.hamburgerMenu || !this.hamburgerOverlay) return;
        
        this.isOpen = false;
        this.hamburgerMenu.classList.remove('open');
        this.hamburgerOverlay.classList.remove('active');
        document.body.classList.remove('menu-open');
        
        // ハンバーガーボタンのアニメーション
        if (this.hamburgerBtn) {
            this.hamburgerBtn.classList.remove('active');
        }
    }
    
    // ユーザー表示を更新
    updateUserDisplay() {
        if (this.hamburgerUserName && this.userProfile) {
            const displayName = this.userProfile.name || this.currentUser?.email || 'ゲスト';
            const avatar = this.userProfile.avatar_emoji || '🍰';
            this.hamburgerUserName.innerHTML = `${avatar} ${displayName}`;
        }
        
        if (this.hamburgerUserStats && this.userStats) {
            this.hamburgerUserStats.innerHTML = `
                <div class="stat-item">
                    <span class="stat-number">${this.userStats.reviews}</span>
                    <span class="stat-label">レビュー</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${this.userStats.visited}</span>
                    <span class="stat-label">訪問済み</span>
                </div>
            `;
        }
    }
    
    // ログアウト処理
    async handleLogout() {
        try {
            if (window.authManager) {
                await window.authManager.signOut();
            }
        } catch (error) {
            console.error('ログアウトエラー:', error);
        }
    }
    
    // ユーザー情報を更新（外部から呼び出し可能）
    async refreshUserData() {
        await this.loadCurrentUser();
        this.updateUserDisplay();
    }
}

// グローバルインスタンスを作成
let hamburgerMenu = null;

// 初期化関数
export function initHamburgerMenu() {
    if (!hamburgerMenu) {
        hamburgerMenu = new HamburgerMenu();
    }
    return hamburgerMenu;
}

// グローバルアクセス用
window.initHamburgerMenu = initHamburgerMenu;