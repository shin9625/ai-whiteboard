import React from 'react';
import { X, PlayCircle, HelpCircle, Clock, PauseCircle, CheckCircle, Lightbulb } from 'lucide-react';
import { renderTaskIcon, renderAssigneeIcon } from './TaskCard';

interface LegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegendModal: React.FC<LegendModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-lg rounded-2xl shadow-2xl border border-white/60 dark:border-slate-700 p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            WHITEBOARD 凡例 & システム設計
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lanes */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            レーン（6本設計）
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/40 flex items-start gap-2">
              <PlayCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-blue-900 dark:text-blue-300">進行中</span>
                <p className="text-[11px] text-slate-500">現在リアルタイムに進行している作業</p>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-amber-900 dark:text-amber-300">あなたの判断待ち</span>
                <p className="text-[11px] text-slate-500">AIが人間に意思決定・回答を仰ぎたい事項</p>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/40 flex items-start gap-2">
              <Clock className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-purple-900 dark:text-purple-300">エージェント待ち</span>
                <p className="text-[11px] text-slate-500">AIエージェントが実行すべきタスク</p>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2">
              <PauseCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-300">保留</span>
                <p className="text-[11px] text-slate-500">バックログ・一時保留・調査待ち</p>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/40 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-emerald-900 dark:text-emerald-300">完了</span>
                <p className="text-[11px] text-slate-500">完了したタスク</p>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/40 flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-indigo-900 dark:text-indigo-300">アイデア / 未着手</span>
                <p className="text-[11px] text-slate-500">今後の着想・ブックマーク</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assignees */}
        <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
          <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            担当区分
          </h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center gap-2">
              {renderAssigneeIcon('human', 'w-4 h-4')}
              <span className="text-slate-700 dark:text-slate-300 font-medium">人間</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center gap-2">
              {renderAssigneeIcon('agent', 'w-4 h-4')}
              <span className="text-slate-700 dark:text-slate-300 font-medium">エージェント</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center gap-2">
              {renderAssigneeIcon('both', 'w-4 h-4')}
              <span className="text-slate-700 dark:text-slate-300 font-medium">両方</span>
            </div>
          </div>
        </div>

        {/* Icons */}
        <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
          <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            タスク種別アイコン
          </h3>
          <div className="grid grid-cols-4 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
              {renderTaskIcon('doc', 'w-3.5 h-3.5')}
              <span>文書・メモ</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
              {renderTaskIcon('code', 'w-3.5 h-3.5')}
              <span>コード・開発</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
              {renderTaskIcon('chart', 'w-3.5 h-3.5')}
              <span>計測・分析</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
              {renderTaskIcon('download', 'w-3.5 h-3.5')}
              <span>ダウンロード</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
              {renderTaskIcon('speaker', 'w-3.5 h-3.5')}
              <span>音声・メディア</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
              {renderTaskIcon('cpu', 'w-3.5 h-3.5')}
              <span>モデル・GPU</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
              {renderTaskIcon('alert', 'w-3.5 h-3.5')}
              <span>要確認・警告</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
              {renderTaskIcon('check', 'w-3.5 h-3.5')}
              <span>完了・修正</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
