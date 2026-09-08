import PowerUpInventory from './PowerUpInventory';
import type {
  PowerupInventory as PowerupInventoryState,
} from '../../api/leaderboard';
import type { LeaderboardEntry } from './LeaderboardRow';

interface RetroLeaderboardFooterPanelsProps {
  hotStreaks: LeaderboardEntry[];
  powerups: PowerupInventoryState;
  activePowerups: string[];
  onUsePowerup?: (type: string) => Promise<void>;
  containerTestId?: string;
}

export default function RetroLeaderboardFooterPanels({
  hotStreaks,
  powerups,
  activePowerups,
  onUsePowerup,
  containerTestId,
}: RetroLeaderboardFooterPanelsProps) {
  return (
    <div
      data-testid={containerTestId}
      style={{ boxSizing: 'border-box', minWidth: 0, width: '100%', maxWidth: '100%' }}
    >
      {hotStreaks.length > 0 && (
        <div style={{ width: '90%', maxWidth: '800px', margin: '20px auto 0' }}>
          <div
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '3px solid #ff6600',
              borderRadius: '8px',
              padding: '16px 20px',
              boxShadow: '0 0 14px rgba(255, 102, 0, 0.2)',
            }}
          >
            <div
              style={{
                fontFamily: "'Galmuri11', 'Galmuri9', sans-serif",
                fontSize: '11px',
                color: '#ff6600',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                imageRendering: 'pixelated',
              }}
            >
              🔥 연승 중인 플레이어
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', minWidth: 0 }}>
              {hotStreaks.map((entry) => (
                <div
                  className="retro-leaderboard-hot-streak-card"
                  key={entry.handle ?? entry.userName}
                  style={{
                    background: 'rgba(255, 102, 0, 0.1)',
                    border: '2px solid #ff6600',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxSizing: 'border-box',
                    flex: '0 1 auto',
                    maxWidth: '100%',
                    minWidth: 0,
                  }}
                >
                  <span style={{ flex: '0 0 auto', fontSize: '16px' }}>🔥</span>
                  <span
                    className="retro-leaderboard-hot-streak-name"
                    style={{
                      color: '#fff',
                      display: '-webkit-box',
                      flex: '1 1 auto',
                      fontFamily: "'Galmuri11', 'Galmuri9', sans-serif",
                      fontSize: '12px',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 2,
                      minWidth: 0,
                      overflow: 'hidden',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {entry.userName}
                  </span>
                  <span
                    className="retro-leaderboard-hot-streak-count"
                    style={{
                      color: '#ff6600',
                      flex: '0 1 auto',
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 'clamp(9px, 3vw, 14px)',
                      minWidth: 0,
                      maxWidth: '45%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.streak}연승
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ width: '90%', maxWidth: '800px', margin: '20px auto 40px' }}>
        <PowerUpInventory
          powerups={powerups as unknown as Record<string, number>}
          activePowerups={activePowerups}
          onUsePowerup={onUsePowerup}
        />
      </div>
    </div>
  );
}
