const SCRYFALL_RANDOM = "https://api.scryfall.com/cards/random";

const MV_MIN = 0;
const MV_MAX = 15;
const HANDLE_R = 7; // px — half handle width; track is inset by this on each side

let loVal = MV_MIN;
let hiVal = MV_MAX;

// ── MV slider helpers ───────────────────────────────────────

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function valToPercent(v) {
  const wrapW = 180;
  const trackW = wrapW - 2 * HANDLE_R;
  const px = ((v - MV_MIN) / (MV_MAX - MV_MIN)) * trackW + HANDLE_R;
  return (px / wrapW) * 100;
}

function posToVal(clientX) {
  const wrap = document.getElementById("mv-slider-wrap");
  const rect = wrap.getBoundingClientRect();
  const ratio = (clientX - rect.left - HANDLE_R) / (rect.width - 2 * HANDLE_R);
  return Math.round(clamp(ratio, 0, 1) * (MV_MAX - MV_MIN) + MV_MIN);
}

function updateSlider() {
  const loHandle = document.getElementById("mv-handle-lo");
  const hiHandle = document.getElementById("mv-handle-hi");
  const fill = document.getElementById("mv-fill");
  const display = document.getElementById("mv-display");
  const clearBtn = document.getElementById("mv-clear");

  const loPct = valToPercent(loVal);
  const hiPct = valToPercent(hiVal);

  loHandle.style.left = `${loPct}%`;
  hiHandle.style.left = `${hiPct}%`;
  fill.style.left = `${loPct}%`;
  fill.style.width = `${hiPct - loPct}%`;

  loHandle.setAttribute("aria-valuenow", loVal);
  hiHandle.setAttribute("aria-valuenow", hiVal);

  const isAny = loVal === MV_MIN && hiVal === MV_MAX;
  if (isAny) {
    display.textContent = "—";
  } else if (loVal === hiVal) {
    display.textContent = `= ${loVal}`;
  } else {
    display.textContent = `${loVal}–${hiVal}`;
  }

  clearBtn.classList.toggle("visible", !isAny);

  // When both handles are at max, put lo on top so user can drag left
  loHandle.style.zIndex = loVal === hiVal && hiVal === MV_MAX ? "3" : "1";
  hiHandle.style.zIndex = loVal === hiVal && hiVal === MV_MAX ? "1" : "2";
}

// ── Drag state ──────────────────────────────────────────────

let activeHandle = null;
let pendingDirection = false;
let dragStartX = 0;

function getClientX(e) {
  return e.touches ? e.touches[0].clientX : e.clientX;
}

function onDragMove(e) {
  const clientX = getClientX(e);

  if (pendingDirection) {
    const dx = clientX - dragStartX;
    if (Math.abs(dx) < 3) return;
    activeHandle = dx < 0 ? "lo" : "hi";
    pendingDirection = false;
    document.getElementById(`mv-handle-${activeHandle}`).classList.add("dragging");
  }

  if (!activeHandle) return;

  const v = posToVal(clientX);
  if (activeHandle === "lo") {
    loVal = clamp(v, MV_MIN, MV_MAX);
    if (loVal > hiVal) hiVal = loVal;
  } else {
    hiVal = clamp(v, MV_MIN, MV_MAX);
    if (hiVal < loVal) loVal = hiVal;
  }

  updateSlider();
  saveFilters();
}

function onDragEnd() {
  if (activeHandle) {
    document.getElementById(`mv-handle-${activeHandle}`)?.classList.remove("dragging");
  }
  activeHandle = null;
  pendingDirection = false;
  document.removeEventListener("mousemove", onDragMove);
  document.removeEventListener("mouseup", onDragEnd);
  document.removeEventListener("touchmove", onDragMove);
  document.removeEventListener("touchend", onDragEnd);
}

function startDrag(e, handle) {
  e.preventDefault();
  dragStartX = getClientX(e);

  if (loVal === hiVal) {
    pendingDirection = true;
    activeHandle = null;
  } else {
    activeHandle = handle;
    document.getElementById(`mv-handle-${handle}`).classList.add("dragging");
  }

  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onDragEnd);
  document.addEventListener("touchmove", onDragMove, { passive: false });
  document.addEventListener("touchend", onDragEnd);
}

