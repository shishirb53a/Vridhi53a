# Stress Test module

A separate screen that stress-tests one Retirement Planner client under 14 conditions and shows how long the
money lasts. The grid keeps the Excel "Stress Test" tab cell for cell: rows 1-123, columns A-S, same labels and order.

- `engine.js` is pure maths (no DOM, storage or network). It reads a client's saved planner inputs through the
  planner's own `FreedomHorizon.simulate`, so Scenario 1 (Base Case) equals the Year-by-Year report. It then
  runs each scenario for up to 70 years, with costs continuing after the plan ends.
- `ui.js` draws the grid and the client bar. `stress-test.css` holds the styles (Excel colour guide, light and dark).
- Nothing else in the app is changed. The module only reads `S.fhp` (client plans) and writes `S.stress`
  (the Stress Settings per client) through the app's `save()`.

## What each linked cell reads (active client's plan)
| Stress Test cell | Planner field |
|---|---|
| Corpus (B) | `corpus` |
| Monthly Exp (C) | `monthly` |
| Emergency Buffer (D) | `buffer` |
| Other Income p.a. (F6) | other income streams running in year 1, in today's rupees (`incAmt1..n`) |
| Investment Return (G) | `roi` |
| Buffer Return (H) | `bufferRoi` |
| Inflation (I) | `houseInflation` |
| Engine C, D, E | college fees, weddings, lump sums and the pre-retirement earning phase, as the planner computes them |
| Expense rule | `reduceAge`, `reducePercent` |

## Stress Settings (editable, saved per client)
Nine settings from the workbook plus the two return settings that used to be linked to the Money Needed tab:
All-safe (Conservative) return, default 6.00%, and Aggressive (Optimistic) return, default 8.05%.

## Differences from the workbook
1. Side-income scenarios (10, 11, 14) apply for every plan year. In the workbook they were gated by "years other income
   continues" (Money Needed B42), which is 0 in your file, so scenarios 10 and 11 gave the same result as the base case.
2. The pre-retirement earning phase, multiple income streams and multiple lump sums from the planner are honoured.
3. Conservative and Optimistic returns are Stress Settings, not planner fields.

## Where it lives
Retirement Planner > **Reports** tab. The tab now has two sections, **Summary** (the planner's existing report, unchanged)
and **Stress Test**. The general portfolio Reports menu is not touched.

## Files changed in the existing app (included in this zip, same paths as the repo)
| File | Change |
|---|---|
| `index.html` | loads `stress-test.css`, `engine.js`, `ui.js` after the Retirement Planner scripts |
| `modules/app-core/app.js` | the 'RP Reports' tab renders through `rpReportsPage()` (falls back to the old report if the module is absent); `cleanStress()` keeps `S.stress` (Stress Settings per client) through state cleaning; the undo snapshot leaves `S.stress` alone |

## Tests
    node tests/stress-test-engine.test.js
    node tests/stress-test-ui.test.js      (needs jsdom; prints SKIP otherwise)
