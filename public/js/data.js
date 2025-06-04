document.addEventListener("DOMContentLoaded", () => {
  const companiesTableBody = document.getElementById("companiesTableBody");
  const companyFilter = document.getElementById("companyFilter");
  const modelsTable = document.getElementById("modelsTable").getElementsByTagName("tbody")[0];

  // Function to fetch and display companies
  function loadCompanies() {
    fetch("/api/companies-with-models")
      .then((response) => response.json())
      .then((companies) => {
        companiesTableBody.innerHTML = ''; // Clear existing rows before adding new ones
        companies.forEach((company) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${company.id}</td>
            <td id="companyName${company.id}">${company.name}</td>
            <td>${company.model_count}</td>
            <td>${company.created_at}</td>
            <td class="actions">
              <button class="edit-company" data-id="${company.id}">Edit</button>
              <button class="delete-company" data-id="${company.id}">Delete</button>
            </td>
          `;
          companiesTableBody.appendChild(row);
        });

        // Attach event listeners after the rows are added
        addEditDeleteListeners();
      })
      .catch((error) => {
        console.error("Error fetching companies:", error);
      });
  }

  // Function to add event listeners for Edit and Delete buttons
  function addEditDeleteListeners() {
    // Attach event listeners for editing company names
    document.querySelectorAll(".edit-company").forEach((button) => {
      button.addEventListener("click", (e) => {
        const companyId = e.target.getAttribute("data-id");
        const companyNameCell = document.getElementById(`companyName${companyId}`);
        const currentName = companyNameCell.textContent;

        const newName = prompt("Enter new company name:", currentName);
        if (newName && newName !== currentName) {
          // Update company name in the database
          fetch(`/api/companies/${companyId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName }),
          })
            .then(() => {
              companyNameCell.textContent = newName; // Update the name in the table
              alert("Company name updated successfully!");
            })
            .catch((error) => {
              console.error("Error updating company name:", error);
              alert("Failed to update company name.");
            });
        }
      });
    });

    // Attach event listeners for deleting companies
    document.querySelectorAll(".delete-company").forEach((button) => {
      button.addEventListener("click", (e) => {
        const companyId = e.target.getAttribute("data-id");

        // Confirm deletion
        if (confirm("Are you sure you want to delete this company?")) {
          // Send delete request to server
          fetch(`/api/companies/${companyId}`, {
            method: "DELETE",
          })
            .then((response) => response.json())
            .then((data) => {
              alert(data.message); // Show success message
              loadCompanies(); // Refresh the companies table
            })
            .catch((error) => {
              console.error("Error deleting company:", error);
              alert("Failed to delete company.");
            });
        }
      });
    });
  }

  // Load companies initially
  loadCompanies();

  // Fetch companies to populate the company filter
  fetch("/api/companies")
    .then((response) => response.json())
    .then((companies) => {
      companies.forEach((company) => {
        const option = document.createElement("option");
        option.value = company.id;
        option.textContent = company.name;
        companyFilter.appendChild(option);
      });
    });

  // Fetch and display models by company
  companyFilter.addEventListener("change", (e) => {
    const companyId = e.target.value;
    if (companyId) {
      fetch(`/api/models?company_id=${companyId}`)
        .then((response) => response.json())
        .then((models) => {
          modelsTable.innerHTML = "";
          models.forEach((model) => {
            const row = document.createElement("tr");
            row.setAttribute("data-id", model.id); // Make sure the data-id is set on the row itself
            row.innerHTML = `
              <td>${model.id}</td>
              <td id="modelName${model.id}" class="model-name">${model.name}</td>
              <td class="model-price">${model.price} DH</td>
              <td class="model-discount">${model.discount}%</td>
              <td>${model.created_at}</td>
              <td class="actions">
                <button class="edit-model" data-id="${model.id}">Edit</button>
                <button class="delete-model" data-id="${model.id}">Delete</button>
              </td>
            `;
            modelsTable.appendChild(row);
          });

          // Attach event listeners for editing models
          addEditDeleteModelListeners();
        })
        .catch((error) => {
          console.error("Error fetching models:", error);
        });
    } else {
      modelsTable.innerHTML = "";
    }
  });

  // Function to add event listeners for editing and deleting models
  function addEditDeleteModelListeners() {
    // Attach event listeners for editing models
    document.querySelectorAll(".edit-model").forEach((button) => {
      button.addEventListener("click", (e) => {
        const modelId = e.target.getAttribute("data-id");

        // Get the current model's details
        const modelRow = document.querySelector(`#modelsTableBody tr[data-id='${modelId}']`);
        const currentName = modelRow.querySelector(".model-name").textContent;
        const currentPrice = modelRow.querySelector(".model-price").textContent;
        const currentDiscount = modelRow.querySelector(".model-discount").textContent;

        // Prompt the user to update the model details
        const newName = prompt("Enter new model name:", currentName);
        const newPrice = prompt("Enter new model price:", currentPrice);
        const newDiscount = prompt("Enter new model discount:", currentDiscount);

        if (newName && newPrice && newDiscount) {
          // Send the updated data to the backend
          fetch(`/api/models/${modelId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName, price: newPrice, discount: newDiscount }),
          })
            .then((response) => response.json())
            .then(() => {
              modelRow.querySelector(".model-name").textContent = newName;
              modelRow.querySelector(".model-price").textContent = newPrice;
              modelRow.querySelector(".model-discount").textContent = newDiscount;
              alert("Model updated successfully!");
            })
            .catch((error) => {
              console.error("Error updating model:", error);
              alert("Failed to update model.");
            });
        }
      });
    });

    // Attach event listeners for deleting models
    document.querySelectorAll(".delete-model").forEach((button) => {
      button.addEventListener("click", (e) => {
        const modelId = e.target.getAttribute("data-id");

        // Confirm deletion
        if (confirm("Are you sure you want to delete this model?")) {
          // Send delete request to server
          fetch(`/api/models/${modelId}`, {
            method: "DELETE",
          })
            .then(() => {
              alert("Model deleted successfully!"); // Show success message
              // Refresh the model list after deletion
              companyFilter.dispatchEvent(new Event('change'));
            })
            .catch((error) => {
              console.error("Error deleting model:", error);
              alert("Failed to delete model.");
            });
        }
      });
    });
  }
});
