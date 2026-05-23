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
// LOAD MEDICINES
// =====================================================

async function loadMedicinesDropdown() {

    try {

        const response = await apiFetch(
            `${API_BASE}/medicines/`
        );

        const data = await response.json();

        const medicines =
            data.results || data;

        const medicineSelect =
            document.getElementById(
                "medicine"
            );

        medicineSelect.innerHTML = "";

        medicines.forEach(medicine => {

            medicineSelect.innerHTML += `

                <option value="${medicine.id}">

                    ${medicine.name}

                </option>
            `;
        });

    } catch (error) {

        console.error(error);

        alert("Failed to load medicines");
    }
}


// =====================================================
// LOAD BATCHES
// =====================================================

async function loadBatches() {

    try {

        const search =
            document.getElementById(
                "searchInput"
            ).value;

        const recall =
            document.getElementById(
                "recallFilter"
            ).value;

        let url =
            `${API_BASE}/batches/?search=${search}`;

        if (recall !== "") {

            url += `&is_recalled=${recall}`;
        }

        const response = await apiFetch(url);

        const data = await response.json();

        console.log("BATCHES:", data);

        const batches =
            data.results || data;

        const tableBody =
            document.getElementById(
                "batchTableBody"
            );

        tableBody.innerHTML = "";

        if (batches.length === 0) {

            tableBody.innerHTML = `

                <tr>

                    <td colspan="7" class="text-center">

                        No batches found

                    </td>

                </tr>
            `;

            return;
        }

        batches.forEach(batch => {

            const statusBadge =
                batch.is_recalled
                    ? `
                        <span class="badge bg-danger">
                            Recalled
                        </span>
                    `
                    : `
                        <span class="badge bg-success">
                            Active
                        </span>
                    `;

            tableBody.innerHTML += `

                <tr>

                    <td>

                        <strong>
                            ${batch.batch_number}
                        </strong>

                    </td>

                    <td>

                        ${batch.medicine_name || "-"}

                    </td>

                    <td>

                        ${batch.manufacture_date}

                    </td>

                    <td>

                        ${batch.expiry_date}

                    </td>

                    <td>

                        ${batch.total_quantity}

                    </td>

                    <td>

                        ${statusBadge}

                    </td>

                    <td>

                        <div class="d-flex gap-2">

                            <button
                                class="btn btn-warning btn-sm"
                                onclick="editBatch('${batch.id}')"
                            >

                                Edit

                            </button>

                            <button
                                class="btn btn-danger btn-sm"
                                onclick="deleteBatch('${batch.id}')"
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

        alert("Failed to load batches");
    }
}


// =====================================================
// SAVE BATCH
// =====================================================

document
.getElementById("batchForm")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    try {

        const batchId =
            document.getElementById(
                "batchId"
            ).value;

        const payload = {

            medicine:
                document.getElementById(
                    "medicine"
                ).value,

            batch_number:
                document.getElementById(
                    "batch_number"
                ).value,

            manufacture_date:
                document.getElementById(
                    "manufacture_date"
                ).value,

            expiry_date:
                document.getElementById(
                    "expiry_date"
                ).value,

            total_quantity: parseInt(
                document.getElementById(
                    "total_quantity"
                ).value
            )
        };

        console.log("PAYLOAD:", payload);

        let response;

        if (batchId) {

            response = await apiFetch(

                `${API_BASE}/batches/${batchId}/`,

                {
                    method: "PUT",

                    body: JSON.stringify(payload)
                }
            );

        } else {

            response = await apiFetch(

                `${API_BASE}/batches/`,

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

        alert("Batch saved successfully");

        bootstrap.Modal
            .getInstance(
                document.getElementById(
                    "batchModal"
                )
            )
            .hide();

        resetForm();

        loadBatches();

    } catch (error) {

        console.error(error);

        alert("Failed to save batch");
    }
});


// =====================================================
// EDIT BATCH
// =====================================================

async function editBatch(id) {

    try {

        const response = await apiFetch(

            `${API_BASE}/batches/${id}/`
        );

        const batch = await response.json();

        console.log("EDIT BATCH:", batch);

        document.getElementById(
            "batchId"
        ).value = batch.id;

        document.getElementById(
            "medicine"
        ).value = batch.medicine;

        document.getElementById(
            "batch_number"
        ).value = batch.batch_number;

        document.getElementById(
            "manufacture_date"
        ).value = batch.manufacture_date;

        document.getElementById(
            "expiry_date"
        ).value = batch.expiry_date;

        document.getElementById(
            "total_quantity"
        ).value = batch.total_quantity;

        new bootstrap.Modal(
            document.getElementById(
                "batchModal"
            )
        ).show();

    } catch (error) {

        console.error(error);

        alert("Failed to load batch");
    }
}


// =====================================================
// DELETE BATCH
// =====================================================

async function deleteBatch(id) {

    if (!confirm("Delete this batch?")) {

        return;
    }

    try {

        const response = await apiFetch(

            `${API_BASE}/batches/${id}/`,

            {
                method: "DELETE"
            }
        );

        if (!response.ok) {

            const data = await response.json();

            alert(
                data.error ||
                "Delete failed"
            );

            return;
        }

        alert("Batch deleted");

        loadBatches();

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

    loadBatches();
});


// =====================================================
// FILTER
// =====================================================

document
.getElementById("recallFilter")
.addEventListener("change", () => {

    loadBatches();
});


// =====================================================
// RESET FORM
// =====================================================

function resetForm() {

    document.getElementById(
        "batchForm"
    ).reset();

    document.getElementById(
        "batchId"
    ).value = "";
}


// =====================================================
// INIT
// =====================================================

loadMedicinesDropdown();

loadBatches();