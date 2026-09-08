import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const authenticatedChromeSource = readFileSync(
  new URL('./AuthenticatedLayoutChrome.tsx', import.meta.url),
  'utf8',
);
const navbarSource = readFileSync(new URL('./Navbar.tsx', import.meta.url), 'utf8');
const publicNavbarSource = readFileSync(new URL('./PublicNavbar.tsx', import.meta.url), 'utf8');
const cheerBookmarksSource = readFileSync(new URL('./CheerBookmarks.tsx', import.meta.url), 'utf8');
const cheerRuntimeSource = readFileSync(new URL('./CheerRuntime.tsx', import.meta.url), 'utf8');
const cheerBottomNavSource = readFileSync(
  new URL('./CheerMobileBottomNav.tsx', import.meta.url),
  'utf8',
);
const badgeShowcaseSource = readFileSync(
  new URL('./mypage/BadgeShowcase.tsx', import.meta.url),
  'utf8',
);
const myPageSeasonStyles = readFileSync(
  new URL('./mypage/MyPageSeason.css', import.meta.url),
  'utf8',
);
const retroLeaderboardSource = readFileSync(
  new URL('./retro/RetroLeaderboard.tsx', import.meta.url),
  'utf8',
);
const retroLeaderboardFooterPanelsSource = readFileSync(
  new URL('./retro/RetroLeaderboardFooterPanels.tsx', import.meta.url),
  'utf8',
);
const newsTickerSource = readFileSync(
  new URL('./retro/NewsTicker.tsx', import.meta.url),
  'utf8',
);
const powerUpInventorySource = readFileSync(
  new URL('./retro/PowerUpInventory.tsx', import.meta.url),
  'utf8',
);
const userStatsPanelSource = readFileSync(
  new URL('./retro/UserStatsPanel.tsx', import.meta.url),
  'utf8',
);
const reviewDialogSource = readFileSync(new URL('./ReviewDialog.tsx', import.meta.url), 'utf8');
const rollingNumberSource = readFileSync(new URL('./RollingNumber.tsx', import.meta.url), 'utf8');
const retroLeaderboardRulesOverlaySource = readFileSync(
  new URL('./retro/RetroLeaderboardRulesOverlay.tsx', import.meta.url),
  'utf8',
);
const leaderboardRowSource = readFileSync(
  new URL('./retro/LeaderboardRow.tsx', import.meta.url),
  'utf8',
);
const comboAnimationSource = readFileSync(
  new URL('./retro/ComboAnimation.tsx', import.meta.url),
  'utf8',
);
const retroThemeSource = readFileSync(
  new URL('./retro/RetroTheme.tsx', import.meta.url),
  'utf8',
);
const pixelProgressBarSource = readFileSync(
  new URL('./retro/PixelProgressBar.tsx', import.meta.url),
  'utf8',
);

test('mobile bottom navigation owns the chatbot entry point while the floating launcher stays desktop-only', () => {
  assert.match(authenticatedChromeSource, /CHATBOT_OPEN_REQUEST_EVENT/);
  assert.match(authenticatedChromeSource, /consumePendingChatbotOpenRequest/);
  assert.match(authenticatedChromeSource, /max-md:hidden/);

  assert.match(navbarSource, /grid-cols-5/);
  assert.match(navbarSource, /data-testid="auth-mobile-chatbot-tab"/);
  assert.match(navbarSource, /requestChatbotOpen/);

  assert.match(publicNavbarSource, /shouldShowMobileChatbotTab/);
  assert.ok(publicNavbarSource.includes("/^\\/home\\/?$/.test(location.pathname)"));
  assert.match(publicNavbarSource, /data-testid="public-mobile-chatbot-tab"/);
  assert.match(publicNavbarSource, /requestChatbotOpen/);

  assert.match(cheerBookmarksSource, /onChatBotClick=\{\(\) => requestChatbotOpen\(\)\}/);
  assert.match(cheerBottomNavSource, /onChatBotClick\s*\?/);
  assert.match(cheerBottomNavSource, /data-testid="cheer-bottom-nav-chatbot"/);
  assert.match(cheerBottomNavSource, /onChatBotClick \? 'grid-cols-6' : 'grid-cols-5'/);
});

