document.addEventListener("DOMContentLoaded", () => {
    // First check if the user is already logged in
    chrome.storage.local.get(["user"], (data) => {
        if (data.user && data.user.token) {
            // User is already logged in, redirect to the app
            window.location.href = "popup-app-id.html";
            return;
        }
        
        // User is not logged in, show the login form
        const loginBtn = document.getElementById("login-btn");

        if (loginBtn) {
            loginBtn.addEventListener("click", () => {
                const email = document.getElementById("login-email").value;
                const password = document.getElementById("login-password").value;

                if (!email || !password) {
                    document.getElementById("login-error").textContent = "Please enter both email and password.";
                    return;
                }

                fetch("http://157.66.191.31:30166/token/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password})
                })
                .then(response => response.json())
                .then(data => {
                    if (data.operationStatus === "SUCCESS") {
                        chrome.storage.local.set({ user: data.item }, () => {
                            // Redirect back to App ID Extractor
                            window.location.href = "popup-app-id.html";
                        });
                    } else {
                        document.getElementById("login-error").textContent = "Login failed: " + data.operationMessage;
                    }
                })
                .catch(error => {
                    console.error("Login error:", error);
                    document.getElementById("login-error").textContent = "Network request failed.";
                });
            });
        }
    });
});