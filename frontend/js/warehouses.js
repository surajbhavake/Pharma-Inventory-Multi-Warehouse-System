// ═══════════════════════════════════════════════════════════
// PHARMA ERP — warehouses.js  (optimised)
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


const setText = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
};
// ═══════════════════════════════════════════════════════
// 1. PROFILE
// ═══════════════════════════════════════════════════════
async function loadProfile() {
    const res = await apiFetch("/auth/profile/");
    if (!res) return;

    const user = await res.json();

    setText("sidebarName", user.full_name);
    setText("sidebarRole", user.role);

    const avatarEl = document.getElementById("sidebarAvatar");

    if (avatarEl) {
        avatarEl.textContent =
            user.full_name?.charAt(0).toUpperCase() ?? "?";
    }
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

// ── Custom confirm ────────────────────────────────────────────
function showConfirm() {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirmOverlay");
    overlay.classList.add("show");

    const ok     = document.getElementById("confirmOk");
    const cancel = document.getElementById("confirmCancel");

    const cleanup = (val) => {
      overlay.classList.remove("show");
      ok.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
      resolve(val);
    };

    const onOk     = () => cleanup(true);
    const onCancel = () => cleanup(false);
    ok.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
  });
}

// ── Load managers dropdown ────────────────────────────────────
async function loadManagers() {
  try {
    const res = await apiFetch("/users/");
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const data    = await res.json();
    const users   = data.results ?? (Array.isArray(data) ? data : []);
    const select  = document.getElementById("manager");

    const managers = users.filter(
      (u) => u.role === "manager" || u.role === "warehouse_manager"
    );

    // Preserve default empty option, append managers
    select.innerHTML =
      `<option value="">— No Manager Assigned —</option>` +
      managers
        .map((u) => `<option value="${esc(u.id)}">${esc(u.full_name)}</option>`)
        .join("");

  } catch (err) {
    console.error(err);
    showToast("Failed to load managers list", "error");
  }
}

