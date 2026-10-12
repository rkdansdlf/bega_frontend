import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('prediction mobile action row permits the secondary action to reflow at enlarged text', () => {
  const source = readSource('./prediction/PredictionRuntime.tsx');

  assert.match(source, /flex flex-wrap items-center gap-2/);
  assert.match(source, /sm:flex-nowrap/);
  assert.match(source, /hidden flex-1 sm:block/);
});

test('mate mobile heading and actions use a wrapping layout at narrow enlarged text', () => {
  const source = readSource('./MateListControlsRuntime.tsx');

  assert.match(source, /flex flex-wrap items-start justify-between/);
  assert.match(source, /w-full sm:w-auto/);
  assert.match(source, /className="flex w-full items-center justify-end gap-2 sm:w-auto/);
  assert.match(source, /className="min-h-11 h-\[46px\] rounded-14/);
});

test('mobile menu gives primary links horizontal room at narrow viewports', () => {
  const source = readSource('./NavigationMenu.css');

  assert.match(source, /\.mobile-menu-popup \[data-mobile-menu-section\] \{/);
  assert.match(source, /padding-inline:\s*16px\s*!important/);
});

test('public mobile action rows keep the shared 44px touch geometry', () => {
  const home = readSource('./home/HomeScheduledMatchPanel.tsx');
  const cheer = readSource('./CheerDetailActionBarRuntime.tsx');
  const detail = readSource('./prediction/PredictionMatchDetailPanel.tsx');
  const vote = readSource('./prediction/PredictionVotePanel.tsx');

  assert.match(home, /data-testid="home-scheduled-secondary-toggle"[\s\S]*min-h-11/);
  assert.ok((cheer.match(/flex min-h-11/g) ?? []).length >= 4);
  assert.ok((detail.match(/min-h-11/g) ?? []).length >= 2);
  assert.match(vote, /data-testid="prediction-vote-cancel-btn"[\s\S]*min-h-11/);
});

test('secondary detail and search actions remain reachable on mobile', () => {
  const preview = readSource('./prediction/PredictionMatchPreviewTab.tsx');
  const cheer = readSource('./CheerRuntime.tsx');
  const profile = readSource('./profile/UserProfileModal.tsx');
  const profileEdit = readSource('./mypage/ProfileEditProfileRuntime.tsx');
  const coach = readSource('./CoachAnalysisDialogLauncher.tsx');
  const profileCard = readSource('./mypage/MyPageProfileCardRuntime.tsx');
  const mateDetail = readSource('./MateDetailContentRuntime.tsx');
  const mateManage = readSource('./MateManageEditPanel.tsx');
  const mateTeamFilter = readSource('./MateTeamFilterButton.tsx');
  const publicNavbar = readSource('./PublicNavbar.tsx');
  const navbar = readSource('./Navbar.tsx');

  assert.match(preview, /data-testid="prediction-match-enter-detail-btn"[\s\S]*h-11 min-h-11 min-w-11/);
  assert.match(cheer, /aria-label="검색어 지우기"[\s\S]*h-11 w-11/);
  assert.match(cheer, /min-h-11 min-w-0 flex-1 truncate/);
  assert.match(cheer, /최근 검색 삭제[\s\S]*h-11 w-11 min-h-11 min-w-11/);
  assert.match(profile, /h-11 w-11 min-h-11 min-w-11/);
  assert.match(profileEdit, /mypage-profile-team-test-button flex min-h-11/);
  assert.match(coach, /md:w-auto min-h-11/);
  assert.match(profileCard, /min-h-11 min-w-0 shrink-0/);
  assert.match(mateDetail, /w-full min-h-11 border-red-200/);
  assert.match(mateManage, /min-h-11 w-full rounded-md/);
  assert.match(mateTeamFilter, /min-h-11 w-full justify-start/);
  assert.match(publicNavbar, /navIconButtonClass = 'relative inline-flex h-11 w-11/);
  assert.match(navbar, /navIconButtonClass = 'relative inline-flex h-11 w-11/);
});

test('stadium search inputs and admin cleanup status keep the mobile 44px target', () => {
  const daejeon = readSource('./daejeon/DaejeonSeatMap.tsx');
  const changwon = readSource('./changwon/ChangwonSeatMap.tsx');
  const daegu = readSource('./daegu/DaeguSeatMap.tsx');
  const sajik = readSource('./sajik/SajikSeatMapEditor.tsx');
  const admin = readSource('./admin/AdminGameStatusRepairPanel.tsx');

  for (const [source, testId] of [
    [daejeon, 'daejeon-block-search'],
    [changwon, 'changwon-block-search'],
    [daegu, 'daegu-block-search'],
    [sajik, 'sajik-editor-section-search'],
  ] as const) {
    assert.match(source, new RegExp('data-testid="' + testId + '"[\\s\\S]*className="h-11[^"]*sm:h-10'));
  }
  assert.match(admin, /data-testid="admin-game-status-ticket-status"[\s\S]*className="flex h-11[^"]*sm:h-10/);
});

test('secondary stadium tools and shared dialogs keep mobile controls reachable', () => {
  const incheon = readSource('./incheon/IncheonSeatMap.tsx');
  const suwon = readSource('./suwon/SuwonSeatMap.tsx');
  const gocheok = readSource('./gocheok/GocheokFacilityGuide.tsx');
  const jamsil = readSource('./jamsil/JamsilSeatMapSvg.tsx');
  const shell = readSource('./stadiumSeatMap/SeatMapTemplateShell.tsx');
  const detail = readSource('./stadiumSeatMap/SeatMapDetailPanel.tsx');
  const gameCard = readSource('./ScheduledGameCard.tsx');
  const gallery = readSource('./SeatViewGallery.tsx');
  const coach = readSource('./CoachAnalysisDialogRuntime.tsx');
  const verification = readSource('./VerificationRequiredDialog.tsx');
  const comments = readSource('./cheer/CommentItem.tsx');
  const commentsPanel = readSource('./CheerDetailCommentsPanel.tsx');
  const profileEdit = readSource('./mypage/ProfileEditProfileRuntime.tsx');
  const recentSearches = readSource('./MateRecentSearchesPanel.tsx');
  const gwangju = readSource('./gwangju/GwangjuSeatMap.tsx');

  assert.match(incheon, /data-testid="incheon-guide-search"[\s\S]*className="h-11[^\"]*sm:h-9/);
  assert.match(incheon, /incheon-mobile-tool-tab-[^\n]*[\s\S]*className="h-11[^\"]*sm:h-9/);
  assert.match(incheon, /incheon-seatmap-zoom-in[\s\S]*className=\{buttonClass\}/);
  assert.match(incheon, /const buttonClass = 'flex h-11 w-11[^']*sm:h-8 sm:w-8'/);
  assert.match(suwon, /suwon-mobile-tool-tab-[^\n]*[\s\S]*className="h-11[^\"]*sm:h-9/);
  assert.ok((suwon.match(/min-h-11/g) ?? []).length >= 8);
  assert.ok((gocheok.match(/h-11 w-11/g) ?? []).length >= 3);
  assert.ok((jamsil.match(/h-11 w-11/g) ?? []).length >= 3);
  assert.match(shell, /fullscreenCloseTestId[\s\S]*className="shrink-0 flex h-11 w-11[^\"]*sm:h-8 sm:w-8/);
  assert.match(detail, /aria-label="닫기"[\s\S]*className="absolute right-5 top-5 z-10 flex h-11 w-11[^\"]*sm:h-8 sm:w-8/);
  assert.match(gameCard, /className="w-full h-11[^\"]*sm:h-9"[\s\S]*승부예측 하러가기/);
  assert.match(gallery, /다이어리에서 공유하기/);
  assert.match(gallery, /text-body min-h-11 sm:min-h-9/);
  assert.match(coach, /onClick=\{onRequestClose\}[\s\S]*className="h-11[^\"]*sm:h-9/);
  assert.ok((verification.match(/min-h-11/g) ?? []).length >= 2);
  assert.match(comments, /className="flex h-11 w-11[^\"]*sm:h-8 sm:w-8"[\s\S]*title="삭제"/);
  assert.match(commentsPanel, /aria-label="댓글 등록"[\s\S]*min-h-11/);
  assert.ok((profileEdit.match(/h-auto min-h-11/g) ?? []).length >= 2);
  assert.match(recentSearches, /전체삭제[\s\S]*min-h-11/);
  assert.match(recentSearches, /검색어 삭제[\s\S]*h-11 w-11/);
  assert.match(gwangju, /aria-label="닫기"[\s\S]*h-11 w-11[^\"]*sm:h-8 sm:w-8/);
});

test('secondary page actions keep the shared touch target across cheer, chatbot, prediction, and account surfaces', () => {
  const quote = readSource('./QuoteRepostEditor.tsx');
  const cheerCard = readSource('./CheerCard.tsx');
  const cheerSidebar = readSource('./CheerSidebarPanels.tsx');
  const cheerArticle = readSource('./CheerDetailArticleRuntime.tsx');
  const chatbotFavorites = readSource('./chatbot/ChatBotFavoritesTab.tsx');
  const chatbotHistory = readSource('./chatbot/ChatBotHistoryTab.tsx');
  const chatbotConversation = readSource('./chatbot/ChatBotConversationPanel.tsx');
  const chatbotRuntime = readSource('./ChatBotRuntime.tsx');
  const incheon = readSource('./incheon/IncheonSeatMap.tsx');
  const gocheok = readSource('./gocheok/GocheokSeatMap.tsx');
  const gocheokFacility = readSource('./gocheok/GocheokFacilityGuide.tsx');
  const predictionTab = readSource('./prediction/PredictionMatchTab.tsx');
  const predictionCard = readSource('./prediction/AdvancedMatchCard.tsx');
  const predictionEmpty = readSource('./prediction/PredictionMatchTabEmptyState.tsx');
  const accountSettings = readSource('./mypage/AccountSettingsAdvancedRuntime.tsx');
  const passwordChange = readSource('./mypage/PasswordChangeSection.tsx');

  assert.match(quote, /h-11 w-11[\s\S]*인용 리포스트/);
  assert.match(quote, /inline-flex h-auto min-h-11/);
  assert.ok((cheerCard.match(/flex min-h-11 w-full items-center/g) ?? []).length >= 2);
  assert.ok((cheerSidebar.match(/flex min-h-11 w-full items-center justify-center/g) ?? []).length >= 3);
  assert.ok((cheerArticle.match(/min-h-11 w-full items-center/g) ?? []).length >= 2);
  assert.ok((chatbotFavorites.match(/inline-flex min-h-11/g) ?? []).length >= 3);
  assert.match(chatbotHistory, /chatbot-history-new-session[\s\S]*inline-flex min-h-11/);
  assert.match(chatbotHistory, /chatbot-history-session-delete[\s\S]*h-11 w-11/);
  assert.match(chatbotConversation, /chatbot-send-button[\s\S]*min-h-11 min-w-11/);
  assert.match(chatbotRuntime, /chatbot-login-cta-footer[\s\S]*min-h-11/);
  assert.ok((incheon.match(/min-h-11 cursor-pointer rounded-lg border/g) ?? []).length >= 2);
  assert.ok((gocheok.match(/min-h-11/g) ?? []).length >= 4);
  assert.match(gocheokFacility, /gocheok-facility-tab-[^\n]*[\s\S]*inline-flex min-h-11/);
  assert.ok((predictionTab.match(/h-11 w-11 items-center justify-center/g) ?? []).length >= 2);
  assert.ok((predictionCard.match(/h-11 w-11/g) ?? []).length >= 2);
  assert.ok((predictionEmpty.match(/h-11 w-11/g) ?? []).length >= 2);
  assert.match(accountSettings, /absolute right-1 top-1\/2 flex h-11 w-11/);
  assert.ok((passwordChange.match(/absolute right-1 top-1\/2 flex h-11 w-11/g) ?? []).length >= 3);
});
