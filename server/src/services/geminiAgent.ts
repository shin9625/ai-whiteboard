import { dbManager } from '../db/database.js';
import { sseManager } from '../api/sse.js';
import { LaneId } from '../types.js';

interface GeminiAgentResponse {
  thought: string;
  sticky_note: string;
  next_lane: LaneId;
  action_summary: string;
  html_content?: string;
  artifacts?: {
    name: string;
    language: string;
    content: string;
  }[];
}

const DISALLOWED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-002',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-1.0-pro',
  'gemini-pro',
]);

export class GeminiAgentService {
  private isProcessingTask: Map<string, boolean> = new Map();
  private cachedWorkingModel: string | null = null;

  async getAvailableModels(apiKey: string): Promise<string[]> {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) return [];
      const data: any = await res.json();
      if (!data.models || !Array.isArray(data.models)) return [];

      return data.models
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name.replace(/^models\//, ''))
        .filter((name: string) => 
          !DISALLOWED_MODELS.has(name) &&
          !name.includes('tts') &&
          !name.includes('audio') &&
          !name.includes('image') &&
          !name.includes('embedding')
        );
    } catch (e) {
      console.error('Failed to list Gemini models:', e);
      return [];
    }
  }

  async resolveModel(): Promise<string> {
    if (process.env.GEMINI_MODEL) {
      return process.env.GEMINI_MODEL.replace(/^models\//, '');
    }
    if (this.cachedWorkingModel) {
      return this.cachedWorkingModel;
    }

    // Default to the proven stable working model for new Gemini API keys
    const defaultModel = 'gemini-3.6-flash';
    this.cachedWorkingModel = defaultModel;
    return defaultModel;
  }

  async processTask(taskId: string): Promise<{ success: boolean; message: string; data?: any }> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.log('⚠️ GEMINI_API_KEY is not set. Skipping autonomous agent execution.');
      return {
        success: false,
        message: 'GEMINI_API_KEY is not configured in environment variables.',
      };
    }

    if (this.isProcessingTask.get(taskId)) {
      console.log(`⚠️ Task ${taskId} is already being processed by Gemini. Skipping duplicate.`);
      return { success: false, message: 'Task is already being processed' };
    }

    const task = dbManager.getTaskDetail(taskId);
    if (!task) {
      return { success: false, message: 'Task not found' };
    }

    this.isProcessingTask.set(taskId, true);

    // Automatically resolve working model for this API key
    let model = await this.resolveModel();

    // Notify clients that agent started thinking
    sseManager.broadcast('agent_action_started', {
      task_id: taskId,
      task_title: task.title,
      model,
    });

    try {
      // Build prompt from task details and previous notes
      const notesHistory = task.notes
        .map((n) => `[${n.author === 'agent' ? 'AI付箋' : '人間付箋'} (${n.author_name})]: ${n.content}`)
        .join('\n');

      const systemInstruction = `あなたはAIネイティブタスク・思考管理ボード「WHITEBOARD」の自律型エージェント（${model}）です。
ユーザーが作成・指定したタスクを受け取り、実質的な初動調査・分析・アドバイス・開発を行い、チャットメッセージと必要に応じた成果物（HTMLアプリやコード）を作成してください。

【出力フォーマット】
以下のJSONフォーマットのみを出力してください（Markdownコードブロックは不要、純粋なJSON文字列のみ）：
{
  "thought": "タスクの目的と、あなたが何を行うべきかの思考プロセス（1〜2文）",
  "sticky_note": "チャット相手への返信メッセージ本文。実用的で具体的、かつ箇条書きなどを交えて読みやすく。成果物（HTMLやコード）を作成した場合はその説明も含めてください。",
  "next_lane": "次にタスクを移動させるべきレーンID ('need_decision' | 'completed' | 'in_progress')",
  "action_summary": "実行したアクションの短い要約（例: Markdownエディタ開発、調査完了、承認待ち）",
  "html_content": "ブラウザで実際に動作する完全なシングルファイルWebアプリケーション（<!DOCTYPE html>から</html>まで。Tailwind CSSのCDNを含め、美しくインタラクティブに動くもの）。制作・開発依頼でない場合は空文字 \"\"",
  "artifacts": [
    {
      "name": "ファイル名（例: App.tsx, script.py, editor.html）",
      "language": "言語（例: typescript, python, html, javascript）",
      "content": "完全なソースコード"
    }
  ]
}

【成果物（コード・HTML）の作成ルール】
- タスク名や会話履歴に「〜を作って」「コード」「アプリ」「UI」「HTML」「ツール」「エディタ」などの作成・開発依頼がある場合、必ず "html_content" にブラウザ上で実際に触って動く完全なHTML/JSコードを生成してください。
- "artifacts" にも主要なソースコードファイルを格納してください。
- 単なる相談や方針伺いの場合は、"html_content" は空文字 ""、"artifacts" は [] で構いません。

【レーン選択の基準】
- 'need_decision' (あなたの判断待ち): 人間に選択肢から選んでほしい時、承認や方針決定が必要な時。
- 'completed' (完了): タスクの質問やアプリ作成が完了し、動作確認できる状態になった時。
- 'in_progress' (進行中): 引き続き作業を進める必要がある時。`;

      const userPrompt = `【対象タスク】
ID: ${task.id}
タイトル: ${task.title}
現在のレーン: ${task.lane_id}
担当: ${task.assignee}
プロジェクト: ${task.project || 'なし'}
タグ: ${task.tags.join(', ') || 'なし'}

【これまでのチャット・対話履歴】
${notesHistory || '（まだメッセージはありません）'}

このタスクに対して自律アクションを実行し、JSONで回答してください。`;

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      };

      let apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      let response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // Handle 404 or model errors with smart auto-retry and Google suggestion parsing
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Gemini API returned ${response.status} for model ${model}: ${errorText}`);

        // Extract recommended model from Google's error message (specifically targeting "use models/<model>")
        const suggestedMatch = errorText.match(/use models\/([a-zA-Z0-9.-]+)/i);
        let retryModel: string | null = suggestedMatch ? suggestedMatch[1] : null;

        if (
          retryModel &&
          (retryModel.includes('tts') ||
            retryModel.includes('audio') ||
            retryModel.includes('embedding') ||
            retryModel.includes('image'))
        ) {
          console.warn(`Suggested model ${retryModel} is non-text. Ignoring suggestion.`);
          retryModel = null;
        }

        if (retryModel) {
          console.log(`💡 Detected recommended model from Google API error message: ${retryModel}`);
        } else {
          // If no explicit "use models/", check other models mentioned that are not the failing model and not disallowed
          const mentionedModels = Array.from(errorText.matchAll(/models\/([a-zA-Z0-9.-]+)/gi))
            .map((m) => m[1])
            .filter(
              (m) =>
                m !== model &&
                !DISALLOWED_MODELS.has(m) &&
                !m.includes('tts') &&
                !m.includes('audio') &&
                !m.includes('embedding') &&
                !m.includes('image')
            );

          if (mentionedModels.length > 0) {
            retryModel = mentionedModels[0];
          } else {
            // Clear cache and pick next allowed model
            this.cachedWorkingModel = null;
            const available = await this.getAvailableModels(apiKey);
            const alternate = available.find((m) => m !== model && !DISALLOWED_MODELS.has(m));
            if (alternate) {
              retryModel = alternate;
            } else if (model !== 'gemini-3.6-flash') {
              retryModel = 'gemini-3.6-flash';
            }
          }
        }

        // Record initial failure in usage stats for transparency
        dbManager.recordModelUsage({
          model,
          task_id: task.id,
          task_title: task.title,
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          estimated_cost_usd: 0,
          status: 'error',
          error_message: `Attempt failed (${response.status}): ${errorText.substring(0, 150)}`,
        });

        if (retryModel && retryModel !== model) {
          console.log(`🔄 Automatically retrying with model: ${retryModel}`);
          model = retryModel;
          this.cachedWorkingModel = retryModel;
          apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });
          if (!response.ok) {
            const retryErrorText = await response.text();
            throw new Error(`Gemini API error after retry (${response.status}): ${retryErrorText}`);
          }
        } else {
          throw new Error(`Gemini API error (${response.status}): ${errorText}`);
        }
      }

      const resJson: any = await response.json();
      const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const usageMeta = resJson.usageMetadata || {};

      const inputTokens = Number(usageMeta.promptTokenCount) || 0;
      const outputTokens = Number(usageMeta.candidatesTokenCount) || 0;
      const totalTokens = Number(usageMeta.totalTokenCount) || inputTokens + outputTokens;

      // Pricing: Gemini Flash ($0.075 / 1M in, $0.30 / 1M out)
      const inputCost = (inputTokens / 1_000_000) * 0.075;
      const outputCost = (outputTokens / 1_000_000) * 0.30;
      const estimatedCostUsd = inputCost + outputCost;

      // Parse JSON response
      let parsed: GeminiAgentResponse;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {
          thought: 'タスク内容を分析しました。',
          sticky_note: rawText.substring(0, 280),
          next_lane: 'need_decision',
          action_summary: 'タスク初期分析',
        };
      }

      // Record Model Usage
      dbManager.recordModelUsage({
        model,
        task_id: task.id,
        task_title: task.title,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCostUsd,
        status: 'success',
      });

      // 0. Update artifacts / HTML if generated
      if (parsed.html_content || (parsed.artifacts && parsed.artifacts.length > 0)) {
        dbManager.updateTaskArtifacts(
          task.id,
          parsed.html_content || undefined,
          parsed.artifacts || undefined,
          'agent'
        );
      }

      // 1. Add sticky note / chat message
      const noteContent = parsed.sticky_note || 'タスクを確認しました。';
      const newNote = dbManager.addNote(task.id, noteContent, 'agent', `Gemini (${model})`);
      sseManager.broadcast('note_added', newNote);

      // 2. Move lane if changed
      const targetLane = parsed.next_lane || 'need_decision';
      if (targetLane !== task.lane_id) {
        const updatedTask = dbManager.updateTask(task.id, { lane_id: targetLane }, undefined, 'agent');
        sseManager.broadcast('task_moved', updatedTask);
      } else {
        const currentTask = dbManager.getTaskDetail(task.id);
        if (currentTask) {
          sseManager.broadcast('task_updated', currentTask);
        }
      }

      // 3. Notify completion & update usage stats
      sseManager.broadcast('agent_action_completed', {
        task_id: task.id,
        summary: parsed.action_summary,
        next_lane: targetLane,
      });

      const updatedStats = dbManager.getModelUsageStats();
      sseManager.broadcast('agent_usage_updated', updatedStats);

      return {
        success: true,
        message: 'Task processed successfully by Gemini',
        data: {
          note: newNote,
          next_lane: targetLane,
          usage: { inputTokens, outputTokens, totalTokens, estimatedCostUsd },
        },
      };
    } catch (err: any) {
      console.error('Gemini Agent Execution Error:', err);

      dbManager.recordModelUsage({
        model,
        task_id: task.id,
        task_title: task.title,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        estimated_cost_usd: 0,
        status: 'error',
        error_message: err.message,
      });

      sseManager.broadcast('agent_action_completed', {
        task_id: task.id,
        error: err.message,
      });

      const updatedStats = dbManager.getModelUsageStats();
      sseManager.broadcast('agent_usage_updated', updatedStats);

      return { success: false, message: err.message };
    } finally {
      this.isProcessingTask.delete(taskId);
    }
  }
}

export const geminiAgent = new GeminiAgentService();
