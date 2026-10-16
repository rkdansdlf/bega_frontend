# 디자인 토큰 컨벤션 — 브랜드 그린

KBO Platform 프론트엔드의 브랜드 색상은 **[src/index.css](../src/index.css)의 `:root`가 단일 진실 공급원(SSOT)** 입니다. Tailwind(`tailwind.config.js`)는 이 토큰을 **참조만** 하며 색상 값을 직접 정의하지 않습니다.

> 원시 hex(`#1b4338` / `#2f6c5c` / `#63b39b`)를 컴포넌트에 다시 하드코딩하지 마세요. 아래 유틸리티/토큰을 사용합니다.

## 1. 토큰 ↔ 유틸리티 매핑

| 용도 | CSS 토큰 (index.css `:root`) | hex | Tailwind 유틸리티 | 모드 |
|---|---|---|---|---|
| Primary (기본) | `--primary` (= green-700, HSL) | #235346(light) / #40967f(dark) | `bg-primary`, `text-primary` | **모드 인식**(다크에서 자동 밝아짐) |
| Primary hover | `--brand-primary-hover` | #2f6c5c | `bg-primary-hover` | 모드 불변 |
| Primary dark(버튼 기본 배경) | `--brand-primary-rest` | #1b4338 | `bg-primary-dark` | 모드 불변 |
| Primary light(다크모드 텍스트) | `--brand-primary-light` | #63b39b | `text-primary-light` | 모드 불변 |
| Filled status surface | `--brand-primary-deep` | #173b34 | `bg-primary-deep` | 모드 불변, 기존 배지 색 보존 |
| Home panel accent | `--brand-primary-panel` | #2d5f4f | `bg-primary-panel`, `text-primary-panel` | 모드 불변, 기존 보조 패널 색 보존 |

`--brand-primary-*`는 **공백 구분 RGB 채널**(`27 67 56` …)로 정의되어 Tailwind `<alpha-value>` 투명도 모디파이어를 지원합니다 (예: `bg-primary-dark/80`).

### 핵심 뉘앙스: 모드 인식 vs 모드 불변
- `bg-primary` / `text-primary`는 HSL 토큰이라 **다크모드에서 자동으로 더 밝은 그린**으로 전환됩니다.
- `bg-primary-dark` / `bg-primary-hover` / `text-primary-light`는 `:root`에만 정의되어 **light/dark에서 값이 동일**합니다.
- 그래서 어두운 배경에서 브랜드 텍스트 가독성이 필요할 때는 `text-primary`에 **`dark:text-primary-light`** 를 함께 붙입니다(예: `text-primary dark:text-primary-light`).

## 2. 권장 호버·셰이드 컨벤션 (둘 다 허용)

**A. 정식 컴포넌트 (shadcn 계열)**
- 채움 버튼: `bg-primary text-primary-foreground hover:bg-primary/90` (= [button.tsx](../src/components/ui/button.tsx)의 `default` variant)
- 또는 브랜드 CSS 컴포넌트 클래스 `btn-brand` / `btn-brand-outline` ([index.css](../src/index.css) `@layer components`) — `--action-primary-bg/-hover/-active` 토큰 사용, hover/active/disabled 상태 내장.

**B. 셰이드 계열 (Mate/Navbar 등 기존 패턴)**
- 버튼 기본/호버: `bg-primary-dark hover:bg-primary` 또는 `bg-primary hover:bg-primary-hover`
- 다크모드 강조 텍스트: `text-primary dark:text-primary-light`

신규 코드는 가급적 **A(정식)** 를 우선하되, 셰이드 토큰이 필요한 경우 **B**의 유틸리티를 사용하고 원시 hex는 쓰지 않습니다.

## 3. 의도적 예외 — coachStyleTokens

[src/components/prediction/coachStyleTokens.ts](../src/components/prediction/coachStyleTokens.ts)는 AI 코치 카드 전용의 **의도적으로 격리된** LIGHT/DARK 팔레트입니다. slate·emerald·rose·amber 및 페이퍼 텍스처 등 카드 고유 색을 인라인 스타일로 직접 정의하며, 이는 설계상 허용됩니다. 단 **브랜드 그린만은 SSOT(`--brand-primary-rest`)를 참조**합니다. 이 파일의 상태색/중립색을 앱 `--status-*`/중립 토큰으로 강제 치환하지 마세요(시각 회귀 발생).

