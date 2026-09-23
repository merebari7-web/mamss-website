/* MAMSS v3 — authentic stories, a local-only enquiry planner and photo navigation. */
(() => {
  "use strict";
  const one = (q, root = document) => root.querySelector(q);
  const all = (q, root = document) => [...root.querySelectorAll(q)];
  const stories = {
    learning: { file: "mater_class", alt: "MAMSS students taking part in a classroom lesson", title: "Room for curiosity.\nSpace to grow.", text: "From classroom questions to a culture of reading, learning at MAMSS brings knowledge and character together.", href: "#learning", link: "Discover learning at MAMSS" },
    community: { file: "mamss_students", alt: "Students playing in the MAMSS school marching band", title: "Different gifts.\nA shared rhythm.", text: "Friendship, shared experiences and the school band are part of the life pictured in our school’s own photo collection.", href: "#school-life", link: "Explore our school community" },
    faith: { file: "visit031", alt: "A MAMSS student welcoming a member of the visiting clergy", title: "Faith that guides.\nCharacter that lasts.", text: "Rooted in Catholic teaching, MAMSS brings faith and education together under its motto: Service to God and Humanity.", href: "#purpose", link: "Explore our mission and vision" },
  };
  const storyKeys = Object.keys(stories);
  const storyPhoto = one("#story-photo"), imageStatus = one("#story-image-status");
  if (storyPhoto) {
  storyPhoto.addEventListener("error", () => { imageStatus.hidden = false; storyPhoto.style.visibility = "hidden"; });
  storyPhoto.addEventListener("load", () => { imageStatus.hidden = true; storyPhoto.style.visibility = ""; });
  one("#story-photo-retry").addEventListener("click", () => { storyPhoto.src = storyPhoto.getAttribute("src"); });
  if (storyPhoto.complete && !storyPhoto.naturalWidth) { imageStatus.hidden = false; storyPhoto.style.visibility = "hidden"; }

  function selectStory(key, focus = false) {
    if (!Object.hasOwn(stories, key)) return;
    const s = stories[key];
    all("[data-story]").forEach(b => {
      const active = b.dataset.story === key;
      b.setAttribute("aria-selected", String(active));
      b.tabIndex = active ? 0 : -1;
      if (active && focus) b.focus();
    });
    one("#story-panel").setAttribute("aria-labelledby", "story-tab-" + key);
    one("#story-photo").src = localPhoto(s.file);
    one("#story-photo").alt = s.alt;
    one("#story-title").textContent = s.title;
    one("#story-description").textContent = s.text;
    one(".story-number").textContent = `0${storyKeys.indexOf(key) + 1} / 03`;
    one("#story-link").href = s.href;
    one("#story-link").innerHTML = `${escapeHtml(s.link)} <span aria-hidden="true">↗</span>`;
    one("#story-status").textContent = `${key[0].toUpperCase() + key.slice(1)} story selected.`;
  }
  all("[data-story]").forEach((b, i) => {
    b.addEventListener("click", () => selectStory(b.dataset.story));
    b.addEventListener("keydown", e => {
      let next;
      if (e.key === "ArrowRight") next = (i + 1) % 3;
      if (e.key === "ArrowLeft") next = (i + 2) % 3;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = 2;
      if (next !== undefined) { e.preventDefault(); selectStory(storyKeys[next], true); }
    });
  });
  }

  // Answers never use storage, cookies, analytics or a network request.
  const topics = {
    places: ["Entry & admission", "Current places, forms, fees and assessment arrangements"],
    learning: ["Learning & support", "Subjects, study routines and support for students"],
    faith: ["Faith & school life", "Catholic formation, activities and the school community"],
    visit: ["Visiting the school", "A suitable time, where to go and whom to meet"],
  };
  const freshPlan = () => ({ entry: "", date: "", time: "", topics: ["places", "visit"], notes: "" });
  let plan = freshPlan(), step = 1, addedFingerprint = "", addedId = "";
  const entryLabel = () => plan.entry === "general" ? "General school enquiry" : plan.entry;
  const topicText = () => plan.topics.map(t => topics[t][1]).join("; ");
  function planText() {
    return `MAMSS — PERSONAL VISIT ENQUIRY\nNot a booking, application or confirmed school event.\nPrepared: ${dateLabel(lagosToday())}\n\nDear MAMSS school office,\n\nI would like to enquire about visiting Mater Misericordiae Secondary School.\nInterest: ${entryLabel()}.\n${plan.date ? `My proposed day is ${dateLabel(plan.date)}${plan.time ? ` at ${plan.time} (Lagos time)` : ""}. Please confirm whether this is suitable; I understand it is not a booking.` : "Please advise on a suitable day and time for a visit."}\n\nI would like to ask about:\n${plan.topics.length ? plan.topics.map(t => `• ${topics[t][1]}`).join("\n") : "• Visiting the school and learning more about MAMSS"}${plan.notes ? `\n\nAdditional question:\n${plan.notes}` : ""}\n\nPlease let me know whom to meet, where to report and any visitor requirements. Thank you.\n\nSCHOOL CONTACT\nNo. 2 Arochukwu Street, Rumuomasi, Port Harcourt, Rivers State.\nAdmissions: 0703 789 8216\nGeneral enquiries: 0901 365 3629\nEmail: matermesericordiae@gmail.com\n\nConfirm all dates, availability, fees and requirements directly with the school. The published 2026 entrance dates have passed. This website does not send this enquiry or reserve a place.\n`;
  }
  function syncForm() {
    const form = one("#visit-form");
    if (!form) return;
    if (step === 1) {
      plan.entry = one("#visit-entry").value;
      plan.date = one("#visit-date").value;
      plan.time = one("#visit-time").value;
    }
    if (step === 2) {
      plan.topics = all("[name=visit-topic]:checked", form).map(b => b.value);
      plan.notes = one("#visit-notes").value.slice(0, 400);
    }
  }
  function renderVisit(next = 1, focus = false) {
    step = next;
    const titles = ["A visit begins.<br><em>With a conversation.</em>", "Your questions.<br><em>A thoughtful first step.</em>", "Your plan.<br><em>Your next conversation.</em>"];
    const progress = ["Your interest", "Your questions", "Review & take away"].map((label, i) => `<li${i + 1 === step ? ' aria-current="step"' : ""}><span>${i + 1 < step ? "✓" : i + 1}</span>${label}</li>`).join("");
    let fields = "";
    if (step === 1) fields = `<p>Prepare a personal visit enquiry for the school office. Choose a published entry class, or simply come to learn more.</p><label for="visit-entry">What are you interested in? *</label><select id="visit-entry" required><option value="">Select an interest</option>${["JSS 1", "JSS 2", "SS 1", "SS 2", "general"].map(v => `<option value="${v}"${plan.entry === v ? " selected" : ""}>${v === "general" ? "General school enquiry" : v}</option>`).join("")}</select><div class="form-row"><div><label for="visit-date">Proposed day (optional)</label><input id="visit-date" type="date" min="${lagosToday()}" max="2100-12-31" value="${escapeHtml(plan.date)}"></div><div><label for="visit-time">Preferred time (Lagos, optional)</label><input id="visit-time" type="time" value="${escapeHtml(plan.time)}"></div></div><p class="visit-note">A preference is not a confirmed appointment. The school must confirm its availability. Leave the date blank if you are unsure.</p>`;
    if (step === 2) fields = `<fieldset class="visit-topics"><legend>What would you like to discuss?</legend>${Object.entries(topics).map(([key, [title, text]]) => `<label class="visit-topic"><input type="checkbox" name="visit-topic" value="${key}"${plan.topics.includes(key) ? " checked" : ""}><span><strong>${title}</strong><small>${text}</small></span></label>`).join("")}</fieldset><label for="visit-notes">One more question (optional, 400 characters)</label><textarea id="visit-notes" rows="3" maxlength="400" placeholder="For example: Who should I ask for when I arrive?">${escapeHtml(plan.notes)}</textarea><p class="visit-note">Do not include student records, passwords, medical details or other sensitive information.</p>`;
    if (step === 3) fields = `<div class="visit-review"><span>YOUR INTEREST</span><strong>${escapeHtml(entryLabel())}</strong><span>PROPOSED DAY · NOT CONFIRMED</span><strong>${plan.date ? escapeHtml(dateLabel(plan.date)) + (plan.time ? ` · ${escapeHtml(plan.time)} Lagos time` : "") : "Ask the school for a suitable time"}</strong></div><label for="visit-summary">Review your enquiry before using it</label><textarea id="visit-summary" rows="8" readonly>${escapeHtml(planText())}</textarea><div class="visit-actions"><a class="button" id="visit-mail" href="mailto:matermesericordiae@gmail.com?subject=${encodeURIComponent('School visit enquiry — ' + entryLabel())}&body=${encodeURIComponent(planText())}">Open email draft <span aria-hidden="true">↗</span></a><button type="button" class="button light" id="visit-download">Download my plan <span aria-hidden="true">↓</span></button><button type="button" class="button light" id="visit-copy">Copy enquiry</button></div><p class="visit-note">Review and send in your own email app. Nothing has been sent by this website. You can also call <a href="tel:+2347037898216">0703 789 8216</a>.</p><div class="visit-reminder"><div><strong>A small reminder for yourself.</strong><p>Optional: add a personal follow-up to your School Desk for the proposed day. No notification, booking or message is sent. ${deskState.consent ? "Device saving is already enabled." : "It lasts only for this visit unless you enable device saving in the desk."}</p></div><button class="button light" id="visit-reminder" type="button"${plan.date ? "" : " disabled"}>Add personal reminder</button>${plan.date ? "" : '<small>Go back to choose a proposed day if you want a reminder.</small>'}<button type="button" class="text-link" id="visit-desk">Open my School Desk <span aria-hidden="true">→</span></button></div>`;
    showDialog(`<div class="visit-planner"><p class="eyebrow">PERSONAL PLANNING · NOT A BOOKING</p><h2>${titles[step - 1]}</h2><ol class="visit-progress" aria-label="Visit enquiry steps">${progress}</ol><form id="visit-form">${fields}<p id="visit-error" class="form-error" role="alert"></p><p id="visit-status" class="visit-status" role="status"></p><div class="visit-navigation">${step > 1 ? '<button type="button" class="button light" id="visit-back">← Back</button>' : '<button type="button" class="text-link" id="visit-reset">Clear this plan</button>'}${step < 3 ? `<button class="button" type="submit">${step === 1 ? "Choose my questions" : "Review my enquiry"} <span aria-hidden="true">→</span></button>` : '<button type="button" class="text-link" id="visit-reset">Start a new plan</button>'}</div></form><p class="visit-privacy">Private by default. Answers stay only in this page until you reset or reload. Downloading a plan or adding a reminder is your choice. This is not an application or a school booking.</p></div>`);
    const form = one("#visit-form");
    form.addEventListener("input", syncForm);
    form.addEventListener("change", syncForm);
    form.addEventListener("submit", e => {
      e.preventDefault(); syncForm();
      if (step === 1 && (!plan.entry || (plan.date && (!validDate(plan.date) || plan.date < lagosToday())) || (plan.time && !plan.date))) {
        one("#visit-error").textContent = plan.time && !plan.date ? "Choose a proposed day, or leave the preferred time blank." : "Choose an interest and, if supplied, a valid day that is not in the past.";
        return;
      }
      if (step < 3) renderVisit(step + 1, true);
    });
    one("#visit-back")?.addEventListener("click", () => { syncForm(); renderVisit(step - 1, true); });
    one("#visit-reset")?.addEventListener("click", e => {
      if (e.currentTarget.dataset.confirm !== "yes") { e.currentTarget.dataset.confirm = "yes"; e.currentTarget.textContent = "Confirm: clear these answers"; return; }
      plan = freshPlan(); addedFingerprint = ""; addedId = ""; renderVisit(1, true);
    });
    if (step === 3) {
      const fingerprint = JSON.stringify(plan);
      if (addedFingerprint === fingerprint && deskState.reminders.some(r => r.id === addedId)) {
        one("#visit-reminder").disabled = true;
        one("#visit-reminder").textContent = "Added to my planner ✓";
      }
      one("#visit-download").addEventListener("click", () => {
        downloadFile("MAMSS-personal-visit-enquiry.txt", planText(), "text/plain;charset=utf-8");
        one("#visit-status").textContent = "Your personal plan has been prepared for download. Nothing has been sent to the school.";
      });
      one("#visit-copy").addEventListener("click", async () => {
        try {
          if (!navigator.clipboard) throw Error("Clipboard unavailable");
          await navigator.clipboard.writeText(planText());
          one("#visit-status").textContent = "Enquiry copied. Review it before sharing it with the school.";
        } catch {
          one("#visit-summary").focus(); one("#visit-summary").select();
          one("#visit-status").textContent = "Automatic copying is unavailable. Your enquiry is selected; use your device’s Copy command.";
        }
      });
      one("#visit-mail").addEventListener("click", () => { one("#visit-status").textContent = "Your email app may open. Review and send the draft there; this website has not sent it."; });
      one("#visit-reminder").addEventListener("click", () => {
        if (!plan.date || !validDate(plan.date)) return;
        if (deskState.reminders.length >= 100) { one("#visit-error").textContent = "Your planner already has 100 reminders. Delete an old reminder in the School Desk first."; return; }
        if (addedFingerprint === fingerprint && deskState.reminders.some(r => r.id === addedId)) return;
        addedId = crypto.randomUUID ? crypto.randomUUID() : "visit-" + Date.now();
        deskState.reminders.push({ id: addedId, title: "Contact MAMSS about a proposed visit", date: plan.date, time: plan.time, notes: `Personal follow-up, not a booking. Confirm the visit directly with the school.\nInterest: ${entryLabel()}.\nTopics: ${topicText()}.\n${plan.notes}`.slice(0, 500) });
        calendarDate = plan.date; calendarMonth = plan.date.slice(0, 7);
        commitDesk(); renderDesk(); addedFingerprint = fingerprint;
        one("#visit-reminder").disabled = true;
        one("#visit-reminder").textContent = "Added to my planner ✓";
        one("#visit-status").textContent = "Personal follow-up added. No booking, message or notification was sent.";
      });
      one("#visit-desk").addEventListener("click", () => { chooseDeskTab("planner"); contentDialog.close(); MAMSS.open("school-desk"); });
    }
    if (focus) { const h = one("#dialog-heading"); h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }
  all('[data-premium="visit"]').forEach(b => b.addEventListener("click", () => renderVisit(1)));

  function fitPhoto() {
    lightbox.dataset.zoom = "fit";
    one("#photo-zoom").setAttribute("aria-pressed", "false");
    one("#photo-zoom").innerHTML = 'Enlarge photograph <span aria-hidden="true">＋</span>';
    one(".lightbox-stage").scrollTo(0, 0);
  }
  function renderThumbnails() {
    fitPhoto();
    const strip = one(".photo-thumbs");
    strip.innerHTML = visiblePhotos.map((p, i) => `<button type="button" data-photo-jump="${i}" tabindex="${i === photoIndex ? 0 : -1}"${i === photoIndex ? ' aria-current="true"' : ""} aria-label="View photograph ${i + 1}: ${escapeHtml(p.caption)}"><img src="${assetURL(`assets/${p.file}--160.webp`)}" alt="" width="80" height="60" loading="lazy" decoding="async"></button>`).join("");
    const active = one('[aria-current="true"]', strip);
    if (active) requestAnimationFrame(() => { strip.scrollLeft = active.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2; });
  }
  function jumpPhoto(i) {
    photoIndex = (i + visiblePhotos.length) % visiblePhotos.length;
    updatePhoto();
    one(`[data-photo-jump="${photoIndex}"]`).focus({ preventScroll: true });
  }
  lightbox.addEventListener("mamss:photochange", renderThumbnails);
  one(".photo-thumbs").addEventListener("click", e => {
    const b = e.target.closest("[data-photo-jump]");
    if (b) jumpPhoto(Number(b.dataset.photoJump));
  });
  one(".photo-thumbs").addEventListener("keydown", e => {
    const b = e.target.closest("[data-photo-jump]");
    if (!b) return;
    let i;
    if (e.key === "ArrowRight") i = photoIndex + 1;
    if (e.key === "ArrowLeft") i = photoIndex - 1;
    if (e.key === "Home") i = 0;
    if (e.key === "End") i = visiblePhotos.length - 1;
    if (i !== undefined) { e.preventDefault(); e.stopPropagation(); jumpPhoto(i); }
  });
  one("#photo-zoom").addEventListener("click", () => {
    if (lightbox.dataset.zoom === "in") { fitPhoto(); return; }
    lightbox.dataset.zoom = "in";
    one("#photo-zoom").setAttribute("aria-pressed", "true");
    one("#photo-zoom").innerHTML = 'Fit photograph <span aria-hidden="true">−</span>';
    one(".lightbox-stage").focus();
  });
  lightbox.addEventListener("close", fitPhoto);
})();
