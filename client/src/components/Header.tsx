import React from 'react';
import {
  LayoutGrid,
  Bookmark,
  Search,
  Moon,
  Sun,
  Bot,
  RotateCcw,
  HelpCircle,
  Plus,
  Radio,
} from 'lucide-react';

interface HeaderProps {
  activeView: 'board' | 'bookmarks';
  onViewChange: (view: 'board' | 'bookmarks') => void;
  bookmarkCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSearchModal: () => void;
  showTags: boolean;
  onToggleTags: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onOpenAgentSim: () => void;
  onResetBoard: () => void;
  onOpenLegend: () => void;
  onNewTask: () => void;
  isSSEConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  bookmarkCount,
  searchQuery,
  onSearchChange,
  onOpenSearchModal,
  showTags,
  onToggleTags,
  isDark,
  onToggleDark,
  onOpenAgentSim,
  onResetBoard,
  onOpenLegend,
  onNewTask,
  isSSEConnected,
}) => {
  return (
    <header className="glass-panel sticky top-3 z-30 mx-4 my-3 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-md border border-white/60 dark:border-slate-700/60">
      {/* Left: Logo & View Switcher */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 pr-2 border-r border-slate-200/80 dark:border-slate-700/80">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm font-bold text-xs">
            W
          </div>
          <span className="font-extrabold text-sm tracking-wider text-slate-800 dark:text-slate-100 hidden sm:inline">
            WHITEBOARD
          </span>
        </div>

        {/* View Tabs */}
        <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-xl text-xs font-medium">
          <button
            onClick={() => onViewChange('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeView === 'board'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>ボード</span>
          </button>

          <button
            onClick={() => onViewChange('bookmarks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeView === 'bookmarks'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>ブックマーク</span>
            {bookmarkCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-semibold">
                {bookmarkCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Middle: Search Box */}
      <div className="flex-1 max-w-md relative hidden md:block">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="タイトル・タグ・プロジェクト・メモ・ファイル名で検索…"
          className="w-full pl-9 pr-14 py-1.5 text-xs rounded-xl bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-all"
        />
        <button
          onClick={onOpenSearchModal}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-slate-700 text-slate-400 border border-slate-200 dark:border-slate-600 shadow-xs"
        >
          Ctrl K
        </button>
      </div>

      {/* Right: Controls & Actions */}
      <div className="flex items-center gap-2">
        {/* Tag Toggle */}
        <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showTags}
            onChange={onToggleTags}
            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
          />
          <span className="hidden lg:inline text-[11px]">タグを表示</span>
        </label>

        {/* Theme Toggle */}
        <button
          onClick={onToggleDark}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="テーマ切り替え"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Agent Sim */}
        <button
          onClick={onOpenAgentSim}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 transition-colors"
          title="エージェント再現"
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">エージェント再現</span>
        </button>

        {/* Reset */}
        <button
          onClick={onResetBoard}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="ボードを初期データにリセット"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Legend */}
        <button
          onClick={onOpenLegend}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="凡例"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* SSE / Status Badge */}
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
            isSSEConnected
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}
          title={isSSEConnected ? 'SSEリアルタイム同期中' : 'デモモード / サーバー未接続'}
        >
          <Radio className={`w-2.5 h-2.5 ${isSSEConnected ? 'animate-pulse text-emerald-500' : 'text-rose-500'}`} />
          <span className="hidden sm:inline">
            {isSSEConnected ? 'リアルタイム同期中' : 'デモモード'}
          </span>
        </div>

        {/* New Task Button */}
        <button
          onClick={onNewTask}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-xs shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">タスク追加</span>
        </button>
      </div>
    </header>
  );
};
