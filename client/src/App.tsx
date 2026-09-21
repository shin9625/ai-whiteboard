import React, { useState, useEffect, useCallback } from 'react';
import { Lane, Task, TaskDetail } from './types';
import * as api from './api';
import { useSSE } from './hooks/useSSE';
import { Header } from './components/Header';
import { LaneColumn } from './components/LaneColumn';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { SearchModal } from './components/SearchModal';
import { LegendModal } from './components/LegendModal';
import { AgentSimModal } from './components/AgentSimModal';
import { NewTaskModal } from './components/NewTaskModal';

export function App() {
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>('task-1');
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskDetail | null>(null);

  const [activeView, setActiveView] = useState<'board' | 'bookmarks'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTags, setShowTags] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Modals
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isAgentSimOpen, setIsAgentSimOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [lanesData, tasksData] = await Promise.all([
        api.fetchLanes(),
        api.fetchTasks(),
      ]);
      setLanes(lanesData);
      setTasks(tasksData);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Task Detail when selectedTaskId changes
  const loadTaskDetail = useCallback(async (id: string) => {
    try {
      const detail = await api.fetchTaskDetail(id);
      setSelectedTaskDetail(detail);
    } catch (err) {
      console.error(`Failed to load task ${id} detail:`, err);
    }
  }, []);

  useEffect(() => {
    if (selectedTaskId) {
      loadTaskDetail(selectedTaskId);
    } else {
      setSelectedTaskDetail(null);
    }
  }, [selectedTaskId, loadTaskDetail]);

  // Handle SSE Realtime Events
  const handleBoardEvent = useCallback(
    (event: any) => {
      console.log('📡 SSE Event Received:', event.type, event.payload);
      // Reload tasks and detail if current
      loadData();
      if (selectedTaskId) {
        loadTaskDetail(selectedTaskId);
      }
    },
    [loadData, selectedTaskId, loadTaskDetail]
  );

  const { isConnected: isSSEConnected } = useSSE(handleBoardEvent);

  // Global Keyboard Shortcuts (Ctrl+K, Cmd+K, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsSearchModalOpen(false);
        setIsLegendOpen(false);
        setIsAgentSimOpen(false);
        setIsNewTaskOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Theme Toggle Effect
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Actions
  const handleTaskDrop = async (taskId: string, targetLaneId: string) => {
    try {
      const task = tasks.find((t) => t.id === taskId);
      await api.moveTaskLane(taskId, targetLaneId, undefined, task?.version);
      loadData();
      if (selectedTaskId === taskId) {
        loadTaskDetail(taskId);
      }
    } catch (err: any) {
      alert(err.message);
      loadData();
    }
  };

  const handleUpdateTask = async (updates: any, expectedVersion?: number) => {
    if (!selectedTaskId) return;
    try {
      await api.updateTask(selectedTaskId, updates, expectedVersion);
      loadData();
      loadTaskDetail(selectedTaskId);
    } catch (err: any) {
      alert(err.message);
      loadData();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('このタスクを削除しますか？')) return;
    try {
      await api.deleteTask(taskId);
      setSelectedTaskId(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddNote = async (content: string, author: 'human' | 'agent' = 'human') => {
    if (!selectedTaskId) return;
    try {
      await api.addStickyNote(selectedTaskId, content, author);
      loadTaskDetail(selectedTaskId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateNote = async (noteId: string, content: string) => {
    try {
      await api.updateStickyNote(noteId, content);
      if (selectedTaskId) loadTaskDetail(selectedTaskId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.deleteStickyNote(noteId);
      if (selectedTaskId) loadTaskDetail(selectedTaskId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetBoard = async () => {
    if (!confirm('ボードを初期状態（画像と同じデモデータ）にリセットしますか？')) return;
    try {
      await api.resetBoard();
      setSelectedTaskId('task-1');
      loadData();
      loadTaskDetail('task-1');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateTask = async (taskData: any) => {
    try {
      const newTask = await api.createTask(taskData);
      setSelectedTaskId(newTask.id);
      loadData();
      loadTaskDetail(newTask.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Agent Simulation Execution
  const handleSimulateAction = async (actionType: 'create_decision' | 'add_agent_note' | 'complete_task') => {
    if (actionType === 'create_decision') {
      await api.createTask({
        title: '【AI判断伺い】GPUメモリキャッシュ最適化方針をA案かB案どちらにするか',
        lane_id: 'need_decision',
        priority: 1,
        assignee: 'human',
        project: 'llm-infra',
        tags: ['decision', 'gpu'],
        icon: 'alert',
      });
    } else if (actionType === 'add_agent_note') {
      const targetId = selectedTaskId || 'task-1';
      await api.addStickyNote(
        targetId,
        'エージェント作業ログ: ベンチマーク測定完了。レイテンシ15%削減を確認。次のステップに進みます。',
        'agent',
        'エージェント'
      );
    } else if (actionType === 'complete_task') {
      const targetId = selectedTaskId || 'task-1';
      const task = tasks.find((t) => t.id === targetId);
      await api.moveTaskLane(targetId, 'completed', 1, task?.version);
    }
    loadData();
    if (selectedTaskId) loadTaskDetail(selectedTaskId);
  };

  const handleTriggerAgent = (task: TaskDetail) => {
    const prompt = `タスク「${task.title}」（プロジェクト: ${task.project}）の作業をエージェントに依頼します。`;
    navigator.clipboard.writeText(prompt);
    alert(`エージェントへの依頼プロンプトをクリップボードにコピーしました！\n\n「${prompt}」\n\nAntigravityなどのAIチャットに貼り付けて実行してください。`);
  };

  // Filter tasks by view and search query
  const filteredTasks = tasks.filter((t) => {
    if (activeView === 'bookmarks' && !t.is_bookmarked) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.project.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  const bookmarkCount = tasks.filter((t) => t.is_bookmarked).length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Header */}
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        bookmarkCount={bookmarkCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSearchModal={() => setIsSearchModalOpen(true)}
        showTags={showTags}
        onToggleTags={() => setShowTags((prev) => !prev)}
        isDark={isDark}
        onToggleDark={() => setIsDark((prev) => !prev)}
        onOpenAgentSim={() => setIsAgentSimOpen(true)}
        onResetBoard={handleResetBoard}
        onOpenLegend={() => setIsLegendOpen(true)}
        onNewTask={() => setIsNewTaskOpen(true)}
        isSSEConnected={isSSEConnected}
      />

      {/* Main Board Area */}
      <main className="flex-1 flex gap-3 px-4 pb-4 overflow-hidden">
        {/* Left: Task Detail Drawer (if selected) */}
        {selectedTaskDetail && (
          <TaskDetailDrawer
            taskDetail={selectedTaskDetail}
            onClose={() => setSelectedTaskId(null)}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onTriggerAgent={handleTriggerAgent}
          />
        )}

        {/* Right: Kanban Columns (Horizontal Scrollable) */}
        <div className="flex-1 flex gap-3 overflow-x-auto pb-2 items-start">
          {lanes.map((lane) => {
            const laneTasks = filteredTasks.filter((t) => t.lane_id === lane.id);
            return (
              <LaneColumn
                key={lane.id}
                lane={lane}
                tasks={laneTasks}
                selectedTaskId={selectedTaskId}
                showTags={showTags}
                onSelectTask={(task) => setSelectedTaskId(task.id)}
                onTaskDrop={handleTaskDrop}
              />
            );
          })}
        </div>
      </main>

      {/* Modals */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        tasks={tasks}
        onSelectTask={(t) => setSelectedTaskId(t.id)}
      />

      <LegendModal
        isOpen={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
      />

      <AgentSimModal
        isOpen={isAgentSimOpen}
        onClose={() => setIsAgentSimOpen(false)}
        tasks={tasks}
        onSimulateAction={handleSimulateAction}
      />

      <NewTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        onCreateTask={handleCreateTask}
      />
    </div>
  );
}
export default App;
