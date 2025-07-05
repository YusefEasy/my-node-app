// =======================
// 🔔 Toast Notification
// =======================
function showNotification(message, type = "info", duration = 4000) {
  const container = document.getElementById("notification-container");
  if (!container) return;

  // Prevent duplicate notifications (same message and type)
  const exists = Array.from(container.children).some(
    n => n.textContent === message && n.classList.contains(type)
  );
  if (exists) return;

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  container.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("fade-out");
    setTimeout(() => notification.remove(), 500);
  }, duration);
}

// =======================
// ⚠️ Confirm Modal
// =======================
function showConfirmNotification(message, onConfirm) {
  const container = document.getElementById("modal-container");
  if (!container) return;

  container.innerHTML = "";
  container.classList.add("active");

  const modal = document.createElement("div");
  modal.className = "custom-modal animated-confirm";

  modal.innerHTML = `
    <div class="modal-box">
      <p style="font-weight: bold; font-size: 16px;">${message}</p>
      <div class="modal-actions">
        <button id="confirmYes" class="confirm-btn">Confirm</button>
        <button id="confirmCancel" class="cancel-btn">Cancel</button>
      </div>
    </div>
  `;

  container.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add("fade-in"));

  document.getElementById("confirmYes").onclick = () => {
    modal.classList.replace("fade-in", "fade-out");
    setTimeout(() => {
      container.classList.remove("active");
      container.innerHTML = "";
      onConfirm();
    }, 250);
  };

  document.getElementById("confirmCancel").onclick = () => {
    modal.classList.replace("fade-in", "fade-out");
    setTimeout(() => {
      container.classList.remove("active");
      container.innerHTML = "";
    }, 250);
  };
}

// =======================
// 💬 Prompt Input Modal
// =======================
function showPromptModal(label, defaultValue, onSubmit) {
  const container = document.getElementById("modal-container");
  if (!container) return;

  container.innerHTML = "";
  container.classList.add("active");

  const modal = document.createElement("div");
  modal.className = "custom-modal animated-confirm";

  modal.innerHTML = `
    <div class="modal-box">
      <label>${label}</label>
      <input type="text" id="modalInput" value="${defaultValue || ''}" />
      <div class="modal-actions">
        <button id="modalSave" class="confirm-btn">Save</button>
        <button id="modalCancel" class="cancel-btn">Cancel</button>
      </div>
    </div>
  `;

  container.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add("fade-in"));

  document.getElementById("modalSave").onclick = () => {
    const value = modal.querySelector("#modalInput").value;
    modal.classList.replace("fade-in", "fade-out");
    setTimeout(() => {
      container.classList.remove("active");
      container.innerHTML = "";
      onSubmit(value);
    }, 250);
  };

  document.getElementById("modalCancel").onclick = () => {
    modal.classList.replace("fade-in", "fade-out");
    setTimeout(() => {
      container.classList.remove("active");
      container.innerHTML = "";
    }, 250);
  };
}

// =======================
// ⏳ Loading Spinner
// =======================
function showLoading() {
  const spinner = document.getElementById("globalLoadingSpinner");
  if (spinner) {
    spinner.style.opacity = "0";
    spinner.style.display = "flex";
    setTimeout(() => spinner.style.opacity = "1", 10);
  }
}

function hideLoading() {
  const spinner = document.getElementById("globalLoadingSpinner");
  if (spinner) {
    spinner.style.opacity = "0";
    setTimeout(() => spinner.style.display = "none", 300);
  }
}

// =======================
// 🔗 Auto Page Transition Spinner
// =======================
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("a[href]").forEach(link => {
    const href = link.getAttribute("href");

    if (href && !href.startsWith("http") && !href.startsWith("#") && !href.startsWith("javascript")) {
      link.addEventListener("click", e => {
        e.preventDefault();
        showLoading();
        setTimeout(() => {
          window.location.href = href;
        }, 300); // Smooth delay before navigating
      });
    }
  });
});
