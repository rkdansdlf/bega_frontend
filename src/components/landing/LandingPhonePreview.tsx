import { LandingBellIcon } from '../icons/LandingIcons';
import { BEGA_LOGO_ASSET } from './landingAssets';
import { LANDING_PHONE_NAV_TABS } from './landingShowcaseData';
import LandingPhoneBoardScreen from './phone/LandingPhoneBoardScreen';
import LandingPhoneHomeScreen from './phone/LandingPhoneHomeScreen';
import LandingPhoneMateScreen from './phone/LandingPhoneMateScreen';

interface LandingPhonePreviewProps {
  activeScreen: number;
}

// opacity: 0 은 눈에만 숨길 뿐 접근성 트리에는 남는다. 그래서 비활성 패널에는
// aria-hidden(스크린리더가 읽지 않음)과 inert(키보드 포커스·클릭도 차단)를 함께 건다.
// React 18 은 `inert` 를 알지 못해 빈 문자열을 넘겨 HTML 속성으로 직접 렌더링한다.
const getPanelA11yProps = (isActive: boolean) => (
  isActive
    ? {}
    : { 'aria-hidden': true as const, inert: '' }
);

export default function LandingPhonePreview({ activeScreen }: LandingPhonePreviewProps) {
  return (
    <div className="landing-phone-app">
      <header className="landing-phone-app-header">
        <div className="landing-phone-app-brand">
          <img src={BEGA_LOGO_ASSET} alt="" width={26} height={26} />
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
        <div
          className="landing-phone-screen-panel"
          data-phone-screen={0}
          data-active={activeScreen === 0 || undefined}
          {...getPanelA11yProps(activeScreen === 0)}
        >
          <LandingPhoneHomeScreen />
        </div>
        <div
          className="landing-phone-screen-panel"
          data-phone-screen={1}
          data-active={activeScreen === 1 || undefined}
          {...getPanelA11yProps(activeScreen === 1)}
        >
          <LandingPhoneMateScreen />
        </div>
        <div
          className="landing-phone-screen-panel"
          data-phone-screen={2}
          data-active={activeScreen === 2 || undefined}
          {...getPanelA11yProps(activeScreen === 2)}
        >
          <LandingPhoneBoardScreen />
        </div>
      </div>
    </div>
  );
}
