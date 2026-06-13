// ═══════════════════════════════════════════════════════
// PHARMA ERP — dashboard.js  (optimised)
// ═══════════════════════════════════════════════════════

const API_BASE = "http://127.0.0.1:8000/api/v1";

// ── Auth ─────────────────────────────────────────────────
const token = sessionStorage.getItem("access");
if (!token) window.location.href = "./login.html";

// ── Generic authenticated fetch ───────────────────────────
async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    sessionStorage.clear();
    alert("Session expired. Please log in again.");
    window.location.href = "./login.html";
    return null;
  }

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Helper — extract array from paginated or plain response
const toArray = (r) => r?.results ?? (Array.isArray(r) ? r : []);

// Helper — extract count from response
const toCount = (r) =>
  r?.count ?? r?.results?.length ?? (Array.isArray(r) ? r.length : 0);

// Helper — safe DOM text setter
const setText = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
};

// ── Chart defaults (dark theme) ───────────────────────────
Chart.defaults.color = "#7d8590";
Chart.defaults.borderColor = "rgba(255,255,255,0.07)";

const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];


// ═══════════════════════════════════════════════════════
// 1. PROFILE
// ═══════════════════════════════════════════════════════
async function loadProfile() {
  const user = await apiFetch("/auth/profile/");
  if (!user) return;

  setText("welcomeText", `Welcome back, ${user.full_name} (${user.role})`);

  // Sidebar user info (if elements exist in this template)
  setText("sidebarName", user.full_name);
  setText("sidebarRole", user.role);

  const avatarEl = document.getElementById("sidebarAvatar");
  if (avatarEl) avatarEl.textContent = user.full_name?.[0]?.toUpperCase() ?? "?";
}


// ═══════════════════════════════════════════════════════
// 2. KPI COUNTS  (parallel fetch)
// ═══════════════════════════════════════════════════════
async function loadCounts() {
  const [medicines, batches, warehouses, recalls] = await Promise.all([
    apiFetch("/medicines/"),
    apiFetch("/batches/"),
    apiFetch("/warehouses/"),
    apiFetch("/recalls/"),
  ]);

  setText("medicineCount",  toCount(medicines));
  setText("batchCount",     toCount(batches));
  setText("warehouseCount", toCount(warehouses));
  setText("recallCount",    toCount(recalls));
}


