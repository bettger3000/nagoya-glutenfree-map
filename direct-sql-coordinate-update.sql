-- 座標データ直接更新SQL
-- Supabaseダッシュボードの SQL Editor で実行してください

-- まず現在の状況を確認
SELECT name, latitude, longitude FROM stores LIMIT 5;

-- みちのり亭の座標を更新（テスト）
UPDATE stores 
SET latitude = 35.1695, longitude = 136.879 
WHERE name LIKE '%みちのり亭%';

-- 更新結果を確認
SELECT name, latitude, longitude FROM stores WHERE name LIKE '%みちのり亭%';

-- 主要店舗の座標を一括更新
UPDATE stores SET latitude = 35.1602, longitude = 136.9084 WHERE name = 'Creperiz Stand.Nagoya';
UPDATE stores SET latitude = 35.1695, longitude = 136.879 WHERE name = 'みちのり亭';
UPDATE stores SET latitude = 35.1938, longitude = 136.8901 WHERE name = 'みちのり弁当（Gluten-Free Michinori Bento）';
UPDATE stores SET latitude = 35.1722, longitude = 136.882 WHERE name = 'Biople 名古屋タカシマヤゲートタワーモール店';
UPDATE stores SET latitude = 35.1698, longitude = 136.8835 WHERE name = '成城石井 名古屋駅広小路口店';
UPDATE stores SET latitude = 35.1695, longitude = 136.8842 WHERE name = '成城石井 名古屋 近鉄パッセ店';
UPDATE stores SET latitude = 35.1711, longitude = 136.9001 WHERE name = 'ダモンデ ミールシフォン＆スイーツ';
UPDATE stores SET latitude = 35.164, longitude = 136.9651 WHERE name = 'ライラック';
UPDATE stores SET latitude = 35.1507, longitude = 136.9053 WHERE name = 'エンキッチンカフェ';
UPDATE stores SET latitude = 35.149, longitude = 136.934 WHERE name = 'スギヤマ調剤薬局 御器所店';
UPDATE stores SET latitude = 35.1787, longitude = 136.994 WHERE name = '旬楽膳 名古屋・地アミ店';
UPDATE stores SET latitude = 35.1416, longitude = 136.8603 WHERE name = 'コルポ';
UPDATE stores SET latitude = 35.1743, longitude = 136.8836 WHERE name = 'カルディコーヒーファーム 名古屋ゲートウォーク店';
UPDATE stores SET latitude = 35.1812, longitude = 136.8732 WHERE name = 'グルテンフリー 菓子屋 藤ノ宮';
UPDATE stores SET latitude = 35.1824, longitude = 136.9452 WHERE name = 'グルテンフリー＆米粉ベーグル屋 はるのはな';
UPDATE stores SET latitude = 35.1695, longitude = 136.9235 WHERE name = '2525sweets';
UPDATE stores SET latitude = 35.1771, longitude = 136.8887 WHERE name = 'titbit!(ティットビット)';
UPDATE stores SET latitude = 35.1523, longitude = 136.9246 WHERE name = '米粉の焼菓子 a" (エーダブルプライム)';
UPDATE stores SET latitude = 35.1941, longitude = 136.9758 WHERE name = 'グルテンフリー食堂 おみやはん';

