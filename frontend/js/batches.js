// ═══════════════════════════════════════════════════════════
// PHARMA ERP — batches.js  (optimised)
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

// ── Date helpers ──────────────────────────────────────────────
const today = new Date();
today.setHours(0, 0, 0, 0);

// Days until expiry (negative = already expired)
function daysUntil(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function expiryClass(dateStr, isRecalled) {
  if (isRecalled) return "";
  const days = daysUntil(dateStr);
  if (days < 0)   return "expiry-past";
  if (days <= 90) return "expiry-near";
  return "";
}

function batchStatus(batch) {
  if (batch.is_recalled) return { cls: "status-recalled", label: "Recalled" };
  if (daysUntil(batch.expiry_date) < 0) return { cls: "status-expired", label: "Expired" };
  return { cls: "status-active", label: "Active" };
}

// ── Load medicines into dropdown ──────────────────────────────
async function loadMedicinesDropdown() {
  try {
    const res = await apiFetch("/medicines/");
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const data      = await res.json();
    const medicines = data.results ?? (Array.isArray(data) ? data : []);
    const select    = document.getElementById("medicine");

    // Build all options in one innerHTML assign
    select.innerHTML = medicines
      .map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`)
      .join("");

  } catch (err) {
    console.error(err);
    showToast("Failed to load medicines list", "error");
  }
}

// ── Render batches table ──────────────────────────────────────
function renderTable(batches) {
  const tbody = document.getElementById("batchTableBody");
  const count = document.getElementById("resultsCount");

  count.textContent = `${batches.length} batch${batches.length !== 1 ? "es" : ""}`;

  if (!batches.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-msg">No batches found</td></tr>`;
    return;
  }

  tbody.innerHTML = batches.map((b) => {
    const status  = batchStatus(b);
    const expCls  = expiryClass(b.expiry_date, b.is_recalled);
    const days    = daysUntil(b.expiry_date);
    const expTip  = days < 0
      ? `Expired ${Math.abs(days)}d ago`
      : days <= 90
        ? `Expires in ${days}d`
        : "";

    return `
      <tr>
        <td><span class="batch-num">${esc(b.batch_number)}</span></td>
        <td>${esc(b.medicine_name ?? "—")}</td>
        <td><span class="date-val">${esc(b.manufacture_date)}</span></td>
        <td>
          <span class="date-val ${expCls}" title="${expTip}">${esc(b.expiry_date)}</span>
          ${expTip ? `<div style="font-size:11px;color:inherit;opacity:.8">${expTip}</div>` : ""}
        </td>
        <td><span class="qty-val">${esc(b.total_quantity)}</span></td>
        <td><span class="status-pill ${status.cls}">${status.label}</span></td>
        <td>
          <div class="actions-cell">
            <button class="action-btn edit" title="Edit"   data-id="${esc(b.id)}"><i class="bi bi-pencil"></i></button>
            <button class="action-btn del"  title="Delete" data-id="${esc(b.id)}"><i class="bi bi-trash3"></i></button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

// ── Load / search batches ─────────────────────────────────────
async function loadBatches() {
  const query  = document.getElementById("searchInput").value.trim();
  const recall = document.getElementById("recallFilter").value;

  const params = new URLSearchParams();
  if (query)  params.set("search", query);
  if (recall) params.set("is_recalled", recall);

  try {
    const res = await apiFetch(`/batches/?${params}`);
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const data    = await res.json();
    const batches = data.results ?? (Array.isArray(data) ? data : []);
    renderTable(batches);

  } catch (err) {
    console.error(err);
    document.getElementById("batchTableBody").innerHTML =
      `<tr><td colspan="7" class="table-msg" style="color:var(--danger)">Failed to load batches</td></tr>`;
  }
}

// ── Save / update ─────────────────────────────────────────────
async function saveBatch() {
  const id = document.getElementById("batchId").value.trim();

  // Basic date validation
  const mfgDate = document.getElementById("manufacture_date").value;
  const expDate = document.getElementById("expiry_date").value;

  if (mfgDate && expDate && expDate <= mfgDate) {
    showToast("Expiry date must be after manufacture date", "error");
    return;
  }

  const payload = {
    medicine:         document.getElementById("medicine").value,
    batch_number:     document.getElementById("batch_number").value.trim(),
    manufacture_date: mfgDate,
    expiry_date:      expDate,
    total_quantity:   parseInt(document.getElementById("total_quantity").value, 10),
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
    const res = await apiFetch(id ? `/batches/${id}/` : `/batches/`, {
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

    showToast(`Batch ${id ? "updated" : "added"} successfully`, "success");
    bootstrap.Modal.getInstance(document.getElementById("batchModal"))?.hide();
    resetForm();
    loadBatches();

  } catch (err) {
    console.error(err);
    showToast("Save failed — please try again", "error");
  } finally {
    btn.disabled        = false;
    spin.style.display  = "none";
    icon.style.display  = "inline";
    btnText.textContent = "Save Batch";
  }
}

// ── Edit ──────────────────────────────────────────────────────
async function editBatch(id) {
  try {
    const res = await apiFetch(`/batches/${id}/`);
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const b = await res.json();

    document.getElementById("batchId").value          = b.id;
    document.getElementById("medicine").value          = b.medicine;
    document.getElementById("batch_number").value      = b.batch_number ?? "";
    document.getElementById("manufacture_date").value  = b.manufacture_date ?? "";
    document.getElementById("expiry_date").value       = b.expiry_date ?? "";
    document.getElementById("total_quantity").value    = b.total_quantity ?? "";
    document.getElementById("modalTitle").textContent  = "Edit Batch";

    new bootstrap.Modal(document.getElementById("batchModal")).show();

  } catch (err) {
    console.error(err);
    showToast("Failed to load batch details", "error");
  }
}

// ── Delete ────────────────────────────────────────────────────
async function deleteBatch(id) {
  const confirmed = await showConfirm();
  if (!confirmed) return;

  try {
    const res = await apiFetch(`/batches/${id}/`, { method: "DELETE" });
    if (!res) return;

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Delete failed", "error");
      return;
    }

    showToast("Batch deleted", "success");
    loadBatches();

  } catch (err) {
    console.error(err);
    showToast("Delete failed — please try again", "error");
  }
}

// ── Reset form ────────────────────────────────────────────────
function resetForm() {
  ["batchId", "batch_number", "manufacture_date", "expiry_date", "total_quantity"]
    .forEach((id) => { document.getElementById(id).value = ""; });
  document.getElementById("modalTitle").textContent = "Add Batch";
}

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Events ───────────────────────────────────────────────────

// Delegated table actions
document.getElementById("batchTableBody").addEventListener("click", (e) => {
  const btn = e.target.closest(".action-btn");
  if (!btn) return;
  const { id } = btn.dataset;
  if (btn.classList.contains("edit")) editBatch(id);
  if (btn.classList.contains("del"))  deleteBatch(id);
});

// Debounced search
document.getElementById("searchInput").addEventListener(
  "input",
  debounce(() => loadBatches(), 300)
);

// Filter change
document.getElementById("recallFilter").addEventListener("change", () => loadBatches());

// Refresh button
document.getElementById("refreshBtn").addEventListener("click", () => loadBatches());

// Add button
document.getElementById("addBatchBtn").addEventListener("click", () => {
  resetForm();
  new bootstrap.Modal(document.getElementById("batchModal")).show();
});

// Save button
document.getElementById("saveBtn").addEventListener("click", saveBatch);

// ── Init ─────────────────────────────────────────────────────
// Run both in parallel — dropdown and table load simultaneously
Promise.all([loadMedicinesDropdown(), loadBatches(), loadProfile()]);