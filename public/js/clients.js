document.addEventListener("DOMContentLoaded", () => {
  loadClients();

  // handle client form submit
  document.getElementById("createClientForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("clientNameInput").value.trim();
    if (name.length < 2) {
      showNotification("Client name too short.", "warning");
      return;
    }

    fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then(res => res.json())
      .then(data => {
        showNotification(`Client "${name}" created!`, "success");
        document.getElementById("clientNameInput").value = "";
        loadClients(); // refresh list
      })
      .catch(() => showNotification("Failed to create client.", "error"));
  });
});

function attachClientActions() {
  // Edit client handler
  document.querySelectorAll(".edit-client-btn").forEach(button => {
    button.addEventListener("click", () => {
      const clientId = button.dataset.id;
      const oldName = button.dataset.name;

      showPromptModal("Edit client name:", oldName, (newName) => {
        if (!newName || newName.trim().length < 2) {
          showNotification("Client name too short or empty.", "warning");
          return;
        }
        if (newName === oldName) {
          showNotification("Name unchanged.", "info");
          return;
        }

        fetch(`/api/clients/${clientId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim() }),
        })
          .then(res => {
            if (!res.ok) throw new Error("Failed to update client");
            return res.json();
          })
          .then(() => {
            showNotification(`Client renamed to "${newName}".`, "success");
            loadClients();
          })
          .catch(() => showNotification("Failed to rename client.", "error"));
      });
    });
  });

  // Delete client handler
  document.querySelectorAll(".delete-client-btn").forEach(button => {
    button.addEventListener("click", () => {
      const clientId = button.dataset.id;
      const clientName = button.dataset.name;

      showConfirmNotification(`Delete client "${clientName}"?`, () => {
        fetch(`/api/clients/${clientId}`, { method: "DELETE" })
          .then(res => {
            if (!res.ok) throw new Error("Failed to delete client");
            return res.json();
          })
          .then(() => {
            showNotification(`Client "${clientName}" deleted.`, "error");
            loadClients();
          })
          .catch(() => showNotification("Failed to delete client.", "error"));
      });
    });
  });
}


// Load client list
function loadClients() {
  fetch("/api/clients")
    .then(res => res.json())
    .then(clients => {
      const container = document.getElementById("clientEntries");
      if (!container) return;

      if (clients.length === 0) {
        container.innerHTML = "<p>No clients found.</p>";
        return;
      }

      container.innerHTML = clients.map(c => `
        <div class="client-entry">
          <span class="client-name">${c.name}</span>
          <div class="client-actions">
            <button class="view-btn" onclick="viewHistory(${c.id}, '${c.name}')">View History</button>
            <button class="edit-client-btn" data-id="${c.id}" data-name="${c.name}">Edit</button>
            <button class="delete-client-btn" data-id="${c.id}" data-name="${c.name}">Delete</button>
          </div>
        </div>
      `).join("");

      attachClientActions();  // <-- Must call here!
    })
    .catch(() => {
      showNotification("Failed to load clients.", "error");
    });
}


// Show export history for selected client
function viewHistory(clientId, name) {
  // Update export section title
  document.getElementById("historyTitle").textContent = `${name.toUpperCase()}'s Export History`;
  const container = document.getElementById("exportTableBody");
  container.innerHTML = "";
  fetch(`/api/clients/${clientId}/exports`)
    .then(res => res.json())
    .then(exports => {
      const container = document.getElementById("exportTableBody");
      container.innerHTML = "";
      let hasValidRows = false;

      exports.forEach(record => {
        const date = new Date(record.created_at).toLocaleString();
        try {
          const models = typeof record.data === "string"
            ? JSON.parse(record.data)
            : record.data;

          // Summary data
          let totalTTC = 0;
          let totalRemise = 0;
          let totalPackages = 0;
          let totalModels = models.length;

          models.forEach(model => {
            const price = parseFloat(model.price || 0);
            const qty = parseInt(model.quantity || 0);
            const discount = parseFloat(model.discount || 0);
            const ttc = price * qty;
            const remise = ttc * (discount / 100);

            totalTTC += ttc;
            totalRemise += remise;
            totalPackages += parseInt(model.packages || 0);
          });

          const netToPay = totalTTC - totalRemise;

          container.innerHTML += `
            <tr>
              <td>${record.invoice_number}</td>
              <td>${totalModels}</td>
              <td>${totalTTC.toFixed(2)} DH</td>
              <td>${totalRemise.toFixed(2)} DH</td>
              <td>${netToPay.toFixed(2)} DH</td>
              <td>${totalPackages}</td>
              <td><a href="/invoices/${record.invoice_number}.pdf" target="_blank">View PDF</a></td>
            </tr>
          `;
          hasValidRows = true;
        } catch (err) {
          console.warn("Skipped broken export row:", record.id);
        }
      });

      if (!hasValidRows) {
        container.innerHTML = `
          <tr style="background-color: #fff; color: #777; text-align: center;">
            <td colspan="7">No valid export records found.</td>
          </tr>
        `;
      }
    })
    .catch(() => {
      const container = document.getElementById("exportTableBody");
      container.innerHTML = `
        <tr style="background-color: #fff; color: #777; text-align: center;">
          <td colspan="7">Failed to load export history.</td>
        </tr>
      `;
    });
}
