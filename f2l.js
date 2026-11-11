(() => {
  const SLOTS = ["FR", "FL", "BR", "BL"];
  const KEY = "f2l-data-v1";

  const root = document.getElementById("f2l-root");
  if (!root) return;

  let source = null;
  try {
    const inline = document.getElementById("f2l-source");
    if (inline && inline.textContent.trim()) source = JSON.parse(inline.textContent);
  } catch (err) {
    console.error(err);
  }
  if (!source) {
    root.innerHTML = '<p class="f2l-error">F2L cases could not be loaded.</p>';
    return;
  }
  let overrides = {};
  try {
    overrides = JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    overrides = {};
  }

  let editing = null;
  let hiddenCase = null;

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function caseState(entry) {
    const saved = overrides[entry.id];
    const algs = (saved?.algs || entry.algs).map((alg) => {
      const tip = String(alg.tip != null ? alg.tip : alg.note || "").trim();
      return {
        slot: alg.slot,
        alg: alg.alg,
        ...(tip ? { tip } : {}),
      };
    });
    const hidden = (Array.isArray(saved?.hidden) ? saved.hidden : [])
      .map(Number)
      .filter((index, pos, list) => Number.isInteger(index) && index >= 0 && index < algs.length && list.indexOf(index) === pos);
    let favorite = Number.isInteger(saved?.favorite) ? saved.favorite : 0;
    if (favorite < 0 || favorite >= algs.length || hidden.includes(favorite)) {
      favorite = algs.findIndex((_, index) => !hidden.includes(index));
      if (favorite < 0) favorite = 0;
    }
    const status = saved?.status === "green" ? "green" : "orange";
    return { algs, favorite, hidden, status };
  }

  function persist(id, state) {
    overrides[id] = state;
    localStorage.setItem(KEY, JSON.stringify(overrides));
    const stamp = document.getElementById("save-stamp");
    if (stamp && document.body.dataset.trainer === "f2l") stamp.textContent = "Saved";
  }

  function visibleCount(state) {
    return state.algs.length - state.hidden.length;
  }

  function firstVisible(state) {
    const index = state.algs.findIndex((_, i) => !state.hidden.includes(i));
    return index < 0 ? 0 : index;
  }

  function dropIndex(state, index) {
    state.algs.splice(index, 1);
    state.hidden = state.hidden.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i));
    if (state.favorite === index || state.favorite >= state.algs.length || state.hidden.includes(state.favorite)) {
      state.favorite = firstVisible(state);
    } else if (state.favorite > index) {
      state.favorite -= 1;
    }
  }

  const INSERTS_KEY = "f2l-show-inserts";
  let showInserts = false;
  try { showInserts = localStorage.getItem(INSERTS_KEY) === "1"; } catch (err) { /* keep hidden */ }

  function algMarkup(text) {
    const raw = String(text || "").trim();
    const match = !showInserts && raw.match(/^([\s\S]*?)\s*(\[[^\]]*\])\s*$/);
    if (!match) return fadeRotations(raw);
    const main = match[1].trim();
    return `${main ? `${fadeRotations(main)} ` : ""}...`;
  }

  function fadeRotations(text) {
    return String(text).split(/(\s+)/).map((part) => {
      const faded = /^(?:y2['’′]?|y['’′]?)$/i.test(part);
      const safe = esc(part);
      return faded ? `<span class="alg-auf">${safe}</span>` : safe;
    }).join("");
  }

  function slotRotation(alg) {
    const token = String(alg || "").trim().split(/\s+/)[0] || "";
    if (/^y2['’′]?$/i.test(token)) return "y2";
    if (/^y['’′]$/i.test(token)) return "yp";
    if (/^y$/i.test(token)) return "y";
    return "none";
  }

  function algRow(alg, index, favorite) {
    const on = index === favorite;
    const tip = alg.tip
      ? `<div class="inline-box tip-box alg-meta"><span class="inline-label" title="Tip"><i class="fa-solid fa-lightbulb" aria-hidden="true"></i><span class="sr-only">Tip</span></span><span class="inline-value">${esc(alg.tip)}</span></div>`
      : "";
    return `<div class="alg-row${on ? " is-favorite" : ""}" data-alg-index="${index}">
      <div class="alg-body">
        <div class="alg-tools">
          <span class="f2l-slot" data-rot="${slotRotation(alg.alg)}" title="Slot">${esc(alg.slot)}</span>
          <button type="button" class="btn-alg-tool screen-only" data-f2l-edit="${index}" data-tooltip="Edit" aria-label="Edit algorithm"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
          <label class="fav screen-only" data-tooltip="Favorite" aria-label="${on ? "Favorite algorithm" : "Make favorite"}">
            <input type="checkbox" data-f2l-star="${index}"${on ? " checked" : ""} />
            <span>★</span>
          </label>
        </div>
        <p class="alg${on ? " primary" : ""}">${algMarkup(alg.alg)}</p>
        ${tip}
      </div>
    </div>`;
  }

  function cardHtml(entry) {
    const state = caseState(entry);
    const order = state.algs.map((_, index) => index).filter((index) => !state.hidden.includes(index));
    const favAt = order.indexOf(state.favorite);
    if (favAt > 0) {
      order.splice(favAt, 1);
      order.unshift(state.favorite);
    }
    const rows = order.map((index) => algRow(state.algs[index], index, state.favorite)).join("");
    const hiddenCount = state.hidden.length;
    const status = state.status === "green" ? "green" : "orange";
    return `<div class="f2l-case" id="f2l-case-${entry.id}" data-f2l="${entry.id}" data-status="${status}">
    <article class="card f2l-card">
      <button type="button" class="status-toggle screen-only" data-f2l-status-toggle aria-expanded="false" aria-label="Status" title="Status">
        <span class="status-pip" aria-hidden="true"></span>
      </button>
      <div class="inline-box setup-box">
        <span class="inline-label" title="Setup"><i class="fa-solid fa-shuffle" aria-hidden="true"></i><span class="sr-only">Setup</span></span>
        <span class="inline-value alg">${esc(entry.setup)}</span>
      </div>
      <figure class="diagram"><img class="cube-svg" src="svg-cache/f2l/${entry.id}.svg?v=5" alt="" /></figure>
      <div class="alg-list" data-alg-list>${rows}</div>
      <div class="card-actions screen-only">
        <button type="button" class="btn-card-quiet btn-show-hidden" data-f2l-show-hidden${hiddenCount ? "" : " hidden"} title="Show hidden algorithms" aria-label="Show hidden algorithms">
          <i class="fa-solid fa-eye" aria-hidden="true"></i>
          <span class="n" data-hidden-count>${hiddenCount}</span>
        </button>
        <button type="button" class="btn-card-quiet btn-add-alg" data-f2l-add title="Add algorithm" aria-label="Add algorithm">+</button>
      </div>
    </article>
    <aside class="status-panel screen-only" aria-label="Status">
      <label class="status-opt orange" data-f2l-status="orange" title="Consider">
        <input type="checkbox"${status === "orange" ? " checked" : ""} />
        <span class="dot"></span>
        <span class="status-text">Consider</span>
      </label>
      <label class="status-opt green" data-f2l-status="green" title="Using">
        <input type="checkbox"${status === "green" ? " checked" : ""} />
        <span class="dot"></span>
        <span class="status-text">Using</span>
      </label>
    </aside>
  </div>`;
  }

  function render() {
    const y = window.scrollY;
    root.innerHTML = source.groups.map((group) => {
      const cards = source.cases.filter((entry) => entry.group === group.id).map(cardHtml).join("");
      return `<section class="group-section" id="f2l-${group.id}"><div class="f2l-heading-slot"><h2 class="group-heading">${esc(group.label)}</h2></div><div class="f2l-cards">${cards}</div></section>`;
    }).join("");
    window.scrollTo(0, y);
    applyF2lFilter();
  }

  function playFlip(items, first) {
    if (!first || items.length < 2) return;
    const inversions = [];
    items.forEach((el) => {
      const from = first.get(el);
      if (!from) return;
      const last = el.getBoundingClientRect();
      const dx = from.left - last.left;
      const dy = from.top - last.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      inversions.push({ el, dx, dy });
    });
    if (!inversions.length) return;
    inversions.forEach(({ el, dx, dy }) => {
      el.classList.add("is-flipping");
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    void items[0].offsetWidth;
    requestAnimationFrame(() => {
      inversions.forEach(({ el }) => {
        el.style.transition = "transform 0.82s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = "translate(0, 0)";
      });
    });
    inversions.forEach(({ el }) => {
      const done = (event) => {
        if (event.propertyName && event.propertyName !== "transform") return;
        el.style.transition = "";
        el.style.transform = "";
        el.classList.remove("is-flipping");
        el.removeEventListener("transitionend", done);
      };
      el.addEventListener("transitionend", done);
    });
  }

  function setFavorite(card, index) {
    const entry = source.cases.find((item) => item.id === card.dataset.f2l);
    if (!entry) return;
    const state = caseState(entry);
    if (state.hidden.includes(index) || state.favorite === index) return;
    const list = card.querySelector("[data-alg-list]");
    const rows = [...list.querySelectorAll(".alg-row")];
    const first = new Map(rows.map((el) => [el, el.getBoundingClientRect()]));
    const favEl = list.querySelector(`[data-alg-index="${index}"]`);
    if (favEl) list.insertBefore(favEl, list.firstChild);
    rows.forEach((el) => {
      const on = Number(el.dataset.algIndex) === index;
      el.classList.toggle("is-favorite", on);
      const text = el.querySelector(".alg");
      if (text) text.classList.toggle("primary", on);
      const box = el.querySelector("[data-f2l-star]");
      if (box) box.checked = on;
      const label = el.querySelector(".fav");
      if (label) label.setAttribute("aria-label", on ? "Favorite algorithm" : "Make favorite");
    });
    playFlip(rows, first);
    state.favorite = index;
    persist(entry.id, state);
  }

  function setSaveIcon(adding) {
    const save = document.getElementById("f2l-modal-save");
    const label = adding ? "Add" : "Save";
    save.title = label;
    save.setAttribute("aria-label", label);
    save.innerHTML = `<i class="fa-solid ${adding ? "fa-plus" : "fa-check"}" aria-hidden="true"></i>`;
  }

  function openModal(id, index) {
    const entry = source.cases.find((item) => item.id === id);
    if (!entry) return;
    const state = caseState(entry);
    editing = { id, index };
    const alg = index == null
      ? { slot: state.algs[state.favorite]?.slot || "FR", alg: "" }
      : state.algs[index];
    document.getElementById("f2l-modal-title").textContent = index == null ? "Add alg" : "Edit alg";
    document.getElementById("f2l-modal-slot").value = SLOTS.includes(alg.slot) ? alg.slot : "FR";
    document.getElementById("f2l-modal-input").value = alg.alg || "";
    document.getElementById("f2l-modal-tip").value = alg.tip || "";
    setSaveIcon(index == null);
    const editingExisting = index != null;
    document.getElementById("f2l-modal-hide").hidden = !editingExisting;
    document.getElementById("f2l-modal-delete").hidden = !editingExisting || state.algs.length < 2;
    const modal = document.getElementById("f2l-modal");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.getElementById("f2l-modal-input").focus();
  }

  function closeModal() {
    const modal = document.getElementById("f2l-modal");
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    editing = null;
  }

  function submitModal() {
    if (!editing) return;
    const entry = source.cases.find((item) => item.id === editing.id);
    const state = caseState(entry);
    const slot = document.getElementById("f2l-modal-slot").value;
    const alg = document.getElementById("f2l-modal-input").value.trim();
    const tip = document.getElementById("f2l-modal-tip").value.trim();
    if (!alg) {
      document.getElementById("f2l-modal-input").focus();
      return;
    }
    const next = { slot, alg, ...(tip ? { tip } : {}) };
    if (editing.index == null) state.algs.push(next);
    else state.algs[editing.index] = next;
    persist(editing.id, state);
    closeModal();
    render();
  }

  function hideEditing() {
    if (!editing || editing.index == null) return;
    const entry = source.cases.find((item) => item.id === editing.id);
    const state = caseState(entry);
    if (state.hidden.includes(editing.index)) return;
    if (visibleCount(state) < 2) {
      alert("Keep at least one algorithm visible.");
      return;
    }
    state.hidden.push(editing.index);
    if (state.favorite === editing.index) state.favorite = firstVisible(state);
    persist(editing.id, state);
    closeModal();
    render();
  }

  function deleteAlg() {
    if (!editing || editing.index == null) return;
    const entry = source.cases.find((item) => item.id === editing.id);
    const state = caseState(entry);
    if (state.algs.length < 2) return;
    if (!state.hidden.includes(editing.index) && visibleCount(state) < 2) {
      alert("Keep at least one algorithm visible.");
      return;
    }
    if (!confirm("Remove this algorithm permanently?")) return;
    dropIndex(state, editing.index);
    persist(editing.id, state);
    closeModal();
    render();
  }

  function refreshHidden() {
    const list = document.getElementById("f2l-hidden-list");
    if (!list || !hiddenCase) return;
    const entry = source.cases.find((item) => item.id === hiddenCase);
    const state = caseState(entry);
    if (!state.hidden.length) {
      list.innerHTML = '<p class="hidden-modal-empty">No hidden algorithms.</p>';
      return;
    }
    list.innerHTML = state.hidden.map((index) => {
      const alg = state.algs[index];
      const tip = alg.tip ? ` · ${alg.tip}` : "";
      return `<div class="hidden-modal-item">
        <p class="alg">${esc(alg.slot)} ${algMarkup(alg.alg)}${esc(tip)}</p>
        <div class="hidden-modal-actions">
          <button type="button" class="btn btn-ghost btn-icon" data-f2l-unhide="${index}" title="Show" aria-label="Show algorithm"><i class="fa-solid fa-eye" aria-hidden="true"></i></button>
          <button type="button" class="btn btn-danger btn-icon" data-f2l-hidden-delete="${index}" title="Remove" aria-label="Remove algorithm"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
        </div>
      </div>`;
    }).join("");
  }

  function openHidden(id) {
    hiddenCase = id;
    const title = document.getElementById("f2l-hidden-title");
    if (title) title.textContent = "Hidden algs";
    refreshHidden();
    const modal = document.getElementById("f2l-hidden-modal");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeHidden() {
    hiddenCase = null;
    const modal = document.getElementById("f2l-hidden-modal");
    modal?.classList.remove("is-open");
    modal?.setAttribute("aria-hidden", "true");
  }

  function unhide(index) {
    const entry = source.cases.find((item) => item.id === hiddenCase);
    if (!entry) return;
    const state = caseState(entry);
    state.hidden = state.hidden.filter((i) => i !== index);
    persist(entry.id, state);
    render();
    if (!state.hidden.length) closeHidden();
    else refreshHidden();
  }

  function deleteHidden(index) {
    const entry = source.cases.find((item) => item.id === hiddenCase);
    if (!entry) return;
    const state = caseState(entry);
    if (state.algs.length < 2) return;
    if (!confirm("Remove this algorithm permanently?")) return;
    dropIndex(state, index);
    persist(entry.id, state);
    render();
    if (!state.hidden.length) closeHidden();
    else refreshHidden();
  }

  let f2lFilter = "";

  function closeF2lStatus(except) {
    document.querySelectorAll("#f2l-root .f2l-case.status-open").forEach((wrap) => {
      if (except && wrap === except) return;
      wrap.classList.remove("status-open");
      const toggle = wrap.querySelector("[data-f2l-status-toggle]");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    });
  }

  function applyF2lFilter() {
    const counts = { orange: 0, green: 0 };
    document.querySelectorAll("#f2l-root .f2l-case").forEach((wrap) => {
      const status = wrap.dataset.status === "green" ? "green" : "orange";
      counts[status] += 1;
      const show = !f2lFilter || status === f2lFilter;
      wrap.hidden = !show;
    });
    document.querySelectorAll("#f2l-root > .group-section").forEach((section) => {
      const any = [...section.querySelectorAll(".f2l-case")].some((wrap) => !wrap.hidden);
      section.hidden = !any;
    });
    document.querySelectorAll("[data-f2l-count]").forEach((el) => {
      el.textContent = String(counts[el.dataset.f2lCount] || 0);
    });
    document.querySelectorAll("#f2l-anchors .nav-chip[data-f2l-group]").forEach((chip) => {
      const section = document.getElementById("f2l-" + chip.dataset.f2lGroup);
      const tallies = { orange: 0, green: 0 };
      section?.querySelectorAll(".f2l-case").forEach((wrap) => {
        tallies[wrap.dataset.status === "green" ? "green" : "orange"] += 1;
      });
      const total = tallies.orange + tallies.green;
      ["orange", "green"].forEach((key) => {
        const seg = chip.querySelector('[data-seg="' + key + '"]');
        if (!seg) return;
        const n = tallies[key];
        seg.style.flex = n > 0 ? n + " 1 0%" : "0 0 0%";
        seg.style.display = n > 0 ? "block" : "none";
      });
      const parts = [
        tallies.orange ? tallies.orange + " consider" : "",
        tallies.green ? tallies.green + " using" : "",
      ].filter(Boolean).join(", ");
      const base = chip.querySelector(".nav-chip-label")?.textContent || "";
      chip.title = base + (parts ? " · " + parts : "");
    });
    syncHeadingCorners();
  }

  function setStatus(id, status) {
    if (status !== "green" && status !== "orange") return;
    const entry = source.cases.find((item) => item.id === id);
    if (!entry) return;
    const state = caseState(entry);
    state.status = status;
    persist(id, state);
    const wrap = document.querySelector(`#f2l-root .f2l-case[data-f2l="${id}"]`);
    if (wrap) {
      wrap.dataset.status = status;
      wrap.querySelectorAll("[data-f2l-status]").forEach((opt) => {
        const input = opt.querySelector("input");
        if (input) input.checked = opt.dataset.f2lStatus === status;
      });
    }
    closeF2lStatus();
    applyF2lFilter();
  }

  root.addEventListener("click", (event) => {
    const statusToggle = event.target.closest("[data-f2l-status-toggle]");
    if (statusToggle) {
      const wrap = statusToggle.closest(".f2l-case");
      if (!wrap) return;
      const open = !wrap.classList.contains("status-open");
      closeF2lStatus(open ? wrap : null);
      wrap.classList.toggle("status-open", open);
      statusToggle.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }
    const statusOpt = event.target.closest("[data-f2l-status]");
    if (statusOpt) {
      event.preventDefault();
      const wrap = statusOpt.closest(".f2l-case");
      if (wrap) setStatus(wrap.dataset.f2l, statusOpt.dataset.f2lStatus);
      return;
    }
    const card = event.target.closest("[data-f2l]");
    if (!card) return;
    const starLabel = event.target.closest(".fav");
    if (starLabel) {
      const star = starLabel.querySelector("[data-f2l-star]");
      if (star) {
        event.preventDefault();
        setFavorite(card, Number(star.dataset.f2lStar));
        return;
      }
    }
    const edit = event.target.closest("[data-f2l-edit]");
    if (edit) {
      openModal(card.dataset.f2l, Number(edit.dataset.f2lEdit));
      return;
    }
    if (event.target.closest("[data-f2l-show-hidden]")) {
      openHidden(card.dataset.f2l);
      return;
    }
    if (event.target.closest("[data-f2l-add]")) openModal(card.dataset.f2l, null);
  });

  document.getElementById("f2l-modal-backdrop")?.addEventListener("click", closeModal);
  document.getElementById("f2l-modal-cancel")?.addEventListener("click", closeModal);
  document.getElementById("f2l-modal-save")?.addEventListener("click", submitModal);
  document.getElementById("f2l-modal-delete")?.addEventListener("click", deleteAlg);
  document.getElementById("f2l-modal-hide")?.addEventListener("click", hideEditing);
  function onModalEnter(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitModal();
    }
  }
  document.getElementById("f2l-modal-input")?.addEventListener("keydown", onModalEnter);
  document.getElementById("f2l-modal-tip")?.addEventListener("keydown", onModalEnter);
  document.getElementById("f2l-hidden-backdrop")?.addEventListener("click", closeHidden);
  document.getElementById("f2l-hidden-close")?.addEventListener("click", closeHidden);
  document.getElementById("f2l-hidden-list")?.addEventListener("click", (event) => {
    const show = event.target.closest("[data-f2l-unhide]");
    if (show) {
      unhide(Number(show.dataset.f2lUnhide));
      return;
    }
    const remove = event.target.closest("[data-f2l-hidden-delete]");
    if (remove) deleteHidden(Number(remove.dataset.f2lHiddenDelete));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (document.getElementById("f2l-hidden-modal")?.classList.contains("is-open")) {
      closeHidden();
      return;
    }
    if (document.getElementById("f2l-modal")?.classList.contains("is-open")) closeModal();
  });

  const f2lWrap = document.getElementById("f2l-anchors-wrap");
  const f2lGroupsBtn = document.getElementById("btn-f2l-groups");
  if (f2lWrap && f2lGroupsBtn) {
    const narrow = window.matchMedia("(max-width: 720px)").matches;
    f2lWrap.classList.toggle("is-collapsed", narrow);
    f2lGroupsBtn.setAttribute("aria-expanded", narrow ? "false" : "true");
  }

  function syncInsertSwitch() {
    const sw = document.getElementById("f2l-insert-switch");
    if (!sw) return;
    sw.dataset.mode = showInserts ? "on" : "off";
    sw.querySelectorAll("[data-f2l-inserts]").forEach((btn) => {
      const on = (btn.dataset.f2lInserts === "on") === showInserts;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  document.querySelectorAll("[data-f2l-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const wasOn = btn.classList.contains("is-on");
      document.querySelectorAll("[data-f2l-filter]").forEach((other) => other.classList.remove("is-on"));
      f2lFilter = "";
      if (!wasOn) {
        btn.classList.add("is-on");
        f2lFilter = btn.dataset.f2lFilter;
      }
      applyF2lFilter();
    });
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("#f2l-root .f2l-case")) return;
    closeF2lStatus();
  });

  document.getElementById("f2l-insert-switch")?.addEventListener("click", (event) => {
    const opt = event.target.closest("[data-f2l-inserts]");
    if (!opt) return;
    const next = opt.dataset.f2lInserts === "on";
    if (next === showInserts) return;
    showInserts = next;
    try { localStorage.setItem(INSERTS_KEY, showInserts ? "1" : "0"); } catch (err) { /* ignore */ }
    syncInsertSwitch();
    render();
  });
  syncInsertSwitch();

  document.getElementById("btn-f2l-groups")?.addEventListener("click", () => {
    const wrap = document.getElementById("f2l-anchors-wrap");
    const btn = document.getElementById("btn-f2l-groups");
    if (!wrap || !btn) return;
    const collapsed = !wrap.classList.contains("is-collapsed");
    wrap.classList.toggle("is-collapsed", collapsed);
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    syncStickyTop();
  });

  function syncStickyTop() {
    const toolbar = document.querySelector(".toolbar");
    if (!toolbar) return;
    const bar = getComputedStyle(toolbar);
    const accent = getComputedStyle(toolbar, "::after");
    const borderBottom = parseFloat(bar.borderBottomWidth) || 0;
    const accentBottom = parseFloat(accent.bottom) || 0;
    const accentHeight = parseFloat(accent.height) || 0;
    const hang = accentHeight > 0 ? Math.max(0, -accentBottom - borderBottom) : 0;
    const top = Math.round(toolbar.getBoundingClientRect().height + hang);
    document.documentElement.style.setProperty("--f2l-sticky-top", `${top}px`);
    syncHeadingCorners();
  }
  function syncHeadingCorners() {
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--f2l-sticky-top")) || 0;
    const sections = [...document.querySelectorAll("#f2l-root > .group-section")];
    const headings = sections.map((section) => section.querySelector(":scope > .f2l-heading-slot > .group-heading"));
    const anchorTop = (heading) => {
      const slot = heading.parentElement;
      return (heading.classList.contains("is-stuck") ? slot : heading).getBoundingClientRect().top;
    };
    let stickAt = -1;
    headings.forEach((heading, index) => {
      if (!heading) return;
      const sectionBottom = sections[index].getBoundingClientRect().bottom;
      if (anchorTop(heading) <= top + 0.5 && sectionBottom > top + 0.5) stickAt = index;
    });
    const sample = headings.find((heading) => heading && !heading.classList.contains("is-stuck")) || headings.find(Boolean);
    const pad = sample ? parseFloat(getComputedStyle(sample).paddingLeft) || 0 : 0;
    const border = sample ? parseFloat(getComputedStyle(sample).borderLeftWidth) || 0 : 0;
    headings.forEach((heading, index) => {
      if (!heading) return;
      const slot = heading.parentElement;
      const stuck = index === stickAt;
      if (stuck && !heading.classList.contains("is-stuck")) {
        const marginBottom = parseFloat(getComputedStyle(heading).marginBottom) || 0;
        slot.style.height = `${heading.offsetHeight + marginBottom}px`;
      }
      if (!stuck) {
        slot.style.height = "";
        heading.style.removeProperty("--f2l-stuck-pad");
        heading.style.removeProperty("--f2l-stuck-accent");
        heading.style.transform = "";
      }
      heading.classList.toggle("is-stuck", stuck);
      if (!stuck) return;
      const accent = slot.getBoundingClientRect().left;
      heading.style.setProperty("--f2l-stuck-accent", `${accent}px`);
      heading.style.setProperty("--f2l-stuck-pad", `${accent + border + pad}px`);
      const limit = sections[index].getBoundingClientRect().bottom;
      const overlap = top + heading.offsetHeight - limit;
      heading.style.transform = overlap > 0 ? `translateY(${-overlap}px)` : "";
    });
    if (window.gabisSyncGroupAnchor) window.gabisSyncGroupAnchor();
  }
  let cornerFrame = 0;
  window.addEventListener("scroll", () => {
    if (cornerFrame) return;
    cornerFrame = requestAnimationFrame(() => {
      cornerFrame = 0;
      syncHeadingCorners();
    });
  }, { passive: true });
  syncStickyTop();
  window.addEventListener("resize", syncStickyTop);
  const toolbar = document.querySelector(".toolbar");
  if (toolbar && window.ResizeObserver) new ResizeObserver(syncStickyTop).observe(toolbar);

  function normalizeF2l(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Invalid F2L data");
    }
    const known = new Set(source.cases.map((entry) => entry.id));
    const next = {};
    Object.keys(data).forEach((id) => {
      if (!known.has(id)) return;
      const saved = data[id];
      if (!saved || !Array.isArray(saved.algs)) return;
      const algs = saved.algs.map((alg) => {
        const moves = String(alg && alg.alg || "").trim();
        if (!moves) return null;
        const tip = String(alg.tip != null ? alg.tip : alg.note || "").trim();
        return {
          slot: SLOTS.includes(alg.slot) ? alg.slot : "FR",
          alg: moves,
          ...(tip ? { tip } : {}),
        };
      }).filter(Boolean);
      if (!algs.length) return;
      const hidden = (Array.isArray(saved.hidden) ? saved.hidden : [])
        .map(Number)
        .filter((index, pos, list) => Number.isInteger(index) && index >= 0 && index < algs.length && list.indexOf(index) === pos);
      let favorite = Number.isInteger(saved.favorite) ? saved.favorite : 0;
      if (favorite < 0 || favorite >= algs.length || hidden.includes(favorite)) {
        favorite = algs.findIndex((_, index) => !hidden.includes(index));
        if (favorite < 0) favorite = 0;
      }
      const status = saved.status === "green" ? "green" : "orange";
      next[id] = { algs, favorite, hidden, status };
    });
    return next;
  }

  function importF2l(data) {
    overrides = normalizeF2l(data);
    localStorage.setItem(KEY, JSON.stringify(overrides));
    closeModal();
    closeHidden();
    render();
  }

  window.gabisTrainers = {
    exportF2l() {
      return JSON.parse(JSON.stringify(overrides));
    },
    normalizeF2l,
    importF2l,
  };

  render();
})();
