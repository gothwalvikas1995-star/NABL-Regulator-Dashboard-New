# Access control design — NABL authenticated module

## Principle
One platform, different views. The role and (for regulators) the regulator identity come **only** from the verified session/token. No request parameter can widen access.

## Landing flow
`NABL sign-in (#/)` → role dashboard (`#/dash`) → for regulators: Entire NABL Laboratory Database → My Laboratories. Find a Lab is a separate public route (`#/find`) reachable from the sign-in page, the header and the dashboard menu. Opening `#/` while signed in goes straight to the dashboard.

## Roles
| Role | Can see | Cannot see |
|---|---|---|
| Public | Public profile fields, verified `Public` regulator tags | Any dashboard |
| NABL Admin | All laboratories, all mappings, regulator master, data quality, import, public reports | — |
| Regulator | **Entire NABL Laboratory Database** at public level (every lab; same facts as the public site); laboratories where it is **Primary** (full record, own internal note); laboratories where it is **Recognised** (shared projection + verified Public/Shared tags of other regulators) | Any other lab; other regulators' notes, validity, verification, portfolio; admin pages |
| NABL Board | Aggregate KPIs, charts, map and aggregate reports | Any laboratory-level record or list |

## Endpoints (prototype function → production route)
| Function | Route | Allowed | Scoping |
|---|---|---|---|
| adminDash, adminLabs | GET /api/admin/dashboard, /labs | admin | filters validated against allow-lists |
| regulators, saveRegulator | GET/PUT /api/admin/regulators | admin | |
| mapping, saveMapping, addMapping, removeMapping, verifyAllPending | /api/admin/mapping | admin | one Primary per lab enforced by unique index |
| regDash, myLabs, associatedLabs | GET /api/regulator/dashboard, /labs, /associated | regulator | `regulator_id` taken from session; a `reg` parameter is ignored |
| allLabs | GET /api/regulator/database | regulator | public-level fields only for every lab (same facts as the public site, verified `Public` tags, caller's own relationship); no contacts, notes, cycles or non-public tags; admin/board get 403 |
| labDetail | GET /api/labs/:id | admin, regulator | regulator gets 403 (same answer as "not found") without a live relationship |
| saveNote | PUT /api/regulator/labs/:id/note | regulator | own mapping row only |
| boardDash | GET /api/board/dashboard | board | aggregates only |
| reportList, report | GET /api/reports, /api/reports/:key | all three | report keys per role; the export is generated from the same query as the screen |

## Filters and type breakdown
- Every list and dashboard for Admin and Regulator accepts a **Lab ID or name** filter (`q`: ID prefix, name or certificate number). It only narrows what the caller may already see: for a regulator, `myLabs` and `associatedLabs` return 0 for an unrelated lab ID, and `allLabs` returns that lab at public level only.
- The lab-type KPI cards (Testing, Medical, Calibration, PTP, RMP) are computed server-side per request from the caller's own pool with the type filter removed, so counts always match what selecting a type would show.
- The Board accepts only `state` and `type` filters; `q`, `city`, `status` and `reg` are dropped, and no laboratory-level endpoint is open to it.
- Lab detail shows the full public scope (disciplines, groups, products / materials, scope-document name) to Admin, to a regulator's own labs and to recognised labs. Scope is public information, so it does not widen access.

## Rules verified in the prototype (browser test run)
1. Regulator token → `labDetail` for a lab it has no relationship with returns **403**; a non-existent ID returns the same **403**.
2. `regDash({reg:'EIC'})`, `myLabs({reg:'EIC'})` return the caller's own data unchanged: the parameter is ignored.
3. Admin, board and other-regulator endpoints return 403 for a regulator; every regulator/admin endpoint returns 403 for the Board.
4. An `Internal` note on the EIC row of a lab never appears in FSSAI's lab detail or `Recognised / Associated` export; `Internal` rows also drop out of other regulators' tags and the public tags.
5. `My Laboratories` export contains only rows that the on-screen list contains (same function).
6. Expired session → 401 on the next call; sign-in locks for 60 s after five failures.
7. CSV export neutralises leading `= + - @` to prevent spreadsheet formula injection.

## What the prototype cannot prove
It runs in the browser: someone with developer tools can read the embedded data or change the session. The rules above must be enforced in the API with `schema_dashboard.sql` row-level security, NABL SSO + MFA, short-lived tokens, and the audit table.
