# Report columns module

`report-columns.js` owns the shared report-column preferences, visibility and ordering for
Annual Portfolio Projection, Monthly Portfolio Projection, Interest & Income Statement,
Annual Savings Schedule, Retirement Planner report groups, and the holding pop-up.
`report-columns.css` contains the styles for its controls and frozen-column layout.

The script loads synchronously after the main renderer is defined. It exposes the existing
`window.RCOLS`, `window.rcolsUI`, and `window.__colsAct` interfaces used by the app. Keep the
script in that position when changing startup order. The stylesheet is imported at its original
cascade position to preserve existing layout behavior.

Run `node tests/report-columns.test.js` after changing the module.
