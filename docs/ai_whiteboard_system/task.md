# タスクリスト: AI Whiteboard システム開発

人間とAIエージェント（Antigravity, Gemini, 将来のClaude/Cursor等）が共通して読み書きできるAIネイティブなタスク管理システム（WHITEBOARD）の開発計画。

## タスク状況一覧

- [x] **Phase 1: 設計と基盤セットアップ**
  - [x] システム要件・アーキテクチャの定義（画像分析完了）
  - [x] 実行環境（macOS / Node.js v20）の検証
  - [x] プロジェクト構造の初期化（TypeScript / Node.js）
  - [x] データベース設計（SQLite `sql.js` (WebAssembly): ネイティブ部品ゼロ・超軽量・高ポータブル設計）
- [x] **Phase 2: バックエンド & MCPサーバー開発**
  - [x] SQLiteデータアクセス層（CRUD操作、シードデータ、検索）の実装
  - [x] REST API & SSE（Server-Sent Events）リアルタイムプッシュの実装
  - [x] MCP Server の実装（list_tasks, get_task, create_task, update_task, move_task_lane, add_sticky_note 等）
  - [x] 楽観的ロック（Optimistic Concurrency Control）の実装
- [x] **Phase 3: WebフロントエンドUI構築**
  - [x] Vite + React + Tailwind CSS のセットアップ
  - [x] 6本レーン（進行中、あなたの判断待ち、エージェント待ち、保留、完了、アイデア）のカンバンUI
  - [x] タスク詳細ドロワー（タイトル編集、60文字カウンター、ステータス、タグ、付箋タブ、ファイルタブ、履歴タブ）
  - [x] 付箋（メモ）の投稿・編集・削除機能（300文字制限、エージェント/人間バッジ）
  - [x] Ctrl+K クイック検索モーダル
  - [x] 凡例モーダル・エージェント再現シミュレーターモーダル・新規タスク作成モーダル
  - [x] テーマ切り替え（ダーク/ライト）とGlassmorphismデザイン
- [x] **Phase 4: リアルタイム同期 & 総合動作検証**
  - [x] SSEによるブラウザ自動再描画（AIが更新したら即座にUIが変化）の検証
  - [x] サーバー起動およびブラウザ表示確認（HTTP 200 OK, ポート 8086）
  - [x] MCP tools/list によるツール定義レスポンス検証
- [x] **Phase 5: 拡張性 & マニュアル整備**
  - [x] Antigravity / Gemini / Claude Desktop / Cursor 用の MCP設定ガイド作成 (`docs/ai_whiteboard_system/mcp_setup_guide.md`)
