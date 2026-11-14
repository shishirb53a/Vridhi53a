# Authentication module

`auth.js` owns the production sign-in and sign-out integration, Supabase-backed storage adapter,
user and holding-snapshot APIs, and build label. It runs synchronously in the document head after
`config.js` and the Policies scripts so existing startup ordering is preserved.

The app-facing API is exposed as `window.VRSB`; the module also provides `window.claude` as the
storage adapter used by the existing app. Keep this script before the document body is parsed:
it registers DOM-ready handlers and initializes authentication state before the app starts.

`idle-timeout.js` loads immediately after `auth.js`, before the body is parsed. It tracks activity
at the document level so the timeout applies across every screen, preserves the deadline across
reloads, and checks it when a background page becomes visible or focused. Local credentials are
cleared before the best-effort remote logout request so a slow network cannot prevent the app from
locking. The timeout is configured through `idleMinutes` in the root `config.js`.

Run `node tests/session-timeout.test.js` after changing the timeout behavior.

`login.css` contains the responsive, single-card sign-in presentation. The login page uses only the
sign-in form and does not load promotional artwork, story audio, or narration. Keep the presentation
separate from authentication and session code. Run `node tests/login.test.js` after changing the
login presentation.
