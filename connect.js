/* MAMSS — school connection layer.
   Two opt-in server features layered on top of the static site:
     1. sending a prepared visit enquiry to the school office, and
     2. an assistant that answers from the school's published information.
   Both are progressive enhancements. The same files are also published as a
   purely static site with no API at all, so every call is capability-checked
   and every failure falls back to the existing email/phone routes. Nothing
   contacts the server until a visitor opens one of these two features. */
(() => {
  "use strict";

  const API = "/api";
  const CAP_KEY = "mamss.connect.capabilities";
  const PHONE = "0703 789 8216";

  const el = (tag, props = {}, children = []) => {
    const node = Object.assign(document.createElement(tag), props);
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  };
  const motionOff = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.motion === "reduce";

  /* ------------------------------------------------------ capabilities */
  let capPromise = null;

  /** Ask once per visit which server features this deploy actually has. */
  function capabilities() {
    if (capPromise) return capPromise;
    let cached = null;
    try {
      cached = JSON.parse(sessionStorage.getItem(CAP_KEY) || "null");
    } catch {
      /* Storage may be blocked; the probe below still works. */
    }
    if (cached) {
      capPromise = Promise.resolve(cached);
      return capPromise;
    }
    capPromise = fetch(`${API}/capabilities`, { headers: { accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : { enquiries: false, assistant: false }))
      .catch(() => ({ enquiries: false, assistant: false }))
      .then((caps) => {
        try {
          sessionStorage.setItem(CAP_KEY, JSON.stringify(caps));
        } catch {
          /* Not being able to remember this is harmless. */
        }
        return caps;
      });
    return capPromise;
  }

  /* --------------------------------------------- send enquiry to school */
  const draft = { entryClass: "", proposedDate: "", proposedTime: "", topics: [], message: "" };

  function captureDraft(form) {
    const entry = form.querySelector("#visit-entry");
    if (entry) {
      draft.entryClass = entry.value;
      draft.proposedDate = form.querySelector("#visit-date")?.value || "";
      draft.proposedTime = form.querySelector("#visit-time")?.value || "";
    }
    const topics = form.querySelectorAll('[name="visit-topic"]');
    if (topics.length) draft.topics = [...topics].filter((t) => t.checked).map((t) => t.value);
    const notes = form.querySelector("#visit-notes");
    if (notes) draft.message = notes.value;
  }

  /** Recover the chosen class from the review panel if the steps were not seen. */
  function backfillFromReview(panel) {
    if (draft.entryClass) return;
    const shown = panel.querySelector(".visit-review strong")?.textContent?.trim() || "";
    if (/^(JSS|SS)\s?\d$/.test(shown)) draft.entryClass = shown;
    else if (shown) draft.entryClass = "general";
  }

  function buildSendPanel() {
    const status = el("p", { className: "send-status", id: "send-status", role: "status" });
    const error = el("p", { className: "send-status", id: "send-error", role: "alert" });
    error.dataset.tone = "error";

    const name = el("input", { type: "text", id: "send-name", name: "name", required: true, maxLength: 120, autocomplete: "name" });
    const email = el("input", { type: "email", id: "send-email", name: "email", maxLength: 160, autocomplete: "email" });
    const phone = el("input", { type: "tel", id: "send-phone", name: "phone", maxLength: 40, autocomplete: "tel" });
    const consent = el("input", { type: "checkbox", id: "send-consent", required: true });
    const submit = el("button", { type: "submit", className: "button", textContent: "Send to the school office" });

    const form = el("form", { id: "send-form", noValidate: true }, [
      el("div", { className: "form-row" }, [
        el("div", {}, [el("label", { htmlFor: "send-name", textContent: "Your name *" }), name]),
        el("div", {}, [el("label", { htmlFor: "send-email", textContent: "Email address" }), email]),
        el("div", {}, [el("label", { htmlFor: "send-phone", textContent: "Phone number" }), phone]),
      ]),
      el("label", { className: "send-consent", htmlFor: "send-consent" }, [
        consent,
        el("span", {
          textContent:
            "Send this enquiry to the school office and store it there so a member of staff can reply to me.",
        }),
      ]),
      el("div", { className: "send-actions" }, [submit]),
      error,
      status,
    ]);

    const panel = el("section", { className: "send-office" }, [
      el("h3", { textContent: "Prefer the school to contact you?" }),
      el("p", {
        textContent:
          "You can send this enquiry straight to the school office instead of emailing it yourself. " +
          "Give at least an email address or a phone number so a member of staff can reply.",
      }),
      form,
      el("p", {
        className: "send-privacy",
        textContent:
          "Sending stores your name, contact details and the questions above in the school’s enquiry desk, " +
          "where school staff can read them. It is still not an application, a booking or a confirmed place. " +
          "Do not include student records, passwords, payment or medical details.",
      }),
    ]);

    return { panel, form, name, email, phone, consent, submit, status, error };
  }

  function attachSendPanel(container) {
    if (container.querySelector(".send-office")) return;
    const actions = container.querySelector(".visit-actions");
    if (!actions) return;
    backfillFromReview(container);

    const ui = buildSendPanel();
    actions.insertAdjacentElement("afterend", ui.panel);

    ui.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      ui.error.textContent = "";
      ui.status.textContent = "";

      const payload = {
        name: ui.name.value.trim(),
        email: ui.email.value.trim(),
        phone: ui.phone.value.trim(),
        entryClass: draft.entryClass || "general",
        proposedDate: draft.proposedDate,
        proposedTime: draft.proposedTime,
        topics: draft.topics,
        message: draft.message,
      };

      if (payload.name.length < 2) {
        ui.error.textContent = "Please give the name the school should reply to.";
        ui.name.focus();
        return;
      }
      if (!payload.email && !payload.phone) {
        ui.error.textContent = "Add an email address or a phone number so the school can reply.";
        ui.email.focus();
        return;
      }
      if (!ui.consent.checked) {
        ui.error.textContent = "Tick the box to confirm the school may receive and store this enquiry.";
        ui.consent.focus();
        return;
      }

      ui.submit.disabled = true;
      ui.status.textContent = "Sending your enquiry to the school office…";

      try {
        const response = await fetch(`${API}/enquiries`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          ui.status.textContent = "";
          ui.error.textContent =
            data.error || `Your enquiry could not be sent. Please call the school on ${PHONE}.`;
          ui.submit.disabled = false;
          return;
        }

        ui.status.textContent = "";
        ui.form.replaceWith(
          el("div", { className: "send-receipt" }, [
            el("strong", { textContent: `Enquiry sent. Your reference is MAMSS-${data.id}.` }),
            el("p", {
              textContent:
                "The school office can now see your enquiry. A reply is not automatic and this website " +
                `cannot confirm a date or a place — please call ${PHONE} if your visit is urgent.`,
            }),
          ]),
        );
      } catch {
        ui.status.textContent = "";
        ui.error.textContent =
          `Your enquiry could not be sent — you may be offline. Use the email draft above, or call ${PHONE}.`;
        ui.submit.disabled = false;
      }
    });
  }

  /* ------------------------------------------------------ honest wording */

  /* Version 3.1 and earlier could promise, without qualification, that this
     website sends nothing anywhere. Two optional steps in version 3.2 do
     contact a service, so the promise needs narrowing to stay true. The
     corrections live here rather than in the authored page copy because this
     file is also what provides those steps: where it is absent or fails to
     load, no enquiry can be sent and no question can be asked, and the
     original unqualified wording is accurate exactly as written. */

  function retext(node, from, to) {
    if (node && node.textContent.includes(from))
      node.textContent = node.textContent.replace(from, to);
  }

  function correctTalkNote() {
    retext(
      document.querySelector(".talk-note"),
      "No message is sent from this website.",
      "Nothing is sent unless you choose to start a message or ask the assistant.",
    );
  }

  function correctPrivacyCopy(host) {
    retext(
      host.querySelector(".visit-privacy"),
      "Answers stay only in this page until you reset or reload.",
      "Answers stay in this page unless you choose to send them to the school at the review step.",
    );

    const headings = [...host.querySelectorAll("h3")];
    const contact = headings.find((h) => h.textContent.trim() === "Contact and search");
    if (contact)
      retext(
        contact.nextElementSibling,
        "The guided visit planner keeps its answers only in this page until you reset it or reload.",
        "The guided visit planner keeps its answers in this page unless you choose to send them to the school.",
      );

    const offline = headings.find((h) => h.textContent.trim() === "Offline access");
    if (!offline || host.querySelector("[data-connect-privacy]")) return;
    const heading = document.createElement("h3");
    heading.dataset.connectPrivacy = "1";
    heading.textContent = "Sending an enquiry, and the assistant";
    const body = document.createElement("p");
    body.textContent =
      "Two optional steps do reach a service. If you complete the guided planner and " +
      "then choose to send it, the name, contact details, entry class, preferred date " +
      "and message you entered are stored in the school’s own enquiry database, where " +
      "signed-in school staff can read them and reply. If you ask the assistant a " +
      "question, that question is sent to the school’s AI provider so it can write an " +
      "answer, and is not kept afterwards. Both steps are clearly marked, and neither " +
      "happens unless you choose it. Where this website is published without the " +
      "school’s service, neither step appears and nothing is sent.";
    offline.insertAdjacentElement("beforebegin", heading);
    heading.insertAdjacentElement("afterend", body);
  }

  /** Watch the shared dialog for the guided enquiry, without altering it. */
  function watchEnquiry() {
    const host = document.getElementById("dialog-content");
    if (!host) return;
    // Capture phase: the step's own submit handler replaces this markup, so the
    // answers have to be read before it runs, not after.
    host.addEventListener(
      "submit",
      (event) => {
        const form = event.target;
        if (form instanceof HTMLFormElement && form.id === "visit-form") captureDraft(form);
      },
      true,
    );
    new MutationObserver(() => {
      correctPrivacyCopy(host);
      const form = host.querySelector("#visit-form");
      if (!form) return;
      if (!form.dataset.connectBound) {
        form.dataset.connectBound = "1";
        captureDraft(form);
        form.addEventListener("input", () => captureDraft(form));
        form.addEventListener("change", () => captureDraft(form));
      }
      if (host.querySelector("#visit-summary"))
        capabilities().then((caps) => {
          if (caps.enquiries && host.querySelector("#visit-summary")) attachSendPanel(host);
        });
    }).observe(host, { childList: true, subtree: true });
  }

  /* ---------------------------------------------------------- assistant */
  const SUGGESTIONS = [
    "Which classes can I apply for?",
    "Where do I collect an application form?",
    "What are the entrance exam subjects?",
    "How do I arrange a visit?",
  ];

  let askDialog = null;
  let history = [];
  let busy = false;

  function renderAnswer(node, text) {
    node.textContent = "";
    for (const para of text.split(/\n{2,}/))
      if (para.trim()) node.append(el("p", { textContent: para.trim() }));
    if (!node.childElementCount) node.append(el("p", { textContent: text }));
  }

  function buildAsk() {
    const log = el("div", { className: "ask-log", id: "ask-log" });
    log.setAttribute("role", "log");
    log.setAttribute("aria-live", "polite");
    log.setAttribute("aria-label", "Assistant conversation");

    const intro = el("div", { className: "ask-intro" }, [
      el("strong", { textContent: "Ask about what the school has published." }),
      el("p", {
        textContent:
          "This assistant answers from the information on this website. It cannot apply, book a place, " +
          "see any student record or confirm fees and dates — the school office does that. " +
          "Please do not type personal or sensitive details.",
      }),
    ]);
    const chips = el("div", { className: "ask-suggestions" });
    for (const text of SUGGESTIONS) {
      const chip = el("button", { type: "button", textContent: text });
      chip.addEventListener("click", () => send(text));
      chips.append(chip);
    }
    intro.append(chips);
    log.append(intro);

    const field = el("textarea", {
      id: "ask-input",
      rows: 1,
      maxLength: 600,
      placeholder: "Ask about admissions, learning or school life…",
    });
    const sendBtn = el("button", { type: "submit", className: "ask-send", textContent: "Ask" });
    const form = el("form", { className: "ask-form" }, [
      el("label", { htmlFor: "ask-input", textContent: "Your question" }),
      field,
      sendBtn,
    ]);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      send(field.value);
    });
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        send(field.value);
      }
    });

    const close = el("button", {
      type: "button",
      className: "ask-close",
      innerHTML: "&#215;",
      title: "Close the assistant",
    });
    close.setAttribute("aria-label", "Close the assistant");

    const dialog = el("dialog", { className: "ask-dialog", id: "ask-dialog" }, [
      el("div", { className: "ask-shell" }, [
        el("div", { className: "ask-head" }, [
          el("div", {}, [
            el("p", { textContent: "MAMSS ASSISTANT · PUBLISHED INFORMATION" }),
            el("h2", { id: "ask-title", textContent: "Ask about the school" }),
          ]),
          close,
        ]),
        log,
        form,
        el("p", {
          className: "ask-foot",
          textContent:
            "Answers are generated from this website’s published content and can be wrong or incomplete. " +
            `Always confirm admissions, fees, places and dates with the school on ${PHONE}. ` +
            "Your questions are sent to the school’s AI provider to produce an answer and are not saved to your device.",
        }),
      ]),
    ]);
    dialog.setAttribute("aria-labelledby", "ask-title");
    close.addEventListener("click", () => dialog.close());
    document.body.append(dialog);

    return Object.assign(dialog, { log, field, sendBtn });
  }

  async function send(question) {
    const text = (question || "").trim();
    if (!text || busy || !askDialog) return;
    busy = true;
    askDialog.field.value = "";
    askDialog.sendBtn.disabled = true;

    askDialog.log.querySelector(".ask-intro")?.remove();
    const asked = el("div", { className: "ask-turn" }, [el("p", { textContent: text })]);
    asked.dataset.role = "user";
    const answer = el("div", { className: "ask-turn" }, [el("p", { textContent: "Thinking…" })]);
    answer.dataset.role = "assistant";
    answer.dataset.pending = "yes";
    askDialog.log.append(asked, answer);
    askDialog.log.scrollTop = askDialog.log.scrollHeight;

    const finish = (message) => {
      renderAnswer(answer, message);
      delete answer.dataset.pending;
      busy = false;
      askDialog.sendBtn.disabled = false;
      askDialog.log.scrollTop = askDialog.log.scrollHeight;
    };

    try {
      const response = await fetch(`${API}/assistant`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text, history: history.slice(-10) }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        finish(data.error || `The assistant is unavailable. Please call the school on ${PHONE}.`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        renderAnswer(answer, full);
        askDialog.log.scrollTop = askDialog.log.scrollHeight;
      }
      history = [...history, { role: "user", content: text }, { role: "assistant", content: full }].slice(-10);
      finish(full || "No answer was returned. Please call the school on " + PHONE + ".");
    } catch {
      finish(`The assistant could not be reached — you may be offline. Please call the school on ${PHONE}.`);
    }
  }

  function openAsk() {
    if (!askDialog) askDialog = buildAsk();
    if (!askDialog.open) askDialog.showModal();
    askDialog.field.focus({ preventScroll: true });
  }

  /** Offer the assistant from the existing quick-help panel. */
  function addAskEntry() {
    const panel = document.getElementById("talk-panel");
    const note = panel?.querySelector(".talk-note");
    if (!panel || !note || panel.querySelector("#talk-ask")) return;

    const button = el("button", { className: "talk-option", id: "talk-ask", type: "button" }, [
      el("span", { textContent: "Ask the MAMSS assistant" }),
      el("b", { textContent: "→" }),
    ]);
    button.querySelector("b").setAttribute("aria-hidden", "true");
    button.addEventListener("click", () => {
      document.getElementById("talk-close")?.click();
      openAsk();
    });
    note.insertAdjacentElement("beforebegin", button);
  }

  function start() {
    correctTalkNote();
    watchEnquiry();
    // The server is contacted only once a visitor shows intent: opening quick
    // help, or reaching the review step of the guided enquiry. An ordinary
    // visit to the website still makes no request to any service.
    document.getElementById("talk-fab")?.addEventListener(
      "click",
      () => capabilities().then((caps) => caps.assistant && addAskEntry()),
      { once: true },
    );
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.MAMSSConnect = Object.freeze({ capabilities, openAsk, motionOff });
})();
