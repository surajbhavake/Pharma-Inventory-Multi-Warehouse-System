import { API_BASE_URL } from "./config.js";


// ===============================
// GET ACCESS TOKEN
// ===============================
export function getAccessToken() {

    return sessionStorage.getItem("access");
}


// ===============================
// API FETCH WRAPPER
// ===============================
export async function apiFetch(endpoint, options = {}) {

    const token = getAccessToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    // Add JWT token
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,
            headers
        }
    );

    // ===============================
    // 401 INTERCEPTOR
    // ===============================
    if (response.status === 401) {

        sessionStorage.clear();

        alert("Session expired. Please login again.");

        window.location.href = "/frontend/login.html";

        return;
    }

    return response;
}