import { useEffect, useRef, useState } from 'react';

import LandingPhonePreview from './LandingPhonePreview';
import { LANDING_APP_PREVIEW_HINT, LANDING_APP_PREVIEW_STEPS } from './landingShowcaseData';

const SCREEN_COUNT = LANDING_APP_PREVIEW_STEPS.length;
const AUTO_ADVANCE_MS = 4_800;

export default function LandingAppPreview() {
  const [activeScreen, setActiveScreen] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionPreference.matches) return undefined;

    intervalRef.current = window.setInterval(() => {
      setActiveScreen((previous) => (previous + 1) % SCREEN_COUNT);
    }, AUTO_ADVANCE_MS);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const selectScreen = (index: number) => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActiveScreen(index);
  };

  const handleStepKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectScreen(index);
    }
  };

  return (
    <section className="landing-app-preview" data-testid="landing-app-preview" id="app">
      <div className="landing-app-preview-glow" aria-hidden="true" />
      <div className="landing-app-preview-inner">
        <div className="landing-app-preview-copy" data-reveal="0">
          <p className="landing-app-preview-kicker">APP PREVIEW</p>
          <h2>
            주머니 속의<br />
            야구장
          </h2>
          <p className="landing-app-preview-description">
            출근길엔 어젯밤 하이라이트, 점심엔 승리 확률, 퇴근길엔 오늘의 라인업.
            데스크톱과 모바일 어디서든 같은 경험입니다.
          </p>
          <div className="landing-app-preview-steps">
            {LANDING_APP_PREVIEW_STEPS.map((step, index) => (
              <div
                aria-pressed={index === activeScreen}
                className="landing-app-preview-step"
                data-active={index === activeScreen || undefined}
                data-step-index={index}
                key={step}
                onClick={() => selectScreen(index)}
                onKeyDown={handleStepKeyDown(index)}
                role="button"
                tabIndex={0}
              >
                <span className="landing-app-preview-step-badge">{index + 1}</span>
                <span className="landing-app-preview-step-label">{step}</span>
              </div>
            ))}
          </div>
          <p className="landing-app-preview-hint">{LANDING_APP_PREVIEW_HINT}</p>
        </div>

        <div className="landing-app-preview-phone" data-reveal="120">
          <div className="landing-phone-scale">
            <figure className="landing-phone-frame" data-testid="landing-phone" aria-label="BEGA 앱 화면 예시">
              <div className="landing-phone-notch" aria-hidden="true" />
              <div className="landing-phone-status" aria-hidden="true">
                <span>9:41</span>
                <span className="landing-phone-status-icons">
                  <i className="landing-phone-signal"><b /><b /><b /><b /></i>
                  <i className="landing-phone-network">5G</i>
                  <i className="landing-phone-battery"><b /></i>
                </span>
              </div>
              <div className="landing-phone-viewport">
                <LandingPhonePreview activeScreen={activeScreen} />
              </div>
              <div className="landing-phone-home-indicator" aria-hidden="true" />
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
