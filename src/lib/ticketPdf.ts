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
  businessName?: string;
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

  // ΦΟΜΟ Brand colors (Mediterranean theme)
  const navyColor = { r: 16, g: 43, b: 74 }; // #102b4a - Mediterranean navy
  const tealColor = { r: 62, g: 195, b: 183 }; // #3ec3b7 - Seafoam teal
  const darkColor = { r: 15, g: 23, b: 42 }; // #0f172a
  const mutedColor = { r: 100, g: 116, b: 139 }; // #64748b
  const lightBg = { r: 248, g: 250, b: 252 }; // #f8fafc

  // === HEADER WITH BRAND ===
  pdf.setFillColor(navyColor.r, navyColor.g, navyColor.b);
  pdf.rect(0, 0, 210, 45, "F");
  
  // Brand name - ΦΟΜΟ
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(32);
  pdf.setFont("helvetica", "bold");
  pdf.text("ΦΟΜΟ", 105, 22, { align: "center" });
  
  // Subtitle
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text("EVENT TICKET", 105, 35, { align: "center" });

  // === EVENT INFO SECTION ===
  pdf.setFillColor(lightBg.r, lightBg.g, lightBg.b);
  pdf.roundedRect(15, 55, 180, 60, 4, 4, "F");
  
  // Event title
  pdf.setTextColor(darkColor.r, darkColor.g, darkColor.b);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  const eventTitle = ticket.eventTitle.length > 40 
    ? ticket.eventTitle.substring(0, 37) + "..." 
    : ticket.eventTitle;
  pdf.text(eventTitle, 105, 72, { align: "center" });

  // Business/Venue name
  if (ticket.businessName) {
    pdf.setTextColor(mutedColor.r, mutedColor.g, mutedColor.b);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Organized by: ${ticket.businessName}`, 105, 82, { align: "center" });
  }

  // Event date
  let formattedEventDate = ticket.eventDate;
  try {
    if (ticket.eventDate) {
      formattedEventDate = format(new Date(ticket.eventDate), "EEEE, dd MMMM yyyy 'at' HH:mm");
    }
  } catch {
    // Keep original if parsing fails
  }
  
  pdf.setTextColor(darkColor.r, darkColor.g, darkColor.b);
  pdf.setFontSize(11);
  pdf.text(`Date: ${formattedEventDate}`, 105, 95, { align: "center" });
  
  // Location
  pdf.setTextColor(mutedColor.r, mutedColor.g, mutedColor.b);
  pdf.text(`Location: ${ticket.eventLocation}`, 105, 105, { align: "center" });

  // === TICKET HOLDER SECTION ===
  pdf.setDrawColor(229, 231, 235);
  pdf.line(25, 125, 185, 125);
  
  pdf.setTextColor(darkColor.r, darkColor.g, darkColor.b);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("TICKET DETAILS", 105, 138, { align: "center" });

  // Ticket holder name
  if (ticket.customerName) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(`Ticket Holder: ${ticket.customerName}`, 25, 152);
  }

  // Tier and price
  const tierText = ticket.pricePaid 
    ? `Ticket Type: ${ticket.tierName} - ${ticket.pricePaid}`
    : `Ticket Type: ${ticket.tierName}`;
  pdf.text(tierText, 25, 162);

  // Purchase date
  if (ticket.purchaseDate) {
    try {
      const formattedPurchaseDate = format(new Date(ticket.purchaseDate), "dd MMMM yyyy");
      pdf.text(`Purchase Date: ${formattedPurchaseDate}`, 25, 172);
    } catch {
      // Skip if date parsing fails
    }
  }

  // Ticket ID
  pdf.setTextColor(mutedColor.r, mutedColor.g, mutedColor.b);
  pdf.setFontSize(9);
  pdf.text(`Ticket ID: ${ticket.ticketId}`, 25, 182);

  // === QR CODE SECTION ===
  pdf.setDrawColor(229, 231, 235);
  pdf.line(25, 192, 185, 192);
  
  pdf.setTextColor(darkColor.r, darkColor.g, darkColor.b);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("SCAN FOR ENTRY", 105, 205, { align: "center" });

  // QR Code with teal border
  pdf.setDrawColor(tealColor.r, tealColor.g, tealColor.b);
  pdf.setLineWidth(1.5);
  pdf.roundedRect(67, 210, 76, 76, 4, 4, "S");
  pdf.addImage(qrDataUrl, "PNG", 70, 213, 70, 70);

  // === FOOTER ===
  pdf.setTextColor(mutedColor.r, mutedColor.g, mutedColor.b);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("Present this QR code at the event entrance for check-in", 105, 295, { align: "center" });

  // Download with ΦΟΜΟ branding
  const fileName = `fomo-ticket-${ticket.eventTitle.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "-")}-${ticket.ticketId.slice(0, 8)}.pdf`;
  pdf.save(fileName);
};
