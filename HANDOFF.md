# HPZ Website — Handoff Document
**Scope: ONLY the public marketing website (www.hpzperformance.com). Does NOT cover the HPZ training app.**

---

## 1. Project Identification — READ THIS FIRST

There are **TWO SEPARATE repos/Vercel projects** for HPZ. Mixing them up causes deployments to land in the wrong place:

| | THIS PROJECT (web) | NOT this one (app) |
|---|---|---|
| Repo path | `C:\Users\Raphy\Downloads\hpz-web` | `C:\Users\Raphy\Documents\GitHub\hpz` |
| GitHub remote | `https://github.com/Raphyjoel5/hpz-web.git` | `https://github.com/Raphyjoel5/hpz.git` |
| Vercel domain | `www.hpzperformance.com` | `app.hpzperformance.com` |
| Vercel project ID | `prj_1Obc6BNuoaE2aYQVseNkzrhXxpBN` | `prj_naTVkmBjebpZ3qNfhoVrtivBRUWr` |
| Framework | `null` (static HTML, no build) | `create-react-app` |
| Vercel team | `team_1rJh8zWsfNx4ji5z41KomdCD` ("Human Performance Zone's projects") | same team |

**Always confirm you're editing files in `C:\Users\Raphy\Downloads\hpz-web` before committing anything for "the website."**

---

## 2. Site Structure

