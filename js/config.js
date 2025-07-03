// Supabase設定
const SUPABASE_URL = 'https://khtowpqtopdymygwernr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodG93cHF0b3BkeW15Z3dlcm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MzI1MDYsImV4cCI6MjA2NzEwODUwNn0.5DSpW9bayradayawMRli-BTyOzsEiZnEXqf5Uwi5g9E'

// 本番環境では環境変数から取得
const supabaseUrl = SUPABASE_URL
const supabaseKey = SUPABASE_ANON_KEY

// Supabaseクライアントの初期化
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey)

// 設定をエクスポート
window.supabaseClient = supabase