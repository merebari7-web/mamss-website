/* Real-browser v2 acceptance checks. No portal credentials or external services. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  cp = require("node:child_process"),
  pp = require("puppeteer"),
  serve = require("../scripts/server.cjs");
const root = path.resolve(__dirname, ".."),
  routes = [
    "home",
    "about",
    "learning",
    "school-life",
    "admissions",
    "resources",
    "school-desk",
    "contact",
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
  async function page(width = 1440, storage, hash = "") {
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
    await p.setRequestInterception(true);
    p.on("request", (r) =>
      r.url().startsWith(base) ||
      r.url().startsWith("data:") ||
      r.url().startsWith("blob:")
        ? r.continue()
        : r.abort(),
    );
    if (storage)
      await p.evaluateOnNewDocument(
        (data) => localStorage.setItem("mamss.desk.v1", JSON.stringify(data)),
        storage,
      );
    await p.goto(base + hash, { waitUntil: "networkidle0" });
    await p.waitForFunction(() => !!window.MAMSS);
    return p;
  }
  async function close(p) {
    await p.browserContext().close();
  }
  async function click(p, selector) {
    await p.waitForSelector(selector, { visible: true });
    await p.$eval(selector, (e) =>
      e.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await p.click(selector);
  }
  async function overflow(p) {
    return p.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
  }
  async function scan(p) {
    await p.addScriptTag({
      path: path.join(root, "node_modules/axe-core/axe.min.js"),
    });
    return p.evaluate(async () => {
      const r = await axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        },
      });
      return r.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      }));
    });
  }
  try {
    await test("build is reproducible and runtime has no external dependencies", () => {
      const before = ["site.min.js", "site.min.css"].map((f) =>
        fs.readFileSync(path.join(root, f)),
      );
      cp.execFileSync(process.execPath, ["scripts/build.cjs"], { cwd: root });
      ["site.min.js", "site.min.css"].forEach((f, i) =>
        assert.deepEqual(fs.readFileSync(path.join(root, f)), before[i]),
      );
      const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
      assert.equal(/<script[^>]+src="https?:/.test(html), false);
    });
    for (const width of [
      320, 360, 375, 390, 414, 600, 768, 820, 1024, 1280, 1440, 1920,
    ])
      await test(`${width}px: all eight chapters fit the viewport`, async () => {
        const p = await page(width);
        for (const route of routes) {
          await p.evaluate((id) => MAMSS.go(id), route);
          assert.equal(await overflow(p), false, route);
          assert.equal(
            await p.$$eval(
              "[data-page]",
              (es) => es.filter((e) => !e.hidden).length,
            ),
            1,
          );
        }
        assert.deepEqual(p.errors, []);
        assert.deepEqual(p.bad, []);
        await close(p);
      });
    for (const width of [375, 1440]) {
      const p = await page(width);
      for (const route of routes)
        await test(`${width}px: ${route} accessibility scan`, async () => {
          await p.evaluate((id) => MAMSS.go(id), route);
          assert.deepEqual(await scan(p), []);
        });
      await close(p);
    }
    await test("initial visit does not save personal data, register offline or load 3D", async () => {
      const p = await page();
      assert.equal(
        await p.evaluate(() => localStorage.getItem("mamss.desk.v1")),
        null,
      );
      assert.equal(
        await p.evaluate(
          async () => (await navigator.serviceWorker.getRegistrations()).length,
        ),
        0,
      );
      assert.equal(
        await p.evaluate(() =>
          performance
            .getEntriesByType("resource")
            .some((r) => /motion\.js|motion\.css/.test(r.name)),
        ),
        false,
      );
      assert.equal(await p.$eval("html", (e) => e.dataset.depth), "off");
      const ids = await p.$$eval("[id]", (es) => es.map((e) => e.id));
      assert.equal(new Set(ids).size, ids.length);
      await close(p);
    });
    await test("audience shortcuts update through visible controls and keep real destinations", async () => {
      const p = await page();
      await click(p, '[data-audience="student"]');
      assert.match(
        await p.$eval("#audience-links", (e) => e.textContent),
        /MAMSS Prep/,
      );
      assert.equal(
        await p.$eval("#audience-links a", (e) => e.href),
        "https://merebari7-web.github.io/mamss-prep/",
      );
      await click(p, '[data-audience="staff"]');
      assert.ok(
        await p.$(
          '#audience-links a[href="https://schools.sch.ng/mamsscbt/Y1/teacher_login.php"]',
        ),
      );
      assert.equal(
        await p.evaluate(() => localStorage.getItem("mamss.desk.v1")),
        null,
      );
      await close(p);
    });
    for (const width of [375, 1440])
      await test(`${width}px: admission guide → class selection → personal checklist`, async () => {
        const p = await page(width);
        await click(p, '.hero-actions a[href="#admissions"]');
        assert.equal(await p.evaluate(() => MAMSS.current), "admissions");
        await p.select("#admission-class", "SS 1");
        assert.match(
          await p.$eval("#admission-guidance", (e) => e.textContent),
          /SS 1.*published/,
        );
        await click(p, "#start-admission-checklist");
        assert.equal(await p.evaluate(() => MAMSS.current), "desk");
        assert.equal(await p.$eval("#desk-entry", (e) => e.value), "SS 1");
        await click(p, '[data-task="availability"]');
        assert.equal(
          await p.$eval("progress.task-progress", (e) => e.value),
          1,
        );
        assert.equal(
          await p.evaluate(() => localStorage.getItem("mamss.desk.v1")),
          null,
        );
        assert.deepEqual(p.errors, []);
        await close(p);
      });
    await test("mobile menu is inert when closed, focus-contained when open, and dismissible", async () => {
      const p = await page(375);
      assert.equal(await p.$eval("#navigation", (e) => e.inert), true);
      await p.click("#menu-toggle");
      await wait(40);
      assert.equal(await p.$eval("#main", (e) => e.inert), true);
      await p.$eval("#navigation>a:last-child", (e) => e.focus());
      await p.keyboard.press("Tab");
      assert.equal(
        await p.evaluate(() => document.activeElement.id),
        "menu-toggle",
      );
      await p.keyboard.press("Escape");
      await wait(40);
      assert.equal(await p.$eval("#navigation", (e) => e.inert), true);
      assert.equal(await p.$eval("#main", (e) => e.inert), false);
      await p.click("#menu-toggle");
      await p.click('#navigation>a[href="#resources"]');
      assert.equal(await p.evaluate(() => MAMSS.current), "resources");
      assert.equal(
        await p.evaluate(() => document.activeElement.tagName),
        "H1",
      );
      assert.equal(
        await p.$eval("#navigation", (e) => e.classList.contains("open")),
        false,
      );
      await close(p);
    });
    await test("browser Back/Forward, direct links and search reveal the right chapter", async () => {
      const p = await page(1280, null, "#leadership");
      assert.equal(await p.evaluate(() => MAMSS.current), "school");
      await p.evaluate(() => MAMSS.go("admissions"));
      await p.evaluate(() => MAMSS.go("contact"));
      await p.goBack();
      await p.waitForFunction(() => MAMSS.current === "admissions");
      await p.goForward();
      await p.waitForFunction(() => MAMSS.current === "contact");
      await p.keyboard.down("Control");
      await p.keyboard.press("k");
      await p.keyboard.up("Control");
      await p.type("#global-search", "facilities");
      await p.keyboard.press("Enter");
      await p.waitForFunction(() => MAMSS.current === "learning");
      await wait(50);
      assert.equal(
        await p.evaluate(() => document.activeElement.id),
        "facilities",
      );
      assert.equal(await p.$eval("#search-dialog", (e) => e.open), false);
      assert.deepEqual(p.errors, []);
      await close(p);
    });
    await test("mobile learning and news carousels advance without page overflow", async () => {
      const p = await page(375);
      await click(
        p,
        '[data-scroll-grid="experience-grid"][data-direction="1"]',
      );
      await p.waitForFunction(
        () => document.querySelector(".experience-grid").scrollLeft > 100,
      );
      await click(p, '[data-scroll-grid="news-grid"][data-direction="1"]');
      await p.waitForFunction(
        () => document.querySelector(".news-grid").scrollLeft > 100,
      );
      assert.equal(await overflow(p), false);
      await close(p);
    });
    await test("resource filters, search, empty state and saved resources", async () => {
      const p = await page();
      await p.evaluate(() => MAMSS.go("resources"));
      assert.equal(await p.$$(".resource-card").then((x) => x.length), 17);
      await click(p, '[data-resource-filter="students"]');
      assert.ok(await p.$$(".resource-card").then((x) => x.length < 17));
      await p.type("#resource-search", "zz-no-such-school-resource");
      assert.equal(await p.$$(".resource-card").then((x) => x.length), 0);
      await click(p, '[data-action="clear-search"]');
      await click(p, ".resource-card [data-save-resource]");
      assert.equal(await p.evaluate(() => deskState.favorites.length), 1);
      await p.evaluate(() => {
        MAMSS.go("school-desk");
        chooseDeskTab("saved");
      });
      assert.ok(await p.$(".desk-resource-row"));
      assert.deepEqual(p.errors, []);
      await close(p);
    });
    await test("existing opted-in School Desk data survives and saving remains explicit", async () => {
      const existing = {
        version: 1,
        consent: true,
        role: "student",
        entry: "JSS 2",
        tasks: ["availability", "form"],
        favorites: ["mamss-prep"],
        reminders: [
          {
            id: "old-reminder",
            title: "Call the school",
            date: "2026-10-01",
            time: "09:00",
            notes: "Confirm the assessment arrangements.",
          },
        ],
        settings: {
          text: "standard",
          contrast: false,
          motion: true,
          depth: false,
        },
      };
      const p = await page(375, existing, "#school-desk");
      assert.equal(await p.evaluate(() => deskState.tasks.length), 2);
      assert.equal(
        await p.$eval("#storage-badge", (e) => e.textContent),
        "Saved on this device",
      );
      await click(p, "#desk-tab-admissions");
      assert.equal(await p.$eval("#desk-entry", (e) => e.value), "JSS 2");
      await click(p, '[data-task="documents"]');
      const saved = await p.evaluate(() =>
        JSON.parse(localStorage.getItem("mamss.desk.v1")),
      );
      assert.equal(saved.tasks.length, 3);
      assert.equal(saved.reminders[0].id, "old-reminder");
      assert.equal(saved.favorites[0], "mamss-prep");
      await close(p);
    });
    await test("opt-in saves new work and restores it after reload", async () => {
      const p = await page(375, null, "#school-desk");
      await click(p, "#enable-device-saving");
      await click(p, "#desk-tab-admissions");
      await click(p, '[data-task="availability"]');
      await p.reload({ waitUntil: "networkidle0" });
      assert.equal(
        await p.evaluate(() => deskState.tasks.includes("availability")),
        true,
      );
      assert.equal(
        await p.$eval("#storage-badge", (e) => e.textContent),
        "Saved on this device",
      );
      assert.deepEqual(p.errors, []);
      await close(p);
    });
    await test("personal reminder add, edit, delete and Lagos-time calendar export", async () => {
      const p = await page(375, null, "#school-desk");
      await click(p, "#desk-tab-planner");
      await click(p, '#desk-panel [data-advanced="add-reminder"]');
      await p.type("#reminder-title", "Call admissions");
      await p.$eval("#reminder-date", (e) => (e.value = "2026-10-01"));
      await p.$eval("#reminder-time", (e) => (e.value = "09:00"));
      await p.type("#reminder-notes", "Ask about SS 1 places.");
      await click(p, "#reminder-form [type=submit]");
      await p.waitForFunction(
        () => !document.getElementById("content-dialog").open,
      );
      assert.equal(await p.evaluate(() => deskState.reminders.length), 1);
      const ics = await p.evaluate(() => makeCalendar(deskState.reminders));
      assert.match(ics, /DTSTART:20261001T080000Z/);
      assert.match(ics, /STATUS:TENTATIVE/);
      await click(p, "#desk-panel [data-reminder]");
      await p.$eval(
        "#reminder-title",
        (e) => (e.value = "Confirm availability"),
      );
      await click(p, "#reminder-form [type=submit]");
      assert.equal(
        await p.evaluate(() => deskState.reminders[0].title),
        "Confirm availability",
      );
      await click(p, "#desk-panel [data-reminder]");
      await click(p, "#reminder-delete");
      await click(p, "#confirm-reminder-delete");
      assert.equal(await p.evaluate(() => deskState.reminders.length), 0);
      assert.equal(await overflow(p), false);
      assert.deepEqual(p.errors, []);
      await close(p);
    });
    await test("backup validation rejects corrupt data and reminder markup is inert", async () => {
      const p = await page();
      const r = await p.evaluate(() => {
        const errors = [];
        for (const bad of [
          { version: 2 },
          {
            version: 1,
            reminders: [
              {
                id: "x",
                title: "A",
                date: "2026-02-30",
                time: "09:00",
                notes: "",
              },
            ],
          },
          { version: 1, reminders: Array(101).fill({}) },
        ]) {
          try {
            validateDesk(bad);
          } catch {
            errors.push(true);
          }
        }
        deskState.reminders = [
          {
            id: "safe",
            title: "<img src=x onerror=alert(1)>",
            date: "2026-10-01",
            time: "",
            notes: "<script>window.bad=1</script>",
          },
        ];
        calendarDate = "2026-10-01";
        calendarMonth = "2026-10";
        chooseDeskTab("planner");
        MAMSS.go("school-desk");
        return {
          errors: errors.length,
          injected: !!document.querySelector(".agenda-entry img"),
        };
      });
      assert.equal(r.errors, 3);
      assert.equal(r.injected, false);
      assert.equal(await p.evaluate(() => window.bad), undefined);
      await close(p);
    });
    await test("contact form prepares a reviewable email, never a fake submission", async () => {
      const p = await page(375, null, "#contact");
      await click(p, '.contact-methods [data-action="contact-form"]');
      await p.type("#contact-name", "Test Parent");
      await p.type("#contact-email", "parent@example.com");
      await p.select("#contact-subject", "Admissions enquiry");
      await p.type(
        "#contact-description",
        "Please confirm current entry requirements and available places.",
      );
      await click(p, "#school-contact-form button[type=submit]");
      assert.match(
        await p.$eval("#draft-review", (e) => e.textContent),
        /Nothing has been sent yet/,
      );
      assert.match(
        await p.$eval("#send-draft", (e) => e.href),
        /^mailto:matermesericordiae@gmail.com\?subject=/,
      );
      assert.equal(
        await p.evaluate(() => localStorage.getItem("mamss.desk.v1")),
        null,
      );
      assert.deepEqual(await scan(p), []);
      assert.deepEqual(p.errors, []);
      await close(p);
    });
    await test("all 14 gallery photos display the matching file, including un-sized originals", async () => {
      const p = await page(375, null, "#school-life");
      assert.equal(
        await p.$$("#gallery [data-photo]").then((x) => x.length),
        14,
      );
      await click(p, '#gallery [data-photo="0"]');
      for (let i = 0; i < 14; i++) {
        await p.waitForFunction(() => {
          const e = document.getElementById("large-photo");
          return e.complete && e.naturalWidth > 0;
        });
        await wait(50);
        const result = await p.evaluate(() => ({
          actual: document.getElementById("large-photo").currentSrc,
          file: visiblePhotos[photoIndex].file,
        }));
        assert.ok(
          result.actual.includes("/" + result.file + ".webp") ||
            result.actual.includes("/" + result.file + "--"),
          JSON.stringify(result),
        );
        await p.keyboard.press("ArrowRight");
      }
      await p.keyboard.press("Escape");
      await click(p, '[data-filter="activities"]');
      assert.equal(
        await p.$$("#gallery [data-photo]").then((x) => x.length),
        2,
      );
      assert.deepEqual(p.errors, []);
      await close(p);
    });
    await test("slideshow and testimonials are manual by default and preserve original content", async () => {
      const p = await page();
      assert.equal(await p.evaluate(() => heroPlaying), false);
      await click(p, "#hero-next");
      assert.match(
        await p.$eval("#hero-slide-count", (e) => e.textContent),
        /02 \/ 12/,
      );
      await click(p, "#hero-play");
      assert.equal(await p.evaluate(() => heroPlaying), true);
      await p.evaluate(() => MAMSS.go("school-life"));
      assert.equal(await p.evaluate(() => heroTimer), null);
      assert.equal(await p.evaluate(() => testimonials.length), 4);
      assert.equal(await p.evaluate(() => photos.length), 14);
      assert.deepEqual(p.errors, []);
      await close(p);
    });
    await test("large text, high contrast, reduced motion and optional effects remain usable", async () => {
      const p = await page(375);
      await click(p, '[data-advanced="accessibility"]');
      await click(p, 'input[name="text-size"][value="larger"]');
      await click(p, "#setting-contrast");
      await click(p, "#setting-motion");
      await p.keyboard.press("Escape");
      for (const route of routes) {
        await p.evaluate((id) => MAMSS.go(id), route);
        assert.equal(await overflow(p), false, route);
      }
      assert.equal(await p.$eval("html", (e) => e.dataset.reading), "larger");
      assert.equal(await p.$eval("html", (e) => e.dataset.motion), "reduce");
      await p.evaluate(() => {
        MAMSS.go("home");
        showAccessibility();
      });
      await click(p, "#setting-depth");
      await p.waitForSelector("#scroll-fx-toggle");
      await p.keyboard.press("Escape");
      assert.equal(await overflow(p), false);
      assert.deepEqual(p.errors, []);
      await close(p);
    });
    for (const width of [375, 1440])
      await test(`${width}px: all desk tabs and settings dialogs are accessible`, async () => {
        const p = await page(width, null, "#school-desk");
        for (const tab of ["overview", "admissions", "planner", "saved"]) {
          await p.evaluate((tab) => chooseDeskTab(tab), tab);
          assert.deepEqual(await scan(p), [], tab);
        }
        for (const fn of [
          "showAccessibility",
          "showDeviceSettings",
          "showOfflineTools",
        ]) {
          await p.evaluate((fn) => window[fn](), fn);
          assert.deepEqual(await scan(p), [], fn);
          await p.keyboard.press("Escape");
        }
        await close(p);
      });
    await test("printing the checklist is explicit; normal page printing is not blank", async () => {
      const p = await page(1280, null, "#admissions");
      await p.emulateMediaType("print");
      assert.equal(
        await p.$eval("#main", (e) => getComputedStyle(e).display),
        "block",
      );
      assert.equal(
        await p.$eval("#print-pack", (e) => getComputedStyle(e).display),
        "none",
      );
      await p.evaluate(() => {
        window.print = () =>
          (window.printDisplay = getComputedStyle(
            document.getElementById("print-pack"),
          ).display);
        printChecklist();
      });
      assert.equal(await p.evaluate(() => window.printDisplay), "block");
      assert.equal(await p.$$eval("#print-pack li", (es) => es.length), 6);
      assert.equal(
        await p.$eval("body", (e) =>
          e.classList.contains("printing-checklist"),
        ),
        false,
      );
      await close(p);
    });
    const actions = [
      "admissions",
      "announcements",
      "calendar",
      "library",
      "user-login",
      "history",
      "anthem",
      "newsletters",
      "assignments",
      "complaints",
    ];
    const dp = await page(375);
    for (const action of actions)
      await test(`${action}: information dialog opens and passes accessibility checks`, async () => {
        await dp.evaluate((a) => featureActions[a](), action);
        assert.equal(await dp.$eval("#content-dialog", (e) => e.open), true);
        assert.deepEqual(await scan(dp), []);
        await dp.keyboard.press("Escape");
        assert.equal(await dp.$eval("#content-dialog", (e) => e.open), false);
        assert.deepEqual(dp.errors, []);
      });
    await close(dp);
    await test("offline is opt-in, supports deep links, and clears only this project’s caches", async () => {
      const p = await page(375);
      await p.evaluate(async () => {
        await caches.open("mamss-public-v6:/another-school/");
        const legacy = await caches.open("mamss-public-v5");
        await legacy.put(
          new URL("index.html", location.href),
          new Response("old school shell"),
        );
        await legacy.put(
          new URL("/another-school/index.html", location.href),
          new Response("keep the other project"),
        );
        showOfflineTools();
      });
      await click(p, "#enable-offline");
      await p.waitForFunction(
        () =>
          document
            .getElementById("offline-status")
            .textContent.startsWith("Offline website ready"),
        { timeout: 30000 },
      );
      await p.waitForFunction(() => !!navigator.serviceWorker.controller);
      await p.keyboard.press("Escape");
      assert.deepEqual(
        await p.evaluate(async () => {
          const c = await caches.open("mamss-public-v5");
          return (await c.keys()).map((r) => new URL(r.url).pathname);
        }),
        ["/another-school/index.html"],
      );
      await p.setOfflineMode(true);
      await p.goto(base + "#admissions", { waitUntil: "networkidle0" });
      await p.reload({ waitUntil: "networkidle0" });
      assert.equal(await p.evaluate(() => MAMSS.current), "admissions");
      await p.evaluate(() => MAMSS.go("school-desk"));
      assert.ok(await p.$("#desk-panel"));
      await p.setOfflineMode(false);
      await p.evaluate(async () => {
        const legacy = await caches.open("mamss-public-v5");
        await legacy.put(
          new URL("index.html", location.href),
          new Response("legacy current project entry"),
        );
        await removeOfflineCopy();
      });
      assert.deepEqual(
        await p.evaluate(async () => (await caches.keys()).sort()),
        ["mamss-public-v5", "mamss-public-v6:/another-school/"],
      );
      assert.deepEqual(p.errors, []);
      await close(p);
    });
    await test("all original service links are retained and external links are labelled", async () => {
      const p = await page();
      const r = await p.evaluate(() => ({
        links: Object.values(schoolLinks),
        resources: resources.length,
        forms: document.querySelectorAll("input[type=password]").length,
        unsafe: [...document.querySelectorAll('a[target="_blank"]')].filter(
          (a) => !a.rel.includes("noopener"),
        ).length,
      }));
      assert.equal(r.resources, 17);
      assert.equal(r.forms, 0);
      assert.equal(r.unsafe, 0);
      for (const expected of [
        "https://schools.sch.ng/mamsscbt/Y1/admin_login.php",
        "https://schools.sch.ng/mamsscbt/Y1/teacher_login.php",
        "https://merebari7-web.github.io/mamss-prep/",
        "https://myschoolz-001-site16.rtempurl.com/Mater_Misericordiae/result-verify.aspx",
      ])
        assert.ok(r.links.includes(expected));
      await close(p);
    });
    await test("v3: theme toggle switches the dark palette without persisting, and the reading dialog exposes appearance", async () => {
      const p = await page();
      const lightBg = await p.$eval("body", (e) => getComputedStyle(e).backgroundColor);
      await click(p, "#theme-toggle");
      assert.equal(
        await p.$eval("html", (e) => e.dataset.theme),
        "dark",
      );
      const darkBg = await p.$eval("body", (e) =>
        getComputedStyle(e).backgroundColor,
      );
      assert.notEqual(lightBg, darkBg);
      assert.equal(
        await p.$eval("#theme-toggle", (e) => e.getAttribute("aria-pressed")),
        "true",
      );
      await p.evaluate(() => {
        MAMSS.go("school-desk");
        showAccessibility();
      });
      await click(p, 'input[name="appearance"][value="dark"]');
      assert.equal(
        await p.$eval("html", (e) => e.dataset.theme),
        "dark",
      );
      await click(p, "#reset-accessibility");
      assert.equal(
        await p.$eval("html", (e) => e.dataset.theme),
        "light",
      );
      await p.keyboard.press("Escape");
      await click(p, "#theme-toggle");
      assert.equal(
        await p.$eval("html", (e) => e.dataset.theme),
        "dark",
      );
      assert.equal(
        await p.evaluate(() => localStorage.getItem("mamss.desk.v1")),
        null,
      );
      assert.deepEqual(p.errors, []);
      await close(p);
    });
    await test("v3: dark theme keeps home and desk passing accessibility scans", async () => {
      const p = await page(1440);
      await click(p, "#theme-toggle");
      for (const route of ["home", "school-desk"]) {
        await p.evaluate((id) => MAMSS.go(id), route);
        assert.deepEqual(await scan(p), [], route);
      }
      assert.equal(await overflow(p), false);
      assert.deepEqual(p.errors, []);
      await close(p);
    });
    await test("v3: quick help assistant opens the school's own information with accessible focus management", async () => {
      const p = await page();
      assert.equal(await p.$eval("#talk-panel", (e) => e.hidden), true);
      await click(p, "#talk-fab");
      assert.equal(await p.$eval("#talk-panel", (e) => e.hidden), false);
      assert.equal(
        await p.evaluate(() => document.activeElement.id),
        "talk-close",
      );
      assert.deepEqual(await scan(p), []);
      await click(p, '[data-talk="admissions"]');
      assert.equal(await p.$eval("#talk-panel", (e) => e.hidden), true);
      assert.equal(await p.$eval("#content-dialog", (e) => e.open), true);
      await p.keyboard.press("Escape");
      await p.keyboard.down("Control");
      await p.keyboard.press("k");
      await p.keyboard.up("Control");
      await p.keyboard.press("Escape");
      assert.equal(await p.$eval("#content-dialog", (e) => e.open), false);
      await click(p, "#talk-fab");
      await p.keyboard.press("Escape");
      assert.equal(await p.$eval("#talk-panel", (e) => e.hidden), true);
      assert.equal(
        await p.evaluate(() => document.activeElement.id),
        "talk-fab",
      );
      const wa = await p.$eval(".talk-option[href]", (e) => e.href);
      assert.match(wa, /^https:\/\/wa\.me\/2349013653629$/);
      assert.deepEqual(p.errors, []);
      await close(p);
    });
    await test("v3: dates strip is present and reachable through site search; lower sections skip layout", async () => {
      const p = await page();
      assert.equal((await p.$$(".date-card")).length, 5);
      await p.keyboard.down("Control");
      await p.keyboard.press("k");
      await p.keyboard.up("Control");
      await p.type("#global-search", "dates to know");
      await p.keyboard.press("Enter");
      await wait(120);
      assert.equal(
        await p.evaluate(() => document.activeElement.id),
        "dates-to-know",
      );
      const cv = await p.evaluate(
        () =>
          [...document.querySelectorAll("section.cv-auto")].length >= 3 &&
          getComputedStyle(
            document.querySelector("section.cv-auto"),
          ).contentVisibility === "auto",
      );
      assert.ok(cv);
      assert.deepEqual(p.errors, []);
      await close(p);
    });
  } catch (e) {
    failed++;
    console.error(e);
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
  console.log(`\n${passed} passed; ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
