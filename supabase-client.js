// 共有Supabaseクライアント - シングルトンパターン
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase設定（既存のものを流用）
const SUPABASE_URL = 'https://lywfaolwvkewuouvkzlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5d2Zhb2x3dmtld3VvdXZremxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MDg2NjcsImV4cCI6MjA2OTk4NDY2N30.wBGCHOLbP6ew7Bnvxrq0sKSm1EnHk5NNE1sWWH7ff60';

// グローバルSupabaseクライアント（シングルトン）
let globalSupabaseClient = null;

export function getSupabaseClient() {
    if (!globalSupabaseClient) {
        globalSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                storage: window.localStorage,
                storageKey: 'nagoya-glutenfree-auth'
            }
        });
        
        console.log('✅ Supabaseクライアント初期化完了');
    }
    return globalSupabaseClient;
}

// グローバルアクセス用
export default getSupabaseClient();

// window オブジェクトに登録（他のスクリプトからアクセス可能）
if (typeof window !== 'undefined') {
    window.supabase = getSupabaseClient();
}