Flat **static HTML site** — no build step, no bundler, no framework:
```
hpz-web/
├── index.html       ← main landing page (single-page site, anchor-link sections)
├── terms.html
├── privacy.html
├── docs/            ← downloadable resource files served at /docs/<file>
│   ├── HPZ_Beta_Testing_Instructions.pdf
│   └── HPZ_Beta_Testing_Form.docx
└── (other static assets)
```
- Internal links are **relative** (`terms.html`, `privacy.html`), not full Vercel URLs.
- Files placed in `docs/` at repo root resolve directly as `/docs/<filename>` on the live site (NOT `/public/docs/` — that's a CRA convention from the *other* repo).
- `index.html` is a single long page with `<section id="...">` blocks linked via in-page anchors (`#pricing`, `#beta`, etc.) and a shared nav/footer.

---

## 3. Design System (Dark Premium Athletic)

**CSS custom properties** (defined at top of `index.html` — DO NOT change these values):
```css
--bg: #07090e;
--bg2: #0c0f16;
--bg3: #11151f;
--cyan: #00e5ff;
--green: #2dff7a;
--red: #ff3347;
--amber: #ffb520;
--purple: #b56bff;
--white: #edf1f8;
--gray: #8a94a8;
--mid: #404858;
--border: (semi-transparent border color used throughout cards)
```

**Fonts**:
- `Bebas Neue` — headings / big display titles
- `Barlow Condensed` — labels, tags, buttons, small caps text
- `Barlow` — body copy

**Recurring patterns/classes already in the site** (reuse these, don't reinvent):
- `.fade-up` + `IntersectionObserver` — scroll-triggered fade-in animation applied to nearly every element
- `.section-tag` — small uppercase eyebrow label above section titles
- `.section-title` — big `Bebas Neue` heading
- `.section-desc` — gray descriptive paragraph under section titles
- `.btn-primary` — main cyan CTA button style
- `@media (max-width: 768px)` — primary mobile breakpoint; also `1024px` (tablet) and `480px` (small phones) used for finer-grained grids

**Pricing tiers shown on this site** (4-tier, do not change): Free ($0), Monthly ($12.99/mo), Quarterly ($32.99/qtr), Annual ($99.99/yr).

Stats bar copy says **"100+ Mixed Routines"** (differs from the app repo's "31 Expert Routines" — this is correct for the website, leave it).

---

## 4. Hard Constraints — NEVER violate these

- Do **NOT** change brand colors, especially `#07090e` (bg) and `#00e5ff` (cyan)
- Do **NOT** change the pricing values ($0 / $12.99 / $32.99 / $99.99)
- Do **NOT** modify `terms.html` / `privacy.html` content unless explicitly asked
- Do **NOT** break existing sections, nav, or footer structure
- This repo is **website only** — never touch `C:\Users\Raphy\Documents\GitHub\hpz` (the app) when working a "website" request, and vice versa
- This is a static site with **no build step** — there is nothing to "build"; verification = check the HTML is well-formed and the live URL serves the right content after deploy

---

## 5. Git Push Security Protocol — MANDATORY for every push

A GitHub token is used for pushes but **must never remain embedded in the git remote URL**. Pattern for every push:

```bash
git remote set-url origin "https://<TOKEN>@github.com/Raphyjoel5/hpz-web.git"
git push origin main
git remote set-url origin "https://github.com/Raphyjoel5/hpz-web.git"
git remote -v   # confirm token is gone, only clean HTTPS URL remains
```
Never leave the token in `git config` / remote URL after the push completes. Always restore the clean URL as the final step, even if the push fails.

(The token itself should be supplied fresh by the user/session — do not hardcode or persist it in files.)

---

## 6. Recent Work Completed (for context)

**Most recent change — "HPZ Beta Testing Program" section** (commit `69168ae`, pushed to `main`):
- Added a full `<section id="beta">` to `index.html` between the Pricing/stats area and the CTA section, including:
  - Intro + program goals list
  - "How The Beta Process Works" — 10-step numbered grid
  - "Beta Testing Resources" — two downloadable resource cards (PDF instructions + DOCX evaluation form)
  - "Important Notice" highlighted card (amber accent)
  - Beta CTA card with Instagram (`@hpzperformance`) / email (`hpzperformancezone@gmail.com`) contact links
- Added matching nav link (`<a href="#beta">Beta Program</a>`) and footer link
- Added new CSS block (`.beta-badge`, `.beta-intro`, `.beta-goals`, `.beta-steps-grid`, `.beta-step-card`, `.resources-grid`, `.resource-card`, `.resource-btn`, `.beta-notice`, `.beta-cta`, etc.) plus responsive media query overrides
- Generated and committed two new downloadable resources into `docs/`:
  - `HPZ_Beta_Testing_Instructions.pdf` (built with `pdfkit`, 8,788 bytes)
  - `HPZ_Beta_Testing_Form.docx` (built with `docx`/docx-js, 13,293 bytes)
- **Verified live** post-deploy:
  - `https://www.hpzperformance.com/` → 200, contains the new `#beta` section and links
  - `https://www.hpzperformance.com/docs/HPZ_Beta_Testing_Instructions.pdf` → 200, `application/pdf`
  - `https://www.hpzperformance.com/docs/HPZ_Beta_Testing_Form.docx` → 200, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

**Important history note**: An earlier attempt mistakenly built this same section into the *app* repo (`hpz/public/Landing.html`, commit `4b49b90`) before the two-repo structure was discovered. That mistake was cleanly reverted via `git revert` (commit `771a9b5`) and the app repo is clean. All final work lives only in `hpz-web`.

---

## 7. How to Generate New Downloadable Documents (if ever needed again)

If a future task needs new PDF/DOCX resources hosted on this site:
- Use a **scratch folder** inside `hpz-web` (e.g. `_scratch_gen/`), run `npm init -y && npm install docx pdfkit`
- Generate `.docx` via the `docx` (docx-js) library — `Document`, `Packer`, `Paragraph`, `TextRun`, `Header`/`Footer`, `HeadingLevel`, numbering config for checkbox-style lists, US Letter page size (`12240 x 15840` DXA, ~`1296` DXA margins)
- Generate `.pdf` directly via `pdfkit` (no LibreOffice/pandoc/wkhtmltopdf available on this Windows machine — DOCX→PDF conversion routes don't work here; write PDFs natively instead)
- Output files directly into `docs/`
- Validate: PDF via header (`%PDF-`) + trailer (`%%EOF`) byte check; DOCX via zip structure check (`[Content_Types].xml`, `_rels/.rels`, `word/document.xml` present + well-formed XML)
- **Delete the scratch folder before committing** — confirm with `git status --porcelain` that it doesn't appear (empty dirs aren't tracked by git so a stubborn empty folder left behind is harmless, but `node_modules`/generated files must be gone)

---

## 8. Current State

- Working tree is clean (everything committed and pushed as of commit `69168ae`)
- Live site reflects all changes
- No pending tasks for the website at this time
