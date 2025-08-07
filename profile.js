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
let selectedEmoji = '👤';
let selectedColor = '#4A90E2';
let uploadedImageUrl = null;

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
        
        // アバター機能の初期化
        initializeAvatarFeatures();
        
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
        
        // アバターカラムが存在するか確認してからデータを構築
        const profileData = {
            user_id: currentUser.id,
            nickname: nickname,
            bio: bio || null,
            updated_at: new Date().toISOString()
        };
        
        // アバター関連のフィールドを条件付きで追加（エラー回避）
        try {
            profileData.avatar_url = uploadedImageUrl || null;
            profileData.avatar_emoji = uploadedImageUrl ? null : selectedEmoji;
            profileData.avatar_color = selectedColor;
        } catch (e) {
            console.warn('アバターフィールドはまだデータベースに追加されていません');
        }
        
        if (currentProfile) {
            // 更新
            const { data, error } = await supabase
                .from('user_profiles')
                .update(profileData)
                .eq('user_id', currentUser.id)
                .select('*')
                .single();
            
            if (error) {
                // アバターカラムが存在しない場合の対処
                if (error.code === 'PGRST204' && error.message.includes('avatar_')) {
                    console.warn('アバター機能はデータベース更新後に利用可能になります');
                    // アバター情報を除いたデータで再試行
                    const basicProfileData = {
                        user_id: currentUser.id,
                        nickname: nickname,
                        bio: bio || null,
                        updated_at: new Date().toISOString()
                    };
                    const { data: retryData, error: retryError } = await supabase
                        .from('user_profiles')
                        .update(basicProfileData)
                        .eq('user_id', currentUser.id)
                        .select('*')
                        .single();
                    
                    if (retryError) throw retryError;
                    currentProfile = retryData;
                } else {
                    throw error;
                }
            } else {
                currentProfile = data;
            }
            
            console.log('✅ プロフィール更新完了:', currentProfile?.nickname || nickname);
            
        } else {
            // 新規作成
            const { data, error } = await supabase
                .from('user_profiles')
                .insert(profileData)
                .select('*')
                .single();
            
            if (error) {
                // アバターカラムが存在しない場合の対処
                if (error.code === 'PGRST204' && error.message.includes('avatar_')) {
                    console.warn('アバター機能はデータベース更新後に利用可能になります');
                    // アバター情報を除いたデータで再試行
                    const basicProfileData = {
                        user_id: currentUser.id,
                        nickname: nickname,
                        bio: bio || null
                    };
                    const { data: retryData, error: retryError } = await supabase
                        .from('user_profiles')
                        .insert(basicProfileData)
                        .select('*')
                        .single();
                    
                    if (retryError) throw retryError;
                    currentProfile = retryData;
                } else {
                    throw error;
                }
            } else {
                currentProfile = data;
            }
            
            console.log('✅ プロフィール作成完了:', currentProfile?.nickname || nickname);
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

// アバター機能の初期化
function initializeAvatarFeatures() {
    // 絵文字リスト
    const emojis = [
        '👤', '😀', '😎', '🤓', '😊', '😇', '🥰', '🤗',
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
        '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
        '🍎', '🍊', '🍋', '🍌', '🍓', '🍇', '🍉', '🍑',
        '🌟', '⭐', '🌈', '☀️', '🌙', '⚡', '🔥', '💧'
    ];
    
    // 絵文字グリッドを生成
    const emojiGrid = document.getElementById('emojiGrid');
    if (emojiGrid) {
        emojiGrid.innerHTML = emojis.map(emoji => `
            <div class="emoji-option" data-emoji="${emoji}" onclick="selectEmoji('${emoji}')">
                ${emoji}
            </div>
        `).join('');
    }
    
    // カラーピッカーのイベント
    const colorPicker = document.getElementById('avatarColor');
    if (colorPicker) {
        colorPicker.addEventListener('change', (e) => {
            selectedColor = e.target.value;
            updateAvatarPreview();
        });
    }
    
    // ファイルアップロードのイベント
    const fileInput = document.getElementById('avatarFile');
    if (fileInput) {
        fileInput.addEventListener('change', handleImageUpload);
    }
    
    // 既存のプロフィールからアバターを読み込み
    if (currentProfile) {
        if (currentProfile.avatar_url) {
            uploadedImageUrl = currentProfile.avatar_url;
        }
        if (currentProfile.avatar_emoji) {
            selectedEmoji = currentProfile.avatar_emoji;
        }
        if (currentProfile.avatar_color) {
            selectedColor = currentProfile.avatar_color;
        }
        updateAvatarPreview();
    }
}

// 絵文字選択
window.selectEmoji = function(emoji) {
    selectedEmoji = emoji;
    uploadedImageUrl = null; // 画像をクリア
    
    // 選択状態を更新
    document.querySelectorAll('.emoji-option').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.emoji === emoji) {
            option.classList.add('selected');
        }
    });
    
    updateAvatarPreview();
};

