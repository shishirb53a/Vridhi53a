# Goal Planner client profiles

`goal-planner-clients.js` owns Goal Planner client profile creation, selection, duplication,
renaming, deletion/restoration, the header client drawer, and the read-only holdings summary. Profiles
remain stored inside the existing plan state (`S.gpp`), and the active profile continues to
mirror its planning fields at the top level of `S`.

The synchronous script stays at its original location in `index.html` because it consumes
the app's state, save/render functions, dialog, calculation helpers, and `GPP_KEYS`. Existing
`window.gpp*` interfaces are preserved.

The drawer reuses the existing profile handlers and dialogs; drawer state is transient and
does not add storage keys. Goal Planner report navigation stays in the reports view.

Run `node tests/goal-planner-clients.test.js` after changing this module.
