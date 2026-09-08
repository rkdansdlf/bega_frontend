import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  addStadiumFavorite,
  getMyFavoriteStadiumIds,
  removeStadiumFavorite,
} from '../api/stadium';
import { HeartIcon } from './icons/StadiumGuideIcons';

type AuthenticatedStadiumFavoriteToggleProps = {
  favoriteIdsOverride?: readonly string[];
  isPendingOverride?: boolean;
  onToggleOverride?: () => Promise<unknown> | unknown;
  stateOverride?: 'error' | 'loading';
  stadiumId: string;
  testId?: string;
};

export default function AuthenticatedStadiumFavoriteToggle({
  favoriteIdsOverride,
  isPendingOverride,
  onToggleOverride,
  stateOverride,
  stadiumId,
  testId = 'stadium-favorite-toggle',
}: AuthenticatedStadiumFavoriteToggleProps) {
  const queryClient = useQueryClient();

  const { data: queriedFavoriteIds = [] } = useQuery({
    queryKey: ['stadium-favorites'],
    queryFn: getMyFavoriteStadiumIds,
    staleTime: 5 * 60 * 1000,
    enabled: favoriteIdsOverride === undefined && stateOverride === undefined,
  });

  const favoriteIds = favoriteIdsOverride ?? (stateOverride === undefined ? queriedFavoriteIds : []);
  const isFavorite = favoriteIds.includes(stadiumId);

  const favoriteMutation = useMutation({
    mutationFn: ({ id, currentlyFavorite }: { id: string; currentlyFavorite: boolean }) => (
      onToggleOverride
        ? Promise.resolve(onToggleOverride())
        : currentlyFavorite ? removeStadiumFavorite(id) : addStadiumFavorite(id)
    ),
    onMutate: async ({ id, currentlyFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['stadium-favorites'] });
      const prev = queryClient.getQueryData<string[]>(['stadium-favorites']) ?? [];
      queryClient.setQueryData<string[]>(
        ['stadium-favorites'],
        currentlyFavorite ? prev.filter((sid) => sid !== id) : [...prev, id],
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['stadium-favorites'], context.prev);
      toast.error('즐겨찾기를 변경하지 못했습니다. 다시 시도해 주세요.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['stadium-favorites'] }),
  });
  const isPending = isPendingOverride ?? favoriteMutation.isPending;

  return (
    <button
      type="button"
      onClick={() => favoriteMutation.mutate({ id: stadiumId, currentlyFavorite: isFavorite })}
      disabled={isPending}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-1 transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 dark:hover:bg-white/10"
      data-testid={testId}
      aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      aria-busy={isPending}
      aria-pressed={isFavorite}
    >
      <HeartIcon
        className={isFavorite ? 'fill-red-400 text-red-400' : 'text-gray-400 dark:text-white/60'}
        width={18}
        height={18}
      />
    </button>
  );
}
