# Retirement Planner calculation engine

`engine.js` contains the Retirement Planner's calculation engine. It has no DOM, storage,
or network dependencies; callers provide inputs and use the `FreedomHorizon` API it exposes.
`ui.js` contains the Retirement Planner wizard, summary, and report UI, and consumes that API.
Income sources added on Planning Period > Income are not capped at a fixed count. The Year-by-year report
shows each source as its own column, using the source name entered in the plan. Policy payouts are also
shown in separate columns named for each policy. The report uses concise, descriptive column headers,
and colors expense amounts red and received income green in both table and mobile views.

Both classic scripts load synchronously in order: the engine first, then the UI. Keep this order
so the UI can consume the existing engine API without changing the app's global interfaces.

Run `node tests/retirement-planner-engine.test.js` after changing either file.
