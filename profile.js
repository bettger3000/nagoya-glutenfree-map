// プロフィール管理スクリプト
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase設定
const SUPABASE_URL = 'https://lywfaolwvkewuouvkzlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5d2Zhb2x3dmtld3VvdXZremxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MDg2NjcsImV4cCI6MjA2OTk4NDY2N30.wBGCHOLbP6ew7Bnvxrq0sKSm1EnHk5NNE1sWWH7ff60';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM要素
let currentUser = null;
let currentProfile = null;
let nicknameCheckTimeout = null;

// 初期化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔧 プロフィール設定を初期化中...');
    
    try {
        // 認証状態を確認
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('❌ セッション取得エラー:', error);
            redirectToLogin();
            return;
        }
        
        if (!session) {
            console.log('ℹ️ 未認証ユーザー');
            redirectToLogin();
            return;
        }
        
        currentUser = session.user;
        console.log('✅ 認証済みユーザー:', currentUser.email);
        
        // 既存プロフィールを取得
        await loadUserProfile();
        
        // イベントリスナーを設定
        setupEventListeners();
        
    } catch (error) {
        console.error('❌ 初期化エラー:', error);
        showError('初期化に失敗しました。ページを再読み込みしてください。');
    }
});

// ユーザープロフィールを読み込み
async function loadUserProfile() {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = レコードなし
            throw error;
        }
        
        if (data) {
            currentProfile = data;
            console.log('✅ 既存プロフィールを読み込み:', data.nickname);
            
            // フォームに既存データを設定
            document.getElementById('nickname').value = data.nickname;
            document.getElementById('bio').value = data.bio || '';
        } else {
            console.log('ℹ️ 新規プロフィール作成');
        }
        
    } catch (error) {
        console.error('❌ プロフィール読み込みエラー:', error);
        showError('プロフィール情報の取得に失敗しました。');
    }
}

// イベントリスナーの設定
function setupEventListeners() {
    // ニックネーム入力時のリアルタイムチェック
    document.getElementById('nickname').addEventListener('input', function(e) {
        const nickname = e.target.value.trim();
        
        // 前回のタイムアウトをクリア
        clearTimeout(nicknameCheckTimeout);
        
        if (nickname.length < 2) {
            updateNicknameStatus('2文字以上入力してください', false);
            return;
        }
        
        if (nickname.length > 20) {
            updateNicknameStatus('20文字以内で入力してください', false);
            return;
        }
        
        // 500ms後にチェック実行
        nicknameCheckTimeout = setTimeout(() => {
            checkNicknameAvailability(nickname);
        }, 500);
    });
    
    // フォーム送信
    document.getElementById('profileForm').addEventListener('submit', handleFormSubmit);
    
    // キャンセルボタン
    document.getElementById('cancelBtn').addEventListener('click', function() {
        window.location.href = 'map.html';
    });
}

// ニックネームの利用可能性をチェック
async function checkNicknameAvailability(nickname) {
    try {
        updateNicknameStatus('チェック中...', null);
        
        // 現在のニックネームと同じ場合はOK
        if (currentProfile && currentProfile.nickname === nickname) {
            updateNicknameStatus('現在のニックネームです', true);
            return;
        }
        
        const { data, error } = await supabase
            .from('user_profiles')
            .select('nickname')
            .eq('nickname', nickname);
        
        if (error) {
            throw error;
        }
        
        if (data && data.length > 0) {
            updateNicknameStatus('このニックネームは既に使用されています', false);
        } else {
            updateNicknameStatus('利用可能です', true);
        }
        
    } catch (error) {
        console.error('❌ ニックネームチェックエラー:', error);
        updateNicknameStatus('チェックに失敗しました', false);
    }
}

// ニックネームステータスを更新
function updateNicknameStatus(message, isAvailable) {
    const statusElement = document.getElementById('nicknameStatus');
    statusElement.textContent = message;
    
    statusElement.className = 'nickname-status';
    if (isAvailable === true) {
        statusElement.classList.add('nickname-available');
    } else if (isAvailable === false) {
        statusElement.classList.add('nickname-unavailable');
    }
}

// フォーム送信処理
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const nickname = formData.get('nickname').trim();
    const bio = formData.get('bio').trim();
    
    if (!validateForm(nickname)) {
        return;
    }
    
    try {
        setLoading(true);
        
        const profileData = {
            user_id: currentUser.id,
            nickname: nickname,
            bio: bio || null,
            updated_at: new Date().toISOString()
        };
        
        if (currentProfile) {
            // 更新
            const { data, error } = await supabase
                .from('user_profiles')
                .update(profileData)
                .eq('user_id', currentUser.id)
                .select()
                .single();
            
            if (error) throw error;
            
            currentProfile = data;
            console.log('✅ プロフィール更新完了:', data.nickname);
            
        } else {
            // 新規作成
            const { data, error } = await supabase
                .from('user_profiles')
                .insert(profileData)
                .select()
                .single();
            
            if (error) throw error;
            
            currentProfile = data;
            console.log('✅ プロフィール作成完了:', data.nickname);
        }
        
        showSuccess('プロフィールを保存しました！');
        
        // 3秒後にマップページに戻る
        setTimeout(() => {
            window.location.href = 'map.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ プロフィール保存エラー:', error);
        
        if (error.code === '23505') { // unique_violation
            showError('このニックネームは既に使用されています。別の名前をお試しください。');
        } else {
            showError('保存に失敗しました。再度お試しください。');
        }
        
        setLoading(false);
    }
}

// フォームバリデーション
function validateForm(nickname) {
    if (nickname.length < 2) {
        showError('ニックネームは2文字以上で入力してください。');
        return false;
    }
    
    if (nickname.length > 20) {
        showError('ニックネームは20文字以内で入力してください。');
        return false;
    }
    
    // 基本的な文字チェック
    const allowedPattern = /^[a-zA-Z0-9ぁ-んァ-ヶ一-龠々ー\s\-_]+$/;
    if (!allowedPattern.test(nickname)) {
        showError('ニックネームに使用できない文字が含まれています。');
        return false;
    }
    
    return true;
}

// ローディング状態の切り替え
function setLoading(isLoading) {
    const saveBtn = document.getElementById('saveBtn');
    const loading = saveBtn.querySelector('.loading');
    const text = saveBtn.querySelector('.text');
    
    if (isLoading) {
        loading.style.display = 'inline-block';
        text.style.display = 'none';
        saveBtn.disabled = true;
    } else {
        loading.style.display = 'none';
        text.style.display = 'inline-flex';
        saveBtn.disabled = false;
    }
}

// エラーメッセージ表示
function showError(message) {
    const messageArea = document.getElementById('messageArea');
    messageArea.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i> ${message}
        </div>
    `;
    
    // 3秒後に消す
    setTimeout(() => {
        messageArea.innerHTML = '';
    }, 5000);
}

// 成功メッセージ表示
function showSuccess(message) {
    const messageArea = document.getElementById('messageArea');
    messageArea.innerHTML = `
        <div class="success-message">
            <i class="fas fa-check-circle"></i> ${message}
        </div>
    `;
}

// ログインページにリダイレクト
function redirectToLogin() {
    window.location.href = 'login.html';
}