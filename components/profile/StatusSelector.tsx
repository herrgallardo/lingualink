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
    color: 'bg-success',
    icon: '●',
  },
  {
    value: 'busy',
    label: 'Busy',
    description: 'In a conversation',
    color: 'bg-warning',
    icon: '●',
  },
  {
    value: 'do-not-disturb',
    label: 'Do Not Disturb',
    description: 'Focus mode',
    color: 'bg-error',
    icon: '●',
  },
  {
    value: 'invisible',
    label: 'Invisible',
    description: 'Appear offline',
    color: 'bg-muted',
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
      {label && <label className="block text-sm font-medium text-primary mb-1">{label}</label>}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-surface border border-default rounded-lg hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
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
              <span className="block text-primary">{currentOption.label}</span>
              <span className="block text-xs text-muted">{currentOption.description}</span>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-surface border border-default rounded-lg shadow-lg animate-fade-in">
          <ul role="listbox" className="py-1">
            {statusOptions.map((option) => (
              <li key={option.value} role="option" aria-selected={option.value === currentStatus}>
                <button
                  onClick={() => handleStatusSelect(option.value)}
                  className="w-full px-4 py-3 text-left hover:bg-background-secondary focus:bg-background-secondary focus:outline-none transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-3 h-3 rounded-full ${option.color}`}
                        aria-hidden="true"
                      ></span>
                      <div>
                        <span className="block text-sm text-primary font-medium">
                          {option.label}
                        </span>
                        <span className="block text-xs text-muted">{option.description}</span>
                      </div>
                    </div>
                    {option.value === currentStatus && (
                      <CheckIcon className="w-4 h-4 text-primary" />
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
