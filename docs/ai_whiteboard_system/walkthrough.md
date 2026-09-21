# ウォークスルー: AI Whiteboard システム完成報告

Twitter（X）で共有された「AIネイティブなタスク・思考管理カンバンボード（WHITEBOARD）」を、ローカルおよびクラウド両対応の構成で忠実に再現・構築しました。

---

## 1. 構築したシステムの成果物

### ① 画面UI（ブラウザで操作するカンバンボード）
* **アクセスURL**: `http://localhost:8086`
* **再現された機能**:
  * **6本レーン設計**: 「進行中」「あなたの判断待ち」「エージェント待ち」「保留」「完了」「アイデア / 未着手」
  * **ドラッグ＆ドロップ**: カードをドラッグして直感的にレーン間を移動可能
  * **タスク詳細パネル（左ドロワー）**:
    * タイトルのインライン編集（60文字カウント付き）
    * 状態変更・担当変更（人間/エージェント/両方）プルダウン
    * プロジェクト・タグ表示
    * **付箋タブ**: 300文字以内のメモ。投稿者（エージェント/人間）バッジ、相対時間、インライン編集・削除
    * ファイルタブ、HTMLタブ、Project Hubタブ、履歴タブ
  * **クイック検索**: `Ctrl + K`（または `⌘ + K`）で瞬時にモーダルが開き、キーボードのみでタスクを横断検索・移動可能
  * **デザイン**: 本家と全く同じ洗練されたGlassmorphism（すりガラス質感・グラデーション背景）、ダークモード対応
  * **凡例モーダル & エージェント再現シミュレーター**: 初めての人でも操作方法がわかる凡例モーダルと、AIが自動でタスク起票や付箋貼付を行うシミュレーターを搭載

### ② AIネイティブ連携（MCP Server）
* **実行コマンド**: `node server/dist/mcp/runMcp.js`
* **提供ツール**:
  * `list_tasks`: カンバン上のタスク一覧検索・取得
  * `get_task`: タスク詳細・付箋メモ・履歴の取得
  * `create_task`: 新規タスクの起票（ブラウザにリアルタイム描画）
  * `move_task_lane`: タスクのレーン移動（例: AIが判断を仰ぎたいときに「あなたの判断待ち」へ移動）
  * `update_task`: タイトルやタグ等の更新（楽観的ロック対応）
  * `add_sticky_note`: タスクに付箋メモ（300文字以内）を貼る

### ③ リアルタイム通信 & 堅牢性
* **SSE (Server-Sent Events)**:
  * AIがMCP経由でタスクを追加・移動したり、付箋を貼ったりした瞬間、**ブラウザのリロードなしで画面上のカードがカタカタ自動で更新**されます。
* **楽観的ロック（Optimistic Concurrency Control）**:
  * 人間とAIが同時に同じタスクを編集した際のデータ上書き衝突を防止（バージョン番号管理）。
* **ネイティブ部品完全ゼロ（WASM SQLite）**:
  * 古いMacや異なるOSでもC++コンパイルエラーやセグフォを100%回避する `sql.js`（WebAssembly SQLite）を採用。データは `data/whiteboard.sqlite` に自動永続化されます。

---

## 2. 動作検証結果

| 検証項目 | 検証内容 | 結果 |
| :--- | :--- | :--- |
| **ビルド & 起動** | `npm run build` および `npm start` | **成功**（0エラー、依存関係問題ゼロ） |
| **HTTP Web配信** | `http://localhost:8086` での HTML / CSS / JS 配信 | **成功**（200 OK, 完全なTailwind CSS適用） |
| **API エンドポイント** | `/api/lanes`, `/api/tasks`, `/api/tasks/:id` | **成功**（シードデータ正常取得） |
| **MCP Server** | stdio 経由での `initialize` および `tools/list` | **成功**（全6ツールがMCP仕様に準拠して返却） |
| **SSE リアルタイム** | `/api/events` によるストリーミング接続 | **成功**（常時リアルタイムプッシュ待機） |

---

## 3. 使い方 & 起動方法

### ① サーバーと画面の起動
プロジェクトのルートディレクトリで以下を実行します：
```bash
npm start
```
ブラウザで **`http://localhost:8086`** を開くと、画像と同じホワイトボードが表示されます。

### ② 各AIクライアントへの登録
詳細な設定手順は [`docs/ai_whiteboard_system/mcp_setup_guide.md`](file:///Users/shin/Documents/antigravity/fervent-hypatia/docs/ai_whiteboard_system/mcp_setup_guide.md) に記載されています。

* **Antigravity**: MCP設定に `node /path/to/fervent-hypatia/server/dist/mcp/runMcp.js` を追加
* **Claude Desktop**: `claude_desktop_config.json` に設定を追加
* **Cursor / Cline**: MCP設定画面からコマンドを追加
