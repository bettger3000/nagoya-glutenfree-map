// Supabase 認証管理スクリプト
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase設定
const SUPABASE_URL = 'https://lywfaolwvkewuouvkzlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5d2Zhb2x3dmtld3VvdXZremxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MDg2NjcsImV4cCI6MjA2OTk4NDY2N30.wBGCHOLbP6ew7Bnvxrq0sKSm1EnHk5NNE1sWWH7ff60';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
                    console.log('🚪 ログアウト完了');
                    this.handleAuthSignOut();
                    break;
                    
                case 'TOKEN_REFRESHED':
                    console.log('🔄 トークン更新完了');
                    break;
                    
                default:
                    console.log(`ℹ️ 認証イベント: ${event}`);
            }
        });
    }

    // ログイン成功時の処理
    async handleAuthSuccess(user) {
        this.currentUser = user;
        console.log('🎉 認証成功:', user.email);
        
        // プロフィール作成/更新
        await this.ensureUserProfile(user);
        
        // ページリダイレクト処理
        if (window.location.pathname.includes('login.html')) {
            this.showSuccessMessage('ログイン成功！地図ページに移動します...');
            setTimeout(() => {
                window.location.href = 'map.html';
            }, 2000);
        }
    }

    // ログアウト時の処理
    handleAuthSignOut() {
        this.currentUser = null;
        this.isAllowedUser = false;
        
        // ログインページへリダイレクト
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    // ユーザープロフィールの確保
    async ensureUserProfile(user) {
        try {
            // 既存プロフィールをチェック
            const { data: existingProfile, error: fetchError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('プロフィール取得エラー:', fetchError);
                return;
            }

            // プロフィールが存在しない場合は作成
            if (!existingProfile) {
                const { error: insertError } = await supabase
                    .from('user_profiles')
                    .insert({
                        id: user.id,
                        email: user.email,
                        name: user.user_metadata?.full_name || user.email,
                        avatar_emoji: '🍰',
                        created_at: new Date().toISOString()
                    });

                if (insertError) {
                    console.error('プロフィール作成エラー:', insertError);
                } else {
                    console.log('✅ 新規プロフィール作成完了');
                }
            }
        } catch (error) {
            console.error('プロフィール処理エラー:', error);
        }
    }

    // Googleログイン実行
    async signInWithGoogle() {
        try {
            this.showLoading(true);
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/map.html`
                }
            });

            if (error) {
                console.error('Google認証エラー:', error);
                this.showError('ログインに失敗しました。もう一度お試しください。');
                this.showLoading(false);
            }
        } catch (error) {
            console.error('認証処理エラー:', error);
            this.showError('認証処理中にエラーが発生しました。');
            this.showLoading(false);
        }
    }

    // ログアウト実行
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('ログアウトエラー:', error);
            } else {
                console.log('✅ ログアウト完了');
            }
        } catch (error) {
            console.error('ログアウト処理エラー:', error);
        }
    }

    // UI操作メソッド
    showLoading(show) {
        const loadingElement = document.getElementById('loadingIndicator');
        const loginBtn = document.getElementById('googleLoginBtn');
        
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
        if (loginBtn) {
            loginBtn.style.display = show ? 'none' : 'flex';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // 5秒後に非表示
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }

    showSuccessMessage(message) {
        const successElement = document.getElementById('successMessage');
        if (successElement) {
            successElement.textContent = message;
            successElement.style.display = 'block';
        }
    }

    // 現在のユーザー取得
    getCurrentUser() {
        return this.currentUser;
    }

    // 認証状態チェック
    isAuthenticated() {
        return !!this.currentUser;
    }
}

// グローバルインスタンス作成
const authManager = new AuthManager();

// ページ読み込み完了時の処理
document.addEventListener('DOMContentLoaded', () => {
    // ログインボタンのイベントリスナー
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            authManager.signInWithGoogle();
        });
    }
});

// グローバルアクセス用にエクスポート
window.authManager = authManager;
window.supabase = supabase;