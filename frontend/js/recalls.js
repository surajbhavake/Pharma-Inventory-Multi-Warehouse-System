// ═══════════════════════════════════════════════════════════
// PHARMA ERP — recalls.js  (optimised)
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
  const iconMap = {
    success: "bi bi-check-circle-fill text-success",
    error:   "bi bi-exclamation-circle-fill text-danger",
    warning: "bi bi-exclamation-triangle-fill text-warning",
  };
  icon.className  = iconMap[type] ?? iconMap.success;
  txt.textContent = msg;
  el.className    = `toast-erp ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}

// ── Custom confirm dialog (approve / reject variants) ─────────
function showConfirm({ icon = "⚠️", title, msg, okLabel, okClass }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirmOverlay");
    document.getElementById("confirmIcon").textContent  = icon;
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmMsg").textContent   = msg;

    const okBtn = document.getElementById("confirmOk");
    okBtn.textContent = okLabel;
    okBtn.className   = okClass;

    overlay.classList.add("show");

    const cancel  = document.getElementById("confirmCancel");
    const cleanup = (val) => {
      overlay.classList.remove("show");
      okBtn.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
      resolve(val);
    };

    const onOk     = () => cleanup(true);
    const onCancel = () => cleanup(false);
    okBtn.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
  });
}

// ── Load profile ──────────────────────────────────────────────
async function loadProfile() {
  try {
    const res = await apiFetch("/auth/profile/");
    if (!res) return;
    const user = await res.json();

    const el = document.getElementById("welcomeText");
    if (el) el.innerHTML = `Welcome, <strong>${esc(user.full_name)}</strong> (${esc(user.role)})`;

    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set("sidebarName",   user.full_name ?? "—");
    set("sidebarRole",   user.role      ?? "—");

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

// ── Cache recalls for client-side filter ─────────────────────
let _allRecalls = [];

// ── Render recalls table ──────────────────────────────────────
function renderRecalls(query = "", statusFilter = "") {
  const q      = query.toLowerCase();
  const tbody  = document.getElementById("recallTableBody");
  const count  = document.getElementById("resultsCount");

  let filtered = _allRecalls;

  if (statusFilter) {
    filtered = filtered.filter((r) => r.status === statusFilter);
  }

  if (q) {
    filtered = filtered.filter(
      (r) =>
        r.batch_number?.toLowerCase().includes(q)  ||
        r.medicine_name?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q)        ||
        r.requested_by_username?.toLowerCase().includes(q)
    );
  }

  // Tally status counts from current filter (all recalls, not just visible)
  const tally = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  _allRecalls.forEach((r) => { if (tally[r.status] !== undefined) tally[r.status]++; });

  document.getElementById("totalRecallCount").textContent    = _allRecalls.length;
  document.getElementById("pendingRecallCount").textContent  = tally.PENDING;
  document.getElementById("approvedRecallCount").textContent = tally.APPROVED;
  document.getElementById("rejectedRecallCount").textContent = tally.REJECTED;

  // Pending banner
  const banner = document.getElementById("pendingBanner");
  const bannerText = document.getElementById("pendingBannerText");
  if (tally.PENDING > 0) {
    bannerText.textContent = `${tally.PENDING} recall request${tally.PENDING > 1 ? "s" : ""} awaiting review.`;
    banner.classList.add("show");
  } else {
    banner.classList.remove("show");
  }

  count.textContent = `${filtered.length} recall${filtered.length !== 1 ? "s" : ""}`;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-msg">No recall requests found</td></tr>`;
    return;
  }

  // Status config
  const STATUS = {
    PENDING:  { cls: "status-pending",  label: "Pending",  icon: "bi-hourglass-split" },
    APPROVED: { cls: "status-approved", label: "Approved", icon: "bi-check-circle-fill" },
    REJECTED: { cls: "status-rejected", label: "Rejected", icon: "bi-x-circle-fill" },
  };

  tbody.innerHTML = filtered.map((r) => {
    const s    = STATUS[r.status] ?? STATUS.PENDING;
    const date = r.requested_at
      ? new Date(r.requested_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
      : "—";

    const actionCell = r.status === "PENDING"
      ? `<div class="actions-cell">
           <button class="action-btn approve" title="Approve" data-id="${esc(r.id)}" data-action="approve">
             <i class="bi bi-check-lg"></i>
           </button>
           <button class="action-btn reject" title="Reject" data-id="${esc(r.id)}" data-action="reject">
             <i class="bi bi-x-lg"></i>
           </button>
         </div>`
      : `<span class="completed-label">Completed</span>`;

    return `
      <tr>
        <td><span class="batch-chip">${esc(r.batch_number ?? "—")}</span></td>
        <td>${esc(r.medicine_name ?? "—")}</td>
        <td><div class="reason-cell" title="${esc(r.reason)}">${esc(r.reason ?? "—")}</div></td>
        <td><span class="status-pill ${s.cls}"><i class="bi ${s.icon}"></i>${s.label}</span></td>
        <td><span class="user-cell">${esc(r.requested_by_username ?? "—")}</span></td>
        <td><span class="ts">${date}</span></td>
        <td>${actionCell}</td>
      </tr>`;
  }).join("");
}

