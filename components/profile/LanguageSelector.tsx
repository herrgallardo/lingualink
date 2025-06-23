'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
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
  label,
  showFlag = true,
}: LanguageSelectorProps) {
  const { t } = useTranslation();
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

  const displayLabel = label || t('settings.preferredLanguage');

  return (
    <div className="relative" ref={dropdownRef}>
      {displayLabel && (
        <label className="block text-sm font-medium text-midnight-900 dark:text-slate-100 mb-1">
          {displayLabel}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('settings.language')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showFlag && selectedLang?.flag && (
              <span className="text-xl" role="img" aria-label={`${selectedLang.name} flag`}>
                {selectedLang.flag}
              </span>
            )}
            <div>
              <span className="block text-midnight-900 dark:text-slate-100">
                {selectedLang?.name || t('common.selectLanguage')}
              </span>
              {selectedLang && (
                <span className="block text-xs text-slate-500">{selectedLang.nativeName}</span>
              )}
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
          <div className="p-2 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('settings.searchLanguages')}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {filteredLanguages.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                {t('settings.noLanguagesFound')}
              </div>
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
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 focus:bg-slate-50 dark:focus:bg-slate-700 focus:outline-none transition-colors"
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
                            <span className="block text-sm text-midnight-900 dark:text-slate-100">
                              {language.name}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {language.nativeName} • {language.code}
                            </span>
                          </div>
                        </div>
                        {language.code === selectedLanguage && (
                          <CheckIcon className="w-4 h-4 text-cyan-600" />
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
