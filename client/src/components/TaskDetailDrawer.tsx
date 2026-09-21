import React, { useState, useEffect } from 'react';
import { TaskDetail, LaneId, Assignee } from '../types';
import { renderTaskIcon, renderAssigneeIcon } from './TaskCard';
import { StickyNoteList, formatRelativeTime } from './StickyNoteList';
import {
  X,
  FileText,
  Paperclip,
  Code2,
  FolderKanban,
  History,
  Zap,
  Tag,
  Check,
  Edit2,
  Trash2,
} from 'lucide-react';

interface TaskDetailDrawerProps {
  taskDetail: TaskDetail | null;
  onClose: () => void;
  onUpdateTask: (updates: any, expectedVersion?: number) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onAddNote: (content: string, author?: 'human' | 'agent') => Promise<void>;
  onUpdateNote: (noteId: string, content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onTriggerAgent: (task: TaskDetail) => void;
}

type TabType = 'notes' | 'files' | 'html' | 'project_hub' | 'history';

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  taskDetail,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onTriggerAgent,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('notes');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  useEffect(() => {
    if (taskDetail) {
      setTitleDraft(taskDetail.title);
      setIsEditingTitle(false);
    }
  }, [taskDetail?.id]);

  if (!taskDetail) return null;

  const handleSaveTitle = async () => {
    if (!titleDraft.trim() || titleDraft === taskDetail.title) {
      setIsEditingTitle(false);
      return;
    }
    await onUpdateTask({ title: titleDraft.trim().substring(0, 60) }, taskDetail.version);
    setIsEditingTitle(false);
  };

  const handleLaneChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await onUpdateTask({ lane_id: e.target.value as LaneId }, taskDetail.version);
  };

  const handleAssigneeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await onUpdateTask({ assignee: e.target.value as Assignee }, taskDetail.version);
  };

  return (
    <div className="w-[380px] lg:w-[420px] flex-shrink-0 glass-panel rounded-2xl p-4 flex flex-col h-[calc(100vh-130px)] shadow-xl border border-white/60 dark:border-slate-700/60 transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-slate-800 flex-shrink-0 shadow-sm">
            {renderTaskIcon(taskDetail.icon, 'w-5 h-5')}
          </div>
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value.substring(0, 60))}
                  className="w-full text-sm font-semibold px-2 py-1 rounded bg-white dark:bg-slate-800 border border-blue-400 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1 text-emerald-500 hover:text-emerald-600"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-xs font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer leading-snug break-words transition-colors"
                title="クリックしてタイトルを編集"
              >
                {taskDetail.title}
              </h1>
            )}
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{taskDetail.title.length} / 60 文字（タイルに全部表示）</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span
                onClick={() => setIsEditingTitle(true)}
                className="cursor-pointer hover:underline text-blue-500"
              >
                タイトルをクリックで編集
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Properties Section */}
      <div className="py-3 border-b border-slate-200/60 dark:border-slate-700/60 text-xs space-y-2">
        <div className="grid grid-cols-2 gap-3">
          {/* Status / Lane */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-400">状態</span>
            <select
              value={taskDetail.lane_id}
              onChange={handleLaneChange}
              className="text-xs py-1 px-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700 dark:text-slate-200"
            >
              <option value="in_progress">進行中</option>
              <option value="need_decision">あなたの判断待ち</option>
              <option value="waiting_agent">エージェント待ち</option>
              <option value="on_hold">保留</option>
              <option value="completed">完了</option>
              <option value="ideas">アイデア / 未着手</option>
            </select>
          </div>

          {/* Assignee */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-400">担当</span>
            <select
              value={taskDetail.assignee}
              onChange={handleAssigneeChange}
              className="text-xs py-1 px-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700 dark:text-slate-200"
            >
              <option value="both">両方</option>
              <option value="agent">エージェント</option>
              <option value="human">人間</option>
            </select>
          </div>
        </div>

        {/* Project & Tags */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {taskDetail.project && (
            <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
              <FolderKanban className="w-3 h-3 text-slate-400" />
              <span>{taskDetail.project}</span>
            </div>
          )}

          {taskDetail.tags.map((tag) => (
            <div
              key={tag}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
            >
              <Tag className="w-2.5 h-2.5" />
              <span>{tag}</span>
            </div>
          ))}

          <span className="text-[10px] text-slate-400 ml-auto">
            {formatRelativeTime(taskDetail.updated_at)} 更新 (v{taskDetail.version})
          </span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1 py-2 border-b border-slate-200/60 dark:border-slate-700/60 text-xs">
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'notes'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>付箋</span>
          {taskDetail.notes.length > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'notes' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {taskDetail.notes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'files'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Paperclip className="w-3.5 h-3.5" />
          <span>ファイル</span>
        </button>

        <button
          onClick={() => setActiveTab('html')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'html'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>HTML</span>
        </button>

        <button
          onClick={() => setActiveTab('project_hub')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'project_hub'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Project Hub</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>履歴</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden pt-3">
        {activeTab === 'notes' && (
          <StickyNoteList
            notes={taskDetail.notes}
            onAddNote={onAddNote}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
          />
        )}

        {activeTab === 'files' && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Paperclip className="w-8 h-8 mb-2 text-slate-300 dark:text-slate-600" />
            <p className="font-medium text-slate-600 dark:text-slate-300">ファイルが添付されていません</p>
            <p className="text-[11px] text-slate-400 mt-1">ドラッグ＆ドロップまたはAI経由でファイルを関連付け可能</p>
          </div>
        )}

        {activeTab === 'html' && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs p-6 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
            <Code2 className="w-8 h-8 mb-2 text-slate-300 dark:text-slate-600" />
            <p className="font-medium text-slate-600 dark:text-slate-300">HTMLプレビューなし</p>
            <p className="text-[11px] text-slate-400 mt-1">エージェントが作成したモックアップやレポートをここに表示</p>
          </div>
        )}

        {activeTab === 'project_hub' && (
          <div className="p-3 text-xs space-y-3">
            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-slate-800 border border-blue-100 dark:border-slate-700">
              <span className="font-semibold text-blue-900 dark:text-blue-300">プロジェクト概要</span>
              <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {taskDetail.project || '（プロジェクト未指定）'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-700 dark:text-slate-300">関連タスク</span>
              <p className="text-slate-500 text-[11px] mt-1">同じプロジェクトに紐づくタスクを横断集約します</p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="overflow-y-auto h-full space-y-2 pr-1 max-h-[360px]">
            {taskDetail.history.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">変更履歴はありません</div>
            ) : (
              taskDetail.history.map((hist) => (
                <div
                  key={hist.id}
                  className="p-2.5 rounded-lg bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 text-[11px]"
                >
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {hist.action}
                    </span>
                    <span className="text-[10px]">{formatRelativeTime(hist.created_at)}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">{hist.detail}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="pt-3 mt-auto border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
        <button
          onClick={() => onTriggerAgent(taskDetail)}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md active:scale-95 transition-all"
        >
          <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
          <span>エージェントに依頼</span>
        </button>

        <button
          onClick={() => onDeleteTask(taskDetail.id)}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          title="タスクを削除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
