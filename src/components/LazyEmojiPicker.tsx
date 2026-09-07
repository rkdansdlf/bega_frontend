import { useMemo, useState } from 'react';
import { EmojiPickerSearchIcon } from './icons/EmojiPickerIcons';

const RECENT_EMOJI_STORAGE_KEY = 'bega_recent_emojis';
const MAX_RECENT_EMOJIS = 18;

const EMOJI_GROUPS = [
  {
    id: 'baseball',
    label: '야구',
    emojis: ['⚾', '🏟️', '📣', '🔥', '👏', '🙌', '💪', '🏆', '🎯', '🚀', '⭐', '🥎', '🎉', '🎊', '🥇', '📢'],
  },
  {
    id: 'faces',
    label: '표정',
    emojis: ['😀', '😆', '😊', '😍', '🥰', '😘', '😎', '🤩', '🥹', '😭', '😤', '🤔', '😡', '🤯', '😴', '🥳'],
  },
  {
    id: 'reactions',
    label: '반응',
    emojis: ['👍', '👎', '👏', '🙌', '🙏', '🫶', '🤝', '✌️', '🤞', '🫡', '💯', '❤️', '🧡', '💛', '💚', '💙'],
  },
  {
    id: 'fun',
    label: '기분',
    emojis: ['🤣', '😅', '😉', '😮', '🤗', '😬', '🥲', '😋', '😱', '🤤', '🤪', '😇', '✨', '💥', '🌈', '☀️'],
  },
] as const;

const EMOJI_KEYWORDS: Record<string, string[]> = {
  '⚾': ['야구', 'baseball', 'ball'],
  '🏟️': ['구장', 'stadium', 'field'],
  '📣': ['응원', 'cheer', 'megaphone'],
  '🔥': ['불', 'fire', 'hot'],
  '👏': ['박수', 'clap'],
  '🙌': ['만세', 'cheer', 'hands'],
  '💪': ['힘', 'strong', 'power'],
  '🏆': ['우승', 'trophy', 'winner'],
  '🎯': ['목표', 'target'],
  '🚀': ['로켓', 'rocket'],
  '⭐': ['별', 'star'],
  '🎉': ['축하', 'party', 'celebrate'],
  '😀': ['웃음', 'happy', 'smile'],
  '😆': ['빵긋', 'laugh', 'funny'],
  '😊': ['미소', 'smile', 'nice'],
  '😍': ['좋아', 'love', 'heart eyes'],
  '🥰': ['사랑', 'love', 'cute'],
  '😭': ['눈물', 'cry', 'sad'],
  '😤': ['분노', 'angry', 'hmph'],
  '🤔': ['고민', 'think', 'hmm'],
  '😡': ['화남', 'mad', 'angry'],
  '🥳': ['파티', 'party', 'celebrate'],
  '👍': ['좋아요', 'like', 'yes'],
  '👎': ['싫어요', 'no', 'dislike'],
  '🙏': ['부탁', 'pray', 'thanks'],
  '🫶': ['하트', 'love', 'heart'],
  '🤝': ['약속', 'deal', 'handshake'],
  '💯': ['백점', 'perfect', '100'],
  '❤️': ['하트', 'love', 'heart'],
  '💙': ['블루', 'blue', 'heart'],
  '🤣': ['웃김', 'lol', 'funny'],
  '😅': ['머쓱', 'awkward', 'sweat'],
  '😉': ['윙크', 'wink'],
  '😮': ['놀람', 'surprised', 'wow'],
  '🤗': ['포옹', 'hug', 'warm'],
  '😱': ['충격', 'shock', 'scream'],
  '🤤': ['맛있', 'yummy', 'drool'],
  '✨': ['반짝', 'sparkles'],
  '💥': ['폭발', 'boom'],
  '🌈': ['무지개', 'rainbow'],
  '☀️': ['태양', 'sun'],
};

interface LazyEmojiPickerProps {
  isDarkMode: boolean;
  onEmojiSelect: (emoji: string) => void;
  width?: number;
  height?: number;
  visualQaStateOverride?: {
    activeGroupId?: string;
    query?: string;
    recentEmojis?: string[];
  };
}

const SUPPORTED_EMOJIS = new Set(EMOJI_GROUPS.flatMap((group) => group.emojis));

const normalizeRecentEmojis = (values: unknown) => {
  if (!Array.isArray(values)) {
    return [] as string[];
  }

  return Array.from(new Set(values.filter((value): value is string => (
    typeof value === 'string' && SUPPORTED_EMOJIS.has(value as never)
  )))).slice(0, MAX_RECENT_EMOJIS);
};

const normalizeDimension = (
  value: number,
  fallback: number,
  minimum: number,
  maximum: number,
) => (Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback);

const readRecentEmojis = () => {
  if (typeof window === 'undefined') {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_EMOJI_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizeRecentEmojis(parsed);
  } catch {
    return [] as string[];
  }
};

const writeRecentEmojis = (emojis: string[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(RECENT_EMOJI_STORAGE_KEY, JSON.stringify(emojis));
  } catch {
    // Ignore storage failures and keep the picker usable.
  }
};

