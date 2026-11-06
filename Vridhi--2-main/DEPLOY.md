# Vriddhi: production setup

One adviser signs in and manages all client plans. Plans are stored in a Supabase database
(real sign-in, one private set of rows per login) and the page is hosted as a static site.
Allow about 30 minutes the first time. No coding needed.

## 1. Create the database (Supabase)
1. Create a free account at https://supabase.com and make a **New project**. Pick the region nearest you
   (for India, Mumbai). Save the database password somewhere safe.
2. Open **SQL Editor, New query**, paste the whole of `supabase/schema.sql`, press **Run**.
   It creates the `app_docs` table with Row Level Security, so a login can only ever read or write its own rows.
3. Open **Authentication** and find the Email sign-in settings. **Turn OFF "Allow new users to sign up"**.
   This is the most important step: otherwise anyone could create an account on your project.
4. **Authentication, Users, Add user**. Enter your email and a long, unique password (14+ characters).
   Choose to auto-confirm the email. This is your adviser login.
5. **Project Settings, API**. Copy the **Project URL** and the **anon public** key.
   Never use the `service_role` key anywhere in this app.

## 2. Add your settings
Open `config.js` and replace the two placeholders:

    supabaseUrl: "https://abcdxyz.supabase.co",
    anonKey: "eyJ...your anon public key...",

The app signs you out after **5 minutes without activity**, including when **Remember me** is enabled. Pointer, keyboard, touch, scroll and form activity anywhere in the app resets the timer. `idleMinutes` in `config.js` controls the timeout in minutes (`0` disables it).

## 3. Put the folder online
Any static host works. Easiest: **Netlify**. Go to https://app.netlify.com/drop and drag this whole
folder in. You get a https link at once. Add your own domain under Domain settings. HTTPS is automatic.
The included `_headers` file adds basic browser protections on Netlify; other hosts have their own header settings.

## 3b. Configure roles and user administration
Vriddhi uses Supabase-backed roles, permissions and row-level security. Existing adviser accounts are
migrated to **Financial Adviser**; other existing logins receive **Client / Individual User**. Public
sign-ups should remain off.

1. In Supabase SQL Editor, run the latest `supabase/schema.sql` (safe to re-run). It creates the five
   built-in user types, the section-access permissions, and migrates existing accounts.
2. Assign your account **Super Admin**. Replace the email below and run this query:

       update public.app_user_roles ur set role_id = 'super_admin', assigned_at = now()
       from auth.users u where ur.user_id = u.id and lower(u.email) = lower('you@example.com');

   Verify that exactly one account was updated. Keep at least one Super Admin assigned at all times.
3. Deploy or update the Supabase Edge Function named `manage-users`: paste
   `supabase/functions/manage-users/index.ts` in the Edge Function editor and deploy with JWT
   verification enabled. Supabase supplies the service-role key to the function; never put it in
   `config.js` or the browser.
4. Reload the app and open **Settings, Users**. Authorized administrators can create logins, assign
   roles, and create/edit/delete custom user types. Built-in user types cannot be deleted or edited.
   The Super Admin role is only assignable by a Super Admin. Removing a login also deletes its saved data.
5. Optional: set the Edge Function secret `ALLOWED_ORIGIN` to your site's origin.

The database also checks role permissions for app data and holding snapshots. A Read-Only User can
read their own workspace but cannot write through either the app or Supabase's REST API. Users cannot
read another account's data.

**Built-in user types**

| User type | Default access |
|---|---|
| Super Admin | Full access; manage users, roles and administrator assignments |
| Admin | Manage users, custom user types and application data |
| Financial Adviser | Manage user accounts and application data |
| Client / Individual User | Manage their private application workspace |
| Read-Only User | Read their private application workspace |

Custom user types can only receive permissions that the administrator creating or editing them already
has. The function also prevents removing the last Super Admin.

The four section permissions are independently assignable from **Settings → Users → Manage user types**:
`access_goal_planner`, `access_retirement_planner`, `access_policies`, and `access_settings`.
Financial Adviser, Client / Individual User, and Read-Only User retain access to all four by default;
Admin and Super Admin do as well. A custom type without a section permission cannot open that section,
even by selecting its tab directly. These permissions control section access; `read_data` and
`write_data` continue to control access to and changes in application data.

**Check it before inviting users:**
- Create a Read-Only test login and confirm data changes do not persist and snapshots cannot be changed.
- Confirm each account sees only its own workspace.
- Assign another Super Admin only through an authorized account; test that ordinary admins cannot do so.
- Check Edge Function logs if an administration request reports an error.

## 3c. Change password (every login, built in)
Each signed-in person has a **Password** button at the top right, next to Sign out.
They enter the current password, then the new one twice (8 to 72 characters; accounts with user-management permission require 14 or more). The current password is checked first.
After a change, this device stays signed in and every other device is signed out. No setup is needed.

