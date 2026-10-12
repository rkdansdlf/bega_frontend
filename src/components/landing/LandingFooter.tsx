import { Link } from 'react-router-dom';

import { BEGA_LOGO_ASSET } from './landingAssets';

interface LandingFooterLinkGroup {
  heading: string;
  links: readonly LandingFooterLink[];
}

interface LandingFooterLink {
  label: string;
  to: string;
}

const LANDING_FOOTER_GROUPS: readonly LandingFooterLinkGroup[] = [
  {
    heading: '서비스',
    links: [
      { label: '오늘의 경기', to: '/home' },
      { label: '승리예측', to: '/prediction' },
      { label: '구장가이드', to: '/stadium' },
      { label: '직관일기', to: '/mypage' },
    ],
  },
  {
    heading: '커뮤니티',
    links: [
      { label: '응원게시판', to: '/cheer' },
      { label: '같이가요', to: '/mate' },
      { label: '팀별 게시판', to: '/cheer' },
      { label: '레트로 리더보드', to: '/leaderboard' },
    ],
  },
  {
    heading: '고객지원',
    links: [
      { label: '공지사항', to: '/notice' },
      { label: '문의하기', to: 'mailto:baseballguide251021@gmail.com' },
      { label: '이용약관', to: '/terms' },
      { label: '개인정보처리방침', to: '/privacy' },
    ],
  },
];

const landingFooterLinkClass = 'inline-flex min-h-11 min-w-11 items-center';

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
                  link.to.startsWith('mailto:') ? (
                    <a href={link.to} key={link.label} className={landingFooterLinkClass}>
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.to} key={link.label} className={landingFooterLinkClass}>
                      {link.label}
                    </Link>
                  )
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
            <Link to="/notice" className={landingFooterLinkClass}>공지사항</Link>
            <a href="mailto:baseballguide251021@gmail.com" className={landingFooterLinkClass}>문의하기</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
