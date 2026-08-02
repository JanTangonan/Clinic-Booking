import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getReportData } from "@/lib/reports";
import { todayInClinicTZ } from "@/lib/date";

export const runtime = "nodejs"; // pdfkit needs Node APIs, not the Edge runtime

// A minimal hand-rolled table renderer — pdfkit has no built-in table
// support. This does NOT handle pagination if a table runs past the
// bottom of the page. That's a real limitation, but fine for this
// clinic's scale (a handful of payment methods, ~6 cancellation
// reasons, and a small staff roster) — worth revisiting with a proper
// pagination pass if the staff list or report period ever grows large
// enough to overflow a page.
function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: (string | number)[][],
  startY: number,
  colWidths: number[]
) {
  const startX = doc.page.margins.left;
  let y = startY;

  doc.font("Helvetica-Bold").fontSize(10);
  let x = startX;
  headers.forEach((h, i) => {
    doc.text(h, x, y, { width: colWidths[i] });
    x += colWidths[i];
  });
  y += 16;
  doc
    .moveTo(startX, y)
    .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y)
    .strokeColor("#cccccc")
    .stroke();
  y += 6;

  doc.font("Helvetica").fontSize(10);
  rows.forEach((row) => {
    x = startX;
    row.forEach((cell, i) => {
      doc.text(String(cell), x, y, { width: colWidths[i] });
      x += colWidths[i];
    });
    y += 16;
  });

  doc.x = startX;
  doc.y = y;
  return y;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || todayInClinicTZ();
  const to = searchParams.get("to") || todayInClinicTZ();

  const { revenue, cancellations, staffStats } = await getReportData(from, to);
  const totalRevenue = revenue.reduce((sum, r) => sum + Number(r.total), 0);

  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const donePromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.font("Helvetica-Bold").fontSize(18).text("Clinic Report");
  doc.font("Helvetica").fontSize(10).fillColor("#666666").text(`${from} to ${to}`);
  doc.fillColor("#000000");
  doc.moveDown(1.5);

  doc.font("Helvetica-Bold").fontSize(14).text("Revenue");
  doc.font("Helvetica-Bold").fontSize(20).text(`P${totalRevenue.toLocaleString()}`);
  doc.moveDown(0.5);
  drawTable(
    doc,
    ["Method", "Payments", "Total (PHP)"],
    revenue.map((r) => [r.method, r.payment_count, Number(r.total).toLocaleString()]),
    doc.y,
    [200, 100, 150]
  );

  doc.moveDown(1.5);
  doc.font("Helvetica-Bold").fontSize(14).text("Cancellations & No-shows", doc.page.margins.left, doc.y);
  doc.moveDown(0.5);
  drawTable(
    doc,
    ["Reason", "Count"],
    cancellations.map((c) => [c.reason, c.count]),
    doc.y,
    [250, 100]
  );

  doc.moveDown(1.5);
  doc.font("Helvetica-Bold").fontSize(14).text("Staff Performance", doc.page.margins.left, doc.y);
  doc.moveDown(0.5);
  drawTable(
    doc,
    ["Staff", "Completed", "Cancelled", "No-shows", "Revenue (PHP)"],
    staffStats.map((s) => [
      s.staff_name,
      s.completed_count,
      s.cancelled_count,
      s.no_show_count,
      Number(s.revenue).toLocaleString(),
    ]),
    doc.y,
    [150, 90, 90, 90, 110]
  );

  doc.end();
  const buffer = await donePromise;
  const pdfBytes = new Uint8Array(buffer);

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report_${from}_to_${to}.pdf"`,
    },
  });
}
