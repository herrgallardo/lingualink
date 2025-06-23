'use client';

import { MessageSkeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

// Define the search result type based on the search_messages function return
type SearchResult = {
  message_id: string;
  chat_id: string;
  sender_id: string;
  original_text: string;
  message_timestamp: string;
  rank: number;
};

export default function SearchPage() {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const { t } = useTranslation();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;

    setSearching(true);
    // TODO: Implement search functionality
    setTimeout(() => {
      setSearching(false);
      setResults([]);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-cyan-600 mb-6">{t('search.searchMessages')}</h1>

      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search.messagePlaceholder')}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-midnight-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={searching || !search.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-primary text-white rounded-md font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('common.search')}
          </button>
        </div>
      </form>

      {/* Results */}
      {searching ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <MessageSkeleton key={i} />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          {/* TODO: Display search results */}
          {results.map((result) => (
            <div key={result.message_id} className="p-4 bg-white dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-midnight-900 dark:text-slate-100">
                {result.original_text}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(result.message_timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      ) : search && !searching ? (
        <div className="text-center py-12">
          <MagnifyingGlassIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">{t('search.noResultsFor', { query: search })}</p>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-500">{t('search.searchEverything')}</p>
        </div>
      )}
    </div>
  );
}
