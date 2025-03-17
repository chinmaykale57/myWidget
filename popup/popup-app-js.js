document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("login-btn");

    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            if (!email || !password) {
                alert("Please enter both email and password.");
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
                        alert(`Welcome, ${data.item.fullname}!`);
                        
                        // Redirect back to App ID Extractor
                        window.location.href = "popup-app-id.html";
                    });
                } else {
                    alert("Login failed: " + data.operationMessage);
                }
            })
            .catch(error => {
                console.error("Login error:", error);
                alert("Network request failed.");
            });
        });
    }
});
