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
  const restoreBtn = document.getElementById("restoreModels");

  let selectedModels = JSON.parse(localStorage.getItem("selectedModels") || "[]");
  let selectedCompanyId = selectedModels.length > 0 ? selectedModels[0].table : null;
  let usedModelQuantities = {};
  let allModels = [];
  let selectedModel = null;

  // Try to restore selected company from previously selected model (if any)
  if (!selectedCompanyId && selectedModels.length > 0) {
    selectedCompanyId = selectedModels[0].table;
  }

  selectedModels.forEach(model => {
    const key = `${model.id}_${model.table}`;
    if (!usedModelQuantities[key]) {
      usedModelQuantities[key] = { quantity: 0, packages: 0 };
    }
    usedModelQuantities[key].quantity += model.quantity;
    usedModelQuantities[key].packages += model.packages;
  });

  loadCompanySelector();
  populateClientDropdown();
  updateSelectedModelsList();

  if (selectedCompanyId) {
    fetch(`/api/models?table=${selectedCompanyId}`)
      .then((res) => res.json())
      .then((models) => {
        allModels = models;
        setupModelSearch(models);
        updateSearchResults(models);
      });
  }

  function populateClientDropdown() {
    fetch("/api/clients")
      .then(res => res.json())
      .then(clients => {
        const clientSelector = document.getElementById("clientSelector");
        if (!clientSelector) return;

        clientSelector.innerHTML = '<option value="" disabled selected>Select Client</option>';
        clients.forEach(c => {
          const option = document.createElement("option");
          option.value = c.name;
          option.textContent = c.name;
          clientSelector.appendChild(option);
        });
      })
      .catch((err) => {
        showNotification("Failed to load clients", "error");
        console.error(err);
      });
  }

  function loadCompanySelector() {
    fetch("/api/companies")
      .then(response => response.json())
      .then(companies => {
        const selector = document.getElementById("companySelector");

        if (!selector || !Array.isArray(companies) || companies.length === 0) {
          console.warn("No companies returned from API.");
          return;
        }

        selector.innerHTML = `<option value="" disabled selected>Select Company</option>`;

        companies.forEach(company => {
          const name = company.name || company.table || company;
          const value = company.table || company.name || company;

          const option = document.createElement("option");
          option.value = value;
          option.textContent = name;
          selector.appendChild(option);
        });
      })
      .catch(error => {
        showNotification("Failed to load companies", "error");
        console.error("Company fetch error:", error);
      });
  }

  companySelector.addEventListener("change", (e) => {
    selectedCompanyId = e.target.value;
    usedModelQuantities = {};
    selectedModels.forEach(model => {
      const key = `${model.id}_${model.table}`;
      if (!usedModelQuantities[key]) {
        usedModelQuantities[key] = { quantity: 0, packages: 0 };
      }
      usedModelQuantities[key].quantity += model.quantity;
      usedModelQuantities[key].packages += model.packages;
    });

    searchModelExport.value = "";
    searchResultsExport.innerHTML = "";

    if (selectedModels.length > 0) {
      selectedModels.forEach(model => {
        const key = `${model.id}_${model.table}`;
        if (!usedModelQuantities[key]) {
          usedModelQuantities[key] = { quantity: 0, packages: 0 };
        }
        usedModelQuantities[key].quantity += model.quantity;
        usedModelQuantities[key].packages += model.packages;
      });
    }
    if (selectedCompanyId) {
      fetch(`/api/models?table=${selectedCompanyId}`)
        .then((response) => response.json())
        .then((models) => {
          allModels = models;
          setupModelSearch(models);
          updateSearchResults(models);
        });
    }
  });

  function setupModelSearch(models) {
    searchModelExport.addEventListener("click", () => {
      updateSearchResults(models);
    });

    searchModelExport.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filtered = models.filter((m) =>
        m.name.toLowerCase().includes(searchTerm)
      );
      updateSearchResults(filtered);
    });
  }

  quantityInput.addEventListener("input", updatePairs);
  packagesInput.addEventListener("input", updatePairs);

  function updatePairs() {
    const quantity = parseInt(quantityInput.value);
    const packages = parseInt(packagesInput.value);

    if (quantity && packages) {
      const pairs = quantity / packages;
      pairsInput.value = pairs.toFixed(2);
    }
  }

  function updateSearchResults(models) {
    searchResultsExport.innerHTML = models
      .map((model) => {
        const key = `${model.id}_${selectedCompanyId}`;
        const used = usedModelQuantities[key] || { quantity: 0, packages: 0 };
        const availableQty = Math.max(0, model.quantity - used.quantity);
        const availablePkg = Math.max(0, model.packages - used.packages);
        const inStock = availableQty > 0 && availablePkg > 0;
        const stockStatus = inStock
          ? `<span style="color: #2ecc71; font-weight: bold;">✅ In Stock</span>`
          : `<span style="color: #e74c3c; font-weight: bold;">❌ Out of Stock</span>`;

        return `
          <div class="search-result ${!inStock ? "disabled-model" : ""}"
            data-id="${model.id}"
            data-name="${model.name}"
            data-price="${model.price}"
            data-discount="${model.discount}"
            data-quantity="${model.quantity}"
            data-packages="${model.packages}"
            style="
              padding: 10px 16px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
              justify-content: flex-start;
              align-items: center;
              font-size: 15px;
              line-height: 1.4;
              cursor: ${inStock ? 'pointer' : 'not-allowed'};
              background-color: ${inStock ? '#000' : 'rgba(0, 0, 0, 0.5)'};
              color: ${inStock ? '#f0f0f0' : '#777'};
              opacity: ${inStock ? '1' : '0.6'};
              transition: background-color 0.3s, color 0.3s, opacity 0.3s;
            ">
            <span style="font-weight: bold; font-size: 16px; color: #00e6ff;">
              ${model.name}
            </span>
            <span style="color: #fff;">|</span>
            <span style="color: #27ae60;">💰 ${model.price} DH</span>
            <span style="color: #fff;">|</span>
            <span style="color: #f39c12;">🎯 ${parseFloat(model.discount).toFixed(2)}% Off</span>
            <span style="color: #fff;">|</span>
            <span style="color: #2980b9;">📊 ${availableQty} qty</span>
            <span style="color: #fff;">|</span>
            <span style="color: #9b59b6;">📦 ${availablePkg} pkg</span>
            <span style="color: #fff;">|</span>
            ${stockStatus}
          </div>
        `;
      })
      .join("");

    document.querySelectorAll(".search-result").forEach((result) => {
      result.addEventListener("click", (e) => {
        const modelDiv = e.target.closest(".search-result");
        const modelName = modelDiv.getAttribute("data-name");
        const modelPrice = modelDiv.getAttribute("data-price");
        const modelDiscount = modelDiv.getAttribute("data-discount");
        const modelQuantity = parseInt(modelDiv.getAttribute("data-quantity"));
        const modelPackages = parseInt(modelDiv.getAttribute("data-packages"));

        if (modelQuantity <= 0 || modelPackages <= 0) {
          showNotification("⚠️ This model is out of stock and cannot be selected.", "warning");
          return;
        }

        if (result.classList.contains("disabled-model")) {
          showNotification("⚠️ This model is out of stock and cannot be selected.", "warning");
          return;
        }

        searchModelExport.value = modelName;

        selectedModel = {
          id: modelDiv.getAttribute("data-id"),
          name: modelName,
          price: modelPrice,
          discount: modelDiscount,
        };

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

  document.addEventListener("click", (e) => {
    const isClickInsideSearch = searchModelExport.contains(e.target) || searchResultsExport.contains(e.target);
    if (!isClickInsideSearch) {
      searchResultsExport.innerHTML = "";
    }
  });

  if (addModelDetailsButton) {
    addModelDetailsButton.addEventListener("click", () => {
      const quantity = parseInt(quantityInput.value);
      const packages = parseInt(packagesInput.value);

      if (!selectedModel || !selectedCompanyId) {
        showNotification("⚠️ No model selected.", "warning");
        return;
      }

      const stockModel = allModels.find(m => m.id.toString() === selectedModel.id.toString());
      if (!stockModel) {
        showNotification("Model not found in stock.", "error");
        return;
      }

      const key = `${selectedModel.id}_${selectedCompanyId}`;
      const alreadyUsed = usedModelQuantities[key] || { quantity: 0, packages: 0 };
      const availableQuantity = stockModel.quantity - alreadyUsed.quantity;
      const availablePackages = stockModel.packages - alreadyUsed.packages;

      if (quantity > availableQuantity) {
        showNotification(`Only ${availableQuantity} Quantity available.`, "error");
        return;
      }
      if (packages > availablePackages) {
        showNotification(`Only ${availablePackages} Packages available.`, "error");
        return;
      }

      const pairs = parseFloat(pairsInput.value);
      const discount = parseFloat(document.getElementById("modelDiscountInput").value);

      if (!quantity || !packages || isNaN(pairs) || isNaN(discount)) {
        showNotification("⚠️ Please fill in all fields.", "warning");
        return;
      }

      selectedModels.push({
        uid: selectedModel.id + "_" + Date.now(),
        id: selectedModel.id,
        name: selectedModel.name,
        price: selectedModel.price,
        discount,
        quantity,
        packages,
        pairs,
        table: selectedCompanyId,
      });

      if (!usedModelQuantities[key]) {
        usedModelQuantities[key] = { quantity: 0, packages: 0 };
      }
      usedModelQuantities[key].quantity += quantity;
      usedModelQuantities[key].packages += packages;

      localStorage.setItem("selectedModels", JSON.stringify(selectedModels));

      quantityInput.value = "";
      packagesInput.value = "";
      pairsInput.value = "";
      searchModelExport.value = "";
      modelDetails.style.display = "none";

      updateSelectedModelsList();
      updateSearchResults(allModels);
    });
  }

  function updateSelectedModelsList() {
    if (selectedModels.length === 0) {
      selectedModelsList.innerHTML = `
        <div class="empty-message">No models selected.</div>
      `;
      return;
    }

    selectedModelsList.innerHTML = `
      <table class="selected-models-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Quantity</th>
            <th>Packages</th>
            <th>Pairs</th>
            <th>Discount (%)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${selectedModels
            .map(
              (model) => `
                <tr>
                  <td class="model-name">${model.name}</td>
                  <td>${model.quantity}</td>
                  <td>${model.packages}</td>
                  <td>${model.pairs}</td>
                  <td class="model-discount">${parseFloat(model.discount).toFixed(2)}%</td>
                  <td>
                    <div class="model-actions">
                      <button class="edit-model" data-uid="${model.uid}">Edit</button>
                      <button class="delete-model" data-uid="${model.uid}">Remove</button>
                    </div>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `;

    document.querySelectorAll(".edit-model").forEach((button) => {
      button.addEventListener("click", () => {
        const modelUid = button.getAttribute("data-uid");
        const model = selectedModels.find((m) => m.uid === modelUid);
        if (!model) return;

        const key = `${model.id}_${model.table}`;
        const baseModel = allModels.find((m) => `${m.id}_${model.table}` === key);
        if (!baseModel) return;

        let usedQty = 0;
        let usedPkg = 0;
        selectedModels.forEach((m) => {
          const k = `${m.id}_${m.table}`;
          if (k === key && m.uid !== model.uid) {
            usedQty += m.quantity;
            usedPkg += m.packages;
          }
        });

        const availableQty = baseModel.quantity - usedQty;
        const availablePkg = baseModel.packages - usedPkg;

        showPromptModal(`Edit quantity (max ${availableQty}):`, model.quantity, (newQuantity) => {
          if (!newQuantity || isNaN(newQuantity) || newQuantity > availableQty) {
            return showNotification(`⚠️ Invalid quantity. Only ${availableQty} available.`, "warning");
          }

          showPromptModal(`Edit packages (max ${availablePkg}):`, model.packages, (newPackages) => {
            if (!newPackages || isNaN(newPackages) || newPackages > availablePkg) {
              return showNotification(`⚠️ Invalid packages. Only ${availablePkg} available.`, "warning");
            }

            const calculatedPairs = (parseInt(newQuantity) / parseInt(newPackages)).toFixed(2);

            showPromptModal("Edit discount:", model.discount, (newDiscount) => {
              if (!newDiscount || isNaN(newDiscount)) {
                return showNotification("⚠️ Invalid discount", "warning");
              }

              model.quantity = parseInt(newQuantity);
              model.packages = parseInt(newPackages);
              model.pairs = parseFloat(calculatedPairs);
              model.discount = parseFloat(newDiscount);

              localStorage.setItem("selectedModels", JSON.stringify(selectedModels));
              updateSelectedModelsList();

              usedModelQuantities = {};
              selectedModels.forEach((m) => {
                const k = `${m.id}_${m.table}`;
                if (!usedModelQuantities[k]) {
                  usedModelQuantities[k] = { quantity: 0, packages: 0 };
                }
                usedModelQuantities[k].quantity += m.quantity;
                usedModelQuantities[k].packages += m.packages;
              });

              updateSearchResults(allModels);
              setupModelSearch(allModels);
              showNotification("Model updated successfully", "success");
            });
          });
        });
      });
    });

    document.querySelectorAll(".delete-model").forEach((button) => {
      button.addEventListener("click", (e) => {
        const modelUid = e.target.getAttribute("data-uid");
        showConfirmNotification("Remove this model from selection?", () => {
          selectedModels = selectedModels.filter((model) => model.uid !== modelUid);
          usedModelQuantities = {};
          selectedModels.forEach(model => {
            const key = `${model.id}_${model.table}`;
            if (!usedModelQuantities[key]) {
              usedModelQuantities[key] = { quantity: 0, packages: 0 };
            }
            usedModelQuantities[key].quantity += model.quantity;
            usedModelQuantities[key].packages += model.packages;
          });

          localStorage.setItem("selectedModels", JSON.stringify(selectedModels));
          updateSelectedModelsList();
          updateSearchResults(allModels);
          setupModelSearch(allModels);
        });
      });
    });
  }

  const clearButton = document.getElementById("clearModels");
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      if (selectedModels.length === 0) {
        showNotification("⚠️ There are no models to clear.", "warning");
        return;
      }

      showConfirmNotification("Are you sure you want to clear all selected models?", () => {
        selectedModels = [];
        usedModelQuantities = {};
        localStorage.removeItem("selectedModels");
        updateSelectedModelsList();
        updateSearchResults(allModels);
      });
    });
  }

  if (exportForm) {
    exportForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const clientName = document.getElementById("clientSelector").value;
      if (!clientName || selectedModels.length === 0) {
        showNotification("Please fill in the Client Name and add at least one model.", "warning" );
        return;
      }
      // Call PDF generation from export-pdf.js
      generatePDF(selectedModels, clientName, selectedCompanyId, allModels, () => {
        // ✅ SAVE THE BACKUP BEFORE RESETTING
        localStorage.setItem("lastExportBackup", JSON.stringify(selectedModels));
        localStorage.setItem("lastClientBackup", clientName);

        selectedModels = [];
        usedModelQuantities = {};
        localStorage.removeItem("selectedModels");
        updateSelectedModelsList();
        updateSearchResults(allModels);
      });
    });
  }

  if (restoreBtn) {
    restoreBtn.addEventListener("click", () => {
      const backupData = localStorage.getItem("lastExportBackup");

      if (!backupData || backupData === "[]" || backupData.trim() === "") {
        showNotification("⚠️ No models were found in the last export.", "warning");
        return;
      }

      let backupModels;
      try {
        backupModels = JSON.parse(backupData);
      } catch (err) {
        showNotification("❌ Failed to read backup data.", "error");
        return;
      }

      if (!Array.isArray(backupModels) || backupModels.length === 0) {
        showNotification("⚠️ Backup exists but contains no models.", "warning");
        return;
      }

      const lastClient = localStorage.getItem("lastClientBackup");

      const finishRestore = () => {
        selectedModels = backupModels;
        localStorage.setItem("selectedModels", JSON.stringify(selectedModels));

        usedModelQuantities = {};
        selectedModels.forEach(model => {
          const key = `${model.id}_${model.table}`;
          if (!usedModelQuantities[key]) {
            usedModelQuantities[key] = { quantity: 0, packages: 0 };
          }
          usedModelQuantities[key].quantity += model.quantity;
          usedModelQuantities[key].packages += model.packages;
        });

        if (lastClient) {
          document.getElementById("clientSelector").value = lastClient;
        }

        updateSelectedModelsList();
        updateSearchResults(allModels);
        showNotification("🔁 Last exported models restored.", "success");
      };

      if (allModels.length === 0) {
        fetch(`/api/models?table=${backupModels[0].table}`)
          .then(res => res.json())
          .then(models => {
            allModels = models;
            setupModelSearch(models);
            finishRestore();
          })
          .catch(() => {
            showNotification("❌ Could not load models for restore.", "error");
          });
      } else {
        finishRestore();
      }
    });
  }
});