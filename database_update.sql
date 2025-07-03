-- データベース更新SQL
-- Supabaseの SQL Editor で実行してください

-- user_idカラムを追加
ALTER TABLE media_posts ADD COLUMN user_id TEXT DEFAULT 'anonymous';

-- 既存のレコードにデフォルト値を設定
UPDATE media_posts SET user_id = 'anonymous' WHERE user_id IS NULL;

-- user_idをNOT NULLに変更
ALTER TABLE media_posts ALTER COLUMN user_id SET NOT NULL;