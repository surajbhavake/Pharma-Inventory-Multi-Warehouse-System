// ═══════════════════════════════════════════════════════════
// PHARMA ERP — stock-allocation.js  (optimised)
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

  if (res.status === 401) {
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
  toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

// ── Number formatter ──────────────────────────────────────────
const fmt = (n) => Number(n ?? 0).toLocaleString("en-IN");

// ── Stock status helper ───────────────────────────────────────
function stockStatus(qty) {
  if (qty <= 5)  return { cls: "status-critical", label: "Critical" };
  if (qty <= 20) return { cls: "status-low",      label: "Low Stock" };
  return          { cls: "status-healthy",         label: "Healthy" };
}

// Quantity bar visualiser — scales relative to max stock in visible rows
let _maxQty = 1;

function qtyBar(qty) {
  const pct  = Math.min(100, Math.round((qty / _maxQty) * 100));
  const cls  = qty <= 5 ? "low" : qty <= 20 ? "mid" : "high";
  return `
    <div class="qty-bar-wrap">
      <span class="qty-val">${fmt(qty)}</span>
      <div class="qty-bar"><div class="qty-fill ${cls}" style="width:${pct}%"></div></div>
    </div>`;
}

// ── Load profile ──────────────────────────────────────────────
async function loadProfile() {
  try {
    const res = await apiFetch("/auth/profile/");
    if (!res) return;

    const user = await res.json();
    const el   = document.getElementById("welcomeText");
    if (el) el.innerHTML = `Welcome, <strong>${esc(user.full_name)}</strong> (${esc(user.role)})`;

    const avatarEl = document.getElementById("sidebarAvatar");
    if (avatarEl) avatarEl.textContent = user.full_name?.[0]?.toUpperCase() ?? "?";
    const nameEl = document.getElementById("sidebarName");
    if (nameEl) nameEl.textContent = user.full_name;
    const roleEl = document.getElementById("sidebarRole");
    if (roleEl) roleEl.textContent = user.role;

  } catch (err) {
    console.error(err);
  }
}

// ── Load batches dropdown ─────────────────────────────────────
async function loadBatches() {
  try {
    const res = await apiFetch("/batches/");
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const data    = await res.json();
    const batches = data.results ?? (Array.isArray(data) ? data : []);
    const select  = document.getElementById("batchSelect");

    select.innerHTML =
      `<option value="">— Select Batch —</option>` +
      batches
        .map((b) => `<option value="${esc(b.id)}">${esc(b.batch_number)} · ${esc(b.medicine_name)}</option>`)
        .join("");

  } catch (err) {
    console.error(err);
    showToast("Failed to load batches", "error");
  }
}

// ── Load warehouses dropdown + KPI count ──────────────────────
async function loadWarehouses() {
  try {
    const res = await apiFetch("/warehouses/");
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const data       = await res.json();
    const warehouses = data.results ?? (Array.isArray(data) ? data : []);
    const select     = document.getElementById("warehouseSelect");

    select.innerHTML =
      `<option value="">— Select Warehouse —</option>` +
      warehouses
        .map((w) => `<option value="${esc(w.id)}">${esc(w.name)} (${esc(w.code)})</option>`)
        .join("");

    document.getElementById("warehouseCount").textContent = fmt(warehouses.length);

  } catch (err) {
    console.error(err);
    showToast("Failed to load warehouses", "error");
  }
}

// ── Keep a full copy of allocations for client-side filtering ─
let _allAllocations = [];

// ── Render (client-side filtered by search query) ─────────────
function renderAllocations(query = "") {
  const q      = query.toLowerCase();
  const tbody  = document.getElementById("allocationTableBody");
  const count  = document.getElementById("resultsCount");

  const filtered = q
    ? _allAllocations.filter(
        (s) =>
          s.warehouse_name?.toLowerCase().includes(q) ||
          s.batch_number?.toLowerCase().includes(q) ||
          s.medicine_name?.toLowerCase().includes(q)
      )
    : _allAllocations;

  // Compute max quantity for relative bar scaling
  _maxQty = Math.max(1, ...filtered.map((s) => s.quantity ?? 0));

  const totalStock = filtered.reduce((sum, s) => sum + (s.quantity ?? 0), 0);

  document.getElementById("allocationCount").textContent = fmt(filtered.length);
  document.getElementById("stockCount").textContent      = fmt(totalStock);
  count.textContent = `${filtered.length} allocation${filtered.length !== 1 ? "s" : ""}`;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-msg">No allocations found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((s) => {
    const status = stockStatus(s.quantity ?? 0);
    return `
      <tr>
        <td>
          <div class="wh-name">${esc(s.warehouse_name ?? "—")}</div>
          ${s.warehouse_code ? `<div class="wh-code">${esc(s.warehouse_code)}</div>` : ""}
        </td>
        <td><span class="batch-num">${esc(s.batch_number ?? "—")}</span></td>
        <td>${esc(s.medicine_name ?? "—")}</td>
        <td>${qtyBar(s.quantity ?? 0)}</td>
        <td><span class="status-pill ${status.cls}">${status.label}</span></td>
      </tr>`;
  }).join("");
}

