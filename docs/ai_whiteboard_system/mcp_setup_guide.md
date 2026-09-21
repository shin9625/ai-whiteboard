# WHITEBOARD MCP 接続設定ガイド

WHITEBOARD システムは、**MCP（Model Context Protocol）** に完全準拠しています。
本ガイドに従って各AIクライアント（Antigravity / Gemini、Claude Desktop、Cursor、Cline等）に登録することで、どのAIからでも共通のタスクボードに直接アクセスし、タスクの自律管理を行わせることができます。

---

## 1. Antigravity / Gemini への登録

Antigravity では、プロジェクトディレクトリのルートまたはMCP設定に登録することで、チャット内のGeminiが本ボードのMCPツールを直接利用できるようになります。

### 起動設定コマンド
```bash
node /path/to/fervent-hypatia/server/dist/mcp/runMcp.js
```

または開発環境での直接実行:
```bash
npx tsx /path/to/fervent-hypatia/server/src/mcp/runMcp.ts
```

### Antigravity MCP 設定（`~/.gemini/antigravity/mcp/whiteboard.json` 等）
```json
{
  "name": "whiteboard",
  "command": "node",
  "args": [
    "/path/to/fervent-hypatia/server/dist/mcp/runMcp.js"
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## 2. Claude Desktop への登録

Claude Desktop の設定ファイル（`~/Library/Application Support/Claude/claude_desktop_config.json`）に以下を追記します。

```json
{
  "mcpServers": {
    "whiteboard": {
      "command": "node",
      "args": [
        "/path/to/fervent-hypatia/server/dist/mcp/runMcp.js"
      ]
    }
  }
}
```
Claude Desktop を再起動すると、右下にハンマー（ツール）アイコンが表示され、`list_tasks`, `create_task`, `move_task_lane`, `add_sticky_note` などが使えるようになります。

---

## 3. Cursor / Cline への登録

Cursor の MCP 設定（Settings > Features > MCP）または Cline（VS Code 拡張機能）の `cline_mcp_settings.json` に追加します。

```json
{
  "mcpServers": {
    "whiteboard": {
      "command": "node",
      "args": [
        "/path/to/fervent-hypatia/server/dist/mcp/runMcp.js"
      ]
    }
  }
}
```

---

## 4. 提供されるMCPツール一覧

| ツール名 | 説明 |
| :--- | :--- |
| `list_tasks` | カンバンボード上のタスク一覧を検索・取得（レーン、プロジェクト、タグで絞り込み可） |
| `get_task` | 指定したタスクの全詳細（付箋メモ一覧、履歴、ステータス）を取得 |
| `create_task` | 新しいタスクを作成（ブラウザ側に即座にリアルタイム描画） |
| `update_task` | タスク情報（タイトル、担当、タグ、プロジェクト等）を更新（楽観ロック対応） |
| `move_task_lane` | タスクを別レーンに移動（「あなたの判断待ち」「エージェント待ち」「完了」等） |
| `add_sticky_note` | タスクに付箋メモ（300文字以内）を貼る（AIの作業ログや質問事項など） |

---

## 5. WebブラウザUIの起動方法

1. リポジトリルートで以下のコマンドを実行します：
   ```bash
   npm run dev
   ```
2. ブラウザで以下のURLを開きます：
   ```
   http://localhost:5173
   ```
   （または本番ビルド後は `http://localhost:8086`）

ブラウザを開いた状態でAI（Antigravity, Claude, Cursor等）にタスク操作を指示すると、**画面がリロードなしでリアルタイムに自動更新**されます！