export default function LazyEmojiPicker({
  isDarkMode,
  onEmojiSelect,
  width = 300,
  height = 400,
  visualQaStateOverride: visualQaStateOverrideProp,
}: LazyEmojiPickerProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : visualQaStateOverrideProp;
  const [query, setQuery] = useState(() => visualQaStateOverride?.query ?? '');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => normalizeRecentEmojis(
    visualQaStateOverride?.recentEmojis ?? readRecentEmojis(),
  ));
  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    const initialRecentEmojis = normalizeRecentEmojis(
      visualQaStateOverride?.recentEmojis ?? readRecentEmojis(),
    );
    const requestedGroupId = visualQaStateOverride?.activeGroupId;
    if (requestedGroupId === 'recent' && initialRecentEmojis.length > 0) {
      return requestedGroupId;
    }
    if (EMOJI_GROUPS.some(({ id }) => id === requestedGroupId)) {
      return requestedGroupId as (typeof EMOJI_GROUPS)[number]['id'];
    }
    return initialRecentEmojis.length > 0 ? 'recent' : EMOJI_GROUPS[0].id;
  });
  const [lastSelectedEmoji, setLastSelectedEmoji] = useState('');
  const normalizedWidth = normalizeDimension(width, 300, 280, 420);
  const normalizedHeight = normalizeDimension(height, 400, 320, 520);

  const groups = useMemo(() => {
    const baseGroups = EMOJI_GROUPS.map((group) => ({ ...group, emojis: [...group.emojis] }));
    if (recentEmojis.length === 0) {
      return baseGroups;
    }

    return [
      {
        id: 'recent',
        label: '최근',
        emojis: recentEmojis,
      },
      ...baseGroups,
    ];
  }, [recentEmojis]);

  const currentGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];

  const visibleEmojis = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return currentGroup?.emojis ?? [];
    }

    const uniqueEmojis = Array.from(new Set(groups.flatMap((group) => group.emojis)));
    return uniqueEmojis.filter((emoji) => {
      if (emoji.includes(trimmedQuery)) {
        return true;
      }

      return (EMOJI_KEYWORDS[emoji] ?? []).some((keyword) => keyword.toLowerCase().includes(trimmedQuery));
    });
  }, [currentGroup, groups, query]);

  const handleEmojiClick = (emoji: string) => {
    const nextRecentEmojis = [emoji, ...recentEmojis.filter((value) => value !== emoji)].slice(0, MAX_RECENT_EMOJIS);
    setRecentEmojis(nextRecentEmojis);
    setLastSelectedEmoji(emoji);
    writeRecentEmojis(nextRecentEmojis);
    onEmojiSelect(emoji);
  };

  return (
    <div
      role="dialog"
      aria-label="이모지 선택기"
      data-selected-emoji={lastSelectedEmoji || undefined}
      data-testid="lazy-emoji-picker"
      className={`flex min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border shadow-lg ${
        isDarkMode
          ? 'border-border bg-card text-slate-100'
          : 'border-slate-200 bg-white text-slate-900'
      }`}
      style={{
        width: normalizedWidth,
        height: normalizedHeight,
        maxWidth: 'calc(100vw - 2rem)',
        maxHeight: 'calc(100dvh - 2rem)',
      }}
    >
      <div className={`shrink-0 border-b px-3 py-3 ${isDarkMode ? 'border-border' : 'border-slate-200'}`}>
        <div
          data-testid="lazy-emoji-picker-search-shell"
          className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-3 transition-colors hover:border-primary focus-within:border-primary ${
            isDarkMode
              ? 'border-border bg-slate-900/40 text-slate-300'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          <EmojiPickerSearchIcon className="h-4 w-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="이모지 검색"
            placeholder="이모지 검색..."
            data-testid="lazy-emoji-picker-search"
            data-vqa-min-touch="44"
            className="min-h-11 min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-inherit focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
      </div>

      <div
        role="toolbar"
        aria-label="이모지 카테고리"
        className={`flex shrink-0 gap-1 overflow-x-auto px-3 py-2 ${isDarkMode ? 'border-border' : 'border-slate-200'}`}
      >
        {groups.map((group) => {
          const isActive = group.id === currentGroup.id && query.trim().length === 0;
          return (
            <button
              key={group.id}
              type="button"
              aria-pressed={isActive}
              data-testid={`lazy-emoji-picker-group-${group.id}`}
              data-vqa-min-touch="44"
              onClick={() => {
                setQuery('');
                setActiveGroupId(group.id);
              }}
              className={`min-h-11 shrink-0 rounded-full px-2 py-2 text-label font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                isActive
                  ? isDarkMode
                    ? 'bg-primary/20 text-primary'
                    : 'bg-indigo-50 text-indigo-600'
                  : isDarkMode
                    ? 'bg-slate-900/50 text-slate-300 hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {visibleEmojis.length > 0 ? (
          <div
            className="grid gap-2 pt-2"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(2.75rem, 1fr))' }}
          >
            {visibleEmojis.map((emoji, index) => (
              <button
                key={`${query || currentGroup.id}-${emoji}`}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                data-testid={`lazy-emoji-picker-emoji-${index}`}
                data-vqa-min-touch="44"
                className={`flex h-11 min-w-11 items-center justify-center rounded-xl text-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  isDarkMode
                    ? 'hover:bg-slate-800'
                    : 'hover:bg-slate-100'
                }`}
                aria-label={`이모지 ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
          <div
            role="status"
            className={`flex h-full min-h-24 items-center justify-center rounded-xl px-3 text-center text-body ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            검색 결과가 없습니다.
          </div>
        )}
      </div>
      <span
        aria-live="polite"
        className="sr-only"
        data-testid="lazy-emoji-picker-selection-status"
      >
        {lastSelectedEmoji ? `${lastSelectedEmoji} 이모지를 선택했습니다.` : ''}
      </span>
    </div>
  );
}
