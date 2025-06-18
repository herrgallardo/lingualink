'use client';

import type { Language } from '@/lib/utils/languages';
import { getLanguageByCode, getSortedLanguages, searchLanguages } from '@/lib/utils/languages';
import { CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  label?: string;
  showFlag?: boolean;
}

export function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  label = 'Preferred Language',
  showFlag = true,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLanguages, setFilteredLanguages] = useState<Language[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedLang = getLanguageByCode(selectedLanguage);

  useEffect(() => {
    if (searchQuery) {
      setFilteredLanguages(searchLanguages(searchQuery));
    } else {
      setFilteredLanguages(getSortedLanguages(true));
    }
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleLanguageSelect = (languageCode: string) => {
    onLanguageChange(languageCode);
    setIsOpen(false);
    setSearchQuery('');
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
          <div className="flex items-center gap-2">
            {showFlag && selectedLang?.flag && (
              <span className="text-xl" role="img" aria-label={`${selectedLang.name} flag`}>
                {selectedLang.flag}
              </span>
            )}
            <div>
              <span className="block text-primary">
                {selectedLang?.name || 'Select a language'}
              </span>
              {selectedLang && (
                <span className="block text-xs text-muted">{selectedLang.nativeName}</span>
              )}
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
          <div className="p-2 border-b border-default">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search languages..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-default rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {filteredLanguages.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted text-sm">No languages found</div>
            ) : (
              <ul role="listbox" className="py-1">
                {filteredLanguages.map((language) => (
                  <li
                    key={language.code}
                    role="option"
                    aria-selected={language.code === selectedLanguage}
                  >
                    <button
                      onClick={() => handleLanguageSelect(language.code)}
                      className="w-full px-4 py-2 text-left hover:bg-background-secondary focus:bg-background-secondary focus:outline-none transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {showFlag && language.flag && (
                            <span
                              className="text-lg"
                              role="img"
                              aria-label={`${language.name} flag`}
                            >
                              {language.flag}
                            </span>
                          )}
                          <div>
                            <span className="block text-sm text-primary">{language.name}</span>
                            <span className="block text-xs text-muted">
                              {language.nativeName} • {language.code}
                            </span>
                          </div>
                        </div>
                        {language.code === selectedLanguage && (
                          <CheckIcon className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
