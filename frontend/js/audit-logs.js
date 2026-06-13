// ═══════════════════════════════════════════════════════════
// PHARMA ERP — audit-logs.js  (optimised)
// ═══════════════════════════════════════════════════════════

const API_BASE = "http://127.0.0.1:8000/api/v1";

// ── Auth ──────────────────────────────────────────────────────
const token = sessionStorage.getItem("access");
if (!token) window.location.href = "./login.html";

// ── Generic authenticated fetch ───────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    sessionStorage.clear();
    showToast("Session expired. Redirecting…", "error");
    setTimeout(() => (window.location.href = "./login.html"), 1500);
    return null;
  }

  return res;
}

// ── XSS escape ────────────────────────────────────────────────
function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = "success") {
  const el   = document.getElementById("toast");
  const icon = document.getElementById("toastIcon");
  const txt  = document.getElementById("toastMsg");
  icon.className = type === "success"
    ? "bi bi-check-circle-fill text-success"
    : "bi bi-exclamation-circle-fill text-danger";
  txt.textContent = msg;
  el.className    = `toast-erp ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}

// ── Number formatter ──────────────────────────────────────────
const fmt = (n) => Number(n ?? 0).toLocaleString("en-IN");

// ── Action badge config ───────────────────────────────────────
const ACTION_CFG = {
  CREATE: { cls: "badge-create", icon: "bi-plus-circle-fill" },
  UPDATE: { cls: "badge-update", icon: "bi-pencil-fill" },
  DELETE: { cls: "badge-delete", icon: "bi-trash3-fill" },
  LOGIN:  { cls: "badge-login",  icon: "bi-box-arrow-in-right" },
  LOGOUT: { cls: "badge-logout", icon: "bi-box-arrow-right" },
};

function actionBadge(action = "") {
  const cfg = ACTION_CFG[action.toUpperCase()] ?? { cls: "badge-other", icon: "bi-question-circle" };
  return `<span class="action-badge ${cfg.cls}"><i class="bi ${cfg.icon}"></i>${esc(action || "—")}</span>`;
}

// ── User initial avatar ───────────────────────────────────────
function userCell(name) {
  const initial = (name ?? "?")[0].toUpperCase();
  return `<div class="user-cell"><div class="user-dot">${initial}</div>${esc(name ?? "—")}</div>`;
}

// ── Pagination state ──────────────────────────────────────────
const PAGE_SIZE = 25;
let _allLogs  = [];
let _page     = 1;

// ── Load profile ──────────────────────────────────────────────
async function loadProfile() {
  try {
    const res = await apiFetch("/auth/profile/");
    if (!res) return;
    const user = await res.json();

    const el = document.getElementById("welcomeText");
    if (el) el.innerHTML = `Welcome, <strong>${esc(user.full_name)}</strong> (${esc(user.role)})`;

    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set("sidebarName", user.full_name ?? "—");
    set("sidebarRole", user.role      ?? "—");

    const av = document.getElementById("sidebarAvatar");
    if (av) av.textContent = (user.full_name?.[0] ?? "?").toUpperCase();

  } catch (err) { console.error(err); }
}

// ── Load audit logs from API ──────────────────────────────────
async function loadAuditLogs() {
  const params = new URLSearchParams();
  const search = document.getElementById("searchInput").value.trim();
  const action = document.getElementById("actionFilter").value;
  const entity = document.getElementById("entityFilter").value.trim();

  if (search) params.set("search", search);
  if (action) params.set("action", action);
  if (entity) params.set("entity_type", entity);

  try {
    const res = await apiFetch(`/audit-logs/?${params}`);
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    _allLogs   = data.results ?? (Array.isArray(data) ? data : []);
    _page      = 1;

    renderLogs();
    renderFilterChips(search, action, entity);

  } catch (err) {
    console.error(err);
    document.getElementById("auditTableBody").innerHTML =
      `<tr><td colspan="6" class="table-msg" style="color:var(--danger)">Failed to load audit logs</td></tr>`;
    showToast("Failed to load audit logs", "error");
  }
}

// ── Render current page of logs ───────────────────────────────
function renderLogs() {
  const tbody = document.getElementById("auditTableBody");
  const total = _allLogs.length;

  // KPI tallies
  const tally = { CREATE: 0, UPDATE: 0, DELETE: 0 };
  _allLogs.forEach((l) => { if (tally[l.action] !== undefined) tally[l.action]++; });

  document.getElementById("totalLogs").textContent  = fmt(total);
  document.getElementById("createLogs").textContent = fmt(tally.CREATE);
  document.getElementById("updateLogs").textContent = fmt(tally.UPDATE);
  document.getElementById("deleteLogs").textContent = fmt(tally.DELETE);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  _page = Math.min(_page, totalPages);

  const start = (_page - 1) * PAGE_SIZE;
  const slice = _allLogs.slice(start, start + PAGE_SIZE);

  document.getElementById("resultsCount").textContent =
    `${fmt(total)} log${total !== 1 ? "s" : ""}  ·  page ${_page} of ${totalPages}`;

  if (!total) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-msg">No audit logs found</td></tr>`;
    document.getElementById("paginationBar").style.display = "none";
    return;
  }

  tbody.innerHTML = slice.map((log) => {
    const date = log.created_at
      ? new Date(log.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
      : "—";

    return `
      <tr>
        <td>${actionBadge(log.action)}</td>
        <td>${userCell(log.user_name ?? log.user?.email)}</td>
        <td>${log.entity_type ? `<span class="entity-chip">${esc(log.entity_type)}</span>` : "—"}</td>
        <td><span class="entity-id">${esc(log.entity_id ?? "—")}</span></td>
        <td><div class="desc-cell" title="${esc(log.description)}">${esc(log.description ?? "—")}</div></td>
        <td><span class="ts">${date}</span></td>
      </tr>`;
  }).join("");

  renderPagination(totalPages);
}

