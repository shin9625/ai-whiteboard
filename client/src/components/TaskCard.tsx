import React from 'react';
import { Task, TaskIcon, Assignee } from '../types';
import {
  FileText,
  Code,
  BarChart2,
  Download,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  User,
  Bot,
  Users,
  Bookmark,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  showTags: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
}

export const renderTaskIcon = (icon: TaskIcon, className: string = 'w-4 h-4') => {
  switch (icon) {
    case 'code':
      return <Code className={`${className} text-indigo-500`} />;
    case 'chart':
      return <BarChart2 className={`${className} text-blue-500`} />;
    case 'download':
      return <Download className={`${className} text-amber-500`} />;
    case 'speaker':
      return <Volume2 className={`${className} text-purple-500`} />;
    case 'alert':
      return <AlertTriangle className={`${className} text-rose-500`} />;
    case 'check':
      return <CheckCircle2 className={`${className} text-emerald-500`} />;
    case 'cpu':
      return <Cpu className={`${className} text-cyan-500`} />;
    case 'doc':
    default:
      return <FileText className={`${className} text-slate-500`} />;
  }
};

export const renderAssigneeIcon = (assignee: Assignee, className: string = 'w-3.5 h-3.5') => {
  switch (assignee) {
    case 'human':
      return (
        <span title="担当: 人間">
          <User className={`${className} text-sky-600 dark:text-sky-400`} />
        </span>
      );
    case 'agent':
      return (
        <span title="担当: エージェント">
          <Bot className={`${className} text-indigo-600 dark:text-indigo-400`} />
        </span>
      );
    case 'both':
    default:
      return (
        <span title="担当: 両方">
          <Users className={`${className} text-teal-600 dark:text-teal-400`} />
        </span>
      );
  }
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isSelected,
  showTags,
  onClick,
  onDragStart,
}) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={onClick}
      className={`glass-card group relative p-3 rounded-xl cursor-pointer transition-all duration-200 select-none hover:shadow-md hover:translate-y-[-1px] ${
        isSelected
          ? 'ring-2 ring-blue-500 bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500'
          : 'hover:border-blue-300 dark:hover:border-slate-600'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Left Icon */}
        <div className="p-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 flex-shrink-0 mt-0.5 shadow-sm">
          {renderTaskIcon(task.icon, 'w-4 h-4')}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0 pr-6">
          <p className="text-xs font-medium text-slate-800 dark:text-slate-100 leading-snug line-clamp-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {task.title}
          </p>

          {/* Tags (when enabled) */}
          {showTags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-[10px] rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800/60"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Priority Badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700/80 text-[10px] font-semibold text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-600/60">
          {task.priority}
        </div>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 truncate max-w-[130px]">
          {task.project && (
            <span className="truncate px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
              {task.project}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {task.is_bookmarked && (
            <Bookmark className="w-3 h-3 text-amber-500 fill-amber-500" />
          )}
          <div className="p-0.5 rounded bg-slate-100 dark:bg-slate-800/80">
            {renderAssigneeIcon(task.assignee, 'w-3.5 h-3.5')}
          </div>
        </div>
      </div>
    </div>
  );
};
