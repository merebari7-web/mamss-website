# Advanced improvements — premium school website, version 3.1

## Version 3.1 — loading screen

The dependency-free welcome is embedded by the build, before the main stylesheet/runtime. The original crest, CSS/SVG orbit and five-check progress display are decorative and informational, not a login or a pretend download counter. `loading.js` observes actual stylesheet, app, font, document and opening-photo readiness; the application signals readiness only after its complete bundle has executed.

It has no artificial minimum wait. Skip/Escape, a 3.5-second safety deadline, asset failures, no-JavaScript fallback, reduced motion, background/history handling and print cleanup prevent an indefinite or repeated interruption. A deep link uses its own opening view rather than waiting for the hidden homepage picture. Native-dialog semantics contain focus; skip restores main-content focus. Offline access remains separately opt-in, and the inline screen adds no extra offline dependencies. It creates no storage entries; only a previously consented School Desk motion preference is read.

The 24 dedicated tests exercise these cases in real Chromium, including Axe scans while the screen is actually open, not merely after it disappears.

## Version 3 additions

### Guided visit enquiry
- Launch from the homepage, admission chapter, invitation or Contact visit card.
- Three steps: interest/preferences → questions → reviewed enquiry and optional personal follow-up.
- Only JSS 1, JSS 2, SS 1 and SS 2 are offered as entry classes, plus a general enquiry. A proposed date cannot be in the past; a preferred time requires a date. Neither establishes school availability.
- Select discussion topics and optionally write a question (400 characters; rendered as text, never executable HTML). Do not include sensitive information.
- Open a `mailto:` draft in an email app, copy with a manual-selection fallback, or download the exact reviewed plan as UTF-8 text. The website has no sending service or submission endpoint.
- A dated plan may explicitly add one follow-up reminder. Duplicate clicks are blocked, the existing 100-reminder cap applies, and the same School Desk consent and export rules govern it.
- Answers live only in page memory, never storage or backups. Closing retains answers; reset/reload clears them. Reset is confirmed and does not delete previously created reminders.
- No new permission prompt, account, tracking or dependency is introduced. The bundled wizard works after an opt-in offline reload; sending email and school confirmation require separate services.

### School stories and chapter contents
- Original photographs illustrate Learning, Community and Faith; nothing depicts a fabricated facility.
- Tabs support Left/Right, Home/End, one tab stop, proper labels and a live status. Each story links to the relevant chapter.
- Unavailable photography shows a retry state. Lazy images and the existing responsive variants keep the initial page lightweight.
- Eleven contents shortcuts reveal the correct sections using the same router and history/focus management as other internal links.

### Photograph viewer
- Fourteen tiny 160-pixel WebP derivatives are made from the original collection. Thumbnails are created only when a photograph is opened, and match the current filter.
- Roving keyboard focus supports Left/Right and Home/End. The selected thumbnail and count update together.
- Enlarge/fit controls permit native scrolling and keyboard panning, rather than hijacking arrow keys while zoomed. Moving to a different photo or closing resets zoom.
- Original photo captions, large files, native-dialog focus containment, Escape dismissal and focus restoration remain intact.

## Retained version 2 integration

The School Desk data contract and all tools below are retained. The website now has eight focused chapters, a new admission guide, audience shortcuts, accessible mobile quick navigation and minified startup bundles. Search and old section hashes reveal the correct chapter before focusing it. The school site and MAMSS Prep remain separate. See README.md for the current 119-check reproducible suite and deployment instructions.

Optional 3D is now **off by default** and its CSS/JS load only when enabled; an existing saved preference is preserved. Effects do not control the new hero layout. Offline data is isolated by project scope. The default shell does not preload optional motion files; previously visited optional resources can be cached.

## Tool behaviour

### 1. Site-wide search
- Search public school information, admission guidance, resources, notices, and services.
- Open with **Ctrl/Command + K**, the Search button, or `/` when not typing into a form.
- Filter by services, school information, and news.
- Keyboard navigation supports arrow keys, Enter, and Escape.
- Queries are processed locally; no search query is sent to a server.
- Private school portals and student records are not indexed.

