## Understanding

The site is already mostly DB-driven:
- `main_groups` table already powers Services tabs dynamically — admin already manages add/edit/delete/enable/order via `admin.services.tsx`. **No new Category Master module is needed.** I'll verify admin coverage and add anything missing (icon field, "Packages" as a toggleable system category).
- `diagnostic_profile` holds the single address textbox + phone/whatsapp.
- `reviews` and `doctors` tables already exist with admin CRUD.

So the real work is presentation: active tab tracking, sticky offsets, global contact area, carousels, address restructuring, homepage dynamic rendering.

## Files to modify

1. **`src/routes/services.tsx`** — active tab state via scroll spy + click, `scroll-mt` increased, remove per-card Call/WhatsApp, add global contact area (desktop inline + mobile sticky bottom).
2. **`src/routes/index.tsx`** — render homepage category sections dynamically from `main_groups` order; auto-hide disabled.
3. **`src/components/site/SiteFooter.tsx`** + contact/index pages — use new `formatAddress()` helper.
4. **New `src/lib/address.ts`** — formatter that prefers structured fields, falls back to legacy `address`.
5. **New `src/components/site/ReviewsCarousel.tsx`** + **`DoctorsCarousel.tsx`** — auto-scroll RTL, pause on hover, swipe, arrows. Activate only when items exceed threshold.
6. **`src/routes/admin.profile.tsx`** — add structured address fields (line1, line2, area, city, district, state, pincode, maps_url).
7. **Supabase migration** — add columns: `diagnostic_profile.address_line1/line2/area/city/district/state/pincode/maps_url`; `main_groups.icon` (text, nullable). Keep existing `address` for backward compat.
8. **`src/routes/admin.services.tsx`** — add Icon field input (if not present).

## What I will NOT touch
`wrangler.jsonc`, `vite.config.ts`, `src/start.ts`, `src/router.tsx`, `routeTree.gen.ts`, Supabase auth, `.env`, deploy config.

## Risks
- Carousel implementation should be lightweight — no new heavy deps (use CSS + small JS, or `embla-carousel-react` if already installed). I'll check first and prefer existing.
- Migration must include GRANTs (already present for these tables; new columns inherit).
- Active-tab scroll spy must not fight with click-to-scroll — debounce via IntersectionObserver.

## Approach (minimal-diff)
- Step 1: Migration to add structured address columns + main_groups.icon.
- Step 2: Update services page (active tab, scroll-mt-32, remove card buttons, global contact bar).
- Step 3: Build carousels + swap into homepage. Make homepage categories dynamic.
- Step 4: Update admin profile form for structured address. Update footer/contact display.
- Step 5: Verify build.

## Confirmation needed
This is a large multi-step change. Should I proceed with all of it in one pass, or would you prefer I tackle it in phases (e.g., Phase 1 = Services page fixes only, Phase 2 = address + carousels, Phase 3 = dynamic homepage)? Phased delivery is safer for reviewing each change against the live deployment.