// アバタープレビュー更新
function updateAvatarPreview() {
    const preview = document.getElementById('avatarPreview');
    if (!preview) return;
    
    preview.style.background = selectedColor;
    
    if (uploadedImageUrl) {
        preview.innerHTML = `<img src="${uploadedImageUrl}" alt="Avatar">`;
    } else {
        preview.innerHTML = `<span class="avatar-emoji">${selectedEmoji}</span>`;
    }
}

// アバターモーダルの開閉
window.openAvatarModal = function() {
    const options = document.getElementById('avatarOptions');
    if (options) {
        options.style.display = options.style.display === 'none' ? 'block' : 'none';
    }
};

// 画像アップロード処理
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
        const messageArea = document.getElementById('messageArea');
        if (messageArea) {
            messageArea.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i> 画像は5MB以下にしてください
                </div>
            `;
            setTimeout(() => { messageArea.innerHTML = ''; }, 5000);
        }
        return;
    }
    
    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
        const messageArea = document.getElementById('messageArea');
        if (messageArea) {
            messageArea.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i> 画像ファイルを選択してください
                </div>
            `;
            setTimeout(() => { messageArea.innerHTML = ''; }, 5000);
        }
        return;
    }
    
    try {
        // アップロード中のメッセージを表示
        const messageArea = document.getElementById('messageArea');
        if (messageArea) {
            messageArea.innerHTML = `
                <div class="info-message">
                    <i class="fas fa-spinner fa-spin"></i> アップロード中...
                </div>
            `;
        }
        
        // Supabase Storageにアップロード
        const fileName = `${currentUser.id}-${Date.now()}.${file.name.split('.').pop()}`;
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            });
        
        if (error) throw error;
        
        // 公開URLを取得
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
        
        uploadedImageUrl = publicUrl;
        selectedEmoji = null;
        updateAvatarPreview();
        
        // 成功メッセージを表示
        if (messageArea) {
            messageArea.innerHTML = `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i> 画像をアップロードしました
                </div>
            `;
            setTimeout(() => {
                messageArea.innerHTML = '';
            }, 3000);
        }
    } catch (error) {
        console.error('アップロードエラー:', error);
        
        let errorMessage = '画像のアップロードに失敗しました';
        
        // エラーの種類に応じてメッセージを調整
        if (error.message.includes('Bucket not found')) {
            errorMessage = 'アバター機能の設定が未完了です。管理者にお問い合わせください。';
        } else if (error.message.includes('Row Level Security')) {
            errorMessage = 'アクセス権限がありません。ログインし直してください。';
        }
        
        // エラーメッセージを表示
        const messageArea = document.getElementById('messageArea');
        if (messageArea) {
            messageArea.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i> ${errorMessage}
                </div>
            `;
            setTimeout(() => {
                messageArea.innerHTML = '';
            }, 5000);
        }
    }
}