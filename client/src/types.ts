export type LaneId =
  | 'in_progress'
  | 'need_decision'
  | 'waiting_agent'
  | 'on_hold'
  | 'completed'
  | 'ideas';

export interface Lane {
  id: LaneId;
  name: string;
  order_index: number;
  description: string;
}

export type Assignee = 'human' | 'agent' | 'both';

export type TaskIcon =
  | 'doc'
  | 'code'
  | 'chart'
  | 'download'
  | 'speaker'
  | 'alert'
  | 'check'
  | 'cpu';

export interface Task {
  id: string;
  title: string;
  lane_id: LaneId;
  priority: number;
  assignee: Assignee;
  project: string;
  tags: string[];
  icon: TaskIcon;
  is_bookmarked: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface StickyNote {
  id: string;
  task_id: string;
  author: 'human' | 'agent';
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  action: string;
  actor: 'human' | 'agent';
  detail: string;
  created_at: string;
}

export interface TaskDetail extends Task {
  notes: StickyNote[];
  history: TaskHistory[];
}

export type BoardEventType =
  | 'task_created'
  | 'task_updated'
  | 'task_moved'
  | 'task_deleted'
  | 'note_added'
  | 'note_updated'
  | 'note_deleted'
  | 'board_reset';

export interface BoardEvent {
  type: BoardEventType;
  timestamp: string;
  payload: any;
}
