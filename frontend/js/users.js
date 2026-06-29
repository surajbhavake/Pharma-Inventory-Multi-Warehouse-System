// ═══════════════════════════════════════════════════════════
// PHARMA ERP — users.js  (optimised)
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
  const map  = {
    success: "bi bi-check-circle-fill text-success",
    error:   "bi bi-exclamation-circle-fill text-danger",
    warning: "bi bi-exclamation-triangle-fill text-warning",
  };
  icon.className  = map[type] ?? map.success;
  txt.textContent = msg;
  el.className    = `toast-erp ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}

// ── Confirm dialog ────────────────────────────────────────────
function showConfirm({ icon = "⚠️", title, msg, okLabel = "Confirm", okClass = "btn-confirm-ok" }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirmOverlay");
    document.getElementById("confirmIcon").textContent  = icon;
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmMsg").textContent   = msg;

    const okBtn = document.getElementById("confirmOk");
    okBtn.textContent = okLabel;
    okBtn.className   = okClass;

    overlay.classList.add("show");

    const cancel = document.getElementById("confirmCancel");
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

// ── Role config ───────────────────────────────────────────────
const ROLE_CFG = {
  admin:             { cls: "role-admin",             label: "Admin",             icon: "bi-shield-fill-check" },
  warehouse_manager: { cls: "role-warehouse_manager", label: "Warehouse Mgr",     icon: "bi-buildings" },
  staff:             { cls: "role-staff",             label: "Staff",             icon: "bi-person-fill" },
  auditor:           { cls: "role-auditor",           label: "Auditor",           icon: "bi-eye-fill" },
};

function rolePill(role) {
  const cfg = ROLE_CFG[role] ?? { cls: "role-staff", label: role ?? "—", icon: "bi-person" };
  return `<span class="role-pill ${cfg.cls}"><i class="bi ${cfg.icon}"></i>${cfg.label}</span>`;
}

function avatarColor(name = "") {
  const colors = [
    ["#3b82f6","#8b5cf6"], ["#10b981","#06b6d4"],
    ["#f59e0b","#ef4444"], ["#8b5cf6","#ec4899"],
    ["#06b6d4","#3b82f6"],
  ];
  const idx = (name.charCodeAt(0) || 0) % colors.length;
  return `linear-gradient(135deg,${colors[idx][0]},${colors[idx][1]})`;
}

// ── State ─────────────────────────────────────────────────────
let _allUsers     = [];
let _warehouses   = [];
let _currentUser  = null;   // logged-in user profile
let _editingUser  = null;   // user currently in the edit drawer

// ── Load profile (logged-in user) ────────────────────────────
async function loadProfile() {
  try {
    const res = await apiFetch("/auth/profile/");
    if (!res) return;
    _currentUser = await res.json();

    const el = document.getElementById("welcomeText");
    if (el) el.innerHTML = `Welcome, <strong>${esc(_currentUser.full_name)}</strong>`;

    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set("sidebarName",   _currentUser.full_name ?? "—");
    set("sidebarRole",   _currentUser.role      ?? "—");

    const av = document.getElementById("sidebarAvatar");
    if (av) {
      av.textContent   = (_currentUser.full_name?.[0] ?? "?").toUpperCase();
      av.style.background = avatarColor(_currentUser.full_name ?? "");
    }

    // Admin guard — redirect non-admins away
    if (_currentUser.role !== "admin") {
      showToast("Access denied. Admins only.", "error");
      setTimeout(() => (window.location.href = "./index.html"), 1500);
    }

    // Hide admin-only nav sections for non-admins (safety)
    if (_currentUser.role !== "admin") {
      document.querySelectorAll(".admin-section").forEach(el => el.style.display = "none");
    }

  } catch (err) { console.error(err); }
}

// ── Load warehouses for dropdown ─────────────────────────────
async function loadWarehouses() {
  try {
    const res = await apiFetch("/warehouses/");
    if (!res) return;
    const data  = await res.json();
    _warehouses = data.results ?? (Array.isArray(data) ? data : []);
  } catch (err) { console.error(err); }
}

// ── Populate warehouse select inside modal ────────────────────
function populateWarehouseSelect(selectedId = "") {
  const sel = document.getElementById("warehouseSelect");
  if (!sel) return;
  sel.innerHTML =
    `<option value="">— No Warehouse —</option>` +
    _warehouses
      .map((w) => `<option value="${esc(w.id)}" ${w.id == selectedId ? "selected" : ""}>${esc(w.name)} (${esc(w.code)})</option>`)
      .join("");
}

// ── Load all users ────────────────────────────────────────────
async function loadUsers() {
  try {
    const res = await apiFetch("/users/");
    if (!res) return;
    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    _allUsers  = data.results ?? (Array.isArray(data) ? data : []);

    renderUsers();

  } catch (err) {
    console.error(err);
    document.getElementById("usersTableBody").innerHTML =
      `<tr><td colspan="7" class="table-msg" style="color:var(--danger)">Failed to load users</td></tr>`;
  }
}

// ── Render users (client-side filter) ────────────────────────
function renderUsers() {
  const tbody  = document.getElementById("usersTableBody");
  const count  = document.getElementById("resultsCount");
  const q      = document.getElementById("searchInput").value.toLowerCase().trim();
  const role   = document.getElementById("roleFilter").value;
  const status = document.getElementById("statusFilter").value;

  let filtered = _allUsers;

  if (q) {
    filtered = filtered.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q)  ||
        u.email?.toLowerCase().includes(q)       ||
        u.username?.toLowerCase().includes(q)    ||
        u.role?.toLowerCase().includes(q)
    );
  }

  if (role)   filtered = filtered.filter((u) => u.role === role);
  if (status) filtered = filtered.filter((u) => (status === "active") === !!u.is_active);

  // KPI tallies (always from full dataset)
  document.getElementById("kpiTotal").textContent   = _allUsers.length;
  document.getElementById("kpiAdmins").textContent  = _allUsers.filter((u) => u.role === "admin").length;
  document.getElementById("kpiActive").textContent  = _allUsers.filter((u) => u.is_active).length;
  document.getElementById("kpiInactive").textContent= _allUsers.filter((u) => !u.is_active).length;

  count.textContent = `${filtered.length} user${filtered.length !== 1 ? "s" : ""}`;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-msg">No users found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((u) => {
    const initial = (u.full_name ?? u.username ?? "?")[0].toUpperCase();
    const date    = u.date_joined
      ? new Date(u.date_joined).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "—";

    return `
      <tr data-id="${esc(u.id)}">
        <td>
          <div class="user-row-info">
            <div class="user-row-avatar" style="background:${avatarColor(u.full_name ?? "")}">${initial}</div>
            <div>
              <div class="user-full-name">${esc(u.full_name ?? u.username)}</div>
              <div class="user-email">${esc(u.email)}</div>
            </div>
          </div>
        </td>
        <td style="font-family:var(--mono);font-size:12px;color:var(--muted)">${esc(u.username)}</td>
        <td>${rolePill(u.role)}</td>
        <td style="font-size:12px;color:var(--muted)">${esc(u.warehouse_name ?? "—")}</td>
        <td>
          <span class="status-pill ${u.is_active ? "status-active" : "status-inactive"}">
            ${u.is_active ? "Active" : "Inactive"}
          </span>
        </td>
        <td style="font-family:var(--mono);font-size:11px;color:var(--muted)">${date}</td>
        <td>
          <div class="actions-cell">
            <button class="action-btn view"   title="View Profile" data-id="${esc(u.id)}" data-action="view"><i class="bi bi-eye"></i></button>
            <button class="action-btn edit"   title="Edit User"    data-id="${esc(u.id)}" data-action="edit"><i class="bi bi-pencil"></i></button>
            <button class="action-btn toggle" title="${u.is_active ? "Deactivate" : "Activate"}" data-id="${esc(u.id)}" data-action="toggle" data-active="${u.is_active}">
              <i class="bi bi-${u.is_active ? "person-dash" : "person-check"}"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

