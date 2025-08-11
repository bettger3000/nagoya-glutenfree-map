/**
 * 統一エラーハンドリングシステム
 * すべてのエラーを一元的に処理し、適切なユーザー向けメッセージを表示
 */

class ErrorHandler {
    constructor() {
        this.errors = new Map();
        this.initErrorTypes();
    }

    /**
     * エラータイプの初期化
     */
    initErrorTypes() {
        this.errorTypes = {
            // ネットワークエラー
            NETWORK_ERROR: {
                code: 'NETWORK_ERROR',
                userMessage: 'インターネット接続を確認してください',
                retryable: true
            },
            
            // 認証エラー
            AUTH_ERROR: {
                code: 'AUTH_ERROR', 
                userMessage: 'ログインが必要です',
                retryable: false
            },
            
            // 権限エラー
            PERMISSION_ERROR: {
                code: 'PERMISSION_ERROR',
                userMessage: 'この操作を実行する権限がありません',
                retryable: false
            },
            
            // データベースエラー
            DATABASE_ERROR: {
                code: 'DATABASE_ERROR',
                userMessage: 'データの処理中にエラーが発生しました',
                retryable: true
            },
            
            // バリデーションエラー
            VALIDATION_ERROR: {
                code: 'VALIDATION_ERROR',
                userMessage: '入力内容を確認してください',
                retryable: false
            },
            
            // 画像エラー
            IMAGE_ERROR: {
                code: 'IMAGE_ERROR',
                userMessage: '画像の読み込みに失敗しました',
                retryable: true
            },
            
            // 位置情報エラー
            GEOLOCATION_ERROR: {
                code: 'GEOLOCATION_ERROR',
                userMessage: '位置情報の取得に失敗しました',
                retryable: true
            },
            
            // 一般エラー
            GENERAL_ERROR: {
                code: 'GENERAL_ERROR',
                userMessage: '予期しないエラーが発生しました',
                retryable: true
            }
        };
    }

    /**
     * エラーを分類する
     * @param {Error} error - エラーオブジェクト
     * @returns {Object} エラータイプ情報
     */
    categorizeError(error) {
        // ネットワークエラー
        if (error.message.includes('fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('Failed to fetch') ||
            error.code === 'NETWORK_ERROR') {
            return this.errorTypes.NETWORK_ERROR;
        }
        
        // Supabaseエラー
        if (error.message.includes('JWT') || 
            error.message.includes('auth') ||
            error.code === '401') {
            return this.errorTypes.AUTH_ERROR;
        }
        
        // 権限エラー
        if (error.message.includes('permission') || 
            error.message.includes('unauthorized') ||
            error.code === '403') {
            return this.errorTypes.PERMISSION_ERROR;
        }
        
        // データベースエラー
        if (error.message.includes('PGRST') || 
            error.message.includes('relation') ||
            error.message.includes('column')) {
            return this.errorTypes.DATABASE_ERROR;
        }
        
        // バリデーションエラー
        if (error.message.includes('validation') || 
            error.message.includes('required') ||
            error.message.includes('invalid')) {
            return this.errorTypes.VALIDATION_ERROR;
        }
        
        // 位置情報エラー
        if (error.code === 1 || error.code === 2 || error.code === 3) {
            return this.errorTypes.GEOLOCATION_ERROR;
        }
        
        // デフォルト
        return this.errorTypes.GENERAL_ERROR;
    }

    /**
     * エラーをハンドリングする
     * @param {Error} error - エラーオブジェクト
     * @param {string} context - エラーが発生したコンテキスト
     * @param {Object} options - オプション設定
     */
    handle(error, context = 'Unknown', options = {}) {
        const errorType = this.categorizeError(error);
        const timestamp = new Date().toISOString();
        const errorId = this.generateErrorId();
        
        // エラーログを記録
        const errorLog = {
            id: errorId,
            timestamp,
            context,
            errorType: errorType.code,
            originalMessage: error.message,
            stack: error.stack,
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: options.userId || 'anonymous'
        };
        
        // コンソールに詳細ログを出力（開発環境）
        if (this.isDevelopment()) {
            console.group(`🚨 Error Handler: ${errorType.code}`);
            console.error('Context:', context);
            console.error('Original Error:', error);
            console.error('Error Log:', errorLog);
            console.groupEnd();
        }
        
        // エラー履歴に保存
        this.errors.set(errorId, errorLog);
        
        // ユーザーにメッセージを表示
        this.showUserMessage(errorType, errorId, options);
        
        // リトライ可能な場合の処理
        if (errorType.retryable && options.retryCallback) {
            this.showRetryOption(options.retryCallback, options.retryCount || 0);
        }
        
        return errorId;
    }

    /**
     * ユーザー向けメッセージを表示
     * @param {Object} errorType - エラータイプ
     * @param {string} errorId - エラーID
     * @param {Object} options - オプション
     */
    showUserMessage(errorType, errorId, options = {}) {
        const message = options.customMessage || errorType.userMessage;
        const type = options.severity || 'error';
        
        // Toast通知を表示（既存のshowToast関数を使用）
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            // フォールバック: アラート
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * リトライオプションを表示
     * @param {Function} retryCallback - リトライ用コールバック
     * @param {number} retryCount - リトライ回数
     */
    showRetryOption(retryCallback, retryCount = 0) {
        if (retryCount >= 3) {
            this.showUserMessage(
                { userMessage: '何度か試しましたが、問題が解決されません。しばらく時間をおいてからお試しください。' },
                null,
                { severity: 'warning' }
            );
            return;
        }

        // リトライボタンを表示（簡易版）
        const retryMessage = `再試行しますか？ (${retryCount + 1}/3回目)`;
        if (confirm(retryMessage)) {
            setTimeout(() => {
                try {
                    retryCallback(retryCount + 1);
                } catch (retryError) {
                    this.handle(retryError, 'Retry', { retryCount: retryCount + 1 });
                }
            }, 1000 * Math.pow(2, retryCount)); // 指数バックオフ
        }
    }

    /**
     * エラーIDを生成
     * @returns {string} エラーID
     */
    generateErrorId() {
        return 'err_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
    }

    /**
     * 開発環境かどうかを判定
     * @returns {boolean} 開発環境の場合true
     */
    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    }

    /**
     * エラー履歴を取得
     * @param {number} limit - 取得件数制限
     * @returns {Array} エラー履歴
     */
    getErrorHistory(limit = 50) {
        const errors = Array.from(this.errors.values());
        return errors.slice(-limit).reverse(); // 最新順
    }

    /**
     * エラー履歴をクリア
     */
    clearErrorHistory() {
        this.errors.clear();
    }

    /**
     * 特定のエラータイプの統計を取得
     * @returns {Object} エラータイプ別の統計
     */
    getErrorStats() {
        const stats = {};
        for (const error of this.errors.values()) {
            stats[error.errorType] = (stats[error.errorType] || 0) + 1;
        }
        return stats;
    }
}

// グローバルインスタンス作成
const errorHandler = new ErrorHandler();

// グローバルエラーハンドラーを設定
window.addEventListener('error', (event) => {
    errorHandler.handle(event.error || new Error(event.message), 'Global Error Handler');
});

window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handle(event.reason || new Error('Unhandled Promise Rejection'), 'Promise Rejection');
    event.preventDefault(); // ブラウザのデフォルトエラー表示を防ぐ
});

// エクスポート
if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
    window.errorHandler = errorHandler;
}