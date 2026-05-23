import { API_BASE_URL } from "./config.js";


// ===============================
// LOGIN FUNCTION
// ===============================
async function login(email, password) {

    try {

        const response = await fetch(
            `${API_BASE_URL}/auth/login/`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        console.log(data);

        // LOGIN FAILED
        if (!response.ok) {

            alert(
                data.detail ||
                "Invalid credentials"
            );

            return;
        }

        // STORE TOKENS
        sessionStorage.setItem(
            "access",
            data.access
        );

        sessionStorage.setItem(
            "refresh",
            data.refresh
        );

        // STORE USER
        sessionStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );

        // REDIRECT
        window.location.href =
            "/frontend/dashboard.html";

    } catch (error) {

        console.error(error);

        alert("Login failed");
    }
}


// ===============================
// LOGIN FORM SUBMIT
// ===============================
document
.getElementById("loginForm")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email =
        document.getElementById("email").value;

    const password =
        document.getElementById("password").value;

    await login(email, password);
});