// ── Open profile drawer ───────────────────────────────────────
function openProfileDrawer(userId) {
  const user = _allUsers.find((u) => u.id == userId);
  if (!user) return;

  _editingUser = user;

  const initial = (user.full_name ?? user.username ?? "?")[0].toUpperCase();
  const joined  = user.date_joined
    ? new Date(user.date_joined).toLocaleDateString("en-IN", { dateStyle: "long" })
    : "—";
  const lastLogin = user.last_login
    ? new Date(user.last_login).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "Never";

  const roleCfg = ROLE_CFG[user.role] ?? { cls: "role-staff", label: user.role, icon: "bi-person" };

  document.getElementById("drawerBody").innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar" style="background:${avatarColor(user.full_name ?? "")}">${initial}</div>
      <div>
        <div class="profile-name">${esc(user.full_name ?? user.username)}</div>
        <div class="profile-email">${esc(user.email)}</div>
        <div style="margin-top:8px">${rolePill(user.role)}</div>
      </div>
    </div>

    <div class="drawer-section">Account Details</div>
    <div class="profile-grid">
      <div class="profile-field">
        <div class="profile-field-label">Username</div>
        <div class="profile-field-value" style="font-family:var(--mono);font-size:13px">${esc(user.username)}</div>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Status</div>
        <div class="profile-field-value">
          <span class="status-pill ${user.is_active ? "status-active" : "status-inactive"}">${user.is_active ? "Active" : "Inactive"}</span>
        </div>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Warehouse</div>
        <div class="profile-field-value">${esc(user.warehouse_name ?? "None assigned")}</div>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Warehouse Code</div>
        <div class="profile-field-value" style="font-family:var(--mono)">${esc(user.warehouse_code ?? "—")}</div>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Date Joined</div>
        <div class="profile-field-value" style="font-size:13px">${joined}</div>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Last Login</div>
        <div class="profile-field-value" style="font-size:12px;color:var(--muted)">${lastLogin}</div>
      </div>
    </div>

    <div class="drawer-section">Permissions</div>
    <div class="profile-grid">
      ${permissionBadge("Approve Recalls",  user.role === "admin")}
      ${permissionBadge("Manage Stock",     ["admin","warehouse_manager"].includes(user.role))}
      ${permissionBadge("Audit Access",     ["admin","auditor"].includes(user.role))}
      ${permissionBadge("User Management",  user.role === "admin")}
    </div>

    <div class="drawer-section">Quick Actions</div>
    <div class="drawer-footer">
      <button class="btn-erp btn-primary-erp" id="drawerEditBtn" style="flex:1">
        <i class="bi bi-pencil"></i> Edit User
      </button>
      <button class="btn-erp ${user.is_active ? "btn-danger-erp" : "btn-ghost"}" id="drawerToggleBtn" style="flex:1">
        <i class="bi bi-person-${user.is_active ? "dash" : "check"}"></i>
        ${user.is_active ? "Deactivate" : "Activate"}
      </button>
    </div>`;

  document.getElementById("drawerEditBtn").addEventListener("click", () => {
    closeDrawer();
    openEditModal(user.id);
  });

  document.getElementById("drawerToggleBtn").addEventListener("click", () => {
    closeDrawer();
    toggleUserStatus(user.id, user.is_active);
  });

  document.getElementById("profileDrawer").classList.add("open");
  document.getElementById("drawerOverlay").classList.add("open");
}

function permissionBadge(label, allowed) {
  const cls  = allowed ? "status-active"   : "status-inactive";
  const icon = allowed ? "bi-check-circle-fill" : "bi-x-circle-fill";
  return `
    <div class="profile-field">
      <div class="profile-field-label">${label}</div>
      <div class="profile-field-value">
        <span class="status-pill ${cls}"><i class="bi ${icon}"></i>${allowed ? "Yes" : "No"}</span>
      </div>
    </div>`;
}

function closeDrawer() {
  document.getElementById("profileDrawer").classList.remove("open");
  document.getElementById("drawerOverlay").classList.remove("open");
}

// ── Open CREATE modal ─────────────────────────────────────────
function openCreateModal() {
  document.getElementById("userId").value          = "";
  document.getElementById("firstName").value       = "";
  document.getElementById("lastName").value        = "";
  document.getElementById("email").value           = "";
  document.getElementById("username").value        = "";
  document.getElementById("password").value        = "";
  document.getElementById("confirmPassword").value = "";
  document.getElementById("role").value            = "staff";
  document.getElementById("modalTitle").textContent = "Create User";
  document.getElementById("saveBtnText").textContent = "Create User";
  document.getElementById("passwordGroup").style.display        = "";
  document.getElementById("confirmPasswordGroup").style.display = "";
  document.getElementById("editStatusGroup").style.display      = "none";
  populateWarehouseSelect();
  resetPwStrength();
  new bootstrap.Modal(document.getElementById("userModal")).show();
}

// ── Open EDIT modal ───────────────────────────────────────────
function openEditModal(userId) {
  const user = _allUsers.find((u) => u.id == userId);
  if (!user) return;

  document.getElementById("userId").value     = user.id;
  document.getElementById("firstName").value  = user.first_name ?? "";
  document.getElementById("lastName").value   = user.last_name  ?? "";
  document.getElementById("email").value      = user.email      ?? "";
  document.getElementById("username").value   = user.username   ?? "";
  document.getElementById("role").value       = user.role       ?? "staff";
  document.getElementById("isActive").value   = user.is_active ? "true" : "false";

  document.getElementById("modalTitle").textContent  = "Edit User";
  document.getElementById("saveBtnText").textContent = "Save Changes";

  // Hide password fields for edit
  document.getElementById("passwordGroup").style.display        = "none";
  document.getElementById("confirmPasswordGroup").style.display = "none";
  document.getElementById("editStatusGroup").style.display      = "";

  populateWarehouseSelect(user.assigned_warehouse ?? "");
  new bootstrap.Modal(document.getElementById("userModal")).show();
}

// ── Save user (create or update) ──────────────────────────────
async function saveUser() {
  const id = document.getElementById("userId").value.trim();

  const payload = {
    first_name: document.getElementById("firstName").value.trim(),
    last_name:  document.getElementById("lastName").value.trim(),
    email:      document.getElementById("email").value.trim(),
    username:   document.getElementById("username").value.trim(),
    role:       document.getElementById("role").value,
    assigned_warehouse: document.getElementById("warehouseSelect")?.value || null,
  };

  if (!id) {
    // New user — require passwords
    const pw  = document.getElementById("password").value;
    const cpw = document.getElementById("confirmPassword").value;

    if (!pw || pw.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }

    if (pw !== cpw) {
      showToast("Passwords do not match", "error");
      return;
    }

    payload.password         = pw;
    payload.password_confirm = cpw;
  } else {
    // Edit — include active status
    payload.is_active = document.getElementById("isActive").value === "true";
  }

  // Require core fields
  if (!payload.first_name || !payload.email || !payload.username) {
    showToast("Please fill in all required fields", "error");
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
  btnText.textContent = id ? "Saving…" : "Creating…";

  try {
    const endpoint = id ? `/users/${id}/` : `/auth/register/`;
    const method   = id ? "PATCH" : "POST";

    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload),
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

    showToast(`User ${id ? "updated" : "created"} successfully`, "success");
    bootstrap.Modal.getInstance(document.getElementById("userModal"))?.hide();
    loadUsers();

  } catch (err) {
    console.error(err);
    showToast("Save failed — please try again", "error");
  } finally {
    btn.disabled        = false;
    spin.style.display  = "none";
    icon.style.display  = "inline";
    btnText.textContent = id ? "Save Changes" : "Create User";
  }
}

// ── Toggle active status ──────────────────────────────────────
async function toggleUserStatus(userId, currentlyActive) {
  const ok = await showConfirm({
    icon:    currentlyActive ? "🚫" : "✅",
    title:   currentlyActive ? "Deactivate User?" : "Activate User?",
    msg:     currentlyActive
      ? "This user will lose access to the system immediately."
      : "This user will regain access to the system.",
    okLabel: currentlyActive ? "Deactivate" : "Activate",
    okClass: currentlyActive ? "btn-confirm-ok" : "btn-confirm-approve",
  });
  if (!ok) return;

  try {
    const res = await apiFetch(`/users/${userId}/`, {
      method: "PATCH",
      body:   JSON.stringify({ is_active: !currentlyActive }),
    });
    if (!res) return;

    if (!res.ok) {
      showToast("Status update failed", "error");
      return;
    }

    showToast(currentlyActive ? "User deactivated" : "User activated", "success");
    loadUsers();

  } catch (err) {
    console.error(err);
    showToast("Failed to update status", "error");
  }
}

// ── Password strength meter ───────────────────────────────────
function resetPwStrength() {
  document.getElementById("pwFill").style.cssText = "width:0;background:var(--danger)";
  document.getElementById("pwHint").textContent   = "Enter a password";
}

document.getElementById("password")?.addEventListener("input", (e) => {
  const pw   = e.target.value;
  const fill = document.getElementById("pwFill");
  const hint = document.getElementById("pwHint");

  let score = 0;
  if (pw.length >= 8)               score++;
  if (/[A-Z]/.test(pw))             score++;
  if (/[0-9]/.test(pw))             score++;
  if (/[^A-Za-z0-9]/.test(pw))      score++;

  const cfg = [
    { pct: "25%",  bg: "var(--danger)",  text: "Weak" },
    { pct: "50%",  bg: "var(--warning)", text: "Fair" },
    { pct: "75%",  bg: "var(--warning)", text: "Good" },
    { pct: "100%", bg: "var(--accent2)", text: "Strong" },
  ];

  const c = cfg[Math.max(0, score - 1)] ?? cfg[0];
  fill.style.width      = pw.length ? c.pct  : "0";
  fill.style.background = pw.length ? c.bg   : "var(--danger)";
  hint.textContent      = pw.length ? c.text : "Enter a password";
});

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Events ───────────────────────────────────────────────────

// Delegated table actions
document.getElementById("usersTableBody").addEventListener("click", (e) => {
  const btn = e.target.closest(".action-btn");
  if (!btn) return;
  const { id, action } = btn.dataset;
  if (action === "view")   openProfileDrawer(id);
  if (action === "edit")   openEditModal(id);
  if (action === "toggle") toggleUserStatus(id, btn.dataset.active === "true");
});

// Row click → open profile
document.getElementById("usersTableBody").addEventListener("click", (e) => {
  if (e.target.closest(".action-btn")) return; // handled above
  const row = e.target.closest("tr[data-id]");
  if (row) openProfileDrawer(row.dataset.id);
});

// Drawer close
document.getElementById("drawerClose").addEventListener("click", closeDrawer);
document.getElementById("drawerOverlay").addEventListener("click", closeDrawer);

// Sidebar user pill → open own profile
document.getElementById("sidebarUserPill")?.addEventListener("click", () => {
  if (_currentUser) openProfileDrawer(_currentUser.id);
});

// Create user button
document.getElementById("createUserBtn").addEventListener("click", openCreateModal);

// Save button
document.getElementById("saveBtn").addEventListener("click", saveUser);

// Search + filters (client-side, no API calls)
const reRender = debounce(() => renderUsers(), 200);
document.getElementById("searchInput").addEventListener("input", reRender);
document.getElementById("roleFilter").addEventListener("change",   renderUsers);
document.getElementById("statusFilter").addEventListener("change", renderUsers);

// Refresh
document.getElementById("refreshBtn").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("roleFilter").value   = "";
  document.getElementById("statusFilter").value = "";
  loadUsers();
});

// Logout
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  sessionStorage.clear();
  window.location.href = "./login.html";
});

// ── Init ─────────────────────────────────────────────────────
Promise.all([loadProfile(), loadWarehouses(), loadUsers()]);