const API_BASE = "http://127.0.0.1:8000/api/v1";

const token = sessionStorage.getItem("access");

if (!token) {
    window.location.href = "./login.html";
}

const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
};

// ======================================================
// LOAD PROFILE
// ======================================================

async function loadProfile() {

    try {

        const response = await fetch(
            `${API_BASE}/auth/profile/`,
            {
                headers
            }
        );

        const user = await response.json();

        document.getElementById(
            "welcomeText"
        ).innerHTML =
            `Welcome ${user.full_name || user.username} (${user.role})`;

    } catch (error) {

        console.error(error);
    }
}

// ======================================================
// LOAD WAREHOUSES
// ======================================================

async function loadWarehouses() {

    try {

        const response = await fetch(
            `${API_BASE}/warehouses/`,
            {
                headers
            }
        );

        const data = await response.json();

        const warehouses =
            data.results || data;

        const select =
            document.getElementById(
                "assigned_warehouse"
            );

        select.innerHTML = `
            <option value="">
                Select Warehouse
            </option>
        `;

        warehouses.forEach(warehouse => {

            select.innerHTML += `
                <option value="${warehouse.id}">
                    ${warehouse.name}
                </option>
            `;
        });

    } catch (error) {

        console.error(error);

        alert(
            "Failed to load warehouses"
        );
    }
}

// ======================================================
// LOAD USERS
// ======================================================

let allUsers = [];

async function loadUsers() {

    try {

        const response = await fetch(
            `${API_BASE}/users/`,
            {
                headers
            }
        );

        const data = await response.json();

        allUsers =
            data.results || data;

        renderUsers(allUsers);

        updateStats(allUsers);

    } catch (error) {

        console.error(error);

        alert(
            "Failed to load users"
        );
    }
}

// ======================================================
// RENDER USERS
// ======================================================

function renderUsers(users) {

    const tbody =
        document.getElementById(
            "userTableBody"
        );

    tbody.innerHTML = "";

    if (!users.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    No users found
                </td>
            </tr>
        `;

        return;
    }

    users.forEach(user => {

        tbody.innerHTML += `
            <tr>

                <td>
                    ${user.full_name || "-"}
                </td>

                <td>
                    ${user.email}
                </td>

                <td>
                    ${user.username}
                </td>

                <td>
                    <span class="badge bg-primary">
                        ${user.role}
                    </span>
                </td>

                <td>
                    ${user.warehouse_name || "-"}
                </td>

                <td>
                    ${
                        user.is_active
                        ? '<span class="badge bg-success">Active</span>'
                        : '<span class="badge bg-danger">Inactive</span>'
                    }
                </td>

                <td>
                    ${
                        user.date_joined
                        ? new Date(
                            user.date_joined
                        ).toLocaleDateString()
                        : "-"
                    }
                </td>

            </tr>
        `;
    });
}

// ======================================================
// UPDATE CARDS
// ======================================================

function updateStats(users) {

    document.getElementById(
        "totalUsers"
    ).textContent = users.length;

    document.getElementById(
        "adminCount"
    ).textContent =
        users.filter(
            u => u.role === "admin"
        ).length;

    document.getElementById(
        "managerCount"
    ).textContent =
        users.filter(
            u => u.role === "warehouse_manager"
        ).length;

    document.getElementById(
        "auditorCount"
    ).textContent =
        users.filter(
            u => u.role === "auditor"
        ).length;
}

// ======================================================
// SEARCH
// ======================================================

document
.getElementById("searchInput")
.addEventListener(
    "keyup",
    function () {

        const keyword =
            this.value.toLowerCase();

        const filtered =
            allUsers.filter(user => {

                return (
                    (user.full_name || "")
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    (user.email || "")
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    (user.username || "")
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    (user.role || "")
                        .toLowerCase()
                        .includes(keyword)
                );
            });

        renderUsers(filtered);
    }
);

// ======================================================
// CREATE USER
// ======================================================

document
.getElementById("userForm")
.addEventListener(
    "submit",
    async function (e) {

        e.preventDefault();

        const payload = {

            first_name:
                document.getElementById(
                    "first_name"
                ).value,

            last_name:
                document.getElementById(
                    "last_name"
                ).value,

            email:
                document.getElementById(
                    "email"
                ).value,

            username:
                document.getElementById(
                    "username"
                ).value,

            password:
                document.getElementById(
                    "password"
                ).value,

            password_confirm:
                document.getElementById(
                    "password_confirm"
                ).value,

            role:
                document.getElementById(
                    "role"
                ).value,

            assigned_warehouse:
                document.getElementById(
                    "assigned_warehouse"
                ).value || null
        };

        console.log(
            "USER PAYLOAD:",
            payload
        );

        try {

            const response =
                await fetch(
                    `${API_BASE}/users/`,
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify(
                            payload
                        )
                    }
                );

            const data =
                await response.json();

            console.log(data);

            if (!response.ok) {

                alert(
                    JSON.stringify(
                        data,
                        null,
                        2
                    )
                );

                return;
            }

            alert(
                "User created successfully"
            );

            document
                .getElementById(
                    "userForm"
                )
                .reset();

            const modal =
                bootstrap.Modal.getInstance(
                    document.getElementById(
                        "userModal"
                    )
                );

            modal.hide();

            loadUsers();

        } catch (error) {

            console.error(error);

            alert(
                "Failed to create user"
            );
        }
    }
);

// ======================================================
// LOGOUT
// ======================================================

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

// ======================================================
// INITIAL LOAD
// ======================================================

loadProfile();

loadWarehouses();

loadUsers();