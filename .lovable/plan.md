
# Medline Diagnostics — Phase 1 Build Plan

A mobile-first diagnostic centre website for Medline Diagnostics (P) Ltd, Trichy, plus a non-technical admin panel that controls every piece of public content. Lovable Cloud powers the database, auth, and storage. **MRI is excluded everywhere.**

## 0. Real business details (from uploaded card)

- **Name:** Medline Diagnostics (P) Ltd
- **Phone / WhatsApp:** +91 74028 25555
- **Address:** No. 213, K.P. Venkatesan Salai, Ponnagar, Trichy – 1, Tamil Nadu
- **Logo:** blue hexagon with caduceus-style figure — I'll recreate this as a clean SVG (teal/blue hex + stylized caduceus) and ship it as `src/assets/medline-logo.svg`. User can replace via Diagnostic Profile → logo upload.
- **Services from card** (merged with original prompt, MRI excluded): CT, USG (Ultrasound), ECHO, TMT, X-Ray, OPG, PFT, Audiogram, Pre-Medical Checkup, Master Health Checkup, plus pathology (Blood, Urine, Biochemistry, Microbiology) from the original brief.

These details seed the `diagnostic_profile` row and appear in Header, Footer, Contact page, sticky mobile CTA, and SEO metadata.

## 1. Visual identity (Clean Clinical — teal/white)

- Palette (oklch tokens in `src/styles.css`):
  - Background: near-white `oklch(0.99 0.005 200)`
  - Primary teal: `oklch(0.55 0.12 210)` (close to logo blue) + `--primary-glow` lighter variant
  - Secondary surface: soft mint `oklch(0.97 0.02 190)`
  - Accent / headings: deep navy `oklch(0.30 0.05 235)`
  - Destructive: clinical red
- Typography: Inter (body) + Plus Jakarta Sans (headings, semibold/bold).
- Components: rounded-xl cards, subtle teal shadow, NABL/TAT pill badges, soft gradient hero, generous whitespace.
- Mobile-first: vertical stacks, 48px tap targets, **sticky bottom bar: Call · WhatsApp · Directions**.

## 2. Public website (4 routes, each with own SEO)

- `/` Home — admin slider (3–5 active slides), services snapshot (Pathology / Imaging), featured doctors (`show_on_home`), trust indicators (NABL, years, walk-in, doctor referral), contact CTA.
- `/about` — story, mission, NABL details, address, leadership.
- `/services` — hierarchy: Main Group → Sub Group → Test/Profile/Package. Test detail shows description, sample, TAT, reference range, price, Call & WhatsApp buttons. Tabs for Profiles & Packages.
- `/contact` — click-to-call 7402825555, click-to-WhatsApp, embedded Google Map (Ponnagar, Trichy), enquiry form → `enquiries` table.

## 3. Admin panel (`/_admin/*`)

Sidebar layout (collapsible, mobile drawer). Auth via Lovable Cloud — username "Admin" maps to synthetic email `admin@medline.local` under the hood so passwords are bcrypt-hashed and JWT issued automatically. First login forces password change (`must_change_password` flag).

Modules:
1. **Dashboard** — counts + recent enquiries
2. **Diagnostic Profile** — single record (pre-seeded with card data); editable name, address, phones, WhatsApp, email, logo upload, map URL/coords, entity type, registration, NABL status + reg no + validity
3. **Homepage Slider** — CRUD, drag-reorder, image upload, active toggle (max 5)
4. **Services** — Main Groups → Sub Groups → Tests CRUD; Profiles CRUD (group tests); Packages CRUD (group profiles + tests, price, visibility)
5. **Doctors** — name, reg no, qualification, specialization, photo, description, `show_on_home`, sort_order
6. **Enquiries** — read / mark resolved
7. **Users** — list admins, create, reset password, deactivate
8. **Account** — change own password

Forms: react-hook-form + zod. Images → Cloud Storage bucket `public-media`.

## 4. Database schema (Lovable Cloud / Postgres)

All tables: `id uuid pk`, `created_at`, `updated_at`.

- `profiles` (1:1 auth.users): username, full_name, must_change_password
- `user_roles` (user_id, role enum `admin`|`editor`) + security-definer `has_role()`
- `diagnostic_profile` — single-row config
- `slides` — image_url, heading, subtext, link_url, is_active, sort_order
- `main_groups` / `sub_groups` / `tests` — services hierarchy
- `test_profiles` (renamed to avoid clash with auth profiles) + `test_profile_items`
- `packages` + `package_items` (item_type test|profile)
- `doctors`
- `enquiries`

RLS: public read on active content; writes restricted to `has_role(auth.uid(),'admin')`. `enquiries` insert by anon, read/update by admin only. Storage bucket `public-media` (public read, admin write).

## 5. Seed data

- `diagnostic_profile`: Medline Diagnostics (P) Ltd, full address above, phone & WhatsApp 7402825555, NABL status "Applied" (admin can edit)
- 3 hero slides (AI-generated lab/ultrasound/consult imagery with teal palette)
- Main Groups: **Pathology**, **Imaging**, **Cardiac & Pulmonary**, **Health Checkups**
- Sub Groups & sample tests (~20 total) drawn from the card + original brief:
  - Pathology → Hematology (CBC, ESR), Biochemistry (FBS, HbA1c, LFT, RFT, Lipid Profile, TSH), Microbiology (Culture & Sensitivity), Urine Analysis (Urine R/M)
  - Imaging → X-Ray (Chest X-Ray, OPG dental), Ultrasound USG (Abdomen, Pelvis), CT Scan (Brain Plain, Chest)
  - Cardiac & Pulmonary → ECHO, TMT, PFT, Audiogram
  - Health Checkups → Pre-Medical Checkup, Master Health Checkup
- 2 profiles (Diabetic Profile, Thyroid Profile), 2 packages (Master Health Checkup, Women's Wellness)
- 3 sample doctors (Pathologist, Radiologist, Sonologist) with AI-generated portraits, 2 shown on home
- Initial admin user: **username `Admin`, password `Admin@123`, must_change_password=true**

## 6. File layout

- Routes: `__root.tsx`, `index.tsx`, `about.tsx`, `services.tsx`, `contact.tsx`, `admin.login.tsx`, `_admin.tsx` (guarded layout) + `_admin/{index,slider,services,doctors,enquiries,profile,users,account}.tsx`
- Components: `src/components/site/*` and `src/components/admin/*`
- Logo SVG: `src/assets/medline-logo.svg` (recreated from card)

## 7. Out of scope (future phases, schema kept extensible)

Billing/invoices, patient report generation & delivery, online booking + payments, patient portal, SMS/Email automations.

## 8. Build order

1. Enable Lovable Cloud
2. Recreate logo SVG + generate hero/doctor placeholder images
3. Migration: enums, tables, RLS, `has_role`, storage bucket
4. Seed all sample data + create initial admin user
5. Design tokens in `styles.css` + Header / Footer / MobileCTA
6. Public pages wired to live Cloud data
7. Admin auth + sidebar shell + force-password-change flow
8. Admin modules in order: Diagnostic Profile → Slider → Services → Doctors → Enquiries → Users → Account
9. QA on 432px mobile viewport; verify zero MRI references

Approve to start building.