// ── Load recalls from API ─────────────────────────────────────
async function loadRecalls() {
  try {
    const res = await apiFetch("/recalls/");
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const data  = await res.json();
    _allRecalls = data.results ?? (Array.isArray(data) ? data : []);

    renderRecalls(
      document.getElementById("searchInput").value.trim(),
      document.getElementById("statusFilter").value
    );

  } catch (err) {
    console.error(err);
    document.getElementById("recallTableBody").innerHTML =
      `<tr><td colspan="7" class="table-msg" style="color:var(--danger)">Failed to load recalls</td></tr>`;
  }
}

// ── Create recall ─────────────────────────────────────────────
async function createRecall() {
  const batch  = document.getElementById("batchSelect").value;
  const reason = document.getElementById("reason").value.trim();

  if (!batch || !reason) {
    showToast("Please select a batch and enter a reason", "error");
    return;
  }

  // Loading state
  const btn     = document.getElementById("saveBtn");
  const spin    = document.getElementById("saveSpin");
  const icon    = document.getElementById("saveIcon");
  const btnText = document.getElementById("saveBtnText");

  btn.disabled        = true;
  spin.style.display  = "block";
  icon.style.display  = "none";
  btnText.textContent = "Submitting…";

  try {
    const res = await apiFetch("/recalls/", {
      method: "POST",
      body:   JSON.stringify({ batch, reason }),
    });
    if (!res) return;

    const data = await res.json();

    if (!res.ok) {
      const msg = typeof data === "object"
        ? Object.values(data).flat().join(" · ")
        : "Submission failed";
      showToast(msg, "error");
      return;
    }

    showToast("Recall request submitted successfully", "success");
    bootstrap.Modal.getInstance(document.getElementById("recallModal"))?.hide();

    document.getElementById("batchSelect").value = "";
    document.getElementById("reason").value      = "";

    loadRecalls();

  } catch (err) {
    console.error(err);
    showToast("Failed to create recall — please try again", "error");
  } finally {
    btn.disabled        = false;
    spin.style.display  = "none";
    icon.style.display  = "inline";
    btnText.textContent = "Submit Recall";
  }
}

// ── Approve recall ────────────────────────────────────────────
async function approveRecall(id) {
  const ok = await showConfirm({
    icon:    "✅",
    title:   "Approve Recall?",
    msg:     "This will mark the batch as officially recalled and notify relevant parties.",
    okLabel: "Approve",
    okClass: "btn-confirm-approve",
  });
  if (!ok) return;

  try {
    const res = await apiFetch(`/recalls/${id}/approve/`, { method: "POST" });
    if (!res) return;

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(typeof data === "object" ? Object.values(data).flat().join(" · ") : "Approval failed", "error");
      return;
    }

    showToast("Recall approved successfully", "success");
    loadRecalls();

  } catch (err) {
    console.error(err);
    showToast("Failed to approve recall", "error");
  }
}

// ── Reject recall ─────────────────────────────────────────────
async function rejectRecall(id) {
  const ok = await showConfirm({
    icon:    "🚫",
    title:   "Reject Recall?",
    msg:     "This recall request will be marked as rejected.",
    okLabel: "Reject",
    okClass: "btn-confirm-reject",
  });
  if (!ok) return;

  try {
    const res = await apiFetch(`/recalls/${id}/reject/`, {
      method: "POST",
      body:   JSON.stringify({ rejection_reason: "Rejected by admin" }),
    });
    if (!res) return;

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(typeof data === "object" ? Object.values(data).flat().join(" · ") : "Rejection failed", "error");
      return;
    }

    showToast("Recall rejected", "warning");
    loadRecalls();

  } catch (err) {
    console.error(err);
    showToast("Failed to reject recall", "error");
  }
}

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Events ───────────────────────────────────────────────────

// Delegated table actions (approve / reject)
document.getElementById("recallTableBody").addEventListener("click", (e) => {
  const btn = e.target.closest(".action-btn");
  if (!btn) return;
  const { id, action } = btn.dataset;
  if (action === "approve") approveRecall(id);
  if (action === "reject")  rejectRecall(id);
});

// Create recall button → open modal
document.getElementById("createRecallBtn").addEventListener("click", () => {
  new bootstrap.Modal(document.getElementById("recallModal")).show();
});

// Submit recall button
document.getElementById("saveBtn").addEventListener("click", createRecall);

// Client-side search + status filter
const reRender = debounce(() => {
  renderRecalls(
    document.getElementById("searchInput").value.trim(),
    document.getElementById("statusFilter").value
  );
}, 200);

document.getElementById("searchInput").addEventListener("input", reRender);
document.getElementById("statusFilter").addEventListener("change", reRender);

// Refresh
document.getElementById("refreshBtn").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  loadRecalls();
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.clear();
  window.location.href = "./login.html";
});

// ── Init ─────────────────────────────────────────────────────
Promise.all([loadProfile(), loadBatches(), loadRecalls()]);