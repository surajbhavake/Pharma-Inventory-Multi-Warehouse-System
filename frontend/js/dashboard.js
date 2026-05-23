const API_BASE = "http://127.0.0.1:8000/api/v1";

const token = sessionStorage.getItem("access");

if (!token) {

    window.location.href = "./login.html";
}


// ======================================================
// AUTH FETCH
// ======================================================

async function apiFetch(url) {

    const response = await fetch(url, {

        headers: {

            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        }

    });

    if (response.status === 401) {

        sessionStorage.clear();

        alert("Session expired");

        window.location.href = "./login.html";

        return;
    }

    if (!response.ok) {

        const text = await response.text();

        console.error("API ERROR:", text);

        throw new Error(text);
    }

    return response.json();
}


// ======================================================
// LOAD PROFILE
// ======================================================

async function loadProfile() {

    try {

        const user = await apiFetch(
            `${API_BASE}/auth/profile/`
        );

        console.log("PROFILE:", user);

        document.getElementById(
            "welcomeText"
        ).innerHTML = `
            Welcome back,
            <strong>${user.full_name}</strong>
            (${user.role})
        `;

    } catch (error) {

        console.error("PROFILE ERROR:", error);
    }
}


// ======================================================
// LOAD KPI COUNTS
// ======================================================

async function loadCounts() {

    try {

        const medicines = await apiFetch(
            `${API_BASE}/medicines/`
        );

        const batches = await apiFetch(
            `${API_BASE}/batches/`
        );

        const warehouses = await apiFetch(
            `${API_BASE}/warehouses/`
        );

        const recalls = await apiFetch(
            `${API_BASE}/recalls/`
        );

        console.log("MEDICINES:", medicines);
        console.log("BATCHES:", batches);
        console.log("WAREHOUSES:", warehouses);
        console.log("RECALLS:", recalls);

        document.getElementById(
            "medicineCount"
        ).innerText =
            medicines.count ||
            medicines.results?.length ||
            medicines.length ||
            0;

        document.getElementById(
            "batchCount"
        ).innerText =
            batches.count ||
            batches.results?.length ||
            batches.length ||
            0;

        document.getElementById(
            "warehouseCount"
        ).innerText =
            warehouses.count ||
            warehouses.results?.length ||
            warehouses.length ||
            0;

        document.getElementById(
            "recallCount"
        ).innerText =
            recalls.count ||
            recalls.results?.length ||
            recalls.length ||
            0;

    } catch (error) {

        console.error("COUNT ERROR:", error);
    }
}


// ======================================================
// STOCK DISTRIBUTION CHART
// ======================================================