// ── Load allocations from API, then render ────────────────────
async function loadAllocations() {
  try {
    const res = await apiFetch("/warehouse-stock/");
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    _allAllocations = data.results ?? (Array.isArray(data) ? data : []);

    renderAllocations(document.getElementById("searchInput").value.trim());

  } catch (err) {
    console.error(err);
    document.getElementById("allocationTableBody").innerHTML =
      `<tr><td colspan="5" class="table-msg" style="color:var(--danger)">Failed to load stock data</td></tr>`;
  }
}

// ── Allocate stock ────────────────────────────────────────────
async function allocateStock() {
  const batch_id     = document.getElementById("batchSelect").value;
  const warehouse_id = document.getElementById("warehouseSelect").value;
  const quantity     = parseInt(document.getElementById("quantityInput").value, 10);

  if (!batch_id || !warehouse_id || !quantity || quantity < 1) {
    showToast("Please fill in all fields with valid values", "error");
    return;
  }

  // Loading state
  const btn     = document.getElementById("allocateBtn");
  const spin    = document.getElementById("allocSpin");
  const icon    = document.getElementById("allocIcon");
  const btnText = document.getElementById("allocBtnText");

  btn.disabled        = true;
  spin.style.display  = "block";
  icon.style.display  = "none";
  btnText.textContent = "Allocating…";

  try {
    const res = await apiFetch("/stock-allocation/", {
      method: "POST",
      body:   JSON.stringify({ batch_id, warehouse_id, quantity }),
    });
    if (!res) return;

    const data = await res.json();

    if (!res.ok) {
      const msg = typeof data === "object"
        ? Object.values(data).flat().join(" · ")
        : "Allocation failed";
      showToast(msg, "error");
      return;
    }

    showToast("Stock allocated successfully", "success");

    // Reset form fields
    document.getElementById("batchSelect").value    = "";
    document.getElementById("warehouseSelect").value = "";
    document.getElementById("quantityInput").value  = "";

    loadAllocations();

  } catch (err) {
    console.error(err);
    showToast("Allocation failed — please try again", "error");
  } finally {
    btn.disabled        = false;
    spin.style.display  = "none";
    icon.style.display  = "inline";
    btnText.textContent = "Allocate";
  }
}

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Events ───────────────────────────────────────────────────

document.getElementById("allocateBtn").addEventListener("click", allocateStock);

// Client-side search — no extra API calls needed
document.getElementById("searchInput").addEventListener(
  "input",
  debounce((e) => renderAllocations(e.target.value.trim()), 200)
);

document.getElementById("refreshBtn").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  loadAllocations();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.clear();
  window.location.href = "./login.html";
});

// ── Init — all dropdowns and table in parallel ────────────────
Promise.all([loadProfile(), loadBatches(), loadWarehouses(), loadAllocations()]);