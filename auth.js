// 名古屋グルテンフリーマップ v3 - 認証システム
import { getSupabaseClient } from './supabase-client.js';

class AuthSystem {
    constructor() {
        this.supabase = getSupabaseClient();
        this.user = null;
        this.isInitialized = false;
        
        // DOM要素
        this.elements = {
            loginBtn: null,
            userInfo: null,
            logoutBtn: null
        };
        
        console.log('🔐 認証システム初期化開始');
        this.init();
    }
    
    async init() {
        try {
            // DOM要素を取得
            this.getDOMElements();
            
            // 認証状態をチェック
            await this.checkAuthState();
            
            // 認証状態の変更を監視
            this.setupAuthListener();
            
            // UIイベントを設定
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ 認証システム初期化完了');
            
        } catch (error) {
            console.error('❌ 認証システム初期化エラー:', error);
        }
    }
    
    getDOMElements() {
        // 認証関連のDOM要素を取得（動的に生成される場合も考慮）
        try {
            this.elements.loginBtn = document.getElementById('login-btn');
            this.elements.userInfo = document.getElementById('user-info');
            this.elements.logoutBtn = document.getElementById('logout-btn');
            
            if (!this.elements.loginBtn) {
                console.warn('⚠️ ログインボタンが見つかりません');
            }
        } catch (error) {
            console.warn('⚠️ DOM要素取得中にエラー:', error);
        }
    }
    
    async checkAuthState() {
        console.log('🔍 認証状態をチェック中...');
        
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('認証状態チェックエラー:', error);
                return;
            }
            
