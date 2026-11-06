# Shared landing component

`landing.js` owns the shared first-run welcome screens for the Goal Planner and Retirement
Planner. It exposes the existing `window.vrWelcome`, `window.VRW_GOAL`, and `window.VRW_RET`
globals consumed by both planners.

Load this as a synchronous classic script after `modules/i18n/i18n.js` and before the main app
renderer. It has no DOM, storage, or network dependencies.

Run `node tests/landing.test.js` after changing this module.
