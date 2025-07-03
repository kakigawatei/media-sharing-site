-- メディア投稿テーブル
CREATE TABLE media_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) を有効化
ALTER TABLE media_posts ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Anyone can view media posts" ON media_posts
    FOR SELECT USING (true);

-- 全ユーザーが投稿可能
CREATE POLICY "Anyone can insert media posts" ON media_posts
    FOR INSERT WITH CHECK (true);

-- ストレージバケットの設定
INSERT INTO storage.buckets (id, name, public) VALUES ('media-uploads', 'media-uploads', true);

-- ストレージのポリシー設定
CREATE POLICY "Anyone can upload media" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'media-uploads');

CREATE POLICY "Anyone can view media" ON storage.objects
    FOR SELECT USING (bucket_id = 'media-uploads');

-- インデックス作成
CREATE INDEX idx_media_posts_upload_date ON media_posts(upload_date DESC);
CREATE INDEX idx_media_posts_media_type ON media_posts(media_type);