### 2. My school desk
A local-first personal workspace with four tabs:
- **Overview:** role-based shortcuts for parents, students, and staff; admission progress; upcoming personal reminders.
- **Admission checklist:** six planning steps drawn from published school guidance, entry-class selection, progress tracking, printable checklist, and text download.
- **My planner:** month navigation, keyboard-accessible date selection, personal reminder creation/editing/deletion, and a separate display of published past entrance examination dates.
- **Saved resources:** star resources in the directory or dashboard to keep their links together.

The desk is not a school login, application system, result database, booking system, or official school record. Completing a checklist step does not notify the school or indicate admission approval.

### 3. Calendar exports
- Export a single reminder or all personal reminders as an `.ics` calendar file.
- All-day reminders use calendar dates; timed reminders interpret input in **Africa/Lagos (UTC+01:00)** and export the corresponding UTC time.
- Exported reminders are explicitly labelled personal/tentative, not confirmed school appointments.
- No browser notifications or automated reminders are sent.
- The original PTA notice has no confirmed year/time, so it is not silently turned into a confirmed calendar event.

### 4. Optional browser saving and backups
- Default behaviour: desk changes are kept for the current visit only.
- Users must explicitly enable **device saving** to remember desk data in that browser.
- Stored fields: selected role, preferred entry class, checklist progress, saved resource keys, personal reminders, and reading settings.
- No account credentials, result PINs, student records, contact email drafts, or search queries are stored by the desk.
- Device storage is not encrypted by this site and is not synchronised with the school or any cloud service.
- Export a JSON backup, validate/import a backup after confirmation, or clear local data.
- Import validation includes allowed resource keys, task keys, date/time validation, text-length limits, unique reminder IDs, and a maximum of 100 reminders. File size is limited to 150 KB.
- Importing a backup never enables saving without consent.
- User-entered reminder text is rendered safely as text, not executable markup.
- If browser storage is blocked in a sandboxed file viewer, the desk still works for the visit and reports that saving is unavailable.

### 5. Reading and accessibility controls
- Standard, large, and extra-large body text.
- Higher-contrast mode for light surfaces.
- Reduced-motion preference, including transitions, scrolling, counters, and stopping active hero slideshow playback.
- Reading preferences follow the same opt-in storage policy as the desk.
- Native modal dialogs, visible keyboard focus, labelled controls, roving keyboard support for desk/facility tabs and calendar dates, and private live search.
- Page reading-progress indicator and a back-to-top control.

These controls complement browser zoom and assistive technologies. They are not a substitute for a complete manual accessibility assessment.

### 6. Optional offline public website / install support
- `manifest.webmanifest` supplies the app name, icons, shortcuts, and standalone display configuration.
- Offline caching is enabled only when the user requests it.
- `sw.js` precaches the public site shell, local scripts/styles/fonts, the school crest, app icons, and the opening hero image.
- Additional same-origin public images are cached as viewed.
- The service worker does not intercept cross-origin portals, non-GET requests, query-string requests, private application routes, or the external library/CBT/result systems.
- Offline installation requires HTTPS (or localhost for development). It cannot be enabled in a restricted standalone file viewer.
- Existing official results, CBT, e-library, logins, complaint submissions, WhatsApp, and other external services still require internet.
- Clearing device data unregisters this site's worker, disables its current offline interception, and removes this site's offline caches.
- The separately supplied embedded HTML already includes its public images, styles, fonts, and scripts for offline viewing. It does not include the installable service worker.

### 7. Navigation and loading improvements
- A new four-link quick-access strip for results, CBT, the e-library, and School Desk.
- Search, accessibility settings, and School Desk in the top utility bar.
- Star/save actions on the existing searchable resource directory.
- Local WOFF2 fonts: approximately **112,760 bytes**, reduced from **284,656 bytes** of TTF files (about **60% smaller**).
- Responsive 480px/900px WebP variants for 15 original school image families, with native `srcset` on initial images and responsive handling of dynamic images.
- Original school photos are retained; no stock or AI-generated replacement photos have been added.
- Initial images use asynchronous decoding; existing below-the-fold image lazy loading is retained.
- Static HTML/CSS/JavaScript delivery remains free of framework/CDN/API dependencies.

## Earlier tool-level checks

These checks describe the earlier School Desk implementation. The current version-2 reproducible regression coverage is listed in README.md.

