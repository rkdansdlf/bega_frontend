import { LandingEditIcon, LandingHeartIcon, LandingMessageSquareIcon, LandingRefreshIcon } from '../../icons/LandingIcons';
import { TEAM_ASSETS } from '../landingAssets';
import { LANDING_PHONE_BOARD_SCREEN } from '../landingShowcaseData';

const DATA = LANDING_PHONE_BOARD_SCREEN;

export default function LandingPhoneBoardScreen() {
  return (
    <div className="landing-phone-board-screen">
      <header className="landing-phone-board-header">
        <p>{DATA.heading}</p>
        <div>
          <span>
            <LandingRefreshIcon size={10} />
            {DATA.refreshLabel}
          </span>
          <span className="landing-phone-board-write">
            <LandingEditIcon size={10} />
            {DATA.writeLabel}
          </span>
        </div>
      </header>

      <div className="landing-phone-board-filters">
        {DATA.filterTabs.map((tab, index) => (
          <span
            className={index === DATA.activeFilterIndex ? 'landing-phone-board-filter-active' : undefined}
            key={tab}
          >
            {tab}
          </span>
        ))}
      </div>

      <ul className="landing-phone-board-list">
        {DATA.posts.map((post) => (
          <li key={post.title}>
            <img src={TEAM_ASSETS[post.team]} alt="" width={24} height={24} />
            <div>
              <p>
                {post.hot ? <b>HOT</b> : null}
                <span>{post.title}</span>
              </p>
              <p>
                {post.author} · {post.time}
              </p>
            </div>
            <em>
              <span>
                <LandingMessageSquareIcon size={10} />
                {post.comments}
              </span>
              <span>
                <LandingHeartIcon size={10} />
                {post.likes}
              </span>
            </em>
          </li>
        ))}
      </ul>
    </div>
  );
}
