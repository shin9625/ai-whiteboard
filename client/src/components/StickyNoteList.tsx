import React, { useState } from 'react';
import { StickyNote } from '../types';
import { Bot, User, Edit2, Trash2, Check, X } from 'lucide-react';

interface StickyNoteListProps {
  notes: StickyNote[];
  onAddNote: (content: string, author?: 'human' | 'agent') => Promise<void>;
  onUpdateNote: (noteId: string, content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
}

export const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  return `${diffDay}日前`;
};

export const StickyNoteList: React.FC<StickyNoteListProps> = ({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handlePost = async () => {
    if (!content.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddNote(content.trim(), 'human');
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (note: StickyNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editContent.trim()) return;
    await onUpdateNote(noteId, editContent.trim());
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Sticky Note Input Form */}
      <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700/80 shadow-sm">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.substring(0, 300))}
          placeholder="メモを入力…（最大300文字）"
          rows={3}
          className="w-full text-xs bg-transparent border-0 resize-none focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-100"
        />
        <div className="flex items-center justify-between pt-2 border-t border-blue-100/80 dark:border-slate-700/60">
          <span className="text-[10px] text-slate-400 font-mono">
            {content.length}/300
          </span>
          <button
            onClick={handlePost}
            disabled={!content.trim() || isSubmitting}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-900 text-white transition-all shadow-sm active:scale-95"
          >
            貼る
          </button>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[360px]">
        {notes.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            付箋はまだ貼られていません
          </div>
        ) : (
          notes.map((note) => {
            const isAgent = note.author === 'agent';
            const isEditing = editingId === note.id;

            return (
              <div
                key={note.id}
                className={`p-3 rounded-xl border transition-all text-xs ${
                  isAgent
                    ? 'bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-slate-800/90 dark:to-blue-950/40 border-blue-200/80 dark:border-blue-900/60 shadow-sm'
                    : 'bg-white/90 dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 shadow-sm'
                }`}
              >
                {/* Note Header */}
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-700/60 text-[11px]">
                  <div className="flex items-center gap-1.5 font-medium">
                    {isAgent ? (
                      <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                        <Bot className="w-3.5 h-3.5" />
                        <span>{note.author_name || 'エージェント'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <User className="w-3.5 h-3.5" />
                        <span>{note.author_name || 'ユーザー'}</span>
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {formatRelativeTime(note.created_at)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 text-slate-400">
                    {!isEditing ? (
                      <>
                        <button
                          onClick={() => handleStartEdit(note)}
                          className="p-1 hover:text-blue-500 transition-colors"
                          title="編集"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeleteNote(note.id)}
                          className="p-1 hover:text-rose-500 transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSaveEdit(note.id)}
                          className="p-1 text-emerald-500 hover:text-emerald-600"
                          title="保存"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                          title="キャンセル"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Note Content */}
                {isEditing ? (
                  <div className="pt-1">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value.substring(0, 300))}
                      rows={3}
                      className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-600 focus:outline-none"
                    />
                  </div>
                ) : (
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {note.content}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
