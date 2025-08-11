// 共有Supabaseクライアント
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase設定
const SUPABASE_URL = 'https://lywfaolwvkewuouvkzlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5d2Zhb2x3dmtld3VvdXZremxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MDg2NjcsImV4cCI6MjA2OTk4NDY2N30.wBGCHOLbP6ew7Bnvxrq0sKSm1EnHk5NNE1sWWH7ff60';

// グローバルSupabaseクライアント（シングルトンパターン）
let globalSupabaseClient = null;

export function getSupabaseClient() {
    if (!globalSupabaseClient) {
        globalSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                // セッションを30日間保持
                storage: window.localStorage,
                storageKey: 'supabase-auth-token'
            }
        });
        console.log('✅ グローバルSupabaseクライアント作成完了');
    }
    return globalSupabaseClient;
}

// グローバル変数として設定（他のスクリプトからアクセス可能にする）
const supabaseClient = getSupabaseClient();
window.supabase = supabaseClient;

// デフォルトエクスポートも提供
export default supabaseClient;