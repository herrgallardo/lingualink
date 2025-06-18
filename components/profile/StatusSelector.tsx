'use client';

import type { Database } from '@/lib/types/database';
import { CheckIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

type UserStatus = Database['public']['Tables']['users']['Row']['status'];

interface StatusOption {
  value: UserStatus;
  label: string;
  description: string;
  color: string;
  icon: string;
}

const statusOptions: readonly StatusOption[] = [
  {
    value: 'available',
    label: 'Available',
    description: 'Ready to chat',
    color: 'bg-green-500',
    icon: '●',
  },
  {
    value: 'busy',
    label: 'Busy',
    description: 'In a conversation',
    color: 'bg-amber-500',
    icon: '●',
  },
  {
    value: 'do-not-disturb',
    label: 'Do Not Disturb',
    description: 'Focus mode',
    color: 'bg-red-500',
    icon: '●',
  },
  {
    value: 'invisible',
    label: 'Invisible',
    description: 'Appear offline',
    color: 'bg-slate-500',
    icon: '○',
  },
] as const;

// Create a default status that TypeScript knows exists
const DEFAULT_STATUS = statusOptions[0] as StatusOption;

interface StatusSelectorProps {
  currentStatus: UserStatus;
  onStatusChange: (status: UserStatus) => void;
  label?: string;
}

export function StatusSelector({
  currentStatus,
  onStatusChange,
  label = 'Status',
}: StatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find current option or use default
  const currentOption =
    statusOptions.find((option) => option.value === currentStatus) ?? DEFAULT_STATUS;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusSelect = (status: UserStatus) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-midnight-900 dark:text-slate-100 mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${currentOption.color}`}
              aria-hidden="true"
            ></span>
            <div>
              <span className="block text-midnight-900 dark:text-slate-100">
                {currentOption.label}
              </span>
              <span className="block text-xs text-slate-500">{currentOption.description}</span>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg animate-fade-in">
          <ul role="listbox" className="py-1">
            {statusOptions.map((option) => (
              <li key={option.value} role="option" aria-selected={option.value === currentStatus}>
                <button
                  onClick={() => handleStatusSelect(option.value)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 focus:bg-slate-50 dark:focus:bg-slate-700 focus:outline-none transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-3 h-3 rounded-full ${option.color}`}
                        aria-hidden="true"
                      ></span>
                      <div>
                        <span className="block text-sm text-midnight-900 dark:text-slate-100 font-medium">
                          {option.label}
                        </span>
                        <span className="block text-xs text-slate-500">{option.description}</span>
                      </div>
                    </div>
                    {option.value === currentStatus && (
                      <CheckIcon className="w-4 h-4 text-cyan-600" />
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
