import { MateCreateLoaderIcon as MateLoaderIcon } from './icons/MateCreateIcons';
import TeamLogo from './TeamLogo';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { TEAMS } from '../utils/constants';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';
import type { MatchInfo } from '../hooks/useMateCreateMachine';
import { useTodayKey } from '../hooks/useTodayKey';
import type { PartyFormData } from '../utils/mateCreateDraft';
import { FieldLabel } from './MateCreatePrimitives';

interface MateCreateMatchStepProps {
  formData: PartyFormData;
  matchLoadErrorMessage: string;
  isLoadingMatches: boolean;
  availableMatches: MatchInfo[];
  retry: () => void;
  selectMatch: (match: MatchInfo) => void;
  updateFormData: (data: Partial<PartyFormData>) => void;
  knownStadiumNames: string[];
}

export default function MateCreateMatchStep({
  formData,
  matchLoadErrorMessage,
  isLoadingMatches,
  availableMatches,
  retry,
  selectMatch,
  updateFormData,
  knownStadiumNames,
}: MateCreateMatchStepProps) {
  const todayKey = useTodayKey();

  return (
    <div className="min-w-0 space-y-6" data-testid="mate-create-match-step">
      <h2 className="mb-2 text-xl text-primary sm:text-2xl">
        경기 선택
      </h2>
      <p className="text-body text-gray-500 mb-6">
        관람하실 경기를 선택해주세요
      </p>

      <div className="space-y-4">
        <div>
          <FieldLabel htmlFor="gameDate">경기 날짜 <span className="text-red-500 ml-0.5">*</span></FieldLabel>
          <Input
            id="gameDate"
            data-testid="mate-create-match-date"
            type="date"
            value={formData.gameDate}
            onChange={(event) => updateFormData({ gameDate: event.target.value })}
            min={todayKey}
            className="mt-1 min-h-11"
          />
        </div>

        {formData.gameDate && (
          <div className="grid gap-3 pt-2">
            {matchLoadErrorMessage && (
              <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 text-body text-red-500 [overflow-wrap:anywhere]">{matchLoadErrorMessage}</p>
                <Button
                  data-testid="mate-create-match-retry"
                  variant="outline"
                  size="touch"
                  className="w-full sm:w-auto"
                  onClick={retry}
                >
                  다시 시도
                </Button>
              </div>
            )}
            {isLoadingMatches ? (
              <div
                className="py-12 text-center"
                data-testid="mate-create-match-loading"
                role="status"
                aria-busy="true"
              >
                <MateLoaderIcon className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
                <p className="text-body text-gray-500">경기를 불러오는 중입니다...</p>
              </div>
            ) : availableMatches.length > 0 ? (
              availableMatches.map((match, index) => {
                const isSelected = formData.homeTeam === match.homeTeam
                  && formData.awayTeam === match.awayTeam
                  && formData.gameTime === match.gameTime
                  && formData.stadium === match.stadium;

                return (
                  <button
                    type="button"
                    key={match.id}
                    data-testid={`mate-create-match-option-${index}`}
                    aria-pressed={isSelected}
                    onClick={() => selectMatch(match)}
                    className={`relative min-h-11 w-full min-w-0 cursor-pointer overflow-hidden rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isSelected
                      ? 'border-primary bg-green-50 dark:bg-green-900/20 ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-900'
                      : 'border-gray-200 dark:border-border hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-3 sm:flex-1 sm:flex-row sm:items-center sm:gap-4">
                        <div className="w-full min-w-0 text-left text-body font-bold text-gray-500 [overflow-wrap:anywhere] dark:text-white sm:w-16 sm:text-center">
                          {match.gameTime}
                        </div>
                        <div className="hidden h-8 w-px bg-gray-200 dark:bg-secondary sm:block" />
                        <div className="flex items-center justify-between gap-3 sm:flex-1 sm:justify-center">
                          <span className="flex min-w-0 items-center gap-2 text-body font-bold dark:text-white sm:text-base">
                            <TeamLogo teamId={match.awayTeam} size="sm" />
                            <span className="truncate">{TEAMS.find((team) => team.id === match.awayTeam)?.name}</span>
                          </span>
                          <span className="text-gray-400 text-body">VS</span>
                          <span className="flex min-w-0 items-center gap-2 text-body font-bold dark:text-white sm:text-base">
                            <span className="truncate">{TEAMS.find((team) => team.id === match.homeTeam)?.name}</span>
                            <TeamLogo teamId={match.homeTeam} size="sm" />
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 text-left text-body text-gray-400 [overflow-wrap:anywhere] sm:ml-4 sm:min-w-[60px] sm:text-right">
                        {formatStadiumDisplayName(match.stadium)}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/5 dark:bg-primary/20 pointer-events-none" />
                    )}
                  </button>
                );
              })
            ) : (
              <div
                className="min-w-0 space-y-4 rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-4 dark:border-amber-700/40 dark:bg-amber-900/20"
                data-testid="mate-create-match-manual"
              >
                <div className="text-center py-2 text-gray-600 dark:text-white">
                  경기 목록 조회 결과가 없습니다. 수동 입력으로 계속 진행할 수 있습니다.
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <FieldLabel htmlFor="manualGameTime">경기 시간</FieldLabel>
                    <Input
                      id="manualGameTime"
                      data-testid="mate-create-match-manual-time"
                      type="time"
                      value={formData.gameTime}
                      onChange={(event) => updateFormData({ gameTime: event.target.value })}
                      className="min-h-11"
                    />
                  </div>
                  <div className="space-y-1">
                    <FieldLabel htmlFor="manualStadium">구장</FieldLabel>
                    <Input
                      id="manualStadium"
                      data-testid="mate-create-match-manual-stadium"
                      list="manual-stadium-options"
                      value={formData.stadium}
                      onChange={(event) => updateFormData({ stadium: event.target.value })}
                      placeholder="예: 잠실야구장"
                      className="min-h-11"
                    />
                    <datalist id="manual-stadium-options">
                      {knownStadiumNames.map((stadiumName) => (
                        <option key={stadiumName} value={stadiumName} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <FieldLabel htmlFor="manualAwayTeam">원정 팀</FieldLabel>
                    <select
                      id="manualAwayTeam"
                      data-testid="mate-create-match-manual-away"
                      value={formData.awayTeam}
                      onChange={(event) => updateFormData({ awayTeam: event.target.value })}
                      className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-border dark:bg-input/30"
                    >
                      <option value="">원정 팀 선택</option>
                      {TEAMS.map((team) => (
                        <option key={`away-${team.id}`} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <FieldLabel htmlFor="manualHomeTeam">홈 팀</FieldLabel>
                    <select
                      id="manualHomeTeam"
                      data-testid="mate-create-match-manual-home"
                      value={formData.homeTeam}
                      onChange={(event) => updateFormData({ homeTeam: event.target.value })}
                      className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-border dark:bg-input/30"
                    >
                      <option value="">홈 팀 선택</option>
                      {TEAMS.map((team) => (
                        <option key={`home-${team.id}`} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="min-w-0 text-body text-gray-500 [overflow-wrap:anywhere] dark:text-white">
                  팀/구장까지 입력하면 다음 단계로 진행할 수 있습니다.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
