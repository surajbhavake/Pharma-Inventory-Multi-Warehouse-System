// ═══════════════════════════════════════════════════════════
// PHARMA ERP — stock-transfer.js  (optimised)
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
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}

// ── Number formatter ──────────────────────────────────────────
const fmt = (n) => Number(n ?? 0).toLocaleString("en-IN");

// ── Field validation helpers ──────────────────────────────────
function setInvalid(fieldId, errId, show) {
  document.getElementById(fieldId)?.classList.toggle("invalid", show);
  const errEl = document.getElementById(errId);
  if (errEl) errEl.classList.toggle("show", show);
}

function clearAllErrors() {
  [["batchSelect","errBatch"],["sourceWarehouse","errSource"],
   ["destinationWarehouse","errDest"],["quantityInput","errQty"]]
    .forEach(([f, e]) => setInvalid(f, e, false));
}

// ── Load profile ──────────────────────────────────────────────
async function loadProfile() {
  try {
    const res = await apiFetch("/auth/profile/");
    if (!res) return;
    const user = await res.json();

    const el = document.getElementById("welcomeText");
    if (el) el.innerHTML = `Welcome, <strong>${esc(user.full_name)}</strong> (${esc(user.role)})`;

    const setText = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    setText("sidebarName",   user.full_name ?? "—");
    setText("sidebarRole",   user.role      ?? "—");

    const av = document.getElementById("sidebarAvatar");
    if (av) av.textContent = (user.full_name?.[0] ?? "?").toUpperCase();

  } catch (err) { console.error(err); }
}

// ── Load batches dropdown ─────────────────────────────────────
async function loadBatches() {
  try {
    const res = await apiFetch("/batches/");
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const data    = await res.json();
    const batches = data.results ?? (Array.isArray(data) ? data : []);

    document.getElementById("batchCount").textContent = fmt(batches.length);

    document.getElementById("batchSelect").innerHTML =
      `<option value="">— Select Batch —</option>` +
      batches
        .map((b) => `<option value="${esc(b.id)}">${esc(b.batch_number)} · ${esc(b.medicine_name)}</option>`)
        .join("");

  } catch (err) {
    console.error(err);
    showToast("Failed to load batches", "error");
  }
}

// ── Load warehouses into both dropdowns ───────────────────────
async function loadWarehouses() {
  try {
    const res = await apiFetch("/warehouses/");
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const data       = await res.json();
    const warehouses = data.results ?? (Array.isArray(data) ? data : []);

    document.getElementById("warehouseCount").textContent = fmt(warehouses.length);

    const opts =
      `<option value="">— Select —</option>` +
      warehouses
        .map((w) => `<option value="${esc(w.id)}">${esc(w.name)} (${esc(w.code)})</option>`)
        .join("");

    // Assign same options string to both selects — no duplicate loop
    document.getElementById("sourceWarehouse").innerHTML      = opts.replace("Select —", "Select Source —");
    document.getElementById("destinationWarehouse").innerHTML = opts.replace("Select —", "Select Destination —");

  } catch (err) {
    console.error(err);
    showToast("Failed to load warehouses", "error");
  }
}

// ── Cache all movements for client-side filtering ─────────────
let _allMovements = [];

// ── Render transfer history ───────────────────────────────────
function renderTransfers(query = "", direction = "") {
  const q      = query.toLowerCase();
  const tbody  = document.getElementById("transferTableBody");
  const count  = document.getElementById("resultsCount");

  // Filter: only transfer movements, then apply search + direction
  let filtered = _allMovements.filter(
    (m) => m.movement_type === "TRANSFER_IN" || m.movement_type === "TRANSFER_OUT"
  );

  if (direction) {
    filtered = filtered.filter((m) => m.movement_type === direction);
  }

  if (q) {
    filtered = filtered.filter(
      (m) =>
        m.batch_number?.toLowerCase().includes(q)     ||
        m.warehouse_name?.toLowerCase().includes(q)   ||
        m.reference_id?.toLowerCase().includes(q)
    );
  }

  document.getElementById("transferCount").textContent = fmt(filtered.length);
  count.textContent = `${filtered.length} transfer${filtered.length !== 1 ? "s" : ""}`;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-msg">No transfers found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((m) => {
    const isIn   = m.movement_type === "TRANSFER_IN";
    const date   = m.performed_at
      ? new Date(m.performed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
      : "—";

    return `
      <tr>
        <td><span class="ref-id">${esc(m.reference_id ?? "—")}</span></td>
        <td><span class="batch-chip">${esc(m.batch_number ?? "—")}</span></td>
        <td><span class="wh-name">${esc(m.warehouse_name ?? "—")}</span></td>
        <td>
          <span class="move-badge ${isIn ? "move-in" : "move-out"}">
            <i class="bi bi-arrow-${isIn ? "down" : "up"}-circle-fill"></i>
            ${isIn ? "IN" : "OUT"}
          </span>
        </td>
        <td><span class="qty-val">${fmt(m.quantity)}</span></td>
        <td>${esc(m.performed_by_name ?? "—")}</td>
        <td><span class="ts">${date}</span></td>
      </tr>`;
  }).join("");
}

