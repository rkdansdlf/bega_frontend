import { BEGA_LOGO_ASSET } from './landingAssets';

interface LandingFooterLinkGroup {
  heading: string;
  links: readonly string[];
}

const LANDING_FOOTER_GROUPS: readonly LandingFooterLinkGroup[] = [
  { heading: '서비스', links: ['오늘의 경기', '승리예측', '구장가이드', '직관일기'] },
  { heading: '커뮤니티', links: ['응원게시판', '같이가요', '팀별 게시판', '레트로 리더보드'] },
  { heading: '고객지원', links: ['공지사항', '문의하기', '이용약관', '개인정보처리방침'] },
];

const preventPlaceholderNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault();
};

export default function LandingFooter() {
  return (
    <footer className="landing-footer" data-testid="landing-footer" data-keep-theme="1">
      <div className="landing-footer-inner">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <div className="landing-footer-brand-mark">
              <img src={BEGA_LOGO_ASSET} alt="BEGA" width={26} height={27} />
              <span>BASEBALL GUIDE</span>
            </div>
            <p>10개 구단 720경기, 야구팬의 하루를 하나의 앱에 담았습니다.</p>
          </div>
          {LANDING_FOOTER_GROUPS.map((group) => (
            <div className="landing-footer-group" key={group.heading}>
              <p className="landing-footer-group-heading">{group.heading}</p>
              <div className="landing-footer-group-links">
                {group.links.map((link) => (
                  <a href="#" key={link} onClick={preventPlaceholderNavigation}>
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="landing-footer-bottom">
          <p className="landing-footer-copyright">
            © 2025 BEGA. KBO 경기 정보는 각 구단 및 KBO 공식 자료를 기준으로 제공됩니다.
          </p>
          <div className="landing-footer-bottom-links">
            <a href="#" onClick={preventPlaceholderNavigation}>공지사항</a>
            <a href="#" onClick={preventPlaceholderNavigation}>문의하기</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
