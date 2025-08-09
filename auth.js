// Supabase 認証管理スクリプト
import { getSupabaseClient } from './supabase-client.js';

// グローバルSupabaseクライアントを取得
const supabase = getSupabaseClient();

// 認証状態管理クラス
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAllowedUser = false;
        this.init();
    }

    // 初期化処理
    async init() {
        console.log('🔐 認証システムを初期化中...');
        
        try {
            // 現在のセッションを確認
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('❌ セッション取得エラー:', error);
                return;
            }

            if (session) {
                console.log('✅ 既存セッションを発見:', session.user.email);
                await this.handleAuthSuccess(session.user);
            } else {
                console.log('ℹ️ セッションなし - ログインが必要');
            }

            // 認証状態変更の監視を開始
            this.setupAuthListener();
            
        } catch (error) {
            console.error('❌ 認証初期化エラー:', error);
        }
    }

    // 認証状態変更の監視
    setupAuthListener() {
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`🔄 認証状態変更: ${event}`);
            
            switch (event) {
                case 'SIGNED_IN':
                    console.log('✅ ログイン成功:', session?.user?.email);
                    await this.handleAuthSuccess(session.user);
                    break;
                    
                case 'SIGNED_OUT':
                    console.log('📤 ログアウト');
                    this.handleAuthSignOut();
                    break;
                    
                case 'TOKEN_REFRESHED':
                    console.log('🔄 トークン更新');
                    break;
                    
                default:
                    console.log(`ℹ️ 認証イベント: ${event}`);
            }
        });
    }

    // Googleログイン処理
    async signInWithGoogle() {
        try {
            console.log('🚀 Googleログインを開始...');
            this.showLoading(true);
            this.hideMessages();

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: 'https://bettger3000.github.io/nagoya-glutenfree-map/new-map.html',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                }
            });

            if (error) {
                console.error('❌ Googleログインエラー:', error);
                this.showError('Googleログインに失敗しました: ' + error.message);
                return;
            }

            console.log('🔄 Googleログインリダイレクト中...');
            
        } catch (error) {
            console.error('❌ ログイン処理エラー:', error);
            this.showError('ログイン処理中にエラーが発生しました');
        } finally {
            this.showLoading(false);
        }
    }

    // 認証成功時の処理
    async handleAuthSuccess(user) {
        try {
            this.currentUser = user;
            console.log(`👤 ユーザー情報: ${user.email}`);

            // ユーザーが許可リストに含まれているかチェック
            const isAllowed = await this.checkUserPermission(user.email);
            
            if (isAllowed) {
                console.log('✅ 許可されたユーザーです');
                this.isAllowedUser = true;
                
                // プロフィール設定確認
                const hasProfile = await this.checkUserProfile(user.id);
                
                // ログインページにいる場合は適切なページに遷移
                if (window.location.pathname.includes('login.html') || window.location.pathname === '/') {
                    if (!hasProfile) {
                        this.showSuccess('ログインに成功しました。プロフィール設定に移動します...');
                        setTimeout(() => {
                            window.location.href = 'https://bettger3000.github.io/nagoya-glutenfree-map/profile.html';
                        }, 1500);
                    } else {
                        this.showSuccess('ログインに成功しました。地図ページに移動します...');
                        setTimeout(() => {
                            window.location.href = 'https://bettger3000.github.io/nagoya-glutenfree-map/new-map.html';
                        }, 1500);
                    }
                }
            } else {
                console.log('❌ 許可されていないユーザーです');
                this.isAllowedUser = false;
                await this.handleUnauthorizedUser(user.email);
            }
            
        } catch (error) {
            console.error('❌ 認証成功処理エラー:', error);
            this.showError('ユーザー情報の取得に失敗しました');
        }
    }

    // ユーザーの許可状態をチェック
    async checkUserPermission(email) {
        try {
            console.log(`🔍 ユーザー許可チェック: ${email}`);
            
            const { data, error } = await supabase
                .from('allowed_users')
                .select('email')
                .eq('email', email)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // レコードが見つからない場合
                    console.log('❌ 許可リストに含まれていません');
                    return false;
                } else {
                    console.error('❌ 許可チェックエラー:', error);
                    return false;
                }
            }

            console.log('✅ 許可リストに含まれています');
            return true;
            
        } catch (error) {
            console.error('❌ 許可チェック処理エラー:', error);
            return false;
        }
    }

    // ユーザープロフィール存在チェック
    async checkUserProfile(userId) {
        try {
            console.log(`🔍 プロフィール存在チェック: ${userId}`);
            
            const { data, error } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('user_id', userId)
                .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = レコードなし
                throw error;
            }
            
            const hasProfile = !!data;
            console.log(`${hasProfile ? '✅' : 'ℹ️'} プロフィール${hasProfile ? '存在' : '未設定'}`);
            return hasProfile;
            
        } catch (error) {
            console.error('❌ プロフィール存在チェックエラー:', error);
            return false; // エラー時は安全側に倒してプロフィール設定画面に誘導
        }
    }

    // 未許可ユーザーの処理
    async handleUnauthorizedUser(email) {
        console.log(`⛔ 未許可ユーザー: ${email}`);
        
        // ログアウト処理
        await this.signOut();
        
        // エラーメッセージを表示
        const errorMsg = `
            アクセスが許可されていないアカウントです。<br>
            <strong>${email}</strong><br><br>
            このサービスは事前に承認されたGoogleアカウントでのみご利用いただけます。<br>
            アクセス申請については下記までお問い合わせください。
        `;
        
        this.showError(errorMsg);
        
        // ログインページに戻す
        if (!window.location.pathname.includes('login.html')) {
            setTimeout(() => {
                window.location.href = 'https://bettger3000.github.io/nagoya-glutenfree-map/login.html';
            }, 3000);
        }
    }

    // ログアウト処理
    async signOut() {
        try {
            console.log('📤 ログアウト処理開始...');
            
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('❌ ログアウトエラー:', error);
                return;
            }
            
            console.log('✅ ログアウト完了');
            this.handleAuthSignOut();
            
        } catch (error) {
            console.error('❌ ログアウト処理エラー:', error);
        }
    }

    // ログアウト完了処理
    handleAuthSignOut() {
        this.currentUser = null;
        this.isAllowedUser = false;
        
        // ログインページ以外にいる場合はリダイレクト
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'https://bettger3000.github.io/nagoya-glutenfree-map/login.html';
        }
    }

    // 認証が必要なページの保護
    async requireAuth() {
        console.log('🛡️ 認証チェック開始...');
        
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('❌ セッション確認エラー:', error);
                this.redirectToLogin();
                return false;
            }
            
            if (!session || !session.user) {
                console.log('❌ セッションなし - ログインが必要');
                this.redirectToLogin();
                return false;
            }
            
            // ユーザーが許可されているかチェック
            const isAllowed = await this.checkUserPermission(session.user.email);
            
            if (!isAllowed) {
                console.log('❌ 未許可ユーザー - アクセス拒否');
                await this.handleUnauthorizedUser(session.user.email);
                return false;
            }
            
            console.log('✅ 認証OK - アクセス許可');
            this.currentUser = session.user;
            this.isAllowedUser = true;
            return true;
            
        } catch (error) {
            console.error('❌ 認証チェックエラー:', error);
            this.redirectToLogin();
            return false;
        }
    }

    // ログインページへリダイレクト
    redirectToLogin() {
        console.log('🔄 ログインページにリダイレクト...');
        window.location.href = 'https://bettger3000.github.io/nagoya-glutenfree-map/login.html';
    }

    // UI表示制御メソッド
    showLoading(show) {
        const loadingEl = document.getElementById('loadingIndicator');
        const loginBtn = document.getElementById('googleLoginBtn');
        
        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
        }
        
        if (loginBtn) {
            loginBtn.disabled = show;
            loginBtn.style.opacity = show ? '0.7' : '1';
        }
    }

    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.innerHTML = message;
            errorEl.style.display = 'block';
        }
    }

    showSuccess(message) {
        const successEl = document.getElementById('successMessage');
        if (successEl) {
            successEl.innerHTML = message;
            successEl.style.display = 'block';
        }
    }

    hideMessages() {
        const errorEl = document.getElementById('errorMessage');
        const successEl = document.getElementById('successMessage');
        
        if (errorEl) errorEl.style.display = 'none';
        if (successEl) successEl.style.display = 'none';
    }

    // 現在のユーザー情報を取得
    getCurrentUser() {
        return this.currentUser;
    }

    // ユーザーが許可されているかチェック
    isUserAllowed() {
        return this.isAllowedUser;
    }
}

// グローバル認証マネージャーのインスタンスを作成
const authManager = new AuthManager();

// DOM読み込み完了後の処理
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM読み込み完了');
    
    // ログインボタンのイベントリスナー設定
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            await authManager.signInWithGoogle();
        });
        
        console.log('✅ ログインボタン設定完了');
    }
    
    // ログアウトボタンのイベントリスナー設定（map.htmlで使用）
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await authManager.signOut();
        });
        
        console.log('✅ ログアウトボタン設定完了');
    }
    
    // map.htmlの場合は認証チェック
    if (window.location.pathname.includes('map.html')) {
        authManager.requireAuth();
    }
});

// エクスポート（他のスクリプトから使用可能にする）
window.authManager = authManager;
window.supabase = supabase;

// デバッグ用（開発時のみ）
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.auth_debug = {
        signOut: () => authManager.signOut(),
        checkUser: (email) => authManager.checkUserPermission(email),
        getCurrentUser: () => authManager.getCurrentUser(),
        getSession: () => supabase.auth.getSession()
    };
    console.log('🔧 デバッグ機能を有効化: window.auth_debug');
}