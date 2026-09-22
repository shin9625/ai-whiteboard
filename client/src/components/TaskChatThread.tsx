import React, { useState, useRef, useEffect } from 'react';
import { StickyNote } from '../types';
import { Send, Bot, User, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { formatRelativeTime } from './StickyNoteList';

interface TaskChatThreadProps {
  taskId: string;
  notes: StickyNote[];
  onSendMessage: (content: string, triggerAi?: boolean, provider?: 'gemini' | 'groq') => Promise<void>;
  onDeleteMessage?: (noteId: string) => Promise<void>;
  isAiThinking?: boolean;
}

export const TaskChatThread: React.FC<TaskChatThreadProps> = ({
  taskId,
  notes,
  onSendMessage,
  onDeleteMessage,
  isAiThinking = false,
}) => {
  const [input, setInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'groq'>('gemini');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes.length, isAiThinking]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isSending) return;

    const text = input.trim();
    setInput('');
    setIsSending(true);

    try {
      await onSendMessage(text, true, selectedProvider);
    } catch (err: any) {
      alert('メッセージ送信に失敗しました: ' + err.message);
      setInput(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/40 rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-800">
      {/* Messages Timeline */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {notes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-500 mb-2 shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              まだメッセージはありません
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] leading-relaxed">
              「〇〇の機能を作って」や「修正して」とチャットで指示すると、AIが思考・開発を行います。
            </p>
          </div>
        ) : (
          notes.map((msg) => {
            const isAgent = msg.author === 'agent';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 group ${
                  isAgent ? 'justify-start' : 'justify-end'
                }`}
              >
                {/* Agent Avatar */}
                {isAgent && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-xs">
                    <Bot className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs transition-all ${
                    isAgent
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/10'
                  }`}
                >
                  {/* Author & Time header */}
                  <div
                    className={`flex items-center gap-1.5 mb-1 text-[10px] ${
                      isAgent ? 'text-slate-400 dark:text-slate-400' : 'text-blue-100'
                    }`}
                  >
                    <span className="font-semibold">{isAgent ? msg.author_name : 'あなた'}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(msg.created_at)}</span>
                  </div>

                  {/* Body Content */}
                  <div className="whitespace-pre-wrap leading-relaxed break-words font-sans selection:bg-blue-200 selection:text-blue-900">
                    {msg.content}
                  </div>

                  {/* Delete button on hover */}
                  {onDeleteMessage && (
                    <button
                      onClick={() => onDeleteMessage(msg.id)}
                      className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-rose-500 hover:text-white text-slate-500 text-[10px] transition-all shadow-xs"
                      title="メッセージを削除"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {/* Human Avatar */}
                {!isAgent && (
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center flex-shrink-0 mt-1 shadow-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Thinking Indicator */}
        {isAiThinking && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-1 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 shadow-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>AIが思考・コード生成中…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="p-2.5 bg-white dark:bg-slate-800/90 border-t border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>モデル:</span>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as any)}
              className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-600 focus:outline-none"
            >
              <option value="gemini">Gemini 3.6 Flash (無料 1,500回/日)</option>
              <option value="groq">Groq Llama 3.3 (超高速・無料 14,400回/日)</option>
            </select>
          </div>
          <span className="text-[10px] text-slate-400">Enterで送信 / Shift+Enterで改行</span>
        </div>

        <form onSubmit={handleSend} className="relative flex items-center gap-1.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="タスクへの指示や質問を入力…（例: シンプルなMarkdownエディタを作って）"
            rows={2}
            className="w-full resize-none px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 leading-normal"
          />

          <button
            type="submit"
            disabled={!input.trim() || isSending || isAiThinking}
            className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 cursor-pointer active:scale-95"
            title="送信"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
