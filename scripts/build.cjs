/* Deterministic, dependency-free runtime bundles and chapter documents.
   Authored sources stay editable; every generated file is reproducible. */
const fs = require("node:fs"),
  path = require("node:path"),
  CleanCSS = require("clean-css"),
  terser = require("terser");
const LIVE = "https://merebari7-web.github.io/mamss-website/";
const RELEASE = "4.0";
const RELEASE_DATE = "2026-09-23";
/* Chapter directories mirror the router's slugs in site.js. */
const CHAPTERS = {
  school: {
    slug: "our-school",
    name: "Our school",
    title: "Our school | MAMSS",
    description:
      "Meet the community, vision, values and people behind Mater Misericordiae Secondary School — a Spiritan Catholic school in Rumuomasi, Port Harcourt.",
    image: "visit001.webp",
  },
  learning: {
    slug: "learning",
    name: "Learning",
    title: "Learning | MAMSS",
    description:
      "Junior and senior secondary learning, facilities and academic life at Mater Misericordiae Secondary School in Rumuomasi, Port Harcourt.",
    image: "mater_class.webp",
  },
  life: {
    slug: "school-life",
    name: "School life",
    title: "School life | MAMSS",
    description:
      "Photo gallery, community voices and everyday school life at Mater Misericordiae Secondary School in Rumuomasi, Port Harcourt.",
    image: "mamss_students.webp",
  },
  admissions: {
    slug: "admissions",
    name: "Admissions",
    title: "Admissions | MAMSS",
    description:
      "Admission to JSS 1, JSS 2, SS 1 and SS 2 at Mater Misericordiae Secondary School. Application forms, assessment guidance and how to contact the school office.",
    image: "mamssads2027.webp",
    faq: true,
  },
  resources: {
    slug: "resources",
    name: "Resources & portals",
    title: "Resources & portals | MAMSS",
    description:
      "Official school portals, results checking, the CBT platform, e-library and parent resources for the MAMSS community.",
    image: "a1.webp",
  },
  desk: {
    slug: "school-desk",
    name: "My school desk",
    title: "My school desk | MAMSS",
    description:
      "Your personal admission checklist, planner and saved resources. Private by design — nothing is saved without your permission.",
    image: "visit031.webp",
  },
  contact: {
    slug: "contact",
    name: "Contact",
    title: "Contact | MAMSS",
    description:
      "Contact Mater Misericordiae Secondary School in Rumuomasi, Port Harcourt — phone, WhatsApp, email, directions and visit enquiries.",
    image: "visit005.webp",
  },
};
const PRIMARY = {
  home: "home",
  school: "about",
  learning: "learning",
  life: "school-life",
  admissions: "admissions",
  resources: "resources",
  desk: "school-desk",
  contact: "contact",
};
const slugOf = {};
for (const [key, meta] of Object.entries(CHAPTERS)) slugOf[key] = meta.slug;

function chapterZones(html) {
  const opener =
    /<div aria-label="[^"]*" class="site-page[^"]*" data-page="([^"]+)"/g;
  const zones = [];
  let match;
  while ((match = opener.exec(html))) zones.push({ start: match.index, key: match[1] });
  const mainEnd = html.indexOf("</main>");
  for (let i = 0; i < zones.length; i++)
    zones[i].end = i + 1 < zones.length ? zones[i + 1].start : mainEnd;
  return zones;
}
function idChapters(html, zones) {
  const map = {};
  for (const zone of zones) {
    const slice = html.slice(zone.start, zone.end);
    for (const id of slice.matchAll(/\sid="([^"]+)"/g))
      if (!map[id[1]]) map[id[1]] = zone.key;
  }
  return map;
}
function zoneOf(zones, position) {
  for (const zone of zones)
    if (position >= zone.start && position < zone.end) return zone.key;
  return "shell";
}
/* Cross-chapter links become real addresses; same-chapter section links stay
   as in-page anchors. The transform is idempotent: rewritten links no longer
   match. */
