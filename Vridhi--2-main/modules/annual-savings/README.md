# Annual Savings Schedule module

`annual-savings.js` owns the Annual Savings Schedule report data, table/card rendering, filtering,
sorting and CSV export. It exposes the existing `window.repSav`, `window.repSavRows`, and
`window.repSavData` interfaces consumed by the report shell.

The script loads synchronously after the main renderer. Keep it at that location so it can
register the report handlers and expose its functions before the user opens Reports. The mobile
card styles remain in `index.html` because their selectors are also used by the Holdings Entry
Register.

Run `node tests/annual-savings.test.js` after changing the module.
