import { useShallow } from 'zustand/react/shallow';
import { useMateRecentSearchStore } from '../store/mateRecentSearchStore';
import { normalizeMateSearchText } from '../utils/mateSearchTerms';
import { MateCloseIcon, MateSearchIcon } from './icons/MateFlowIcons';

const cardClass =
  'rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-card';

export interface MateRecentSearchesPanelVisualQaStateOverride {
  recentSearches: string[];
  onRemoveRecentSearch?: (term: string) => void;
  onClearRecentSearches?: () => void;
}

export interface MateRecentSearchesPanelProps {
  onTermClick: (term: string) => void;
  onTermSelect?: () => void;
  visualQaStateOverride?: MateRecentSearchesPanelVisualQaStateOverride;
}

export default function MateRecentSearchesPanel({
  onTermClick,
  onTermSelect,
  visualQaStateOverride,
}: MateRecentSearchesPanelProps) {
  const { recentSearches, removeRecentSearch, clearRecentSearches } = useMateRecentSearchStore(
    useShallow((state) => ({
      recentSearches: state.recentSearches,
      removeRecentSearch: state.removeRecentSearch,
      clearRecentSearches: state.clearRecentSearches,
    })),
  );
  const effectiveVisualQaStateOverride = import.meta.env.DEV ? visualQaStateOverride : undefined;
  const effectiveRecentSearches = effectiveVisualQaStateOverride?.recentSearches ?? recentSearches;
  const handleRemoveRecentSearch = effectiveVisualQaStateOverride?.onRemoveRecentSearch ?? removeRecentSearch;
  const handleClearRecentSearches = effectiveVisualQaStateOverride?.onClearRecentSearches ?? clearRecentSearches;
  const handleTermClick = (term: string) => {
    const normalizedTerm = normalizeMateSearchText(term);
    if (!normalizedTerm) {
      return;
    }

    onTermClick(normalizedTerm);
    onTermSelect?.();
  };

  return (
    <section className={cardClass} data-testid="mate-recent-searches-panel">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-15 font-black text-gray-900 dark:text-white">
          <MateSearchIcon className="h-3.5 w-3.5 text-primary" />
          최근 검색어
        </h2>
        {effectiveRecentSearches.length > 0 ? (
          <button
            type="button"
            data-testid="mate-recent-search-clear"
            onClick={handleClearRecentSearches}
            className="min-h-11 shrink-0 text-11 font-bold text-gray-400 transition-colors hover:text-primary dark:text-white"
          >
            전체삭제
          </button>
        ) : null}
      </div>

      {effectiveRecentSearches.length === 0 ? (
        <p className="text-12 font-semibold leading-relaxed text-gray-400 dark:text-white">
          검색하면 여기에 기록됩니다.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {effectiveRecentSearches.map((term, index) => (
            <span
              key={term}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-gray-200/80 bg-gray-50 py-1 pl-3 pr-1.5 text-12 font-bold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <button
                type="button"
                data-testid={`mate-recent-search-term-${index + 1}`}
                onClick={() => handleTermClick(term)}
                className="min-h-11 min-w-0 truncate transition-colors hover:text-primary"
              >
                {term}
              </button>
              <button
                type="button"
                aria-label={`${term} 검색어 삭제`}
                data-testid={`mate-recent-search-delete-${index + 1}`}
                onClick={() => handleRemoveRecentSearch(term)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-zinc-200 sm:h-4 sm:w-4"
              >
                <MateCloseIcon className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
