import { LandingBellIcon } from '../icons/LandingIcons';
import { BEGA_MASCOT_ASSET } from './landingAssets';
import { LANDING_PHONE_NAV_TABS } from './landingShowcaseData';
import LandingPhoneBoardScreen from './phone/LandingPhoneBoardScreen';
import LandingPhoneHomeScreen from './phone/LandingPhoneHomeScreen';
import LandingPhoneMateScreen from './phone/LandingPhoneMateScreen';

export default function LandingPhonePreview() {
  return (
    <div className="landing-phone-app" data-phone-scale-target>
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
          <span data-phone-tab={tab.screen ?? undefined} key={tab.label}>
            {tab.label}
          </span>
        ))}
      </nav>

      <div className="landing-phone-screens">
        <div className="landing-phone-screen-panel" data-phone-screen={0}>
          <LandingPhoneHomeScreen />
        </div>
        <div className="landing-phone-screen-panel" data-phone-screen={1}>
          <LandingPhoneMateScreen />
        </div>
        <div className="landing-phone-screen-panel" data-phone-screen={2}>
          <LandingPhoneBoardScreen />
        </div>
      </div>
    </div>
  );
}
