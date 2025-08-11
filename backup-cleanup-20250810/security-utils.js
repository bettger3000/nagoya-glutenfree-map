/**
 * セキュリティユーティリティ関数
 * XSS攻撃対策のためのHTMLサニタイズ機能
 */

// HTMLエスケープマップ
const HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

/**
 * HTMLを安全にエスケープする
 * @param {string} str - エスケープする文字列
 * @returns {string} エスケープされた安全な文字列
 */
function escapeHtml(str) {
    if (typeof str !== 'string') {
        return '';
    }
    return str.replace(/[&<>"'`=/]/g, function(s) {
        return HTML_ESCAPE_MAP[s];
    });
}

/**
 * URLを安全にサニタイズする
 * @param {string} url - サニタイズするURL
 * @returns {string} 安全なURL（無効な場合は空文字列）
 */
function sanitizeUrl(url) {
    if (typeof url !== 'string') {
        return '';
    }
    
    // 許可されるプロトコル
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    
    try {
        const urlObj = new URL(url);
        if (allowedProtocols.includes(urlObj.protocol)) {
            return url;
        }
    } catch (e) {
        // URLが無効な場合
    }
    
    return '';
}

/**
 * 店舗データを安全にサニタイズする
 * @param {Object} store - 店舗オブジェクト
 * @returns {Object} サニタイズされた店舗オブジェクト
 */
function sanitizeStore(store) {
    if (!store || typeof store !== 'object') {
        return {};
    }
    
    return {
        id: store.id,
        name: escapeHtml(store.name || ''),
        category: escapeHtml(store.category || ''),
        address: escapeHtml(store.address || ''),
        description: escapeHtml(store.description || ''),
        hours: escapeHtml(store.hours || ''),
        closed: escapeHtml(store.closed || ''),
        website: sanitizeUrl(store.website || ''),
        instagram: sanitizeUrl(store.instagram || ''),
        image_url: sanitizeUrl(store.image_url || ''),
        image_url_2: sanitizeUrl(store.image_url_2 || ''),
        image_url_3: sanitizeUrl(store.image_url_3 || ''),
        // 数値フィールドはそのまま
        latitude: store.latitude,
        longitude: store.longitude,
        created_at: store.created_at,
        updated_at: store.updated_at
    };
}

/**
 * レビューデータを安全にサニタイズする
 * @param {Object} review - レビューオブジェクト
 * @returns {Object} サニタイズされたレビューオブジェクト
 */
function sanitizeReview(review) {
    if (!review || typeof review !== 'object') {
        return {};
    }
    
    return {
        id: review.id,
        store_id: review.store_id,
        user_id: review.user_id,
        rating: Number(review.rating) || 0,
        comment: escapeHtml(review.comment || ''),
        created_at: review.created_at,
        updated_at: review.updated_at
    };
}

/**
 * ユーザーデータを安全にサニタイズする
 * @param {Object} user - ユーザーオブジェクト
 * @returns {Object} サニタイズされたユーザーオブジェクト
 */
function sanitizeUser(user) {
    if (!user || typeof user !== 'object') {
        return {};
    }
    
    return {
        id: user.id,
        email: escapeHtml(user.email || ''),
        display_name: escapeHtml(user.display_name || ''),
        avatar_url: sanitizeUrl(user.avatar_url || ''),
        role: escapeHtml(user.role || 'user'),
        status: escapeHtml(user.status || 'pending'),
        created_at: user.created_at,
        updated_at: user.updated_at
    };
}

/**
 * CSRFトークンを生成する（簡易版）
 * @returns {string} CSRFトークン
 */
function generateCSRFToken() {
    return 'csrf_' + Math.random().toString(36).substr(2, 15) + Date.now().toString(36);
}

/**
 * 入力値の基本検証
 * @param {string} input - 検証する入力値
 * @param {number} maxLength - 最大長（デフォルト1000）
 * @returns {boolean} 有効かどうか
 */
function validateInput(input, maxLength = 1000) {
    if (typeof input !== 'string') {
        return false;
    }
    
    // 長さチェック
    if (input.length > maxLength) {
        return false;
    }
    
    // 危険なパターンチェック
    const dangerousPatterns = [
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /data:text\/html/gi,
        /on\w+\s*=/gi // onclick, onload等のイベントハンドラ
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(input)) {
            return false;
        }
    }
    
    return true;
}

// エクスポート（ブラウザ環境用）
if (typeof window !== 'undefined') {
    window.SecurityUtils = {
        escapeHtml,
        sanitizeUrl,
        sanitizeStore,
        sanitizeReview,
        sanitizeUser,
        generateCSRFToken,
        validateInput
    };
}