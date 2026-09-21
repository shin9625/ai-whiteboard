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
  | 'board_reset'
  | 'agent_action_started'
  | 'agent_action_completed'
  | 'agent_usage_updated';

export interface BoardEvent {
  type: BoardEventType;
  timestamp: string;
  payload: any;
}

export interface ModelUsageRecord {
  id: string;
  timestamp: string;
  model: string;
  task_id: string;
  task_title: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  status: 'success' | 'error';
  error_message?: string;
}

export interface ModelUsageStats {
  model_name: string;
  is_api_key_configured: boolean;
  daily_limit: number;
  today_requests: number;
  today_input_tokens: number;
  today_output_tokens: number;
  today_total_tokens: number;
  today_cost_usd: number;
  today_cost_jpy: number;
  all_time_requests: number;
  all_time_tokens: number;
  recent_logs: ModelUsageRecord[];
}

