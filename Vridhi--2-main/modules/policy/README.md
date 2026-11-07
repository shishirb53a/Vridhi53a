# Policies module

An independent section of Vriddhi for insurance policies: its own navigation, dashboard, policy management, premium tracking,
maturity details, payout schedules and reports.

```
modules/policy/
  policy-core.js   the SINGLE SOURCE OF TRUTH: policy data + every policy calculation  →  window.VRPolicy
  policy-ui.js     the Policies section (navigation + six screens + forms)             →  registers itself in window.VRMODULES
  policy.css       styles for the section
tests/policy-core.test.js   unit tests for the core (node tests/policy-core.test.js)
```

## Rules

1. **One owner.** Only `policy-core.js` reads or writes `S.polClients` and its policy records. Legacy `S.policies` values are
   migrated into a Policy client when a plan is loaded.
2. **Policy clients are independent.** Each Policy client owns its own policies. In Policies › Dashboard › *Use policy data
   in other modules*, enable a planner and select the planner clients that should receive this Policy client's payouts.
   The Goal Planner and Retirement Planner client lists and selections are independent.
3. **Premiums stay inside this module.** They never change a Goal Planner or Retirement Planner number.
4. **Policy clients are saved with the plan** (`S.polClients` in the plan document), so backup, sync, undo and per-client
   plans work without a database change.
5. **After editing `index.html` or these files, run** `node tests/policy-core.test.js`.

## Data (one policy)

| field | meaning |
|---|---|
| `id, name, note, ca, ma` | identity, free text, created / modified time |
| `amt, freq, start, yrs` | payout: `amt` every period (`monthly` `quarterly` `halfyearly` `yearly`) from `start` for `yrs` years |
| `lump` | maturity lump sum, paid one period after the last regular payout (`start` + `yrs` years) |
| `insurer, no, sa` | optional: insurer, policy number, sum assured |
| `prem` | optional premium plan `{amt, freq, start, yrs}`; `freq` may also be `single` |
| `paid` | optional map of premium due dates the owner marked paid `{ 'YYYY-MM-DD': 1 }` |

A policy with only a premium (a term plan) is allowed: it takes `start` and `yrs` from its premium plan.
Plans saved before this module existed contain only the first four rows and load unchanged.

## What other modules may call (`window.VRPolicy`)

| call | used by |
|---|---|
| `applyToRows(s, rows)` | Goal Planner: fills `pay`, `payR`, `payL` on each plan row (financial year from 1 April) |
| `monthPayout(s, row, month)` | Goal Planner monthly report |
| `receivedBy(s, row)`, `receivedByYear(s, row)` | Goal Planner dashboard: payouts received so far, year by year |
| `hasPayouts('goal')` | report columns: show policy columns only when there is something to show |
| `planStreams(calendarYear)` (also `window.__vrExtraStreams`) | Retirement Planner engine: fixed-rupee income by calendar year |
| `cleanState(doc, s)`, `cleanClients(doc, source, s)` | the plan's `clean()`: migrates legacy policies and validates Policy clients on load |

Inside the module: `clients() addClient() renameClient() selectClient() setClients()`, `list() get() put() remove() setPaid() markPaidUpTo()`, `schedule() premSchedule() totals() premTotals()
maturity() status()`, `events() summary() byFinancialYear() payoutMatrix()`.

## Adding another section like this

Register `{ tab, label, bar(), page(), nav() }` in `window.VRMODULES` (see the last lines of `policy-ui.js`). The app adds the tab
to the top navigation and shows your bar, page and bottom navigation when your tab is open.