async function loadStockChart() {

    try {

        const response = await apiFetch(
            `${API_BASE}/warehouse-stock/`
        );

        console.log("WAREHOUSE STOCK:", response);

        const stocks =
            response.results || response;

        const warehouseTotals = {};

        stocks.forEach(stock => {

            const warehouse =
                stock.warehouse?.name ||
                "Unknown";

            const quantity =
                stock.quantity || 0;

            if (!warehouseTotals[warehouse]) {

                warehouseTotals[warehouse] = 0;
            }

            warehouseTotals[warehouse] += quantity;
        });

        const ctx =
            document.getElementById(
                "stockChart"
            );

        new Chart(ctx, {

            type: "doughnut",

            data: {

                labels:
                    Object.keys(warehouseTotals),

                datasets: [{

                    label: "Stock",

                    data:
                        Object.values(
                            warehouseTotals
                        ),

                    borderWidth: 2,

                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,
            }
        });

    } catch (error) {

        console.error(
            "STOCK CHART ERROR:",
            error
        );
    }
}


// ======================================================
// BATCH ANALYTICS CHART
// ======================================================

async function loadBatchChart() {

    try {

        const response = await apiFetch(
            `${API_BASE}/batches/`
        );

        console.log("BATCHES:", response);

        const batches =
            response.results || response;

        let active = 0;
        let recalled = 0;
        let expired = 0;

        const today = new Date();

        batches.forEach(batch => {

            if (batch.is_recalled) {

                recalled++;

            } else {

                const expiry =
                    new Date(batch.expiry_date);

                if (expiry < today) {

                    expired++;

                } else {

                    active++;
                }
            }
        });

        const ctx =
            document.getElementById(
                "batchChart"
            );

        new Chart(ctx, {

            type: "bar",

            data: {

                labels: [
                    "Active",
                    "Recalled",
                    "Expired"
                ],

                datasets: [{

                    label: "Batches",

                    data: [
                        active,
                        recalled,
                        expired
                    ],

                    borderWidth: 1,
                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,
            }
        });

    } catch (error) {

        console.error(
            "BATCH CHART ERROR:",
            error
        );
    }
}


// ======================================================
// LOW STOCK
// ======================================================

async function loadLowStock() {

    try {

        const response = await apiFetch(
            `${API_BASE}/alerts/low-stock/`
        );

        console.log("LOW STOCK:", response);

        const medicines =
            response.results || response;

        const list =
            document.getElementById(
                "lowStockList"
            );

        list.innerHTML = "";

        if (medicines.length === 0) {

            list.innerHTML = `
                <li class="list-group-item">
                    No low stock alerts
                </li>
            `;

            return;
        }

        medicines.forEach(item => {

            list.innerHTML += `

                <li class="list-group-item d-flex justify-content-between align-items-center">

                    <div>

                        <strong>
                            ${item.name}
                        </strong>

                    </div>

                    <span class="badge bg-danger">
                        LOW
                    </span>

                </li>
            `;
        });

    } catch (error) {

        console.error(
            "LOW STOCK ERROR:",
            error
        );
    }
}


// ======================================================
// EXPIRING BATCHES
// ======================================================

async function loadExpiringBatches() {

    try {

        const response = await apiFetch(
            `${API_BASE}/batches/expiring_soon/`
        );

        console.log("EXPIRING:", response);

        const batches =
            response.batches || [];

        const list =
            document.getElementById(
                "expiryList"
            );

        list.innerHTML = "";

        if (batches.length === 0) {

            list.innerHTML = `
                <li class="list-group-item">
                    No expiring batches
                </li>
            `;

            return;
        }

        batches.forEach(batch => {

            list.innerHTML += `

                <li class="list-group-item">

                    <div class="d-flex justify-content-between">

                        <div>

                            <strong>
                                ${batch.batch_number}
                            </strong>

                            <div class="small text-muted">

                                ${batch.medicine_name}

                            </div>

                        </div>

                        <span class="badge bg-warning text-dark">

                            ${batch.expiry_date}

                        </span>

                    </div>

                </li>
            `;
        });

    } catch (error) {

        console.error(
            "EXPIRY ERROR:",
            error
        );
    }
}


// ======================================================
// RECENT AUDIT LOGS
// ======================================================

async function loadAuditLogs() {

    try {

        const response = await apiFetch(
            `${API_BASE}/audit-logs/`
        );

        console.log("AUDIT LOGS:", response);

        const logs =
            response.results || response;

        const table =
            document.getElementById(
                "recentActivityTable"
            );

        table.innerHTML = "";

        if (logs.length === 0) {

            table.innerHTML = `

                <tr>

                    <td colspan="5">
                        No audit logs found
                    </td>

                </tr>
            `;

            return;
        }

        logs.slice(0, 10).forEach(log => {

            table.innerHTML += `

                <tr>

                    <td>
                        ${log.action || "-"}
                    </td>

                    <td>
                        ${log.user_name  || "-"}
                    </td>

                    <td>
                        ${log.entity_type || "-"}
                    </td>

                    <td>
                        ${log.description || "-"}
                    </td>

                    <td>
                        ${new Date(
                            log.created_at
                        ).toLocaleString()}
                    </td>

                </tr>
            `;
        });

    } catch (error) {

        console.error(
            "AUDIT ERROR:",
            error
        );
    }
}


// ======================================================
// INITIALIZE DASHBOARD
// ======================================================

async function initDashboard() {

    await loadProfile();

    await loadCounts();

    await loadStockChart();

    await loadBatchChart();

    await loadLowStock();

    await loadExpiringBatches();

    await loadAuditLogs();
}


initDashboard();