            if (session && session.user) {
                console.log('✅ ユーザーがログイン中:', session.user.email);
                this.user = session.user;
                this.updateAuthUI(true);
            } else {
                console.log('ℹ️ ユーザーは未ログイン');
                this.user = null;
                this.updateAuthUI(false);
            }
            
        } catch (error) {
            console.error('❌ 認証状態チェック中にエラー:', error);
        }
    }
    
    setupAuthListener() {
        // 認証状態の変更を監視
        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log(`🔄 認証状態変更: ${event}`);
            
            if (event === 'SIGNED_IN' && session) {
                console.log('✅ ユーザーがサインイン:', session.user.email);
                this.user = session.user;
                this.updateAuthUI(true);
                this.onSignIn(session.user);
                
            } else if (event === 'SIGNED_OUT') {
                console.log('👋 ユーザーがサインアウト');
                this.user = null;
                this.updateAuthUI(false);
                this.onSignOut();
                
            } else if (event === 'TOKEN_REFRESHED') {
                console.log('🔄 トークンが更新されました');
            }
        });
    }
    
    setupEventListeners() {
        // ログインボタンのクリックイベント
        if (this.elements.loginBtn) {
            this.elements.loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.signInWithGoogle();
            });
        } else {
            console.warn('⚠️ ログインボタンにイベントリスナーを設定できませんでした');
        }
        
        // ログアウトボタンのクリックイベント
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.signOut();
            });
        }
        
        // 遅延実行でDOM要素を再取得（フォールバック）
        setTimeout(() => {
            this.setupFallbackEventListeners();
        }, 1000);
    }
    
    setupFallbackEventListeners() {
        // DOM要素が後から生成される場合のフォールバック
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (loginBtn && !this.elements.loginBtn) {
            console.log('🔄 フォールバック: ログインボタン発見');
            this.elements.loginBtn = loginBtn;
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.signInWithGoogle();
            });
        }
        
        if (logoutBtn && !this.elements.logoutBtn) {
            console.log('🔄 フォールバック: ログアウトボタン発見');
            this.elements.logoutBtn = logoutBtn;
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.signOut();
            });
        }
    }
    
    async signInWithGoogle() {
        console.log('🔑 Google認証を開始...');
        
        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + window.location.pathname
                }
            });
            
            if (error) {
                console.error('❌ Google認証エラー:', error);
                alert('ログインに失敗しました。もう一度お試しください。');
                return;
            }
            
            console.log('🔄 Google認証プロセス開始');
            
        } catch (error) {
            console.error('❌ Google認証中にエラー:', error);
            alert('ログイン中にエラーが発生しました。');
        }
    }
    
    async signOut() {
        console.log('👋 サインアウト開始...');
        
        try {
            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                console.error('❌ サインアウトエラー:', error);
                alert('ログアウトに失敗しました。');
                return;
            }
            
            console.log('✅ サインアウト完了');
            
        } catch (error) {
            console.error('❌ サインアウト中にエラー:', error);
        }
    }
    
    updateAuthUI(isLoggedIn) {
        if (isLoggedIn && this.user) {
            // ログイン済み表示
            if (this.elements.loginBtn) {
                this.elements.loginBtn.style.display = 'none';
            }
            
            if (this.elements.userInfo) {
                this.elements.userInfo.style.display = 'block';
                this.elements.userInfo.innerHTML = `
                    <div class="user-profile">
                        <img src="${this.user.user_metadata?.avatar_url || 'https://via.placeholder.com/32'}" 
                             alt="プロフィール" class="user-avatar">
                        <span class="user-name">${this.user.user_metadata?.name || this.user.email}</span>
                    </div>
                `;
            }
            
            if (this.elements.logoutBtn) {
                this.elements.logoutBtn.style.display = 'inline-block';
            }
            
        } else {
            // 未ログイン表示
            if (this.elements.loginBtn) {
                this.elements.loginBtn.style.display = 'inline-block';
            }
            
            if (this.elements.userInfo) {
                this.elements.userInfo.style.display = 'none';
            }
            
            if (this.elements.logoutBtn) {
                this.elements.logoutBtn.style.display = 'none';
            }
        }
        
        // ページ全体に認証状態を通知
        document.body.setAttribute('data-auth-state', isLoggedIn ? 'logged-in' : 'logged-out');
    }
    
    // サインイン時のコールバック
    onSignIn(user) {
        console.log('🎉 サインイン成功:', user.email);
        
        // カスタムイベントを発火
        document.dispatchEvent(new CustomEvent('userSignedIn', { 
            detail: { user } 
        }));
        
        // ウェルカムメッセージ
        this.showWelcomeMessage(user);
    }
    
    // サインアウト時のコールバック
    onSignOut() {
        console.log('👋 サインアウト完了');
        
        // カスタムイベントを発火
        document.dispatchEvent(new CustomEvent('userSignedOut'));
        
        // さようならメッセージ
        this.showGoodbyeMessage();
    }
    
    showWelcomeMessage(user) {
        try {
            const name = user.user_metadata?.name || user.email.split('@')[0];
            
            // 一時的な通知を表示
            const notification = document.createElement('div');
            notification.className = 'auth-notification success';
            notification.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>こんにちは、${name}さん！</span>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 3000);
        } catch (error) {
            console.warn('⚠️ ウェルカムメッセージ表示エラー:', error);
        }
    }
    
    showGoodbyeMessage() {
        const notification = document.createElement('div');
        notification.className = 'auth-notification info';
        notification.innerHTML = `
            <i class="fas fa-sign-out-alt"></i>
            <span>ログアウトしました</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }
    
    // 現在のユーザー情報を取得
    getCurrentUser() {
        return this.user;
    }
    
    // ログイン状態を確認
    isAuthenticated() {
        return this.user !== null;
    }
    
    // ユーザーのメールアドレスを取得
    getUserEmail() {
        return this.user?.email || null;
    }
    
    // ユーザー名を取得
    getUserName() {
        return this.user?.user_metadata?.name || this.user?.email?.split('@')[0] || null;
    }
}

// グローバルインスタンス作成
let authSystem = null;

export function getAuthSystem() {
    if (!authSystem) {
        authSystem = new AuthSystem();
    }
    return authSystem;
}

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM読み込み完了 - 認証システム開始');
    getAuthSystem();
});

// グローバルアクセス用
if (typeof window !== 'undefined') {
    window.authSystem = getAuthSystem;
}

export default AuthSystem;