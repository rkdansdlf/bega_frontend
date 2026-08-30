import {
  LandingCalendarIcon,
  LandingChevronLeftIcon,
  LandingChevronRightIcon,
  LandingClockIcon,
  LandingHeartIcon,
  LandingMessageSquareIcon,
} from '../../icons/LandingIcons';
import { TEAM_ASSETS } from '../landingAssets';
import { LANDING_PHONE_HOME_SCREEN } from '../landingShowcaseData';

const DATA = LANDING_PHONE_HOME_SCREEN;

export default function LandingPhoneHomeScreen() {
  return (
    <div className="landing-phone-home-screen">
      <header className="landing-phone-home-header">
        <div>
          <p>{DATA.heading}</p>
          <p>{DATA.subheading}</p>
        </div>
        <div className="landing-phone-home-season">
          <span>{DATA.seasonLabel}</span>
          <strong>{DATA.date}</strong>
        </div>
      </header>

      <div className="landing-phone-home-datebar">
        <span className="landing-phone-home-date-nav">
          <LandingChevronLeftIcon size={11} />
        </span>
        <span className="landing-phone-home-date-label">{DATA.date}</span>
        <span className="landing-phone-home-date-nav">
          <LandingChevronRightIcon size={11} />
        </span>
        <span className="landing-phone-home-round-chip">{DATA.game.round}</span>
        <span className="landing-phone-home-ticket-chip">
          <LandingCalendarIcon size={11} />
          캘린더
        </span>
      </div>

      <div className="landing-phone-home-season-tabs">
        {DATA.seasonTabs.map((tab, index) => (
          <span
            className={index === DATA.activeSeasonTabIndex ? 'landing-phone-home-season-tab-active' : undefined}
            key={tab}
          >
            {tab}
          </span>
        ))}
      </div>

      <article className="landing-phone-card landing-phone-home-game-card">
        <div className="landing-phone-home-game-meta">
          <span>{DATA.game.venueChip}</span>
          <span>
            <LandingClockIcon size={10} />
            {DATA.game.time}
          </span>
          <span className="landing-phone-home-game-status">{DATA.game.statusBadge}</span>
        </div>
        <p className="landing-phone-home-game-round">{DATA.game.round}</p>
        <div className="landing-phone-home-matchup">
          <div>
            <img src={TEAM_ASSETS[DATA.game.homeTeam]} alt="" width={38} height={38} />
            <span>{DATA.game.homeLabel}</span>
          </div>
          <b>VS</b>
          <div>
            <img src={TEAM_ASSETS[DATA.game.awayTeam]} alt="" width={38} height={38} />
            <span>{DATA.game.awayLabel}</span>
          </div>
        </div>
      </article>

      <p className="landing-phone-home-ticket-note">{DATA.ticketNote}</p>

      <article className="landing-phone-card landing-phone-home-standings-card">
        <div className="landing-phone-home-card-heading">
          <span>{DATA.standingsHeading}</span>
          <span>{DATA.standingsMoreLabel}</span>
        </div>
        <ol>
          {DATA.standings.map((entry) => (
            <li key={entry.rank}>
              <b>{entry.rank}</b>
              <img src={TEAM_ASSETS[entry.team]} alt="" width={16} height={16} />
              <span>{entry.label}</span>
              <strong>{entry.rate}</strong>
            </li>
          ))}
        </ol>
      </article>

      <article className="landing-phone-card landing-phone-home-cheer-card">
        <div className="landing-phone-home-card-heading">
          <span>{DATA.cheerHeading}</span>
          <span>{DATA.cheerMoreLabel}</span>
        </div>
        <ul>
          {DATA.cheerPosts.map((post) => (
            <li key={post.title}>
              <img src={TEAM_ASSETS[post.team]} alt="" width={18} height={18} />
              <span>{post.title}</span>
              <em>
                <LandingMessageSquareIcon size={9} />
                {post.comments}
                <LandingHeartIcon size={9} />
                {post.likes}
              </em>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
