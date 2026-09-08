import { LandingPlusIcon, LandingSearchIcon } from '../../icons/LandingIcons';
import { BEGA_MASCOT_ASSET, TEAM_ASSETS } from '../landingAssets';
import { LANDING_PHONE_MATE_SCREEN } from '../landingShowcaseData';

const DATA = LANDING_PHONE_MATE_SCREEN;

export default function LandingPhoneMateScreen() {
  return (
    <div className="landing-phone-mate-screen">
      <header className="landing-phone-mate-header">
        <div>
          <p>{DATA.heading}</p>
          <p>{DATA.subheading}</p>
        </div>
        <span className="landing-phone-mate-create">
          <LandingPlusIcon size={10} />
          {DATA.createLabel}
        </span>
      </header>

      <div className="landing-phone-mate-guide">
        <p>{DATA.guide.title}</p>
        <ul>
          <li>
            <b>내가 호스트인 파티:</b> 신청 관리 → 승인/거절 → 채팅방 소통
          </li>
          <li>{DATA.guide.depositNote}</li>
        </ul>
      </div>

      <div className="landing-phone-mate-search">
        <LandingSearchIcon size={12} />
        <span>{DATA.searchPlaceholder}</span>
      </div>

      <div className="landing-phone-mate-filters">
        {DATA.filterTabs.map((tab, index) => (
          <span
            className={index === DATA.activeFilterIndex ? 'landing-phone-mate-filter-active' : undefined}
            key={tab}
          >
            {tab}
          </span>
        ))}
      </div>

      {DATA.cards.map((card) => (
        <article className="landing-phone-card landing-phone-mate-match-card" key={card.hostName}>
          <div className="landing-phone-mate-host">
            {card.hostAvatarKind === 'mascot' ? (
              <img src={BEGA_MASCOT_ASSET} alt="" width={24} height={24} />
            ) : (
              <span className="landing-phone-mate-host-initial">{card.hostInitial}</span>
            )}
            <div>
              <span>
                <b>{card.hostName}</b>
                <img src={TEAM_ASSETS[card.team]} alt="" width={13} height={13} />
              </span>
              <em>신뢰도 {card.trustScore}</em>
            </div>
            <strong>{card.status}</strong>
          </div>
          <div className="landing-phone-mate-vs">
            <img src={TEAM_ASSETS[card.homeTeam]} alt="" width={30} height={30} />
            <span>VS</span>
            <img src={TEAM_ASSETS[card.awayTeam]} alt="" width={30} height={30} />
          </div>
          <dl>
            <div>
              <dt>일시</dt>
              <dd>{card.datetime}</dd>
            </div>
            <div>
              <dt>장소</dt>
              <dd>{card.venue}</dd>
            </div>
            <div>
              <dt>인원</dt>
              <dd>{card.party}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
