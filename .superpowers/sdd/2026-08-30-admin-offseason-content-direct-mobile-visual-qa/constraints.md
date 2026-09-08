# Immutable Constraints

- Directly register only `OffseasonMovementAdminPanelContent.tsx#OffseasonMovementAdminPanelContent` with exactly 36 states.
- Preserve existing hosted bindings and keep standalone Results, Dialogs, and AdminModerationRuntime entries pending.
- Correct root dialog-section selection evidence without changing root's 44 scenario IDs/count.
- Expected totals: 435/1010 registered, 575 pending, direct 70,510, valid 71,513.
- Exact Content matrix: 8 default data + 15 lifecycle/lazy + 13 interaction states.
- Use a real one-shot select action and exact selected-result verification after viewport expansion; no unverified native-key change evidence.
- Empty state must be visible in the initial 320px viewport outside the 1120px table canvas.
- Production Results/Dialogs fallbacks must be visible named busy statuses.
- Static MOCK/example.invalid fixtures only; no external baseball data, scraping, search repair, or guessed facts.
- Preserve API/auth/payload/data/callback behavior and existing root coordinator semantics.
- Final evidence: Content 36/36 and replacement root 44/44, failed/recovered 0, every attempt 1, unique/nonzero/hash-complete artifacts.
- Implementation and independent review are separate agents; Critical/Important findings return to the original implementer.
