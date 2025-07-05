// ✅ ui-behavior.js — handles sidebar, layout, and global UI logic

document.addEventListener("DOMContentLoaded", () => {
  // Back-link navigation support
  document.querySelectorAll(".back-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.getAttribute("href");
      if (target) window.location.href = target;
    });
  });

  // Auto-dismiss alerts after 4 seconds
  document.querySelectorAll(".alert").forEach((alert) => {
    alert.style.transition = "opacity 0.5s ease";
    setTimeout(() => {
      alert.style.opacity = 0;
      setTimeout(() => alert.remove(), 500);
    }, 4000);
  });

  // Sidebar toggle logic
  const sidebar = document.querySelector(".sidebar");
  const btn = document.getElementById("btn");

  function updateMenuIcon() {
    if (sidebar.classList.contains("open")) {
      btn.classList.replace("bx-menu", "bx-menu-alt-right");
    } else {
      btn.classList.replace("bx-menu-alt-right", "bx-menu");
    }
  }

  function toggleSidebar() {
    sidebar.classList.toggle("open");
    document.body.classList.toggle("sidebar-open", sidebar.classList.contains("open"));
    updateMenuIcon();
  }

  if (btn) {
    btn.addEventListener("click", toggleSidebar);
  }

  // Start with sidebar closed on small screens
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("open");
    document.body.classList.remove("sidebar-open");
    updateMenuIcon();
  }

  // Close sidebar if clicking outside on mobile
  document.addEventListener("click", (event) => {
    if (
      window.innerWidth <= 768 &&
      sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) &&
      event.target.id !== "btn"
    ) {
      sidebar.classList.remove("open");
      document.body.classList.remove("sidebar-open");
      updateMenuIcon();
    }
  });

  // ✅ Global logout support (on any page)
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

  // ✅ Hide logout button on login page
  const isLoginPage = window.location.pathname === "/login";
  const logoutLink = document.getElementById("log_out");
  if (isLoginPage && logoutLink) {
    logoutLink.style.display = "none";
  }
});
