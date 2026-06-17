const SCRYFALL_RANDOM = "https://api.scryfall.com/cards/random";

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
  // mana value range: read min/max helpers
  const mvMinRaw = document.getElementById("mv-min").value.trim();
  const mvMaxRaw = document.getElementById("mv-max").value.trim();
  const mvMin = mvMinRaw === "" ? null : parseInt(mvMinRaw, 10);
  const mvMax = mvMaxRaw === "" ? null : parseInt(mvMaxRaw, 10);

  let query = buildQuery(colors, false);
  if (mvMin !== null && mvMax !== null) {
    if (mvMin === mvMax) query += ` cmc=${mvMin}`;
    else {
      // Scryfall supports range via separate predicates
      query += ` cmc>=${mvMin} cmc<=${mvMax}`;
    }
  } else if (mvMin !== null) {
    query += ` cmc>=${mvMin}`;
  } else if (mvMax !== null) {
    query += ` cmc<=${mvMax}`;
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
  const mvMin = document.getElementById("mv-min").value;
  const mvMax = document.getElementById("mv-max").value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ colors, mvMin, mvMax }));
}

function restoreFilters() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return; }
  if (!saved) return;

  (saved.colors ?? []).forEach((c) => {
    const el = document.querySelector(`input[name="colors"][value="${c}"]`);
    if (el) el.checked = true;
  });
  const mvMinInput = document.getElementById("mv-min");
  const mvMaxInput = document.getElementById("mv-max");
  if (saved.mvMin) mvMinInput.value = saved.mvMin;
  if (saved.mvMax) mvMaxInput.value = saved.mvMax;
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

  // If mv inputs changed, sync ranges
  if (e.target.id === "mv-min" || e.target.id === "mv-max") {
    const minInput = document.getElementById("mv-min");
    const maxInput = document.getElementById("mv-max");
    const rmin = document.getElementById("mv-range-min");
    const rmax = document.getElementById("mv-range-max");
    const minVal = minInput.value === "" ? parseInt(rmin.min, 10) : parseInt(minInput.value, 10);
    const maxVal = maxInput.value === "" ? parseInt(rmax.max, 10) : parseInt(maxInput.value, 10);
    if (minVal > maxVal) {
      // keep them valid by clamping
      if (e.target.id === "mv-min") maxInput.value = minVal;
      else minInput.value = maxVal;
    }
    rmin.value = minInput.value === "" ? rmin.min : minInput.value;
    rmax.value = maxInput.value === "" ? rmax.max : maxInput.value;
  }

  saveFilters();
});

// Flip — event delegation survives innerHTML swaps
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".flip-btn");
  if (!btn) return;
  btn.closest(".card-image-wrapper")?.classList.toggle("flipped");
});

// Single visual range slider with two handles
function initMvSlider() {
  const slider = document.getElementById('mv-slider');
  const track = slider?.querySelector('.track');
  const fill = slider?.querySelector('.range-fill');
  const thumbMin = document.getElementById('mv-thumb-min');
  const thumbMax = document.getElementById('mv-thumb-max');
  const inputMin = document.getElementById('mv-min');
  const inputMax = document.getElementById('mv-max');
  if (!slider || !track || !fill || !thumbMin || !thumbMax || !inputMin || !inputMax) return;

  const MIN = parseInt(inputMin.min || '0', 10);
  const MAX = parseInt(inputMin.max || '20', 10);

  function valueToPercent(v) { return ((v - MIN) / (MAX - MIN)) * 100; }
  function percentToValue(p) { return Math.round(MIN + (p / 100) * (MAX - MIN)); }

  function setPositions(minVal, maxVal) {
    const pMin = valueToPercent(minVal);
    const pMax = valueToPercent(maxVal);
    thumbMin.style.left = pMin + '%';
    thumbMax.style.left = pMax + '%';
    fill.style.left = pMin + '%';
    fill.style.width = (pMax - pMin) + '%';
    thumbMin.setAttribute('aria-valuenow', String(minVal));
    thumbMax.setAttribute('aria-valuenow', String(maxVal));
  }

  function clamp(v, a = MIN, b = MAX) { return Math.min(b, Math.max(a, v)); }

  // Initialize from inputs (or defaults)
  let curMin = inputMin.value === '' ? MIN : clamp(parseInt(inputMin.value, 10));
  let curMax = inputMax.value === '' ? MAX : clamp(parseInt(inputMax.value, 10));
  if (curMin > curMax) { const t = curMin; curMin = curMax; curMax = t; }
  setPositions(curMin, curMax);

  function pointerMoveHandler(e, thumbIsMin) {
    const rect = track.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0].clientX) ?? 0;
    let pct = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.min(100, Math.max(0, pct));
    const val = clamp(percentToValue(pct));
    if (thumbIsMin) {
      curMin = Math.min(val, curMax);
    } else {
      curMax = Math.max(val, curMin);
    }
    inputMin.value = String(curMin);
    inputMax.value = String(curMax);
    setPositions(curMin, curMax);
  }

  function startPointerDrag(e, thumbIsMin) {
    e.preventDefault();
    const id = e.pointerId;
    const move = (ev) => pointerMoveHandler(ev, thumbIsMin);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); saveFilters(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    // handle initial move
    pointerMoveHandler(e, thumbIsMin);
  }

  thumbMin.addEventListener('pointerdown', (e) => startPointerDrag(e, true));
  thumbMax.addEventListener('pointerdown', (e) => startPointerDrag(e, false));

  // Keyboard support
  function thumbKeydown(e, thumbIsMin) {
    let delta = 0;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = 1;
    if (delta === 0) return;
    e.preventDefault();
    if (thumbIsMin) {
      curMin = clamp(curMin + delta);
      if (curMin > curMax) curMin = curMax;
    } else {
      curMax = clamp(curMax + delta);
      if (curMax < curMin) curMax = curMin;
    }
    inputMin.value = String(curMin);
    inputMax.value = String(curMax);
    setPositions(curMin, curMax);
    saveFilters();
  }

  thumbMin.addEventListener('keydown', (e) => thumbKeydown(e, true));
  thumbMax.addEventListener('keydown', (e) => thumbKeydown(e, false));

  // Sync numeric inputs -> thumbs
  inputMin.addEventListener('input', () => {
    const v = inputMin.value === '' ? MIN : clamp(parseInt(inputMin.value, 10));
    curMin = Math.min(v, curMax);
    inputMin.value = String(curMin);
    setPositions(curMin, curMax);
    saveFilters();
  });
  inputMax.addEventListener('input', () => {
    const v = inputMax.value === '' ? MAX : clamp(parseInt(inputMax.value, 10));
    curMax = Math.max(v, curMin);
    inputMax.value = String(curMax);
    setPositions(curMin, curMax);
    saveFilters();
  });
}

// Restore filters, initialize slider, then fetch on first load
restoreFilters();
initMvSlider();
fetchCommander();
