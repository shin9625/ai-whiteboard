import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { dbManager } from '../db/database.js';
import { sseManager } from '../api/sse.js';
import { LaneId } from '../types.js';

export function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'ai-whiteboard-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Define tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'list_tasks',
          description:
            'WHITEBOARDカンバン上のタスク一覧を取得します。レーンやプロジェクト、キーワードで絞り込み可能です。',
          inputSchema: {
            type: 'object',
            properties: {
              lane_id: {
                type: 'string',
                enum: ['in_progress', 'need_decision', 'waiting_agent', 'on_hold', 'completed', 'ideas'],
                description:
                  'レーンID (in_progress: 進行中, need_decision: あなたの判断待ち, waiting_agent: エージェント待ち, on_hold: 保留, completed: 完了, ideas: アイデア/未着手)',
              },
              project: {
                type: 'string',
                description: 'プロジェクト名（例: nuko-whiteboard, llm-infra）',
              },
              search: {
                type: 'string',
                description: '検索キーワード（タイトル・タグ・プロジェクト名）',
              },
              is_bookmarked: {
                type: 'boolean',
                description: 'ブックマークされているタスクのみ取得する場合 true',
              },
            },
          },
        },
        {
          name: 'get_task',
          description:
            '指定したタスクの詳細情報（貼られている付箋メモ一覧、更新履歴など）を取得します。',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'タスクID（例: task-1）',
              },
            },
            required: ['task_id'],
          },
        },
        {
          name: 'create_task',
          description:
            'WHITEBOARDカンバン上に新しいタスクを作成します。作成するとブラウザ側に即座にリアルタイム反映されます。',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'タスクのタイトル（最大60文字）',
              },
              lane_id: {
                type: 'string',
                enum: ['in_progress', 'need_decision', 'waiting_agent', 'on_hold', 'completed', 'ideas'],
                description: '配置するレーンID（デフォルト: waiting_agent または in_progress）',
              },
              priority: {
                type: 'number',
                description: '優先順位番号（1が最優先）',
              },
              assignee: {
                type: 'string',
                enum: ['human', 'agent', 'both'],
                description: '担当者（human: 人間, agent: エージェント, both: 両方）',
              },
              project: {
                type: 'string',
                description: 'プロジェクト名',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'タグリスト（例: ["whiteboard", "api"]）',
              },
              icon: {
                type: 'string',
                enum: ['doc', 'code', 'chart', 'download', 'speaker', 'alert', 'check', 'cpu'],
                description: 'タイルのアイコン種別',
              },
            },
            required: ['title'],
          },
        },
        {
          name: 'move_task_lane',
          description:
            'タスクを別のレーンに移動します。例: AIが人間の判断を仰ぎたいときに「need_decision (あなたの判断待ち)」に移動したり、作業が完了したら「completed (完了)」に移動します。ブラウザ側にもリアルタイム同期されます。',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: '移動するタスクID',
              },
              lane_id: {
                type: 'string',
                enum: ['in_progress', 'need_decision', 'waiting_agent', 'on_hold', 'completed', 'ideas'],
                description: '移動先のレーンID',
              },
              priority: {
                type: 'number',
                description: '新しいレーン内での優先順位（任意）',
              },
              expected_version: {
                type: 'number',
                description: '楽観的ロック用の現在バージョン番号（任意）',
              },
            },
            required: ['task_id', 'lane_id'],
          },
        },
        {
          name: 'update_task',
          description:
            'タスクのタイトル、担当、タグ、プロジェクトなどを更新します。楽観的ロック対応。',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'タスクID',
              },
              title: {
                type: 'string',
                description: '新しいタイトル',
              },
              assignee: {
                type: 'string',
                enum: ['human', 'agent', 'both'],
              },
              project: {
                type: 'string',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
              },
              icon: {
                type: 'string',
                enum: ['doc', 'code', 'chart', 'download', 'speaker', 'alert', 'check', 'cpu'],
              },
              expected_version: {
                type: 'number',
                description: '楽観的ロック用の期待バージョン番号',
              },
            },
            required: ['task_id'],
          },
        },
        {
          name: 'add_sticky_note',
          description:
            'タスクに付箋（300文字以内のメモ・進捗報告・質問事項）を貼ります。AIエージェントの思考や途中経過を記録するのに最適です。ブラウザ側にも即座に表示されます。',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: '付箋を貼るタスクID',
              },
              content: {
                type: 'string',
                description: '付箋の内容（最大300文字）',
              },
              author_name: {
                type: 'string',
                description: '投稿者名（デフォルト: "エージェント"）',
              },
            },
            required: ['task_id', 'content'],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'list_tasks': {
          const tasks = dbManager.getTasks({
            lane_id: args?.lane_id as string,
            project: args?.project as string,
            search: args?.search as string,
            is_bookmarked: args?.is_bookmarked as boolean,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }],
          };
        }

        case 'get_task': {
          const task = dbManager.getTaskDetail(String(args?.task_id));
          if (!task) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Task ${args?.task_id} not found.` }],
            };
          }
          return {
            content: [{ type: 'text', text: JSON.stringify(task, null, 2) }],
          };
        }

        case 'create_task': {
          const task = dbManager.createTask({
            title: String(args?.title),
            lane_id: (args?.lane_id as LaneId) || 'waiting_agent',
            priority: Number(args?.priority) || 1,
            assignee: (args?.assignee as any) || 'agent',
            project: String(args?.project || ''),
            tags: (args?.tags as string[]) || [],
            icon: (args?.icon as any) || 'doc',
            actor: 'agent',
          });
          sseManager.broadcast('task_created', task);
          return {
            content: [
              {
                type: 'text',
                text: `タスクを作成しました（ID: ${task.id}、タイトル: 「${task.title}」）。ブラウザUIにリアルタイム反映されました。`,
              },
            ],
          };
        }

        case 'move_task_lane': {
          const task = dbManager.updateTask(
            String(args?.task_id),
            {
              lane_id: args?.lane_id as LaneId,
              priority: args?.priority !== undefined ? Number(args?.priority) : undefined,
            },
            args?.expected_version !== undefined ? Number(args?.expected_version) : undefined,
            'agent'
          );
          sseManager.broadcast('task_moved', task);
          return {
            content: [
              {
                type: 'text',
                text: `タスク（ID: ${task.id}）をレーン「${task.lane_id}」に移動しました。ブラウザUIにリアルタイム反映されました。`,
              },
            ],
          };
        }

        case 'update_task': {
          const task = dbManager.updateTask(
            String(args?.task_id),
            {
              title: args?.title ? String(args.title) : undefined,
              assignee: args?.assignee as any,
              project: args?.project ? String(args.project) : undefined,
              tags: args?.tags as string[],
              icon: args?.icon as any,
            },
            args?.expected_version !== undefined ? Number(args?.expected_version) : undefined,
            'agent'
          );
          sseManager.broadcast('task_updated', task);
          return {
            content: [
              {
                type: 'text',
                text: `タスク（ID: ${task.id}）を更新しました（新バージョン: v${task.version}）。`,
              },
            ],
          };
        }

        case 'add_sticky_note': {
          const note = dbManager.addNote(
            String(args?.task_id),
            String(args?.content),
            'agent',
            (args?.author_name as string) || 'エージェント'
          );
          sseManager.broadcast('note_added', note);
          return {
            content: [
              {
                type: 'text',
                text: `タスク（ID: ${args?.task_id}）に付箋を貼りました: 「${note.content}」。ブラウザUIにリアルタイム反映されました。`,
              },
            ],
          };
        }

        default:
          return {
            isError: true,
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          };
      }
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${err.message}` }],
      };
    }
  });

  return server;
}
