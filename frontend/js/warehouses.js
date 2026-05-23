const API_BASE = "http://127.0.0.1:8000/api/v1";

const token = sessionStorage.getItem("access");

if (!token) {

    window.location.href = "./login.html";
}


// =====================================================
// AUTH FETCH
// =====================================================

async function apiFetch(url, options = {}) {

    const response = await fetch(url, {

        ...options,

        headers: {

            Authorization: `Bearer ${token}`,

            "Content-Type": "application/json",

            ...(options.headers || {})
        }
    });

    if (response.status === 401) {

        sessionStorage.clear();

        alert("Session expired");

        window.location.href = "./login.html";

        return;
    }

    return response;
}


// =====================================================
// LOAD MANAGERS
// =====================================================

async function loadManagers() {

    try {

        const response = await apiFetch(
            `${API_BASE}/users/`
        );

        const data = await response.json();

        console.log("USERS:", data);

        const users =
            data.results || data;

        const managerSelect =
            document.getElementById(
                "manager"
            );

        managerSelect.innerHTML = `

            <option value="">
                Select Manager
            </option>
        `;

        users.forEach(user => {

            if (
                user.role === "manager" ||
                user.role === "warehouse_manager"
            ) {

                managerSelect.innerHTML += `

                    <option value="${user.id}">

                        ${user.full_name}

                    </option>
                `;
            }
        });

    } catch (error) {

        console.error(error);

        alert("Failed to load managers");
    }
}


// =====================================================
// LOAD WAREHOUSES
// =====================================================

async function loadWarehouses() {

    try {

        const search =
            document.getElementById(
                "searchInput"
            ).value;

        const response = await apiFetch(

            `${API_BASE}/warehouses/?search=${search}`
        );

        const data = await response.json();

        console.log("WAREHOUSES:", data);

        const warehouses =
            data.results || data;

        const tableBody =
            document.getElementById(
                "warehouseTableBody"
            );

        tableBody.innerHTML = "";

        if (warehouses.length === 0) {

            tableBody.innerHTML = `

                <tr>

                    <td colspan="8" class="text-center">

                        No warehouses found

                    </td>

                </tr>
            `;

            return;
        }

        warehouses.forEach(warehouse => {

            tableBody.innerHTML += `

                <tr>

                    <td>

                        <strong>
                            ${warehouse.name}
                        </strong>

                    </td>

                    <td>

                        ${warehouse.code}

                    </td>

                    <td>

                        ${warehouse.city}

                    </td>

                    <td>

                        ${warehouse.state}

                    </td>

                    <td>

                        ${warehouse.pincode || "-"}

                    </td>

                    <td>

                        ${warehouse.phone || "-"}

                    </td>

                    <td>

                        ${
                            warehouse.manager_name ||
                            "No Manager"
                        }

                    </td>

                    <td>

                        <div class="d-flex gap-2">

                            <button
                                class="btn btn-warning btn-sm"
                                onclick="editWarehouse('${warehouse.id}')"
                            >

                                Edit

                            </button>

                            <button
                                class="btn btn-danger btn-sm"
                                onclick="deleteWarehouse('${warehouse.id}')"
                            >

                                Delete

                            </button>

                        </div>

                    </td>

                </tr>
            `;
        });

    } catch (error) {

        console.error(error);

        alert("Failed to load warehouses");
    }
}


// =====================================================
// SAVE WAREHOUSE
// =====================================================

document
.getElementById("warehouseForm")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    try {

        const warehouseId =
            document.getElementById(
                "warehouseId"
            ).value;

        const payload = {

            name:
                document.getElementById(
                    "name"
                ).value,

            code:
                document.getElementById(
                    "code"
                ).value,

            city:
                document.getElementById(
                    "city"
                ).value,

            state:
                document.getElementById(
                    "state"
                ).value,

            pincode:
                document.getElementById(
                    "pincode"
                ).value,

            phone:
                document.getElementById(
                    "phone"
                ).value,

            address:
                document.getElementById(
                    "address"
                ).value,

            manager:
                document.getElementById(
                    "manager"
                ).value || null
        };

        console.log("PAYLOAD:", payload);

        let response;

        if (warehouseId) {

            response = await apiFetch(

                `${API_BASE}/warehouses/${warehouseId}/`,

                {
                    method: "PUT",

                    body: JSON.stringify(payload)
                }
            );

        } else {

            response = await apiFetch(

                `${API_BASE}/warehouses/`,

                {
                    method: "POST",

                    body: JSON.stringify(payload)
                }
            );
        }

        const data = await response.json();

        console.log("RESPONSE:", data);

        if (!response.ok) {

            alert(JSON.stringify(data));

            return;
        }

        alert("Warehouse saved successfully");

        bootstrap.Modal
            .getInstance(
                document.getElementById(
                    "warehouseModal"
                )
            )
            .hide();

        resetForm();

        loadWarehouses();

    } catch (error) {

        console.error(error);

        alert("Failed to save warehouse");
    }
});


// =====================================================
// EDIT WAREHOUSE
// =====================================================

async function editWarehouse(id) {

    try {

        const response = await apiFetch(

            `${API_BASE}/warehouses/${id}/`
        );

        const warehouse = await response.json();

        console.log("EDIT:", warehouse);

        document.getElementById(
            "warehouseId"
        ).value = warehouse.id;

        document.getElementById(
            "name"
        ).value = warehouse.name;

        document.getElementById(
            "code"
        ).value = warehouse.code;

        document.getElementById(
            "city"
        ).value = warehouse.city;

        document.getElementById(
            "state"
        ).value = warehouse.state;

        document.getElementById(
            "pincode"
        ).value = warehouse.pincode || "";

        document.getElementById(
            "phone"
        ).value = warehouse.phone || "";

        document.getElementById(
            "address"
        ).value = warehouse.address;

        document.getElementById(
            "manager"
        ).value = warehouse.manager || "";

        new bootstrap.Modal(
            document.getElementById(
                "warehouseModal"
            )
        ).show();

    } catch (error) {

        console.error(error);

        alert("Failed to load warehouse");
    }
}


// =====================================================
// DELETE WAREHOUSE
// =====================================================

async function deleteWarehouse(id) {

    if (!confirm("Delete this warehouse?")) {

        return;
    }

    try {

        const response = await apiFetch(

            `${API_BASE}/warehouses/${id}/`,

            {
                method: "DELETE"
            }
        );

        if (!response.ok) {

            alert("Delete failed");

            return;
        }

        alert("Warehouse deleted");

        loadWarehouses();

    } catch (error) {

        console.error(error);

        alert("Delete failed");
    }
}


// =====================================================
// SEARCH
// =====================================================

document
.getElementById("searchInput")
.addEventListener("keyup", () => {

    loadWarehouses();
});


// =====================================================
// RESET FORM
// =====================================================

function resetForm() {

    document.getElementById(
        "warehouseForm"
    ).reset();

    document.getElementById(
        "warehouseId"
    ).value = "";
}


// =====================================================
// INIT
// =====================================================

loadManagers();

loadWarehouses();