Recommended once: in Supabase, **Authentication, Sign In / Providers, Email**, set **Minimum password length** to **8**.
The `manage-users` function enforces 8 to 72 characters when creating or resetting accounts.
If someone forgets their password, an authorized administrator resets it from **Settings, Users**,
and resets their own in **Authentication, Users** in the Supabase dashboard (open the user, Send password recovery or set a new one).

## 3d. Holding snapshots (save, search by date, restore)
**Settings, Backup tab** has a **Holding snapshots** card for every login. Each login sees only its own snapshots; Read-Only users cannot save, restore or delete snapshots.

- **Save snapshot now** stores a dated copy of the holdings of the plan you are in (holdings, gratuity inputs and custom categories). Give it a name if you like.
- **Find a snapshot**: choose a **From date** and **To date** and/or type part of the name, then **Search**. Dates use your device's local time.
- **View holdings** shows what a copy contains. **Restore** puts it back (after a confirmation) and replaces the current holdings of the plan you are in. Before restoring, the app saves your current holdings as an "Auto: before restoring ..." snapshot, and an Undo button also appears for a few seconds.
- **Delete** removes one snapshot. Removing a client login deletes that client's snapshots too.

Setup: run the latest `supabase/schema.sql` in the Supabase SQL Editor (safe to re-run). It adds the `vr_holding_snapshots` table with Row Level Security. No new function is needed.

Notes: a snapshot is a copy of the holdings only, not of family members, goals or other settings. Snapshots are saved when you press the button (nothing is saved automatically). The list shows the latest 200 matches.

## 3e. Policies module (v2.7.0)
**Policies** is its own section of the app (top navigation, next to Goal Planner and Retirement Planner). Insurance policies are no longer
managed under Holdings or the Goal Planner reports. The section has six screens (a bar at the top on a computer, a bottom bar on a phone):

| screen | what it does |
|---|---|
| **Dashboard** | policies, premium per year, payouts received and still to receive, next maturity, next premium due, an overdue-premium alert, payouts and premiums by financial year, what is coming in the next 12 months, and the two "use in other modules" switches |
| **Policies** | add, edit, delete (undoable) and search policies; filter by status; **Group by frequency**; each row has **Schedule** (every payout date) and **Premiums** |
| **Premiums** | premium tracking: set a premium on a policy (amount, how often, first date, paying term, or a single premium), then mark every due date **paid** or undo it; overdue premiums are flagged; **Mark due as paid** |
| **Maturity** | maturity date, years left, how much of the term has passed, maturity amount, regular payouts, total benefit, premiums and net gain |
| **Payouts** | every payout and maturity amount with date, financial year and Received / Upcoming; filters; **By financial year**; Export CSV |
| **Reports** | **Policy Payout Details** (the report that used to be in the Goal Planner, unchanged), **Premiums & Payouts by Year**, **Maturity Report**, **Policy Summary**; each can be exported as CSV |

A policy can have a premium plan, a payout plan, a maturity lump sum, or any combination (a term plan has only a premium). Optional extras:
insurer, policy number and sum assured.

**How other parts of the app use policies**
- The Policies module is the **only place that stores or calculates policy data**. Other modules ask it through a small interface (see `modules/policy/README.md`).
- **Goal Planner** (switch on the Policies dashboard, on by default): payouts show as **Policy payouts** and **Total income** columns in Annual Portfolio Projection and Monthly Portfolio Projection (switchable under **Settings, Columns**), and the Summary corpus and Asset Allocation count the payouts already received, added year by year. Payouts are income, not investment value, so nothing is counted twice.
- **Retirement Planner** (second switch, on by default): future payouts are fixed-rupee income in the year each one arrives, which lowers the money needed today. They are not part of the current corpus. The Summary lists each policy and what it saves.
- **Premiums are never passed on**: they do not change any Goal Planner or Retirement Planner number.
- With a switch off, that module sees no policy data at all; switching back on restores exactly the same figures.

**Database:** no change is needed. Policies are still stored inside the plan document that is already saved in `app_docs` (jsonb), so Row Level Security,
backup, sync, undo and per-client plans work as before. Plans saved by an earlier version open unchanged with all their policies.
Up to 30 policies per plan.

**Tests:** run the Node test files in `tests/` (no install needed), including `node tests/html-shell.test.js` and `node tests/inline-styles.test.js`, to check the static HTML shell, synchronous script order, extracted CSS cascade order, and the app's calculation and feature behavior.

