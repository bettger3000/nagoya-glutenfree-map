// ユーザープロフィール詳細表示スクリプト
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

// グローバル変数
let targetUserId = null;
let userProfile = null;
let userReviews = [];

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 ユーザープロフィール詳細を初期化中...');
    
    // URLパラメータからユーザーIDを取得
    const urlParams = new URLSearchParams(window.location.search);
    targetUserId = urlParams.get('user');
    
    if (!targetUserId) {
        console.error('❌ ユーザーIDが指定されていません');
        showError();
        return;
    }
    
    console.log('👤 対象ユーザーID:', targetUserId);
    
    // プロフィールデータを読み込み
    loadUserProfile();
});

// ユーザープロフィールを読み込み
async function loadUserProfile() {
    try {
        console.log('📊 ユーザープロフィールを取得中...');
        
        // プロフィール情報を取得
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', targetUserId)
            .single();
        
        if (profileError) {
            if (profileError.code === 'PGRST116') {
                // プロフィールが見つからない場合
                console.warn('⚠️ プロフィールが見つかりません');
                showProfileNotFound();
                return;
            }
            throw profileError;
        }
        
        userProfile = profile;
        console.log('✅ プロフィール取得完了:', profile.nickname);
        
        // レビューを取得
        await loadUserReviews();
        
        // プロフィールを表示
        displayUserProfile();
        
    } catch (error) {
        console.error('❌ プロフィール読み込みエラー:', error);
        showError();
    }
}

// ユーザーレビューを読み込み
async function loadUserReviews() {
    try {
        console.log('📝 ユーザーレビューを取得中...');
        
        const { data: reviews, error: reviewsError } = await supabase
            .from('store_reviews')
            .select('*')
            .eq('user_id', targetUserId)
            .eq('is_public', true) // 公開レビューのみ
            .order('created_at', { ascending: false });
        
        if (reviewsError) throw reviewsError;
        
        userReviews = reviews || [];
        
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
                    store: storeMap[review.store_id] || { 
                        name: '不明な店舗', 
                        category: '', 
                        address: '' 
                    }
                }));
            }
        }
        
        console.log(`✅ ${userReviews.length}件のレビューを取得`);
        
    } catch (error) {
        console.error('❌ レビュー取得エラー:', error);
        userReviews = []; // エラーでも空配列で続行
    }
}

// ユーザープロフィールを表示
async function displayUserProfile() {
    // ローディング状態を非表示
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('userProfileContent').style.display = 'block';
    
    // アバター表示
    const avatarElement = document.getElementById('userAvatarLarge');
    const avatarColor = userProfile.avatar_color || '#4A90E2';
    avatarElement.style.background = avatarColor;
    
    if (userProfile.avatar_url) {
        avatarElement.innerHTML = `<img src="${sanitizeHTML(userProfile.avatar_url)}" alt="アバター">`;
    } else {
        const emoji = userProfile.avatar_emoji || '👤';
        avatarElement.innerHTML = `<span class="avatar-emoji">${sanitizeHTML(emoji)}</span>`;
    }
    
    // ニックネーム表示
    document.getElementById('userNickname').textContent = userProfile.nickname || '匿名ユーザー';
    
    // 自己紹介表示
    const bioElement = document.getElementById('userBio');
    if (userProfile.bio && userProfile.bio.trim()) {
        bioElement.textContent = userProfile.bio;
        bioElement.classList.remove('empty');
    } else {
        bioElement.textContent = 'まだ自己紹介が登録されていません';
        bioElement.classList.add('empty');
    }
    
    // 統計情報表示
    document.getElementById('reviewCount').textContent = userReviews.length;
    
    // 訪問済み店舗数を取得・表示
    await loadAndDisplayVisitedCount();
    
    // レビュー一覧表示
    displayUserReviews();
}

// レビュー一覧を表示
function displayUserReviews() {
    const reviewsList = document.getElementById('userReviewsList');
    
    if (userReviews.length === 0) {
        reviewsList.innerHTML = '<div class="no-reviews">まだレビューがありません</div>';
        return;
    }
    
    reviewsList.innerHTML = userReviews
        .map(review => generateUserReviewHTML(review))
        .join('');
    
    // イベントリスナーを設定
    setupReviewEventListeners();
}

// レビューHTMLを生成
function generateUserReviewHTML(review) {
    const isEdited = new Date(review.updated_at) - new Date(review.created_at) > 60000;
    const dateStr = isEdited ? 
        `${formatDate(review.created_at)} ✏️ ${formatDate(review.updated_at)}に編集` :
        formatDate(review.created_at);
    
    const storeName = review.store?.name || '店舗名不明';
    const storeCategory = review.store?.category || '';
    
    return `
        <div class="user-review-item" data-review-id="${review.id}">
            <div class="user-review-store">
                <i class="fas fa-store"></i>
                <span class="user-review-store-name store-name-link" data-store-id="${review.store_id}" title="マップで確認">
                    ${sanitizeHTML(storeName)}
                </span>
                ${storeCategory ? `<span class="store-category category-${sanitizeHTML(storeCategory)}">${sanitizeHTML(storeCategory)}</span>` : ''}
            </div>
            
            <div class="user-review-content">
                ${sanitizeHTML(review.comment)}
            </div>
            
            <div class="user-review-date">
                <i class="fas fa-calendar"></i>
                ${sanitizeHTML(dateStr)}
            </div>
        </div>
    `;
}

// レビューのイベントリスナーを設定
function setupReviewEventListeners() {
    // 店舗名クリック → マップ画面に移動
    const storeLinks = document.querySelectorAll('.store-name-link');
    storeLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const storeId = e.currentTarget.dataset.storeId;
            console.log('🗺️ 店舗詳細に移動:', storeId);
            window.location.href = `map.html?store=${storeId}`;
        });
    });
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

// プロフィールが見つからない場合の表示
function showProfileNotFound() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.querySelector('#errorState p').textContent = 'このユーザーのプロフィールが見つかりませんでした';
}

// 訪問済み店舗数を取得・表示
async function loadAndDisplayVisitedCount() {
    try {
        console.log('📊 訪問済み店舗数を取得中...');
        
        // プロフィールで公開設定を確認
        if (!userProfile.show_visit_count) {
            console.log('ℹ️ 訪問数非公開設定');
            document.getElementById('visitedCount').textContent = '-';
            return;
        }
        
        // 訪問済み店舗数を取得
        const { count, error } = await supabase
            .from('visited_stores')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', targetUserId);
        
        if (error) throw error;
        
        const visitedCount = count || 0;
        console.log('✅ 訪問済み店舗数:', visitedCount);
        
        document.getElementById('visitedCount').textContent = visitedCount;
        
    } catch (error) {
        console.error('❌ 訪問済み店舗数取得エラー:', error);
        document.getElementById('visitedCount').textContent = '-';
    }
}

// エラー表示
function showError() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
}