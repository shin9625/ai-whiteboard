import React, { useState } from 'react';
import { Lane, Task } from '../types';
import { TaskCard } from './TaskCard';
import {
  PlayCircle,
  HelpCircle,
  Clock,
  PauseCircle,
  CheckCircle,
  Lightbulb,
} from 'lucide-react';

interface LaneColumnProps {
  lane: Lane;
  tasks: Task[];
  selectedTaskId: string | null;
  showTags: boolean;
  onSelectTask: (task: Task) => void;
  onTaskDrop: (taskId: string, targetLaneId: string) => void;
}

export const getLaneBadgeStyle = (laneId: string) => {
  switch (laneId) {
    case 'in_progress':
      return {
        bg: 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        dot: 'bg-blue-500',
        icon: <PlayCircle className="w-3.5 h-3.5 text-blue-500" />,
      };
    case 'need_decision':
      return {
        bg: 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
        icon: <HelpCircle className="w-3.5 h-3.5 text-amber-500" />,
      };
    case 'waiting_agent':
      return {
        bg: 'bg-purple-100/80 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        dot: 'bg-purple-500',
        icon: <Clock className="w-3.5 h-3.5 text-purple-500" />,
      };
    case 'on_hold':
      return {
        bg: 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
        icon: <PauseCircle className="w-3.5 h-3.5 text-slate-400" />,
      };
    case 'completed':
      return {
        bg: 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
      };
    case 'ideas':
    default:
      return {
        bg: 'bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        dot: 'bg-indigo-500',
        icon: <Lightbulb className="w-3.5 h-3.5 text-indigo-500" />,
      };
  }
};

export const LaneColumn: React.FC<LaneColumnProps> = ({
  lane,
  tasks,
  selectedTaskId,
  showTags,
  onSelectTask,
  onTaskDrop,
}) => {
  const [isOver, setIsOver] = useState(false);
  const badge = getLaneBadgeStyle(lane.id);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onTaskDrop(taskId, lane.id);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`glass-panel rounded-2xl p-3 flex flex-col min-w-[280px] max-w-[340px] flex-1 h-[calc(100vh-130px)] transition-all duration-200 ${
        isOver
          ? 'ring-2 ring-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
          : ''
      }`}
    >
      {/* Lane Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center gap-2">
          {badge.icon}
          <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
            {lane.name}
          </h2>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${badge.bg}`}>
          {tasks.length}件
        </span>
      </div>

      {/* Task List (scrollable) */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isSelected={selectedTaskId === task.id}
            showTags={showTags}
            onClick={() => onSelectTask(task)}
            onDragStart={handleDragStart}
          />
        ))}

        {tasks.length === 0 && (
          <div className="h-28 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-500 text-xs">
            タスクなし
          </div>
        )}
      </div>
    </div>
  );
};