test('mobile badge cards remain compact and readable', () => {
  assert.match(badgeShowcaseSource, /className="h-6 w-6 md:h-7 md:w-7"/);

  const mobileStylesStart = myPageSeasonStyles.indexOf('@media (max-width: 600px)');
  const mobileStylesEnd = myPageSeasonStyles.indexOf('@media (max-width: 360px)');
  assert.notEqual(mobileStylesStart, -1);
  assert.notEqual(mobileStylesEnd, -1);

  const mobileStyles = myPageSeasonStyles.slice(mobileStylesStart, mobileStylesEnd);
  assert.match(mobileStyles, /\.mypage-season-badge-orb\s*{[^}]*width:\s*44px;[^}]*height:\s*44px;/s);
  assert.match(mobileStyles, /\.mypage-season-badge-desc\s*{[^}]*-webkit-line-clamp:\s*2;/s);

  const tabletCompactStylesStart = myPageSeasonStyles.indexOf('@media (min-width: 601px) and (max-width: 767px)');
  assert.notEqual(tabletCompactStylesStart, -1);
  const tabletCompactStyles = myPageSeasonStyles.slice(tabletCompactStylesStart);
  assert.match(tabletCompactStyles, /\.mypage-season-badge-orb\s*{[^}]*width:\s*44px;[^}]*height:\s*44px;/s);
  assert.match(tabletCompactStyles, /\.mypage-season-badge-desc\s*{[^}]*-webkit-line-clamp:\s*2;/s);
});

test('cheer mobile navigation reserves the strong accent for the write action', () => {
  assert.doesNotMatch(cheerBottomNavSource, /shadow-mobile-tab-active/);
  assert.match(cheerBottomNavSource, /color:\s*activeTextAccent/);
  assert.match(cheerRuntimeSource, /activeTextAccent=\{tabActiveAccentText\}/);
  assert.match(cheerBookmarksSource, /getDarkModeAccentText/);
  assert.match(cheerRuntimeSource, /getLightModeAccentText/);
  assert.match(cheerBookmarksSource, /getLightModeAccentText/);
  assert.match(cheerBottomNavSource, /bg-black\/\[0\.045\]/);
});

test('retro leaderboard lets mobile CSS own title, stat grid, and footer width', () => {
  assert.match(
    retroLeaderboardSource,
    /\.retro-leaderboard-title\s*{[^}]*font-size:\s*52px;/s,
  );
  assert.match(
    retroLeaderboardSource,
    /\.retro-leaderboard-stat-grid\s*{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);/s,
  );
  assert.doesNotMatch(retroLeaderboardSource, /fontSize:\s*'52px'/);
  assert.doesNotMatch(
    retroLeaderboardSource,
    /className="retro-leaderboard-stat-grid"[^>]*gridTemplateColumns/s,
  );
  assert.match(retroLeaderboardSource, /<ViewportDeferred\s+className="w-full"/);

  const tabletStylesStart = retroLeaderboardSource.indexOf('@media (max-width: 768px)');
  const phoneStylesStart = retroLeaderboardSource.indexOf('@media (max-width: 640px)');
  assert.notEqual(tabletStylesStart, -1);
  assert.notEqual(phoneStylesStart, -1);
  const tabletStyles = retroLeaderboardSource.slice(tabletStylesStart, phoneStylesStart);
  assert.match(
    tabletStyles,
    /\.retro-leaderboard-title-wrapper\s*{[^}]*width:\s*100%;[^}]*padding:\s*0 16px;[^}]*box-sizing:\s*border-box;/s,
  );
  assert.match(
    tabletStyles,
    /\.retro-leaderboard-title\s*{[^}]*max-width:\s*100%;[^}]*font-size:\s*clamp\(32px, 5vw, 36px\);[^}]*line-height:\s*1\.25;[^}]*word-break:\s*keep-all;/s,
  );
});

