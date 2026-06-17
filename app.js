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
  // mana value operator + single value
  const mvOp = document.getElementById("mv-op")?.value ?? "=";
  const mvRaw = document.getElementById("mv-value")?.value.trim() ?? "";

  let query = buildQuery(colors, false);
  if (mvRaw !== "") query += ` cmc${mvOp}${parseInt(mvRaw, 10)}`;

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
  const mvOp = document.getElementById("mv-op")?.value ?? "=";
  const mvValue = document.getElementById("mv-value")?.value ?? "";
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ colors, mvOp, mvValue }));
}

function restoreFilters() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return; }
  if (!saved) return;

  (saved.colors ?? []).forEach((c) => {
    const el = document.querySelector(`input[name="colors"][value="${c}"]`);
    if (el) el.checked = true;
  });
  const mvOpInput = document.getElementById("mv-op");
  const mvValueInput = document.getElementById("mv-value");
  if (saved.mvOp && mvOpInput) mvOpInput.value = saved.mvOp;
  if (saved.mvValue && mvValueInput) mvValueInput.value = saved.mvValue;
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
