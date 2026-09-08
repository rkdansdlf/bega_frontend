# Image Lightbox Mobile Visual QA Task Report

Date: 2026-08-31
Status: implementation and authoritative evidence complete; independent review pending

## Delivered

`ImageLightbox` is now a contained, accessible mobile dialog with Korean labels, exact scroll and focus restoration, 44px controls, smaller icons, reduced-motion feedback, safe backdrop/content propagation, circular previous/next navigation, and a visible resettable broken-image fallback. Exact callback ledgers and deliberate repeat-action behavior protect against duplicate dispatch without blocking valid repeated navigation.

One QA-only lower-camel companion registers exactly `42` direct scenarios: twelve canonical states and thirty executable interactions. The existing serialized `populated` vocabulary is fixed locally to the semantic three-image fixture; no global vocabulary, hosted entry, or root was expanded. Totals are registered `452/1,010`, pending `558`, direct `70,947`, and valid `71,950`.

The authoritative report and PNGs are under `reports/visual-qa-image-lightbox-mobile*`. The final run is `42/42`, failed/recovered `0`, attempt `1` throughout, `320x844`, fresh/expand-tall-flow, with `30/30` complete interaction flags, unique/nonzero artifacts, and external image requests `0`. Report SHA-256 is `c7b99a17320fa6e6feb06f7299b1786af3c0bb8e8f48b93168e6fb3b6b8a3cce`; the repo-standard PNG aggregate is `b54f8ba1fca80adeffc48412460c461a35f1cfafdd7db35c46bf4571c4776b96`.

## Release gates

Actual `3/3`, mutations `14/14` meaningful RED, pre-harness `170/170`, full harness `412/412`, adapter/catalog `275/275`, state tests `19/19`, isolation/import/audit/reflow `46/46`, DOM probe, TypeScript, build, `153/153` budgets, artifact/diff checks, and Priority 0 policy pass. Merged-main CSS remains `255,429/255,500` bytes with zero growth. Production QA identifiers are zero.

The detached clean reproduction passes actual, exact arithmetic, TypeScript, build, all budgets, production isolation, and evidence hashes. Its clean-source CSS is `252,072` bytes. The only strict state-check residual is the repository-wide expected `558` pending entries with zero errors, duplicates, missing, or stale entries.

## Preservation

The slice did not edit ImageGrid or Cheer parents, icons or focus hook, shared UI or global CSS, Mate/prediction/Landing, package-lock, prior reports/PNGs, API/data code, or external baseball-data behavior. Main bundle/dist/inventory reports stayed byte-identical and unstaged. Every commit used a temporary scoped index and the shared index remained empty.

## Scoped history

- `0b9e61aa`: immutable approved scope
- `56c2f3b2`: mobile product behavior, actual regression, and package inclusion
- `466b9524`: exact42 QA registration and state arithmetic
- `13637d99`: authoritative report and 42 PNGs

This report and `progress.md` are the final documentation commit after the four scoped implementation/evidence commits.
