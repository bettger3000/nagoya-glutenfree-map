// 管理画面用JavaScript
let storesData = [];

// 初期化
document.addEventListener('DOMContentLoaded', async function() {
    await loadStoresData();
    renderStoresTable();
});

// 店舗データの読み込み
async function loadStoresData() {
    try {
        const response = await fetch('stores.json');
        const data = await response.json();
        storesData = data.stores;
        console.log('店舗データを読み込みました:', storesData.length, '件');
    } catch (error) {
        console.error('店舗データの読み込みに失敗:', error);
        showMessage('店舗データの読み込みに失敗しました', 'error');
    }
}

// 店舗一覧テーブルを描画
function renderStoresTable() {
    const tbody = document.getElementById('storesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    storesData.forEach(store => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${store.name}</strong><br>
                <small style="color: #666;">${store.address}</small>
            </td>
            <td>
                <span class="store-category category-${store.category}" style="background: var(--primary-green); color: white; padding: 2px 6px; border-radius: 8px; font-size: 11px;">
                    ${store.category}
                </span>
            </td>
            <td>
                ${getStatusBadgeHTML(store.visitStatus)}
                ${store.checkedBy ? `<br><small>確認者: ${store.checkedBy}</small>` : ''}
                ${store.lastUpdate ? `<br><small>更新: ${store.lastUpdate}</small>` : ''}
            </td>
            <td>
                <select class="status-select" id="status-${store.id}">
                    <option value="">変更しない</option>
                    <option value="naco" ${store.visitStatus === 'naco' ? 'selected' : ''}>🔴 naco訪問済み</option>
                    <option value="member" ${store.visitStatus === 'member' ? 'selected' : ''}>🟡 メンバー訪問済み</option>
                    <option value="unvisited" ${store.visitStatus === 'unvisited' ? 'selected' : ''}>🤍 未確認店舗</option>
                </select>
            </td>
            <td>
                <input type="text" id="checker-${store.id}" placeholder="確認者名" value="${store.checkedBy || ''}" style="width: 100px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
            </td>
            <td>
                <button class="btn btn-small" onclick="updateStoreStatus(${store.id})">
                    <i class="fas fa-save"></i> 更新
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ステータスバッジのHTML生成
function getStatusBadgeHTML(status) {
    if (!status) return '<span class="status-badge">未設定</span>';
    
    switch (status) {
        case 'naco':
            return '<span class="status-badge status-naco">🔴 naco訪問済み</span>';
        case 'member':
            return '<span class="status-badge status-member">🟡 メンバー訪問済み</span>';
        case 'unvisited':
            return '<span class="status-badge status-unvisited">🤍 未確認店舗</span>';
        default:
            return '<span class="status-badge">不明</span>';
    }
}

// 個別店舗のステータス更新
function updateStoreStatus(storeId) {
    const statusSelect = document.getElementById(`status-${storeId}`);
    const checkerInput = document.getElementById(`checker-${storeId}`);
    
    if (!statusSelect || !checkerInput) {
        showMessage('要素が見つかりません', 'error');
        return;
    }
    
    const newStatus = statusSelect.value;
    const checkerName = checkerInput.value.trim();
    
    if (!newStatus) {
        showMessage('新しいステータスを選択してください', 'error');
        return;
    }
    
    if (!checkerName) {
        showMessage('確認者名を入力してください', 'error');
        return;
    }
    
    // storesData内の該当店舗を更新
    const store = storesData.find(s => s.id === storeId);
    if (store) {
        store.visitStatus = newStatus;
        store.checkedBy = checkerName;
        store.lastUpdate = new Date().toISOString().substring(0, 7); // YYYY-MM形式
        
        showMessage(`${store.name}のステータスを更新しました`, 'success');
        renderStoresTable(); // テーブルを再描画
    } else {
        showMessage('店舗が見つかりません', 'error');
    }
}

// 一括ステータス更新
function bulkUpdateStatus() {
    const bulkStatus = document.getElementById('bulkStatus').value;
    const bulkChecker = document.getElementById('bulkChecker').value.trim();
    
    if (!bulkStatus) {
        showMessage('ステータスを選択してください', 'error');
        return;
    }
    
    if (!bulkChecker) {
        showMessage('確認者名を入力してください', 'error');
        return;
    }
    
    if (!confirm(`全${storesData.length}件の店舗のステータスを「${getStatusDisplayName(bulkStatus)}」に変更しますか？`)) {
        return;
    }
    
    const currentDate = new Date().toISOString().substring(0, 7);
    
    storesData.forEach(store => {
        store.visitStatus = bulkStatus;
        store.checkedBy = bulkChecker;
        store.lastUpdate = currentDate;
    });
    
    showMessage(`全${storesData.length}件の店舗のステータスを一括更新しました`, 'success');
    renderStoresTable();
    
    // フォームをクリア
    document.getElementById('bulkStatus').value = '';
    document.getElementById('bulkChecker').value = '';
}

// ステータス表示名を取得
function getStatusDisplayName(status) {
    switch (status) {
        case 'naco': return '🔴 naco訪問済み';
        case 'member': return '🟡 メンバー訪問済み';
        case 'unvisited': return '🤍 未確認店舗';
        default: return '不明';
    }
}

// JSONファイル生成
function generateJSON() {
    const jsonData = {
        stores: storesData
    };
    
    const jsonString = JSON.stringify(jsonData, null, 2);
    document.getElementById('jsonPreview').textContent = jsonString;
    
    showMessage('JSONを生成しました。コピーしてstores.jsonファイルに上書きしてください', 'success');
}

// メッセージ表示
function showMessage(message, type = 'success') {
    const messageArea = document.getElementById('messageArea');
    if (!messageArea) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
        ${message}
    `;
    
    messageArea.innerHTML = '';
    messageArea.appendChild(messageDiv);
    
    // 5秒後にメッセージを自動削除
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

// JSONダウンロード機能
function downloadJSON() {
    const jsonData = {
        stores: storesData
    };
    
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `stores_updated_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('JSONファイルをダウンロードしました', 'success');
}

// 統計情報を表示
function showStatistics() {
    const stats = {
        total: storesData.length,
        naco: storesData.filter(s => s.visitStatus === 'naco').length,
        member: storesData.filter(s => s.visitStatus === 'member').length,
        unvisited: storesData.filter(s => s.visitStatus === 'unvisited').length,
        noStatus: storesData.filter(s => !s.visitStatus).length
    };
    
    const statsHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: var(--primary-green);">${stats.total}</div>
                <div>総店舗数</div>
            </div>
            <div style="background: rgba(255, 0, 0, 0.1); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #d32f2f;">🔴 ${stats.naco}</div>
                <div>naco訪問済み</div>
            </div>
            <div style="background: rgba(255, 193, 7, 0.1); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #f57c00;">🟡 ${stats.member}</div>
                <div>メンバー訪問済み</div>
            </div>
            <div style="background: rgba(158, 158, 158, 0.1); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #616161;">🤍 ${stats.unvisited}</div>
                <div>未確認店舗</div>
            </div>
        </div>
    `;
    
    showMessage(`統計情報: ${statsHTML}`, 'success');
}

// 初期化時に統計も表示
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        showStatistics();
    }, 1000);
});