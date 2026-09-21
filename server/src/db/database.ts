import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { Task, StickyNote, TaskHistory, Lane, LaneId, TaskDetail } from '../types.js';

function getProjectDataDir(): string {
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR);
  // Check if cwd has package.json with name "ai-whiteboard"
  if (fs.existsSync(path.resolve(process.cwd(), 'client')) && fs.existsSync(path.resolve(process.cwd(), 'server'))) {
    return path.resolve(process.cwd(), 'data');
  }
  // If inside server/
  if (fs.existsSync(path.resolve(process.cwd(), '../client'))) {
    return path.resolve(process.cwd(), '../data');
  }
  return path.resolve(process.cwd(), 'data');
}

const DB_DIR = getProjectDataDir();
const DB_PATH = path.join(DB_DIR, 'whiteboard.sqlite');

export class DatabaseManager {
  private db: SqlJsDatabase | null = null;
  private SQL: any = null;

  async init(): Promise<void> {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    this.SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      this.db = new this.SQL.Database(fileBuffer);
    } else {
      this.db = new this.SQL.Database();
      this.createSchema();
      this.seedInitialData();
      this.saveToFile();
    }
  }

  private saveToFile(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }

  private createSchema(): void {
    if (!this.db) return;
    this.db.run(`
      CREATE TABLE IF NOT EXISTS lanes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        description TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        lane_id TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 1,
        assignee TEXT NOT NULL DEFAULT 'both',
        project TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        icon TEXT NOT NULL DEFAULT 'doc',
        is_bookmarked INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (lane_id) REFERENCES lanes(id)
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        author TEXT NOT NULL,
        author_name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        detail TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );
    `);
  }

  private seedInitialData(): void {
    if (!this.db) return;

    const lanes: Lane[] = [
      { id: 'in_progress', name: '進行中', order_index: 1, description: '現在作業中のタスク' },
      { id: 'need_decision', name: 'あなたの判断待ち', order_index: 2, description: 'AIから人間へ判断・指示を仰ぐタスク' },
      { id: 'waiting_agent', name: 'エージェント待ち', order_index: 3, description: 'AIエージェントが実行を担当するタスク' },
      { id: 'on_hold', name: '保留', order_index: 4, description: 'バックログ・調査待ち' },
      { id: 'completed', name: '完了', order_index: 5, description: '完了したタスク' },
      { id: 'ideas', name: 'アイデア / 未着手', order_index: 6, description: 'ブックマークや今後の検討項目' },
    ];

    for (const lane of lanes) {
      this.db.run(
        `INSERT INTO lanes (id, name, order_index, description) VALUES (?, ?, ?, ?)`,
        [lane.id, lane.name, lane.order_index, lane.description]
      );
    }

    const now = new Date().toISOString();

    const sampleTasks = [
      {
        id: 'task-1',
        title: 'whiteboard: whiteboard-api の骨格を作る (Phase 1)',
        lane_id: 'in_progress',
        priority: 1,
        assignee: 'both',
        project: 'nuko-whiteboard',
        tags: JSON.stringify(['whiteboard']),
        icon: 'doc',
        is_bookmarked: 1,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'task-2',
        title: 'gateway に whiteboard の host 分岐を追加 (Phase 3)',
        lane_id: 'in_progress',
        priority: 2,
        assignee: 'agent',
        project: 'nuko-whiteboard',
        tags: JSON.stringify(['gateway', 'infra']),
        icon: 'code',
        is_bookmarked: 0,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'task-3',
        title: 'モックアップを見て感想を出す',
        lane_id: 'in_progress',
        priority: 3,
        assignee: 'human',
        project: 'nuko-whiteboard',
        tags: JSON.stringify(['ui', 'review']),
        icon: 'chart',
        is_bookmarked: 0,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'task-4',
        title: '1Cat-vLLM(24GB) と ninfer(23.7GB) のDLをどちら先にするか',
        lane_id: 'need_decision',
        priority: 1,
        assignee: 'human',
        project: 'llm-infra',
        tags: JSON.stringify(['vllm', 'download']),
        icon: 'download',
        is_bookmarked: 1,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'task-5',
        title: 'T-D(V100でTTSを動かす検証)をやるか、記録だけ残して捨てるか',
        lane_id: 'need_decision',
        priority: 2,
        assignee: 'human',
        project: 'audio-model',
        tags: JSON.stringify(['tts', 'v100']),
        icon: 'speaker',
        is_bookmarked: 0,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'task-6',
        title: 'A-Uta さん向け計測 (topo / P2P帯域 / x8x8 / TP2実測)',
        lane_id: 'waiting_agent',
        priority: 1,
        assignee: 'agent',
        project: 'benchmark',
        tags: JSON.stringify(['gpu', 'p2p']),
        icon: 'chart',
        is_bookmarked: 1,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'task-7',
        title: 'V-B1: 1Cat-vLLM の venv(py3.12) + wheel v1.5.0 導入',
        lane_id: 'waiting_agent',
        priority: 2,
        assignee: 'agent',
        project: 'llm-infra',
        tags: JSON.stringify(['setup', 'python']),
        icon: 'download',
        is_bookmarked: 0,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'task-8',
        title: 'grug-27b-v2 のMTP を split tensor で検証 (V-D)',
        lane_id: 'on_hold',
        priority: 1,
        assignee: 'both',
        project: 'llm-research',
        tags: JSON.stringify(['tensor']),
        icon: 'cpu',
        is_bookmarked: 0,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'task-9',
        title: 'ninfer-v100 の追試 (219 tok/s の再現確認)',
        lane_id: 'on_hold',
        priority: 2,
        assignee: 'agent',
        project: 'llm-research',
        tags: JSON.stringify(['benchmark']),
        icon: 'chart',
        is_bookmarked: 1,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'task-10',
        title: 'TP2専用の自作テンソル交換カーネル (V-E)',
        lane_id: 'on_hold',
        priority: 3,
        assignee: 'both',
        project: 'cuda-kernel',
        tags: JSON.stringify(['kernel', 'cuda']),
        icon: 'code',
        is_bookmarked: 0,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'task-11',
        title: 'LLKVApprox (nowokay) のメモを 1ページに (V-F)',
        lane_id: 'on_hold',
        priority: 4,
        assignee: 'both',
        project: 'notes',
        tags: JSON.stringify(['summary']),
        icon: 'doc',
        is_bookmarked: 1,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'task-12',
        title: '1Cat の NVFP4 モデルDL (V-B2)',
        lane_id: 'on_hold',
        priority: 6,
        assignee: 'agent',
        project: 'llm-infra',
        tags: JSON.stringify(['download', 'fp4']),
        icon: 'alert',
        is_bookmarked: 0,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'task-13',
        title: 'tduka-api の復旧',
        lane_id: 'completed',
        priority: 1,
        assignee: 'both',
        project: 'maintenance',
        tags: JSON.stringify(['api', 'fix']),
        icon: 'check',
        is_bookmarked: 0,
        version: 1,
        created_at: now,
        updated_at: now,
      },
    ];

    for (const t of sampleTasks) {
      this.db.run(
        `INSERT INTO tasks (id, title, lane_id, priority, assignee, project, tags, icon, is_bookmarked, version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.title, t.lane_id, t.priority, t.assignee, t.project, t.tags, t.icon, t.is_bookmarked, t.version, t.created_at, t.updated_at]
      );
    }

    // Sample notes for task-1
    const sampleNotes = [
      {
        id: 'note-1',
        task_id: 'task-1',
        author: 'agent',
        author_name: 'エージェント',
        content: 'X230 の :8086 に新サービス。node:sqlite（ネイティブ部品を使わない）で作る。',
        created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      },
      {
        id: 'note-2',
        task_id: 'task-1',
        author: 'agent',
        author_name: 'エージェント',
        content: 'レーン6本 / SSE / 楽観ロックは設計確定。付箋は1枚ずつ編集・削除できる形にする。',
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      }
    ];

    for (const n of sampleNotes) {
      this.db.run(
        `INSERT INTO notes (id, task_id, author, author_name, content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [n.id, n.task_id, n.author, n.author_name, n.content, n.created_at, n.updated_at]
      );
    }
  }

  // --- Read Operations ---
  getLanes(): Lane[] {
    if (!this.db) return [];
    const res = this.db.exec(`SELECT id, name, order_index, description FROM lanes ORDER BY order_index ASC`);
    if (!res.length) return [];
    return res[0].values.map((v) => ({
      id: v[0] as LaneId,
      name: v[1] as string,
      order_index: v[2] as number,
      description: v[3] as string,
    }));
  }

  getTasks(filters?: { lane_id?: string; search?: string; project?: string; is_bookmarked?: boolean }): Task[] {
    if (!this.db) return [];
    let sql = `SELECT id, title, lane_id, priority, assignee, project, tags, icon, is_bookmarked, version, created_at, updated_at FROM tasks WHERE 1=1`;
    const params: any[] = [];

    if (filters?.lane_id) {
      sql += ` AND lane_id = ?`;
      params.push(filters.lane_id);
    }
    if (filters?.is_bookmarked !== undefined) {
      sql += ` AND is_bookmarked = ?`;
      params.push(filters.is_bookmarked ? 1 : 0);
    }
    if (filters?.project) {
      sql += ` AND project = ?`;
      params.push(filters.project);
    }
    if (filters?.search) {
      sql += ` AND (title LIKE ? OR project LIKE ? OR tags LIKE ?)`;
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }

    sql += ` ORDER BY priority ASC, updated_at DESC`;

    const res = this.db.exec(sql, params);
    if (!res.length) return [];
    return res[0].values.map((v) => ({
      id: v[0] as string,
      title: v[1] as string,
      lane_id: v[2] as LaneId,
      priority: v[3] as number,
      assignee: v[4] as any,
      project: v[5] as string,
      tags: JSON.parse((v[6] as string) || '[]'),
      icon: v[7] as any,
      is_bookmarked: Boolean(v[8]),
      version: v[9] as number,
      created_at: v[10] as string,
      updated_at: v[11] as string,
    }));
  }

  getTaskDetail(id: string): TaskDetail | null {
    if (!this.db) return null;
    const res = this.db.exec(
      `SELECT id, title, lane_id, priority, assignee, project, tags, icon, is_bookmarked, version, created_at, updated_at FROM tasks WHERE id = ?`,
      [id]
    );
    if (!res.length || !res[0].values.length) return null;
    const v = res[0].values[0];
    const task: Task = {
      id: v[0] as string,
      title: v[1] as string,
      lane_id: v[2] as LaneId,
      priority: v[3] as number,
      assignee: v[4] as any,
      project: v[5] as string,
      tags: JSON.parse((v[6] as string) || '[]'),
      icon: v[7] as any,
      is_bookmarked: Boolean(v[8]),
      version: v[9] as number,
      created_at: v[10] as string,
      updated_at: v[11] as string,
    };

    const notesRes = this.db.exec(
      `SELECT id, task_id, author, author_name, content, created_at, updated_at FROM notes WHERE task_id = ? ORDER BY created_at DESC`,
      [id]
    );
    const notes: StickyNote[] = notesRes.length
      ? notesRes[0].values.map((row) => ({
          id: row[0] as string,
          task_id: row[1] as string,
          author: row[2] as any,
          author_name: row[3] as string,
          content: row[4] as string,
          created_at: row[5] as string,
          updated_at: row[6] as string,
        }))
      : [];

    const histRes = this.db.exec(
      `SELECT id, task_id, action, actor, detail, created_at FROM history WHERE task_id = ? ORDER BY created_at DESC`,
      [id]
    );
    const history: TaskHistory[] = histRes.length
      ? histRes[0].values.map((row) => ({
          id: row[0] as string,
          task_id: row[1] as string,
          action: row[2] as string,
          actor: row[3] as any,
          detail: row[4] as string,
          created_at: row[5] as string,
        }))
      : [];

    return { ...task, notes, history };
  }

  // --- Write Operations ---
  createTask(taskData: {
    title: string;
    lane_id?: LaneId;
    priority?: number;
    assignee?: any;
    project?: string;
    tags?: string[];
    icon?: any;
    is_bookmarked?: boolean;
    actor?: 'human' | 'agent';
  }): Task {
    if (!this.db) throw new Error('Database not initialized');
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const lane_id = taskData.lane_id || 'in_progress';
    const priority = taskData.priority || 1;
    const assignee = taskData.assignee || 'both';
    const project = taskData.project || '';
    const tags = JSON.stringify(taskData.tags || []);
    const icon = taskData.icon || 'doc';
    const is_bookmarked = taskData.is_bookmarked ? 1 : 0;
    const version = 1;

    this.db.run(
      `INSERT INTO tasks (id, title, lane_id, priority, assignee, project, tags, icon, is_bookmarked, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, taskData.title, lane_id, priority, assignee, project, tags, icon, is_bookmarked, version, now, now]
    );

    this.addHistory(id, 'タスク作成', taskData.actor || 'human', `タスク「${taskData.title}」を作成しました`);
    this.saveToFile();

    return {
      id,
      title: taskData.title,
      lane_id,
      priority,
      assignee,
      project,
      tags: taskData.tags || [],
      icon,
      is_bookmarked: Boolean(is_bookmarked),
      version,
      created_at: now,
      updated_at: now,
    };
  }

  updateTask(
    id: string,
    updates: Partial<{
      title: string;
      lane_id: LaneId;
      priority: number;
      assignee: any;
      project: string;
      tags: string[];
      icon: any;
      is_bookmarked: boolean;
    }>,
    expectedVersion?: number,
    actor: 'human' | 'agent' = 'human'
  ): Task {
    if (!this.db) throw new Error('Database not initialized');
    const current = this.getTaskDetail(id);
    if (!current) throw new Error(`Task ${id} not found`);

    // 楽観的ロック（Optimistic Lock）チェック
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new Error(
        `楽観的ロック競合: タスクのバージョンが変更されています (画面: v${expectedVersion}, DB: v${current.version})。最新データを再取得してください。`
      );
    }

    const now = new Date().toISOString();
    const newVersion = current.version + 1;
    const title = updates.title !== undefined ? updates.title : current.title;
    const lane_id = updates.lane_id !== undefined ? updates.lane_id : current.lane_id;
    const priority = updates.priority !== undefined ? updates.priority : current.priority;
    const assignee = updates.assignee !== undefined ? updates.assignee : current.assignee;
    const project = updates.project !== undefined ? updates.project : current.project;
    const tags = updates.tags !== undefined ? JSON.stringify(updates.tags) : JSON.stringify(current.tags);
    const icon = updates.icon !== undefined ? updates.icon : current.icon;
    const is_bookmarked = updates.is_bookmarked !== undefined ? (updates.is_bookmarked ? 1 : 0) : (current.is_bookmarked ? 1 : 0);

    this.db.run(
      `UPDATE tasks SET
        title = ?, lane_id = ?, priority = ?, assignee = ?, project = ?,
        tags = ?, icon = ?, is_bookmarked = ?, version = ?, updated_at = ?
       WHERE id = ?`,
      [title, lane_id, priority, assignee, project, tags, icon, is_bookmarked, newVersion, now, id]
    );

    const detailChanges: string[] = [];
    if (updates.lane_id && updates.lane_id !== current.lane_id) detailChanges.push(`レーンを ${updates.lane_id} に移動`);
    if (updates.title && updates.title !== current.title) detailChanges.push(`タイトルを変更`);
    if (updates.assignee && updates.assignee !== current.assignee) detailChanges.push(`担当を ${updates.assignee} に変更`);

    this.addHistory(id, 'タスク更新', actor, detailChanges.length ? detailChanges.join(', ') : 'タスク情報を更新');
    this.saveToFile();

    return {
      id,
      title,
      lane_id,
      priority,
      assignee,
      project,
      tags: updates.tags || current.tags,
      icon,
      is_bookmarked: Boolean(is_bookmarked),
      version: newVersion,
      created_at: current.created_at,
      updated_at: now,
    };
  }

  deleteTask(id: string, actor: 'human' | 'agent' = 'human'): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(`DELETE FROM notes WHERE task_id = ?`, [id]);
    this.db.run(`DELETE FROM history WHERE task_id = ?`, [id]);
    this.db.run(`DELETE FROM tasks WHERE id = ?`, [id]);
    this.saveToFile();
  }

  // --- Sticky Notes ---
  addNote(taskId: string, content: string, author: 'human' | 'agent' = 'human', authorName?: string): StickyNote {
    if (!this.db) throw new Error('Database not initialized');
    const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const resolvedName = authorName || (author === 'agent' ? 'エージェント' : 'ユーザー');

    this.db.run(
      `INSERT INTO notes (id, task_id, author, author_name, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [noteId, taskId, author, resolvedName, content.substring(0, 300), now, now]
    );

    // Update parent task updated_at
    this.db.run(`UPDATE tasks SET updated_at = ? WHERE id = ?`, [now, taskId]);
    this.addHistory(taskId, '付箋追加', author, `${resolvedName}が付箋を貼りました`);
    this.saveToFile();

    return {
      id: noteId,
      task_id: taskId,
      author,
      author_name: resolvedName,
      content: content.substring(0, 300),
      created_at: now,
      updated_at: now,
    };
  }

  updateNote(noteId: string, content: string): StickyNote {
    if (!this.db) throw new Error('Database not initialized');
    const now = new Date().toISOString();
    this.db.run(`UPDATE notes SET content = ?, updated_at = ? WHERE id = ?`, [content.substring(0, 300), now, noteId]);
    this.saveToFile();

    const res = this.db.exec(`SELECT id, task_id, author, author_name, content, created_at, updated_at FROM notes WHERE id = ?`, [noteId]);
    if (!res.length || !res[0].values.length) throw new Error(`Note ${noteId} not found`);
    const row = res[0].values[0];
    return {
      id: row[0] as string,
      task_id: row[1] as string,
      author: row[2] as any,
      author_name: row[3] as string,
      content: row[4] as string,
      created_at: row[5] as string,
      updated_at: row[6] as string,
    };
  }

  deleteNote(noteId: string): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(`DELETE FROM notes WHERE id = ?`, [noteId]);
    this.saveToFile();
  }

  private addHistory(taskId: string, action: string, actor: 'human' | 'agent', detail: string): void {
    if (!this.db) return;
    const histId = `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO history (id, task_id, action, actor, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [histId, taskId, action, actor, detail, now]
    );
  }

  // Reset to initial sample state
  resetBoard(): void {
    if (!this.db) return;
    this.db.run(`DELETE FROM notes`);
    this.db.run(`DELETE FROM history`);
    this.db.run(`DELETE FROM tasks`);
    this.db.run(`DELETE FROM lanes`);
    this.createSchema();
    this.seedInitialData();
    this.saveToFile();
  }
}

export const dbManager = new DatabaseManager();