// ── Render table ──────────────────────────────────────────────
function renderTable(warehouses) {
  const tbody = document.getElementById("warehouseTableBody");
  const count = document.getElementById("resultsCount");

  count.textContent = `${warehouses.length} warehouse${warehouses.length !== 1 ? "s" : ""}`;

  if (!warehouses.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-msg">No warehouses found</td></tr>`;
    return;
  }

  tbody.innerHTML = warehouses.map((w) => {
    const hasManager  = !!w.manager_name;
    const managerHtml = hasManager
      ? `<span class="manager-pill has-manager"><i class="bi bi-person-fill"></i>${esc(w.manager_name)}</span>`
      : `<span class="manager-pill no-manager"><i class="bi bi-person-dash"></i>Unassigned</span>`;

    return `
      <tr>
        <td><div class="wh-name">${esc(w.name)}</div></td>
        <td><span class="wh-code">${esc(w.code)}</span></td>
        <td>
          <div class="location-cell">
            <i class="bi bi-geo-alt"></i>
            ${esc(w.city)}, ${esc(w.state)}
          </div>
        </td>
        <td><span class="phone-cell">${esc(w.pincode ?? "—")}</span></td>
        <td><span class="phone-cell">${esc(w.phone ?? "—")}</span></td>
        <td>${managerHtml}</td>
        <td>
          <div class="actions-cell">
            <button class="action-btn edit" title="Edit"   data-id="${esc(w.id)}"><i class="bi bi-pencil"></i></button>
            <button class="action-btn del"  title="Delete" data-id="${esc(w.id)}"><i class="bi bi-trash3"></i></button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

// ── Load / search warehouses ──────────────────────────────────
async function loadWarehouses() {
  const query  = document.getElementById("searchInput").value.trim();
  const params = new URLSearchParams();
  if (query) params.set("search", query);

  try {
    const res = await apiFetch(`/warehouses/?${params}`);
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const data       = await res.json();
    const warehouses = data.results ?? (Array.isArray(data) ? data : []);
    renderTable(warehouses);

  } catch (err) {
    console.error(err);
    document.getElementById("warehouseTableBody").innerHTML =
      `<tr><td colspan="7" class="table-msg" style="color:var(--danger)">Failed to load warehouses</td></tr>`;
  }
}

// ── Save / update ─────────────────────────────────────────────
async function saveWarehouse() {
  const id = document.getElementById("warehouseId").value.trim();

  // Basic pincode validation
  const pincode = document.getElementById("pincode").value.trim();
  if (pincode && !/^\d{6}$/.test(pincode)) {
    showToast("Pincode must be exactly 6 digits", "error");
    return;
  }

  const payload = {
    name:    document.getElementById("name").value.trim(),
    code:    document.getElementById("code").value.trim(),
    city:    document.getElementById("city").value.trim(),
    state:   document.getElementById("state").value.trim(),
    pincode,
    phone:   document.getElementById("phone").value.trim(),
    address: document.getElementById("address").value.trim(),
    manager: document.getElementById("manager").value || null,
  };

  // Loading state
  const btn     = document.getElementById("saveBtn");
  const spin    = document.getElementById("saveSpin");
  const icon    = document.getElementById("saveIcon");
  const btnText = document.getElementById("saveBtnText");

  btn.disabled        = true;
  spin.style.display  = "block";
  icon.style.display  = "none";
  btnText.textContent = id ? "Updating…" : "Saving…";

  try {
    const res = await apiFetch(id ? `/warehouses/${id}/` : `/warehouses/`, {
      method: id ? "PUT" : "POST",
      body:   JSON.stringify(payload),
    });
    if (!res) return;

    const data = await res.json();

    if (!res.ok) {
      const msg = typeof data === "object"
        ? Object.values(data).flat().join(" · ")
        : "Save failed";
      showToast(msg, "error");
      return;
    }

    showToast(`Warehouse ${id ? "updated" : "added"} successfully`, "success");
    bootstrap.Modal.getInstance(document.getElementById("warehouseModal"))?.hide();
    resetForm();
    loadWarehouses();

  } catch (err) {
    console.error(err);
    showToast("Save failed — please try again", "error");
  } finally {
    btn.disabled        = false;
    spin.style.display  = "none";
    icon.style.display  = "inline";
    btnText.textContent = "Save Warehouse";
  }
}

// ── Edit ──────────────────────────────────────────────────────
async function editWarehouse(id) {
  try {
    const res = await apiFetch(`/warehouses/${id}/`);
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const w = await res.json();

    const set = (elId, val) => { document.getElementById(elId).value = val ?? ""; };

    set("warehouseId", w.id);
    set("name",        w.name);
    set("code",        w.code);
    set("city",        w.city);
    set("state",       w.state);
    set("pincode",     w.pincode);
    set("phone",       w.phone);
    set("address",     w.address);
    set("manager",     w.manager ?? "");

    document.getElementById("modalTitle").textContent = "Edit Warehouse";
    new bootstrap.Modal(document.getElementById("warehouseModal")).show();

  } catch (err) {
    console.error(err);
    showToast("Failed to load warehouse details", "error");
  }
}

// ── Delete ────────────────────────────────────────────────────
async function deleteWarehouse(id) {
  const confirmed = await showConfirm();
  if (!confirmed) return;

  try {
    const res = await apiFetch(`/warehouses/${id}/`, { method: "DELETE" });
    if (!res) return;

    if (!res.ok) {
      showToast("Delete failed", "error");
      return;
    }

    showToast("Warehouse deleted", "success");
    loadWarehouses();

  } catch (err) {
    console.error(err);
    showToast("Delete failed — please try again", "error");
  }
}

// ── Reset form ────────────────────────────────────────────────
function resetForm() {
  ["warehouseId", "name", "code", "city", "state", "pincode", "phone", "address"]
    .forEach((id) => { document.getElementById(id).value = ""; });
  document.getElementById("manager").value = "";
  document.getElementById("modalTitle").textContent = "Add Warehouse";
}

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Events ───────────────────────────────────────────────────

// Delegated table actions
document.getElementById("warehouseTableBody").addEventListener("click", (e) => {
  const btn = e.target.closest(".action-btn");
  if (!btn) return;
  const { id } = btn.dataset;
  if (btn.classList.contains("edit")) editWarehouse(id);
  if (btn.classList.contains("del"))  deleteWarehouse(id);
});

// Debounced search
document.getElementById("searchInput").addEventListener(
  "input",
  debounce(() => loadWarehouses(), 300)
);

// Refresh button
document.getElementById("refreshBtn").addEventListener("click", () => loadWarehouses());

// Add button
document.getElementById("addWarehouseBtn").addEventListener("click", () => {
  resetForm();
  new bootstrap.Modal(document.getElementById("warehouseModal")).show();
});

// Save button
document.getElementById("saveBtn").addEventListener("click", saveWarehouse);

// ── Init — parallel load ──────────────────────────────────────
Promise.all([loadManagers(), loadWarehouses()], loadProfile());