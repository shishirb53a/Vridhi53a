# Report maximize module

`report-maximize.js` owns the shared Maximize / Restore behavior for Goal Planner reports,
the holding report pop-up, and the Retirement Planner summary and milestones. It inserts the
existing controls, remembers the preference in local storage, and handles Escape to restore
the Goal Planner report view.

The script loads synchronously at its original position after the report and planner markup
hooks are defined. The layout styles remain in `index.html` to preserve their cascade.

Run `node tests/report-maximize.test.js` after changing this module.
