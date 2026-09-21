import { dbManager } from '../db/database.js';
import { sseManager } from '../api/sse.js';
import { LaneId } from '../types.js';

interface GeminiAgentResponse {
  thought: string;
  sticky_note: string;
  next_lane: LaneId;
  action_summary: string;
}

export class GeminiAgentService {
  private isProcessingTask: Map<string, boolean> = new Map();

  async processTask(taskId: string): Promise<{ success: boolean; message: string; data?: any }> {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

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
ユーザーが作成・指定したタスクを受け取り、実質的な初動調査・分析・アドバイス・質問を行い、カンバン上の付箋メモを作成してください。

【出力フォーマット】
以下のJSONフォーマットのみを出力してください（Markdownコードブロックは不要、純粋なJSON文字列のみ）：
{
  "thought": "タスクの目的と、あなたが何を行うべきかの思考プロセス（1〜2文）",
  "sticky_note": "ホワイトボードに貼る付箋メモ本文。実用的で具体的、かつ箇条書きなどを交えて読みやすく。最大300文字。",
  "next_lane": "次にタスクを移動させるべきレーンID ('need_decision' | 'completed' | 'in_progress')",
  "action_summary": "実行したアクションの短い要約（例: 初動計画の策定、調査完了、承認待ち）"
}

【レーン選択の基準】
- 'need_decision' (あなたの判断待ち): 人間に選択肢から選んでほしい時、承認や詳細な方針決定が必要な時。
- 'completed' (完了): タスクの質問や依頼がこの1回の回答で完全に解決・達成された時。
- 'in_progress' (進行中): 引き続き作業を進める必要がある時、または着手メモの時。`;

      const userPrompt = `【対象タスク】
ID: ${task.id}
タイトル: ${task.title}
現在のレーン: ${task.lane_id}
担当: ${task.assignee}
プロジェクト: ${task.project || 'なし'}
タグ: ${task.tags.join(', ') || 'なし'}

【これまでの付箋メモ履歴】
${notesHistory || '（まだ付箋はありません）'}

このタスクに対して初動の自律アクションを実行し、JSONで回答してください。`;

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

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const resJson: any = await response.json();
      const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const usageMeta = resJson.usageMetadata || {};

      const inputTokens = Number(usageMeta.promptTokenCount) || 0;
      const outputTokens = Number(usageMeta.candidatesTokenCount) || 0;
      const totalTokens = Number(usageMeta.totalTokenCount) || inputTokens + outputTokens;

      // Pricing: Gemini 1.5 Flash ($0.075 / 1M in, $0.30 / 1M out)
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

      // 1. Add sticky note
      const noteContent = parsed.sticky_note || 'タスクを確認しました。';
      const newNote = dbManager.addNote(task.id, noteContent, 'agent', 'Gemini 1.5 Flash');
      sseManager.broadcast('note_added', newNote);

      // 2. Move lane if changed
      const targetLane = parsed.next_lane || 'need_decision';
      if (targetLane !== task.lane_id) {
        const updatedTask = dbManager.updateTask(task.id, { lane_id: targetLane }, undefined, 'agent');
        sseManager.broadcast('task_moved', updatedTask);
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
