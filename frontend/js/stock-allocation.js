const API_BASE =
    "http://127.0.0.1:8000/api/v1";

const token =
    sessionStorage.getItem("access");


// =====================================================
// AUTH CHECK
// =====================================================

if (!token) {

    window.location.href =
        "./login.html";
}


// =====================================================
// COMMON HEADERS
// =====================================================

const headers = {

    "Content-Type": "application/json",

    Authorization:
        `Bearer ${token}`,
};


// =====================================================
// API FETCH WRAPPER
// =====================================================

async function apiFetch(
    url,
    options = {}
) {

    const response =
        await fetch(url, {

            ...options,

            headers: {

                ...headers,

                ...(options.headers || {})
            }
        });

    if (response.status === 401) {

        sessionStorage.clear();

        alert("Session expired");

        window.location.href =
            "./login.html";

        return;
    }

    return response;
}


// =====================================================
// LOAD PROFILE
// =====================================================

async function loadProfile() {

    try {

        const response =
            await apiFetch(
                `${API_BASE}/auth/profile/`
            );

        const user =
            await response.json();

        document.getElementById(
            "welcomeText"
        ).innerHTML = `

            Welcome
            <strong>
                ${user.full_name}
            </strong>

            (${user.role})

        `;

    } catch (error) {

        console.error(error);
    }
}


// =====================================================
// LOAD BATCHES
// =====================================================

async function loadBatches() {

    try {

        const response =
            await apiFetch(
                `${API_BASE}/batches/`
            );

        const data =
            await response.json();

        const batches =
            data.results || data;

        const select =
            document.getElementById(
                "batchSelect"
            );

        select.innerHTML = `

            <option value="">
                Select Batch
            </option>
        `;

        batches.forEach(batch => {

            select.innerHTML += `

                <option value="${batch.id}">

                    ${batch.batch_number}
                    -
                    ${batch.medicine_name}

                </option>
            `;
        });

    } catch (error) {

        console.error(error);

        alert(
            "Failed to load batches"
        );
    }
}


// =====================================================
// LOAD WAREHOUSES
// =====================================================

async function loadWarehouses() {

    try {

        const response =
            await apiFetch(
                `${API_BASE}/warehouses/`
            );

        const data =
            await response.json();

        const warehouses =
            data.results || data;

        const select =
            document.getElementById(
                "warehouseSelect"
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
                    (${warehouse.code})

                </option>
            `;
        });

        document.getElementById(
            "warehouseCount"
        ).innerText =
            warehouses.length;

    } catch (error) {

        console.error(error);

        alert(
            "Failed to load warehouses"
        );
    }
}


// =====================================================
// LOAD ALLOCATIONS
// =====================================================

async function loadAllocations() {

    try {

        const search =
            document.getElementById(
                "searchInput"
            ).value
            .toLowerCase();

        const response =
            await apiFetch(
                `${API_BASE}/warehouse-stock/`
            );

        const data =
            await response.json();

        console.log(
            "ALLOCATIONS:",
            data
        );

        const allocations =
            data.results || data;

        const tbody =
            document.getElementById(
                "allocationTableBody"
            );

        tbody.innerHTML = "";

        let totalStock = 0;

        let filtered =
            allocations.filter(stock => {

                return (

                    stock.warehouse_name
                        ?.toLowerCase()
                        .includes(search)

                    ||

                    stock.batch_number
                        ?.toLowerCase()
                        .includes(search)

                    ||

                    stock.medicine_name
                        ?.toLowerCase()
                        .includes(search)
                );
            });


        document.getElementById(
            "allocationCount"
        ).innerText =
            filtered.length;


        if (filtered.length === 0) {

            tbody.innerHTML = `

                <tr>

                    <td colspan="5"
                        class="text-center">

                        No allocations found

                    </td>

                </tr>
            `;

            return;
        }


        filtered.forEach(stock => {

            totalStock +=
                stock.quantity;

            const statusBadge =
                stock.quantity <= 10

                    ? `
                        <span class="badge bg-danger">
                            Low Stock
                        </span>
                    `

                    : `
                        <span class="badge bg-success">
                            Healthy
                        </span>
                    `;

            tbody.innerHTML += `

                <tr>

                    <td>

                        <strong>

                            ${stock.warehouse_name}

                        </strong>

                    </td>

                    <td>

                        ${stock.batch_number}

                    </td>

                    <td>

                        ${stock.medicine_name}

                    </td>

                    <td>

                        ${stock.quantity}

                    </td>

                    <td>

                        ${statusBadge}

                    </td>

                </tr>
            `;
        });

        document.getElementById(
            "stockCount"
        ).innerText =
            totalStock;

    } catch (error) {

        console.error(error);

        alert(
            "Failed to load stock allocations"
        );
    }
}


// =====================================================
// CREATE STOCK ALLOCATION
// =====================================================

document
.getElementById("allocationForm")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    try {

        const batch_id =
            document.getElementById(
                "batchSelect"
            ).value;

        const warehouse_id =
            document.getElementById(
                "warehouseSelect"
            ).value;

        const quantity =
            parseInt(
                document.getElementById(
                    "quantityInput"
                ).value
            );

        if (
            !batch_id ||
            !warehouse_id ||
            !quantity
        ) {

            alert(
                "Please fill all fields"
            );

            return;
        }

        const payload = {

            batch_id,

            warehouse_id,

            quantity
        };

        console.log(
            "PAYLOAD:",
            payload
        );

        const response =
            await apiFetch(

                `${API_BASE}/stock-allocation/`,

                {
                    method: "POST",

                    body: JSON.stringify(
                        payload
                    )
                }
            );

        const data =
            await response.json();

        console.log(
            "RESPONSE:",
            data
        );

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
            "Stock allocated successfully"
        );

        document
            .getElementById(
                "allocationForm"
            )
            .reset();

        loadAllocations();

    } catch (error) {

        console.error(error);

        alert(
            "Allocation failed"
        );
    }
});


// =====================================================
// SEARCH
// =====================================================

document
.getElementById("searchInput")
.addEventListener("keyup", () => {

    loadAllocations();
});


// =====================================================
// LOGOUT
// =====================================================

document
.getElementById("logoutBtn")
.addEventListener("click", () => {

    sessionStorage.clear();

    window.location.href =
        "./login.html";
});


// =====================================================
// INITIAL LOAD
// =====================================================

loadProfile();

loadBatches();

loadWarehouses();

loadAllocations();