import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getReportData } from "@/lib/reports";
import { todayInClinicTZ } from "@/lib/date";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || todayInClinicTZ();
  const to = searchParams.get("to") || todayInClinicTZ();

  const { revenue, cancellations, staffStats } = await getReportData(from, to);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Clinic Booking System";
  workbook.created = new Date();

  const revenueSheet = workbook.addWorksheet("Revenue");
  revenueSheet.columns = [
    { header: "Method", key: "method", width: 20 },
    { header: "Payments", key: "payment_count", width: 12 },
    { header: "Total (PHP)", key: "total", width: 15 },
  ];
  revenue.forEach((r) => revenueSheet.addRow({ ...r, total: Number(r.total) }));
  revenueSheet.addRow({});
  revenueSheet.addRow({
    method: "TOTAL",
    total: revenue.reduce((sum, r) => sum + Number(r.total), 0),
  });

  const cancelSheet = workbook.addWorksheet("Cancellations");
  cancelSheet.columns = [
    { header: "Reason", key: "reason", width: 22 },
    { header: "Count", key: "count", width: 12 },
  ];
  cancellations.forEach((c) => cancelSheet.addRow(c));

  const staffSheet = workbook.addWorksheet("Staff Performance");
  staffSheet.columns = [
    { header: "Staff", key: "staff_name", width: 22 },
    { header: "Completed", key: "completed_count", width: 12 },
    { header: "Cancelled", key: "cancelled_count", width: 12 },
    { header: "No-shows", key: "no_show_count", width: 12 },
    { header: "Revenue (PHP)", key: "revenue", width: 15 },
  ];
  staffStats.forEach((s) => staffSheet.addRow({ ...s, revenue: Number(s.revenue) }));

  // Bold header row on every sheet
  [revenueSheet, cancelSheet, staffSheet].forEach((sheet) => {
    sheet.getRow(1).font = { bold: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="report_${from}_to_${to}.xlsx"`,
    },
  });
}
