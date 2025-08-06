// プロフィール管理スクリプト
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

// DOM要素
let currentUser = null;
let currentProfile = null;
let nicknameCheckTimeout = null;
let userReviews = [];
let currentFilter = 'all';

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
        
        // レビュー一覧を読み込み・表示
        await loadUserReviews();
        
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

// ユーザーレビューを読み込み
async function loadUserReviews() {
    if (!currentUser) return;
    
    try {
        console.log('📝 ユーザーレビューを読み込み中...');
        
        const { data, error } = await supabase
            .from('store_reviews')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        userReviews = data || [];
        
        // 店舗情報を追加で取得
        if (userReviews.length > 0) {
            const storeIds = [...new Set(userReviews.map(r => r.store_id))];
            const { data: stores, error: storeError } = await supabase
                .from('stores')
                .select('id, name, category, address')
                .in('id', storeIds);
            
            if (!storeError && stores) {
                const storeMap = {};
                stores.forEach(store => {
                    storeMap[store.id] = store;
                });
                
                userReviews = userReviews.map(review => ({
                    ...review,
                    store: storeMap[review.store_id] || { name: '不明な店舗', category: '', address: '' }
                }));
            }
        }
        
        console.log(`✅ ${userReviews.length}件のレビューを取得`);
        
        // レビューセクションを表示
        displayReviewsSection();
        
    } catch (error) {
        console.error('❌ レビュー取得エラー:', error);
        userReviews = [];
        displayReviewsSection();
    }
}

// レビューセクション表示
function displayReviewsSection() {
    const reviewsSection = document.getElementById('profileReviewsSection');
    
    if (userReviews.length === 0) {
        // レビューがない場合は非表示
        reviewsSection.style.display = 'none';
        return;
    }
    
    // 統計情報を更新
    updateReviewsStats();
    
    // レビュー一覧を表示
    renderReviews();
    
    // セクションを表示
    reviewsSection.style.display = 'block';
}

// レビュー統計更新
function updateReviewsStats() {
    const statsElement = document.getElementById('profileReviewsStats');
    const publicCount = userReviews.filter(r => r.is_public).length;
    const privateCount = userReviews.filter(r => !r.is_public).length;
    
    statsElement.innerHTML = `
        <span><i class="fas fa-comment"></i> ${userReviews.length}件</span>
        <span><i class="fas fa-eye"></i> 公開 ${publicCount}件</span>
        <span><i class="fas fa-eye-slash"></i> 非公開 ${privateCount}件</span>
    `;
}

// レビュー表示
function renderReviews() {
    const reviewsList = document.getElementById('profileReviewsList');
    
    // フィルター適用
    let filteredReviews = userReviews;
    if (currentFilter === 'public') {
        filteredReviews = userReviews.filter(r => r.is_public);
    } else if (currentFilter === 'private') {
        filteredReviews = userReviews.filter(r => !r.is_public);
    }
    
    if (filteredReviews.length === 0) {
        reviewsList.innerHTML = '<div class="no-profile-reviews">該当するレビューはありません</div>';
        return;
    }
    
    reviewsList.innerHTML = filteredReviews
        .map(review => generateProfileReviewHTML(review))
        .join('');
    
    // イベントリスナー設定
    setupReviewActionListeners();
}

// プロフィール用レビューHTML生成
function generateProfileReviewHTML(review) {
    const isEdited = new Date(review.updated_at) - new Date(review.created_at) > 60000;
    const dateStr = isEdited ? 
        `${formatDate(review.created_at)} ✏️ ${formatDate(review.updated_at)}に編集` :
        formatDate(review.created_at);
    
    const storeName = review.store?.name || '店舗名不明';
    const storeCategory = review.store?.category || '';
    
    const sanitizedStoreName = sanitizeHTML(storeName);
    const sanitizedCategory = sanitizeHTML(storeCategory);
    
    return `
        <div class="profile-review-item" data-review-id="${review.id}">
            <div class="profile-review-header">
                <div class="profile-review-store">
                    <div class="profile-review-store-name">
                        <i class="fas fa-store"></i>
                        ${sanitizedStoreName}
                    </div>
                    ${sanitizedCategory ? `<span class="store-category category-${sanitizedCategory}">${sanitizedCategory}</span>` : ''}
                </div>
                <div class="profile-review-actions">
                    <button class="profile-review-edit-btn" data-review-id="${review.id}" data-store-name="${sanitizedStoreName}" title="編集">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="profile-review-delete-btn" data-review-id="${review.id}" title="削除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="profile-review-content">
                ${sanitizeHTML(review.comment)}
            </div>
            
            <div class="profile-review-footer">
                <div class="profile-review-date">
                    <i class="fas fa-calendar"></i>
                    ${sanitizeHTML(dateStr)}
                </div>
                <div class="profile-review-status ${review.is_public ? 'public' : 'private'}">
                    <i class="fas fa-${review.is_public ? 'eye' : 'eye-slash'}"></i>
                    ${review.is_public ? '公開' : '非公開'}
                </div>
            </div>
        </div>
    `;
}

// レビューアクションのイベントリスナー
function setupReviewActionListeners() {
    // 編集ボタン
    document.querySelectorAll('.profile-review-edit-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const reviewId = e.currentTarget.dataset.reviewId;
            const storeName = e.currentTarget.dataset.storeName;
            await handleEditReview(reviewId, storeName);
        });
    });
    
    // 削除ボタン
    document.querySelectorAll('.profile-review-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const reviewId = e.currentTarget.dataset.reviewId;
            await handleDeleteReview(reviewId);
        });
    });
}

// レビュー編集処理
async function handleEditReview(reviewId, storeName) {
    const review = userReviews.find(r => r.id === reviewId);
    if (!review) return;
    
    // レビューシステムの編集モーダルを使用
    if (window.reviewSystem) {
        await window.reviewSystem.openReviewModal(review.store_id, storeName);
    } else {
        alert('レビュー編集機能の読み込みに失敗しました。');
    }
}

// レビュー削除処理
async function handleDeleteReview(reviewId) {
    if (!confirm('このレビューを削除しますか？')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('store_reviews')
            .delete()
            .eq('id', reviewId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        console.log('✅ レビュー削除完了');
        
        // レビュー一覧を再読み込み
        await loadUserReviews();
        
        showSuccess('レビューを削除しました。');
        
    } catch (error) {
        console.error('❌ レビュー削除エラー:', error);
        showError('削除に失敗しました。再度お試しください。');
    }
}

// 日付フォーマット
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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
    
    // レビューフィルターボタン
    document.querySelectorAll('.reviews-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.reviews-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderReviews();
        });
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
                .select('*')
                .single();
            
            if (error) throw error;
            
            currentProfile = data;
            console.log('✅ プロフィール更新完了:', data.nickname);
            
        } else {
            // 新規作成
            const { data, error } = await supabase
                .from('user_profiles')
                .insert(profileData)
                .select('*')
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
    
    // 基本的な文字チェック（危険な文字のみ除外）
    // HTMLタグや制御文字を除外
    const dangerousPattern = /[<>\"'&\x00-\x1F\x7F]/;
    if (dangerousPattern.test(nickname)) {
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