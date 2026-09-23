/* MAMSS — private staff enquiry desk.
   Sign-in happens on the server, so this page ships no authentication library
   and no third-party script. The session cookie the function sets is what
   authorises every later request; the server re-checks the staff role on each
   one, so nothing here is trusted as a security boundary. */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const STATUSES = [
    ["new", "New"],
    ["read", "Read"],
    ["answered", "Answered"],
    ["closed", "Closed"],
  ];
  const TOPICS = {
    places: "Entry & admission",
    learning: "Learning & support",
    faith: "Faith & school life",
    visit: "Visiting the school",
  };

  const state = { filter: "all", enquiries: [] };

  const el = (tag, props = {}, children = []) => {
    const node = Object.assign(document.createElement(tag), props);
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  };

  const api = async (path, options = {}) => {
    const response = await fetch(path, {
      ...options,
      headers: { "content-type": "application/json", ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || "Request failed"), { status: response.status });
    return data;
  };

  const dateLabel = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.valueOf())
      ? String(value)
      : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  };

  /* ------------------------------------------------------------- render */
  function enquiryCard(item) {
    const card = el("li", { className: "enquiry" });
    card.dataset.status = item.status;

    const tag = el("span", { className: "enquiry-tag", textContent: item.status });
    card.append(
      el("div", { className: "enquiry-top" }, [
        el("h3", { textContent: item.name }),
        el("span", { className: "enquiry-when", textContent: `${dateLabel(item.createdAt)} · MAMSS-${item.id}` }),
      ]),
      tag,
    );

    const list = el("dl");
    const row = (term, value) => {
      if (!value) return;
      list.append(el("dt", { textContent: term }), el("dd", {}, [value]));
    };
    row("Interest", el("span", { textContent: item.entryClass === "general" ? "General enquiry" : item.entryClass }));
    if (item.email) row("Email", el("a", { href: `mailto:${item.email}`, textContent: item.email }));
    if (item.phone) row("Phone", el("a", { href: `tel:${item.phone.replace(/[^\d+]/g, "")}`, textContent: item.phone }));
    if (item.proposedDate)
      row(
        "Proposed day",
        el("span", {
          textContent: `${item.proposedDate}${item.proposedTime ? ` at ${item.proposedTime} (Lagos)` : ""} — not confirmed`,
        }),
      );
    const topics = (item.topics || "")
      .split(",")
      .filter(Boolean)
      .map((key) => TOPICS[key] || key)
      .join(", ");
    if (topics) row("Wants to discuss", el("span", { textContent: topics }));
    card.append(list);

    // User-entered text is set as textContent, never markup.
    if (item.message) card.append(el("p", { className: "enquiry-message", textContent: item.message }));

    const actions = el("div", { className: "enquiry-actions" });
    actions.setAttribute("role", "group");
    actions.setAttribute("aria-label", `Status for enquiry MAMSS-${item.id}`);
    for (const [value, label] of STATUSES) {
      const button = el("button", { type: "button", textContent: label });
      button.setAttribute("aria-pressed", String(item.status === value));
      button.addEventListener("click", async () => {
        try {
          await api(`/api/enquiries/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: value }) });
          item.status = value;
          render();
        } catch (error) {
          setState(error.message);
        }
      });
      actions.append(button);
    }
    card.append(actions);

    const note = el("textarea", { id: `note-${item.id}`, rows: 2, maxLength: 500, value: item.staffNote || "" });
    const saved = el("span", { className: "enquiry-saved", role: "status" });
    let timer = 0;
    note.addEventListener("input", () => {
      clearTimeout(timer);
      saved.textContent = "";
      timer = setTimeout(async () => {
        try {
          await api(`/api/enquiries/${item.id}`, { method: "PATCH", body: JSON.stringify({ staffNote: note.value }) });
          item.staffNote = note.value;
          saved.textContent = "Note saved";
        } catch (error) {
          saved.textContent = error.message;
        }
      }, 700);
    });
    card.append(
      el("div", { className: "enquiry-note" }, [
        el("label", { htmlFor: `note-${item.id}`, textContent: "Internal note (visible to staff only)" }),
        note,
        saved,
      ]),
    );

    return card;
  }

  function render() {
    const list = $("#staff-list");
    const shown =
      state.filter === "all" ? state.enquiries : state.enquiries.filter((item) => item.status === state.filter);
    list.replaceChildren(...shown.map(enquiryCard));
    if (!shown.length)
      list.append(
        el("li", {
          className: "staff-note",
          textContent:
            state.filter === "all"
              ? "No enquiries have been sent through the website yet."
              : `No enquiries are marked “${state.filter}”.`,
        }),
      );
    const outstanding = state.enquiries.filter((item) => item.status === "new").length;
    $("#staff-count").textContent = `${state.enquiries.length} enquir${state.enquiries.length === 1 ? "y" : "ies"} · ${outstanding} new`;
  }

  const setState = (message) => {
    $("#staff-state").textContent = message || "";
  };

  function showSignedIn(session) {
    $("#staff-login").hidden = true;
    $("#staff-desk").hidden = false;
    $("#staff-who").hidden = false;
    $("#staff-who").textContent = session.email;
    $("#staff-logout").hidden = false;
  }

  function showSignedOut(message) {
    $("#staff-desk").hidden = true;
    $("#staff-login").hidden = false;
    $("#staff-who").hidden = true;
    $("#staff-logout").hidden = true;
    setState(message || "");
  }

  async function loadEnquiries() {
    setState("Loading enquiries…");
    try {
      const data = await api("/api/enquiries");
      state.enquiries = data.enquiries || [];
      setState("");
      render();
      return true;
    } catch (error) {
      if (error.status === 401) showSignedOut("Your session has ended. Please sign in again.");
      else showSignedOut(error.message);
      return false;
    }
  }

  async function init() {
    try {
      const session = await api("/api/staff/session");
      if (session.signedIn && session.authorised) {
        showSignedIn(session);
        await loadEnquiries();
      } else if (session.signedIn) {
        showSignedOut(
          "This account has no school staff role yet. A project administrator must add the 'staff' or 'admin' role in Netlify Identity.",
        );
      } else {
        showSignedOut("");
      }
    } catch (error) {
      showSignedOut(error.message);
    }

    $("#staff-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = $("#staff-submit");
      $("#staff-error").textContent = "";
      button.disabled = true;
      setState("Signing in…");
      try {
        const session = await api("/api/staff/login", {
          method: "POST",
          body: JSON.stringify({ email: $("#staff-email").value.trim(), password: $("#staff-password").value }),
        });
        $("#staff-password").value = "";
        if (!session.authorised) {
          setState("");
          $("#staff-error").textContent =
            "Signed in, but this account has no staff role yet. Ask a project administrator to add it in Netlify Identity.";
          return;
        }
        showSignedIn(session);
        await loadEnquiries();
      } catch (error) {
        setState("");
        $("#staff-error").textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });

    $("#staff-logout").addEventListener("click", async () => {
      try {
        await api("/api/staff/logout", { method: "POST" });
      } catch {
        /* Signing out locally is still the right outcome. */
      }
      state.enquiries = [];
      showSignedOut("You have been signed out.");
    });

    for (const button of document.querySelectorAll(".staff-filters button"))
      button.addEventListener("click", () => {
        state.filter = button.dataset.filter;
        for (const other of document.querySelectorAll(".staff-filters button"))
          other.setAttribute("aria-pressed", String(other === button));
        render();
      });
  }

  init();
})();
