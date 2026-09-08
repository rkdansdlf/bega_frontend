import { STADIUM_ASSET } from './landingAssets';
import {
  LANDING_FEATURE_LABELS,
  LANDING_SECONDARY_FEATURE_COPY,
  LANDING_STADIUM_CHIPS,
  LANDING_STADIUM_DATA,
} from './landingShowcaseData';

export default function LandingStadiumSection() {
  const copy = LANDING_SECONDARY_FEATURE_COPY['05'];

  return (
    <section
      className="landing-stadium-section"
      data-testid="landing-feature-05"
      data-keep-theme="1"
      aria-labelledby="landing-feature-05-title"
    >
      <div className="landing-stadium-hero">
        <img
          className="landing-stadium-hero-image"
          data-parallax="0.06"
          data-parallax-limit="30"
          src={STADIUM_ASSET}
          alt={LANDING_STADIUM_DATA.imageAlt}
          width={1120}
          height={640}
        />
        <div className="landing-stadium-hero-overlay" aria-hidden="true" />
        <div className="landing-stadium-hero-content" data-reveal="0">
          <p className="landing-stadium-hero-label">
            05 · {LANDING_FEATURE_LABELS['05']}
          </p>
          <h2 id="landing-feature-05-title">{copy.title.replace('\n', ' ')}</h2>
          <p className="landing-stadium-hero-description">{copy.description}</p>
          <ul className="landing-stadium-chips" aria-label="KBO 구장 가이드 예시">
            {LANDING_STADIUM_CHIPS.map((stadium, index) => (
              <li key={stadium}>
                <span
                  className={index === 0 ? 'landing-stadium-chip-active' : undefined}
                  data-testid="landing-stadium-chip"
                >
                  {stadium}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="landing-stadium-stats-bar">
        <dl className="landing-stadium-stats">
          {LANDING_STADIUM_DATA.stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.value}</dt>
              <dd>{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
