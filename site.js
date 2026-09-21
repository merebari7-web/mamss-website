/* Focused chapters over the existing public information and opt-in School Desk.
   All portal credentials and school records remain on the original services. */
(() => {
  "use strict";
  const pages = [...document.querySelectorAll("[data-page]")];
  const byId = (id) => document.getElementById(id);
  const titles = {
    home: "MAMSS | A Catholic education. A future with purpose.",
    school: "Our school | MAMSS",
    learning: "Learning | MAMSS",
    life: "School life | MAMSS",
    admissions: "Admissions | MAMSS",
    resources: "Resources & portals | MAMSS",
    desk: "My school desk | MAMSS",
    contact: "Contact | MAMSS",
  };
  const primary = {
    home: "home",
    school: "about",
    learning: "learning",
    life: "school-life",
    admissions: "admissions",
    resources: "resources",
    desk: "school-desk",
    contact: "contact",
  };
  let current = "home",
    menuWasOpen = false;
  function resolve(id) {
    const target = byId(id);
    return (
      target?.closest("[data-page]")?.dataset.page ||
      Object.keys(primary).find((k) => primary[k] === id) ||
      (titles[id] ? id : "home")
    );
  }
  function go(id = "home", options = {}) {
    id = String(id).replace(/^#/, "");
    if (id === "main") {
      byId("main").setAttribute("tabindex", "-1");
      byId("main").focus({ preventScroll: true });
      return;
    }
    const page = resolve(id),
      changed = page !== current;
    current = page;
    pages.forEach((el) => {
      const active = el.dataset.page === page;
      el.hidden = !active;
      el.classList.toggle("is-active", active);
    });
    document.body.dataset.chapter = page;
    document.title = titles[page];
    if (options.history !== false) {
      const hash = "#" + (byId(id) ? id : primary[page]);
      if (location.hash !== hash)
        history[options.replace ? "replaceState" : "pushState"](
          { page },
          "",
          hash,
        );
    }
    const exactNav = [...nav.querySelectorAll('a[href^="#"]')].some(
      (a) => a.hash === "#" + id,
    );
    document
      .querySelectorAll('#navigation a[href^="#"],.mobile-dock a')
      .forEach((a) => {
        const active = a.closest(".mobile-dock")
          ? a.dataset.navPage === page
          : a.hash === "#" + (exactNav ? id : primary[page]);
        if (active) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
    document.querySelectorAll(".nav-dropdown").forEach((d) =>
      d.classList.toggle(
        "route-current",
        [...d.querySelectorAll('a[href^="#"]')].some(
          (a) => resolve(a.hash.slice(1)) === page,
        ),
      ),
    );
    closeMenu();
    syncMenu();
    document.querySelectorAll(".nav-dropdown").forEach((d) => (d.open = false));
    const activePage = pages.find((el) => el.dataset.page === page),
      heading = activePage.querySelector("h1");
    const target = byId(id),
      sectionTarget = target && id !== primary[page] && id !== "home";
    if (options.scroll !== false) {
      if (sectionTarget)
        target.scrollIntoView({ behavior: "instant", block: "start" });
      else window.scrollTo({ top: 0, behavior: "instant" });
    }
    if (options.focus !== false) {
      const focus = sectionTarget ? target : heading;
      if (focus) {
        focus.setAttribute("tabindex", "-1");
        focus.focus({ preventScroll: true });
      }
    }
    if (changed) {
      byId("route-status").textContent =
        (heading?.textContent || page).replace(/\s+/g, " ") + " — page opened";
    }
    if (typeof updateReadingProgress === "function") updateReadingProgress();
    if (page !== "home") stopHeroTimer();
    else if (heroPlaying) startHeroTimer();
    if (document.getElementById("scroll-fx-toggle"))
      window.dispatchEvent(new Event("resize"));
  }
  window.MAMSS = {
    go,
    resolve,
    get current() {
      return current;
    },
  };
  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (
        !link ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === "_blank" ||
        link.hasAttribute("download")
      )
        return;
      const id = link.hash.slice(1);
      if (!id) return;
      if (id === "main" || byId(id) || titles[id]) {
        event.preventDefault();
        go(id);
      }
    },
    true,
  );
  const locationChange = () => {
    let id = "home";
    try {
      id = decodeURIComponent(location.hash.slice(1)) || "home";
    } catch {}
    go(id, { history: false });
  };
  window.addEventListener("popstate", locationChange);
  window.addEventListener("hashchange", locationChange);
  // Navigation is truly closed to keyboard users on narrow screens.
  const nav = byId("navigation"),
    menuButton = byId("menu-toggle"),
    shade = byId("menu-shade");
  const media = matchMedia("(max-width:1030px)");
  function syncMenu() {
    const open = media.matches && nav.classList.contains("open");
    shade.hidden = !open;
    nav.inert = media.matches && !open;
    byId("main").inert = open;
    document.querySelector("footer").inert = open;
    document.querySelector(".mobile-dock").inert = open;
    document.querySelector(".topbar").inert = open;
    document.body.classList.toggle("navigation-open", open);
    if (menuWasOpen && !open && nav.contains(document.activeElement))
      menuButton.focus({ preventScroll: true });
    menuWasOpen = open;
  }
  new MutationObserver(syncMenu).observe(nav, {
    attributes: true,
    attributeFilter: ["class"],
  });
  shade.addEventListener("click", () => {
    closeMenu();
    menuButton.focus({ preventScroll: true });
  });
  media.addEventListener("change", () => {
    closeMenu();
    syncMenu();
  });
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Tab" || !menuWasOpen) return;
      const items = [
        menuButton,
        ...nav.querySelectorAll("a,button,summary"),
      ].filter((el) => el.getClientRects().length && !el.disabled);
      const first = items[0],
        last = items[items.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          !items.includes(document.activeElement))
      ) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          !items.includes(document.activeElement))
      ) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    },
    true,
  );
  // Helpful audience shortcuts; choosing a group does not silently save a preference.
  const icons = {
    book: '<path d="M3 4q5-2 9 1 4-3 9-1v15q-5-2-9 1-4-3-9-1zM12 5v15"/>',
    check: '<path d="M5 3h14v18H5zM8 8h8m-8 4h8m-8 4 2 2 5-5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    calendar: '<path d="M3 6h18v15H3zM3 11h18M7 3v6m10-6v6M7 15h3m4 0h3"/>',
    chat: '<path d="M3 4h18v13H9l-6 5zM7 8h10M7 12h6"/>',
    arrow: '<path d="M4 12h16M13 5l7 7-7 7"/>',
  };
  const audience = {
    parent: [
      ["Your admission journey", "A clear next step", "arrow", "#admissions"],
      [
        "Check results",
        "Official results portal",
        "check",
        schoolLinks.results,
      ],
      [
        "School dates & notices",
        "Know before you go",
        "calendar",
        "calendar",
        true,
      ],
      ["Talk to our school", "We’re here to help", "chat", "#contact"],
    ],
    student: [
      ["MAMSS Prep", "Practise & prepare", "book", schoolLinks.prep],
      ["Student CBT", "Your exam platform", "check", schoolLinks.student],
      ["Digital library", "Keep discovering", "book", "library", true],
      ["My school desk", "Your personal organiser", "grid", "#school-desk"],
    ],
    staff: [
      ["School portal", "Your existing account", "grid", schoolLinks.portal],
      [
        "CBT examiner login",
        "Examinations & marking",
        "check",
        schoolLinks.examiner,
      ],
      ["Digital library", "Learning resources", "book", "library", true],
      ["All school resources", "Every useful link", "arrow", "#resources"],
    ],
  };
  function renderAudience(role, announce = false) {
    const label = {
      parent: "parents and guardians",
      student: "students",
      staff: "staff",
    }[role];
    byId("audience-links").innerHTML = audience[role]
      .map(([title, description, icon, destination, action]) => {
        const external = /^https:/.test(destination),
          tag = action ? "button" : "a";
        return `<${tag} class="audience-card" ${action ? 'data-action="' + destination + '"' : 'href="' + destination + '"' + (external ? ' target="_blank" rel="noopener"' : "")}><span class="link-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[icon]}</svg></span><span><strong>${title}</strong><small>${description}</small></span><b aria-hidden="true">${external ? "↗" : "→"}</b></${tag}>`;
      })
      .join("");
    document.querySelectorAll("[data-audience]").forEach((b) => {
      const active = b.dataset.audience === role;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    if (announce)
      byId("audience-status").textContent =
        "Showing four shortcuts for " + label + ".";
  }
  document
    .querySelectorAll("[data-audience]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        renderAudience(b.dataset.audience, true),
      ),
    );
  renderAudience(deskState.role || "parent");
  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-enquiry="visit"]')) {
      const select = byId("contact-subject");
      if (select) select.value = "School visit";
    }
  });
  byId("admission-class").addEventListener("change", (e) => {
    const selected = e.target.value;
    byId("admission-guidance").textContent = selected
      ? `${selected} appears in the published admission flyer. Ask the school about current places, requirements, fees and the next assessment opportunity.`
      : "";
  });
  byId("start-admission-checklist").addEventListener("click", () => {
    const entry = byId("admission-class").value;
    if (entry) {
      deskState.entry = entry;
      commitDesk();
    }
    chooseDeskTab("admissions");
    go("school-desk");
  });
  // Existing 3D preference is retained, but animation code is no longer a startup dependency.
  let depthLoaded = false;
  function loadDepth() {
    if (depthLoaded || document.documentElement.dataset.depth !== "on") return;
    depthLoaded = true;
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "motion.css";
    const js = document.createElement("script");
    js.src = "motion.js";
    js.defer = true;
    js.onerror = () => {
      depthLoaded = false;
      css.remove();
      js.remove();
      toast(
        "The optional motion effects could not load. The website still works normally.",
      );
    };
    document.head.append(css, js);
  }
  new MutationObserver(loadDepth).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-depth"],
  });
  document.querySelectorAll("[data-scroll-grid]").forEach((button) =>
    button.addEventListener("click", () => {
      const grid = document.querySelector("." + button.dataset.scrollGrid);
      grid.scrollBy({
        left:
          (grid.firstElementChild.getBoundingClientRect().width + 16) *
          Number(button.dataset.direction),
        behavior:
          deskState.settings.motion ||
          matchMedia("(prefers-reduced-motion:reduce)").matches
            ? "instant"
            : "smooth",
      });
    }),
  );
  function updateGridControls() {
    document.querySelectorAll("[data-scroll-grid]").forEach((button) => {
      const grid = document.querySelector("." + button.dataset.scrollGrid);
      button.disabled =
        Number(button.dataset.direction) < 0
          ? grid.scrollLeft < 2
          : grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 2;
    });
  }
  document
    .querySelectorAll(".experience-grid,.news-grid")
    .forEach((grid) =>
      grid.addEventListener("scroll", updateGridControls, { passive: true }),
    );
  window.addEventListener("resize", updateGridControls);
  updateGridControls();
  // Update an existing opt-in worker; do not register one without consent.
  if ("serviceWorker" in navigator)
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) =>
        regs.forEach((reg) => {
          if (reg.scope === new URL("./", location.href).href)
            reg.update().catch(() => {});
        }),
      )
      .catch(() => {});
  syncMenu();
  loadDepth();
  // ==================== MAMSS v3 runtime ====================
  // Quick-help assistant: floating, closed by default, opens the school's own
  // information. It never composes or sends a message.
  const talkFab = byId("talk-fab"),
    talkPanel = byId("talk-panel");
  let talkLastFocus = null;
  function setTalk(open) {
    if (!talkPanel) return;
    talkPanel.hidden = !open;
    talkFab.setAttribute("aria-expanded", String(open));
    talkFab.setAttribute("aria-label", open ? "Close quick help" : "Open quick help");
    if (open) {
      byId("talk-close").focus({ preventScroll: true });
    } else if (talkLastFocus) {
      const last = talkLastFocus;
      talkLastFocus = null;
      if (last.isConnected) last.focus({ preventScroll: true });
    }
  }
  if (talkFab && talkPanel) {
    talkFab.addEventListener("click", () => {
      if (!talkPanel.hidden) {
        setTalk(false);
        return;
      }
      talkLastFocus = document.activeElement;
      setTalk(true);
    });
    byId("talk-close").addEventListener("click", () => setTalk(false));
    talkPanel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setTalk(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...talkPanel.querySelectorAll("button,a")].filter(
        (el) => el.getClientRects().length && !el.disabled,
      );
      const first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    });
    document.addEventListener("click", (e) => {
      if (talkPanel.hidden || e.target.closest("#talk-dock")) return;
      setTalk(false);
    });
    talkPanel.addEventListener("click", (e) => {
      const opt = e.target.closest("[data-talk]");
      if (!opt) return;
      talkLastFocus = null; // the opened dialog takes over focus management
      setTalk(false);
      if (opt.dataset.talk === "admissions") featureActions["admissions"]();
      else if (opt.dataset.talk === "calendar") featureActions["calendar"]();
      else if (opt.dataset.talk === "visit") {
        featureActions["contact-form"]();
        const subject = byId("contact-subject");
        if (subject) subject.value = "School visit";
      }
    });
  }
  // Scroll reveals: progressive enhancement, disabled for reduced motion.
  if ("IntersectionObserver" in window) {
    const motionOff = () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.motion === "reduce";
    if (!motionOff()) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              io.unobserve(entry.target);
            }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
      );
      const revealSel =
        ".section-heading, .experience-card, .news-card, .purpose-grid > article, .leadership-grid article, .testimonial-cards article, .admission-steps article, .contact-methods article, .numbers-grid > div, .date-card, .resource-card, .facility-grid article";
      document.querySelectorAll(revealSel).forEach((el, i) => {
        el.classList.add("reveal");
        el.style.setProperty("--reveal-i", String(i % 6));
        io.observe(el);
      });
    }
  }
  // Freeze transitions for two frames whenever the palette switches, so
  // colours never sit mid-blend (deterministic for scans and users).
  {
    const rootEl = document.documentElement;
    let switchTimer = 0;
    new MutationObserver(() => {
      rootEl.classList.add("theme-switching");
      cancelAnimationFrame(switchTimer);
      switchTimer = requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          rootEl.classList.remove("theme-switching"),
        ),
      );
    }).observe(rootEl, {
      attributes: true,
      attributeFilter: ["data-theme", "data-contrast"],
    });
  }
  // Below-the-fold sections skip layout until near the viewport.
  document.querySelectorAll(".site-page").forEach((page) => {
    page.querySelectorAll(":scope > section").forEach((sec, i) => {
      if (i > 0 && !sec.classList.contains("hero") && !sec.querySelector('[data-scroll-grid]')) sec.classList.add("cv-auto");
    });
  });
  // A soft shadow tells you the header is floating above the content.
  const header = document.querySelector(".site-header");
  let hdrFrame = false;
  const headerScroll = () => {
    if (hdrFrame) return;
    hdrFrame = true;
    requestAnimationFrame(() => {
      header.classList.toggle("is-scrolled", scrollY > 8);
      hdrFrame = false;
    });
  };
  window.addEventListener("scroll", headerScroll, { passive: true });
  headerScroll();

  let initial = "home";
  try {
    initial = decodeURIComponent(location.hash.slice(1)) || "home";
  } catch {}
  go(initial, { history: false, focus: false, scroll: initial !== "home" });
})();