// ── Slider events ───────────────────────────────────────────

(function initSlider() {
  const loHandle = document.getElementById("mv-handle-lo");
  const hiHandle = document.getElementById("mv-handle-hi");
  const wrap = document.getElementById("mv-slider-wrap");

  loHandle.addEventListener("mousedown", (e) => startDrag(e, "lo"));
  loHandle.addEventListener("touchstart", (e) => startDrag(e, "lo"), { passive: false });
  hiHandle.addEventListener("mousedown", (e) => startDrag(e, "hi"));
  hiHandle.addEventListener("touchstart", (e) => startDrag(e, "hi"), { passive: false });

  // Click on track jumps nearest handle
  wrap.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("mv-handle")) return;
    const v = posToVal(getClientX(e));
    const handle = Math.abs(v - loVal) <= Math.abs(v - hiVal) ? "lo" : "hi";
    if (handle === "lo") { loVal = v; if (loVal > hiVal) hiVal = loVal; }
    else { hiVal = v; if (hiVal < loVal) loVal = hiVal; }
    updateSlider();
    saveFilters();
    startDrag(e, handle);
  });

  // Keyboard
  loHandle.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") loVal = clamp(loVal - 1, MV_MIN, MV_MAX);
    else if (e.key === "ArrowRight") { loVal = clamp(loVal + 1, MV_MIN, MV_MAX); if (loVal > hiVal) hiVal = loVal; }
    else return;
    e.preventDefault();
    updateSlider();
    saveFilters();
  });

  hiHandle.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { hiVal = clamp(hiVal - 1, MV_MIN, MV_MAX); if (hiVal < loVal) loVal = hiVal; }
    else if (e.key === "ArrowRight") hiVal = clamp(hiVal + 1, MV_MIN, MV_MAX);
    else return;
    e.preventDefault();
    updateSlider();
    saveFilters();
  });

  document.getElementById("mv-clear").addEventListener("click", () => {
    onDragEnd(); // terminate any in-progress drag before resetting
    loVal = MV_MIN;
    hiVal = MV_MAX;
    updateSlider();
    saveFilters();
  });

  updateSlider();
})();

// ── Query builder ──────────────────────────────────────────

function buildQuery(colors, within) {
  const base = "is:commander f:commander";
  if (!colors.length) return base;

  const hasColorless = colors.includes("C");
  const chromatic = colors.filter((c) => c !== "C");

  // Colorless identity is mutually exclusive with colored identities in MTG.
  // If C is selected alone, query for colorless commanders.
  // If C is selected alongside colors, ignore C — the combination is impossible.
  if (hasColorless && chromatic.length === 0) {
    return `${base} identity=C`;
  }

  const colorStr = chromatic.join("");
  const op = within ? "<=" : "=";
  return `${base} identity${op}${colorStr}`;
}

// ── Render helpers ─────────────────────────────────────────

