document.addEventListener("DOMContentLoaded", () => {
  const companiesTableBody = document.getElementById("companiesTableBody");
  const companyFilter = document.getElementById("companyFilter");
  const modelsTable = document.getElementById("modelsTable").getElementsByTagName("tbody")[0];
  
  // Load companies
  fetch("/api/companies-with-models")
    .then((response) => response.json())
    .then((companies) => {
      // Clear previous options and rows
      companyFilter.innerHTML = `<option value="">Select Company</option>`;
      companiesTableBody.innerHTML = "";

      if (!Array.isArray(companies) || companies.length === 0) {
        companyFilter.innerHTML += `<option disabled>No companies found</option>`;
        return;
      }

      companies.forEach((company) => {
        // Add to select
        const option = document.createElement("option");
        option.value = company.name;
        option.textContent = company.name;
        companyFilter.appendChild(option);

        // Add to table
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${company.id}</td>
          <td id="companyName${company.id}">${company.name}</td>
          <td>${company.model_count}</td>
          <td>${company.created_at}</td>
          <td>
            <div class="actions">
              <button class="edit-company" data-name="${company.name}">Edit</button>
              <button class="delete-company" data-name="${company.name}">Delete</button>
            </div>
          </td>
        `;
        companiesTableBody.appendChild(row);
      });

      attachCompanyActions();
    })
    .catch(() => {
      companyFilter.innerHTML = `<option disabled>Error loading companies</option>`;
      companiesTableBody.innerHTML = `<tr><td colspan="5" style="color:#e74c3c;">Error loading companies</td></tr>`;
    });

  // Load models
  companyFilter.addEventListener("change", (e) => {
    const table = e.target.value;
    if (!table) {
      modelsTable.innerHTML = "";
      return;
    }

    fetch(`/api/models?table=${table}`)
      .then((response) => response.json())
      .then((models) => {
        modelsTable.innerHTML = "";
        models.forEach((model) => {
          // Split created_at into date and time for two-line display
          let createdDate = model.created_at;
          let datePart = createdDate;
          let timePart = "";
          if (createdDate && createdDate.includes(",")) {
            [datePart, timePart] = createdDate.split(",").map(s => s.trim());
          }
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${model.id}</td>
            <td class="model-name">${model.name}</td>
            <td class="model-price">${model.price}</td>
            <td class="model-discount">${model.discount}</td>
            <td>${model.quantity}</td>
            <td>${model.packages}</td>
            <td>
              <span class="created-date">${datePart}${timePart ? "," : ""}</span>
              <span class="created-time">${timePart}</span>
            </td>
            <td>
              <div class="actions">
              <button class="edit-model" data-id="${model.id}" data-table="${table}">Edit</button>
              <button class="delete-model" data-id="${model.id}" data-table="${table}">Delete</button>
              </div>
            </td>
          `;
          modelsTable.appendChild(row);
        });
        attachModelActions();
      });
  });

  // 🏢 Edit/Delete Company (with notification system)
  function attachCompanyActions() {
    document.querySelectorAll(".edit-company").forEach((btn) => {
      btn.addEventListener("click", () => {
        const oldName = btn.dataset.name;
        showPromptModal("Enter new company name:", oldName, (newName) => {
          if (newName && newName !== oldName) {
            fetch(`/api/companies/${oldName}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newName }),
            })
              .then((res) => res.json())
              .then(() => {
                showNotification("Company renamed successfully.", "success");
                location.reload();
              })
              .catch(() => showNotification("Failed to rename company", "error"));
          } else {
            showNotification("Edit cancelled or unchanged", "warning");
          }
        });
      });
    });

    document.querySelectorAll(".delete-company").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.name;
        showConfirmNotification(`Delete company '${name}'?`, () => {
          fetch(`/api/companies/${name}`, { method: "DELETE" })
            .then((res) => res.json())
            .then(() => {
              showNotification("Company deleted successfully.", "error");
              location.reload();
            })
            .catch(() => showNotification("Failed to delete company", "error"));
        });
      });
    });
  }

  // 🎯 Model Edit/Delete logic
  function attachModelActions() {
    document.querySelectorAll(".edit-model").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const table = btn.dataset.table;
        const row = btn.closest("tr");
        const currentName = row.querySelector(".model-name").textContent;
        const currentPrice = row.querySelector(".model-price").textContent;
        const currentDiscount = row.querySelector(".model-discount").textContent;
        const currentQuantity = row.querySelector("td:nth-child(5)").textContent;
        const currentPackages = row.querySelector("td:nth-child(6)").textContent;

        showPromptModal("New model name:", currentName, (newName) => {
          if (!newName) return showNotification("Model edit cancelled (no name provided)", "warning");

          showPromptModal("New price:", currentPrice, (newPrice) => {
            if (!newPrice || isNaN(newPrice)) return showNotification("Invalid price. Edit cancelled.", "warning");

            showPromptModal("New discount (%):", currentDiscount, (newDiscount) => {
              if (!newDiscount || isNaN(newDiscount)) return showNotification("Invalid discount. Edit cancelled.", "warning");

              showPromptModal("New quantity:", currentQuantity, (newQuantity) => {
                if (!newQuantity || isNaN(newQuantity) || newQuantity < 0) return showNotification("Invalid quantity. Edit cancelled.", "warning");

                showPromptModal("New packages:", currentPackages, (newPackages) => {
                  if (!newPackages || isNaN(newPackages) || newPackages < 0) return showNotification("Invalid packages. Edit cancelled.", "warning");

                  fetch(`/api/models/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                      name: newName, 
                      price: newPrice, 
                      discount: newDiscount,
                      quantity: newQuantity,
                      packages: newPackages,
                      table 
                    }),
                  })
                  .then((res) => res.json())
                  .then(() => {
                    showNotification("Model updated", "success");
                    companyFilter.dispatchEvent(new Event("change"));
                  })
                  .catch(() => showNotification("Failed to update model", "error"));
                });
              });
            });
          });
        });
      });
    });

    document.querySelectorAll(".delete-model").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const table = btn.dataset.table;

        showConfirmNotification("Delete this model?", () => {
          fetch(`/api/models/${id}?table=${table}`, { method: "DELETE" })
            .then((res) => res.json())
            .then(() => {
              showNotification("Model deleted", "error");
              companyFilter.dispatchEvent(new Event("change"));
            })
            .catch(() => showNotification("Failed to delete model", "error"));
        });
      });
    });
  }
});