## 4. Prediction 전용 class-token 상수

`/prediction` 화면의 모바일 앱형 UI는 [src/components/prediction/predictionUiTokens.ts](../src/components/prediction/predictionUiTokens.ts)에 정의된 class-token 상수를 사용합니다. 전역 CSS 예산을 늘리지 않도록 반복 조합은 TypeScript 상수로 중앙화합니다.

| 상수 | 용도 |
|---|---|
| `PREDICTION_BRAND_GRADIENT_CLASS` | 딥그린 헤더/empty state 배경 |
| `PREDICTION_BRAND_BUTTON_CLASS` | primary CTA 버튼 |
| `PREDICTION_BRAND_TEXT_CLASS` | 흰 카드 위 브랜드 텍스트 |
| `PREDICTION_SURFACE_CARD_CLASS` | 흰 카드형 prediction panel |
| `PREDICTION_SOFT_CHIP_CLASS` | 참여 인원/경기 수 등 연한 브랜드 chip |

신규 prediction UI에서 `#173b34`, `#2d5f4f`, `#2f6c5c` 같은 원시 hex를 직접 쓰지 말고 위 상수나 `bg-primary`, `text-primary`, `bg-primary-hover`, `text-primary-dark` 토큰 유틸리티를 사용합니다.

## 5. 타이포·반경 토큰

명명 토큰 체계는 구현되어 있습니다. 실제 코드에는 기존 임의값과 compact chrome·레트로·정밀 좌석도 표현이 남아 있으므로 전수 치환 완료로 간주하지 않습니다. 신규 코드에는 아래 토큰을 우선 사용합니다. 잔여 항목과 의도적 예외는 `contracts/ui-style-drift-baseline-v1.json`의 파일·규칙·값·횟수·사유·담당 범위를 기준으로 관리합니다.

### 타이포 ([tailwind.config.js](../tailwind.config.js) `theme.extend.fontSize`)
- **font-size 전용**(line-height 미지정)으로 정의 → cascade line-height를 보존. Tailwind 기본 `text-base/sm/xs`(line-height 동반)로 매핑하지 **않습니다**.
- 시맨틱: `text-body`(=`var(--font-body-size)`, 16px) · `text-caption`(=`var(--font-caption-size)`, 14px).
- 숫자: `text-8 … text-160` (`text-11`, `text-13`, `text-15`, `text-17` 등 — px 그대로).

### 반경 ([tailwind.config.js](../tailwind.config.js) `theme.extend.borderRadius`)
- Tailwind 기본 정확 일치값 재사용: 8px→`rounded-lg`, 12px→`rounded-xl`, 16px→`rounded-2xl`, 24px→`rounded-3xl`.
- 그 외: `rounded-7 … rounded-56` (방향 변형 `rounded-t-20` 등 동일 토큰 사용).

### codemod
- 임의값 치환은 [scripts/codemod-arbitrary-classes.mjs](../scripts/codemod-arbitrary-classes.mjs)(매핑 테이블 + `--dry-run`/`--dir`/`--kind`)로 수행. 새 크기 추가 시 이 매핑과 위 토큰을 함께 갱신.

### 투명도 단계 ([tailwind.config.js](../tailwind.config.js) `theme.extend.opacity`)
- Tailwind 3.4는 `theme.opacity`에 없는 단계(`bg-white/72`, `dark:border-white/8` 등)를 **오류 없이 아무 CSS도 만들지 않습니다.** 그래서 요소가 배경·테두리를 조용히 잃습니다.
- 기본 단계(0, 5, 10, 15 … 100)에 더해 `8 · 12 · 18 · 72 · 78 · 82 · 88 · 92`를 정의했습니다. 새 단계가 필요하면 여기에 추가하거나 `bg-white/[0.72]` 임의값을 쓰세요.
- [opacity-scale.test.ts](../src/components/ui/opacity-scale.test.ts)가 소스의 모든 `색상/NN` 유틸리티가 실제 CSS를 만드는지 검사합니다.

