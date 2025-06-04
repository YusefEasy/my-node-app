document.addEventListener("DOMContentLoaded", () => {
  const toggleLink = document.getElementById("toggleModeLink");
  const modeText = document.getElementById("modeText");
  const modeIcon = document.getElementById("modeIcon");
  const menu = document.querySelector('.main-menu');

  function setDarkMode(isDark) {
    document.body.classList.toggle("dark-mode", isDark);
    localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
    modeText.textContent = isDark ? "Light Mode" : "Dark Mode";
    modeIcon.classList.remove(isDark ? "fa-moon" : "fa-sun");
    modeIcon.classList.add(isDark ? "fa-sun" : "fa-moon");
  }

  const darkEnabled = localStorage.getItem("darkMode") === "enabled";
  setDarkMode(darkEnabled);

  toggleLink.addEventListener("click", (e) => {
    e.preventDefault();
    const isNowDark = !document.body.classList.contains("dark-mode");
    setDarkMode(isNowDark);
  });

  // Auto-focus the first input
  const firstInput = document.querySelector("input:not([type=hidden])");
  if (firstInput) firstInput.focus();

  // Smooth scroll on back-link click
  document.querySelectorAll(".back-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = link.getAttribute("href");
    });
  });

  // Alert animation
  const alerts = document.querySelectorAll(".alert");
  alerts.forEach(alert => {
    alert.style.transition = "opacity 0.5s ease";
    setTimeout(() => {
      alert.style.opacity = 0;
      setTimeout(() => alert.remove(), 500);
    }, 4000);
  });

  const logoutButton = document.getElementById("logoutButton");

  if (sessionStorage.getItem("loggedIn") !== "true" && logoutButton) {
    logoutButton.style.display = "none";
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      sessionStorage.removeItem("loggedIn");
      window.location.href = "/login";
    });
  }

  // Listen for when the menu transition ends and enable hover effects
  menu.addEventListener('transitionend', (e) => {
    // Check if the transition for width is complete (only for the main menu)
    if (e.propertyName === 'width' && menu.classList.contains('expanded')) {
      // Re-enable hover effects once the menu is fully expanded
      const buttons = menu.querySelectorAll('li > a');
      buttons.forEach(button => {
        button.style.pointerEvents = 'auto'; // Enable hover effect
      });
    }
  });

  // Toggle the menu expansion on hover or click
  menu.addEventListener('mouseenter', () => {
    menu.classList.add('expanded');
    // Disable hover effect when menu is not fully expanded
    const buttons = menu.querySelectorAll('li > a');
    buttons.forEach(button => {
      button.style.pointerEvents = 'none';
    });
  });

  menu.addEventListener('mouseleave', () => {
    menu.classList.remove('expanded');
    const buttons = menu.querySelectorAll('li > a');
    buttons.forEach(button => {
      button.style.pointerEvents = 'none'; // Disable hover effect when menu collapses
    });
  });
});
