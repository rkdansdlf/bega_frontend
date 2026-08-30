import { LandingBellIcon } from '../icons/LandingIcons';
import { BEGA_MASCOT_ASSET } from './landingAssets';
import { LANDING_PHONE_NAV_TABS } from './landingShowcaseData';
import LandingPhoneBoardScreen from './phone/LandingPhoneBoardScreen';
import LandingPhoneHomeScreen from './phone/LandingPhoneHomeScreen';
import LandingPhoneMateScreen from './phone/LandingPhoneMateScreen';

interface LandingPhonePreviewProps {
  activeScreen: number;
}

export default function LandingPhonePreview({ activeScreen }: LandingPhonePreviewProps) {
  return (
    <div className="landing-phone-app">
      <header className="landing-phone-app-header">
        <div className="landing-phone-app-brand">
          <img src={BEGA_MASCOT_ASSET} alt="" width={26} height={26} />
          <div>
            <p>BEGA</p>
            <p>BASEBALL GUIDE</p>
          </div>
        </div>
        <div className="landing-phone-app-user">
          <LandingBellIcon size={15} />
          <span>박서윤 님</span>
        </div>
      </header>

      <nav className="landing-phone-nav-tabs" aria-label="앱 화면 예시 메뉴">
        {LANDING_PHONE_NAV_TABS.map((tab) => (
          <span
            data-phone-tab={tab.screen ?? undefined}
            data-active={(tab.screen !== null && tab.screen === activeScreen) || undefined}
            key={tab.label}
          >
            {tab.label}
          </span>
        ))}
      </nav>

      <div className="landing-phone-screens">
        <div className="landing-phone-screen-panel" data-phone-screen={0} data-active={activeScreen === 0 || undefined}>
          <LandingPhoneHomeScreen />
        </div>
        <div className="landing-phone-screen-panel" data-phone-screen={1} data-active={activeScreen === 1 || undefined}>
          <LandingPhoneMateScreen />
        </div>
        <div className="landing-phone-screen-panel" data-phone-screen={2} data-active={activeScreen === 2 || undefined}>
          <LandingPhoneBoardScreen />
        </div>
      </div>
    </div>
  );
}
