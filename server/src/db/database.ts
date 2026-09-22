import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { Task, StickyNote, TaskHistory, Lane, LaneId, TaskDetail, ModelUsageRecord, ModelUsageStats } from '../types.js';

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
      // Run migrations for existing DB
      if (this.db) {
        try {
          this.db.run(`ALTER TABLE tasks ADD COLUMN html_content TEXT DEFAULT ''`);
        } catch {}
        try {
          this.db.run(`ALTER TABLE tasks ADD COLUMN artifacts TEXT DEFAULT '[]'`);
        } catch {}
      }
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
        html_content TEXT DEFAULT '',
        artifacts TEXT DEFAULT '[]',
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

      CREATE TABLE IF NOT EXISTS model_usage (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        model TEXT NOT NULL,
        task_id TEXT NOT NULL,
        task_title TEXT NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        estimated_cost_usd REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        error_message TEXT
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
    let sql = `SELECT id, title, lane_id, priority, assignee, project, tags, icon, is_bookmarked, version, html_content, artifacts, created_at, updated_at FROM tasks WHERE 1=1`;
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
      html_content: (v[10] as string) || '',
      artifacts: JSON.parse((v[11] as string) || '[]'),
      created_at: v[12] as string,
      updated_at: v[13] as string,
    }));
  }

  getTaskDetail(id: string): TaskDetail | null {
    if (!this.db) return null;
    const res = this.db.exec(
      `SELECT id, title, lane_id, priority, assignee, project, tags, icon, is_bookmarked, version, html_content, artifacts, created_at, updated_at FROM tasks WHERE id = ?`,
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
      html_content: (v[10] as string) || '',
      artifacts: JSON.parse((v[11] as string) || '[]'),
      created_at: v[12] as string,
      updated_at: v[13] as string,
    };

    const notesRes = this.db.exec(
      `SELECT id, task_id, author, author_name, content, created_at, updated_at FROM notes WHERE task_id = ? ORDER BY created_at ASC`,
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
    html_content?: string;
    artifacts?: any[];
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
    const html_content = taskData.html_content || '';
    const artifacts = JSON.stringify(taskData.artifacts || []);

    this.db.run(
      `INSERT INTO tasks (id, title, lane_id, priority, assignee, project, tags, icon, is_bookmarked, version, html_content, artifacts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, taskData.title, lane_id, priority, assignee, project, tags, icon, is_bookmarked, version, html_content, artifacts, now, now]
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
      html_content,
      artifacts: taskData.artifacts || [],
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
      html_content: string;
      artifacts: any[];
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
    const html_content = updates.html_content !== undefined ? updates.html_content : (current.html_content || '');
    const artifacts = updates.artifacts !== undefined ? JSON.stringify(updates.artifacts) : JSON.stringify(current.artifacts || []);

    this.db.run(
      `UPDATE tasks SET
        title = ?, lane_id = ?, priority = ?, assignee = ?, project = ?,
        tags = ?, icon = ?, is_bookmarked = ?, version = ?, html_content = ?, artifacts = ?, updated_at = ?
       WHERE id = ?`,
      [title, lane_id, priority, assignee, project, tags, icon, is_bookmarked, newVersion, html_content, artifacts, now, id]
    );

    const detailChanges: string[] = [];
    if (updates.lane_id && updates.lane_id !== current.lane_id) detailChanges.push(`レーンを ${updates.lane_id} に移動`);
    if (updates.title && updates.title !== current.title) detailChanges.push(`タイトルを変更`);
    if (updates.assignee && updates.assignee !== current.assignee) detailChanges.push(`担当を ${updates.assignee} に変更`);
    if (updates.html_content !== undefined) detailChanges.push(`HTML成果物を更新`);

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
      html_content,
      artifacts: updates.artifacts || current.artifacts || [],
      created_at: current.created_at,
      updated_at: now,
    };
  }

  updateTaskArtifacts(
    taskId: string,
    htmlContent?: string,
    artifacts?: any[],
    actor: 'human' | 'agent' = 'agent'
  ): Task {
    const current = this.getTaskDetail(taskId);
    if (!current) throw new Error(`Task ${taskId} not found`);

    return this.updateTask(
      taskId,
      {
        html_content: htmlContent !== undefined ? htmlContent : current.html_content,
        artifacts: artifacts !== undefined ? artifacts : current.artifacts,
      },
      undefined,
      actor
    );
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

  // --- Export & Sync/Restore ---
  getAllData(): { tasks: Task[]; notes: StickyNote[]; history: TaskHistory[]; lanes: Lane[] } {
    if (!this.db) return { tasks: [], notes: [], history: [], lanes: [] };
    const lanes = this.getLanes();
    const tasks = this.getTasks();

    const notesRes = this.db.exec(`SELECT id, task_id, author, author_name, content, created_at, updated_at FROM notes ORDER BY created_at ASC`);
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

    const histRes = this.db.exec(`SELECT id, task_id, action, actor, detail, created_at FROM history ORDER BY created_at ASC`);
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

    return { tasks, notes, history, lanes };
  }

  restoreAllData(data: { tasks?: Task[]; notes?: StickyNote[]; history?: TaskHistory[] }): void {
    if (!this.db) throw new Error('Database not initialized');

    // Clear existing tasks, notes, history
    this.db.run(`DELETE FROM notes`);
    this.db.run(`DELETE FROM history`);
    this.db.run(`DELETE FROM tasks`);

    const now = new Date().toISOString();

    if (data.tasks && Array.isArray(data.tasks)) {
      for (const t of data.tasks) {
        const tags = Array.isArray(t.tags) ? JSON.stringify(t.tags) : '[]';
        this.db.run(
          `INSERT INTO tasks (id, title, lane_id, priority, assignee, project, tags, icon, is_bookmarked, version, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.id,
            t.title,
            t.lane_id || 'in_progress',
            t.priority || 1,
            t.assignee || 'both',
            t.project || '',
            tags,
            t.icon || 'doc',
            t.is_bookmarked ? 1 : 0,
            t.version || 1,
            t.created_at || now,
            t.updated_at || now,
          ]
        );
      }
    }

    if (data.notes && Array.isArray(data.notes)) {
      for (const n of data.notes) {
        this.db.run(
          `INSERT INTO notes (id, task_id, author, author_name, content, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            n.id,
            n.task_id,
            n.author || 'human',
            n.author_name || (n.author === 'agent' ? 'エージェント' : 'ユーザー'),
            n.content || '',
            n.created_at || now,
            n.updated_at || now,
          ]
        );
      }
    }

    if (data.history && Array.isArray(data.history)) {
      for (const h of data.history) {
        this.db.run(
          `INSERT INTO history (id, task_id, action, actor, detail, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [h.id, h.task_id, h.action, h.actor, h.detail, h.created_at || now]
        );
      }
    }

    this.saveToFile();
  }

  // --- Model Usage & Monitoring ---
  recordModelUsage(usage: Omit<ModelUsageRecord, 'id' | 'timestamp'>): ModelUsageRecord {
    if (!this.db) throw new Error('Database not initialized');
    const id = `usage-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO model_usage (id, timestamp, model, task_id, task_title, input_tokens, output_tokens, total_tokens, estimated_cost_usd, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        now,
        usage.model,
        usage.task_id,
        usage.task_title,
        usage.input_tokens,
        usage.output_tokens,
        usage.total_tokens,
        usage.estimated_cost_usd,
        usage.status,
        usage.error_message || null,
      ]
    );

    this.saveToFile();
    return {
      id,
      timestamp: now,
      ...usage,
    };
  }

  getModelUsageStats(): ModelUsageStats {
    const isApiKeyConfigured = Boolean(process.env.GEMINI_API_KEY);
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const dailyLimit = 1500; // Free Tier limit for Gemini Flash (1,500 RPD)

    if (!this.db) {
      return {
        model_name: modelName,
        is_api_key_configured: isApiKeyConfigured,
        daily_limit: dailyLimit,
        today_requests: 0,
        today_input_tokens: 0,
        today_output_tokens: 0,
        today_total_tokens: 0,
        today_cost_usd: 0,
        today_cost_jpy: 0,
        all_time_requests: 0,
        all_time_tokens: 0,
        recent_logs: [],
      };
    }

    // Today's start in UTC/ISO
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    // Today's stats
    const todayRes = this.db.exec(
      `SELECT COUNT(*), COALESCE(SUM(input_tokens), 0), COALESCE(SUM(output_tokens), 0), COALESCE(SUM(total_tokens), 0), COALESCE(SUM(estimated_cost_usd), 0)
       FROM model_usage WHERE timestamp >= ?`,
      [todayIso]
    );

    let todayRequests = 0;
    let todayInputTokens = 0;
    let todayOutputTokens = 0;
    let todayTotalTokens = 0;
    let todayCostUsd = 0;

    if (todayRes.length && todayRes[0].values.length) {
      const row = todayRes[0].values[0];
      todayRequests = Number(row[0]) || 0;
      todayInputTokens = Number(row[1]) || 0;
      todayOutputTokens = Number(row[2]) || 0;
      todayTotalTokens = Number(row[3]) || 0;
      todayCostUsd = Number(row[4]) || 0;
    }

    // All-time stats
    const allRes = this.db.exec(
      `SELECT COUNT(*), COALESCE(SUM(total_tokens), 0) FROM model_usage`
    );
    let allTimeRequests = 0;
    let allTimeTokens = 0;
    if (allRes.length && allRes[0].values.length) {
      const row = allRes[0].values[0];
      allTimeRequests = Number(row[0]) || 0;
      allTimeTokens = Number(row[1]) || 0;
    }

    // Recent logs (latest 15)
    const logsRes = this.db.exec(
      `SELECT id, timestamp, model, task_id, task_title, input_tokens, output_tokens, total_tokens, estimated_cost_usd, status, error_message
       FROM model_usage ORDER BY timestamp DESC LIMIT 15`
    );

    const recentLogs: ModelUsageRecord[] = logsRes.length
      ? logsRes[0].values.map((v) => ({
          id: v[0] as string,
          timestamp: v[1] as string,
          model: v[2] as string,
          task_id: v[3] as string,
          task_title: v[4] as string,
          input_tokens: Number(v[5]),
          output_tokens: Number(v[6]),
          total_tokens: Number(v[7]),
          estimated_cost_usd: Number(v[8]),
          status: v[9] as any,
          error_message: v[10] ? (v[10] as string) : undefined,
        }))
      : [];

    return {
      model_name: modelName,
      is_api_key_configured: isApiKeyConfigured,
      daily_limit: dailyLimit,
      today_requests: todayRequests,
      today_input_tokens: todayInputTokens,
      today_output_tokens: todayOutputTokens,
      today_total_tokens: todayTotalTokens,
      today_cost_usd: Number(todayCostUsd.toFixed(6)),
      today_cost_jpy: Number((todayCostUsd * 155).toFixed(4)),
      all_time_requests: allTimeRequests,
      all_time_tokens: allTimeTokens,
      recent_logs: recentLogs,
    };
  }
}

export const dbManager = new DatabaseManager();