function parseManaSymbols(manaCost) {
  return [...manaCost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

function manaSymbolHTML(sym) {
  // {W/U} → ms-wu, {W/P} → ms-wp, {2} → ms-2, {X} → ms-x
  const cls = sym.toLowerCase().replace(/\//g, "");
  return `<i class="ms ms-${cls} ms-cost ms-shadow" aria-label="${sym}"></i>`;
}

function pipHTML(color) {
  const cls = color.toLowerCase();
  return `<i class="ms ms-${cls} ms-cost ms-shadow" title="${color}" aria-label="${color}"></i>`;
}

function cardHTML(card) {
  const faces = card.card_faces ?? [];
  const isDFC = faces.length === 2 && faces[0].image_uris;

  const frontImage = isDFC
    ? faces[0].image_uris.normal
    : card.image_uris?.normal ?? "";
  const backImage = isDFC ? faces[1].image_uris.normal : null;
  const manaCost = isDFC
    ? (faces[0].mana_cost ?? "")
    : (card.mana_cost ?? "");

  const manaSymbols = parseManaSymbols(manaCost);
  const colorIdentity = card.color_identity ?? [];
  const edhrec = card.related_uris?.edhrec ?? null;

  return `
    <div class="card">
      <div class="card-image-wrapper${isDFC ? " flippable" : ""}">
        <div class="card-image-inner">
          <img class="card-face card-front" src="${frontImage}" alt="${escHtml(card.name)}">
          ${isDFC ? `<img class="card-face card-back" src="${backImage}" alt="${escHtml(card.name)} (back face)">` : ""}
        </div>
        ${isDFC ? `<button class="flip-btn" type="button" aria-label="Flip card">↺ flip</button>` : ""}
      </div>
      <div class="card-links">
        <a href="${card.scryfall_uri}" target="_blank" rel="noopener noreferrer">Scryfall ↗</a>
        ${edhrec ? `<a href="${edhrec}" target="_blank" rel="noopener noreferrer">EDHREC ↗</a>` : ""}
      </div>
    </div>
  `;
}

function errorHTML(message) {
  return `
    <div class="card">
      <div class="error-state">
        <div class="error-icon">⚠</div>
        <p>${escHtml(message)}</p>
      </div>
      <div class="card-links"></div>
    </div>
  `;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Skeleton ───────────────────────────────────────────────

function skeletonHTML() {
  return `
    <div class="skeleton-card">
      <div class="skeleton-image"></div>
      <div class="skeleton-info">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-mana"></div>
      </div>
    </div>
  `;
}

// ── Fetch ──────────────────────────────────────────────────

async function fetchCommander() {
  const form = document.getElementById("filter-form");
  const container = document.getElementById("card-container");

  const colors = [
    ...form.querySelectorAll('input[name="colors"]:checked'),
  ].map((el) => el.value);

  let query = buildQuery(colors, false);
  const isAny = loVal === MV_MIN && hiVal === MV_MAX;
  if (!isAny) {
    if (loVal === hiVal) query += ` cmc=${loVal}`;
    else query += ` cmc>=${loVal} cmc<=${hiVal}`;
  }

  container.innerHTML = skeletonHTML();

  try {
    const resp = await fetch(
      `${SCRYFALL_RANDOM}?q=${encodeURIComponent(query)}`
    );
    if (resp.status === 404) {
      container.innerHTML = errorHTML(
        "No commanders match your current filters."
      );
      return;
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const card = await resp.json();
    container.innerHTML = cardHTML(card);
  } catch {
    container.innerHTML = errorHTML(
      "Scryfall is unavailable. Try again later."
    );
  }
}

// ── Theme ──────────────────────────────────────────────────

const THEME_KEY = "commander-theme";

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.getElementById("theme-toggle").textContent = theme === "light" ? "🌙" : "☀️";
}

(function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) ?? "dark");
})();

document.getElementById("theme-toggle").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

// ── Filter persistence ─────────────────────────────────────

const STORAGE_KEY = "commander-filters";

function saveFilters() {
  const colors = [...document.querySelectorAll('input[name="colors"]:checked')].map((el) => el.value);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ colors, mvLo: loVal, mvHi: hiVal }));
}

function restoreFilters() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return; }
  if (!saved) return;

  (saved.colors ?? []).forEach((c) => {
    const el = document.querySelector(`input[name="colors"][value="${c}"]`);
    if (el) el.checked = true;
  });
  if (typeof saved.mvLo === "number") loVal = clamp(saved.mvLo, MV_MIN, MV_MAX);
  if (typeof saved.mvHi === "number") hiVal = clamp(saved.mvHi, MV_MIN, MV_MAX);
  updateSlider();
}

// ── Event listeners ────────────────────────────────────────

document.getElementById("filter-form").addEventListener("submit", (e) => {
  e.preventDefault();
  saveFilters();
  fetchCommander();
});

document.getElementById("filter-form").addEventListener("change", (e) => {
  if (e.target.name === "colors") {
    if (e.target.value === "C" && e.target.checked) {
      // C selected — deselect all chromatic colors
      document.querySelectorAll('input[name="colors"]:not([value="C"])').forEach((el) => el.checked = false);
    } else if (e.target.value !== "C" && e.target.checked) {
      // Any color selected — deselect C
      document.querySelector('input[name="colors"][value="C"]').checked = false;
    }
  }

  saveFilters();
});

// Flip — event delegation survives innerHTML swaps
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".flip-btn");
  if (!btn) return;
  btn.closest(".card-image-wrapper")?.classList.toggle("flipped");
});

// Restore filters then fetch on first load
restoreFilters();
fetchCommander();
