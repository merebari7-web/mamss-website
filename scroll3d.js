/* MAMSS — scroll-linked 3D depth controller.
   Marks elements for the stylesheet, prefers native scroll-driven animations,
   and falls back to a one-shot IntersectionObserver reveal. No scroll handler,
   no animation loop, no library. Silent and harmless if anything is missing. */
(() => {
  "use strict";
  const root = document.documentElement;
  if (!("matchMedia" in window) || !CSS?.supports?.("transform", "perspective(900px) rotateX(3deg)")) return;

  const reduceQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const nativeTimeline = CSS.supports("animation-timeline", "view()");

  /** The visitor's own reduced-motion choice always wins, including the
      motion preference they may already have saved in the School Desk. */
  const motionOff = () => reduceQuery.matches || root.dataset.motion === "reduce";

  const RISE =
    ".section-heading, .chapter-heading, .experience-card, .learning-card, .news-card," +
    " .date-card, .purpose-grid > article, .leadership-grid article, .testimonial-cards article," +
    " .admission-steps article, .contact-methods article, .numbers-grid > div, .resource-card," +
    " .facility-grid article";
  const FRAME = ".chapter-photo, .image-wrap";
  const STAGE = ".chapter-with-photo .chapter-photo";

  let observer = null;

  function markAll() {
    document.querySelectorAll(RISE).forEach((el, i) => {
      if (el.dataset.s3d) return;
      el.dataset.s3d = "rise";
      el.dataset.s3dI = String(i % 4);
      el.style.setProperty("--s3d-i", String(i % 4));
    });
    document.querySelectorAll(FRAME).forEach((el) => {
      if (!el.dataset.s3d && el.querySelector(":scope > img")) el.dataset.s3d = "frame";
    });
    document.querySelectorAll(STAGE).forEach((el) => {
      el.dataset.s3d = "stage";
    });
    const hero = document.querySelector(".hero-copy");
    if (hero && !hero.dataset.s3d) hero.dataset.s3d = "hero";

    if (finePointer.matches)
      document.querySelectorAll(".experience-card, .learning-card, .news-card").forEach((el) => {
        el.setAttribute("data-s3d-tilt", "");
      });

    if (observer)
      document.querySelectorAll('[data-s3d="rise"], [data-s3d="stage"]').forEach((el) => {
        if (!el.dataset.s3dWatched) {
          el.dataset.s3dWatched = "1";
          observer.observe(el);
        }
      });
  }

  function enable() {
    if (motionOff()) {
      disable();
      return;
    }
    if (!nativeTimeline && !observer && "IntersectionObserver" in window)
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting) {
              entry.target.classList.add("s3d-in");
              observer.unobserve(entry.target);
            }
        },
        { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
      );

    // Without both a timeline and an observer, showing the plain page is correct.
    if (!nativeTimeline && !observer) return;
    root.dataset.scroll3d = nativeTimeline ? "on" : "fallback";
    markAll();
  }

  function disable() {
    delete root.dataset.scroll3d;
    document.querySelectorAll("[data-s3d]").forEach((el) => el.classList.add("s3d-in"));
  }

  // Pointer tilt writes only two custom properties, throttled to one frame.
  let tiltFrame = 0;
  function onPointer(event) {
    if (tiltFrame || !root.dataset.scroll3d) return;
    const card = event.target.closest?.("[data-s3d-tilt]");
    if (!card) return;
    tiltFrame = requestAnimationFrame(() => {
      tiltFrame = 0;
      const box = card.getBoundingClientRect();
      if (!box.width || !box.height) return;
      card.style.setProperty("--s3d-tx", (((event.clientX - box.left) / box.width - 0.5) * 6).toFixed(2));
      card.style.setProperty("--s3d-ty", (((event.clientY - box.top) / box.height - 0.5) * 6).toFixed(2));
    });
  }

  function resetTilt(event) {
    const card = event.target.closest?.("[data-s3d-tilt]");
    if (!card) return;
    card.style.setProperty("--s3d-tx", "0");
    card.style.setProperty("--s3d-ty", "0");
  }

  function start() {
    enable();
    if (finePointer.matches) {
      document.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("pointerleave", resetTilt, true);
    }
    // Chapter changes swap in content that has never been marked.
    window.addEventListener("hashchange", () => {
      if (root.dataset.scroll3d) markAll();
    });
    reduceQuery.addEventListener?.("change", () => (motionOff() ? disable() : enable()));
    new MutationObserver(() => {
      if (motionOff()) disable();
      else if (!root.dataset.scroll3d) enable();
    }).observe(root, { attributeFilter: ["data-motion"] });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
