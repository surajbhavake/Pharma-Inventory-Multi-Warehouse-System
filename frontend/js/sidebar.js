const token = sessionStorage.getItem("access");

if (!token) {

    window.location.href = "./login.html";
}


// ======================================================
// LOAD SIDEBAR
// ======================================================

async function loadSidebar() {

    const sidebarContainer =
        document.getElementById("sidebar-container");

    const response = await fetch(
        "./components/sidebar.html"
    );

    const html = await response.text();

    sidebarContainer.innerHTML = html;

    initializeSidebar();
}


// ======================================================
// INITIALIZE
// ======================================================

async function initializeSidebar() {

    await loadProfile();

    highlightCurrentPage();

    setupLogout();
}


// ======================================================
// LOAD USER PROFILE
// ======================================================

async function loadProfile() {

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/api/v1/auth/profile/",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const user = await response.json();

        console.log("USER:", user);

        // Hide admin links
        if (user.role !== "admin") {

            document
                .querySelectorAll(".admin-only")
                .forEach(el => {
                    el.style.display = "none";
                });
        }

    } catch (error) {

        console.error(error);
    }
}


// ======================================================
// ACTIVE PAGE HIGHLIGHT
// ======================================================

function highlightCurrentPage() {

    const path =
        window.location.pathname;

    const page =
        path.split("/").pop().replace(".html", "");

    document
        .querySelectorAll(".sidebar-link")
        .forEach(link => {

            const linkPage =
                link.dataset.page;

            if (
                page.includes(linkPage)
            ) {

                link.classList.add(
                    "active-sidebar"
                );
            }
        });
}


// ======================================================
// LOGOUT
// ======================================================

function setupLogout() {

    document
        .getElementById("logoutBtn")
        .addEventListener("click", () => {

            sessionStorage.clear();

            window.location.href =
                "./login.html";
        });
}


loadSidebar();