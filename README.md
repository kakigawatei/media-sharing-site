# メディア投稿サイト

画像・動画を投稿・共有できるWebサイトです。

## 機能

- 🖼️ 画像・動画のアップロード
- 📱 マルチデバイス対応
- 🔄 リアルタイムデータ同期
- 🎯 メディアタイプでフィルタリング
- 📦 クラウドストレージ対応

## セットアップ

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) にアクセス
2. 新しいプロジェクトを作成
3. データベースURLとAPIキーを取得

### 2. データベースの設定

Supabaseの SQL Editor で以下を実行:

```sql
-- sql/schema.sql の内容を実行
```

### 3. 設定ファイルの更新

`js/config.js` を編集:

```javascript
const SUPABASE_URL = 'あなたのプロジェクトURL'
const SUPABASE_ANON_KEY = 'あなたのAPIキー'
```

### 4. デプロイ

```bash
npx vercel --prod
```

## 使い方

1. ファイルを選択
2. タイトルと説明を入力
3. 投稿ボタンをクリック
4. 他のデバイスからも同じデータが見れます

## 技術スタック

- Frontend: HTML, CSS, JavaScript
- Backend: Supabase (PostgreSQL)
- Storage: Supabase Storage
- Deploy: Vercel