Chromium interaction checks included:
- Site-wide search results, no-result state, keyboard opening, arrow navigation, and closing with Escape even while a search input contains text.
- Saving/removing resources and persisted saved-resource counts.
- Checklist changes, class selection, progress, print content generation, and reload persistence after consent.
- Reminder create/edit/delete, safe text rendering, date selection, and calendar export.
- A 14:30 Lagos reminder exports as 13:30 UTC.
- Valid backup import; malformed JSON rejection; imports do not enable saving.
- Device-saving opt-in, opt-out, and clearing data.
- Large text and contrast modes; no horizontal overflow at widths 320, 390, 600, 768, 1024, and 1440 pixels during the responsive checks.
- Offline installation followed by a genuinely offline browser reload; public content and saved personal desk loaded successfully.
- No JavaScript errors during the completed interaction test runs.
- All local images loaded in the online image checks.
- Automated axe WCAG 2 A/AA and WCAG 2.1 AA checks found no violations in the tested desktop page, search dialog, reading-settings dialog, and mobile large-text/high-contrast view. This is not a full accessibility certification or an exhaustive browser/device test.

## Deployment and maintenance

1. Serve the entire repository root over HTTPS. Keep the scripts, styles, manifest, worker, icons, and image variants at their supplied relative paths.
2. Run `npm ci`, then `npm run build` after source changes. Preview using `npm run serve`. Production only needs the checked-in static outputs.
3. Set appropriate production compression, cache headers, and security headers on the actual host. The development preview server is not a production hosting solution.
4. Bump the cache version in `sw.js` whenever the offline public shell is changed. Test upgrades and clearing old caches before release.
5. Have school management confirm current dates, contacts, content, external destinations, photo permissions, and privacy wording before publication.
6. Online applications, appointment confirmations, message delivery, authentication, payments, push notifications, shared calendars, and cloud synchronisation would require separately designed and authorised backend integrations. None is represented as connected on this site.

## 8. Native-scroll 3D animation

Added in `motion.js` and `motion.css`:

- A perspective-tilted hero photograph with separate depth layers for its caption, label, school seal, backing frame, and decorative gold rings.
- Scroll-linked hero parallax and rotation, with photo captions and seal moving at different depths.
- Forward-only perspective reveals for section headings, feature cards, leadership, news, gallery, and School Desk. Text stays fully opaque so its contrast is not reduced by the reveal.
- Small scroll-linked photo shifts within clipped gallery/learning image frames.
- Fine-pointer desktop card tilt and dynamic depth shadows. Hover tilt is disabled on small/coarse-pointer screens.
- A visible **3D on/off** control beside the hero slideshow controls, plus a **3D scroll effects** setting under Accessibility.
- Both the operating system's reduced-motion preference and the site's Reduce motion setting disable the effects. Turning off 3D does not remove or hide content.
- The 3D preference follows the existing opt-in local-saving policy and is supported by backup import/export.
- Native browser scrolling is retained: no wheel/touch interception, artificial scroll container, or scroll-position hijacking.
- Intersection-based active-element tracking, passive scroll/pointer listeners, and requestAnimationFrame updates. Frames stop when settled, while hidden, or while a dialog is open.
- New cards inserted by gallery filters and resource searches are automatically registered. Removed nodes are unregistered.
- Keyboard-focused content settles immediately; pointer-pressed elements keep stable geometry for reliable clicks.
- No external animation framework, WebGL renderer, stock photos, or replacement imagery.
- Print output remains flat and excludes decorative 3D elements.
- Version 2 loads these files only after enabling effects; they are not mandatory offline-shell downloads.

### Motion checks

Tested changing 3D transform matrices with real page scrolling, desktop pointer tilt, site and OS reduced-motion behaviour, the independent 3D switch, dynamically filtered gallery items, and gallery opening. Checked for horizontal overflow at 320, 390, 600, 768, 1024, and 1440 pixels. The completed motion test and existing advanced-feature regression test reported no JavaScript errors. Automated axe checks found no violations in the tested page state. Animation-frame diagnostics confirmed the renderer returns to idle rather than running a permanent loop. These checks are not a guarantee of identical performance on every device.
