class MediaSharingApp {
    constructor() {
        this.mediaItems = [];
        this.currentFilter = 'all';
        this.supabase = window.supabaseClient;
        this.userId = this.getUserId();
        this.init();
    }

    getUserId() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('userId', userId);
        }
        return userId;
    }

    async init() {
        this.setupEventListeners();
        await this.loadMediaFromDatabase();
        this.renderMediaGrid();
    }

    setupEventListeners() {
        const uploadForm = document.getElementById('uploadForm');
        const fileInput = document.getElementById('fileInput');
        const filterButtons = document.querySelectorAll('.filter-btn');
        const modal = document.getElementById('modal');
        const closeButton = document.querySelector('.close');

        uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
        fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e));
        });

        closeButton.addEventListener('click', () => this.closeModal());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    handleFileSelection(e) {
        const files = e.target.files;
        const uploadLabel = document.querySelector('.file-upload label');
        
        if (files.length > 0) {
            uploadLabel.innerHTML = `📁 ${files.length}個のファイルが選択されました<div style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.8;">画像・動画をドラッグ&ドロップまたはクリック</div>`;
        } else {
            uploadLabel.innerHTML = '📁 ファイルを選択<div style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.8;">画像・動画をドラッグ&ドロップまたはクリック</div>';
        }
    }

    async handleUpload(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('fileInput');
        const titleInput = document.getElementById('title');
        const descriptionInput = document.getElementById('description');
        const submitButton = document.querySelector('button[type="submit"]');
        
        const files = fileInput.files;
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();

        if (files.length === 0) {
            alert('ファイルを選択してください');
            return;
        }

        if (!title) {
            alert('タイトルを入力してください');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = '🚀 アップロード中...';

        try {
            for (const file of files) {
                await this.processFile(file, title, description);
            }
            
            this.resetForm();
            await this.loadMediaFromDatabase();
            this.renderMediaGrid();
            
            alert('アップロードが完了しました！');
        } catch (error) {
            console.error('アップロードエラー:', error);
            alert(`アップロードに失敗しました: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '🚀 投稿する';
        }
    }

    async processFile(file, title, description) {
        const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const fileName = `${fileId}.${file.name.split('.').pop()}`;
        
        // ストレージアップロード
        const { error: uploadError } = await this.supabase.storage
            .from('media-uploads')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            throw uploadError;
        }

        // 公開URL取得
        const { data: publicUrlData } = this.supabase.storage
            .from('media-uploads')
            .getPublicUrl(fileName);

        const mediaItem = {
            title: title,
            description: description,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            file_url: publicUrlData.publicUrl,
            media_type: file.type.startsWith('image/') ? 'image' : 'video',
            user_id: this.userId
        };

        // データベースに挿入
        const { data: insertData, error: insertError } = await this.supabase
            .from('media_posts')
            .insert([mediaItem])
            .select();

        if (insertError) {
            // アップロードしたファイルを削除
            await this.supabase.storage
                .from('media-uploads')
                .remove([fileName]);
            throw insertError;
        }

        return insertData[0];
    }

    async loadMediaFromDatabase() {
        try {
            const { data, error } = await this.supabase
                .from('media_posts')
                .select('*')
                .order('upload_date', { ascending: false });

            if (error) {
                console.error('データベースエラー:', error);
                this.mediaItems = [];
                return;
            }

            this.mediaItems = data || [];
        } catch (error) {
            console.error('データ読み込みエラー:', error);
            this.mediaItems = [];
        }
    }

    resetForm() {
        document.getElementById('uploadForm').reset();
        const uploadLabel = document.querySelector('.file-upload label');
        uploadLabel.innerHTML = '📁 ファイルを選択<div style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.8;">画像・動画をドラッグ&ドロップまたはクリック</div>';
    }

    handleFilter(e) {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.renderMediaGrid();
    }

    getFilteredItems() {
        if (this.currentFilter === 'all') {
            return this.mediaItems;
        }
        return this.mediaItems.filter(item => item.media_type === this.currentFilter);
    }

    renderMediaGrid() {
        const mediaGrid = document.getElementById('mediaGrid');
        const filteredItems = this.getFilteredItems();
        
        if (filteredItems.length === 0) {
            mediaGrid.innerHTML = '<p style="text-align: center; color: #666; font-size: 1.2rem;">投稿されたメディアがありません</p>';
            return;
        }

        mediaGrid.innerHTML = filteredItems.map(item => `
            <div class="media-item" data-id="${item.id}">
                ${item.media_type === 'image' 
                    ? `<img src="${item.file_url}" alt="${item.title}" loading="lazy">` 
                    : `<video src="${item.file_url}" controls preload="metadata"></video>`
                }
                <div class="media-info">
                    <div class="media-header">
                        <h3>${this.escapeHtml(item.title)}</h3>
                        <button class="delete-btn" onclick="window.app.confirmDelete('${item.id}', '${item.user_id || 'anonymous'}')">🗑️</button>
                    </div>
                    <p>${this.escapeHtml(item.description || '')}</p>
                    <small>${this.formatDate(item.upload_date)}</small>
                </div>
            </div>
        `).join('');

        this.addMediaItemListeners();
    }

    addMediaItemListeners() {
        const mediaItems = document.querySelectorAll('.media-item');
        
        mediaItems.forEach(item => {
            const img = item.querySelector('img, video');
            const title = item.querySelector('h3');
            const description = item.querySelector('p');
            
            [img, title, description].forEach(element => {
                if (element) {
                    element.addEventListener('click', () => {
                        const itemId = item.dataset.id;
                        this.openModal(itemId);
                    });
                    element.style.cursor = 'pointer';
                }
            });
        });
    }

    confirmDelete(postId, postUserId) {
        if (postUserId === this.userId || postUserId === 'anonymous') {
            if (confirm('この投稿を削除しますか？')) {
                this.deletePost(postId);
            }
        } else {
            const password = prompt('管理者パスワードを入力してください:');
            if (password === '0000') {
                this.deletePost(postId);
            } else if (password !== null) {
                alert('パスワードが正しくありません。');
            }
        }
    }

    async deletePost(postId) {
        try {
            const post = this.mediaItems.find(item => item.id === postId);
            if (!post) {
                alert('投稿が見つかりません。');
                return;
            }

            // ファイル名を取得
            const fileName = post.file_url.split('/').pop();

            // データベースから削除
            const { error: dbError } = await this.supabase
                .from('media_posts')
                .delete()
                .eq('id', postId);

            if (dbError) {
                alert(`削除に失敗しました: ${dbError.message}`);
                return;
            }

            // ストレージファイル削除
            await this.supabase.storage
                .from('media-uploads')
                .remove([fileName]);

            alert('投稿が削除されました。');
            await this.loadMediaFromDatabase();
            this.renderMediaGrid();
        } catch (error) {
            console.error('削除エラー:', error);
            alert(`削除に失敗しました: ${error.message}`);
        }
    }

    openModal(itemId) {
        const item = this.mediaItems.find(media => media.id == itemId);
        if (!item) return;

        const modal = document.getElementById('modal');
        const modalMedia = document.getElementById('modalMedia');
        const modalTitle = document.getElementById('modalTitle');
        const modalDescription = document.getElementById('modalDescription');
        const modalDate = document.getElementById('modalDate');

        modalMedia.innerHTML = item.media_type === 'image' 
            ? `<img src="${item.file_url}" alt="${item.title}">` 
            : `<video src="${item.file_url}" controls>`;

        modalTitle.textContent = item.title;
        modalDescription.textContent = item.description || '';
        modalDate.textContent = `投稿日: ${this.formatDate(item.upload_date)} | ファイル名: ${item.file_name} | サイズ: ${this.formatFileSize(item.file_size)}`;

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('modal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.supabaseClient === 'undefined') {
        console.error('Supabaseが設定されていません。config.jsを確認してください。');
        alert('データベース接続の設定が必要です。');
        return;
    }
    
    window.app = new MediaSharingApp();
});

window.addEventListener('beforeunload', () => {
    document.body.style.overflow = 'auto';
});