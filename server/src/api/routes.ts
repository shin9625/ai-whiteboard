import { Router, Request, Response } from 'express';
import { dbManager } from '../db/database.js';
import { sseManager } from './sse.js';
import { geminiAgent } from '../services/geminiAgent.js';
import { groqAgentService } from '../services/groqAgent.js';

export const apiRouter = Router();

// Dispatch to preferred AI agent with automatic cross-provider fallback
const dispatchAIAgent = async (taskId: string, provider?: string) => {
  const chosen = provider || process.env.DEFAULT_AI_PROVIDER || (process.env.GROQ_API_KEY ? 'groq' : 'gemini');
  
  if (chosen === 'groq') {
    if (process.env.GROQ_API_KEY) {
      const groqRes = await groqAgentService.processTask(taskId);
      if (groqRes.success || !process.env.GEMINI_API_KEY) {
        return groqRes;
      }
      console.warn(`Groq execution failed (${groqRes.message}), falling back to Gemini...`);
    }
    return await geminiAgent.processTask(taskId);
  } else {
    if (process.env.GEMINI_API_KEY) {
      const geminiRes = await geminiAgent.processTask(taskId);
      if (geminiRes.success || !process.env.GROQ_API_KEY) {
        return geminiRes;
      }
      console.warn(`Gemini execution failed (${geminiRes.message}), falling back to Groq Llama 3.3...`);
    }
    if (process.env.GROQ_API_KEY) {
      return await groqAgentService.processTask(taskId);
    }
    return await geminiAgent.processTask(taskId);
  }
};

// SSE Stream
apiRouter.get('/events', (req: Request, res: Response) => {
  sseManager.addClient(res);
});

// Lanes
apiRouter.get('/lanes', (_req: Request, res: Response) => {
  try {
    const lanes = dbManager.getLanes();
    res.json({ success: true, data: lanes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tasks
apiRouter.get('/tasks', (req: Request, res: Response) => {
  try {
    const { lane_id, search, project, is_bookmarked } = req.query;
    const tasks = dbManager.getTasks({
      lane_id: lane_id as string,
      search: search as string,
      project: project as string,
      is_bookmarked: is_bookmarked !== undefined ? is_bookmarked === 'true' : undefined,
    });
    res.json({ success: true, data: tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Task Detail
apiRouter.get('/tasks/:id', (req: Request, res: Response) => {
  try {
    const task = dbManager.getTaskDetail(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Task
apiRouter.post('/tasks', (req: Request, res: Response) => {
  try {
    const task = dbManager.createTask(req.body);
    sseManager.broadcast('task_created', task);

    // Auto-trigger agent if created in waiting_agent lane or assigned to agent
    if (task.lane_id === 'waiting_agent' || task.assignee === 'agent') {
      setTimeout(() => dispatchAIAgent(task.id), 300);
    }

    res.status(201).json({ success: true, data: task });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update Task (with Optimistic Locking)
apiRouter.put('/tasks/:id', (req: Request, res: Response) => {
  try {
    const { expected_version, ...updates } = req.body;
    const task = dbManager.updateTask(
      req.params.id,
      updates,
      expected_version !== undefined ? Number(expected_version) : undefined,
      'human'
    );
    sseManager.broadcast('task_updated', task);
    res.json({ success: true, data: task });
  } catch (err: any) {
    const isConflict = err.message.includes('楽観的ロック競合');
    res.status(isConflict ? 409 : 400).json({ success: false, error: err.message });
  }
});

// Move Task Lane
apiRouter.post('/tasks/:id/move', (req: Request, res: Response) => {
  try {
    const { lane_id, priority, expected_version } = req.body;
    const task = dbManager.updateTask(
      req.params.id,
      { lane_id, priority },
      expected_version !== undefined ? Number(expected_version) : undefined,
      'human'
    );
    sseManager.broadcast('task_moved', task);

    // Auto-trigger agent if moved to waiting_agent
    if (task.lane_id === 'waiting_agent') {
      setTimeout(() => dispatchAIAgent(task.id), 400);
    }

    res.json({ success: true, data: task });
  } catch (err: any) {
    const isConflict = err.message.includes('楽観的ロック競合');
    res.status(isConflict ? 409 : 400).json({ success: false, error: err.message });
  }
});

// Delete Task
apiRouter.delete('/tasks/:id', (req: Request, res: Response) => {
  try {
    dbManager.deleteTask(req.params.id, 'human');
    sseManager.broadcast('task_deleted', { id: req.params.id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Notes
apiRouter.post('/tasks/:id/notes', (req: Request, res: Response) => {
  try {
    const { content, author = 'human', author_name } = req.body;
    const note = dbManager.addNote(req.params.id, content, author, author_name);
    sseManager.broadcast('note_added', note);
    res.status(201).json({ success: true, data: note });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.put('/notes/:id', (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const note = dbManager.updateNote(req.params.id, content);
    sseManager.broadcast('note_updated', note);
    res.json({ success: true, data: note });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/notes/:id', (req: Request, res: Response) => {
  try {
    dbManager.deleteNote(req.params.id);
    sseManager.broadcast('note_deleted', { id: req.params.id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Reset Board (Demo reset)
apiRouter.post('/board/reset', (_req: Request, res: Response) => {
  try {
    dbManager.resetBoard();
    sseManager.broadcast('board_reset', {});
    res.json({ success: true, message: 'Board reset to initial seed state' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export Board Data (Backup)
apiRouter.get('/board/export', (_req: Request, res: Response) => {
  try {
    const data = dbManager.getAllData();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sync / Restore Board Data (from LocalStorage or JSON Import)
apiRouter.post('/board/sync', (req: Request, res: Response) => {
  try {
    const { tasks, notes, history } = req.body;
    dbManager.restoreAllData({ tasks, notes, history });
    sseManager.broadcast('board_reset', {});
    res.json({ success: true, message: 'Board data synced successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Gemini Agent Usage Stats
apiRouter.get('/agent/usage', (_req: Request, res: Response) => {
  try {
    const stats = dbManager.getModelUsageStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual Agent Trigger (with optional provider: 'gemini' | 'groq')
apiRouter.post('/agent/trigger/:id', async (req: Request, res: Response) => {
  try {
    const provider = req.body?.provider || (req.query.provider as string);
    const result = await dispatchAIAgent(req.params.id, provider);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Post chat message and optionally trigger AI response
apiRouter.post('/tasks/:id/chat', async (req: Request, res: Response) => {
  try {
    const { content, trigger_ai = true, provider } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    // 1. Add human message
    const humanNote = dbManager.addNote(req.params.id, content.trim(), 'human', 'あなた');
    sseManager.broadcast('note_added', humanNote);

    // 2. Trigger AI agent in background if requested
    if (trigger_ai) {
      setTimeout(() => dispatchAIAgent(req.params.id, provider), 200);
    }

    res.status(201).json({ success: true, data: humanNote });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
