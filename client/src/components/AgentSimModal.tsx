import React, { useState } from 'react';
import { X, Bot, Sparkles, Check, ArrowRight } from 'lucide-react';
import { Task } from '../types';

interface AgentSimModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onSimulateAction: (actionType: 'create_decision' | 'add_agent_note' | 'complete_task') => Promise<void>;
}

export const AgentSimModal: React.FC<AgentSimModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onSimulateAction,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastDone, setLastDone] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRun = async (actionType: 'create_decision' | 'add_agent_note' | 'complete_task', label: string) => {
    setIsRunning(true);
    setLastDone(null);
    try {
      await onSimulateAction(actionType);
      setLastDone(`${label} を実行しました！画面のリアルタイム反映をご確認ください。`);
    } finally {
      setIsRunning(false);
    }
  };

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
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                エージェント自律動作シミュレーション
              </h2>
              <p className="text-[11px] text-slate-400">外部AI（MCP）がタスクを操作する挙動をワンクリックで再現</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs">
          <button
            onClick={() => handleRun('create_decision', '判断待ちタスクの自動起票')}
            disabled={isRunning}
            className="w-full p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 hover:border-amber-400 text-left transition-all flex items-center justify-between group active:scale-[0.98]"
          >
            <div>
              <span className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                1. 「あなたの判断待ち」にタスクを起票
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                AIが迷った時、自律的に人間に意思決定を仰ぐタスクをボードに追加します。
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => handleRun('add_agent_note', '進行中タスクへの進捗付箋の貼付')}
            disabled={isRunning}
            className="w-full p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 hover:border-indigo-400 text-left transition-all flex items-center justify-between group active:scale-[0.98]"
          >
            <div>
              <span className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-indigo-500" />
                2. 進行中タスクにエージェント付箋を貼る
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                AIが作業ログや技術的決定メモ（300文字以内）をタスクの付箋に貼ります。
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => handleRun('complete_task', 'タスクの完了レーン移動')}
            disabled={isRunning}
            className="w-full p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 hover:border-emerald-400 text-left transition-all flex items-center justify-between group active:scale-[0.98]"
          >
            <div>
              <span className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                3. 作業を完了し「完了」レーンに移動
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                作業が終了したタスクを「完了」レーンへと移動させます。
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {lastDone && (
          <div className="p-2.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{lastDone}</span>
          </div>
        )}
      </div>
    </div>
  );
};
