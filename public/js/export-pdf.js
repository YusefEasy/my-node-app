async function generatePDF(selectedModels, clientName, selectedCompanyId, allModels, onExportSuccess) {
  const invalid = selectedModels.find(model => model.quantity <= 0 || model.packages <= 0);
  if (invalid) {
    showNotification(`Model "${invalid.name}" has invalid Quantity or Packages.`, "error");
    return;
  }

  showNotification("🔍 Checking live stock before export...", "info");

  const table = selectedModels[0].table;
  let liveModels = [];

  try {
    const res = await fetch(`/api/models?table=${table}`);
    liveModels = await res.json();
  } catch (err) {
    showNotification("Failed to fetch live stock data.", "error");
    return;
  }

  for (const selected of selectedModels) {
    const live = liveModels.find(m => m.id.toString() === selected.id.toString());
    if (!live) {
      showNotification(`Model "${selected.name}" no longer exists.`, "error");
      return;
    }

    if (selected.quantity > live.quantity || selected.packages > live.packages) {
      showNotification(
        `❌ Not enough stock for "${selected.name}". Available: ${live.quantity} qty, ${live.packages} pkg.`,
        "error"
      );
      return;
    }
  }

  const subTotalBeforeDiscount = selectedModels.reduce((sum, model) => sum + model.quantity * model.price, 0);
  const totalDiscount = selectedModels.reduce((sum, model) => sum + (model.quantity * model.price * (model.discount / 100)), 0);
  const subTotalAfterDiscount = subTotalBeforeDiscount - totalDiscount;
  const totalPackage = selectedModels.reduce((sum, model) => sum + parseInt(model.packages), 0);

  const docDefinition = {
    info: {
      title: "AFAK PLASTIC",
      author: "AFAK Company",
      subject: "Billing Invoice",
    },
    content: [
      {
        text: "AFAK PLASTIC",
        style: "header",
        alignment: "center",
        margin: [0, 0, 0, 10],
      },
      {
        text: `Date: ${new Date().toLocaleDateString()}`,
        style: "subheader",
        margin: [0, 0, 0, 10],
        alignment: "left",
      },
      {
        text: `Client: ${clientName}`,
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
              `${(model.price * (1 - model.discount / 100)).toFixed(2)} DH`,
              model.quantity,
              model.packages,
              model.pairs,
              `${(model.quantity * model.price * (1 - model.discount / 100))} DH`,
            ]),
          ],
        },
        style: "table",
      },
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
        fontSize: 25,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 10],
      },
      subheader: {
        bold: true,
        fontSize: 14,
        alignment: "center",
        margin: [0, 0, 0, 20],
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: "#000000",
        alignment: "center",
        padding: [5, 8],
      },
      table: {
        margin: [0, 10],
        fontSize: 10,
        alignment: "center",
        lineHeight: 1.3,
      },
      tableTotals: {
        margin: [0, 10],
        fontSize: 10,
        alignment: "center",
        lineHeight: 1.3,
        fontWeight: "bold",
      },
      footerStyle: {
        fontSize: 8,
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

  const enrichedModels = selectedModels.map(model => ({
    ...model,
    table: selectedCompanyId
  }));

  fetch("/api/exports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientName,
      data: enrichedModels
    })
  })
  .then(async (res) => {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const { invoiceNumber } = json;

      docDefinition.content.unshift({
        text: `Invoice #: ${invoiceNumber}`,
        style: "subheader",
        margin: [0, 0, 0, 10],
        alignment: "left"
      });

      pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
        fetch("/api/save-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceNumber,
            pdf: Array.from(new Uint8Array(buffer))
          })
        })
        .then(() => {
          pdfMake.createPdf(docDefinition).open();
        })
        .catch(() => {
          showNotification("PDF saved locally but not to server", "warning");
          pdfMake.createPdf(docDefinition).open();
        });
      });

      showNotification(`Export saved (Invoice ${invoiceNumber})`, "success");
      if (typeof onExportSuccess === "function") onExportSuccess();
    } catch (err) {
      console.error("Failed to parse export response:", err);
      showNotification("Failed to save export (invalid response)", "error");
    }
  })
  .catch((err) => {
    console.error("Export fetch failed:", err);
    showNotification("Failed to save export (network error)", "error");
  });
}