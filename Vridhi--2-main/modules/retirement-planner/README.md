# Retirement Planner calculation engine

`engine.js` contains the Retirement Planner's calculation engine. It has no DOM, storage,
or network dependencies; callers provide inputs and use the `FreedomHorizon` API it exposes.
`ui.js` contains the Retirement Planner wizard, summary, and report UI, and consumes that API.
Income sources added on Planning Period > Income are not capped at a fixed count. The Year-by-year report
shows each source as its own column, using the source name entered in the plan. Policy payouts are also
shown in separate columns named for each policy. The report uses concise, descriptive column headers,
and colors expense amounts red and received income green in both table and mobile views.
Planning Period > Lump Sum uses the same pattern as Planning Period > Income: a read-only grid with Edit, Duplicate and
Delete on each row, one editor that opens for the row being added or edited (Done validates, Cancel drops a new row),
an Undo banner after Delete, an empty-state message, and "Check" / "Incomplete" pills so status never relies on colour.
Column headers are short (Label, Amount, Year received, Income %, Yearly income, Principal); the full names are the header tooltips and the editor labels.
The yearly-income column is marked Auto and read-only.
Planning Period > Lump Sum records one-time receipts. Kept principal is held outside the corpus: it earns its entered
annual income starting the year after receipt (the income flows into the corpus) and the principal itself is added to the
closing corpus of the final plan year (Year by Year: "Lump Sum Principal Added to Closing Corpus").
Spent principal is shown as a same-year receipt and outflow, with no ongoing income. Incomplete rows
are preserved and excluded from calculations; valid complete rows are included in the projection and report.
The year-by-year table includes All Columns, Summary View, Income Breakdown, and Expense Breakdown
presets. Each preset keeps the serial number, year, age, phase, and key events visible; the summary
row shows totals only for columns configured as additive amounts in the active view.

Both classic scripts load synchronously in order: the engine first, then the UI. Keep this order
so the UI can consume the existing engine API without changing the app's global interfaces.

Run `node tests/retirement-planner-engine.test.js` and `node tests/lump-sum-gui.test.js` after changing either file.
`tests/lump-sum-gui.dom.test.js` exercises the Lump Sum tab in a simulated browser and needs jsdom (it prints SKIP without it).
