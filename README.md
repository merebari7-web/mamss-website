# MAMSS website redesign

A responsive, working front-end redesign of Mater Misericordiae Secondary School's public website, expanded to retain the original public sections and service links. The original live website has not been modified.

**New: see `ADVANCED-FEATURES.md` for School Desk, global search, personal planning, opt-in device saving, reading controls, and offline support.**

**See `FEATURE-COVERAGE.md` for the full original-to-redesign feature checklist, external service destinations, content gaps, and test results.**

## Preview / run

Open `index.html` in a modern browser, or serve this directory:

```sh
python -m http.server 3000 --bind 0.0.0.0
```

No build system, npm packages, CDN, API keys, or database are required. Images and fonts are served locally. Personal desk data is kept only for the current visit unless the user explicitly opts into browser saving. Offline caching is also opt-in; external school services remain online-only. A separate `MAMSS-preview.html` is supplied as a self-contained version.

## Included

- Layered 3D hero parallax, perspective section/card reveals, desktop pointer tilt, and photo-depth scrolling
- Independent 3D toggle with system/site reduced-motion support; native scrolling is preserved

- Site-wide keyboard search (Ctrl/Command + K) with service/school/news filters
- Personal School Desk: role-based overview, admission checklist, editable planner, and saved resources
- Printable/downloadable admission checklist and `.ics` calendar exports
- Optional browser-only saving, validated backup/restore, and clear-data controls
- Text size, contrast, and reduced-motion settings
- Opt-in offline public-site caching and installable-web-app manifest
- Responsive image variants and smaller WOFF2 fonts

- Burgundy, cream, and gold visual identity with original school photography
- Responsive dropdown navigation and layouts, tested at widths from 320 to 1440 pixels
- Result portals, school management login, student/admin/staff CBT access, user login/recovery, and e-library links
- Searchable 17-entry resource hub with student, parent, and staff filters
- Full mission, vision, values, leadership board, student spotlights, published statistics, and testimonials
- 12-photo controllable hero slideshow, 14-photo gallery, and on-demand admission/results announcements
- Parent resource dialogs, PTA and published calendar notices, email-draft contact form, and original complaint form link
- Official WhatsApp, Facebook, general telephone, and email contacts
- Reorganised school introduction, principal's welcome, academics, facilities, achievements, school life, news, FAQs, and contact information
- Admissions information dialog, entry-class guidance, and downloadable original school flyer
- Category-filtered photo gallery with modal viewer, keyboard navigation, and captions
- Principal's message, academic information, and news dialogs
- Click-to-call telephone links and Google Maps directions
- Image optimisation to WebP, lazy loading, and locally hosted fonts
- Semantic headings, skip link, visible focus indicators, native accessible dialogs, and reduced-motion support
- Page title and description metadata

## Content sources

Reviewed 20 September 2026:

- https://www.mamss.com.ng/
- https://schoolsnigeria.com.ng/mamss/
- https://schoolsnigeria.com.ng/mamss/read/mater-misericordiae-secondary-school-port-harcourt-20262027-admission
- https://schoolsnigeria.com.ng/mamss/read/official-working-visit-at-mater-misericordiae-secondary-school-1
- Original school media directory: https://schoolsnigeria.com.ng/mamss/uploads/gallery/media/

All photography comes from the original school site. No stock or AI-generated replacement photography was used. Photos were resized, compressed, and cropped for layout. The original school crest was extracted from the admissions flyer; request a high-resolution transparent official logo before launch.

Contact details, entry classes, examination subjects, and the top published JAMB score were transcribed from the school's admission/results flyers. The flyer lists 30 May, 25 July, 29 August, and 12 September 2026 as entrance examination dates. These are past dates as of this review. The older text announcement lists a different, also past, February date. The redesign therefore asks families to call for current admission arrangements instead of advertising an upcoming exam or guaranteed availability.

Repeated carousel clones have been consolidated rather than duplicated. Statistics and all four testimonials from the source are restored with visible source qualifications; they are not independently verified. Automatically opening advertisements are replaced by an on-demand announcement viewer. No new success statistics, fees, academic guarantees, or testimonials were invented. Promotional headlines and supporting copy were rewritten, while the principal's expanded welcome message was retained.

## Before publishing

1. School management must verify current admission dates, fees, places, contact numbers, school address, leadership, and all educational claims.
2. Confirm permission to republish all photographs, particularly student photographs, in accordance with school policies and applicable privacy obligations.
3. Replace the cropped logo with an official high-resolution school crest.
4. Replace the preview privacy information with the school's approved privacy notice.
5. Connect any required CMS, parent portal, admissions database, email delivery, or payment system separately. This project does not include those systems.
6. Set production caching, compression, security headers, HTTPS, canonical URL, social metadata, sitemap, and redirects in the actual hosting environment. Do not deploy development HTTP servers for production.
7. Reconfirm image permissions and font licences before distribution.

## Testing

Checked in Chromium:
- No JavaScript errors during interaction tests
- No broken images after loading all lazy images
- No horizontal overflow at 320, 375, 600, 768, 1024, or 1440 pixels
- Admissions class selection, modal opening/closing, gallery filtering, arrow-key photo navigation, FAQs, and mobile navigation
- Automated axe WCAG 2 A/AA and WCAG 2.1 AA checks: no detected violations on the desktop home page and admissions dialog at time of testing. This is not a full accessibility certification; human testing remains recommended.

## Files

- `index.html` — public page
- `styles.css` — responsive layout and visual design
- `app.js` — core navigation, dialogs, gallery, and admission interactions
- `features.js` — restored original-site services, content interactions, contact draft preparation, and resource hub
- `features.css` — styling for additional original-site features
- `advanced.js` — School Desk, site-wide search, reading settings, and offline/device controls
- `advanced.css` — School Desk layout, reading controls, responsive search, and print styles
- `motion.js` and `motion.css` — lightweight native-scroll 3D effects and depth controls
- `manifest.webmanifest` and `sw.js` — optional install/offline support for hosted deployments
- `ADVANCED-FEATURES.md` — new feature guide, data boundaries, test results, and deployment guidance
- `FEATURE-COVERAGE.md` — feature checklist, official service destinations, and publication gaps
- `fonts.css` — locally hosted font declarations
- `assets/` — original school images optimised for the website, crest, and fonts
- `licenses/` — font licence notices

## GitHub Pages and MAMSS Prep

Publish target: https://merebari7-web.github.io/mamss-website/

The existing MAMSS Prep site at https://merebari7-web.github.io/mamss-prep/ is linked from the Learning and Portals menus, a dedicated learning callout, the footer, the searchable resource directory, and student School Desk recommendations. It remains hosted separately and has not been replaced.

This repository contains only public website files and documentation. No access token is included. GitHub Pages serves the main branch root; `.nojekyll` preserves the static site structure.
