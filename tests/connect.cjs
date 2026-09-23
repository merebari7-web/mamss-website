/* v3.2 additions: server tier, honest wording, staff desk and scroll-linked depth.
   The API is stubbed locally, so these checks never touch Netlify or a database. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const pp = require("puppeteer"),
  serve = require("../scripts/server.cjs");
const root = path.resolve(__dirname, "..");
let passed = 0,
  failed = 0;
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

/* The shared validation module is TypeScript, loaded through Node's own type
   stripping. These checks therefore exercise the real server rules rather than
   a restatement of them. */
const loadServerRules = () => import("../netlify/lib/enquiry.mts");

(async () => {
  const rules = await loadServerRules();

  /* ------------------------------------------------ server-side validation */
  await test("the server accepts a complete enquiry and normalises what it stores", () => {
    const result = rules.validateEnquiry({
      name: "  Adaeze Okonkwo  ",
      email: "parent@example.com",
      phone: "",
      entryClass: "JSS 1",
      proposedDate: "2030-10-10",
      proposedTime: "10:30",
      topics: ["places", "visit", "not-a-topic"],
      message: "We would like to see the science rooms.",
      attach: true,
    });
    assert.equal(result.errors, undefined);
    assert.equal(result.data.name, "Adaeze Okonkwo");
    assert.equal(result.data.entryClass, "JSS 1");
    assert.deepEqual(result.data.topics.split(",").sort(), ["places", "visit"]);
    assert.equal(Object.prototype.hasOwnProperty.call(result.data, "attach"), false);
  });

  await test("the server refuses enquiries it could never reply to or safely store", () => {
    const bad = {
      "no contact route": { name: "Ada Obi", entryClass: "JSS 1" },
      "a name too short to be a name": { name: "A", email: "p@example.com", entryClass: "JSS 1" },
      "an entry class the school does not offer": { name: "Ada Obi", email: "p@example.com", entryClass: "Year 9" },
      "a visit date already in the past": { name: "Ada Obi", email: "p@example.com", entryClass: "JSS 1", proposedDate: "2020-01-01" },
      "a time with no date": { name: "Ada Obi", email: "p@example.com", entryClass: "JSS 1", proposedTime: "10:30" },
      "an address that is not an address": { name: "Ada Obi", email: "not-an-email", entryClass: "JSS 1" },
    };
    for (const [why, payload] of Object.entries(bad)) {
      const result = rules.validateEnquiry(payload);
      assert.ok(result.errors, `should have been refused: ${why}`);
      assert.ok(result.errors.every((e) => typeof e === "string" && e.length > 0));
    }
  });

  await test("an over-long message is capped rather than rejected or stored in full", () => {
    const result = rules.validateEnquiry({
      name: "Ada Obi",
      email: "p@example.com",
      entryClass: "general",
      message: "x".repeat(5000),
    });
    assert.equal(result.errors, undefined);
    assert.equal(result.data.message.length, rules.LIMITS.message);
  });

  await test("the rate-limit key is one-way, stable, and never contains the address", () => {
    const ip = "203.0.113.42";
    const hash = rules.sourceHash(ip);
    assert.equal(hash, rules.sourceHash(ip));
    assert.notEqual(hash, rules.sourceHash("203.0.113.43"));
    assert.equal(hash.includes("203"), false);
    assert.match(hash, /^[0-9a-f]{32}$/);
  });

  /* --------------------------------------------- deployment configuration */
  await test("the private desk is kept out of search engines and out of caches", () => {
    const toml = fs.readFileSync(path.join(root, "netlify.toml"), "utf8"),
      robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8"),
      staff = fs.readFileSync(path.join(root, "staff.html"), "utf8");
    assert.match(toml, /X-Robots-Tag\s*=\s*"noindex/);
    assert.match(toml, /for = "\/api\/\*"/);
    assert.match(toml, /no-store/);
    assert.match(robots, /Disallow: \/staff/);
    assert.match(robots, /Disallow: \/api\//);
    assert.match(staff, /noindex/);
    /* The desk must not ship the public bundles or any third-party script. */
    assert.equal(/site\.min\./.test(staff), false);
    assert.equal(/https?:\/\//.test(staff.replace(/https?:\/\/www\.w3\.org/g, "")), false);
  });

  await test("the offline shell is re-versioned so 3.2 files cannot be served from an old cache", () => {
    const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
    assert.match(sw, /mamss-public-v10:/);
    for (const file of ["connect.css", "connect.js", "scroll3d.css", "scroll3d.js"])
      assert.ok(sw.includes(file), `${file} missing from the offline shell`);
  });

  await test("the committed bundles are untouched by the 3.2 layer", () => {
    const build = fs.readFileSync(path.join(root, "scripts", "build.cjs"), "utf8");
    for (const file of ["connect.js", "connect.css", "scroll3d.js", "scroll3d.css", "staff.js", "staff.css"])
      assert.equal(build.includes(file), false, `${file} must stay outside the committed bundle`);
  });

  /* ------------------------------------------------------------- browser */
  const stub = { capabilities: { enquiries: true, assistant: true }, enquiryStatus: 200, calls: [] };
  const statik = serve("/mamss-website/").listeners("request")[0];
  const server = http.createServer((req, res) => {
    if (!req.url.startsWith("/api/")) return statik(req, res);
    stub.calls.push(req.method + " " + req.url);
    const send = (code, body) => {
      res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(body));
    };
    if (req.url === "/api/capabilities") return send(200, stub.capabilities);
    if (req.url === "/api/enquiries" && req.method === "POST") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      return req.on("end", () => {
        stub.lastBody = JSON.parse(raw || "{}");
        if (stub.enquiryStatus !== 200) return send(stub.enquiryStatus, { error: "Too many enquiries from this connection." });
        send(200, { id: 41 });
      });
    }
    if (req.url === "/api/assistant") {
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      return res.end("Entry is offered into JSS 1, JSS 2, SS 1 and SS 2.");
    }
    send(404, { error: "not found" });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/mamss-website/`;
  const browser = await pp.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  async function page(width = 1440, { motion = true } = {}) {
    const context = await browser.createBrowserContext(),
      p = await context.newPage();
    p.errors = [];
    p.api = [];
    p.on("pageerror", (e) => p.errors.push(e.message));
    p.on("request", (r) => r.url().includes("/api/") && p.api.push(r.method() + " " + new URL(r.url()).pathname));
    if (!motion) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await p.setViewport({ width, height: 900 });
    await p.goto(base, { waitUntil: "networkidle0" });
    await p.waitForFunction(() => !!window.MAMSS && !!window.MAMSSConnect);
    return p;
  }
  async function close(p) {
    assert.deepEqual(p.errors, []);
    await p.browserContext().close();
  }
  async function click(p, s) {
    await p.waitForSelector(s, { visible: true });
    await p.$eval(s, (e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
    await p.click(s);
  }
  async function planner(p) {
    await click(p, "#home [data-premium=visit]");
    await p.select("#visit-entry", "SS 1");
    await p.evaluate(() => {
      for (const [id, value] of [["#visit-date", "2030-10-10"], ["#visit-time", "10:30"]]) {
        const field = document.querySelector(id);
        field.value = value;
        field.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await click(p, "#visit-form button[type=submit]");
    await p.waitForSelector("#visit-notes");
    await p.type("#visit-notes", "Please advise whom I should meet.");
    await click(p, "#visit-form button[type=submit]");
    await p.waitForSelector("#visit-summary");
  }
  async function axe(p) {
    await p.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    return p.evaluate(async () => {
      const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
      return r.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }));
    });
  }

  try {
    await test("an ordinary visit still contacts no service at all", async () => {
      const p = await page();
      await p.evaluate(() => MAMSS.go("admissions"));
      await p.evaluate(() => MAMSS.go("contact"));
      await new Promise((r) => setTimeout(r, 400));
      assert.deepEqual(p.api, [], "reading the website must not call the API");
      await close(p);
    });

    await test("the page no longer promises, without qualification, that nothing is sent", async () => {
      const p = await page();
      assert.match(
        await p.$eval(".talk-note", (e) => e.textContent),
        /unless you choose/,
      );
      await planner(p);
      assert.match(
        await p.$eval(".visit-privacy", (e) => e.textContent),
        /unless you choose to send them to the school/,
      );
      assert.equal(await p.$eval(".visit-privacy", (e) => /stay only in this page/.test(e.textContent)), false);
      await close(p);
    });

    await test("the privacy notice explains the enquiry desk and the assistant in plain words", async () => {
      const p = await page();
      await click(p, "#privacy-button");
      await p.waitForFunction(() => /Sending an enquiry/.test(document.querySelector("#dialog-content")?.textContent || ""));
      const text = await p.$eval("#dialog-content", (e) => e.textContent);
      assert.match(text, /stored in the school’s own enquiry database/);
      assert.match(text, /neither happens unless you choose it/i);
      assert.match(text, /Site-wide search works in this page without sending your query anywhere/);
      assert.deepEqual(await axe(p), []);
      await close(p);
    });

    await test("a family can send the prepared enquiry and is given a reference", async () => {
      const p = await page();
      await planner(p);
      await p.waitForSelector(".send-office");
      await p.type("#send-name", "Adaeze Okonkwo");
      await p.type("#send-email", "parent@example.com");
      await click(p, "#send-consent");
      assert.deepEqual(await axe(p), []);
      await click(p, "#send-form button[type=submit]");
      await p.waitForSelector(".send-receipt");
      assert.match(await p.$eval(".send-receipt strong", (e) => e.textContent), /MAMSS-41/);
      assert.equal(stub.lastBody.entryClass, "SS 1");
      assert.equal(stub.lastBody.proposedDate, "2030-10-10");
      assert.match(stub.lastBody.message, /whom I should meet/);
      await close(p);
    });

    await test("sending requires consent and a way to reply, and says so before calling the server", async () => {
      const p = await page();
      await planner(p);
      await p.waitForSelector(".send-office");
      const before = stub.calls.filter((c) => c.includes("enquiries")).length;
      await click(p, "#send-form button[type=submit]");
      assert.match(await p.$eval("#send-error", (e) => e.textContent), /name/i);
      await p.type("#send-name", "Adaeze Okonkwo");
      await click(p, "#send-form button[type=submit]");
      assert.match(await p.$eval("#send-error", (e) => e.textContent), /email address or a phone number/);
      await p.type("#send-phone", "0703 789 8216");
      await click(p, "#send-form button[type=submit]");
      assert.match(await p.$eval("#send-error", (e) => e.textContent), /Tick the box/);
      assert.equal(stub.calls.filter((c) => c.includes("enquiries")).length, before, "no request before the form is valid");
      await close(p);
    });

    await test("a refused or unreachable server always leaves the family the email and phone routes", async () => {
      stub.enquiryStatus = 429;
      const p = await page();
      await planner(p);
      await p.waitForSelector(".send-office");
      await p.type("#send-name", "Adaeze Okonkwo");
      await p.type("#send-email", "parent@example.com");
      await click(p, "#send-consent");
      await click(p, "#send-form button[type=submit]");
      await p.waitForFunction(() => document.querySelector("#send-error")?.textContent.length > 0);
      assert.match(await p.$eval("#send-error", (e) => e.textContent), /Too many enquiries/);
      assert.equal(await p.$eval("#send-form button[type=submit]", (e) => e.disabled), false, "the family must be able to try again");
      assert.ok(await p.$("#visit-mail"), "the email draft route must still be there");
      stub.enquiryStatus = 200;
      await close(p);
    });

    await test("the assistant answers in the page and never renders markup from the reply", async () => {
      const p = await page();
      await click(p, "#talk-fab");
      await p.waitForSelector("#ask-entry, .talk-panel button", { visible: true });
      await p.evaluate(() => MAMSSConnect.openAsk());
      await p.waitForSelector("#ask-input");
      await p.type("#ask-input", "Which classes can I apply for?");
      await click(p, ".ask-send");
      await p.waitForFunction(() => /JSS 1/.test(document.querySelector("#ask-log")?.textContent || ""));
      assert.equal(await p.$$eval("#ask-log script", (e) => e.length), 0);
      assert.deepEqual(await axe(p), []);
      await close(p);
    });

    await test("without a server tier the page keeps its original local-only behaviour", async () => {
      stub.capabilities = { enquiries: false, assistant: false };
      const p = await page();
      await planner(p);
      await new Promise((r) => setTimeout(r, 400));
      assert.equal(await p.$(".send-office"), null, "no send panel should appear");
      assert.ok(await p.$("#visit-mail"), "the original email route must remain");
      await click(p, "#talk-fab");
      await new Promise((r) => setTimeout(r, 300));
      assert.equal(await p.$("#ask-entry"), null, "no assistant entry should appear");
      await close(p);
      stub.capabilities = { enquiries: true, assistant: true };
    });

    /* ------------------------------------------------ scroll-linked depth */
    await test("scroll-linked depth marks sections and never widens the page", async () => {
      for (const width of [320, 360, 414, 768, 1024, 1280, 1440, 1920]) {
        const p = await page(width);
        assert.match(await p.evaluate(() => document.documentElement.dataset.scroll3d || ""), /^(on|fallback)$/);
        assert.ok(await p.$$eval("[data-s3d]", (e) => e.length > 0), "sections should be marked");
        await p.evaluate(() => scrollTo(0, document.body.scrollHeight / 2));
        await new Promise((r) => setTimeout(r, 250));
        assert.equal(
          await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
          `horizontal overflow at ${width}px`,
        );
        await close(p);
      }
    });

    await test("a reduced-motion visitor gets no depth animation, and changing the site setting applies at once", async () => {
      const p = await page(1440, { motion: false });
      assert.equal(await p.evaluate(() => document.documentElement.dataset.scroll3d || ""), "");
      await close(p);

      const q = await page();
      assert.notEqual(await q.evaluate(() => document.documentElement.dataset.scroll3d || ""), "");
      await q.evaluate(() => (document.documentElement.dataset.motion = "reduce"));
      await q.waitForFunction(() => !document.documentElement.dataset.scroll3d);
      const animating = await q.evaluate(() =>
        [...document.querySelectorAll("[data-s3d]")].filter(
          (e) => getComputedStyle(e).animationName !== "none" || getComputedStyle(e).transform !== "none",
        ).length,
      );
      assert.equal(animating, 0, "no element may still be animated or displaced");
      await close(q);
    });

    await test("everything stays readable and content is visible with the 3.2 stylesheets applied", async () => {
      const p = await page();
      assert.deepEqual(await axe(p), []);
      const hidden = await p.evaluate(() =>
        [...document.querySelectorAll("#home [data-s3d] h2, #home [data-s3d] p")]
          .filter((e) => e.getClientRects().length && Number(getComputedStyle(e).opacity) === 0).length,
      );
      assert.equal(hidden, 0, "no visible text may be left permanently transparent");
      await close(p);
    });

    /* ---------------------------------------------------------- staff desk */
    await test("the staff desk asks for a sign-in and shows no family data before one", async () => {
      const context = await browser.createBrowserContext(),
        p = await context.newPage();
      p.errors = [];
      p.on("pageerror", (e) => p.errors.push(e.message));
      await p.setViewport({ width: 1280, height: 900 });
      await p.goto(base + "staff.html", { waitUntil: "networkidle0" });
      await p.waitForFunction(() => /sign in|Sign in/.test(document.body.textContent));
      assert.ok(await p.$("input[type=password]"), "a sign-in form is required");
      assert.equal(/parent@|enquiry desk list/i.test(await p.evaluate(() => document.body.textContent)), false);
      assert.deepEqual(await axe(p), []);
      assert.deepEqual(p.errors, []);
      await context.close();
    });
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
  console.log(`\n${passed} connection checks passed; ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
