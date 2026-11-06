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
    return { algs, favorite, hidden };
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

  function fadeRotations(text) {
    return esc(text).split(/(\s+)/).map((part) => (
      /^(?:y2['’]?|y['’]?)$/i.test(part)
        ? `<span class="alg-auf">${part}</span>`
        : part
    )).join("");
  }

  function algRow(alg, index, favorite) {
    const on = index === favorite;
    const tip = alg.tip
      ? `<div class="inline-box tip-box alg-meta"><span class="inline-label" title="Tip"><i class="fa-solid fa-lightbulb" aria-hidden="true"></i><span class="sr-only">Tip</span></span><span class="inline-value">${esc(alg.tip)}</span></div>`
      : "";
    return `<div class="alg-row${on ? " is-favorite" : ""}" data-alg-index="${index}">
      <div class="alg-body">
        <div class="alg-tools">
          <span class="f2l-slot" title="Slot">${esc(alg.slot)}</span>
          <button type="button" class="btn-alg-tool screen-only" data-f2l-edit="${index}" data-tooltip="Edit" aria-label="Edit algorithm"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
          <label class="fav screen-only" data-tooltip="Favorite" aria-label="${on ? "Favorite algorithm" : "Make favorite"}">
            <input type="checkbox" data-f2l-star="${index}"${on ? " checked" : ""} />
            <span>★</span>
          </label>
        </div>
        <p class="alg${on ? " primary" : ""}">${fadeRotations(alg.alg)}</p>
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
    return `<article class="card f2l-card" id="f2l-case-${entry.id}" data-f2l="${entry.id}">
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
    </article>`;
  }

  function render() {
    const y = window.scrollY;
    root.innerHTML = source.groups.map((group) => {
      const cards = source.cases.filter((entry) => entry.group === group.id).map(cardHtml).join("");
      return `<section class="group-section" id="f2l-${group.id}"><h2 class="group-heading">${esc(group.label)}</h2><div class="f2l-cards">${cards}</div></section>`;
    }).join("");
    window.scrollTo(0, y);
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
        <p class="alg">${esc(alg.slot)} ${fadeRotations(alg.alg)}${esc(tip)}</p>
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

  root.addEventListener("click", (event) => {
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

  document.getElementById("btn-f2l-groups")?.addEventListener("click", () => {
    const wrap = document.getElementById("f2l-anchors-wrap");
    const btn = document.getElementById("btn-f2l-groups");
    if (!wrap || !btn) return;
    const collapsed = !wrap.classList.contains("is-collapsed");
    wrap.classList.toggle("is-collapsed", collapsed);
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
  });

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
      next[id] = { algs, favorite, hidden };
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
