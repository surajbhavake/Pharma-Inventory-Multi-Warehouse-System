// ═══════════════════════════════════════════════════════
// PHARMA ERP — sidebar.js  (optimised)
// ═══════════════════════════════════════════════════════

const API_BASE = "http://127.0.0.1:8000/api/v1";

// ── Auth guard ────────────────────────────────────────────
const token = sessionStorage.getItem("access");
if (!token) window.location.href = "./login.html";


// ── Inject sidebar HTML, then boot ───────────────────────
async function loadSidebar() {
  const container = document.getElementById("sidebar-container");
  if (!container) return;

  try {
    const res  = await fetch("./components/sidebar.html");
    if (!res.ok) throw new Error(`Sidebar fetch failed: ${res.status}`);
    container.innerHTML = await res.text();
  } catch (err) {
    console.error("Sidebar load error:", err);
    return;
  }

  // Run all init tasks in parallel — one failure won't block others
  await Promise.allSettled([
    loadProfile(),
    loadRecallBadge(),
  ]);

  highlightCurrentPage();
  setupLogout();
}


// ── Profile ───────────────────────────────────────────────
async function loadProfile() {
  try {
    const res = await fetch(`${API_BASE}/auth/profile/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) return handleExpiredSession();
    if (!res.ok) throw new Error(await res.text());

    const user = await res.json();

    // Populate sidebar footer
    setText("sbName",   user.full_name ?? "—");
    setText("sbRole",   user.role      ?? "—");

    const avatar = document.getElementById("sbAvatar");
    if (avatar) avatar.textContent = (user.full_name?.[0] ?? "?").toUpperCase();

    // Show admin-only elements
    if (user.role === "admin") {
      document.querySelectorAll(".admin-only").forEach(el => {
        el.style.display = "";
      });
    }

  } catch (err) {
    console.error("Profile error:", err);
  }
}


// ── Recall badge (shows count if > 0) ────────────────────
async function loadRecallBadge() {
  try {
    const res = await fetch(`${API_BASE}/recalls/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;

    const data  = await res.json();
    const count = data?.count ?? data?.results?.length ?? (Array.isArray(data) ? data.length : 0);

    const badge = document.getElementById("recallBadge");
    if (badge && count > 0) {
      badge.textContent = count > 99 ? "99+" : count;
      badge.style.display = "inline-flex";
    }
  } catch (_) { /* non-critical */ }
}


// ── Active page highlight ─────────────────────────────────
function highlightCurrentPage() {
  // Derive page key from filename: "batches.html" → "batches"
  const page = window.location.pathname.split("/").pop().replace(".html", "");

  document.querySelectorAll(".sb-link").forEach(link => {
    const key = link.dataset.page ?? "";
    // Use startsWith so "dashboard" matches "dashboard" exactly,
    // avoiding "stock-allocation" accidentally matching "allocation" etc.
    if (page === key || page.startsWith(key) && key.length > 3) {
      link.classList.add("active");
    }
  });
}


// ── Logout ────────────────────────────────────────────────
function setupLogout() {
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "./login.html";
  });
}


// ── Session expiry helper ─────────────────────────────────
function handleExpiredSession() {
  sessionStorage.clear();
  alert("Session expired. Please log in again.");
  window.location.href = "./login.html";
}


// ── Utility ───────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}


// ── Boot ──────────────────────────────────────────────────
loadSidebar();