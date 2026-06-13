// ═══════════════════════════════════════════════════════════
// PHARMA ERP — medicines.js  (optimised)
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

// ── Security: XSS escape ─────────────────────────────────────
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
  el.className = `toast-erp ${type} show`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

// ── Custom confirm dialog ─────────────────────────────────────
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

// ── Storage tag helper ────────────────────────────────────────
const STORAGE_LABELS = {
  room_temp:    "Room Temp",
  refrigerated: "Refrigerated",
  frozen:       "Frozen",
  controlled:   "Controlled",
};

function storageTag(type) {
  const label = STORAGE_LABELS[type] ?? type ?? "—";
  return `<span class="storage-tag storage-${esc(type)}">${esc(label)}</span>`;
}

// ── Render medicines into table ───────────────────────────────
function renderTable(medicines) {
  const tbody = document.getElementById("medicineTableBody");
  const count = document.getElementById("resultsCount");

  count.textContent = `${medicines.length} medicine${medicines.length !== 1 ? "s" : ""}`;

  if (!medicines.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-msg">No medicines found</td></tr>`;
    return;
  }

  // Build HTML string once — avoids repeated reflows from += in a loop
  tbody.innerHTML = medicines.map((m) => `
    <tr>
      <td>
        <div class="cell-name">${esc(m.name)}</div>
        <div class="cell-generic">${esc(m.generic_name)}</div>
      </td>
      <td>${esc(m.manufacturer)}</td>
      <td><span style="font-family:var(--mono);font-size:12px">${esc(m.sku)}</span></td>
      <td>${esc(m.dosage_form)} · ${esc(m.strength)}</td>
      <td>${esc(m.category)}</td>
      <td>${storageTag(m.storage_type)}</td>
      <td style="font-family:var(--mono)">${esc(m.min_stock_threshold)}</td>
      <td>
        <span class="status-pill ${m.is_active ? "status-active" : "status-inactive"}">
          ${m.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        <div class="actions-cell">
          <button class="action-btn edit" title="Edit" data-id="${esc(m.id)}"><i class="bi bi-pencil"></i></button>
          <button class="action-btn del"  title="Delete" data-id="${esc(m.id)}"><i class="bi bi-trash3"></i></button>
        </div>
      </td>
    </tr>
  `).join("");
}

// ── Load / search medicines ───────────────────────────────────
async function loadMedicines(query = "") {
  try {
    const endpoint = query
      ? `/medicines/?search=${encodeURIComponent(query)}`
      : `/medicines/`;

    const res = await apiFetch(endpoint);
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const data      = await res.json();
    const medicines = data.results ?? (Array.isArray(data) ? data : []);
    renderTable(medicines);

  } catch (err) {
    console.error(err);
    document.getElementById("medicineTableBody").innerHTML =
      `<tr><td colspan="9" class="table-msg" style="color:var(--danger)">Failed to load medicines</td></tr>`;
  }
}