test('retro leaderboard hot-streak cards contain unbroken names on mobile', () => {
  assert.match(retroLeaderboardFooterPanelsSource, /data-testid=\{containerTestId\}/);
  assert.match(retroLeaderboardFooterPanelsSource, /boxSizing:\s*'border-box'/);
  assert.match(
    retroLeaderboardFooterPanelsSource,
    /className="retro-leaderboard-hot-streak-card"[\s\S]*?maxWidth:\s*'100%'[\s\S]*?minWidth:\s*0/,
  );
  assert.match(
    retroLeaderboardFooterPanelsSource,
    /className="retro-leaderboard-hot-streak-name"[\s\S]*?WebkitLineClamp:\s*2[\s\S]*?minWidth:\s*0[\s\S]*?overflow:\s*'hidden'[\s\S]*?overflowWrap:\s*'anywhere'/,
  );
  assert.match(
    retroLeaderboardFooterPanelsSource,
    /className="retro-leaderboard-hot-streak-count"[\s\S]*?flex:\s*'0 1 auto'[\s\S]*?minWidth:\s*0[\s\S]*?maxWidth:\s*'45%'[\s\S]*?overflow:\s*'hidden'[\s\S]*?textOverflow:\s*'ellipsis'/,
  );
});

test('retro news ticker exposes a bounded capture surface and a pointer pause target', () => {
  assert.match(newsTickerSource, /containerTestId\?:\s*string/);
  assert.match(newsTickerSource, /className="retro-news-ticker"/);
  assert.match(newsTickerSource, /data-testid=\{containerTestId\}/);
  assert.match(newsTickerSource, /boxSizing:\s*'border-box'/);
  assert.match(newsTickerSource, /minWidth:\s*0/);
  assert.match(newsTickerSource, /data-testid="retro-news-ticker-track"/);
  assert.match(newsTickerSource, /\.retro-news-ticker:hover\s+\.retro-news-ticker-track/);
});

test('retro power-up cards contain maximum supported inventory counts on mobile', () => {
  assert.match(powerUpInventorySource, /containerTestId\?:\s*string/);
  assert.match(powerUpInventorySource, /data-testid=\{containerTestId\}/);
  assert.match(powerUpInventorySource, /data-testid=\{`retro-powerup-card-\$\{powerup\.type\.toLowerCase\(\)\}`\}/);
  assert.match(powerUpInventorySource, /data-testid="retro-powerup-modal-content"/);
  assert.match(powerUpInventorySource, /data-testid="retro-powerup-modal-use"/);
  assert.match(powerUpInventorySource, /data-testid="retro-powerup-modal-error"/);
  assert.match(powerUpInventorySource, /role="alert"/);
  assert.match(powerUpInventorySource, /setUseError\('아이템을 사용하지 못했습니다\. 잠시 후 다시 시도해 주세요\.'\)/);
  assert.match(
    powerUpInventorySource,
    /\.retro-powerup-card\.is-clickable:focus-visible\s*{[^}]*outline:\s*3px solid #00ffff;[^}]*outline-offset:\s*3px;/s,
  );
  assert.match(
    powerUpInventorySource,
    /\.retro-powerup-card\s*{[^}]*box-sizing:\s*border-box;[^}]*min-width:\s*0;[^}]*width:\s*100%;/s,
  );
  assert.match(
    powerUpInventorySource,
    /className="retro-powerup-count"[\s\S]*?boxSizing:\s*'border-box'[\s\S]*?maxWidth:\s*'100%'[\s\S]*?overflow:\s*'hidden'[\s\S]*?textOverflow:\s*'ellipsis'[\s\S]*?whiteSpace:\s*'nowrap'/,
  );
  assert.match(powerUpInventorySource, /fontSize:\s*'clamp\(8px, 3vw, 14px\)'/);
});

