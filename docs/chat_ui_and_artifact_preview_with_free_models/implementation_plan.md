# 実装計画: チャット型対話UI、成果物プレビュー、完全無料AIモデルの追加

## 概要
WHITEBOARDを「付箋の箇条書き」から、ChatGPTやSlackのような**洗練されたチャットアプリ形式の対話UI**へ進化させます。
また、「〇〇を作って」と指示した際に、実際に動作するWebアプリやコードが**タスク詳細の「HTML」「ファイル」タブに自動生成・プレビュー表示**されるようにします。
さらに、1日14,400回無料で超高速な **Groq（Llama 3.3 70B）** を追加し、Gemini 3.6 Flash と並ぶ日常使いモデルとして選択可能にします。
Render無料枠の再起動によるタスク消失を防ぐ**自動ローカル永続化（スマートリカバリー）**も同時に実装します。

---

## ユーザー確認が必要な事項
> [!IMPORTANT]
> - 付箋リストの表示形式を、LINEやSlackのような**タイムライン・チャット吹き出し形式**に変更します（これまでの付箋データもそのままチャット履歴として引き継がれます）。
> - 無料モデルとして、現在の **Gemini 3.6 Flash** に加え、超高速・高精度の **Groq（Llama 3.3 70B）** をサポートします。GroqのAPIキーを設定すれば、一瞬（1〜2秒）でチャットとコードが返ってくるようになります。

---

## 実装内容と変更ファイル

### 1. フロントエンド: チャット型UIへの刷新
#### [NEW] [TaskChatThread.tsx](file:///Users/shin/Documents/antigravity/fervent-hypatia/client/src/components/TaskChatThread.tsx)
* 人間（右側・青）とAI（左側・白/濃色）の吹き出しによるチャットタイムライン。
* 入力エリア（Enterで送信、Shift+Enterで改行）。
* 「修正して」「機能を追加して」と入力すると、そのままAIがチャットで返信し、必要に応じてHTMLやコードをアップデート。

#### [MODIFY] [TaskDetailDrawer.tsx](file:///Users/shin/Documents/antigravity/fervent-hypatia/client/src/components/TaskDetailDrawer.tsx)
* 「付箋」タブを「**チャット**」タブに変更（チャットUIを組み込み）。
* 「**HTML**」タブ: AIが生成したHTMLアプリを iframe でサンドボックス実行プレビュー。「全画面表示」「コードコピー」ボタンを設置。
* 「**ファイル**」タブ: 生成されたコードファイル一覧とシンタックス表示、ダウンロードボタンを配置。

### 2. バックエンド & AI: 成果物コード生成 & マルチターン対話
#### [MODIFY] [types.ts](file:///Users/shin/Documents/antigravity/fervent-hypatia/server/src/types.ts)
* `Task` / `TaskDetail` に `html_content?: string` および `artifacts?: { name: string; language: string; content: string }[]` を追加。

#### [MODIFY] [database.ts](file:///Users/shin/Documents/antigravity/fervent-hypatia/server/src/db/database.ts)
* `tasks` テーブルに `html_content`, `artifacts` カラムを追加。
* タスク成果物の保存・取得メソッドを実装。

#### [MODIFY] [geminiAgent.ts](file:///Users/shin/Documents/antigravity/fervent-hypatia/server/src/services/geminiAgent.ts)
* 会話履歴（チャット履歴）を踏まえたマルチターン対話プロンプト。
* 成果物生成指示がある場合、`html_content`（完全な動作するHTML/CSS/JSコード）やプログラムファイルをJSONで抽出し、タスクに自動保存。
* チャットメッセージの自動追加とレーン制御。

### 3. 完全無料モデルの追加: Groq (Llama 3.3 70B Versatile)
#### [NEW] [groqAgent.ts](file:///Users/shin/Documents/antigravity/fervent-hypatia/server/src/services/groqAgent.ts)
* OpenAI互換のエンドポイント（`https://api.groq.com/openai/v1/chat/completions`）を標準 `fetch` で呼び出す軽量クライアント。
* 無料枠で 14,400リクエスト/日、秒速約300トークンの超爆速レスポンス。
* モデル選択（`gemini-3.6-flash` または `groq/llama-3.3-70b-versatile`）をヘッダー/モーダルから切り替え可能に。

### 4. データの永続化: Render再起動対策（スマートリカバリー）
#### [MODIFY] [App.tsx](file:///Users/shin/Documents/antigravity/fervent-hypatia/client/src/App.tsx)
* タスク更新時にブラウザのローカルストレージへ常時ミラーリング。
* サーバーが15分スリープから再起動してデータが空（`tasks.length === 0`）になったことを検知した場合、自動的にローカルの最新バックアップから同期・復元する機能を追加。これにより、Render無料枠でもタスクやチャットが一生消えなくなります。

---

## 検証手順
1. **チャット対話の検証**:
   * タスクを開き、チャット入力欄から「〜について提案して」と送信。
   * AIの吹き出しが即座に返信されることを確認。
2. **成果物プレビューの検証**:
   * 「シンプルなMarkdownエディタを作って」とチャットで依頼。
   * 「HTML」タブに切り替え、その場で文字入力とプレビューができるMarkdownエディタが動くことを確認。
   * 「ファイル」タブでコードが閲覧・コピーできることを確認。
3. **無料モデル切り替えの検証**:
   * Gemini 3.6 Flash と Groq Llama 3.3 の動作を確認。
4. **再起動耐性の検証**:
   * サーバー再起動時でもブラウザからタスクが消えずに自動復旧することを確認。
