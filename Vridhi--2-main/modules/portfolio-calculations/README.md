# Goal Planner calculation engine

`engine.js` contains the Goal Planner's financial-year contribution schedules, entry and
maturity date handling, gratuity calculation, and annual portfolio forecast. It has no DOM
or storage dependencies. The app supplies only the existing child-stage label function and
the Policies module's row-enrichment hook.

`index.html` loads this classic script before the app's calculation and rendering code. The
app retains its existing `calc`, `fyInfo`, and related interfaces as thin aliases so report
and UI code continue to use the same APIs.

Run `node tests/portfolio-calculations.test.js` after changing the engine.