-- 全国の店舗座標を追加
UPDATE stores SET latitude = 35.6611, longitude = 139.7077 WHERE name LIKE '%I''m donut%';
UPDATE stores SET latitude = 35.7039, longitude = 139.5724 WHERE name LIKE '%genuine gluten free%';
UPDATE stores SET latitude = 34.7334, longitude = 135.3701 WHERE name LIKE '%pâtisserie Éclat%';
UPDATE stores SET latitude = 36.0766846, longitude = 136.2076805 WHERE name LIKE '%米ぱんの店ぱんて%';
UPDATE stores SET latitude = 34.562, longitude = 135.4503 WHERE name LIKE '%RYU-Gu%';
UPDATE stores SET latitude = 35.9826, longitude = 137.9938 WHERE name LIKE '%月夜野こまもの店%';
UPDATE stores SET latitude = 36.6342, longitude = 138.1864 WHERE name LIKE '%縁-enishi-%';
UPDATE stores SET latitude = 34.6778, longitude = 135.5337 WHERE name LIKE '%Buddha%';
UPDATE stores SET latitude = 34.6758, longitude = 135.5031 WHERE name LIKE '%セレンペッシュ%';
UPDATE stores SET latitude = 34.6675, longitude = 135.4993 WHERE name LIKE '%Spys Oasis%';
UPDATE stores SET latitude = 35.6685, longitude = 139.6801 WHERE name LIKE '%SO TARTE%';
UPDATE stores SET latitude = 35.3347, longitude = 137.1284 WHERE name LIKE '%おやつ 創房優%';
UPDATE stores SET latitude = 35.6478, longitude = 139.7032 WHERE name LIKE '%やまの ひつじ%';
UPDATE stores SET latitude = 35.6213, longitude = 139.7151 WHERE name LIKE '%ペドラブランカ%';
UPDATE stores SET latitude = 35.6633, longitude = 139.7784 WHERE name LIKE '%もんじゃ宝島%';
UPDATE stores SET latitude = 35.7232, longitude = 139.5873 WHERE name LIKE '%MOCMO sandwiches%';
UPDATE stores SET latitude = 35.4662, longitude = 139.6193 WHERE name LIKE '%HB Style KIYOKEN%';
UPDATE stores SET latitude = 26.3929, longitude = 127.7436 WHERE name LIKE '%米m BEIEMU%';
UPDATE stores SET latitude = 35.6837, longitude = 139.735 WHERE name LIKE '%F&F 自然食品%';
UPDATE stores SET latitude = 35.6831, longitude = 139.7369 WHERE name LIKE '%ソラノイロ%';
UPDATE stores SET latitude = 35.6614, longitude = 139.6631 WHERE name LIKE '%202カリー堂%';
UPDATE stores SET latitude = 35.6798, longitude = 139.7645 WHERE name LIKE '%TORIBA COFFEE%';
UPDATE stores SET latitude = 35.6507, longitude = 139.701 WHERE name LIKE '%premium SOW%';
UPDATE stores SET latitude = 34.6799, longitude = 135.4473 WHERE name LIKE '%RISO GRAN%';
UPDATE stores SET latitude = 34.7215, longitude = 135.251 WHERE name LIKE '%田田田堂%';
UPDATE stores SET latitude = 34.9315, longitude = 135.7575 WHERE name LIKE '%NAYAMACHI DONUTS%';
UPDATE stores SET latitude = 24.8031, longitude = 125.2697 WHERE name LIKE '%宮古冷麺%';
UPDATE stores SET latitude = 35.6469, longitude = 139.7464 WHERE name LIKE '%where is my chou%';
UPDATE stores SET latitude = 35.0301, longitude = 135.7755 WHERE name LIKE '%阿闍梨餅本舗満月%';
UPDATE stores SET latitude = 35.0045, longitude = 135.7649 WHERE name LIKE '%京都炎神%';
UPDATE stores SET latitude = 34.9917, longitude = 135.7669 WHERE name LIKE '%SOT COFFEE ROASTER Kyoto%';
UPDATE stores SET latitude = 35.0142, longitude = 135.6745 WHERE name LIKE '%和レ和レ和アラシヤマ%';
UPDATE stores SET latitude = 35.0106, longitude = 138.4902 WHERE name LIKE '%エスパルスドリームプラザ%';
UPDATE stores SET latitude = 35.6664, longitude = 139.6893 WHERE name LIKE '%NachuRa Yoyogi park%';
UPDATE stores SET latitude = 35.5662, longitude = 139.3561 WHERE name LIKE '%OLU OLU Crep%';
UPDATE stores SET latitude = 35.231, longitude = 136.9568 WHERE name LIKE '%甲賀米粉たい焼き%';
UPDATE stores SET latitude = 37.0766, longitude = 140.8651 WHERE name LIKE '%定食 笑いーと%';
UPDATE stores SET latitude = 35.4311, longitude = 136.6934 WHERE name LIKE '%Linda Lindo SWEETS%';
UPDATE stores SET latitude = 34.7204, longitude = 136.4946 WHERE name LIKE '%cadeau%';
UPDATE stores SET latitude = 34.2188, longitude = 135.1665 WHERE name LIKE '%お米のいいなり%';

-- 更新された店舗数を確認
SELECT COUNT(*) as updated_stores FROM stores WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 座標が設定された店舗の一覧を確認
SELECT name, latitude, longitude FROM stores WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY name;