## 6. 드리프트 검사와 잔여 정리

- `npm run uiux:policy:check`가 기존 UI UX 정책과 함께 source style drift를 검사합니다. `npm run uiux:policy:test`가 정책·드리프트 mutation 테스트를 실행합니다. Visual QA 계약과 실행 증거는 기존 체계를 그대로 사용합니다.
- TypeScript AST의 스타일 문자열·템플릿·인라인 값과 CSS 선언을 검사합니다. 신규 브랜드 hex/RGB, 미등록 의미 색상 유틸리티, 단순 px/rem 타이포·반경·크기·간격, 선언되지 않은 `var(--token)`이 기준선 횟수를 넘으면 실패합니다.
- baseline은 원본 HEAD의 기존 항목을 명시하며, 이번에 해결한 항목은 허용 횟수를 줄이거나 제거했습니다. 기준선 전체를 현재 소스로 자동 갱신하여 새 결함을 수용하지 않습니다. 예외 변경에는 정확한 파일·값·사유·담당 범위를 기록합니다.
- 구단색·AI Coach·레트로·정밀 좌석도는 의도된 표현을 유지합니다. 기존 고정 크기는 일괄 반올림하지 않습니다. `var`, `calc`, 백분율 및 SVG 좌표는 정적 크기 치환 대상에서 제외합니다.
- CSS 변수 선언은 전역 수집하므로 실제 selector scope와 cascade 유효성까지 증명하지 않습니다. 동적 스타일·임의 표현식의 의미와 화면상의 대비·잘림은 실제 Visual QA로 확인합니다.

## 7. 공통 컴포넌트 계약 (2026-10-13)

- `ui/button-styles.ts`를 Button과 PlainButton의 공통 variant·size 스타일 기준으로 사용합니다. PlainButton은 경량 class joining과 렌더러를 유지하며 공개 variant/size 범위를 확대하지 않습니다. `.bf`의 wrapping·disabled·SVG·모바일 44px 및 데스크톱 밀도 계약을 유지합니다.
- Input·Textarea·ReviewDialog의 입력 표면은 지원되는 `bg-background`와 기존 `dark:bg-input/30`을 사용합니다. `bg-input-background`는 정의되지 않은 유틸리티이므로 사용하지 않습니다.
- 기본 Skeleton은 라이트 `bg-gray-200`을 유지하고 다크에서는 `bg-input` 중립 톤으로 검정 카드와 구분합니다. 사용자 className override와 크기·motion 계약은 유지합니다.
- Card의 `px-4` / `sm:px-6`을 먼저 재사용합니다. Prediction 헤더, Cheer feed, Admin 콘솔과 구장 레이아웃의 의도된 차이는 별도로 유지합니다.

## 8. Tone Baseline 감사 통합 기록 (2026-09-08)

디자인 톤 감사의 1a~30a 아트보드 전체를 실제 `bega_frontend` 코드와 대조한 결과는 이 문서를 기준으로 통합한다. 화면 가이드와 현재 코드가 다르면 실제 코드와 이 토큰 문서가 우선이며, 구현되지 않은 기능을 문서만으로 완료 처리하지 않는다.

- 실제 코드 변경이 필요했던 항목은 상태/에러 토큰, 구장 브랜드색, 제스처, Mate 체크인·상세 흐름, Pretendard 도입으로 정리되었다.
- 버튼·반경·타이포·상태 표현·다크모드 필드·페이지 골격은 현재 코드 또는 이 문서의 토큰 체계로 정렬되어 있다.
- 1a/7a의 초기 스냅샷과 Lucide 아이콘 전제처럼 현재 코드와 맞지 않는 제안은 폐기하고, 비-팀 색상·인라인 크기 정리는 §6 Phase 3에서 계속 추적한다.
- 세부 감사 이력과 아트보드별 판정은 삭제하고 이 요약과 현재 토큰/코드만 유지한다.
