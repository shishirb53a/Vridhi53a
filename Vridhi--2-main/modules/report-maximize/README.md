# Report Maximize

Shared Maximize / Restore control for every report in the application:
- Goal Planner → Reports (Annual Portfolio Projection, Monthly Portfolio Projection, Interest & Income Statement, Annual Savings Schedule, Holdings Entry Register, Value on Date)
- Goal Planner → Holding report pop-up (`#hydlg`)
- Retirement Planner → Year-by-year plan and Summary / Milestones pop-up (`#dg`)
- Policies → Reports (Policy Payout Details, Premiums & Payouts by Year, Maturity Report, Policy Summary)

When maximized, `report-maximize.css` and `report-maximize.js` automatically fit all visible columns into a single-page width without horizontal scrolling (using progressive compact table tiers and proportional scaling for very wide tables) and display an **Export to PDF** button to save the report in a clean printable A4 landscape format, while Restore cleanly returns tables to their original scrollable layout and frozen-column settings.

## Files

- `report-maximize.js` — inserts `#rp-max`, `#hy-max`, and `#fh-max` along with maximized-only Export to PDF buttons (`#rp-pdf`, `#hy-pdf`, `#fh-pdf`), persists the shared `vr-rep-max` preference, handles Escape-to-restore, fits/restores report tables across resize and filter/column changes, and renders printable A4 landscape PDF documents via a hidden same-origin iframe.
- `report-maximize.css` — full-viewport layout, Export to PDF button styles, print media rules, and 1-page column-fitting rules for maximized reports.
