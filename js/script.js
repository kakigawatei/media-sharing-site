class MediaSharingApp {
    constructor() {
        this.mediaItems = [];
        this.currentFilter = 'all';
        this.supabase = window.supabaseClient;
        this.init();
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
            uploadLabel.textContent = `${files.length}個のファイルが選択されました`;
        } else {
            uploadLabel.textContent = 'ファイルを選択';
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
        submitButton.textContent = 'アップロード中...';

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
            
            // 詳細なエラー情報を表示
            let errorMessage = 'アップロードに失敗しました。\n\n';
            if (error.message) {
                errorMessage += `エラー: ${error.message}\n`;
            }
            if (error.details) {
                errorMessage += `詳細: ${error.details}\n`;
            }
            if (error.hint) {
                errorMessage += `ヒント: ${error.hint}\n`;
            }
            
            // よくあるエラーの対処法を追加
            if (error.message && error.message.includes('bucket')) {
                errorMessage += '\n対処法: ストレージバケット「media-uploads」が作成されていない可能性があります。';
            }
            if (error.message && error.message.includes('policy')) {
                errorMessage += '\n対処法: ストレージのポリシー設定が必要です。';
            }
            if (error.message && error.message.includes('relation')) {
                errorMessage += '\n対処法: データベースのテーブル「media_posts」が作成されていない可能性があります。';
            }
            
            alert(errorMessage);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '投稿する';
        }
    }

    async processFile(file, title, description) {
        console.log('処理開始:', file.name, file.type, file.size);
        
        const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const fileName = `${fileId}.${file.name.split('.').pop()}`;
        
        console.log('ファイル名:', fileName);
        
        // ストレージアップロード
        console.log('ストレージアップロード開始...');
        const { error: uploadError } = await this.supabase.storage
            .from('media-uploads')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('ストレージアップロードエラー:', uploadError);
            throw uploadError;
        }
        
        console.log('ストレージアップロード完了');

        // 公開URL取得
        const { data: publicUrlData } = this.supabase.storage
            .from('media-uploads')
            .getPublicUrl(fileName);

        console.log('公開URL:', publicUrlData.publicUrl);

        const mediaItem = {
            title: title,
            description: description,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            file_url: publicUrlData.publicUrl,
            media_type: file.type.startsWith('image/') ? 'image' : 'video'
        };

        console.log('データベースに挿入するデータ:', mediaItem);

        // データベースに挿入
        const { data: insertData, error: insertError } = await this.supabase
            .from('media_posts')
            .insert([mediaItem])
            .select();

        if (insertError) {
            console.error('データベース挿入エラー:', insertError);
            // アップロードしたファイルを削除
            await this.supabase.storage
                .from('media-uploads')
                .remove([fileName]);
            throw insertError;
        }

        console.log('データベース挿入完了:', insertData[0]);
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
        document.querySelector('.file-upload label').textContent = 'ファイルを選択';
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
                    <h3>${this.escapeHtml(item.title)}</h3>
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
            item.addEventListener('click', (e) => {
                const itemId = e.currentTarget.dataset.id;
                this.openModal(itemId);
            });
        });
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
    
    new MediaSharingApp();
});

window.addEventListener('beforeunload', () => {
    document.body.style.overflow = 'auto';
});