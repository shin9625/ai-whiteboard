import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { renderTaskIcon } from './TaskCard';
import { Search, X, FolderKanban, Tag } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onSelectTask,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTasks = tasks.filter((t) => {
    const q = query.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.project.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredTasks.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredTasks.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTasks[selectedIndex]) {
        onSelectTask(filteredTasks[selectedIndex]);
        onClose();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-lg rounded-2xl shadow-2xl border border-white/60 dark:border-slate-700 overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200/80 dark:border-slate-700/80 gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="タイトル・タグ・プロジェクトで検索…"
            className="w-full text-sm bg-transparent border-0 focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              該当するタスクが見つかりません
            </div>
          ) : (
            filteredTasks.map((task, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={task.id}
                  onClick={() => {
                    onSelectTask(task);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="p-1 rounded-md bg-white/20">
                      {renderTaskIcon(task.icon, 'w-4 h-4')}
                    </div>
                    <span className="font-medium truncate">{task.title}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 text-[10px]">
                    {task.project && (
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                      }`}>
                        <FolderKanban className="w-2.5 h-2.5" />
                        {task.project}
                      </span>
                    )}
                    {task.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                        }`}
                      >
                        <Tag className="w-2 h-2" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <span>↑↓ で選択 / Enter で決定</span>
          <span>Esc で閉じる</span>
        </div>
      </div>
    </div>
  );
};
