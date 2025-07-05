document.addEventListener("DOMContentLoaded", () => {
  const companyForm = document.getElementById("companyForm");
  const modelForm = document.getElementById("modelForm");
  const companySelector = document.getElementById("companySelector");
  const modelFields = document.getElementById("modelFields");

  fetch("/api/companies")
    .then((response) => response.json())
    .then((companies) => {
      companies.forEach((company) => {
        const option = document.createElement("option");
        option.value = company.table;
        option.textContent = company.table;
        companySelector.appendChild(option);
      });
    })
    .catch((error) => {
      console.error("Error fetching companies:", error);
    });

  companyForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const companyNameInput = document.getElementById("companyName");
    const companyName = companyNameInput.value;

    fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: companyName }),
    })
      .then((response) => response.json())
      .then((data) => {
        showNotification(`Company "${companyName}" created!`, "success");

        const option = document.createElement("option");
        option.value = data.table || companyName;
        option.textContent = data.table || companyName;
        companySelector.appendChild(option);

        companyForm.reset();
      })
      .catch((error) => {
        console.error("Error creating company:", error);
        showNotification("Failed to create company.", "error");
      });
  });

  companySelector.addEventListener("change", (e) => {
    modelFields.style.display = e.target.value ? "block" : "none";
  });

  modelForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("modelName").value;
    const price = document.getElementById("modelPrice").value;
    const discount = document.getElementById("modelDiscount").value;
    const quantity = document.getElementById("modelQuantity").value;
    const packages = document.getElementById("modelPackages").value;
    const table = companySelector.value;

    if (!table) {
      showNotification("Please select a company.", "warning");
      return;
    }

    fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, discount, quantity, packages, table }),
    })
      .then((res) => res.json())
      .then(() => {
        showNotification("Model added successfully!", "success");
        modelForm.reset();
        modelFields.style.display = "none";
      })
      .catch((error) => {
        console.error("Error adding model:", error);
        showNotification("Failed to add model.", "error");
      });
  });

  // Attach edit/delete handlers using event delegation
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
});