test('retro user stats panel contains identity and numeric pressure on mobile', () => {
  assert.match(userStatsPanelSource, /containerTestId\?:\s*string/);
  assert.match(userStatsPanelSource, /data-testid=\{containerTestId\}/);
  assert.match(userStatsPanelSource, /className="retro-user-stats-identity"/);
  assert.match(userStatsPanelSource, /className="retro-user-stats-name"/);
  assert.match(userStatsPanelSource, /className="retro-user-stats-rank-number"/);
  assert.match(userStatsPanelSource, /className="retro-user-stats-card"/);
  assert.match(userStatsPanelSource, /className="retro-user-stats-value"/);
  assert.match(userStatsPanelSource, /className="retro-user-stats-suffix"/);
  assert.match(userStatsPanelSource, /className="retro-user-stats-exp-value"/);
  assert.match(userStatsPanelSource, /formatCompactNumber\(stats\.currentStreak\)/);
  assert.match(userStatsPanelSource, /#\{formatCompactNumber\(stats\.rank\)\}/);
  assert.match(
    userStatsPanelSource,
    /<PixelProgressBar[\s\S]*?label=\{`\$\{formatCompactNumber\(xpProgress\)\}\/\$\{formatCompactNumber\(xpNeeded\)\}`\}/,
  );
  assert.match(
    userStatsPanelSource,
    /\.retro-user-stats-identity\s*\{[^}]*min-width:\s*0;/s,
  );
  assert.match(
    userStatsPanelSource,
    /\.retro-user-stats-name\s*\{[^}]*max-width:\s*100%;[^}]*overflow-wrap:\s*anywhere;[^}]*-webkit-line-clamp:\s*3;[^}]*overflow:\s*hidden;/s,
  );
  assert.match(
    userStatsPanelSource,
    /className="retro-user-stats-identity"[\s\S]*?alignItems:\s*'flex-start'/,
  );
  assert.match(
    userStatsPanelSource,
    /\.retro-user-stats-rank-number\s*\{[^}]*max-width:\s*100%;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;/s,
  );
  assert.match(
    userStatsPanelSource,
    /\.retro-user-stats-card\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;/s,
  );
  assert.match(
    userStatsPanelSource,
    /\.retro-user-stats-value\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*font-size:\s*clamp\(12px, 4vw, 20px\);[^}]*overflow-wrap:\s*anywhere;/s,
  );
  assert.doesNotMatch(
    userStatsPanelSource,
    /\.retro-user-stats-value\s*\{[^}]*text-overflow:\s*ellipsis;/s,
  );
  assert.match(
    userStatsPanelSource,
    /\.retro-user-stats-suffix\s*\{[^}]*font-size:\s*clamp\(8px, 3vw, 11px\);[^}]*white-space:\s*nowrap;/s,
  );
  assert.match(
    userStatsPanelSource,
    /\.retro-user-stats-exp-value\s*\{[^}]*max-width:\s*100%;[^}]*overflow-wrap:\s*anywhere;/s,
  );
  assert.match(
    userStatsPanelSource,
    /\.retro-user-stats-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);/s,
  );
  assert.match(
    userStatsPanelSource,
    /@media \(max-width:\s*768px\)[\s\S]*?\.retro-user-stats-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s,
  );
});

test('retro leaderboard rules overlay stays scrollable and touch-safe on mobile', () => {
  assert.match(retroLeaderboardRulesOverlaySource, /data-testid="retro-leaderboard-rules-overlay"/);
  assert.match(retroLeaderboardRulesOverlaySource, /overflowY:\s*'auto'/);
  assert.match(retroLeaderboardRulesOverlaySource, /tableLayout:\s*'fixed'/);
  assert.match(retroLeaderboardRulesOverlaySource, /overflowWrap:\s*'anywhere'/);
  assert.match(
    retroLeaderboardRulesOverlaySource,
    /\.retro-leaderboard-rules-close\s*{[^}]*min-height:\s*44px;/s,
  );
  assert.match(retroLeaderboardRulesOverlaySource, /data-testid="retro-leaderboard-rules-close"/);
  assert.match(retroLeaderboardRulesOverlaySource, /\.retro-leaderboard-rules-close:focus-visible/);
});

test('retro progress labels and borders remain contained at the smallest size', () => {
  assert.match(pixelProgressBarSource, /data-testid=\{containerTestId\}/);
  assert.match(pixelProgressBarSource, /boxSizing:\s*'border-box'/);
  assert.match(
    pixelProgressBarSource,
    /className="retro-pixel-progress-label"[\s\S]*?boxSizing:\s*'border-box'[\s\S]*?overflow:\s*'hidden'[\s\S]*?textOverflow:\s*'ellipsis'[\s\S]*?whiteSpace:\s*'nowrap'/,
  );
});

test('retro leaderboard rows contain maximum-width rank and score content on mobile', () => {
  assert.match(leaderboardRowSource, /data-testid=\{containerTestId\}/);
  assert.match(
    leaderboardRowSource,
    /\.retro-leaderboard-row\s*{[^}]*box-sizing:\s*border-box;[^}]*min-width:\s*0;[^}]*width:\s*100%;/s,
  );
  assert.match(
    leaderboardRowSource,
    /\.retro-leaderboard-score-cell\s*{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/s,
  );
});

