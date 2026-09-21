# 実装計画: Gemini自律エージェント機能 & モデル利用状況モニター

ホワイトボード上でタスクが「エージェント待ち」レーンに追加された際に、Gemini 1.5 Flash が自律的に思考してタスクの分析・調査・付箋メモの書き込み・レーン移動を行う仕組みを導入します。
また、ユーザーがAIの稼働状況（本日のリクエスト回数、無料枠メーター、トークン数、推定利用コスト、直近のAI作業ログ）をブラウザ上で一目で確認できるモニタリング画面を追加します。

## ユーザー確認事項 (User Review Required)
> [!IMPORTANT]
> **Gemini APIキーの取得と設定について**:
> 本機能を有効化するには、Google AI Studio（ https://aistudio.google.com/ ）で取得した無料のAPIキーを、Renderの管理画面の環境変数（Environment）に `GEMINI_API_KEY=あなたのキー` として設定していただく必要があります。
> ※キーが未設定の場合でもアプリはエラーにならず、画面上で「APIキー未設定」と親切に案内される設計にします。

## 変更内容の概要

### 1. バックエンド (サーバー側)
- **データベース拡張 (`server/src/db/database.ts`)**:
  - `model_usage` テーブルを作成し、AIの呼び出し履歴（日時、タスク名、入出力トークン数、推定コスト、ステータス）を永続化。
  - 今日の利用回数、トークン合計、ログ一覧を取得する集計クエリを追加。
- **Gemini自律エージェントエンジン (`server/src/services/geminiAgent.ts`)**:
  - Google AI Studio の REST API を直接呼び出す軽量モジュール（余計な依存関係を増やさず安全）。
  - タスクのタイトル、プロジェクト、タグ、過去の付箋メモをプロンプト化し、Gemini 1.5 Flash に送信。
  - Geminiの思考結果を受け取り：
    1. タスクに黄色い付箋メモ（`author: 'agent', author_name: 'Gemini 1.5 Flash'`）を追加。
    2. 判断が必要なら「あなたの判断待ち」、完了なら「完了」レーンへ自動移動。
    3. 利用メトリクスを `model_usage` に記録し、SSEでブラウザへリアルタイム配信。
- **APIルート拡張 (`server/src/api/routes.ts`)**:
  - `GET /api/agent/usage`: モデル利用状況（本日回数、無料枠上限、トークン、推定コスト、実行ログ）を返却。
  - `POST /api/agent/trigger/:taskId`: 手動で即座にGeminiを実行するエンドポイント。
  - `POST /api/tasks` および `PUT /api/tasks/:id` / `move`: タスクが「エージェント待ち（`waiting_agent`）」または担当が「エージェント（`agent`）」になった際に、非同期で自動的に `geminiAgent.processTask(taskId)` を発火。

### 2. フロントエンド (クライアント側)
- **AI利用状況モーダル (`client/src/components/AgentUsageModal.tsx`)**:
  - **無料枠メーター**: 本日の使用状況（例: `3 / 1,500 回 (0.2%)`）をプログレスバーで可視化。
  - **コスト見積もり**: `約 0.04 円 ($0.0003)` などの推定金額を表示。
  - **現在のアクティブモデル**: `Gemini 1.5 Flash (高速・無料枠)`
  - **APIキー接続状態**: 🟢 接続中 / 🟡 未設定
  - **直近のAI自律実行ログ**: いつどのタスクで何を思考したかの履歴一覧。
- **ヘッダーの拡張 (`client/src/components/Header.tsx`)**:
  - 従来の「エージェント再現（モック）」ボタンを、本物の **「AI利用状況 (Gemini)」** ボタン＆ステータスバッジへアップグレード。
- **タスク詳細画面 (`client/src/components/TaskDetailDrawer.tsx`)**:
  - 「🤖 Geminiに処理を依頼」ボタンを追加し、ワンクリックで即座にAIがタスクを自律処理できるようにする。

## 検証手順 (Verification Plan)
1. ローカルでの TypeScript 型チェックおよびビルド検証（`npm run build`）。
2. テスト用タスクを作成し、APIキー有無に応じた挙動の確認。
3. Gitコミット＆GitHubへのプッシュ（Renderでの自動デプロイ確認）。
4. 画面上で「AI利用状況」モーダルを開き、メーターやログが綺麗に表示されることを確認。