// ── Save / update ─────────────────────────────────────────────
async function saveMedicine() {
  const id = document.getElementById("medicineId").value.trim();

  const payload = {
    name:                document.getElementById("name").value.trim(),
    generic_name:        document.getElementById("generic_name").value.trim(),
    manufacturer:        document.getElementById("manufacturer").value.trim(),
    category:            document.getElementById("category").value.trim(),
    sku:                 document.getElementById("sku").value.trim(),
    dosage_form:         document.getElementById("dosage_form").value.trim(),
    strength:            document.getElementById("strength").value.trim(),
    storage_type:        document.getElementById("storage_type").value,
    min_stock_threshold: parseInt(document.getElementById("min_stock_threshold").value, 10),
    is_active:           document.getElementById("is_active").checked,
  };

  // Loading state
  const btn     = document.getElementById("saveBtn");
  const spin    = document.getElementById("saveSpin");
  const icon    = document.getElementById("saveIcon");
  const btnText = document.getElementById("saveBtnText");

  btn.disabled         = true;
  spin.style.display   = "block";
  icon.style.display   = "none";
  btnText.textContent  = id ? "Updating…" : "Saving…";

  try {
    const res = await apiFetch(id ? `/medicines/${id}/` : `/medicines/`, {
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

    showToast(`Medicine ${id ? "updated" : "added"} successfully`, "success");
    bootstrap.Modal.getInstance(document.getElementById("medicineModal"))?.hide();
    resetForm();
    loadMedicines();

  } catch (err) {
    console.error(err);
    showToast("Save failed — please try again", "error");
  } finally {
    btn.disabled        = false;
    spin.style.display  = "none";
    icon.style.display  = "inline";
    btnText.textContent = "Save Medicine";
  }
}

// ── Edit: populate modal ──────────────────────────────────────
async function editMedicine(id) {
  try {
    const res = await apiFetch(`/medicines/${id}/`);
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const m = await res.json();

    const set = (elId, val) => { document.getElementById(elId).value = val ?? ""; };

    set("medicineId",          m.id);
    set("name",                m.name);
    set("generic_name",        m.generic_name);
    set("manufacturer",        m.manufacturer);
    set("category",            m.category);
    set("sku",                 m.sku);
    set("dosage_form",         m.dosage_form);
    set("strength",            m.strength);
    set("storage_type",        m.storage_type ?? "room_temp");
    set("min_stock_threshold", m.min_stock_threshold ?? 10);

    document.getElementById("is_active").checked    = m.is_active ?? true;
    document.getElementById("modalTitle").textContent = "Edit Medicine";

    new bootstrap.Modal(document.getElementById("medicineModal")).show();

  } catch (err) {
    console.error(err);
    showToast("Failed to load medicine details", "error");
  }
}

// ── Delete ────────────────────────────────────────────────────
async function deleteMedicine(id) {
  const confirmed = await showConfirm();
  if (!confirmed) return;

  try {
    const res = await apiFetch(`/medicines/${id}/`, { method: "DELETE" });
    if (!res) return;

    if (!res.ok) { showToast("Delete failed", "error"); return; }

    showToast("Medicine deleted", "success");
    loadMedicines();

  } catch (err) {
    console.error(err);
    showToast("Delete failed — please try again", "error");
  }
}

// ── Reset form ────────────────────────────────────────────────
function resetForm() {
  ["name","generic_name","manufacturer","category","sku",
   "dosage_form","strength","min_stock_threshold"].forEach((id) => {
    document.getElementById(id).value = id === "min_stock_threshold" ? 10 : "";
  });
  document.getElementById("medicineId").value   = "";
  document.getElementById("storage_type").value = "room_temp";
  document.getElementById("is_active").checked  = true;
  document.getElementById("modalTitle").textContent = "Add Medicine";
}

// ── Debounce ─────────────────────────────────────────────────
function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ── Events ───────────────────────────────────────────────────

// Delegated click handler for Edit / Delete buttons
document.getElementById("medicineTableBody").addEventListener("click", (e) => {
  const btn = e.target.closest(".action-btn");
  if (!btn) return;
  const { id } = btn.dataset;
  if (btn.classList.contains("edit")) editMedicine(id);
  if (btn.classList.contains("del"))  deleteMedicine(id);
});

// Search — debounced 300 ms
const searchEl = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearSearch");

searchEl.addEventListener("input", debounce((e) => {
  const q = e.target.value.trim();
  clearBtn.style.display = q ? "flex" : "none";
  loadMedicines(q);
}, 300));

clearBtn.addEventListener("click", () => {
  searchEl.value = "";
  clearBtn.style.display = "none";
  loadMedicines();
});

// Add button
document.getElementById("addMedicineBtn").addEventListener("click", () => {
  resetForm();
  new bootstrap.Modal(document.getElementById("medicineModal")).show();
});

// Save button
document.getElementById("saveBtn").addEventListener("click", saveMedicine);

// ── Init ─────────────────────────────────────────────────────
loadProfile();
loadMedicines();