import React, { useState } from 'react';
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
  MoreVertical,
  Tag,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="glass-panel sticky top-2 z-30 mx-2 sm:mx-4 my-2 sm:my-3 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 shadow-md border border-white/60 dark:border-slate-700/60">
      {/* Left: Logo & View Switcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2 pr-1.5 sm:pr-2 border-r border-slate-200/80 dark:border-slate-700/80">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm font-bold text-xs">
            W
          </div>
          <span className="font-extrabold text-xs sm:text-sm tracking-wider text-slate-800 dark:text-slate-100">
            WHITEBOARD
          </span>
        </div>

        {/* View Tabs */}
        <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-xl text-xs font-medium">
          <button
            onClick={() => onViewChange('board')}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all text-xs ${
              activeView === 'board'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">ボード</span>
          </button>

          <button
            onClick={() => onViewChange('bookmarks')}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all text-xs ${
              activeView === 'bookmarks'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">ブクマ</span>
            {bookmarkCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-semibold">
                {bookmarkCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Middle: Desktop Search Box */}
      <div className="flex-1 max-w-md relative hidden md:block">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="タイトル・タグ・プロジェクトで検索…"
          className="w-full pl-9 pr-14 py-1.5 text-xs rounded-xl bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-all"
        />
        <button
          onClick={onOpenSearchModal}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-slate-700 text-slate-400 border border-slate-200 dark:border-slate-600 shadow-xs"
        >
          Ctrl K
        </button>
      </div>

      {/* Right: Desktop Controls */}
      <div className="hidden lg:flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showTags}
            onChange={onToggleTags}
            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
          />
          <span className="text-[11px]">タグ表示</span>
        </label>

        <button
          onClick={onToggleDark}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="テーマ切り替え"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenAgentSim}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 transition-colors"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>エージェント再現</span>
        </button>

        <button
          onClick={onResetBoard}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="リセット"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenLegend}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="凡例"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
            isSSEConnected
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}
        >
          <Radio className={`w-2.5 h-2.5 ${isSSEConnected ? 'animate-pulse text-emerald-500' : 'text-rose-500'}`} />
          <span>{isSSEConnected ? '同期中' : 'オフライン'}</span>
        </div>
      </div>

      {/* Right: Mobile Action Buttons */}
      <div className="flex items-center gap-1.5">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenSearchModal}
          className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          title="検索"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* New Task Button (Always Visible) */}
        <button
          onClick={onNewTask}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-xs shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">追加</span>
        </button>

        {/* Mobile Menu Dropdown Trigger */}
        <div className="relative lg:hidden">
          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Mobile Dropdown Menu */}
          {isMobileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 rounded-2xl glass-panel shadow-2xl border border-white/80 dark:border-slate-700 py-2 z-50 text-xs space-y-1">
                <button
                  onClick={() => {
                    onToggleDark();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                  <span>{isDark ? 'ライトモードに切替' : 'ダークモードに切替'}</span>
                </button>

                <button
                  onClick={() => {
                    onToggleTags();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <Tag className="w-4 h-4 text-blue-500" />
                  <span>タグ表示: {showTags ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  onClick={() => {
                    onOpenAgentSim();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400"
                >
                  <Bot className="w-4 h-4" />
                  <span>エージェント再現</span>
                </button>

                <button
                  onClick={() => {
                    onOpenLegend();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span>凡例を表示</span>
                </button>

                <button
                  onClick={() => {
                    onResetBoard();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400 border-t border-slate-100 dark:border-slate-800 pt-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>ボードをリセット</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