## 3f. Report display options (v2.6.1)
- **Column order (v2.6.1):** under **Settings > Columns** every report column can be moved with the ▲ ▼ buttons as well as switched on or off: Annual Portfolio Projection, Monthly Portfolio Projection, Interest & Income Statement (and the holding pop-up and phone cards that use them), the category columns of Annual Savings Schedule, and the column groups of the Retirement Planner's Year-by-year plan. S.No, Year/Financial year and Ages stay at the left because they are the frozen columns (marked ⇤). The order is saved on this device, the Columns drop-down on the Reports tab lists columns in the same order, and each report has its own **Reset ... to default** button. "Copy as CSV" keeps its fixed column order.
- **Age on the Retired row (v2.6.1):** Annual and Monthly Portfolio Projection, Interest & Income Statement and Annual Savings Schedule all show the age at the **end** of the row's year, so the Retired row always shows the retirement age you chose on the Summary (the Interest & Income "Age" column used to show the age at the start of the year, one year less).
- **Retirement row (v2.6.1):** the row for the year you retire is highlighted yellow across the whole row in every report: Annual and Monthly Portfolio Projection, Interest & Income Statement, Annual Savings Schedule, the per-holding reports and the Retirement Planner's Year-by-year plan (and on the phone cards), in light and dark mode. A row you click to select shows the selection colour instead, until you click away.

## 3g. Goal Planner reports (v2.7.1)
Each report has one name, used on its tab, its page title, the CSV window, Settings > Columns and the holding pop-up:

| report | what it shows |
|---|---|
| **Clients drawer** | saved Goal Planner clients, their progress, and actions to add, switch, duplicate, rename, or delete |
| **Annual Portfolio Projection** | one row per financial year: balances as on 1 April, interest, deposits, change in balance and (with policies) payouts |
| **Monthly Portfolio Projection** | the same, month by month |
| **Interest & Income Statement** | each financial year's opening balance, additions, interest by holding, monthly income and yield |
| **Annual Savings Schedule** | what you put in each financial year, by category |
| **Holdings Entry Register** | when each holding was added, for every Goal Planner client |

The Annual Portfolio Projection no longer has a separate **Financial year** column: it repeated the **As on** date of the same row (the financial year is shown with the date on the phone cards and is still searchable). The Monthly Portfolio Projection keeps its Financial year column because a month is not the same thing as a year.

## Version
The version (`2.8.0.x`) shows next to the Vriddhi name and under the sign-in box. GitHub Pages generates `x` from the workflow run number, starting after build 150; each push to `main` or manual deployment advances it. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions** once. The workflow then publishes the generated build metadata and matching script cache keys without needing a personal access token. If you still see an older number after deployment, hard-refresh (Ctrl+Shift+R) and confirm the latest **Deploy to GitHub Pages** workflow completed successfully.

## 4. Check it works (do all of these before real client data)
- Open the site, sign in with your adviser email and password.
- Add a test client, then open the site on your phone, sign in, and confirm the test client is there.
- In Supabase **Table Editor, app_docs** you should see one row. Check the table shows RLS enabled.
- Sign out. The page locks and this device's local copy of client data is cleared.
- Try a wrong password and confirm it is refused.

## 5. Running it
- **Backups:** Supabase free projects have limited backups and can pause when unused. For real client data
  use a paid plan with daily backups (check Supabase's current terms), and use Settings, Export backup now and then.
- **Another financial adviser:** create their account under Authentication, Users, then run this query
  with their email (or create them from Settings, Users if your assigned permissions allow it):

      insert into public.app_user_roles (user_id, role_id)
      select id, 'financial_adviser' from auth.users where lower(email) = lower('adviser@example.com')
      on conflict (user_id) do update set role_id = excluded.role_id, assigned_at = now();

  Each login has its own private data.
- **Lost password:** reset it in the Supabase dashboard.
- **Shared computers:** the app keeps a copy of the plans in the browser until you sign out. Since v2.0.3 that copy belongs to one login only: a different login on the same browser clears it and starts empty, and it is never uploaded under the other login. Still, use trusted devices only, and sign out when you finish.

## Known limits (read before launch)
- This build was tested end to end against a **mock** Supabase server, not against a live Supabase project.
  The SQL rules in `schema.sql` have not been run on a real database by me. Do step 4 carefully.
- No two-factor sign-in yet (Supabase supports it; it needs an extra screen).
- If you edit the same client on two devices at the same moment, the later save wins for the whole file.
  Changes from another device appear within about 20 seconds.
- Clients sign in to their own separate workspace (step 3b). They do not see your plans, and you do not see theirs in the app.
- The user-management function was tested here with stand-in data, not on a live Supabase project. Run the checks in step 3b.
- Legal, privacy-policy and advisory-registration requirements for handling client financial data are
  your responsibility. Please check them with a qualified professional.
- The old in-page login (including the built-in admin account) is switched off in this build.
