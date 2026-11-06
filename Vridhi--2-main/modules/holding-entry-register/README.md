# Holdings Entry Register module

`entry-register.js` owns the read-only report that lists each client's holdings and entry dates,
including filtering, sorting, mobile cards, and CSV export. It consumes the existing
`window.gppHoldingList()` data provider and exposes `window.repEnt()` and
`window.repEntData()` to the Reports shell.

`entry-register.css` contains its desktop and mobile table styles. The script and stylesheet
load at the original end-of-document position, after the Goals Planner holding-list provider
and report shell have been defined.

Run `node tests/holding-entry-register.test.js` after changing this module.
