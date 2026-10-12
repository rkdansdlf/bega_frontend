# BEGA Design Intent

BEGA is a Korean-first baseball fan companion for discovering games and stadium information, sharing fan content, meeting other fans, and reviewing personal or operational data. Keep the interface clear and useful on a phone first, while allowing data-heavy areas to use denser layouts.

## Authority

The CSS primitives and semantic tokens in `src/index.css` define implemented color, spacing, radius, and control values. `src/guidelines/Guidelines.md` defines the shared interaction, accessibility, motion, and responsive requirements. Page profiles explain how those shared rules apply to each product area. UI UX Pro Max output is local design research and stays advisory until BEGA adopts it in a reviewed contract change.

Do not copy a Pro Max palette, font pairing, component recipe, or React implementation directly into production. Review it against the current tokens, actual component behavior, and the affected Visual QA scenarios first. Existing module-federated `design_system/*` components remain the runtime design system.

## Shared interaction and layout intent

- Preserve visible keyboard focus, accessible names, semantic roles, and keyboard operation.
- Keep interactive targets at least 44 by 44 CSS pixels where the current component contract marks and measures those targets.
- Support narrow layouts, Korean and long unbroken text, and 200% text sizing without losing content or controls.
- Respect `prefers-reduced-motion`; motion should not carry information that is unavailable without animation.
- Use existing semantic tokens instead of adding page-specific raw color values.
- Keep screenshots as review evidence. Structural, accessibility, interaction, and reflow assertions determine blocking results.

## Product profiles

| Area | Density | Motion | Variance | Profile |
| --- | ---: | ---: | ---: | --- |
| Landing | 3 | 4 | 6 | [landing](pages/landing.md) |
| Auth | 4 | 1 | 3 | [auth](pages/auth.md) |
| Home | 5 | 2 | 4 | [home](pages/home.md) |
| Mate and Chat | 7 | 2 | 4 | [mate](pages/mate.md) |
| Stadium | 6 | 2 | 3 | [stadium](pages/stadium.md) |
| Prediction and Statistics | 8 | 1 | 3 | [prediction](pages/prediction.md) |
| My Page and Diary | 6 | 2 | 4 | [mypage](pages/mypage.md) |
| Admin | 8 | 1 | 2 | [admin](pages/admin.md) |

These dials are initial search bias only. They are not CSS values or visual acceptance thresholds. See `source.json` for pinned source details and recommendations that BEGA has not adopted.
