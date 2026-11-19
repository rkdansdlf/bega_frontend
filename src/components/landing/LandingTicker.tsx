import { useState } from 'react';

import { TEAM_ASSETS } from './landingAssets';
import { TICKER_ITEMS } from './landingShowcaseData';

interface TickerGroupProps {
  ariaHidden?: boolean;
}

function TickerGroup({ ariaHidden = false }: TickerGroupProps) {
  return (
    <div className="landing-ticker-group" aria-hidden={ariaHidden || undefined}>
      {TICKER_ITEMS.map((item) => (
        <span className="landing-ticker-item" key={`${item.firstTeam}-${item.secondTeam}`}>
          <img
            src={TEAM_ASSETS[item.firstTeam]}
            alt=""
            width={20}
            height={20}
          />
          <span>{item.firstLabel}</span>
          <span className="landing-ticker-score">{item.score}</span>
          <span>{item.secondLabel}</span>
          <img
            src={TEAM_ASSETS[item.secondTeam]}
            alt=""
            width={20}
            height={20}
          />
          <span className={`landing-ticker-status landing-ticker-status-${item.tone}`}>
            {item.status}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function LandingTicker() {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <aside data-testid="landing-score-ticker" data-vqa-overflow="allowed" aria-label="BEGA 기능 예시 스코어">
      {/* 스크린리더용 aria-label 만으로는 부족하다: 눈으로 보는 사용자에게도 가짜 점수임을 밝힌다. */}
      <span className="landing-ticker-demo-badge" data-testid="landing-ticker-demo-badge">
        예시 화면 · 실제 경기 아님
      </span>
      <div
        className="landing-ticker-track"
        data-motion-loop
        data-paused={isPaused || undefined}
      >
        <TickerGroup />
        <TickerGroup ariaHidden />
      </div>
      <button
        type="button"
        className="landing-ticker-toggle"
        data-testid="landing-ticker-toggle"
        data-vqa-min-touch="44"
        aria-pressed={isPaused}
        onClick={() => setIsPaused((paused) => !paused)}
      >
        {isPaused ? '티커 재생' : '티커 일시정지'}
      </button>
    </aside>
  );
}
