import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { LaneId, Assignee, TaskIcon } from '../types';
import { renderTaskIcon } from './TaskCard';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (data: {
    title: string;
    lane_id: LaneId;
    assignee: Assignee;
    project: string;
    tags: string[];
    icon: TaskIcon;
  }) => Promise<void>;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  onCreateTask,
}) => {
  const [title, setTitle] = useState('');
  const [laneId, setLaneId] = useState<LaneId>('in_progress');
  const [assignee, setAssignee] = useState<Assignee>('both');
  const [project, setProject] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [icon, setIcon] = useState<TaskIcon>('doc');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await onCreateTask({
        title: title.trim().substring(0, 60),
        lane_id: laneId,
        assignee,
        project: project.trim(),
        tags,
        icon,
      });

      setTitle('');
      setProject('');
      setTagsInput('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const icons: TaskIcon[] = ['doc', 'code', 'chart', 'download', 'speaker', 'cpu', 'alert', 'check'];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-md rounded-2xl shadow-2xl border border-white/60 dark:border-slate-700 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Plus className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              新規タスクの作成
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Title */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                タイトル <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">{title.length}/60</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.substring(0, 60))}
              placeholder="例: whiteboard: whiteboard-api の骨格を作る"
              required
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
              autoFocus
            />
          </div>

          {/* Lane & Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                初期レーン
              </label>
              <select
                value={laneId}
                onChange={(e) => setLaneId(e.target.value as LaneId)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="in_progress">進行中</option>
                <option value="need_decision">あなたの判断待ち</option>
                <option value="waiting_agent">エージェント待ち</option>
                <option value="on_hold">保留</option>
                <option value="completed">完了</option>
                <option value="ideas">アイデア / 未着手</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                担当
              </label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value as Assignee)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="both">両方</option>
                <option value="agent">エージェント</option>
                <option value="human">人間</option>
              </select>
            </div>
          </div>

          {/* Project & Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                プロジェクト名
              </label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="例: nuko-whiteboard"
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                タグ（カンマ区切り）
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="例: api, backend"
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              アイコン種別
            </label>
            <div className="flex gap-2 items-center flex-wrap">
              {icons.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`p-2 rounded-xl border transition-all ${
                    icon === ic
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 ring-2 ring-blue-400/40'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {renderTaskIcon(ic, 'w-4 h-4')}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="px-4 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold text-xs transition-all shadow-sm active:scale-95"
            >
              作成する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
