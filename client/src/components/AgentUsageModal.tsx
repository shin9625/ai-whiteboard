import React from 'react';
import { ModelUsageStats } from '../types';
import {
  Bot,
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Cpu,
  Coins,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface AgentUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ModelUsageStats | null;
  onRefresh: () => void;
}

export const AgentUsageModal: React.FC<AgentUsageModalProps> = ({
  isOpen,
  onClose,
  stats,
  onRefresh,
}) => {
  if (!isOpen) return null;

  const todayRequests = stats?.today_requests || 0;
  const dailyLimit = stats?.daily_limit || 1500;
  const usagePercentage = Math.min(100, Math.round((todayRequests / dailyLimit) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="glass-panel w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/80 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>Gemini 自律エージェント & 利用状況</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {stats?.model_name || 'gemini-1.5-flash'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                タスク自律実行エンジンの稼働状況・無料枠消費・コスト見積もり
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* API Key Status Banner */}
          {stats?.is_api_key_configured ? (
            <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5 text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <span>Gemini API 接続中（自律稼働スタンバイ）</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  「エージェント待ち」レーンにタスクが入ると、Gemini 1.5 Flash が自動で初動調査を行い付箋メモを投稿します。
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-xs">Gemini APIキーが未設定です</div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  完全自動でタスクを動かすには、Google AI Studio で無料取得したキーを Render の Environment に設定してください。
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-[10px] shadow-xs"
                  >
                    <span>無料APIキーを取得</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                    キー名: GEMINI_API_KEY
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Daily Free Tier Meter */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>本日の無料枠メーター (1日 1,500回まで無料)</span>
              </div>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                {todayRequests} / {dailyLimit} 回 ({usagePercentage}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercentage > 85
                    ? 'bg-rose-500'
                    : usagePercentage > 60
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                }`}
                style={{ width: `${Math.max(2, usagePercentage)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              ※Google AI Studio の無料プラン（Free Tier）では、Gemini 1.5 Flash を毎日1,500リクエストまで完全無料（0円）で利用できます。毎日深夜にリセットされます。
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Tokens */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                <span>本日の消費トークン</span>
              </div>
              <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                {(stats?.today_total_tokens || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400">
                入力: {(stats?.today_input_tokens || 0).toLocaleString()} / 出力: {(stats?.today_output_tokens || 0).toLocaleString()}
              </div>
            </div>

            {/* Estimated Cost */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                <Coins className="w-3.5 h-3.5 text-emerald-500" />
                <span>推定利用コスト (概算)</span>
              </div>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                約 ¥{(stats?.today_cost_jpy || 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                ${(stats?.today_cost_usd || 0).toFixed(4)} USD（無料枠内なら0円）
              </div>
            </div>

            {/* Total Invocations */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
                <span>累計実行回数</span>
              </div>
              <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                {(stats?.all_time_requests || 0).toLocaleString()} 回
              </div>
              <div className="text-[10px] text-slate-400">
                累計 {(stats?.all_time_tokens || 0).toLocaleString()} tokens
              </div>
            </div>
          </div>

          {/* Recent Execution Logs */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                直近の自律エージェント実行ログ
              </h3>
              <button
                onClick={onRefresh}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                更新
              </button>
            </div>

            {stats?.recent_logs && stats.recent_logs.length > 0 ? (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {stats.recent_logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {log.task_title || 'タスク'}
                        </span>
                        {log.error_message && (
                          <span className="text-rose-500 text-[10px] ml-1.5">
                            ({log.error_message})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 text-[10px] text-slate-400 font-mono">
                      <span>{log.total_tokens} tok</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                まだGeminiの自動実行履歴はありません。<br />
                「エージェント待ち」レーンにタスクを追加するか、タスク詳細から「Geminiで実行」を押すと自動処理されます。
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="text-[10px] text-slate-400">
            モデル: {stats?.model_name || 'gemini-1.5-flash'} | Free Tier 1,500 RPD
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-semibold shadow-xs transition-all"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
