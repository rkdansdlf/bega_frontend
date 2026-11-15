import { useEffect, useState } from 'react';

import { fetchMatchesByDay } from '../../api/predictionMatchDay';
import type { Game } from '../../types/prediction';
import { getTodayString } from '../../utils/predictionDates';

interface PowerupGameSelectorProps {
  selectedGameId: string;
  onSelectGame: (gameId: string) => void;
}

export default function PowerupGameSelector({
  selectedGameId,
  onSelectGame,
}: PowerupGameSelectorProps) {
  const [date, setDate] = useState(getTodayString());
  const [games, setGames] = useState<Game[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoadState('loading');
    setGames([]);
    setError(null);
    onSelectGame('');

    void fetchMatchesByDay(date, { signal: controller.signal }).then((result) => {
      if (!active) return;

      if (!result.ok) {
        setLoadState('error');
        setError(result.error);
        return;
      }

      setGames(result.data.games.filter((game) =>
        Boolean(game.gameId?.trim()) && game.gameStatus?.trim().toUpperCase() === 'SCHEDULED'));
      setLoadState('ready');
    }).catch(() => {
      if (!active) return;
      setLoadState('error');
      setError({ message: '내부 경기 일정을 불러오지 못했습니다.' });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [date, onSelectGame]);

  const errorMessage = error?.code === 'MANUAL_BASEBALL_DATA_REQUIRED'
    ? `${error.code}: ${error.message}`
    : error?.message;

  return (
    <div
      data-testid="retro-powerup-game-selector"
      className="mx-auto mb-3 mt-5 grid w-full max-w-3xl gap-2 rounded-md border-2 border-cyan-400 bg-slate-950 p-4 text-12 text-slate-300"
      style={{ fontFamily: "'Galmuri11', 'Galmuri9', sans-serif" }}
    >
      <label className="grid gap-2">
        <span className="text-cyan-400">경기 날짜</span>
        <input
          data-testid="retro-powerup-game-date"
          type="date"
          value={date}
          onChange={(event) => {
            onSelectGame('');
            setDate(event.target.value);
          }}
          className="box-border min-h-10 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-cyan-400">파워업 적용 경기</span>
        <select
          data-testid="retro-powerup-game-select"
          aria-label="파워업 적용 경기"
          value={selectedGameId}
          disabled={loadState !== 'ready' || games.length === 0}
          onChange={(event) => onSelectGame(event.target.value)}
          className="box-border min-h-10 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        >
          <option value="">경기를 선택하세요</option>
          {games.map((game) => (
            <option key={game.gameId} value={game.gameId}>
              {[game.startTime, `${game.awayTeam} vs ${game.homeTeam}`]
                .filter(Boolean)
                .join(' · ')}
            </option>
          ))}
        </select>
      </label>

      {loadState === 'loading' && <span role="status">내부 일정을 불러오는 중입니다.</span>}
      {loadState === 'error' && errorMessage && <span role="alert">{errorMessage}</span>}
      {loadState === 'ready' && games.length === 0 && (
        <span role="status">선택한 날짜에 파워업을 사용할 수 있는 예정 경기가 없습니다.</span>
      )}
    </div>
  );
}
