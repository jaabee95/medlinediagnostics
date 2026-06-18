# Deep CRUD Smoke Test Plan

Run a throwaway insert → read → update → delete cycle against every table the Admin Panel writes to, and report per-table pass/fail with the exact error if any step breaks.

## Scope (15 tables)

Core content:
- `main_groups`, `sub_groups`
- `tests`, `packages`, `package_items`
- `test_profiles`, `test_profile_items`
- `doctors`, `reviews`, `slides`
- `enquiries`
- `diagnostic_profile` (update-only — singleton row)

Auth/permissions (read-only check; will NOT create fake auth users):
- `profiles`, `user_roles`, `user_permissions` — verified by SELECT + schema/policy inspection only, since rows are tied to real `auth.users` and creating a throwaway auth user is out of scope for a smoke test.

## Method

For each writable table, in order:
1. **INSERT** a row with a recognizable marker (e.g. `name = '__smoke_test__'`, or marker in a text field) using `supabase--insert`.
2. **READ** it back via `supabase--read_query` to confirm visibility through the Data API.
3. **UPDATE** one field on that row.
4. **DELETE** the row and confirm it's gone.
5. For tables with FK children (`packages`→`package_items`, `test_profiles`→`test_profile_items`, `main_groups`→`sub_groups`/`tests`), test the child cycle inside the parent's lifecycle before deleting the parent.

`diagnostic_profile`: read current row → update a harmless field (e.g. trim whitespace on `address`) → restore original value. No insert/delete.

## Reporting

Single table in the final reply:

```
table              | INSERT | READ | UPDATE | DELETE | notes
-------------------|--------|------|--------|--------|------
main_groups        |   ✅   |  ✅  |   ✅   |   ✅   |
…
```

Any ❌ row includes the exact Postgres/PostgREST error and a one-line root cause (missing GRANT, RLS policy gap, NOT NULL violation, FK constraint, etc.). If everything passes, the verdict is "Admin CRUD healthy end-to-end".

## What I will NOT touch

- No schema changes, no migrations, no policy edits during the smoke test. If a failure points to a real fix, I'll report it and ask before changing anything.
- No real user data — every test row is clearly marked and removed in the same run.
- No edits to deployment config, routing, or auth.
- No creation of `auth.users` rows.

## Risks

- Very low. All writes are scoped to throwaway rows and rolled back via DELETE in the same run.
- If a DELETE fails (e.g. FK from a row I didn't expect), I'll surface the leftover row id in the report so you can decide whether to remove it.

Approve and I'll execute the cycle and post the results table.
