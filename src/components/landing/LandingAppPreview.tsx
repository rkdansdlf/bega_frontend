import LandingPhonePreview from './LandingPhonePreview';
import { LANDING_APP_PREVIEW_HINT, LANDING_APP_PREVIEW_STEPS } from './landingShowcaseData';

export default function LandingAppPreview() {
  return (
    <section className="landing-app-preview" data-testid="landing-app-preview" data-phone-scene="">
      <div className="landing-app-preview-sticky" data-phone-sticky="">
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
            <ul className="landing-app-preview-steps">
              {LANDING_APP_PREVIEW_STEPS.map((step, index) => (
                <li data-phone-step={index} key={step}>
                  <i aria-hidden="true" />
                  {step}
                </li>
              ))}
            </ul>
            <p className="landing-app-preview-hint" data-phone-hint="">
              {LANDING_APP_PREVIEW_HINT}
            </p>
          </div>

          <div className="landing-app-preview-phone" data-reveal="120">
            <div className="landing-phone-scale" data-phone-scale="">
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
                  <LandingPhonePreview />
                </div>
                <div className="landing-phone-home-indicator" aria-hidden="true" />
              </figure>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
