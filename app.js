/* Plant Care — offline-first watering tracker.
 * Data lives in localStorage; no server required. */
(() => {
  "use strict";

  const STORAGE_KEY = "plantcare.v1";
  const DAY_MS = 24 * 60 * 60 * 1000;

  // ---- State ---------------------------------------------------------------
  /** @type {Array} */
  let plants = load();
  let activeFilter = "all";
  let editingId = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("Could not load plants:", e);
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
    } catch (e) {
      toast("Couldn't save — storage may be full.");
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ---- Date helpers --------------------------------------------------------
  function todayKey() {
    return dateKey(new Date());
  }
  function dateKey(d) {
    // local YYYY-MM-DD (avoids timezone drift from toISOString)
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function parseKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function daysBetween(aKey, bKey) {
    return Math.round((parseKey(bKey) - parseKey(aKey)) / DAY_MS);
  }

  /** Returns {nextKey, daysUntil, level, label} for a plant. */
  function waterStatus(p) {
    const today = todayKey();
    const next = new Date(parseKey(p.lastWatered).getTime() + p.intervalDays * DAY_MS);
    const nextKey = dateKey(next);
    const daysUntil = daysBetween(today, nextKey);

    let level, label;
    if (daysUntil < 0) {
      level = "overdue";
      const n = Math.abs(daysUntil);
      label = `Overdue by ${n} day${n === 1 ? "" : "s"}`;
    } else if (daysUntil === 0) {
      level = "due";
      label = "Water today";
    } else if (daysUntil === 1) {
      level = "ok";
      label = "Water tomorrow";
    } else {
      level = "ok";
      label = `Water in ${daysUntil} days`;
    }
    return { nextKey, daysUntil, level, label };
  }

  function prettyDate(key) {
    return parseKey(key).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  // ---- Rendering -----------------------------------------------------------
  const listEl = document.getElementById("list");
  const summaryEl = document.getElementById("summary");

  function render() {
    renderSummary();

    const filtered = plants
      .filter((p) => {
        if (activeFilter === "indoor") return p.type === "indoor";
        if (activeFilter === "outdoor") return p.type === "outdoor";
        if (activeFilter === "due") return waterStatus(p).daysUntil <= 0;
        return true;
      })
      .sort((a, b) => waterStatus(a).daysUntil - waterStatus(b).daysUntil);

    listEl.innerHTML = "";

    if (filtered.length === 0) {
      listEl.appendChild(emptyState());
      return;
    }

    for (const p of filtered) {
      listEl.appendChild(card(p));
    }
  }

  function renderSummary() {
    if (plants.length === 0) {
      summaryEl.textContent = "No plants yet — tap + to add one.";
      return;
    }
    const needy = plants.filter((p) => waterStatus(p).daysUntil <= 0).length;
    if (needy === 0) {
      summaryEl.textContent = `🌱 All ${plants.length} plant${plants.length === 1 ? "" : "s"} are happy.`;
    } else {
      summaryEl.textContent = `💧 ${needy} plant${needy === 1 ? " needs" : "s need"} watering.`;
    }
  }

  function emptyState() {
    const div = document.createElement("div");
    div.className = "empty";
    const msg =
      activeFilter === "due"
        ? "Nothing needs water right now. 🎉"
        : "No plants here yet.<br>Tap the + button to add your first plant.";
    div.innerHTML = `<div class="leaf">🪴</div><p>${msg}</p>`;
    return div;
  }

  function card(p) {
    const st = waterStatus(p);
    const el = document.createElement("article");
    el.className = "card";

    const main = document.createElement("div");
    main.className = "card-main";
    main.innerHTML = `
      <p class="card-name">${escapeHtml(p.name)}</p>
      <div class="card-meta">
        <span class="badge ${p.type}">${p.type === "indoor" ? "🏠 Indoor" : "🌳 Outdoor"}</span>
        <span class="status ${st.level}">${st.label}</span>
      </div>`;
    main.addEventListener("click", () => openDetail(p.id));

    const btn = document.createElement("button");
    btn.className = "water-btn";
    btn.innerHTML = `<span class="drop">💧</span>Water`;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      waterPlant(p.id);
    });

    el.appendChild(main);
    el.appendChild(btn);
    return el;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  // ---- Actions -------------------------------------------------------------
  function waterPlant(id) {
    const p = plants.find((x) => x.id === id);
    if (!p) return;
    const today = todayKey();
    p.lastWatered = today;
    p.history = p.history || [];
    if (!p.history.includes(today)) p.history.unshift(today);
    p.history = p.history.slice(0, 60);
    save();
    render();
    toast(`💧 Watered ${p.name}`);
  }

  function deletePlant(id) {
    plants = plants.filter((x) => x.id !== id);
    save();
    render();
    toast("Plant removed");
  }

  // ---- Add / edit dialog ---------------------------------------------------
  const dialog = document.getElementById("plantDialog");
  const form = document.getElementById("plantForm");
  const dialogTitle = document.getElementById("dialogTitle");

  function openAdd() {
    editingId = null;
    dialogTitle.textContent = "Add a plant";
    form.reset();
    form.elements.lastWatered.value = todayKey();
    form.elements.type.value = "indoor";
    showDialog(dialog);
    setTimeout(() => form.elements.name.focus(), 100);
  }

  function openEdit(p) {
    editingId = p.id;
    dialogTitle.textContent = "Edit plant";
    form.elements.name.value = p.name;
    form.elements.intervalDays.value = p.intervalDays;
    form.elements.lastWatered.value = p.lastWatered;
    form.elements.notes.value = p.notes || "";
    form.querySelector(`input[name="type"][value="${p.type}"]`).checked = true;
    showDialog(dialog);
  }

  form.addEventListener("submit", (e) => {
    // method=dialog closes automatically; we just persist.
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    if (!name) {
      e.preventDefault();
      return;
    }
    const data = {
      name,
      type: fd.get("type") === "outdoor" ? "outdoor" : "indoor",
      intervalDays: Math.max(1, Math.min(365, Number(fd.get("intervalDays")) || 7)),
      lastWatered: String(fd.get("lastWatered") || todayKey()),
      notes: String(fd.get("notes") || "").trim(),
    };

    if (editingId) {
      const p = plants.find((x) => x.id === editingId);
      Object.assign(p, data);
    } else {
      plants.push({ id: uid(), createdAt: todayKey(), history: [], ...data });
    }
    save();
    render();
    toast(editingId ? "Saved" : "Plant added 🌱");
    editingId = null;
  });

  document.getElementById("cancelBtn").addEventListener("click", () => dialog.close());

  // ---- Detail dialog -------------------------------------------------------
  const detailDialog = document.getElementById("detailDialog");
  const detailBody = document.getElementById("detailBody");

  function openDetail(id) {
    const p = plants.find((x) => x.id === id);
    if (!p) return;
    const st = waterStatus(p);
    const history = (p.history || [])
      .map((k) => `<li><span>${prettyDate(k)}</span><span>${relativeDays(k)}</span></li>`)
      .join("");

    detailBody.innerHTML = `
      <h2>${escapeHtml(p.name)}</h2>
      <div class="detail-row"><span class="k">Location</span><span>${p.type === "indoor" ? "🏠 Indoor" : "🌳 Outdoor"}</span></div>
      <div class="detail-row"><span class="k">Schedule</span><span>Every ${p.intervalDays} day${p.intervalDays === 1 ? "" : "s"}</span></div>
      <div class="detail-row"><span class="k">Last watered</span><span>${prettyDate(p.lastWatered)}</span></div>
      <div class="detail-row"><span class="k">Next watering</span><span class="status ${st.level}">${prettyDate(st.nextKey)}</span></div>
      <div class="detail-row"><span class="k">Status</span><span class="status ${st.level}">${st.label}</span></div>
      ${p.notes ? `<div class="notes">📝 ${escapeHtml(p.notes)}</div>` : ""}
      <h3>Watering history</h3>
      <ul class="history">${history || '<li><span>No history yet</span></li>'}</ul>
      <div class="detail-buttons">
        <button type="button" class="btn ghost" id="editBtn">Edit</button>
        <button type="button" class="btn primary" id="waterDetailBtn">💧 Water now</button>
      </div>
      <div class="detail-buttons">
        <button type="button" class="btn danger" id="deleteBtn">Delete plant</button>
      </div>`;

    detailBody.querySelector("#editBtn").addEventListener("click", () => {
      detailDialog.close();
      openEdit(p);
    });
    detailBody.querySelector("#waterDetailBtn").addEventListener("click", () => {
      waterPlant(p.id);
      detailDialog.close();
    });
    detailBody.querySelector("#deleteBtn").addEventListener("click", () => {
      if (confirm(`Delete "${p.name}"? This can't be undone.`)) {
        detailDialog.close();
        deletePlant(p.id);
      }
    });

    showDialog(detailDialog);
  }

  function relativeDays(key) {
    const d = daysBetween(key, todayKey());
    if (d === 0) return "today";
    if (d === 1) return "yesterday";
    return `${d} days ago`;
  }

  document.getElementById("detailClose").addEventListener("click", () => detailDialog.close());

  // ---- Dialog helper (graceful fallback) -----------------------------------
  function showDialog(d) {
    if (typeof d.showModal === "function") d.showModal();
    else d.setAttribute("open", "");
  }

  // ---- Tabs ----------------------------------------------------------------
  document.getElementById("tabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
    tab.classList.add("is-active");
    activeFilter = tab.dataset.filter;
    render();
  });

  document.getElementById("addBtn").addEventListener("click", openAdd);

  // ---- Toast ---------------------------------------------------------------
  let toastTimer;
  const toastEl = document.getElementById("toast");
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  // ---- Reminders -----------------------------------------------------------
  const notifyBtn = document.getElementById("notifyBtn");

  function reflectNotifyState() {
    if (!("Notification" in window)) {
      notifyBtn.style.display = "none";
      return;
    }
    notifyBtn.classList.toggle("is-on", Notification.permission === "granted");
  }

  notifyBtn.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      toast("Notifications aren't supported here.");
      return;
    }
    if (Notification.permission === "granted") {
      notifyDuePlants(true);
      return;
    }
    try {
      const res = await Notification.requestPermission();
      reflectNotifyState();
      if (res === "granted") {
        toast("Reminders on 🔔");
        notifyDuePlants(true);
      } else {
        toast("Reminders stay off — add to Home Screen first on iOS.");
      }
    } catch (e) {
      toast("Couldn't enable reminders.");
    }
  });

  // Fire a local notification for plants that need water (runs while app is open
  // and again on each launch). True background push needs a server; this keeps
  // everything offline and private.
  function notifyDuePlants(announceNone = false) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const due = plants.filter((p) => waterStatus(p).daysUntil <= 0);
    if (due.length === 0) {
      if (announceNone) toast("Nothing needs water right now 🎉");
      return;
    }
    const names = due.map((p) => p.name).slice(0, 3).join(", ");
    const extra = due.length > 3 ? ` +${due.length - 3} more` : "";
    const title = "🪴 Time to water your plants";
    const body = `${names}${extra} need${due.length === 1 ? "s" : ""} water.`;

    // iOS standalone PWAs only allow notifications via the service worker,
    // so prefer that path and fall back to the Notification constructor.
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "notify", title, body });
      return;
    }
    try {
      new Notification(title, { body, icon: "icons/icon-192.png", tag: "plantcare-due" });
    } catch (e) {
      /* Notification surface unavailable; in-app summary already shown */
    }
  }

  // ---- Service worker (offline) --------------------------------------------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  // ---- Init ----------------------------------------------------------------
  reflectNotifyState();
  render();
  // Nudge on launch (after a beat so it doesn't fight the cold-start).
  setTimeout(() => notifyDuePlants(false), 1500);
  // Re-render when the app is brought back to the foreground (date may change).
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) render();
  });
})();
