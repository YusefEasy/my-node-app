document.addEventListener("DOMContentLoaded", () => {
  // Fetch companies to populate the company filter
  fetch("/api/companies")
    .then((response) => response.json())
    .then((companies) => {
      const companySelector = document.getElementById("companySelector");
      companies.forEach((company) => {
        const option = document.createElement("option");
        option.value = company.id;
        option.textContent = company.name;
        companySelector.appendChild(option);
      });
    });

  // Handle company creation
  const companyForm = document.getElementById("companyForm");
  companyForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const companyName = document.getElementById("companyName").value;

    fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: companyName }),
    })
      .then((response) => response.json())
      .then((company) => {
        alert(`Company "${company.name}" created successfully!`);
        // Add the new company to the company selector dropdown
        const companySelector = document.getElementById("companySelector");
        const option = document.createElement("option");
        option.value = company.id;
        option.textContent = company.name;
        companySelector.appendChild(option);
        // Reset the company form
        companyForm.reset();
      })
      .catch((error) => {
        console.error("Error creating company:", error);
        alert("Failed to create company.");
      });
  });

  // Handle model creation
  const modelForm = document.getElementById("modelForm");
  const modelFields = document.getElementById("modelFields");

  const companySelector = document.getElementById("companySelector");

  // Show model fields only when a company is selected
  companySelector.addEventListener("change", (e) => {
    if (e.target.value) {
      modelFields.style.display = "block"; // Show fields
    } else {
      modelFields.style.display = "none"; // Hide fields if no company selected
    }
  });

  modelForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const companyId = companySelector.value;
    const name = document.getElementById("modelName").value;
    const price = document.getElementById("modelPrice").value;
    const discount = document.getElementById("modelDiscount").value;

    fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, discount, company_id: companyId }),
    })
      .then(() => {
        modelForm.reset();
        modelFields.style.display = "none"; // Hide fields again
        alert("Model added successfully!");
      })
      .catch((error) => {
        console.error("Error adding model:", error);
        alert("Failed to add model.");
      });
  });
});