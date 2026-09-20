# MAMSS — school website, version 3.1

Live: **https://merebari7-web.github.io/mamss-website/**

A premium, heritage-inspired redesign of the public school website: burgundy, cream and gold, authentic school photography, a focused eight-chapter layout and a local-first School Desk. The separately hosted **[MAMSS Prep](https://merebari7-web.github.io/mamss-prep/)** remains linked and unchanged. The source school site at mamss.com.ng and its private systems are not modified by this repository.

## Version 3.1 — branded readiness screen

A full-screen burgundy-and-gold welcome pairs the original school crest with an animated orbital ring, a live progress indicator and a short reveal into the website. It measures **five readiness checks** (page structure, main stylesheet, application, local typography, and the opening photo/view), not download bytes. No progress is simulated and there is **no minimum display time**.

- Critical styles, markup and controller are built directly into the HTML, before the main stylesheet/script. The welcome does not depend on another network request or third-party library.
- Skip intro and Escape dismiss immediately. A native modal keeps keyboard focus away from the obscured site; skipping focuses the main content. System reduced motion and an existing opted-in School Desk motion preference disable decorative animation.
- Completion reveals the site with a 340 ms fade. A **3.5-second deadline**, stylesheet/script failures, printing and background/history restoration release the overlay immediately. Failed optional fonts/photos are marked unavailable rather than falsely reported as loaded.
- Deep links retain their destination and do not wait for the hidden home photograph. Chapter changes and browser history never replay the welcome. Without JavaScript or native-dialog support it stays hidden.
- No new storage, cookies or visitor tracking. The loader only reads an already opted-in motion preference. The screen also works from the existing, explicitly enabled offline cache.

## What changed in version 3

- **Editorial visual identity:** ivory and burgundy, oversized local serif typography, a split photographic hero, shaped photo frames, quieter cards and photo-led introductions to the school, learning, life and admissions chapters.
- **School-life stories:** a three-part Learning / Community / Faith explorer using the school’s existing photographs. Keyboard-operated tabs update the photo, story and relevant chapter link. An unavailable photo has a retry state; there is no autoplay.
- **Guided visit enquiry:** choose a published entry class or general enquiry, optional proposed day/time, discussion topics and a short question. Review the complete draft, open it in an email app, copy it or download a text plan. Nothing is sent or booked by the website.
- **Optional follow-up:** explicitly add a personal reminder from the reviewed enquiry to the existing School Desk. Its consent, backup, 100-reminder limit and Lagos-time calendar behaviour remain unchanged. Draft answers themselves never enter local storage.
- **Photograph viewer:** small authentic thumbnails, keyboard selection, an enlarged scrollable view and a fit-to-view control. The 14-photo collection and category filters stay in sync; moving photos resets zoom.
- **Chapter contents:** 11 direct section shortcuts across four content-rich chapters, preserving legacy hashes and routing.

### Preserved foundations

- **Eight focused views:** Home, Our School, Learning, School Life, Admissions, Resources, My School Desk and Contact. Original section hashes still work, including search results, browser Back/Forward and direct links.
- **Purposeful homepage:** photo-led design, explicit slideshow controls, parent/student/staff shortcuts and a clear admission path. Mobile learning/news cards use native horizontal scrolling with real previous/next buttons.
- **Mobile navigation:** collapsible, keyboard-contained menu, background inertness, Escape dismissal and a persistent four-item quick-navigation bar. No scroll hijacking.
- **Admissions guide:** published entry classes, subjects and form-collection guidance, date warning, useful questions for the school, and a class-aware handoff to the six-step personal checklist.
- **Content preserved:** 17 resources, 12 hero slides, 14 gallery photographs, original institutional information, source-qualified statistics/testimonials, school notices, flyers, contact methods and private portal links.
- **Tools preserved:** public-site search; role-based School Desk; checklist, printable/text download; planner and Lagos-time ICS exports; favourites; opt-in saving; validated backups; reading controls; optional offline mode.
- **Lighter startup:** deterministic minified local CSS/JS bundles, responsive images, no eager closed-lightbox download and genuinely lazy, off-by-default optional 3D effects. No production framework, CDN or API dependency.
- **Reliability fixes:** photo variants cannot remain attached to a different gallery image; normal browser printing no longer produces a blank sheet; search and mobile navigation focus the destination; offline clearing is scoped to this project rather than other GitHub Pages projects.

## Develop and test

Node **22** is specified in `.nvmrc`. Production serves the checked-in static files and does not need Node.

```sh
npm ci
npm run build       # authored CSS/JS → site.min.css + site.min.js
npm run serve       # gzip-enabled local preview, http://localhost:8230
npm test            # 119 real-browser checks (60 core + 35 premium + 24 loading)
```

The preview server binds to `0.0.0.0` for hosted previews. It is not a production server. An arbitrary static server can serve the built site, but compression affects performance measurements. Offline tests require localhost or HTTPS; they cannot run from `file://`.

**Edit the source files, not the minified bundles, then rebuild.** Commit both sources and generated bundles. The build is deterministic; regression tests verify this. Edit the loading-screen source files rather than their generated inline regions. CI checks both `index.html` and the runtime bundles for build drift.

### Source map

| Files | Purpose |
|---|---|
| `index.html` | Static content, eight chapters, metadata, navigation and built inline loading-screen regions |
| `loading.html`, `loading.css`, `loading.js` | Authored loading screen; build embeds it inside the marked regions of `index.html` |
| `premium.css`, `premium.js` | Version-3 visual refinement, school stories, visit enquiry and photo-viewer enhancements; bundled last |
| `site.css`, `site.js` | Eight-chapter design system, responsive layout, routing, focus/menu management, admission handoff and optional effects loader |
| `app.js`, `features.js`, `advanced.js` | Existing school content, dialogs/gallery, services, search, desk and consent-aware data tools |
| `fonts.css`, `styles.css`, `features.css`, `advanced.css` | Supporting styles; bundled in this order before `site.css` |
| `site.min.css`, `site.min.js` | Actual production entry bundles |
| `motion.css`, `motion.js` | Optional, on-demand native-scroll effects; not part of startup bundles |
| `sw.js`, `manifest.webmanifest` | Explicit opt-in public-site offline support and install metadata |
| `assets/`, `licenses/` | Original school media, responsive image variants, local fonts and licence notices |
| `scripts/build.cjs`, `scripts/server.cjs` | Reproducible build and gzip/project-prefix preview server |
| `tests/site.cjs`, `tests/premium.cjs`, `tests/loading.cjs` | 60 core + 35 premium + 24 loading-screen behaviour, failure-recovery, privacy and accessibility checks |
| `lighthouserc.cjs`, `.github/workflows/` | Automated tests and deployed-site Lighthouse monitoring |

## Verification

The version-3.1 regression suite contains **119 checks** in Chromium: 60 core, 35 premium and 24 loading-screen checks. It covers:

- Open loading screen at **320, 390, 768 and 1440 px**, actual readiness versus stalled requests, skip/Escape focus, stylesheet/script/font/photo failure, independent critical styling, no-JavaScript fallback, motion preferences, deep links, history/printing and offline reload.
- All three enquiry steps at **320, 375, 768 and 1440 px** with Axe checks, safe review/escaping, editable back navigation, reset confirmation, copy fallback, exact downloaded content, explicit reminder consent and a genuinely offline enquiry flow.
- Story keyboard controls and image retry, all 11 contents links, 14 lightweight thumbnails, filter synchronisation, photo zoom/panning, focus restoration and keyboard selection.
- All eight chapters at **320, 360, 375, 390, 414, 600, 768, 820, 1024, 1280, 1440 and 1920 px**, with no document overflow.
- Axe WCAG 2 A/AA and 2.1 A/AA scans of all eight chapters at mobile/desktop sizes, all four desk tabs, settings/offline dialogs and ten content dialogs.
- Navigation, direct links, Back/Forward, search destination focus, mobile focus containment, audience shortcuts and admission handoff.
- Resource filtering/favourites, existing saved-data compatibility, explicit opt-in/reload persistence, reminder create/edit/delete, UTC conversion, import validation and inert user-entered markup.
- Contact email-draft preparation, all 14 gallery image identities, slideshow behaviour, reading modes, optional effects and both kinds of printing.
- A genuinely offline deep-link reload under a GitHub Pages-style project prefix, followed by clearing only that project's cache.
- Retained external destinations, no password inputs, no runtime errors in checked flows, reproducible bundles and no third-party runtime dependencies.

Automated checks are not an accessibility certification or a guarantee of identical behaviour in every browser. Screen-reader, Safari/iOS and real-device review remain worthwhile. Portal authentication, email delivery and school-side systems are **not** tested by this suite.

Lighthouse results are individual lab measurements, not a promised real-world speed increase or accessibility certification. The Lighthouse workflow waits for the matching deployed HTML, CSS, JS and worker, runs two production audits and uploads the reports. Thresholds are 85 performance and 95 for the other categories to catch regressions without promising perfect scores.

## Data and offline boundaries

- Existing `mamss.desk.v1` data and version-1 JSON backups remain compatible. No destructive migration is performed.
- Nothing is saved persistently until the visitor opts in. Data stays in that browser; there is no cloud sync, account or school submission. Do not put sensitive records into local reminders.
- Reading settings respect reduced motion. Optional 3D defaults off; an existing explicit preference is retained.
- Offline caching is a separate opt-in. It caches this public project, not external portals. Cache names include the service worker's scope path. Cleanup only removes owned caches; other projects on the same origin are left alone.
- Core public content and desk can work offline. Unvisited media and optional effects might still need a connection. Existing opt-in workers are offered updates; new visitors are not automatically registered.
- Guided visit-enquiry answers are held only in this page and cleared by reset/reload. Closing the dialog retains them for this page session. Resetting an enquiry does not delete reminders already explicitly added to the desk. No visitor name, email address or student record is required by the guided planner.
- Contact forms prepare an email draft for review and opening in the user's mail application. They do not send messages. Checklists are not admission applications; reminders are not school-confirmed appointments.

See [ADVANCED-FEATURES.md](ADVANCED-FEATURES.md) for tool behaviour and [FEATURE-COVERAGE.md](FEATURE-COVERAGE.md) for retained content/service destinations.

## Content sources


Original content provenance (recorded 20 September 2026):

- https://www.mamss.com.ng/
- https://schoolsnigeria.com.ng/mamss/
- https://schoolsnigeria.com.ng/mamss/read/mater-misericordiae-secondary-school-port-harcourt-20262027-admission
- https://schoolsnigeria.com.ng/mamss/read/official-working-visit-at-mater-misericordiae-secondary-school-1
- Original school media directory: https://schoolsnigeria.com.ng/mamss/uploads/gallery/media/

All photography comes from the original school site. No stock or AI-generated replacement photography was used. Photos were resized, compressed, and cropped for layout. The original school crest was extracted from the admissions flyer; request a high-resolution transparent official logo for future brand updates.

Contact details, entry classes, examination subjects, and the top published JAMB score were transcribed from the school's admission/results flyers. The flyer lists 30 May, 25 July, 29 August, and 12 September 2026 as entrance examination dates. These are past dates as of this review. The older text announcement lists a different, also past, February date. The redesign therefore asks families to call for current admission arrangements instead of advertising an upcoming exam or guaranteed availability.

Repeated carousel clones have been consolidated rather than duplicated. Statistics and all four testimonials from the source are restored with visible source qualifications; they are not independently verified. Automatically opening advertisements are replaced by an on-demand announcement viewer. No new success statistics, fees, academic guarantees, or testimonials were invented. Promotional headlines and supporting copy were rewritten, while the principal's expanded welcome message was retained.

## Maintenance and school verification

School management should verify current admission dates, fees, availability, contacts, leadership and educational claims; confirm student-photo permissions; supply an official high-resolution crest and approved privacy text; and provide missing history, anthem, newsletters, calendars and assignments. Publishing this front end does not establish those approvals or invent missing content.

GitHub Pages serves `main` at the repository root; `.nojekyll` preserves the static structure. Keep all deployed relative paths intact. For this release, runtime URLs use `?v=3.1` and the scoped worker cache is `mamss-public-v9:<scope-path>`. Keep the HTML and worker’s precache URLs aligned, bump the worker version when changing the shell, rebuild, run the suite, and verify the live deployment. The hosting provider controls HTTPS, compression and HTTP security headers.

A CMS, authentication, online applications, payments, email delivery, push notifications, shared calendars or cloud synchronisation would require separately authorised integrations. No access tokens, credentials or private school records belong in this public repository.
