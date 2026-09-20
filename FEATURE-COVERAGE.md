# Original website feature coverage

Reviewed against the rendered public site at **https://schoolsnigeria.com.ng/mamss/**, which is embedded by **https://www.mamss.com.ng/**. Review date: **20 September 2026**.

This inventory records the original content and service destinations retained by the redesign. Version 2 reorganises them into eight focused chapters without recreating or migrating private systems. Current reproducible verification is documented in README.md and tests/site.cjs; the historical checks below describe the earlier restoration.

## Navigation and school information

| Original feature | Updated implementation |
|---|---|
| Home | Responsive homepage and brand/home link |
| Our History | Our school menu → history availability dialog. The original link points to the homepage and has no history article; no history has been invented. |
| Vision, Mission & Values | Complete dedicated section with the original vision and mission and all ten values |
| Management Team | Four-person administrative board with original school portraits |
| School Anthem | Our school menu → availability dialog. Original menu has no anthem text/audio destination; requests go to the school. |
| School Facilities | Dedicated keyboard-accessible tabs for ICT, science/art, internet/security, and student environment |
| Admission Procedure | Full admission chapter with class-aware checklist handoff, plus admission dialog, entry-class guidance, form collection details, telephone links, flyer download, and past-date warning |
| Principal welcome | Original expanded message and principal photo |
| Male and female students | Both original student spotlight images and descriptions |
| Why choose MAMSS? | Five original priorities retained in their own section; security arrangements explicitly require school confirmation |
| School statistics / animated counters | 3,000 graduates, 60 certified teachers, 120 facilities, and 700 students, as published by the source. Visible source qualification; reduced-motion-aware counters. |
| Parent/alumni testimonials | All four unique source testimonials, names, roles, original avatar image, and previous/next controls; source qualification included |

## Slideshow, notices, photographs, and news

| Original feature | Updated implementation |
|---|---|
| Hero photo carousel | All 12 unique original banner photos; previous, next, play/pause, slide count, pause while hidden/hovered/focused; playback starts only when requested |
| Rotating promotional lines | All 15 original promotional lines retained in the photo label rotation |
| Latest-news ticker | Static accessible noticeboard entry, announcement dialog, news section, and original archive link rather than forced scrolling |
| Admission/results pop-up | On-demand announcement dialog with both original posters, poster selector, and downloads; no unsolicited pop-up |
| JAMB achievement flyer | Original flyer and published top score retained |
| School photos / lightbox | Expanded 14-image school gallery, category filtering, captions, previous/next, and arrow-key navigation |
| Official working visit | Expanded article with original visit date (29 April 2026), publication date (2 June 2026), three original photos, and source link |
| News & Events | Local news cards plus original archive link |
| PTA notice | Original 6 October notice retained; year, time, and venue are not published in that article, so the site asks users to confirm rather than assigning a date |

## Existing online services

All external service links open separately. No portal usernames, passwords, student records, result PINs, or exam answers are collected by this redesign.

| Feature | Official/source-linked destination |
|---|---|
| Check Result | https://myschoolz-001-site16.rtempurl.com/Mater_Misericordiae/result-verify.aspx |
| Additional footer result link | https://myschoolz-001-site16.rtempurl.com/materresults/ |
| School management portal | https://myschoolz-001-site16.rtempurl.com/Mater_Misericordiae/ |
| CBT class selection | https://schools.sch.ng/mamsscbt/Y1/ |
| CBT student login | https://schools.sch.ng/mamsscbt/Y1/login.php |
| CBT administrator login | https://schools.sch.ng/mamsscbt/Y1/admin_login.php |
| CBT examiner/staff login | https://schools.sch.ng/mamsscbt/Y1/teacher_login.php |
| E-library gateway | https://schoolsnigeria.com.ng/mamss/elibrary/ |
| E-library teacher/user login | https://schoolsnigeria.com.ng/mamss/elibrary/login.php |
| Original footer e-library link | Removed — `reogis.org` no longer resolves (NXDOMAIN, checked 20 September 2026). Use the E-library gateway above. |
| Website admin login | https://schoolsnigeria.com.ng/mamss/site/login |
| Original school user login | https://schoolsnigeria.com.ng/mamss/site/userlogin |
| Original user password recovery | https://schoolsnigeria.com.ng/mamss/site/ufpassword |

The original header labelled the CBT class selector as “Admin Login”. Both the actual class selector and the actual admin login from the footer are now labelled clearly. The original header “Examiner” entry was an empty anchor; the updated staff link is taken from the official CBT class selection page.

## Parent services and contact

| Original feature | Updated implementation |
|---|---|
| Submit Contact Form | Validated form with name, email, phone, subject, and message. Prepares an explicit email draft, offers email-app handoff and copying. No false submission confirmation. The original menu linked only to the homepage. |
| Complaints | Direct link to the original functioning complaint form at https://schoolsnigeria.com.ng/mamss/page/complain plus optional local email draft preparation |
| Newsletters | Availability notice and school email request. Original links return to the homepage or an empty anchor; no newsletter files were available there. |
| School calendar | Published examination-date table and PTA notice with clear date caveats. No term dates invented. The original calendar menu points to the homepage. |
| Holiday assignments | Link to the original source resource page (the gallery) plus instructions to request current assignments. No actual assignment downloads were published there. |
| School email | mailto:matermesericordiae@gmail.com |
| General phone | 0901 365 3629 |
| Admissions phones from original flyer | 0703 789 8216, 0905 733 3259, 0810 024 9164 |
| WhatsApp chat widget | Direct contact link: https://wa.me/2349013653629 |
| Facebook | Original official page link retained |
| Address | No. 2 Arochukwu Street, Rumuomasi, Port Harcourt, with Maps directions |
| Back to top | Footer home/top anchor |
| Other original social icons | Original Twitter, Google+, YouTube, LinkedIn, Instagram, and Pinterest icons are empty `#` links. No destination was invented; add verified profiles when supplied. |

A new **searchable resource hub** groups 17 resource entries for students, parents, and staff. Dropdown navigation also provides direct access to the most important services.

## Important boundaries

- This is a working public-facing redesign, not a migration of private school databases or a replacement login system.
- External services keep their own accounts, authentication, storage, availability, and policies. No credentials were used and no private accounts were accessed during the review.
- The local contact form drafts an email; it does not send email or store submissions. Direct complaint submissions remain on the original school system.
- Unpublished history, anthem lyrics/audio, newsletters, term-calendar data, and assignment files must be supplied by the school before those content areas can be completed.
- Statistics, testimonials, dates, contacts, leadership, and image permissions require school approval before launch.
- Facebook/WhatsApp/maps/mail apps and official portals work in the live preview or a downloaded browser copy; restricted file viewers may block external navigation.

## Checks performed

- No JavaScript errors during interaction tests.
- All local images loaded without broken assets.
- No horizontal overflow at 320, 390, 600, 768, 1024, and 1440 pixels.
- Hero photo next/play/pause, facility tabs and arrow-key navigation, testimonial controls, resource search/filter/empty state, announcement-poster switching, all added resource dialogs, contact draft generation, and mobile portal navigation tested.
- Automated axe WCAG 2 A/AA and WCAG 2.1 AA checks found no violations on the expanded desktop homepage or the contact dialog at test time. This is not a full accessibility certification.

## Subsequent advanced improvements

The restored features above are retained. See `ADVANCED-FEATURES.md` for the new School Desk, site-wide search, personal planner, saved resources, optional local storage, reading controls, and public offline mode. These additions do not replace the school’s private systems.
