# 実装計画: AI Whiteboard システム（WHITEBOARD）

Twitter（X）で共有された「AIネイティブなタスク・思考管理カンバンボード（WHITEBOARD）」を、ローカルおよびクラウド両対応のモダンな構成で再現・構築します。

## ユーザー確認・合意事項

> [!IMPORTANT]
> **実行環境（PCスペック・利用言語）について**:
> 事前調査の結果、現在のMac環境にはすでに **Node.js v20.2.0**（モダンで安定したバージョン）がインストールされていることが確認できました。
> したがって、複雑な外部言語やDockerを導入することなく、**Node.js 1本（TypeScript）でバックエンド・DB・MCPサーバー・フロントエンドのすべてが完結**します。
> PCに負荷をかけない超軽量設計とするため、マシンが古くても非常に軽快に動作します。
> また、ディレクトリ構造や起動コマンドを標準化しているため、**将来的に無料クラウド（RenderやRailway等）や外部サーバーにそのまま移すことも可能**な設計にします。

> [!NOTE]
> **AIクライアント（Gemini / Antigravity / 将来のClaude・Cursor等）の接続性**:
> 本システムは業界標準の **MCP（Model Context Protocol）** に完全準拠します。
> * **Antigravity / Gemini**: 設定ファイルを1つ配置するだけで、チャット内からAIが自律的にタスクの確認・起票・移動を行えるようになります。
> * **将来の拡張（Claude Desktop, Cursor, Cline, ChatGPT等）**: 各ツールのMCP設定（JSON）にコマンドを1行追加するだけで、全く同じタスクデータに接続可能です。

---

## 提案するシステムアーキテクチャ

```
                                  +-----------------------------+
                                  |      Web Browser (User)     |
                                  |  - React + Tailwind CSS     |
                                  |  - 6本レーン・付箋・詳細    |
                                  |  - Ctrl+K 検索              |
                                  +--------------+--------------+
                                         ^       |
                  SSE (リアルタイム更新) |       | HTTP API (REST)
                                         |       v
+-----------------------------+   +--------------+--------------+
|       AI Agents             |   |        Core Server          |
|  - Antigravity / Gemini     |-->|  - Node.js (TypeScript)     |
|  - Claude / Cursor (将来)   |   |  - MCP Server / REST API    |
|    (via MCP Protocol)       |   |  - SSE Event Broadcaster    |
+-----------------------------+   +--------------+--------------+
                                                 |
                                                 v
                                  +-----------------------------+
                                  |       SQLite Database       |
                                  |  - tasks, notes, history    |
                                  |  - 楽観的ロック (version)   |
                                  +-----------------------------+
```

---

## 変更予定コンポーネント・ファイル構成

### 1. プロジェクトルート & 設定
* [NEW] `package.json`: モノレポ（または単一リポジトリ構成）でサーバーとクライアントを簡単一発起動 (`npm run dev`) できる構成。
* [NEW] `tsconfig.json`: TypeScript設定。

### 2. データベース & バックエンド・MCPサーバー (`server/`)
* [NEW] `server/src/db/schema.sql`: SQLiteスキーマ定義（タスク、付箋、履歴、タグ、レーン）。
* [NEW] `server/src/db/database.ts`: SQLiteデータベース接続・マイグレーション・クエリ処理。
* [NEW] `server/src/api/routes.ts`: フロントエンド向けのREST API（タスク取得・更新・付箋操作・検索）。
* [NEW] `server/src/api/sse.ts`: Server-Sent Events（SSE）の配信マネージャー（AIが変更したらブラウザにプッシュ通知）。
* [NEW] `server/src/mcp/server.ts`: MCPツール群の実装（`list_tasks`, `get_task`, `create_task`, `update_task`, `move_lane`, `add_note`, `search_tasks`）。
* [NEW] `server/src/index.ts`: サーバー統合エントリーポイント（HTTP API + SSE + MCP）。

### 3. フロントエンドUI (`client/`)
* [NEW] `client/src/App.tsx`: メイン画面レイアウト。
* [NEW] `client/src/components/Header.tsx`: ヘッダー（ロゴ、ボード/ブクマ切り替え、テーマ、Ctrl+K検索バー、ステータス表示）。
* [NEW] `client/src/components/KanbanBoard.tsx`: 6本レーンのカンバンボード本体。
* [NEW] `client/src/components/TaskCard.tsx`: カードタイル（タイトル、文字数、優先度バッジ、担当者アイコン、種別アイコン）。
* [NEW] `client/src/components/TaskDetailDrawer.tsx`: 左側の詳細ドロワーパネル（インライン編集、ステータス、タグ、付箋タブ、ファイルタブ、履歴タブ）。
* [NEW] `client/src/components/StickyNoteList.tsx`: 付箋コンポーネント（エージェント/人間バッジ、300文字制限、編集・削除）。
* [NEW] `client/src/components/SearchModal.tsx`: `Ctrl+K` クイック検索モーダル。
* [NEW] `client/src/hooks/useSSE.ts`: SSE自動受信フック（AIの操作を即座にUIに反映）。

### 4. 設定・マニュアル (`docs/`)
* [NEW] `docs/ai_whiteboard_system/mcp_setup_guide.md`: Antigravity, Gemini, Claude Desktop, Cursorへの接続手順ガイド。

---

## 検証計画

### 1. サーバー & MCP動作確認
- サーバーを起動し、REST APIのテスト（タスクのCRUD）。
- MCPクライアントとしてツール呼び出しの動作確認（`create_task` や `move_lane` の実行）。

### 2. フロントエンドUI確認
- ブラウザでアクセスし、6本レーンが画像通りにレンダリングされるか確認。
- カードのクリックで左ドロワーが開き、付箋の投稿・編集・削除ができるか確認。
- `Ctrl+K` で検索モーダルが開き、インクリメンタル検索ができるか確認。

### 3. リアルタイム同期 & AI連携確認
- ブラウザを開いた状態で、バックエンド/MCPからタスクを作成・移動させ、ブラウザがリロードなしでリアルタイムに動くか（SSE）を確認。
- 楽観的ロックにより、古いバージョンで上書きしようとした場合に正常に競合が検出されるか確認。
