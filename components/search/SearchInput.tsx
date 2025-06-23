'use client';

import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  loading?: boolean;
  showClear?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  autoFocus = false,
  loading = false,
  showClear = true,
  size = 'medium',
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.();
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const sizeClasses = {
    small: 'pl-8 pr-8 py-1.5 text-sm',
    medium: 'pl-10 pr-10 py-2',
    large: 'pl-12 pr-12 py-3 text-lg',
  };

  const iconSizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6',
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <MagnifyingGlassIcon
          className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 ${iconSizeClasses[size]}`}
        />

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`
            w-full ${sizeClasses[size]} 
            border border-slate-200 dark:border-slate-700 rounded-lg 
            bg-white dark:bg-slate-900 
            text-midnight-900 dark:text-slate-100 
            placeholder-slate-500 
            focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
            ${loading ? 'pr-20' : ''}
          `}
        />

        {/* Loading indicator */}
        {loading && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500"></div>
          </div>
        )}

        {/* Clear button */}
        {showClear && value && !loading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            aria-label="Clear search"
          >
            <XMarkIcon className={`text-slate-400 ${iconSizeClasses[size]}`} />
          </button>
        )}
      </div>
    </form>
  );
}
