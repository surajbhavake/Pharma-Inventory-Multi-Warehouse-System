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

        const results =
            data.results || data;

        document.getElementById(
            "batchCount"
        ).innerText =
            results.length;

        const batchSelect =
            document.getElementById(
                "batchSelect"
            );

        batchSelect.innerHTML = `

            <option value="">
                Select Batch
            </option>
        `;

        results.forEach(batch => {

            batchSelect.innerHTML += `

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

        const results =
            data.results || data;

        document.getElementById(
            "warehouseCount"
        ).innerText =
            results.length;

        const sourceSelect =
            document.getElementById(
                "sourceWarehouse"
            );

        const destinationSelect =
            document.getElementById(
                "destinationWarehouse"
            );

        sourceSelect.innerHTML = `

            <option value="">
                Select Source
            </option>
        `;

        destinationSelect.innerHTML = `

            <option value="">
                Select Destination
            </option>
        `;

        results.forEach(warehouse => {

            const option = `

                <option value="${warehouse.id}">

                    ${warehouse.name}
                    (${warehouse.code})

                </option>
            `;

            sourceSelect.innerHTML += option;

            destinationSelect.innerHTML += option;
        });

    } catch (error) {

        console.error(error);

        alert(
            "Failed to load warehouses"
        );
    }
}


// =====================================================
// LOAD TRANSFERS
// =====================================================

async function loadTransfers() {

    try {

        const search =
            document.getElementById(
                "searchInput"
            ).value
            .toLowerCase();

        const response =
            await apiFetch(
                `${API_BASE}/movements/`
            );

        const data =
            await response.json();

        console.log(
            "MOVEMENTS:",
            data
        );

        const results =
            data.results || data;

        const tbody =
            document.getElementById(
                "transferTableBody"
            );

        tbody.innerHTML = "";

        let transfers =
            results.filter(movement => {

                return (

                    movement.movement_type ===
                        "TRANSFER_IN"

                    ||

                    movement.movement_type ===
                        "TRANSFER_OUT"
                );
            });


        if (search) {

            transfers =
                transfers.filter(movement => {

                    return (

                        movement.batch_number
                            ?.toLowerCase()
                            .includes(search)

                        ||

                        movement.warehouse_name
                            ?.toLowerCase()
                            .includes(search)

                        ||

                        movement.reference_id
                            ?.toLowerCase()
                            .includes(search)
                    );
                });
        }


        document.getElementById(
            "transferCount"
        ).innerText =
            transfers.length;


        if (transfers.length === 0) {

            tbody.innerHTML = `

                <tr>

                    <td colspan="7"
                        class="text-center">

                        No transfers found

                    </td>

                </tr>
            `;

            return;
        }


        transfers.forEach(movement => {

            const badge =
                movement.movement_type ===
                "TRANSFER_IN"

                    ? `
                        <span class="badge bg-success">
                            IN
                        </span>
                    `

                    : `
                        <span class="badge bg-danger">
                            OUT
                        </span>
                    `;

            tbody.innerHTML += `

                <tr>

                    <td>

                        <small>

                            ${movement.reference_id || "-"}

                        </small>

                    </td>

                    <td>

                        ${movement.batch_number || "-"}

                    </td>

                    <td>

                        ${movement.warehouse_name || "-"}

                    </td>

                    <td>

                        ${badge}

                    </td>

                    <td>

                        ${movement.quantity}

                    </td>

                    <td>

                        ${
                            movement.performed_by_name
                            || "-"
                        }

                    </td>

                    <td>

                        ${new Date(
                            movement.performed_at
                        ).toLocaleString()}

                    </td>

                </tr>
            `;
        });

    } catch (error) {

        console.error(error);

        alert(
            "Failed to load transfers"
        );
    }
}


// =====================================================
// TRANSFER STOCK
// =====================================================

document
.getElementById("transferForm")
.addEventListener(
    "submit",
    async function (e) {

        e.preventDefault();

        try {

            const batch =
                document.getElementById(
                    "batchSelect"
                ).value;

            const source =
                document.getElementById(
                    "sourceWarehouse"
                ).value;

            const destination =
                document.getElementById(
                    "destinationWarehouse"
                ).value;

            const quantity =
                parseInt(
                    document.getElementById(
                        "quantityInput"
                    ).value
                );

            const notes =
                document.getElementById(
                    "notesInput"
                ).value;


            // VALIDATION

            if (
                !batch ||
                !source ||
                !destination ||
                !quantity
            ) {

                alert(
                    "Please fill all fields"
                );

                return;
            }


            if (source === destination) {

                alert(
                    "Source and destination cannot be same"
                );

                return;
            }


            const payload = {

                batch_id: batch,

                source_warehouse_id:
                    source,

                destination_warehouse_id:
                    destination,

                quantity,

                notes
            };

            console.log(
                "TRANSFER PAYLOAD:",
                payload
            );


            const response =
                await apiFetch(

                    `${API_BASE}/stock/transfer/`,

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
                "TRANSFER RESPONSE:",
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
                "Stock transferred successfully"
            );

            document
                .getElementById(
                    "transferForm"
                )
                .reset();

            loadTransfers();

        } catch (error) {

            console.error(error);

            alert(
                "Transfer failed"
            );
        }
    }
);


// =====================================================
// SEARCH
// =====================================================

document
.getElementById("searchInput")
.addEventListener("keyup", () => {

    loadTransfers();
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

loadTransfers();