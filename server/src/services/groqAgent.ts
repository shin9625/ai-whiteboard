import { dbManager } from '../db/database.js';
import { sseManager } from '../api/sse.js';
import { LaneId } from '../types.js';

interface GroqAgentResponse {
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

export class GroqAgentService {
  private isProcessingTask: Map<string, boolean> = new Map();
  public readonly defaultModel = 'llama-3.3-70b-versatile';

  async processTask(taskId: string): Promise<{ success: boolean; message: string; data?: any }> {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.log('⚠️ GROQ_API_KEY is not configured in environment variables.');
      return {
        success: false,
        message: 'GROQ_API_KEY is not configured in environment variables.',
      };
    }

    if (this.isProcessingTask.get(taskId)) {
      console.log(`⚠️ Task ${taskId} is already being processed. Skipping duplicate.`);
      return { success: false, message: 'Task is already being processed' };
    }

    const task = dbManager.getTaskDetail(taskId);
    if (!task) {
      return { success: false, message: 'Task not found' };
    }

    this.isProcessingTask.set(taskId, true);
    const model = process.env.GROQ_MODEL || this.defaultModel;

    // Notify clients that agent started thinking
    sseManager.broadcast('agent_action_started', {
      task_id: taskId,
      task_title: task.title,
      model: `Groq (${model})`,
    });

    try {
      const notesHistory = task.notes
        .map((n) => `[${n.author === 'agent' ? 'AI' : '人間'} (${n.author_name})]: ${n.content}`)
        .join('\n');

      const systemInstruction = `あなたはAIネイティブタスク管理ボード「WHITEBOARD」の自律型エージェント（${model}）です。
ユーザーのタスクやチャットの指示を受け取り、実質的な初動調査・分析・アドバイス・アプリ開発を行い、チャットメッセージと成果物（HTMLアプリやコード）を作成してください。

必ず以下の完全なJSONフォーマットのみを出力してください（Markdownのコードブロック \`\`\`json 等は不要、純粋なJSON文字列のみ）：
{
  "thought": "あなたの思考プロセス（1〜2文）",
  "sticky_note": "チャット相手への返信メッセージ本文。具体的かつ読みやすく。成果物を作成した場合はその使い方も説明してください。",
  "next_lane": "次にタスクを移動させるべきレーンID ('need_decision' | 'completed' | 'in_progress')",
  "action_summary": "実行したアクションの短い要約",
  "html_content": "ブラウザのiframeで実際に動作する完全なシングルファイルWebアプリケーション（<!DOCTYPE html>から</html>まで。Tailwind CSS等のCDNを含め美しく動作するもの）。開発依頼でない場合は空文字 \"\"",
  "artifacts": [
    {
      "name": "ファイル名（例: App.tsx, script.py）",
      "language": "言語",
      "content": "ソースコード"
    }
  ]
}

【成果物の作成ルール】
タスク名や会話履歴に「〜を作って」「コード」「アプリ」「UI」「HTML」「ツール」「エディタ」などの作成依頼がある場合、必ず "html_content" にブラウザ上で実際に動作する完全なHTMLコードを出力してください。
単なる質問や相談の場合は "html_content" は空文字 ""、"artifacts" は [] で構いません。`;

      const userPrompt = `【対象タスク】
タイトル: ${task.title}
現在のレーン: ${task.lane_id}
担当: ${task.assignee}
プロジェクト: ${task.project || 'なし'}
タグ: ${task.tags.join(', ') || 'なし'}

【チャット・対話履歴】
${notesHistory || '（まだメッセージはありません）'}

上記に対する自律アクションをJSONで出力してください。`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error (${response.status}): ${errorText}`);
      }

      const resJson: any = await response.json();
      const rawText = resJson.choices?.[0]?.message?.content || '{}';
      const usageMeta = resJson.usage || {};

      const inputTokens = Number(usageMeta.prompt_tokens) || 0;
      const outputTokens = Number(usageMeta.completion_tokens) || 0;
      const totalTokens = Number(usageMeta.total_tokens) || inputTokens + outputTokens;

      // Groq Llama 3.3 70B: Free tier available
      const inputCost = (inputTokens / 1_000_000) * 0.59;
      const outputCost = (outputTokens / 1_000_000) * 0.79;
      const estimatedCostUsd = inputCost + outputCost;

      let parsed: GroqAgentResponse;
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
        model: `groq/${model}`,
        task_id: task.id,
        task_title: task.title,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCostUsd,
        status: 'success',
      });

      // Update artifacts / HTML if generated
      if (parsed.html_content || (parsed.artifacts && parsed.artifacts.length > 0)) {
        dbManager.updateTaskArtifacts(
          task.id,
          parsed.html_content || undefined,
          parsed.artifacts || undefined,
          'agent'
        );
      }

      // Add chat message
      const noteContent = parsed.sticky_note || 'タスクを確認しました。';
      const newNote = dbManager.addNote(task.id, noteContent, 'agent', `Groq (${model})`);
      sseManager.broadcast('note_added', newNote);

      // Move lane if changed
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

      // Broadcast completion
      sseManager.broadcast('agent_action_completed', {
        task_id: task.id,
        summary: parsed.action_summary,
        next_lane: targetLane,
      });

      const updatedStats = dbManager.getModelUsageStats();
      sseManager.broadcast('agent_usage_updated', updatedStats);

      return {
        success: true,
        message: 'Task processed successfully by Groq',
        data: {
          note: newNote,
          next_lane: targetLane,
        },
      };
    } catch (error: any) {
      console.error(`Failed to process task ${taskId} with Groq:`, error);

      dbManager.recordModelUsage({
        model: `groq/${model}`,
        task_id: task.id,
        task_title: task.title,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        estimated_cost_usd: 0,
        status: 'error',
        error_message: error.message,
      });

      const updatedStats = dbManager.getModelUsageStats();
      sseManager.broadcast('agent_usage_updated', updatedStats);

      return {
        success: false,
        message: error.message || 'Unknown error occurred while executing Groq',
      };
    } finally {
      this.isProcessingTask.delete(taskId);
    }
  }
}

export const groqAgentService = new GroqAgentService();