// ═══════════════════════════════════════════════════════
// 3. STOCK DISTRIBUTION CHART
// ═══════════════════════════════════════════════════════
async function loadStockChart() {
  const response = await apiFetch("/warehouse-stock/");
  if (!response) return;

  const stocks = toArray(response);

  // Aggregate by warehouse
  const totals = stocks.reduce((acc, s) => {
    const name = s.warehouse?.name ?? "Unknown";
    acc[name] = (acc[name] ?? 0) + (s.quantity ?? 0);
    return acc;
  }, {});

  const ctx = document.getElementById("stockChart");
  if (!ctx) return;

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(totals),
      datasets: [{
        data:            Object.values(totals),
        backgroundColor: PALETTE,
        borderColor:     "rgba(0,0,0,0.3)",
        borderWidth:     2,
        hoverOffset:     6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 12, padding: 16, font: { size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.formattedValue} units`,
          },
        },
      },
    },
  });
}


// ═══════════════════════════════════════════════════════
// 4. BATCH ANALYTICS CHART
// ═══════════════════════════════════════════════════════
async function loadBatchChart() {
  const response = await apiFetch("/batches/");
  if (!response) return;

  const batches = toArray(response);
  const today   = new Date();

  let active = 0, recalled = 0, expired = 0;

  batches.forEach((b) => {
    if (b.is_recalled) {
      recalled++;
    } else if (new Date(b.expiry_date) < today) {
      expired++;
    } else {
      active++;
    }
  });

  const ctx = document.getElementById("batchChart");
  if (!ctx) return;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels:   ["Active", "Recalled", "Expired"],
      datasets: [{
        label:           "Batches",
        data:            [active, recalled, expired],
        backgroundColor: ["rgba(16,185,129,0.7)", "rgba(239,68,68,0.7)", "rgba(245,158,11,0.7)"],
        borderColor:     ["#10b981", "#ef4444", "#f59e0b"],
        borderWidth:     1,
        borderRadius:    6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.raw} batches` },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}


// ═══════════════════════════════════════════════════════
// 5. LOW STOCK ALERTS
// ═══════════════════════════════════════════════════════
async function loadLowStock() {
  const el = document.getElementById("lowStockList");
  if (!el) return;

  const response = await apiFetch("/alerts/low-stock/");
  if (!response) return;

  const items = toArray(response);
  el.innerHTML = "";

  if (!items.length) {
    el.innerHTML = `<li><span class="empty-msg">✓ No low stock alerts</span></li>`;
    return;
  }

  items.forEach((item) => {
    el.insertAdjacentHTML(
      "beforeend",
      `<li>
        <div>
          <div class="item-name">${escapeHtml(item.name)}</div>
          ${item.category ? `<div class="item-sub">${escapeHtml(item.category)}</div>` : ""}
        </div>
        <span class="badge-status red">LOW</span>
      </li>`
    );
  });
}


// ═══════════════════════════════════════════════════════
// 6. EXPIRING BATCHES
// ═══════════════════════════════════════════════════════
async function loadExpiringBatches() {
  const el = document.getElementById("expiryList");
  if (!el) return;

  const response = await apiFetch("/batches/expiring_soon/");
  if (!response) return;

  const batches = response.batches ?? [];
  el.innerHTML = "";

  if (!batches.length) {
    el.innerHTML = `<li><span class="empty-msg">✓ No batches expiring soon</span></li>`;
    return;
  }

  batches.forEach((b) => {
    el.insertAdjacentHTML(
      "beforeend",
      `<li>
        <div>
          <div class="item-name">${escapeHtml(b.batch_number)}</div>
          <div class="item-sub">${escapeHtml(b.medicine_name ?? "")}</div>
        </div>
        <span class="badge-status yellow">${escapeHtml(b.expiry_date)}</span>
      </li>`
    );
  });
}


// ═══════════════════════════════════════════════════════
// 7. RECENT AUDIT LOGS
// ═══════════════════════════════════════════════════════
const ACTION_CLASS = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
};

function actionBadge(action = "") {
  const cls = ACTION_CLASS[action.toUpperCase()] ?? "other";
  return `<span class="action-badge ${cls}">${escapeHtml(action) || "—"}</span>`;
}

async function loadAuditLogs() {
  const tbody = document.getElementById("recentActivityTable");
  if (!tbody) return;

  const response = await apiFetch("/audit-logs/");
  if (!response) return;

  const logs = toArray(response).slice(0, 10);
  tbody.innerHTML = "";

  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">No audit logs found</td></tr>`;
    return;
  }

  logs.forEach((log) => {
    const date = log.created_at
      ? new Date(log.created_at).toLocaleString()
      : "—";

    tbody.insertAdjacentHTML(
      "beforeend",
      `<tr>
        <td>${actionBadge(log.action)}</td>
        <td>${escapeHtml(log.user_name ?? "—")}</td>
        <td>${escapeHtml(log.entity_type ?? "—")}</td>
        <td>${escapeHtml(log.description ?? "—")}</td>
        <td class="ts">${date}</td>
      </tr>`
    );
  });
}


// ═══════════════════════════════════════════════════════
// SECURITY: XSS prevention helper
// ═══════════════════════════════════════════════════════
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


// ═══════════════════════════════════════════════════════
// INIT — run profile + counts in parallel, then rest
// ═══════════════════════════════════════════════════════
async function initDashboard() {
  console.log("dashboard.js loaded", new Date().toLocaleTimeString());
  try {
    // Critical above-the-fold data first
    await Promise.all([loadProfile(), loadCounts()]);

    // Charts and lists can race — failures are isolated
    await Promise.allSettled([
      loadStockChart(),
      loadBatchChart(),
      loadLowStock(),
      loadExpiringBatches(),
      loadAuditLogs(),
    ]);
  } catch (err) {
    console.error("Dashboard init error:", err);
  }
}

initDashboard();