'use client';

import { PageInfo, Pagination } from '@/components/search/Pagination';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchInput } from '@/components/search/SearchInput';
import { ChatResults, MessageResults, UserResults } from '@/components/search/SearchResults';
import { ChatListSkeleton, MessageSkeleton, UserListSkeleton } from '@/components/ui/Skeleton';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SearchService, type SearchFilters as SearchFiltersType } from '@/lib/services/search';
import type { Database } from '@/lib/types/database';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

type SearchTab = 'messages' | 'chats' | 'users';
type MessageSearchResult = Database['public']['Functions']['search_messages']['Returns'][0];
type UserSearchResult = Database['public']['Tables']['users']['Row'];
type ChatSearchResult = Database['public']['Views']['chat_list']['Row'];

const RESULTS_PER_PAGE = 20;

export default function SearchPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('messages');
  const [searching, setSearching] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [currentPage, setCurrentPage] = useState(1);
  const { t } = useTranslation();

  // Results state
  const [messageResults, setMessageResults] = useState<{
    data: MessageSearchResult[];
    totalCount: number;
    totalPages: number;
  }>({ data: [], totalCount: 0, totalPages: 0 });

  const [chatResults, setChatResults] = useState<{
    data: ChatSearchResult[];
    totalCount: number;
    totalPages: number;
  }>({ data: [], totalCount: 0, totalPages: 0 });

  const [userResults, setUserResults] = useState<{
    data: UserSearchResult[];
    totalCount: number;
    totalPages: number;
  }>({ data: [], totalCount: 0, totalPages: 0 });

  const supabase = useSupabase();
  const router = useRouter();

  // Memoize the search service to prevent recreating on every render
  const searchService = useMemo(() => new SearchService(supabase), [supabase]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to first page on new search
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Perform search when debounced value changes
  const performSearch = useCallback(async () => {
    if (!debouncedSearch.trim()) return;

    setSearching(true);
    try {
      const pagination = { page: currentPage, pageSize: RESULTS_PER_PAGE };

      switch (activeTab) {
        case 'messages': {
          const results = await searchService.searchMessages(debouncedSearch, filters, pagination);
          setMessageResults({
            data: results.data,
            totalCount: results.totalCount,
            totalPages: results.totalPages,
          });
          break;
        }

        case 'chats': {
          const results = await searchService.searchChats(debouncedSearch, pagination);
          setChatResults({
            data: results.data,
            totalCount: results.totalCount,
            totalPages: results.totalPages,
          });
          break;
        }

        case 'users': {
          const results = await searchService.searchUsers(debouncedSearch, pagination);
          setUserResults({
            data: results.data,
            totalCount: results.totalCount,
            totalPages: results.totalPages,
          });
          break;
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  }, [debouncedSearch, activeTab, filters, currentPage, searchService]);

  // Effect to perform search
  useEffect(() => {
    if (debouncedSearch.trim()) {
      performSearch();
    } else {
      // Clear results if search is empty
      setMessageResults({ data: [], totalCount: 0, totalPages: 0 });
      setChatResults({ data: [], totalCount: 0, totalPages: 0 });
      setUserResults({ data: [], totalCount: 0, totalPages: 0 });
    }
  }, [debouncedSearch, activeTab, filters, currentPage, performSearch]);

  const handleUserClick = async (userId: string) => {
    try {
      const { data } = await supabase.rpc('create_or_get_direct_chat', {
        other_user_id: userId,
      });

      if (data) {
        router.push(`/chat/${data}`);
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const resetFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const tabs = [
    {
      id: 'messages' as const,
      label: t('search.messageResults'),
      count: messageResults.totalCount,
    },
    { id: 'chats' as const, label: t('search.chatResults'), count: chatResults.totalCount },
    { id: 'users' as const, label: t('search.userResults'), count: userResults.totalCount },
  ];

  const getCurrentResults = () => {
    switch (activeTab) {
      case 'messages':
        return {
          data: messageResults.data,
          totalCount: messageResults.totalCount,
          totalPages: messageResults.totalPages,
        };
      case 'chats':
        return {
          data: chatResults.data,
          totalCount: chatResults.totalCount,
          totalPages: chatResults.totalPages,
        };
      case 'users':
        return {
          data: userResults.data,
          totalCount: userResults.totalCount,
          totalPages: userResults.totalPages,
        };
    }
  };

  const currentResults = getCurrentResults();

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-cyan-600 mb-6">{t('search.title')}</h1>

      {/* Search input */}
      <div className="mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('search.messagePlaceholder')}
          size="large"
          autoFocus
          loading={searching}
        />
      </div>

      {/* Search tabs */}
      {debouncedSearch && (
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              className={`
                px-4 py-2 font-medium text-sm transition-colors relative
                ${
                  activeTab === tab.id
                    ? 'text-cyan-600 dark:text-cyan-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }
              `}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600 dark:bg-cyan-400" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters sidebar */}
        {debouncedSearch && activeTab === 'messages' && (
          <div className="lg:col-span-1">
            <SearchFilters filters={filters} onFiltersChange={setFilters} onReset={resetFilters} />
          </div>
        )}

        {/* Results */}
        <div
          className={
            debouncedSearch && activeTab === 'messages' ? 'lg:col-span-3' : 'lg:col-span-4'
          }
        >
          {searching ? (
            <div className="space-y-4">
              {activeTab === 'messages' && [...Array(3)].map((_, i) => <MessageSkeleton key={i} />)}
              {activeTab === 'chats' && <ChatListSkeleton />}
              {activeTab === 'users' && <UserListSkeleton />}
            </div>
          ) : currentResults.data.length > 0 ? (
            <>
              {/* Page info */}
              <PageInfo
                currentPage={currentPage}
                pageSize={RESULTS_PER_PAGE}
                totalItems={currentResults.totalCount}
                className="mb-4"
              />

              {/* Results list */}
              <div className="mb-6">
                {activeTab === 'messages' && (
                  <MessageResults results={messageResults.data} searchQuery={debouncedSearch} />
                )}
                {activeTab === 'chats' && <ChatResults results={chatResults.data} />}
                {activeTab === 'users' && (
                  <UserResults results={userResults.data} onUserClick={handleUserClick} />
                )}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={currentResults.totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          ) : debouncedSearch && !searching ? (
            <div className="text-center py-12">
              <p className="text-slate-500">
                {t('search.noResultsFor', { query: debouncedSearch })}
              </p>
              {activeTab === 'messages' && Object.keys(filters).length > 0 && (
                <button
                  onClick={resetFilters}
                  className="mt-4 text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  {t('search.clearFiltersAndTry')}
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500">
                {t('search.enterSearchTerm', { type: t(`search.${activeTab}`) })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
