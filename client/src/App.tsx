import React, { useState, useEffect, useCallback } from 'react';
import { Lane, Task, TaskDetail, ModelUsageStats } from './types';
import * as api from './api';
import { useSSE } from './hooks/useSSE';
import { Header } from './components/Header';
import { LaneColumn } from './components/LaneColumn';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { SearchModal } from './components/SearchModal';
import { LegendModal } from './components/LegendModal';
import { AgentSimModal } from './components/AgentSimModal';
import { AgentUsageModal } from './components/AgentUsageModal';
import { NewTaskModal } from './components/NewTaskModal';

export function App() {
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  // Empty initial selection (no demo task selected)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskDetail | null>(null);
  const [usageStats, setUsageStats] = useState<ModelUsageStats | null>(null);

  const [activeView, setActiveView] = useState<'board' | 'bookmarks'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTags, setShowTags] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });
  const [activeMobileLane, setActiveMobileLane] = useState<string>('in_progress');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modals
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isAgentSimOpen, setIsAgentSimOpen] = useState(false);
  const [isAgentUsageOpen, setIsAgentUsageOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  const STORAGE_KEY = 'ai_whiteboard_backup_v1';

  // Load Model Usage Stats
  const loadUsageStats = useCallback(async () => {
    try {
      const stats = await api.fetchModelUsage();
      setUsageStats(stats);
    } catch (err) {
      console.error('Failed to load model usage stats:', err);
    }
  }, []);

  // Load initial data with Render auto-restore & LocalStorage backup
  const loadData = useCallback(async () => {
    try {
      const [lanesData, tasksData] = await Promise.all([
        api.fetchLanes(),
        api.fetchTasks(),
      ]);
      setLanes(lanesData);

      // Render再起動対策: サーバー上のタスクが0件だが、ブラウザLocalStorageにデータが存在する場合
      if (tasksData.length === 0) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.tasks && parsed.tasks.length > 0) {
              console.log('🔄 Renderサーバー再起動を検知: ローカル保存データから自動復元中...');
              await api.syncBoardData(parsed);
              const restoredTasks = await api.fetchTasks();
              setTasks(restoredTasks);
              return;
            }
          } catch (e) {
            console.error('LocalStorage復元エラー:', e);
          }
        }
      }

      setTasks(tasksData);

      // サーバーにデータがある場合は、LocalStorageに自動保存
      if (tasksData.length > 0) {
        api.exportBoardData().then((fullData) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fullData));
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadUsageStats();
  }, [loadData, loadUsageStats]);

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
      // Reload tasks, usage stats and detail if current
      loadData();
      loadUsageStats();
      if (selectedTaskId) {
        loadTaskDetail(selectedTaskId);
      }
    },
    [loadData, loadUsageStats, selectedTaskId, loadTaskDetail]
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
        setIsAgentUsageOpen(false);
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
    if (!confirm('ボードをリセットして全てのタスクと付箋を消去しますか？\n（空の初期状態に戻ります）')) return;
    try {
      await api.resetBoard();
      localStorage.removeItem(STORAGE_KEY);
      setSelectedTaskId(null);
      setSelectedTaskDetail(null);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await api.exportBoardData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute('download', `ai-whiteboard-backup-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert('バックアップの保存に失敗しました: ' + err.message);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.tasks || !Array.isArray(data.tasks)) {
        throw new Error('無効なバックアップファイル形式です（tasksが見つかりません）');
      }
      if (!confirm(`バックアップからタスク ${data.tasks.length} 件を復元しますか？\n現在のボードは上書きされます。`)) {
        return;
      }
      await api.syncBoardData(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      await loadData();
      alert('バックアップから正常に復元しました！');
    } catch (err: any) {
      alert('復元エラー: ' + err.message);
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
      const targetId = selectedTaskId || tasks[0]?.id;
      if (!targetId) {
        alert('先にタスクを1つ以上追加してください。');
        return;
      }
      await api.addStickyNote(
        targetId,
        'エージェント作業ログ: ベンチマーク測定完了。レイテンシ15%削減を確認。次のステップに進みます。',
        'agent',
        'エージェント'
      );
    } else if (actionType === 'complete_task') {
      const targetId = selectedTaskId || tasks[0]?.id;
      if (!targetId) {
        alert('先にタスクを1つ以上追加してください。');
        return;
      }
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

  const handleRunGeminiTask = async (taskId: string) => {
    try {
      const res = await api.triggerAgentTask(taskId);
      if (!res.success) {
        alert(res.message || 'Geminiの実行に失敗しました');
      }
      await Promise.all([loadData(), loadUsageStats()]);
      if (selectedTaskId === taskId) {
        loadTaskDetail(taskId);
      }
    } catch (err: any) {
      alert('エラー: ' + err.message);
    }
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
        onOpenAgentUsage={() => setIsAgentUsageOpen(true)}
        todayUsageRequests={usageStats?.today_requests}
        isApiKeyConfigured={usageStats?.is_api_key_configured}
        onResetBoard={handleResetBoard}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onOpenLegend={() => setIsLegendOpen(true)}
        onNewTask={() => setIsNewTaskOpen(true)}
        isSSEConnected={isSSEConnected}
      />

      {/* Mobile Lane Selector Bar (md:hidden) */}
      <div className="md:hidden px-2 pb-2 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
        {lanes.map((lane) => {
          const count = filteredTasks.filter((t) => t.lane_id === lane.id).length;
          const isActive = activeMobileLane === lane.id;
          return (
            <button
              key={lane.id}
              onClick={() => setActiveMobileLane(lane.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              <span>{lane.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setActiveMobileLane('all')}
          className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeMobileLane === 'all'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60'
          }`}
        >
          全レーン
        </button>
      </div>

      {/* Empty State Banner */}
      {tasks.length === 0 && (
        <div className="mx-2 sm:mx-4 mb-2 p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-blue-800 dark:text-blue-200 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="text-base">💡</span>
            <span>
              <strong>ボードは空です。</strong> 右上の「追加」ボタンから最初のタスクを作成できます。
              データはブラウザ内に自動バックアップされるため、Renderが再起動しても初期化されません。
            </span>
          </div>
          <button
            onClick={() => setIsNewTaskOpen(true)}
            className="flex-shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs active:scale-95 transition-all"
          >
            ＋ タスクを作成
          </button>
        </div>
      )}

      {/* Main Board Area */}
      <main className="flex-1 flex gap-3 px-2 sm:px-4 pb-2 sm:pb-4 overflow-hidden">
        {/* Task Detail Drawer */}
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
            onRunGemini={handleRunGeminiTask}
          />
        )}

        {/* Kanban Columns (Single lane on mobile unless 'all', all lanes on desktop) */}
        <div className="flex-1 flex gap-3 overflow-x-auto pb-2 items-start w-full">
          {lanes
            .filter((lane) => {
              if (!isMobile) return true;
              if (activeMobileLane === 'all') return true;
              return lane.id === activeMobileLane;
            })
            .map((lane) => {
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

      <AgentUsageModal
        isOpen={isAgentUsageOpen}
        onClose={() => setIsAgentUsageOpen(false)}
        stats={usageStats}
        onRefresh={loadUsageStats}
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
