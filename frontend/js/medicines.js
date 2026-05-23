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

async function loadMedicines() {

    try {

        const response = await apiFetch(
            `${API_BASE}/medicines/`
        );

        const data = await response.json();

        console.log("MEDICINES:", data);

        const medicines = data.results || data;

        const tableBody = document.getElementById(
            "medicineTableBody"
        );

        tableBody.innerHTML = "";

        if (medicines.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        No medicines found
                    </td>
                </tr>
            `;

            return;
        }

        medicines.forEach(medicine => {

            tableBody.innerHTML += `

                <tr>

                    <td>
                        ${medicine.name}
                    </td>

                    <td>
                        ${medicine.generic_name}
                    </td>

                    <td>
                        ${medicine.manufacturer}
                    </td>

                    <td>
                        ${medicine.strength}
                    </td>

                    <td>
                        ${medicine.category}
                    </td>

                    <td>
                        ${medicine.storage_type}
                    </td>

                    <td>

                        <button
                            class="btn btn-warning btn-sm"
                            onclick="editMedicine('${medicine.id}')"
                        >
                            Edit
                        </button>

                        <button
                            class="btn btn-danger btn-sm"
                            onclick="deleteMedicine('${medicine.id}')"
                        >
                            Delete
                        </button>

                    </td>

                </tr>
            `;
        });

    } catch (error) {

        console.error(error);

        alert("Failed to load medicines");
    }
}


// =====================================================
// SAVE MEDICINE
// =====================================================

document
.getElementById("medicineForm")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    try {

        const medicineId =
            document.getElementById("medicineId").value;

        const payload = {

            name:
                document.getElementById("name").value,

            generic_name:
                document.getElementById("generic_name").value,

            manufacturer:
                document.getElementById("manufacturer").value,

            category:
                document.getElementById("category").value,

            sku:
                document.getElementById("sku").value,

            dosage_form:
                document.getElementById("dosage_form").value,

            strength:
                document.getElementById("strength").value,

            storage_type:
                document.getElementById("storage_type").value,

            min_stock_threshold: parseInt(
                document.getElementById(
                    "min_stock_threshold"
                ).value
            ),

            is_active:
                document.getElementById("is_active").checked
        };

        console.log("PAYLOAD:", payload);

        let response;

        if (medicineId) {

            response = await apiFetch(
                `${API_BASE}/medicines/${medicineId}/`,
                {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }
            );

        } else {

            response = await apiFetch(
                `${API_BASE}/medicines/`,
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );
        }

        const data = await response.json();

        if (!response.ok) {

            console.error(data);

            alert(JSON.stringify(data));

            return;
        }

        alert("Medicine saved successfully");

        bootstrap.Modal
            .getInstance(
                document.getElementById(
                    "medicineModal"
                )
            )
            .hide();

        loadMedicines();

        resetForm();

    } catch (error) {

        console.error(error);

        alert("Failed to save medicine");
    }
});


// =====================================================
// EDIT MEDICINE
// =====================================================

async function editMedicine(id) {

    try {

        const response = await apiFetch(
            `${API_BASE}/medicines/${id}/`
        );

        const medicine = await response.json();

        document.getElementById("medicineId").value = medicine.id;

        document.getElementById("name").value = medicine.name;

        document.getElementById("generic_name").value = medicine.generic_name;

        document.getElementById("manufacturer").value = medicine.manufacturer;

        document.getElementById("category").value = medicine.category;

        document.getElementById("sku").value = medicine.sku;

        document.getElementById("dosage_form").value = medicine.dosage_form;

        document.getElementById("strength").value = medicine.strength;

        document.getElementById("storage_type").value = medicine.storage_type;

        document.getElementById("min_stock_threshold").value = medicine.min_stock_threshold;

        document.getElementById("is_active").checked = medicine.is_active;

        new bootstrap.Modal(
            document.getElementById(
                "medicineModal"
            )
        ).show();

    } catch (error) {

        console.error(error);

        alert("Failed to load medicine");
    }
}


// =====================================================
// DELETE MEDICINE
// =====================================================

async function deleteMedicine(id) {

    if (!confirm("Delete this medicine?")) {

        return;
    }

    try {

        const response = await apiFetch(
            `${API_BASE}/medicines/${id}/`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {

            alert("Delete failed");

            return;
        }

        alert("Medicine deleted successfully");

        loadMedicines();

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
.addEventListener("keyup", async (e) => {

    try {

        const query = e.target.value;

        const response = await apiFetch(
            `${API_BASE}/medicines/?search=${query}`
        );

        const data = await response.json();

        const medicines = data.results || data;

        const tableBody = document.getElementById(
            "medicineTableBody"
        );

        tableBody.innerHTML = "";

        medicines.forEach(medicine => {

            tableBody.innerHTML += `

                <tr>

                    <td>${medicine.name}</td>
                    <td>${medicine.generic_name}</td>
                    <td>${medicine.manufacturer}</td>
                    <td>${medicine.strength}</td>
                    <td>${medicine.category}</td>
                    <td>${medicine.storage_type}</td>

                    <td>

                        <button
                            class="btn btn-warning btn-sm"
                            onclick="editMedicine('${medicine.id}')"
                        >
                            Edit
                        </button>

                        <button
                            class="btn btn-danger btn-sm"
                            onclick="deleteMedicine('${medicine.id}')"
                        >
                            Delete
                        </button>

                    </td>

                </tr>
            `;
        });

    } catch (error) {

        console.error(error);
    }
});


// =====================================================
// RESET FORM
// =====================================================

function resetForm() {

    document.getElementById("medicineForm").reset();

    document.getElementById("medicineId").value = "";

    document.getElementById("is_active").checked = true;
}


// =====================================================
// INIT
// =====================================================

loadMedicines();