// ── Pagination controls ───────────────────────────────────────
function renderPagination(totalPages) {
  const bar     = document.getElementById("paginationBar");
  const info    = document.getElementById("pageInfo");
  const btnWrap = document.getElementById("pageBtns");

  if (totalPages <= 1) { bar.style.display = "none"; return; }
  bar.style.display = "flex";

  const start = (_page - 1) * PAGE_SIZE + 1;
  const end   = Math.min(_page * PAGE_SIZE, _allLogs.length);
  info.textContent = `Showing ${fmt(start)}–${fmt(end)} of ${fmt(_allLogs.length)}`;

  // Build page number buttons (show at most 7 around current)
  const pages  = [];
  const radius = 2;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 || i === totalPages ||
      (i >= _page - radius && i <= _page + radius)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  btnWrap.innerHTML =
    `<button class="page-btn" id="prevBtn" ${_page === 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i></button>` +
    pages.map((p) =>
      p === "…"
        ? `<button class="page-btn" disabled>…</button>`
        : `<button class="page-btn ${p === _page ? "active" : ""}" data-page="${p}">${p}</button>`
    ).join("") +
    `<button class="page-btn" id="nextBtn" ${_page === totalPages ? "disabled" : ""}><i class="bi bi-chevron-right"></i></button>`;

  // Prev / Next
  btnWrap.querySelector("#prevBtn")?.addEventListener("click", () => { _page--; renderLogs(); });
  btnWrap.querySelector("#nextBtn")?.addEventListener("click", () => { _page++; renderLogs(); });

  // Number buttons
  btnWrap.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => { _page = parseInt(btn.dataset.page, 10); renderLogs(); });
  });
}

// ── Active filter chips ───────────────────────────────────────
function renderFilterChips(search, action, entity) {
  const wrap = document.getElementById("activeFilters");
  const chips = [];

  if (search) chips.push({ label: `"${search}"`, clear: () => { document.getElementById("searchInput").value = ""; loadAuditLogs(); } });
  if (action) chips.push({ label: action, clear: () => { document.getElementById("actionFilter").value = ""; loadAuditLogs(); } });
  if (entity) chips.push({ label: entity, clear: () => { document.getElementById("entityFilter").value = ""; loadAuditLogs(); } });

  if (!chips.length) { wrap.innerHTML = ""; return; }

  wrap.innerHTML = chips
    .map((c, i) => `<span class="filter-chip">${esc(c.label)}<button data-chip="${i}" title="Remove">✕</button></span>`)
    .join("");

  wrap.querySelectorAll("[data-chip]").forEach((btn) => {
    btn.addEventListener("click", () => chips[parseInt(btn.dataset.chip, 10)].clear());
  });
}

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Events ───────────────────────────────────────────────────

// Debounced search & entity inputs
const debouncedLoad = debounce(() => loadAuditLogs(), 300);
document.getElementById("searchInput").addEventListener("input", debouncedLoad);
document.getElementById("entityFilter").addEventListener("input", debouncedLoad);

// Instant on action filter change
document.getElementById("actionFilter").addEventListener("change", () => loadAuditLogs());

// Refresh
document.getElementById("refreshBtn").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("actionFilter").value = "";
  document.getElementById("entityFilter").value = "";
  loadAuditLogs();
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.clear();
  window.location.href = "./login.html";
});

// ── Init ─────────────────────────────────────────────────────
Promise.all([loadProfile(), loadAuditLogs()]);