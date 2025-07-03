-- 既存のテーブルにuser_idカラムを追加
ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT 'anonymous';

-- 既存の投稿にデフォルトのuser_idを設定
UPDATE media_posts SET user_id = 'anonymous' WHERE user_id IS NULL;

-- user_idをNOT NULLに変更
ALTER TABLE media_posts ALTER COLUMN user_id SET NOT NULL;

-- 削除ポリシーを追加（既存の場合は削除してから作成）
DROP POLICY IF EXISTS "Users can delete their own posts" ON media_posts;
CREATE POLICY "Users can delete their own posts" ON media_posts
    FOR DELETE USING (user_id = current_setting('app.current_user_id', true) OR current_setting('app.current_user_id', true) = 'admin');