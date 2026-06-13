const API_BASE = "http://127.0.0.1:8000/api/v1";

const token = sessionStorage.getItem("access");

if (!token) {

    window.location.href = "./login.html";
}

const headers = {

    "Content-Type": "application/json",

    "Authorization": `Bearer ${token}`
};


// =====================================================
// LOAD PROFILE
// =====================================================

async function loadProfile() {

    try {

        const response = await fetch(
            `${API_BASE}/auth/profile/`,
            {
                headers
            }
        );

        if (!response.ok) {

            throw new Error(
                "Failed to load profile"
            );
        }

        const user = await response.json();

        console.log(
            "PROFILE:",
            user
        );

        // ===================================
        // PROFILE CARD
        // ===================================

        document.getElementById(
            "fullName"
        ).textContent =
            user.full_name ||
            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
            user.username;

        document.getElementById(
            "email"
        ).textContent =
            user.email || "-";

        document.getElementById(
            "username"
        ).textContent =
            user.username || "-";

        document.getElementById(
            "firstName"
        ).textContent =
            user.first_name || "-";

        document.getElementById(
            "lastName"
        ).textContent =
            user.last_name || "-";

        document.getElementById(
            "role"
        ).textContent =
            user.role || "-";

        document.getElementById(
            "warehouse"
        ).textContent =
            user.warehouse_name ||
            "Not Assigned";

        document.getElementById(
            "joined"
        ).textContent =
            user.date_joined
                ? new Date(
                    user.date_joined
                  ).toLocaleString()
                : "-";

        document.getElementById(
            "lastLogin"
        ).textContent =
            user.last_login
                ? new Date(
                    user.last_login
                  ).toLocaleString()
                : "Never";

        document.getElementById(
            "status"
        ).innerHTML =
            user.is_active
                ? '<span class="badge bg-success">Active</span>'
                : '<span class="badge bg-danger">Inactive</span>';

        // ===================================
        // BADGES
        // ===================================

        document.getElementById(
            "roleBadge"
        ).textContent =
            user.role || "-";

        // ===================================
        // QUICK CARDS
        // ===================================

        document.getElementById(
            "roleCard"
        ).textContent =
            user.role || "-";

        document.getElementById(
            "warehouseCard"
        ).textContent =
            user.warehouse_name ||
            "-";

        document.getElementById(
            "statusCard"
        ).textContent =
            user.is_active
                ? "Active"
                : "Inactive";

    } catch (error) {

        console.error(error);

        alert(
            "Failed to load profile"
        );
    }
}


// =====================================================
// LOGOUT
// =====================================================

document
.getElementById("logoutBtn")
.addEventListener(
    "click",
    () => {

        sessionStorage.clear();

        window.location.href =
            "./login.html";
    }
);


// =====================================================
// INITIAL LOAD
// =====================================================

loadProfile();