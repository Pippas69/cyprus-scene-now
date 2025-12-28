import jsPDF from "jspdf";
import QRCode from "qrcode";
import { format } from "date-fns";

interface TicketPdfData {
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  tierName: string;
  ticketId: string;
  qrToken: string;
  customerName?: string;
  purchaseDate?: string;
  pricePaid?: string;
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
  pdf.roundedRect(15, 50, 180, 70, 5, 5, "FD");

  pdf.setTextColor(55, 65, 81);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(ticket.eventTitle, 105, 65, { align: "center", maxWidth: 170 });

  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  
  // Format event date nicely if it's a valid date
  let formattedEventDate = ticket.eventDate;
  try {
    if (ticket.eventDate) {
      formattedEventDate = format(new Date(ticket.eventDate), "dd MMMM yyyy, HH:mm");
    }
  } catch {
    // Keep original if parsing fails
  }
  
  pdf.text(`📅 ${formattedEventDate}`, 105, 82, { align: "center" });
  pdf.text(`📍 ${ticket.eventLocation}`, 105, 92, { align: "center" });

  // Customer name if provided
  if (ticket.customerName) {
    pdf.setTextColor(55, 65, 81);
    pdf.setFontSize(11);
    pdf.text(`👤 ${ticket.customerName}`, 105, 105, { align: "center" });
  }

  // Ticket tier with price
  const tierText = ticket.pricePaid 
    ? `${ticket.tierName.toUpperCase()} - ${ticket.pricePaid}`
    : ticket.tierName.toUpperCase();
  
  pdf.setFillColor(14, 165, 233);
  pdf.roundedRect(40, 128, 130, 15, 3, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text(tierText, 105, 138, { align: "center" });

  // QR Code
  pdf.addImage(qrDataUrl, "PNG", 55, 150, 100, 100);

  // Instructions
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Scan this QR code at the event entrance", 105, 260, { align: "center" });

  // Footer with ticket details
  pdf.setFontSize(8);
  pdf.text(`Ticket ID: ${ticket.ticketId}`, 105, 272, { align: "center" });

  // Purchase date
  if (ticket.purchaseDate) {
    try {
      const formattedPurchaseDate = format(new Date(ticket.purchaseDate), "dd MMM yyyy");
      pdf.text(`Purchased: ${formattedPurchaseDate}`, 105, 279, { align: "center" });
    } catch {
      // Skip if date parsing fails
    }
  }

  // Download
  const fileName = `ticket-${ticket.eventTitle.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "-")}-${ticket.ticketId.slice(0, 8)}.pdf`;
  pdf.save(fileName);
};
