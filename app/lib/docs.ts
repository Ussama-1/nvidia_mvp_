import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
} from "docx";

const exportQuotationDoc = async (quotationResult) => {
  if (!quotationResult) return;

  try {
    const doc = new Document({
      creator: "Construction Quotation System",
      title: "Construction Material Quotation",
      description:
        "Professional construction material cost analysis and quotation",
      sections: [
        {
          properties: {},
          children: [
            // Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "CONSTRUCTION MATERIAL QUOTATION",
                  bold: true,
                  size: 32,
                  color: "2E86AB",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),

           
            new Paragraph({
              children: [
                new TextRun({ text: "Generated: ", bold: true }),
                new TextRun({
                  text: new Date(quotationResult.timestamp).toLocaleString(),
                }),
              ],
              spacing: { after: 100 },
            }),

           

            // Video Analysis Summary
            new Paragraph({
              children: [
                new TextRun({
                  text: "Video Analysis Summary",
                  bold: true,
                  size: 24,
                  color: "1B4F72",
                }),
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 200 },
            }),

            new Paragraph({
              children: [new TextRun({ text: quotationResult.videoSummary })],
              spacing: { after: 400 },
            }),

            // Materials Table Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "Material Breakdown",
                  bold: true,
                  size: 24,
                  color: "1B4F72",
                }),
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 200 },
            }),

            // Materials Table
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              columnWidths: [800, 3500, 1000, 1200, 1200],
              rows: [
                // Header Row
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Item",
                              bold: true,
                              color: "000000",
                              size: 22,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      shading: { fill: "E8E8E8" },
                      margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Description",
                              bold: true,
                              color: "000000",
                              size: 22,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      shading: { fill: "E8E8E8" },
                      margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Quantity",
                              bold: true,
                              color: "000000",
                              size: 22,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      shading: { fill: "E8E8E8" },
                      margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Unit Price",
                              bold: true,
                              color: "000000",
                              size: 22,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      shading: { fill: "E8E8E8" },
                      margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Total",
                              bold: true,
                              color: "000000",
                              size: 22,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      shading: { fill: "E8E8E8" },
                      margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                  ],
                }),
                // Material Rows
                ...quotationResult.materials.map(
                  (material, index) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: `${index + 1}.`,
                                  bold: true,
                                  size: 20,
                                }),
                              ],
                              alignment: AlignmentType.CENTER,
                            }),
                          ],
                          margins: {
                            top: 200,
                            bottom: 200,
                            left: 200,
                            right: 200,
                          },
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: material.name,
                                  bold: true,
                                  size: 20,
                                }),
                              ],
                            }),
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: material.description,
                                  size: 18,
                                }),
                              ],
                            }),
                          ],
                          margins: {
                            top: 200,
                            bottom: 200,
                            left: 200,
                            right: 200,
                          },
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: `${material.quantity} ${material.unit}`,
                                  size: 20,
                                }),
                              ],
                              alignment: AlignmentType.CENTER,
                            }),
                          ],
                          margins: {
                            top: 200,
                            bottom: 200,
                            left: 200,
                            right: 200,
                          },
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: `${material.unitPrice.toFixed(2)}`,
                                  size: 20,
                                }),
                              ],
                              alignment: AlignmentType.CENTER,
                            }),
                          ],
                          margins: {
                            top: 200,
                            bottom: 200,
                            left: 200,
                            right: 200,
                          },
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: `${material.totalPrice.toFixed(2)}`,
                                  bold: true,
                                  size: 20,
                                }),
                              ],
                              alignment: AlignmentType.CENTER,
                            }),
                          ],
                          margins: {
                            top: 200,
                            bottom: 200,
                            left: 200,
                            right: 200,
                          },
                        }),
                      ],
                    })
                ),
              ],
            }),

            // Total Cost Section
            new Paragraph({
              children: [
                new TextRun({
                  text: `TOTAL MATERIAL COST: $${quotationResult.totalCost.toFixed(
                    2
                  )}`,
                  bold: true,
                  size: 28,
                  color: "1B4F72",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 400, after: 400 },
              border: {
                top: { style: "single", size: 6, color: "2E86AB" },
                bottom: { style: "single", size: 6, color: "2E86AB" },
              },
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `construction-quotation-${
      new Date().toISOString().split("T")[0]
    }.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Export failed:", error);

    // Fallback to basic text export if docx fails
    const fallbackText = generateFallbackText(quotationResult);
    const blob = new Blob([fallbackText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `construction-quotation-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
};

const generateFallbackText = (quotationResult) => `
CONSTRUCTION MATERIAL QUOTATION
Generated: ${new Date(quotationResult.timestamp).toLocaleString()}

VIDEO ANALYSIS SUMMARY:
${quotationResult.videoSummary}

MATERIAL BREAKDOWN:
${quotationResult.materials
  .map(
    (material) => `
${material.name}
  Quantity: ${material.quantity} ${material.unit}
  Unit Price: $${material.unitPrice.toFixed(2)}
  Total: $${material.totalPrice.toFixed(2)}
  Source: ${material.priceSource}
  Updated: ${new Date(material.lastUpdated).toLocaleDateString()}
  Confidence: ${material.confidence}%
  Description: ${material.description}
`
  )
  .join("\n")}

TOTAL MATERIAL COST: $${quotationResult.totalCost.toFixed(2)}

${
  quotationResult.clarificationQueries?.length > 0
    ? `
CLARIFICATION QUERIES PERFORMED:
${quotationResult.clarificationQueries
  .map((query, index) => `${index + 1}. ${query}`)
  .join("\n")}`
    : ""
}
`;

export { exportQuotationDoc };
