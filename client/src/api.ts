import { Lane, Task, TaskDetail, StickyNote } from './types';

const API_BASE = '/api';

export async function fetchLanes(): Promise<Lane[]> {
  const res = await fetch(`${API_BASE}/lanes`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchTasks(filters?: {
  lane_id?: string;
  search?: string;
  project?: string;
  is_bookmarked?: boolean;
}): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters?.lane_id) params.set('lane_id', filters.lane_id);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.project) params.set('project', filters.project);
  if (filters?.is_bookmarked !== undefined) params.set('is_bookmarked', String(filters.is_bookmarked));

  const res = await fetch(`${API_BASE}/tasks?${params.toString()}`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchTaskDetail(id: string): Promise<TaskDetail | null> {
  const res = await fetch(`${API_BASE}/tasks/${id}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || null;
}

export async function createTask(data: Partial<Task>): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create task');
  return json.data;
}

export async function updateTask(
  id: string,
  data: Partial<Task>,
  expectedVersion?: number
): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, expected_version: expectedVersion }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update task');
  return json.data;
}

export async function moveTaskLane(
  id: string,
  laneId: string,
  priority?: number,
  expectedVersion?: number
): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks/${id}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lane_id: laneId, priority, expected_version: expectedVersion }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to move task');
  return json.data;
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete task');
}

export async function addStickyNote(
  taskId: string,
  content: string,
  author: 'human' | 'agent' = 'human',
  authorName?: string
): Promise<StickyNote> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, author, author_name: authorName }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to add note');
  return json.data;
}

export async function updateStickyNote(noteId: string, content: string): Promise<StickyNote> {
  const res = await fetch(`${API_BASE}/notes/${noteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update note');
  return json.data;
}

export async function deleteStickyNote(noteId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/notes/${noteId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete note');
}

export async function resetBoard(): Promise<void> {
  const res = await fetch(`${API_BASE}/board/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset board');
}
