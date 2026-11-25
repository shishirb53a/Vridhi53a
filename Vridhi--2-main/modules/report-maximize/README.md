# Report Maximize

Shared Maximize / Restore control for every report in the application:
- Goal Planner → Reports (Annual Portfolio Projection, Monthly Portfolio Projection, Interest & Income Statement, Annual Savings Schedule, Holdings Entry Register, Value on Date)
- Goal Planner → Holding report pop-up (`#hydlg`)
- Retirement Planner → Year-by-year plan and Summary / Milestones pop-up (`#dg`)
- Policies → Reports (Policy Payout Details, Premiums & Payouts by Year, Maturity Report, Policy Summary)

When maximized, `report-maximize.css` and `report-maximize.js` automatically fit all visible columns into a single-page width without horizontal scrolling (using progressive compact table tiers and proportional scaling for very wide tables), while Restore cleanly returns tables to their original scrollable layout and frozen-column settings.

## Files

- `report-maximize.js` — inserts `#rp-max`, `#hy-max`, and `#fh-max`, persists the shared `vr-rep-max` preference, handles Escape-to-restore, and fits/restores report tables across resize and filter/column changes.
- `report-maximize.css` — full-viewport layout and 1-page column-fitting rules for maximized reports.
