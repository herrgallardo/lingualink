'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

interface MessageEditorProps {
  initialText: string;
  onSave: (newText: string) => void;
  onCancel: () => void;
  className?: string;
}

export function MessageEditor({
  initialText,
  onSave,
  onCancel,
  className = '',
}: MessageEditorProps) {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();

      // Auto-resize to fit content
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleSave = () => {
    const trimmedText = text.trim();
    if (trimmedText && trimmedText !== initialText) {
      onSave(trimmedText);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={`flex items-end gap-2 ${className}`}>
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-cyan-500 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 text-midnight-900 dark:text-slate-100"
        rows={1}
      />
      <button
        onClick={handleSave}
        className="p-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
        aria-label={t('common.save')}
      >
        <CheckIcon className="w-4 h-4" />
      </button>
      <button
        onClick={onCancel}
        className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        aria-label={t('common.cancel')}
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
