# Section sizing and pagination module

`ui-pagination.js` owns the shared fit-to-screen behavior for Holdings, Reports, Users,
Settings, and Help. It provides automatic height-based paging, user-selected page sizes,
section tabs, and the small-screen Reports filter toggle.

The script consumes existing app globals (`UI`, `SET`, and `render`) and loads synchronously
at the same position in `index.html`, after those globals are defined. Related responsive
styles remain in `index.html` because they are shared with other screen components.

Run `node tests/ui-pagination.test.js` after changing this module.
