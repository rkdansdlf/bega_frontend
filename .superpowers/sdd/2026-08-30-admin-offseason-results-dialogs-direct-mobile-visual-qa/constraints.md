# Constraints

- Scope is only the direct exports `OffseasonMovementAdminResultsRuntime` and `OffseasonMovementAdminDialogs`, their focused tests/adapters/catalog/manifest/docs/reports/screenshots, and the minimum generic harness support proven necessary.
- Exact matrices: Results `8 + 8 + 9 = 25`; Dialogs `13 + 28 = 41`.
- Existing Content hosted `43`, Results hosted `42`, Dialogs hosted `11`, root `44`, and their IDs remain unchanged.
- Use actual mounted-component callback tests; helper-only, regex-only, and manifest self-assertions are insufficient.
- Mutation callbacks use exact identity/value/count evidence and remain unchanged after read-only viewport expansion.
- Results non-table states are visible at 320px; table overflow is locally bounded.
- Dialogs reflow at 320px, lower fields remain reachable, portal focus behavior is preserved, and interactive targets meet 44px.
- Do not modify shared `PlainDialog`, API/auth/payload/coordinator contracts, or add external baseball data/API/crawling/search repair.
- Fixtures are static `MOCK`/`example.invalid` only.
- Final evidence: Results `25/25`, Dialogs `41/41`, failed/recovered `0`, attempts all `1`, unique/nonzero/hash-complete artifacts, all interaction verification flags true.
- Final totals: registered `437/1,010`, pending `573`, direct `70,576`, valid `71,579`.
- Preserve unrelated dirty/staged/concurrent changes. Implementation and independent review use separate agents; Critical/Important findings return to the original implementer.
