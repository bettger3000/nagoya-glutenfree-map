// Supabaseクエリをデバッグするためのパッチ
// このコードをindex.htmlに追加して、どのクエリがエラーを起こしているか特定する

(function() {
    // Supabaseクライアントの元のfromメソッドを保存
    if (typeof supabase !== 'undefined' && supabase.from) {
        const originalFrom = supabase.from.bind(supabase);
        
        // fromメソッドをラップ
        supabase.from = function(table) {
            const result = originalFrom(table);
            
            // selectメソッドもラップ
            if (result.select) {
                const originalSelect = result.select.bind(result);
                result.select = function(columns) {
                    // selectの引数をログに出力
                    console.log(`🔍 Supabase Query Debug:`, {
                        table: table,
                        selectColumns: columns,
                        stackTrace: new Error().stack
                    });
                    
                    // 問題のあるselect文を検出
                    if (!columns || columns === '' || columns.startsWith(',') || columns.trim() === '') {
                        console.error('❌ 不正なselect文が検出されました:', {
                            table: table,
                            columns: columns,
                            問題: 'select文が空または不正な形式です'
                        });
                    }
                    
                    return originalSelect(columns);
                };
            }
            
            return result;
        };
        
        console.log('✅ Supabaseデバッグモードが有効になりました');
    }
})();