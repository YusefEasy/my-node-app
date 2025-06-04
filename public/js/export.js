document.addEventListener("DOMContentLoaded", () => {
  const companySelector = document.getElementById("companySelector");
  const searchModelExport = document.getElementById("searchModelExport");
  const searchResultsExport = document.getElementById("searchResultsExport");
  const selectedModelsList = document.getElementById("selectedModelsList");
  const modelDetails = document.getElementById("modelDetails");
  const quantityInput = document.getElementById("quantity");
  const packagesInput = document.getElementById("packages");
  const pairsInput = document.getElementById("pairs");
  const addModelDetailsButton = document.getElementById("addModelDetails");
  const exportForm = document.getElementById("exportForm");

  let selectedCompanyId = null;
  let selectedModels = [];
  let selectedModel = null; // Declare selectedModel globally

  // Fetch companies to populate the company selector
  fetch("/api/companies")
    .then((response) => response.json())
    .then((companies) => {
      companies.forEach((company) => {
        const option = document.createElement("option");
        option.value = company.id;
        option.textContent = company.name;
        companySelector.appendChild(option);
      });
    })
    .catch((error) => console.error("Error fetching companies:", error));

  // When a company is selected, fetch models for that company
  companySelector.addEventListener("change", (e) => {
    selectedCompanyId = e.target.value;
    searchModelExport.value = ""; // Clear the search input when changing company
    searchResultsExport.innerHTML = ""; // Clear the previous search results

    if (selectedCompanyId) {
      fetch(`/api/models?company_id=${selectedCompanyId}`)
        .then((response) => response.json())
        .then((models) => {
          // Handle the click on the search input to show models
          searchModelExport.addEventListener("click", () => {
            updateSearchResults(models); // Show all models immediately
          });

          // Handle typing input to filter models
          searchModelExport.addEventListener("input", (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredModels = models.filter((m) =>
              m.name.toLowerCase().includes(searchTerm)
            );
            updateSearchResults(filteredModels);
          });
        })
        .catch((error) => console.error("Error fetching models:", error));
    }
  });

    // Listen for changes in Quantity or Packages fields
    quantityInput.addEventListener("input", updatePairs);
    packagesInput.addEventListener("input", updatePairs);

    function updatePairs() {
      const quantity = parseInt(quantityInput.value);
      const packages = parseInt(packagesInput.value);

      // If both Quantity and Packages are provided, calculate Pairs
      if (quantity && packages) {
        const pairs = quantity / packages;
        pairsInput.value = pairs.toFixed(2); // Automatically update Pairs with two decimal places
      }
    }

  // Update the search results based on filtered models
  function updateSearchResults(models) {
    searchResultsExport.innerHTML = models
      .map(
        (model) => `
      <div class="search-result" data-id="${model.id}" data-name="${model.name}" data-price="${model.price}" data-discount="${model.discount}" style="padding: 12px; border-bottom: 1px solid #ddd; cursor: pointer; transition: all 0.3s ease; background: ${document.body.classList.contains("dark-mode") ? "#444" : "#f9f9f9"};">
        <strong style="color: ${document.body.classList.contains("dark-mode") ? "#00e6ff" : "#3498db"};">${model.name}</strong>: <span class="currency" style="color: #27ae60;">${model.price} DH</span> <span style="color: #f39c12;">(${model.discount}% Off)</span>
      </div>
    `
      )
      .join("");

    // Add event listeners for selecting models from search results
    document.querySelectorAll(".search-result").forEach((result) => {
      result.addEventListener("click", (e) => {
        const modelDiv = e.target.closest(".search-result");
        const modelName = modelDiv.getAttribute("data-name");
        const modelPrice = modelDiv.getAttribute("data-price");
        const modelDiscount = modelDiv.getAttribute("data-discount");

        searchModelExport.value = modelName;

        selectedModel = {
          id: modelDiv.getAttribute("data-id"),
          name: modelName,
          price: modelPrice,
          discount: modelDiscount,
        };

        // Populate the discount input with the current model discount
        document.getElementById("modelDiscountInput").value = modelDiscount;

        searchResultsExport.innerHTML = "";
        modelDetails.style.display = "block";
      });

      result.addEventListener("mouseenter", () => {
        result.style.transform = "translateY(-2px)";
        result.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
      });

      result.addEventListener("mouseleave", () => {
        result.style.transform = "translateY(0)";
        result.style.boxShadow = "none";
      });
    });
  }

  // Add event listener to hide search results when clicking outside
  document.addEventListener("click", (e) => {
    const isClickInsideSearch = searchModelExport.contains(e.target) || searchResultsExport.contains(e.target);
    if (!isClickInsideSearch) {
      searchResultsExport.innerHTML = "";  // Hide search results when clicking outside
    }
  });

  // Add model details to the selected models list
  if (addModelDetailsButton) {
    addModelDetailsButton.addEventListener("click", () => {
      const quantity = parseInt(quantityInput.value);
      const packages = parseInt(packagesInput.value);
      let pairs = parseInt(pairsInput.value);

      // Automatically calculate pairs if quantity and packages are provided
      if (quantity && packages && isNaN(pairs)) {
        pairs = quantity / packages;
        pairsInput.value = pairs.toFixed(2); // Set the calculated pairs with 2 decimal points
      }

      const discount = document.getElementById("modelDiscountInput").value;

      if (!quantity || !packages || !pairs || !discount) {
        alert("Please fill in all fields.");
        return;
      }

      selectedModels.push({
        ...selectedModel,
        quantity,
        packages,
        pairs,
        discount,
      });

      // Clear the input fields
      quantityInput.value = "";
      packagesInput.value = "";
      pairsInput.value = "";
      searchModelExport.value = "";

      modelDetails.style.display = "none";

      updateSelectedModelsList();
    });
  }

  // Update selected models list
  function updateSelectedModelsList() {
    selectedModelsList.innerHTML = selectedModels
      .map(
        (model) => `
        <div class="selected-model" style="
          padding: 12px;
          margin-bottom: 10px;
          border: 1px solid ${document.body.classList.contains("dark-mode") ? "#555" : "#ddd"};
          border-radius: 8px;
          background: ${document.body.classList.contains("dark-mode") ? "#444" : "#fff"};
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s ease;
          font-family: 'Roboto', sans-serif; /* Custom Font for All Text */
        ">
          <div style="flex-grow: 1;">
            <strong style="color: ${document.body.classList.contains("dark-mode") ? "#00e6ff" : "#3498db"};">${model.name}</strong>:
            
            <span style="
              color: ${document.body.classList.contains("dark-mode") ? "#e0e0e0" : "#555"};
              font-weight: bold;
              font-size: 0.9em;
              font-family: 'Roboto', sans-serif;
              transition: all 0.3s ease;
            ">Quantity: ${model.quantity}</span>,
            
            <span style="
              color: ${document.body.classList.contains("dark-mode") ? "#e0e0e0" : "#555"};
              font-weight: bold;
              font-size: 0.9em;
              font-family: 'Roboto', sans-serif;
              transition: all 0.3s ease;
            ">Packages: ${model.packages}</span>,
            
            <span style="
              color: ${document.body.classList.contains("dark-mode") ? "#e0e0e0" : "#555"};
              font-weight: bold;
              font-size: 0.9em;
              font-family: 'Roboto', sans-serif;
              transition: all 0.3s ease;
            ">Pairs: ${model.pairs}</span>,
            
            <span style="
              color: ${document.body.classList.contains("dark-mode") ? "#e74c3c" : "#c0392b"};
              font-weight: bold;
              font-size: 1.1em;
              font-family: 'Roboto', sans-serif;
              transition: all 0.3s ease;
            ">Discount: ${model.discount}%</span>
          </div>
          
          <button class="remove-model" data-id="${model.id}" style="
            padding: 6px 12px;
            background: #e74c3c;
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Roboto', sans-serif; /* Font for Button */
          ">Remove</button>
        </div>
      `
      )
      .join("");
  
    // Remove model button functionality
    document.querySelectorAll(".remove-model").forEach((button) => {
      button.addEventListener("click", (e) => {
        const modelId = e.target.getAttribute("data-id");
        selectedModels = selectedModels.filter((model) => model.id !== modelId);
        updateSelectedModelsList();
      });
    });
  }  

  // Handle form submission (for exporting)
  if (exportForm) {
    exportForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const vendorName = document.getElementById("vendorName").value;
      if (!vendorName || selectedModels.length === 0) {
        alert("Please fill in the Vendor Name and add at least one model.");
        return;
      }
      generatePDF(selectedModels, vendorName);
    });
  }

  // Generate and open the PDF
  function generatePDF(selectedModels, vendorName) {
    const subTotalBeforeDiscount = selectedModels.reduce((sum, model) => sum + model.quantity * model.price, 0);
    const totalDiscount = selectedModels.reduce((sum, model) => sum + (model.quantity * model.price * (model.discount / 100)), 0);
    const subTotalAfterDiscount = subTotalBeforeDiscount - totalDiscount;
    const totalPackage = selectedModels.reduce((sum, model) => sum + parseInt(model.packages), 0);

    const docDefinition = {
      info: {
        title: "AFAK PLASTIC", // Custom title for the PDF (for preview in browser)
        author: "AFAK Company",
        subject: "Billing Invoice",
      },
      content: [
        // Larger header text for "AFAK PLASTIC"
        {
          text: "AFAK PLASTIC",
          style: "header",
          alignment: "center",
          margin: [0, 0, 0, 10],  // Added margin to give space below
        },
        {
          text: `Date: ${new Date().toLocaleDateString()}`,
          style: "subheader",
          margin: [0, 0, 0, 10],
          alignment: "left",
        },
        {
          text: `Vendor: ${vendorName}`,
          style: "subheader",
          margin: [0, 0, 0, 20],
          alignment: "left",
        },
        {
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto", "auto", "auto", "auto", "auto"],
            body: [
              [
                { text: "Modèle", style: "tableHeader" },
                { text: "P.U T.T.C (DH)", style: "tableHeader" },
                { text: "Remise (%)", style: "tableHeader" },
                { text: "P.U Remise T.T.C (DH)", style: "tableHeader" },
                { text: "Quantité", style: "tableHeader" },
                { text: "Nbr/Colis", style: "tableHeader" },
                { text: "Paires", style: "tableHeader" },
                { text: "Montant TTC Remise (DH)", style: "tableHeader" },
              ],
              ...selectedModels.map((model) => [
                model.name,
                `${model.price} DH`,
                `${model.discount} %`,
                `${(model.price * (1 - model.discount / 100)).toFixed(2)} DH`,  // Price after discount
                model.quantity,
                model.packages,
                model.pairs,
                `${(model.quantity * model.price * (1 - model.discount / 100))} DH`,
              ]),
            ],
          },
          style: "table",
        },
        // New table for totals (Before Discount, Total Discount, Total After Discount, Total Package)
        {
          table: {
            widths: ["auto", "auto", "auto", "auto"],
            body: [
              [
                { text: "Total T.T.C", style: "tableHeader" },
                { text: "Total Remise", style: "tableHeader" },
                { text: "Net a payer T.T.C", style: "tableHeader" },
                { text: "Total De Colis", style: "tableHeader" },
              ],
              [
                `${subTotalBeforeDiscount} DH`,
                `${totalDiscount} DH`,
                `${subTotalAfterDiscount} DH`,
                `${totalPackage} TP`,
              ],
            ],
          },
          style: "tableTotals",
        }
      ],
      styles: {
        header: {
          fontSize: 25,  // Increased font size for "BILLING AFAK"
          bold: true,
          alignment: "center",
          margin: [0, 0, 0, 10], // Margin below header
        },
        subheader: {
          bold: true,
          fontSize: 14,  // Adjusted subheader font size
          alignment: "center",
          margin: [0, 0, 0, 20],  // Margin below subtitle
        },
        tableHeader: {
          bold: true,
          fontSize: 10,  // Reduced font size for table headers
          color: "#000000", // Removed the background color
          alignment: "center",
          padding: [5, 8],  // Reduced padding for compactness
        },
        table: {
          margin: [0, 10],  // Reduced margin
          fontSize: 10,  // Reduced font size for table content
          alignment: "center",
          lineHeight: 1.3,  // Adjusted line height for compactness
        },
        tableTotals: {
          margin: [0, 10],  // Reduced margin for the totals table
          fontSize: 10,  // Reduced font size for totals table
          alignment: "center",
          lineHeight: 1.3,  // Adjusted line height for compactness
          fontWeight: "bold",
        },
        footerStyle: {
          fontSize: 8,  // Reduced footer font size
          color: "#7f8c8d",
          margin: [0, 10, 0, 0],
        },
      },
      footer: function (currentPage, pageCount) {
        return {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: "center",
          style: "footer",
        };
      },
    };

    // Open the PDF in a preview window
    pdfMake.createPdf(docDefinition).open();
  }
});
