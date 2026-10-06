# NABL Regulator Dashboard

Prototype of the NABL platform: a sign-in landing page, role-based dashboards (NABL Admin, Regulator, NABL Board) and the public **Find a Lab** search, built from the NABL laboratory master extract and the integrated-labs (centralised) list.

**Live site (GitHub Pages):** https://gothwalvikas1995-star.github.io/NABL-Regulator-Dashboard-New/

## Flow
`NABL sign-in → role dashboard → (Regulator) Entire NABL Laboratory Database → My Laboratories`
Find a Lab is a separate public route (`#/find`) reachable from the sign-in page and the header.

## Demo accounts
All demo accounts use the password `Nabl#Demo2026`.

| Role | Email |
|---|---|
| NABL Admin | admin@nabl.demo |
| NABL Board | board@nabl.demo |
| Regulator (one per regulator) | fssai@ · eic@ · apeda@ · teaboard@ · spiceboard@ · iopepc@ · cdb@ · shefexil@ `regulator.demo` |

## Important: prototype only
Sign-in and role checks run in the browser, and the laboratory data ships inside `index.html`. Anyone who opens the site can read that data or sign in with the demo accounts, so role separation is **not real security**. Do not put confidential regulator data into this build. A live service needs NABL single sign-on with MFA and server-side enforcement: see `docs/access-control.md` and `docs/schema_dashboard.sql`.
Review notes and data in each browser stay in that browser (localStorage); there is no shared backend on GitHub Pages.

## Repository layout
| Path | What |
|---|---|
| `index.html` | The complete single-file app (published by Pages) |
| `src/` | Source files that are concatenated into `index.html` |
| `tools/` | `etl.py` (reads the two Excel files), `compact.py`, `build.py` (run `python tools/build.py` from the repo root to rebuild `index.html` from `src/`) |
| `docs/` | `schema.sql`, `schema_dashboard.sql` (regulator mapping and row-level security), `access-control.md` |

The source Excel files are not in this repository (`.gitignore`). To refresh the data: run `etl.py` and `compact.py` on new NABL extracts, then `build.py`.

## Data notes
- Accreditation status is read from the valid-to dates in the NABL extract and the integrated list; labs shown as "validity date passed" may have renewed since.
- Primary regulator is not recorded in the source. Single-regulator labs take that regulator as primary; for multi-regulator labs a rule-suggested primary is stored as **Pending** until an admin confirms it.
- Price, turnaround time, home collection and parameter-level scope are not in the data and show as "not available".
- Map pins are placed by PIN code, city or state centroid, not exact address. State boundaries are indicative.
