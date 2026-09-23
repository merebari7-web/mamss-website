/* Real chapter addresses: documents, search metadata, navigation and offline. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  cp = require("node:child_process"),
  http = require("node:http"),
  pp = require("puppeteer"),
  serve = require("../scripts/server.cjs");
const root = path.resolve(__dirname, "..");
const chapters = [
  ["school", "our-school", "Our school | MAMSS"],
  ["learning", "learning", "Learning | MAMSS"],
  ["life", "school-life", "School life | MAMSS"],
  ["admissions", "admissions", "Admissions | MAMSS"],
  ["resources", "resources", "Resources & portals | MAMSS"],
  ["desk", "school-desk", "My school desk | MAMSS"],
  ["contact", "contact", "Contact | MAMSS"],
];
let passed = 0,
  failed = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log("PASS", name);
  } catch (e) {
    failed++;
    console.error("FAIL", name, e.stack);
  }
}
(async () => {
  const server = serve("/mamss-website/");
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/mamss-website/`;
  const browser = await pp.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const get = (url) =>
    new Promise((resolve) => {
      http
        .get(url, (res) => {
          res.resume();
          resolve(res.statusCode);
        })
        .on("error", () => resolve(0));
    });
  async function page(url, width = 1440) {
    const context = await browser.createBrowserContext(),
      p = await context.newPage();
    p.errors = [];
    p.bad = [];
    p.on("pageerror", (e) => p.errors.push(e.message));
    p.on("response", (r) => {
      if (r.status() >= 400) p.bad.push([r.status(), r.url()]);
    });
    p.on("dialog", (d) => d.dismiss());
    await p.setViewport({ width, height: 900 });
    await p.goto(base + url, { waitUntil: "networkidle0" });
    await p.waitForFunction(() => !!window.MAMSS);
    return p;
  }
  async function close(p) {
    assert.deepEqual(p.errors, [], "console errors");
    assert.deepEqual(p.bad, [], "failed requests");
    await p.browserContext().close();
  }
  async function scan(p) {
    await p.addScriptTag({
      path: path.join(root, "node_modules/axe-core/axe.min.js"),
    });
    return p.evaluate(async () => {
      const r = await axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      });
      return r.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }));
    });
  }
  try {
    await test("chapter documents regenerate byte-for-byte from the sources", () => {
      const files = [
        "index.html",
        ...chapters.map(([, slug]) => `${slug}/index.html`),
        "sitemap.xml",
        "site.min.css",
        "site.min.js",
      ];
      const before = files.map((f) => fs.readFileSync(path.join(root, f)));
      cp.execFileSync(process.execPath, ["scripts/build.cjs"], { cwd: root });
      files.forEach((f, i) =>
        assert.deepEqual(fs.readFileSync(path.join(root, f)), before[i], f),
      );
      for (const [, slug] of chapters)
        assert.equal(fs.existsSync(path.join(root, slug, "index.html")), true, slug);
    });
    await test("every chapter document is served at its own address", async () => {
      for (const [, slug] of chapters)
        assert.equal(await get(base + slug + "/"), 200, slug);
      assert.equal(await get(base), 200);
    });
    for (const [key, slug, title] of chapters)
      await test(`${slug}/: opens its own chapter with page-specific metadata`, async () => {
        const p = await page(slug + "/");
        assert.equal(await p.evaluate(() => MAMSS.current), key);
        assert.equal(await p.evaluate(() => document.title), title);
        assert.equal(
          await p.$$eval("[data-page]", (es) => es.filter((e) => !e.hidden).length),
          1,
        );
        assert.equal(
          await p.$eval("[data-page].is-active h1", (e) => e.getClientRects().length > 0),
          true,
        );
        assert.equal(await p.$eval('link[rel="canonical"]', (e) => e.href), `https://merebari7-web.github.io/mamss-website/${slug}/`);
        const meta = await p.evaluate(() => ({
          description: document.querySelector('meta[name="description"]')?.content,
          ogURL: document.querySelector('meta[property="og:url"]')?.content,
          ogImage: document.querySelector('meta[property="og:image"]')?.content,
          types: [...document.querySelectorAll('script[type="application/ld+json"]')].map(
            (s) => JSON.parse(s.textContent)["@type"],
          ),
        }));
        assert.ok(meta.description.length > 40);
        assert.equal(meta.ogURL, `https://merebari7-web.github.io/mamss-website/${slug}/`);
        assert.ok(meta.ogImage.includes("/assets/"));
        assert.deepEqual(meta.types, slug === "admissions" ? ["BreadcrumbList", "FAQPage"] : ["BreadcrumbList"]);
        await close(p);
      });
    for (const width of [320, 768, 1440])
      await test(`${width}px: every chapter document fits the viewport`, async () => {
        const p = await page("admissions/", width);
        for (const [, slug] of chapters) {
          await p.goto(base + slug + "/", { waitUntil: "networkidle0" });
          assert.equal(
            await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
            false,
            slug,
          );
        }
        await close(p);
      });
    await test("all internal links on every document resolve to a real page", async () => {
      const p = await page("");
      const documents = ["", ...chapters.map(([, slug]) => slug + "/")];
      const addresses = new Set([base]);
      for (const doc of documents) {
        await p.goto(base + doc, { waitUntil: "networkidle0" });
        const hrefs = await p.evaluate(() =>
          [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
        );
        for (const href of hrefs) {
          if (/^(https?:|mailto:|tel:|data:)/.test(href)) continue;
          try {
            addresses.add(new URL(href, base + doc).href.split("#")[0]);
          } catch { /* skip unparsable values */ }
        }
      }
      for (const address of addresses)
        assert.equal(await get(address), 200, address);
      await close(p);
    });
    await test("the home document switches chapters without leaving the page", async () => {
      const p = await page("");
      await p.evaluate(() => (window.stillHere = true));
      await p.click('#navigation > a[href="school-life/"]');
      assert.equal(await p.evaluate(() => MAMSS.current), "life");
      assert.equal(await p.evaluate(() => location.pathname.endsWith("/school-life/")), true);
      assert.equal(await p.evaluate(() => window.stillHere), true);
      assert.equal(
        await p.$eval('#navigation > a[href="school-life/"]', (e) => e.getAttribute("aria-current")),
        "page",
      );
      await p.goBack();
      await p.waitForFunction(() => MAMSS.current === "home");
      assert.equal(await p.evaluate(() => location.pathname.endsWith("/mamss-website/")), true);
      await close(p);
    });
    await test("a real address with a section scrolls straight to that section", async () => {
      const p = await page("");
      await p.click(".nav-dropdown:first-of-type > summary");
      await p.click('#navigation a[href="our-school/#why-mamss"]');
      assert.equal(await p.evaluate(() => MAMSS.current), "school");
      await wait(120);
      assert.equal(await p.evaluate(() => document.activeElement.id), "why-mamss");
      await close(p);
    });
    await test("old #hash deep links on the home document still open their chapter", async () => {
      const p = await page("#admissions");
      assert.equal(await p.evaluate(() => MAMSS.current), "admissions");
      await p.evaluate(() => MAMSS.go("contact"));
      await p.goBack();
      await p.waitForFunction(() => MAMSS.current === "admissions");
      await close(p);
    });
    await test("chapter documents follow cross-page links with real navigations", async () => {
      const p = await page("learning/");
      await Promise.all([
        p.waitForNavigation({ waitUntil: "networkidle0" }),
        p.click('#navigation a[href="../resources/"]'),
      ]);
      assert.equal(
        await p.evaluate(() => location.pathname.endsWith("/resources/")),
        true,
      );
      assert.equal(await p.evaluate(() => MAMSS.current), "resources");
      await close(p);
    });
    await test("same-chapter section links stay on the chapter document", async () => {
      const p = await page("admissions/");
      await p.evaluate(() => (window.stillHere = true));
      await p.click('.chapter-contents a[href="#admission-faq"]');
      assert.equal(await p.evaluate(() => window.stillHere), true);
      assert.equal(await p.evaluate(() => MAMSS.current), "admissions");
      await wait(120);
      assert.equal(
        await p.evaluate(() => document.activeElement.id),
        "admission-faq",
      );
      await close(p);
    });
    await test("site search on a chapter document travels to the right page", async () => {
      const p = await page("learning/");
      await p.keyboard.down("Control");
      await p.keyboard.press("k");
      await p.keyboard.up("Control");
      await p.type("#global-search", "school desk");
      await Promise.all([
        p.waitForNavigation({ waitUntil: "networkidle0" }),
        p.keyboard.press("Enter"),
      ]);
      assert.equal(
        await p.evaluate(() => location.pathname.endsWith("/school-desk/")),
        true,
      );
      await close(p);
    });
    await test("the visit planner works from the admissions document", async () => {
      const p = await page("admissions/");
      await p.click('[data-premium="visit"]');
      await p.select("#visit-entry", "JSS 1");
      await p.click('#visit-form button[type=submit]');
      await p.click('#visit-form button[type=submit]');
      assert.equal(await p.$eval("#visit-summary", (e) => e.value.includes("JSS 1")), true);
      await Promise.all([
        p.waitForNavigation({ waitUntil: "networkidle0" }),
        p.click("#visit-desk"),
      ]);
      assert.equal(
        await p.evaluate(() => location.pathname.endsWith("/school-desk/")),
        true,
      );
      await close(p);
    });
    await test("each chapter document passes accessibility checks", async () => {
      const p = await page("our-school/", 390);
      for (const [, slug] of chapters) {
        await p.goto(base + slug + "/", { waitUntil: "networkidle0" });
        assert.deepEqual(await scan(p), [], slug);
      }
      await close(p);
    });
    await test("a chapter document works without JavaScript", async () => {
      const context = await browser.createBrowserContext(),
        p = await context.newPage();
      await p.setJavaScriptEnabled(false);
      await p.setViewport({ width: 390, height: 900 });
      await p.goto(base + "admissions/", { waitUntil: "networkidle0" });
      assert.equal(await p.$eval("#mamss-loader", (e) => e.open), false);
      assert.equal(await p.$eval("h1", (e) => e.getClientRects().length > 0), true);
      await p.browserContext().close();
    });
    await test("the opt-in offline copy includes the chapter documents", async () => {
      const p = await page("");
      await p.evaluate(() => showOfflineTools());
      await p.click("#enable-offline");
      await p.waitForFunction(() =>
        document.querySelector("#offline-status").textContent.startsWith("Offline website ready"),
      );
      await p.waitForFunction(() => !!navigator.serviceWorker.controller);
      await p.keyboard.press("Escape");
      await p.setOfflineMode(true);
      await p.goto(base + "admissions/", { waitUntil: "networkidle0" });
      await p.waitForFunction(() => !!window.MAMSS);
      assert.equal(await p.evaluate(() => MAMSS.current), "admissions");
      await p.goto(base + "school-desk/", { waitUntil: "networkidle0" });
      assert.equal(await p.evaluate(() => MAMSS.current), "desk");
      await p.setOfflineMode(false);
      await close(p);
    });
    await test("sitemap, robots and the 404 page describe the real addresses", async () => {
      const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
      for (const [, slug] of chapters)
        assert.ok(sitemap.includes(`https://merebari7-web.github.io/mamss-website/${slug}/`), slug);
      assert.ok(sitemap.includes("https://merebari7-web.github.io/mamss-website/</loc>"));
      const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
      assert.ok(robots.includes("Sitemap: https://merebari7-web.github.io/mamss-website/sitemap.xml"));
      const notFound = fs.readFileSync(path.join(root, "404.html"), "utf8");
      for (const [, slug] of chapters)
        assert.ok(notFound.includes(slug + "/"), slug);
      assert.equal(await get(base + "robots.txt"), 200);
      assert.equal(await get(base + "sitemap.xml"), 200);
    });
  } catch (e) {
    failed++;
    console.error(e);
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
  console.log(`\n${passed} chapter-page checks passed; ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