function rewriteHubLinks(html) {
  const zones = chapterZones(html),
    ids = idChapters(html, zones);
  return html.replace(
    /<a\b([^>]*?)href="#([^"]+)"([^>]*)>/g,
    (match, before, id, after, offset) => {
      if (id === "main") return match;
      const chapter = ids[id];
      if (!chapter) return match;
      if (zoneOf(zones, offset) === chapter) return match;
      const address =
        chapter === "home"
          ? id === PRIMARY.home
            ? "./"
            : "./#" + id
          : id === PRIMARY[chapter]
            ? slugOf[chapter] + "/"
            : slugOf[chapter] + "/#" + id;
      return `<a${before}href="${address}"${after}>`;
    },
  );
}
/* On a chapter page every cross-chapter address gains "../" and links to the
   page itself collapse back to in-page anchors. */
function rewriteChapterLinks(html, key) {
  const slugPattern = Object.values(CHAPTERS)
    .map((c) => c.slug)
    .join("|");
  html = html.replace(
    new RegExp(`href="((?:${slugPattern})/)(#[^"]+)?"`, "g"),
    (match, slugPath, hash) => {
      const slug = slugPath.slice(0, -1);
      if (slug === CHAPTERS[key].slug)
        return `href="${hash || "#" + PRIMARY[key]}"`;
      return `href="../${slugPath}${hash || ""}"`;
    },
  );
  html = html.replace(/href="\.(\/(?:#[^"]+)?)"/g, (match, rest) =>
    key === "home" ? match : `href="..${rest}"`,
  );
  return html;
}
/* Shared assets keep working one directory deeper. */
function rewriteChapterAssets(html) {
  return html.replace(
    /(src|href)="(assets\/[^"]+|site\.min\.[a-z]+\?[^"]+|manifest\.webmanifest|motion\.[a-z]+)"/g,
    (match, attr, value) => (value.startsWith("../") ? match : `${attr}="../${value}"`),
  );
}
const jsonScript = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
function breadcrumbFor(key) {
  const meta = CHAPTERS[key];
  return jsonScript({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: LIVE },
      { "@type": "ListItem", position: 2, name: meta.name, item: LIVE + meta.slug + "/" },
    ],
  });
}
function chapterHead(html, key) {
  const meta = CHAPTERS[key],
    url = LIVE + meta.slug + "/";
  let head = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${meta.title}</title>`)
    .replace(
      /<meta content="[^"]*" name="description"\/>/,
      `<meta content="${meta.description}" name="description"/>`,
    )
    .replace(
      /<link href="[^"]*" rel="canonical"\/>/,
      `<link href="${url}" rel="canonical"/>`,
    )
    .replace(
      /<meta content="[^"]*" property="og:title"\/>/,
      `<meta content="${meta.name} — Mater Misericordiae Secondary School" property="og:title"/>`,
    )
    .replace(
      /<meta content="[^"]*" property="og:description"\/>/,
      `<meta content="${meta.description}" property="og:description"/>`,
    )
    .replace(
      /<meta content="[^"]*" property="og:url"\/>/,
      `<meta content="${url}" property="og:url"/>`,
    )
    .replace(
      /<meta content="[^"]*" property="og:image"\/>/,
      `<meta content="${LIVE}assets/${meta.image}" property="og:image"/>`,
    );
  const faqMatch = head.match(
    /<script type="application\/ld\+json">\{"@context": "https:\/\/schema\.org", "@type": "FAQPage"[\s\S]*?<\/script>/,
  );
  head = head.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/g,
    "",
  );
  const structured = [breadcrumbFor(key)];
  if (meta.faq && faqMatch) structured.push(faqMatch[0]);
  return head.replace(
    "<!-- MAMSS LOADING HEAD -->",
    structured.join("") + "\n<!-- MAMSS LOADING HEAD -->",
  );
}
(async () => {
  const styles = [
    "fonts.css",
    "styles.css",
    "features.css",
    "advanced.css",
    "site.css",
    "premium.css",
  ]
    .map((f) => fs.readFileSync(f, "utf8"))
    .join("\n");
  const css = new CleanCSS({ level: 1, rebase: false }).minify(styles);
  if (css.errors.length) throw Error(css.errors.join("\n"));
  fs.writeFileSync("site.min.css", css.styles + "\n");
  const scripts = ["app.js", "features.js", "advanced.js", "site.js", "premium.js"]
    .map((f) => fs.readFileSync(f, "utf8"))
    .join("\n;\n") + ";\nwindow.MAMSSLoading?.check(\"tools\");";
  const js = await terser.minify(scripts, {
    compress: { passes: 2 },
    mangle: false,
    keep_fnames: true,
    format: { comments: false },
  });
  fs.writeFileSync("site.min.js", js.code + "\n");
  const loadingCSS = new CleanCSS({ level: 1, rebase: false }).minify(fs.readFileSync("loading.css", "utf8"));
  if (loadingCSS.errors.length) throw Error(loadingCSS.errors.join("\n"));
  const loadingJS = await terser.minify(fs.readFileSync("loading.js", "utf8"), { compress: true, mangle: true });
  if (!loadingJS.code) throw Error("Loading controller did not build");
  const markup = fs.readFileSync("loading.html", "utf8").trim();
  let html = fs.readFileSync("index.html", "utf8");
  const headMarker = /<!-- MAMSS LOADING HEAD -->[\s\S]*?<!-- \/MAMSS LOADING HEAD -->/;
  const bodyMarker = /<!-- MAMSS LOADING SCREEN -->[\s\S]*?<!-- \/MAMSS LOADING SCREEN -->/;
  if (!headMarker.test(html) || !bodyMarker.test(html)) throw Error("Loading screen build markers are missing");
  html = html.replace(headMarker, () => `<!-- MAMSS LOADING HEAD -->\n<style id="mamss-loading-style">${loadingCSS.styles}</style>\n<!-- /MAMSS LOADING HEAD -->`)
    .replace(bodyMarker, () => `<!-- MAMSS LOADING SCREEN -->\n${markup}\n<script>${loadingJS.code}</script>\n<!-- /MAMSS LOADING SCREEN -->`);
  /* Real addresses for every chapter, in the home document and in each
     chapter's own directory. */
  html = rewriteHubLinks(html);
  fs.writeFileSync("index.html", html);
  const zones = chapterZones(html);
  for (const [key, meta] of Object.entries(CHAPTERS)) {
    if (!zones.some((z) => z.key === key))
      throw Error("Missing chapter markup for " + key);
    /* Splice the other chapters out, last-to-first so earlier offsets stay
       valid within one snapshot of zones. */
    let doc = html;
    for (let i = zones.length - 1; i >= 0; i--) {
      if (zones[i].key === key) continue;
      doc = doc.slice(0, zones[i].start) + doc.slice(zones[i].end);
    }
    doc = chapterHead(doc, key);
    doc = rewriteChapterLinks(doc, key);
    doc = rewriteChapterAssets(doc);
    fs.mkdirSync(meta.slug, { recursive: true });
    fs.writeFileSync(path.join(meta.slug, "index.html"), doc);
  }
  const slugs = ["", ...Object.values(CHAPTERS).map((c) => c.slug + "/")];
  fs.writeFileSync(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${slugs
      .map((slug) => `<url><loc>${LIVE}${slug}</loc><lastmod>${RELEASE_DATE}</lastmod></url>`)
      .join("")}</urlset>\n`,
  );
  console.log(
    "Built CSS",
    Buffer.byteLength(css.styles),
    "bytes; JS",
    Buffer.byteLength(js.code),
    "bytes;",
    Object.keys(CHAPTERS).length,
    "chapter documents + sitemap",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
