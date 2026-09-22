import React, { useState, useEffect } from 'react';
import { TaskDetail, LaneId, Assignee } from '../types';
import { renderTaskIcon, renderAssigneeIcon } from './TaskCard';
import { TaskChatThread } from './TaskChatThread';
import { formatRelativeTime } from './StickyNoteList';
import {
  X,
  MessageSquare,
  Paperclip,
  Code2,
  FolderKanban,
  History,
  Zap,
  Tag,
  Check,
  Edit2,
  Trash2,
  Bot,
  Loader2,
  ExternalLink,
  Copy,
  Download,
  FileCode,
  Sparkles,
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
  onRunGemini?: (taskId: string, provider?: 'gemini' | 'groq') => Promise<void>;
  onSendChatMessage?: (content: string, triggerAi?: boolean, provider?: 'gemini' | 'groq') => Promise<void>;
}

type TabType = 'chat' | 'html' | 'files' | 'project_hub' | 'history';

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  taskDetail,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onTriggerAgent,
  onRunGemini,
  onSendChatMessage,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [isRunningGemini, setIsRunningGemini] = useState(false);
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (taskDetail) {
      setTitleDraft(taskDetail.title);
      setIsEditingTitle(false);
      setSelectedArtifactIndex(0);
      // Auto-switch to HTML tab if newly generated HTML artifact is present
      if (taskDetail.html_content && activeTab === 'chat' && taskDetail.notes.length <= 2) {
        // keep user on current tab unless requested
      }
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

  const handleOpenHtmlNewTab = () => {
    if (!taskDetail.html_content) return;
    const blob = new Blob([taskDetail.html_content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleCopyHtml = () => {
    if (!taskDetail.html_content) return;
    navigator.clipboard.writeText(taskDetail.html_content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const artifacts = taskDetail.artifacts || [];
  const currentArtifact = artifacts[selectedArtifactIndex] || null;

  const handleDownloadArtifact = (art: { name: string; content: string }) => {
    const blob = new Blob([art.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = art.name || 'code.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-x-2 bottom-2 top-16 md:static md:w-[460px] lg:w-[500px] z-50 md:z-auto flex-shrink-0 glass-panel rounded-2xl p-4 flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-130px)] shadow-2xl md:shadow-xl border border-white/80 dark:border-slate-700/80 transition-all duration-300">
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
                <span>{taskDetail.title.length} / 60 文字</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span
                  onClick={() => setIsEditingTitle(true)}
                  className="cursor-pointer hover:underline text-blue-500"
                >
                  タイトルを編集
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
        <div className="py-2.5 border-b border-slate-200/60 dark:border-slate-700/60 text-xs space-y-2">
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
              v{taskDetail.version}
            </span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 py-2 border-b border-slate-200/60 dark:border-slate-700/60 text-xs">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>チャット</span>
            {taskDetail.notes.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 'chat' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {taskDetail.notes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('html')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'html'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>HTMLプレビュー</span>
            {taskDetail.html_content && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'files'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>コード ({artifacts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('project_hub')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'project_hub'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Hub</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>履歴</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden pt-2 min-h-0">
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <TaskChatThread
              taskId={taskDetail.id}
              notes={taskDetail.notes}
              onSendMessage={async (content, triggerAi, provider) => {
                if (onSendChatMessage) {
                  await onSendChatMessage(content, triggerAi, provider);
                } else {
                  await onAddNote(content, 'human');
                  if (triggerAi && onRunGemini) {
                    await onRunGemini(taskDetail.id, provider);
                  }
                }
              }}
              onDeleteMessage={onDeleteNote}
              isAiThinking={isRunningGemini}
            />
          )}

          {/* HTML Preview Tab */}
          {activeTab === 'html' && (
            <div className="h-full flex flex-col rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              {taskDetail.html_content ? (
                <>
                  {/* HTML Toolbar */}
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        動的プレビュー実行中
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleCopyHtml}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 flex items-center gap-1 transition-all"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedCode ? 'コピー完了！' : 'HTMLコピー'}</span>
                      </button>
                      <button
                        onClick={handleOpenHtmlNewTab}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 transition-all shadow-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>全画面で開く</span>
                      </button>
                    </div>
                  </div>

                  {/* Sandboxed iframe */}
                  <div className="flex-1 w-full bg-white relative">
                    <iframe
                      title="HTML Preview"
                      srcDoc={taskDetail.html_content}
                      sandbox="allow-scripts allow-modals allow-forms allow-popups"
                      className="w-full h-full border-0 absolute inset-0"
                    />
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-500 mb-3">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    HTML成果物はまだありません
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[280px] leading-relaxed">
                    「チャット」タブから「〇〇のWebアプリを作って」と指示すると、AIが実際に動作するWebアプリをここに生成・実行します。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Files / Code Tab */}
          {activeTab === 'files' && (
            <div className="h-full flex flex-col rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {artifacts.length > 0 ? (
                <>
                  {/* File Selector Toolbar */}
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between overflow-x-auto gap-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {artifacts.map((art, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedArtifactIndex(idx)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1 whitespace-nowrap ${
                            selectedArtifactIndex === idx
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <FileCode className="w-3 h-3" />
                          <span>{art.name}</span>
                        </button>
                      ))}
                    </div>

                    {currentArtifact && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(currentArtifact.content);
                            alert('コードをコピーしました！');
                          }}
                          className="p-1 rounded bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 text-[11px]"
                          title="コードをコピー"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDownloadArtifact(currentArtifact)}
                          className="p-1 rounded bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 text-[11px]"
                          title="ファイルをダウンロード"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Code Viewer */}
                  <div className="flex-1 overflow-auto p-3 bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed select-text">
                    <pre className="whitespace-pre">
                      {currentArtifact ? currentArtifact.content : ''}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl m-2">
                  <Paperclip className="w-8 h-8 mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    コードファイルがありません
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[260px]">
                    チャットで「コードを書いて」と依頼すると、生成されたソースコードがここにファイルとして格納されます。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Project Hub Tab */}
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

          {/* History Tab */}
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
        <div className="pt-2.5 mt-auto border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
          {onRunGemini && (
            <button
              disabled={isRunningGemini}
              onClick={async () => {
                setIsRunningGemini(true);
                try {
                  await onRunGemini(taskDetail.id);
                } finally {
                  setIsRunningGemini(false);
                }
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isRunningGemini ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>{isRunningGemini ? 'AIが思考・開発中…' : 'AIで自動実行 / 更新'}</span>
            </button>
          )}

          <button
            onClick={() => onTriggerAgent(taskDetail)}
            className="flex items-center justify-center gap-1 py-2 px-2.5 text-xs font-medium rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer"
            title="外部AI貼り付け用プロンプトをコピー"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>指示コピー</span>
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
    </>
  );
};
