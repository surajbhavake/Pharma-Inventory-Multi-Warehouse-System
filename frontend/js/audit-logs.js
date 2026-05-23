const API_BASE =
    "http://127.0.0.1:8000/api/v1";

const accessToken =
    sessionStorage.getItem("access");


// =====================================================
// AUTH CHECK
// =====================================================

if (!accessToken) {

    window.location.href =
        "./login.html";
}


// =====================================================
// COMMON HEADERS
// =====================================================

const headers = {

    "Authorization":
        `Bearer ${accessToken}`,

    "Content-Type":
        "application/json"
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

    if (
        response.status === 401 ||
        response.status === 403
    ) {

        alert(
            "Session expired. Please login again."
        );

        sessionStorage.clear();

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
// LOAD AUDIT LOGS
// =====================================================

async function loadAuditLogs() {

    try {

        const search =
            document.getElementById(
                "searchInput"
            ).value;

        const action =
            document.getElementById(
                "actionFilter"
            ).value;

        const entity =
            document.getElementById(
                "entityFilter"
            ).value;


        // URL BUILD

        let url =
            `${API_BASE}/audit-logs/?`;


        if (search) {

            url +=
                `search=${search}&`;
        }

        if (action) {

            url +=
                `action=${action}&`;
        }

        if (entity) {

            url +=
                `entity_type=${entity}&`;
        }


        const response =
            await apiFetch(url);

        const data =
            await response.json();

        console.log(
            "AUDIT LOGS:",
            data
        );


        const logs =
            data.results || data;

        const tableBody =
            document.getElementById(
                "auditTableBody"
            );

        tableBody.innerHTML = "";


        // STATS

        let createCount = 0;
        let updateCount = 0;
        let deleteCount = 0;


        if (!logs.length) {

            tableBody.innerHTML = `

                <tr>

                    <td colspan="6"
                        class="text-center">

                        No audit logs found

                    </td>

                </tr>
            `;

            document.getElementById(
                "totalLogs"
            ).innerText = 0;

            document.getElementById(
                "createLogs"
            ).innerText = 0;

            document.getElementById(
                "updateLogs"
            ).innerText = 0;

            document.getElementById(
                "deleteLogs"
            ).innerText = 0;

            return;
        }


        logs.forEach(log => {

            // COUNT STATS

            if (
                log.action === "CREATE"
            ) {

                createCount++;

            } else if (
                log.action === "UPDATE"
            ) {

                updateCount++;

            } else if (
                log.action === "DELETE"
            ) {

                deleteCount++;
            }


            // BADGES

            let badge = "";

            if (
                log.action === "CREATE"
            ) {

                badge = `

                    <span class="badge bg-success">

                        CREATE

                    </span>
                `;

            } else if (
                log.action === "UPDATE"
            ) {

                badge = `

                    <span class="badge bg-warning text-dark">

                        UPDATE

                    </span>
                `;

            } else if (
                log.action === "DELETE"
            ) {

                badge = `

                    <span class="badge bg-danger">

                        DELETE

                    </span>
                `;

            } else if (
                log.action === "LOGIN"
            ) {

                badge = `

                    <span class="badge bg-primary">

                        LOGIN

                    </span>
                `;

            } else if (
                log.action === "LOGOUT"
            ) {

                badge = `

                    <span class="badge bg-secondary">

                        LOGOUT

                    </span>
                `;

            } else {

                badge = `

                    <span class="badge bg-dark">

                        ${log.action || "-"}

                    </span>
                `;
            }


            tableBody.innerHTML += `

                <tr>

                    <td>

                        ${badge}

                    </td>

                    <td>

                        ${
                            log.user_name
                            || log.user?.email
                            || "-"
                        }

                    </td>

                    <td>

                        ${log.entity_type || "-"}

                    </td>

                    <td>

                        <small>

                            ${log.entity_id || "-"}

                        </small>

                    </td>

                    <td>

                        ${log.description || "-"}

                    </td>

                    <td>

                        ${
                            log.created_at
                            ? new Date(
                                log.created_at
                              ).toLocaleString()
                            : "-"
                        }

                    </td>

                </tr>
            `;
        });


        // UPDATE STATS

        document.getElementById(
            "totalLogs"
        ).innerText =
            logs.length;

        document.getElementById(
            "createLogs"
        ).innerText =
            createCount;

        document.getElementById(
            "updateLogs"
        ).innerText =
            updateCount;

        document.getElementById(
            "deleteLogs"
        ).innerText =
            deleteCount;

    } catch (error) {

        console.error(error);

        alert(
            "Failed to load audit logs"
        );
    }
}


// =====================================================
// SEARCH FILTER
// =====================================================

document
.getElementById("searchInput")
.addEventListener("keyup", () => {

    loadAuditLogs();
});


// =====================================================
// ACTION FILTER
// =====================================================

document
.getElementById("actionFilter")
.addEventListener("change", () => {

    loadAuditLogs();
});


// =====================================================
// ENTITY FILTER
// =====================================================

document
.getElementById("entityFilter")
.addEventListener("keyup", () => {

    loadAuditLogs();
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

loadAuditLogs();