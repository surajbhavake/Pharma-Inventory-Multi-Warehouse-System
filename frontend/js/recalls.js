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
// LOAD RECALLS
// =====================================================

async function loadRecalls() {

    try {

        const search =
            document.getElementById(
                "searchInput"
            ).value
            .toLowerCase();

        const response =
            await apiFetch(
                `${API_BASE}/recalls/`
            );

        const data =
            await response.json();

        console.log(
            "RECALLS:",
            data
        );

        const recalls =
            data.results || data;

        const tbody =
            document.getElementById(
                "recallTableBody"
            );

        tbody.innerHTML = "";

        let pending = 0;
        let approved = 0;
        let rejected = 0;

        let filtered =
            recalls.filter(recall => {

                return (

                    recall.batch_number
                        ?.toLowerCase()
                        .includes(search)

                    ||

                    recall.medicine_name
                        ?.toLowerCase()
                        .includes(search)

                    ||

                    recall.reason
                        ?.toLowerCase()
                        .includes(search)

                    ||

                    recall.status
                        ?.toLowerCase()
                        .includes(search)
                );
            });


        document.getElementById(
            "totalRecallCount"
        ).innerText =
            filtered.length;


        if (filtered.length === 0) {

            tbody.innerHTML = `

                <tr>

                    <td colspan="7"
                        class="text-center">

                        No recall requests found

                    </td>

                </tr>
            `;

            return;
        }


        filtered.forEach(recall => {

            // STATUS COUNT

            if (
                recall.status === "PENDING"
            ) {

                pending++;

            } else if (
                recall.status === "APPROVED"
            ) {

                approved++;

            } else if (
                recall.status === "REJECTED"
            ) {

                rejected++;
            }


            // BADGES

            let badge = "";

            if (
                recall.status === "PENDING"
            ) {

                badge = `

                    <span class="badge bg-warning">

                        Pending

                    </span>
                `;

            } else if (
                recall.status === "APPROVED"
            ) {

                badge = `

                    <span class="badge bg-success">

                        Approved

                    </span>
                `;

            } else {

                badge = `

                    <span class="badge bg-danger">

                        Rejected

                    </span>
                `;
            }


            // ACTION BUTTON
let actionButton = `
    <span class="text-muted">
        Completed
    </span>
`;

if (recall.status === "PENDING") {

    actionButton = `

        <div class="d-flex gap-2">

            <button
                class="btn btn-success btn-sm"
                onclick="approveRecall('${recall.id}')"
            >
                Approve
            </button>

            <button
                class="btn btn-danger btn-sm"
                onclick="rejectRecall('${recall.id}')"
            >
                Reject
            </button>

        </div>
    `;
}


            tbody.innerHTML += `

                <tr>

                    <td>

                        ${recall.batch_number || "-"}

                    </td>

                    <td>

                        ${recall.medicine_name || "-"}

                    </td>

                    <td>

                        ${recall.reason || "-"}

                    </td>

                    <td>

                        ${badge}

                    </td>

                    <td>

                        ${
                            recall.requested_by_username
                            || "-"
                        }

                    </td>

                    <td>

                        ${
                            recall.requested_at
                            ? new Date(
                                recall.requested_at
                              ).toLocaleString()
                            : "-"
                        }

                    </td>

                    <td>

                        ${actionButton}

                    </td>

                </tr>
            `;
        });


        document.getElementById(
            "pendingRecallCount"
        ).innerText =
            pending;

        document.getElementById(
            "approvedRecallCount"
        ).innerText =
            approved;

        document.getElementById(
            "rejectedRecallCount"
        ).innerText =
            rejected;

    } catch (error) {

        console.error(error);

        alert(
            "Failed to load recalls"
        );
    }
}


// =====================================================
// CREATE RECALL
// =====================================================

document
.getElementById("recallForm")
.addEventListener(
    "submit",
    async function (e) {

        e.preventDefault();

        try {

            const batch =
                document.getElementById(
                    "batchSelect"
                ).value;

            const reason =
                document.getElementById(
                    "reason"
                ).value;


            if (!batch || !reason) {

                alert(
                    "Please fill all fields"
                );

                return;
            }


            const payload = {

                batch: batch,

                reason: reason
            };

            console.log(
                "RECALL PAYLOAD:",
                payload
            );


            const response =
                await apiFetch(

                    `${API_BASE}/recalls/`,

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
                "RECALL RESPONSE:",
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
                "Recall request created successfully"
            );


            document
                .getElementById(
                    "recallForm"
                )
                .reset();


            bootstrap.Modal
                .getInstance(
                    document.getElementById(
                        "recallModal"
                    )
                )
                .hide();


            loadRecalls();

        } catch (error) {

            console.error(error);

            alert(
                "Failed to create recall"
            );
        }
    }
);


// =====================================================
// APPROVE RECALL
// =====================================================

async function approveRecall(
    recallId
) {

    try {

        const confirmAction =
            confirm(
                "Approve this recall?"
            );

        if (!confirmAction) {

            return;
        }


        const response =
            await apiFetch(

                `${API_BASE}/recalls/${recallId}/approve/`,

                {
                    method: "POST"
                }
            );


        const data =
            await response.json();

        console.log(
            "APPROVE RESPONSE:",
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
            "Recall approved successfully"
        );

        loadRecalls();

    } catch (error) {

        console.error(error);

        alert(
            "Failed to approve recall"
        );
    }
}

async function rejectRecall(
    recallId
) {

    try {

        const confirmReject =
            confirm(
                "Reject this recall?"
            );

        if (!confirmReject) {

            return;
        }

        const response =
            await apiFetch(

                `${API_BASE}/recalls/${recallId}/reject/`,

                {
                    method: "POST",

                    body: JSON.stringify({

                        rejection_reason:
                            "Rejected by admin"
                    })
                }
            );

        const data =
            await response.json();

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
            "Recall rejected successfully"
        );

        loadRecalls();

    } catch (error) {

        console.error(error);

        alert(
            "Failed to reject recall"
        );
    }
}

// =====================================================
// SEARCH
// =====================================================

document
.getElementById("searchInput")
.addEventListener("keyup", () => {

    loadRecalls();
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

loadRecalls();