test('retro combo animation is deterministic and contains maximum numeric copy on mobile', () => {
  assert.match(comboAnimationSource, /particleRandom\?:\s*\(\)\s*=>\s*number/);
  assert.match(comboAnimationSource, /autoHideMs\?:\s*number\s*\|\s*null/);
  assert.match(comboAnimationSource, /data-testid=\{containerTestId\}/);
  assert.match(comboAnimationSource, /fontSize:\s*`min\(/);
  assert.match(comboAnimationSource, /maxWidth:\s*'calc\(100vw - 32px\)'/);
  assert.match(comboAnimationSource, /textOverflow:\s*'ellipsis'/);
});

test('retro rank badges contain long rank copy inside the mobile surface', () => {
  const rankBadgeStart = retroThemeSource.indexOf('export function RankBadge');
  const rankBadgeEnd = retroThemeSource.indexOf('export function ScoreDisplay');
  assert.notEqual(rankBadgeStart, -1);
  assert.ok(rankBadgeEnd > rankBadgeStart);
  const rankBadgeSource = retroThemeSource.slice(rankBadgeStart, rankBadgeEnd);
  assert.match(rankBadgeSource, /boxSizing:\s*'border-box'/);
  assert.match(rankBadgeSource, /maxWidth:\s*'100%'/);
  assert.match(rankBadgeSource, /overflow:\s*'hidden'/);
  assert.match(rankBadgeSource, /textOverflow:\s*'ellipsis'/);
  assert.match(rankBadgeSource, /whiteSpace:\s*'nowrap'/);
  assert.match(
    rankBadgeSource,
    /<span[\s\S]*?minWidth:\s*0[\s\S]*?overflow:\s*'hidden'[\s\S]*?textOverflow:\s*'ellipsis'/,
  );
});

test('retro numeric and streak primitives contain stress copy on mobile', () => {
  const pixelNumberStart = retroThemeSource.indexOf('export function PixelNumber');
  const pixelNumberEnd = retroThemeSource.indexOf('export function RetroButton');
  const scoreDisplayStart = retroThemeSource.indexOf('export function ScoreDisplay');
  const scoreDisplayEnd = retroThemeSource.indexOf('export function StreakCounter');
  const streakCounterStart = scoreDisplayEnd;
  const streakCounterEnd = retroThemeSource.indexOf('export function RetroDivider');
  assert.ok(pixelNumberStart >= 0 && pixelNumberEnd > pixelNumberStart);
  assert.ok(scoreDisplayStart >= 0 && scoreDisplayEnd > scoreDisplayStart);
  assert.ok(streakCounterStart >= 0 && streakCounterEnd > streakCounterStart);

  for (const source of [
    retroThemeSource.slice(pixelNumberStart, pixelNumberEnd),
    retroThemeSource.slice(scoreDisplayStart, scoreDisplayEnd),
    retroThemeSource.slice(streakCounterStart, streakCounterEnd),
  ]) {
    assert.match(source, /boxSizing:\s*'border-box'/);
    assert.match(source, /maxWidth:\s*'100%'/);
    assert.match(source, /overflow:\s*'hidden'/);
    assert.match(source, /textOverflow:\s*'ellipsis'/);
    assert.match(source, /whiteSpace:\s*'nowrap'/);
  }

  const pixelNumberSource = retroThemeSource.slice(pixelNumberStart, pixelNumberEnd);
  assert.match(pixelNumberSource, /const numericContentLength/);
  assert.match(pixelNumberSource, /fontSize:\s*numericContentLength/);
  assert.match(pixelNumberSource, /clamp\(12px, calc\(\(100vw - 80px\) \/ \$\{numericContentLength\}\), 24px\)/);

  const streakCounterSource = retroThemeSource.slice(streakCounterStart, streakCounterEnd);
  assert.match(
    streakCounterSource,
    /<span[\s\S]*?minWidth:\s*0[\s\S]*?textOverflow:\s*'ellipsis'/,
  );
});

test('retro text effects contain stress copy and expose deterministic animation capture', () => {
  const flickerStart = retroThemeSource.indexOf('export function FlickerText');
  const flickerEnd = retroThemeSource.indexOf('export function PixelNumber');
  const glitchStart = retroThemeSource.indexOf('export function GlitchWrapper');
  const glitchEnd = retroThemeSource.indexOf('export function DotMatrixText');
  const dotMatrixStart = glitchEnd;
  const dotMatrixEnd = retroThemeSource.indexOf('export function AnimatedCrown');
  assert.ok(flickerStart >= 0 && flickerEnd > flickerStart);
  assert.ok(glitchStart >= 0 && glitchEnd > glitchStart);
  assert.ok(dotMatrixStart >= 0 && dotMatrixEnd > dotMatrixStart);

  const flickerSource = retroThemeSource.slice(flickerStart, flickerEnd);
  assert.match(flickerSource, /boxSizing:\s*'border-box'/);
  assert.match(flickerSource, /maxWidth:\s*'100%'/);
  assert.match(flickerSource, /overflow:\s*'hidden'/);
  assert.match(flickerSource, /textOverflow:\s*'ellipsis'/);
  assert.match(flickerSource, /whiteSpace:\s*'nowrap'/);

  const glitchSource = retroThemeSource.slice(glitchStart, glitchEnd);
  assert.match(glitchSource, /boxSizing:\s*'border-box'/);
  assert.match(glitchSource, /maxWidth:\s*'calc\(100% - 4px\)'/);
  assert.match(glitchSource, /marginInline:\s*'2px'/);
  assert.match(glitchSource, /overflowWrap:\s*'anywhere'/);

  const dotMatrixSource = retroThemeSource.slice(dotMatrixStart, dotMatrixEnd);
  assert.match(dotMatrixSource, /boxSizing:\s*'border-box'/);
  assert.match(dotMatrixSource, /maxWidth:\s*'100%'/);
  assert.match(dotMatrixSource, /overflowWrap:\s*'anywhere'/);
  assert.match(dotMatrixSource, /animationPlayState:\s*style\?\.animationPlayState/);
});

test('RollingNumber scales with text, preserves transition width, and respects reduced motion', () => {
  assert.match(rollingNumberSource, /transitionPreview\?:/);
  assert.match(rollingNumberSource, /data-testid="rolling-number"/);
  assert.match(rollingNumberSource, /data-testid="rolling-number-width-sizer"/);
  assert.match(rollingNumberSource, /data-testid="rolling-number-previous"/);
  assert.match(rollingNumberSource, /min-h-\[1\.5em\]/);
  assert.match(rollingNumberSource, /min-w-\[1\.125em\]/);
  assert.match(rollingNumberSource, /max-w-full/);
  assert.match(rollingNumberSource, /break-all/);
  assert.match(rollingNumberSource, /tabular-nums/);
  assert.match(rollingNumberSource, /motion-reduce:hidden/);
  assert.match(rollingNumberSource, /motion-reduce:animate-none/);
  assert.match(rollingNumberSource, /aria-hidden="true"/);
});

test('remaining retro theme primitives contain mobile content and expose real button states', () => {
  const containerStart = retroThemeSource.indexOf('export function RetroContainer');
  const containerEnd = retroThemeSource.indexOf('export function FlickerText');
  const buttonStart = retroThemeSource.indexOf('export function RetroButton');
  const buttonEnd = retroThemeSource.indexOf('export function RetroCard');
  const cardStart = buttonEnd;
  const cardEnd = retroThemeSource.indexOf('export function RankBadge');
  const dividerStart = retroThemeSource.indexOf('export function RetroDivider');
  const dividerEnd = retroThemeSource.indexOf('export function PixelCrown');
  const pixelCrownStart = dividerEnd;
  const pixelCrownEnd = retroThemeSource.indexOf('export const ChampionRowStyle');
  const animatedCrownStart = retroThemeSource.indexOf('export function AnimatedCrown');
  const animatedCrownEnd = retroThemeSource.indexOf('export function BaseballIcon');
  const emptyStateStart = retroThemeSource.indexOf('export function PixelEmptyState');
  const emptyStateEnd = retroThemeSource.indexOf('export const energyBarStyle');
  assert.ok(containerStart >= 0 && containerEnd > containerStart);
  assert.ok(buttonStart >= 0 && buttonEnd > buttonStart);
  assert.ok(cardStart >= 0 && cardEnd > cardStart);
  assert.ok(dividerStart >= 0 && dividerEnd > dividerStart);
  assert.ok(pixelCrownStart >= 0 && pixelCrownEnd > pixelCrownStart);
  assert.ok(animatedCrownStart >= 0 && animatedCrownEnd > animatedCrownStart);
  assert.ok(emptyStateStart >= 0 && emptyStateEnd > emptyStateStart);

  const containerSource = retroThemeSource.slice(containerStart, containerEnd);
  assert.match(containerSource, /boxSizing:\s*'border-box'/);
  assert.match(containerSource, /maxWidth:\s*'100%'/);
  assert.match(containerSource, /overflowWrap:\s*'anywhere'/);

  const buttonSource = retroThemeSource.slice(buttonStart, buttonEnd);
  assert.match(buttonSource, /useRetroThemeStyles\(\)/);
  assert.match(buttonSource, /minHeight:\s*'44px'/);
  assert.match(buttonSource, /maxWidth:\s*'100%'/);
  assert.match(buttonSource, /textOverflow:\s*'ellipsis'/);
  assert.match(buttonSource, /className=\{\['retro-theme-button'/);
  assert.match(
    buttonSource,
    /<span[\s\S]*?minWidth:\s*0[\s\S]*?textOverflow:\s*'ellipsis'[\s\S]*?\{children\}/,
  );
  assert.match(retroThemeSource, /\.retro-theme-button:hover:not\(:disabled\)/);
  assert.match(retroThemeSource, /\.retro-theme-button:focus-visible/);
  assert.match(retroThemeSource, /\.retro-theme-button:active:not\(:disabled\)/);

  const cardSource = retroThemeSource.slice(cardStart, cardEnd);
  assert.match(cardSource, /boxSizing:\s*'border-box'/);
  assert.match(cardSource, /maxWidth:\s*'100%'/);
  assert.match(cardSource, /overflowWrap:\s*'anywhere'/);

  const dividerSource = retroThemeSource.slice(dividerStart, dividerEnd);
  assert.match(dividerSource, /width:\s*'100%'/);
  assert.match(dividerSource, /maxWidth:\s*'100%'/);

  for (const crownSource of [
    retroThemeSource.slice(pixelCrownStart, pixelCrownEnd),
    retroThemeSource.slice(animatedCrownStart, animatedCrownEnd),
  ]) {
    assert.match(crownSource, /boxSizing:\s*'border-box'/);
    assert.match(crownSource, /textOverflow:\s*'ellipsis'/);
  }
  assert.match(
    retroThemeSource.slice(pixelCrownStart, pixelCrownEnd),
    /maxWidth:\s*'100%'/,
  );
  assert.match(
    retroThemeSource.slice(animatedCrownStart, animatedCrownEnd),
    /maxWidth:\s*'calc\(100% - 4px\)'/,
  );

  const emptyStateSource = retroThemeSource.slice(emptyStateStart, emptyStateEnd);
  assert.match(emptyStateSource, /boxSizing:\s*'border-box'/);
  assert.match(emptyStateSource, /maxWidth:\s*'100%'/);
  assert.match(emptyStateSource, /overflowWrap:\s*'anywhere'/);
  assert.match(emptyStateSource, /padding:\s*'clamp\(24px, 12vw, 60px\) clamp\(12px, 6vw, 20px\)'/);
});

test('review dialog contains long copy, touch targets, focus, and viewport-height pressure', () => {
  assert.match(reviewDialogSource, /submitReview\s*=\s*createReview/);
  assert.match(reviewDialogSource, /data-testid="review-dialog"/);
  assert.match(reviewDialogSource, /max-h-\[calc\(100dvh-2rem\)\]/);
  assert.match(reviewDialogSource, /overflow-y-auto/);
  assert.match(reviewDialogSource, /line-clamp-3/);
  assert.match(reviewDialogSource, /\[overflow-wrap:anywhere\]/);
  assert.match(reviewDialogSource, /data-testid=\{`review-rating-\$\{num\}`\}/);
  assert.match(reviewDialogSource, /h-11 w-11/);
  assert.match(reviewDialogSource, /data-testid="review-comment"/);
  assert.match(reviewDialogSource, /data-testid="review-cancel"/);
  assert.match(reviewDialogSource, /data-testid="review-submit"/);
  assert.ok((reviewDialogSource.match(/min-h-11/g) ?? []).length >= 2);
  assert.match(reviewDialogSource, /focus-visible:ring-2/);
  assert.match(reviewDialogSource, /aria-busy=\{isSubmitting\}/);
});
