# Localization module

`i18n.js` owns the English/Hindi language list, Hindi dictionary, translation helpers, and
the HTML insertion hooks that automatically translate app markup. It exposes the existing
`LANGS`, `I18N`, `LANG`, `tr`, `trw`, and related lexical globals used by the app.

Load this as a synchronous classic script before the app's main renderer and other scripts
that use translations. Keep its original position in `index.html` to preserve global binding
and translation-hook initialization order.

Run `node tests/i18n.test.js` after changing this module.
