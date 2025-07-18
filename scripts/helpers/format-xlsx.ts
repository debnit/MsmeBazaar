import * as XLSX from "xlsx";

export function formatToXLSX(data: any[], metrics: any) {
  const sheetData = [
    ["Total MSMEs", metrics.totalMSMEs],
    ["Total Revenue", metrics.totalRevenue],
    ["Average Valuation", metrics.averageValuation],
    [],
    ["Name", "Category", "Valuation", "Revenue", "Created At"],
    ...data.map((d) => [
      d.name,
      d.category,
      d.valuation,
      d.revenue,
      d.createdAt,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "MSME Report");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buffer;
}

