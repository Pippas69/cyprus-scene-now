import jsPDF from "jspdf";
import QRCode from "qrcode";

interface TicketPdfData {
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  tierName: string;
  ticketId: string;
  qrToken: string;
  customerName?: string;
}

export const generateTicketPdf = async (ticket: TicketPdfData): Promise<void> => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(ticket.qrToken, {
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  // Colors
  const primaryColor = "#0ea5e9";
  const textColor = "#374151";
  const mutedColor = "#6b7280";

  // Header
  pdf.setFillColor(14, 165, 233); // primary color
  pdf.rect(0, 0, 210, 40, "F");
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text("EVENT TICKET", 105, 25, { align: "center" });

  // Event details box
  pdf.setDrawColor(229, 231, 235);
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(15, 50, 180, 60, 5, 5, "FD");

  pdf.setTextColor(55, 65, 81);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(ticket.eventTitle, 105, 68, { align: "center", maxWidth: 170 });

  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(`📅 ${ticket.eventDate}`, 105, 85, { align: "center" });
  pdf.text(`📍 ${ticket.eventLocation}`, 105, 95, { align: "center" });

  // Ticket tier
  pdf.setFillColor(14, 165, 233);
  pdf.roundedRect(60, 118, 90, 15, 3, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text(ticket.tierName.toUpperCase(), 105, 128, { align: "center" });

  // QR Code
  pdf.addImage(qrDataUrl, "PNG", 55, 145, 100, 100);

  // Instructions
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Scan this QR code at the event entrance", 105, 255, { align: "center" });

  // Ticket ID footer
  pdf.setFontSize(8);
  pdf.text(`Ticket ID: ${ticket.ticketId}`, 105, 275, { align: "center" });

  if (ticket.customerName) {
    pdf.text(`Ticket holder: ${ticket.customerName}`, 105, 282, { align: "center" });
  }

  // Download
  const fileName = `ticket-${ticket.eventTitle.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "-")}-${ticket.ticketId.slice(0, 8)}.pdf`;
  pdf.save(fileName);
};
