# 3枚画像完全対応ガイド

## 🎯 目標
管理ツールで3枚の画像URLを設定し、メインマップで3枚とも表示・ライトボックス対応

## 📋 実行手順

### 1. Supabaseデータベース設定

1. **Supabaseダッシュボードにログイン**
   - https://supabase.com/
   - プロジェクト: lywfaolwvkewuouvkzlk

2. **SQL Editorで実行**
   ```sql
   -- 画像カラム追加
   ALTER TABLE stores 
   ADD COLUMN IF NOT EXISTS image_url_2 TEXT,
   ADD COLUMN IF NOT EXISTS image_url_3 TEXT;
   
   -- 確認
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'stores' AND column_name LIKE 'image%'
   ORDER BY column_name;
   ```

3. **結果確認**
   以下が表示されればOK:
   ```
   image_url
   image_url_2  
   image_url_3
   ```

### 2. 機能テスト

1. **管理ツール（admin-panel.html）でテスト**
   - 新店舗追加で3つの画像URLを設定
   - 正常に保存できることを確認

2. **メインマップ（gluten-free-map.html）でテスト**
   - 追加した店舗をクリック
   - 3枚の画像が表示されることを確認
   - ライトボックスで各画像が拡大できることを確認

### 3. テスト用画像URL例

```
画像1: https://s3-ap-northeast-1.amazonaws.com/s3.peraichi.com/userData/5d241a8/1.jpg
画像2: https://s3-ap-northeast-1.amazonaws.com/s3.peraichi.com/userData/5d241a8/2.jpg  
画像3: https://s3-ap-northeast-1.amazonaws.com/s3.peraichi.com/userData/5d241a8/3.jpg
```

## ✅ 完了後の機能

- 管理ツールで3枚画像URL設定可能
- メインマップで3枚画像表示
- 画像クリックで拡大表示（ライトボックス）
- 左右矢印で画像切り替え
- 既存店舗との互換性維持

## 🚨 注意事項

1. Supabase SQL実行は1回だけ行う
2. 既存データは影響を受けない
3. 画像URLは有効なものを使用
4. テスト後にブラウザを更新して確認