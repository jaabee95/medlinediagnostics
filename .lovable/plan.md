## Issues & root causes

**1. Homepage slider and doctors section don't appear**
The home page only renders a slide if `slides.length > 0` and the doctors block if `doctors.length > 0`. Both queries filter on `is_active = true` (and `show_on_home = true` for doctors). The most likely cause is missing public-read RLS policies on `slides`, `doctors`, and `main_groups` — when not signed in, the browser silently gets 0 rows. (Less likely: the seed shipped with `is_active=false`.) I will verify with a quick query, then fix whichever is wrong.

**2. Edit dialogs in admin show empty fields instead of existing data**
In `admin.slides.tsx`, `admin.doctors.tsx`, and `admin.services.tsx` (SimpleDialog + TestProfiles dialog), the form state is initialised inside Radix's `onOpenChange={(o) => o ? init() : onClose()}`. Radix only fires `onOpenChange` when the dialog opens/closes from user interaction (Escape, outside-click) — **not** when the parent toggles the `open` prop. Clicking the pencil icon sets `open=true` programmatically, so `init()` never runs and the form stays `{}`.

**3. Cursor disappears after every keystroke in Diagnostic Profile**
`src/routes/admin.profile.tsx` defines a helper component `F` **inside** `ProfileForm`. Every keystroke triggers a re-render, which creates a brand-new `F` function identity, so React unmounts the old `<F/>` and mounts a new one — the underlying `<Input>` is re-created each keystroke and loses focus.

## Fixes

### a. Homepage visibility
- Open Supabase and check (i) row counts and `is_active` flags on `slides`, `doctors`, `main_groups`, and (ii) the SELECT policies on those tables.
- If a public SELECT policy is missing on the active-rows path, add a migration that grants `SELECT` to `anon` + `authenticated` with `USING (is_active = true)` (and `show_on_home = true` for doctors where appropriate). Same for `main_groups`.
- If rows exist but `is_active` is false, update the seed rows so the homepage actually has content.

### b. Edit dialogs prefill correctly
Replace the "init in `onOpenChange`" pattern with a `useEffect` that runs when the dialog opens or the editing item changes. Files to update:
- `src/routes/admin.slides.tsx` → `SlideDialog`
- `src/routes/admin.doctors.tsx` → `DoctorDialog`
- `src/routes/admin.services.tsx` → `SimpleDialog` (Main/Sub/Tests/Packages) and the TestProfiles `ProfileForm` (already takes `item` prop, but verify it resets when `item` changes)

Pattern:
```tsx
useEffect(() => {
  if (!open) return;
  setForm(isEdit ? { ...item } : defaults);
}, [open, item?.id]);
```
Also keep the `onOpenChange` close handler simple: `(o) => { if (!o) onClose(); }`.

### c. Stop focus loss in Diagnostic Profile
In `src/routes/admin.profile.tsx`, remove the inline `F` helper defined inside `ProfileForm`. Either:
- inline each `<div><Label/><Input/></div>` block in JSX, or
- move `F` to module scope and pass `value` + `onChange` as props (no closure over `form`/`set`).

This stops React from remounting the input on every keystroke and the cursor stays put.

## Out of scope
No changes to public site visuals, no new modules, no schema changes beyond an RLS policy patch if one is genuinely missing.

## Verification
- Sign out, reload `/` → slider and doctors block render.
- In admin, open "Edit" on a slide / doctor / main group / test → existing fields are populated.
- Type into any field on `/admin/profile` → cursor stays in the input through the whole word.
