document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  // Focus the first input when page loads
  const firstInput = document.querySelector("input:not([type=hidden])");
  if (firstInput) firstInput.focus();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const loginBtn = form.querySelector("button[type='submit']");

    if (username.length < 3 || username.length > 50) {
      showNotification("Username must be between 3–50 characters.", "warning");
      return;
    }

    if (password.length < 6) {
      showNotification("Password must be at least 6 characters long.", "warning");
      return;
    }

    try {
      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";

      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-Login-Attempt": "1"
        },
        body: JSON.stringify({
          username: sanitize(username),
          password
        })
      });

      loginBtn.disabled = false;
      loginBtn.textContent = "Login";

      if (!response.ok) {
        const data = await response.json();
        const msg = data.message || "Login failed. Please try again.";
        showNotification(msg, "error");
        return;
      }

      sessionStorage.setItem("loggedIn", "true");
      showNotification("✅ Login successful! Redirecting...", "success");
      setTimeout(() => window.location.href = "/", 1000);
    } catch (err) {
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
      console.error("Login request failed:", err);
      showNotification("Server error. Please try again later.", "error");
    }
  });

  // Logout handling
  // ✅ Smart Logout Handler (from login.js)
  const logoutBtn = document.getElementById("log_out");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      fetch("/logout", { method: "POST" })
        .then(() => {
          sessionStorage.clear();
          localStorage.removeItem("userToken");
          if (typeof showNotification === "function") {
            showNotification("👋 You have been logged out.", "info");
          }
          setTimeout(() => window.location.href = "/login", 1000);
        })
        .catch(() => {
          if (typeof showNotification === "function") {
            showNotification("Logout failed. Try again.", "error");
          }
        });
    });
  }

  // Simple XSS sanitizer
  function sanitize(input) {
    return input.replace(/[<>"'\/]/g, "");
  }
});
