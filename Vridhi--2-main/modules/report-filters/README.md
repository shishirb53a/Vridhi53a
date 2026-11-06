# Report filters module

`report-filters.js` owns the Reports tab's asset-class and holding multi-select dropdowns.
It exposes the existing `window.rsDrops()` markup helper, updates `UI.rsel` / `UI.rcl`, and
preserves the current report render and focus behavior. The Columns dropdown remains owned by
the report-columns module.

`report-filters.css` contains styles for the shared multi-select dropdown controls. The classic
script and stylesheet load at their original positions in the document so its event handlers,
renderer wrapper, and CSS cascade remain ordered as before.

Run `node tests/report-filters.test.js` after changing this module.