// ── Load movements from API ───────────────────────────────────
async function loadTransfers() {
  try {
    const res = await apiFetch("/movements/");
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const data   = await res.json();
    _allMovements = data.results ?? (Array.isArray(data) ? data : []);

    renderTransfers(
      document.getElementById("searchInput").value.trim(),
      document.getElementById("directionFilter").value
    );

  } catch (err) {
    console.error(err);
    document.getElementById("transferTableBody").innerHTML =
      `<tr><td colspan="7" class="table-msg" style="color:var(--danger)">Failed to load transfer history</td></tr>`;
  }
}

// ── Transfer stock ────────────────────────────────────────────
async function transferStock() {
  clearAllErrors();

  const batch       = document.getElementById("batchSelect").value;
  const source      = document.getElementById("sourceWarehouse").value;
  const destination = document.getElementById("destinationWarehouse").value;
  const quantity    = parseInt(document.getElementById("quantityInput").value, 10);
  const notes       = document.getElementById("notesInput").value.trim();

  // Validate each field individually — show inline errors
  let valid = true;

  if (!batch)                     { setInvalid("batchSelect",          "errBatch",  true); valid = false; }
  if (!source)                    { setInvalid("sourceWarehouse",       "errSource", true); valid = false; }
  if (!destination || destination === source) {
    setInvalid("destinationWarehouse", "errDest", true); valid = false;
  }
  if (!quantity || quantity < 1)  { setInvalid("quantityInput",        "errQty",    true); valid = false; }

  if (!valid) return;

  // Loading state
  const btn     = document.getElementById("transferBtn");
  const spin    = document.getElementById("transferSpin");
  const icon    = document.getElementById("transferIcon");
  const btnText = document.getElementById("transferBtnText");

  btn.disabled        = true;
  spin.style.display  = "block";
  icon.style.display  = "none";
  btnText.textContent = "Transferring…";

  try {
    const res = await apiFetch("/stock/transfer/", {
      method: "POST",
      body: JSON.stringify({
        batch_id:                 batch,
        source_warehouse_id:      source,
        destination_warehouse_id: destination,
        quantity,
        notes,
      }),
    });
    if (!res) return;

    const data = await res.json();

    if (!res.ok) {
      const msg = typeof data === "object"
        ? Object.values(data).flat().join(" · ")
        : "Transfer failed";
      showToast(msg, "error");
      return;
    }

    showToast("Stock transferred successfully", "success");

    // Reset form
    ["batchSelect", "sourceWarehouse", "destinationWarehouse"].forEach(
      (id) => { document.getElementById(id).value = ""; }
    );
    document.getElementById("quantityInput").value = "";
    document.getElementById("notesInput").value    = "";

    loadTransfers();

  } catch (err) {
    console.error(err);
    showToast("Transfer failed — please try again", "error");
  } finally {
    btn.disabled        = false;
    spin.style.display  = "none";
    icon.style.display  = "inline";
    btnText.textContent = "Transfer";
  }
}

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Events ───────────────────────────────────────────────────

document.getElementById("transferBtn").addEventListener("click", transferStock);

// Clear validation errors on change
["batchSelect","sourceWarehouse","destinationWarehouse","quantityInput"].forEach((id) => {
  document.getElementById(id)?.addEventListener("change", clearAllErrors);
  document.getElementById(id)?.addEventListener("input",  clearAllErrors);
});

// Client-side search + direction filter (no extra API calls)
const reRender = debounce(() => {
  renderTransfers(
    document.getElementById("searchInput").value.trim(),
    document.getElementById("directionFilter").value
  );
}, 200);

document.getElementById("searchInput").addEventListener("input", reRender);
document.getElementById("directionFilter").addEventListener("change", reRender);

document.getElementById("refreshBtn").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  loadTransfers();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.clear();
  window.location.href = "./login.html";
});

// ── Init — all in parallel ────────────────────────────────────
Promise.all([loadProfile(), loadBatches(), loadWarehouses(), loadTransfers()]);