import jsPDF from "jspdf";
import QRCode from "qrcode";
import { format } from "date-fns";
import { ensureNotoSansFont } from "./jspdfNotoSans";

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

  // Load NotoSans font for Greek character support (ΦΟΜΟ)
  await ensureNotoSansFont(pdf);

  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(ticket.qrToken, {
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  // ΦΟΜΟ Brand colors (Mediterranean theme)
  const tealColor = { r: 62, g: 195, b: 183 }; // #3ec3b7 - Seafoam teal
  const darkColor = { r: 15, g: 23, b: 42 }; // #0f172a
  const mutedColor = { r: 100, g: 116, b: 139 }; // #64748b
  const lightBg = { r: 248, g: 250, b: 252 }; // #f8fafc

  // === HEADER WITH BRAND (Gradient Effect) ===
  // Top portion - Mediterranean navy (increased height for better text spacing)
  pdf.setFillColor(13, 59, 102); // #0d3b66
  pdf.rect(0, 0, 210, 36, "F");
  
  // Bottom portion - Teal accent bar
  pdf.setFillColor(78, 205, 196); // #4ecdc4
  pdf.rect(0, 36, 210, 14, "F");
  
  // Brand name - ΦΟΜΟ (using NotoSans for Greek support)
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.setFont("NotoSans", "normal");
  pdf.text("ΦΟΜΟ", 105, 24, { align: "center" });
  
  // Subtitle - EVENT TICKET (positioned in teal bar)
  pdf.setFontSize(11);
  pdf.setFont("NotoSans", "normal");
  pdf.text("EVENT TICKET", 105, 44, { align: "center" });

  // === EVENT INFO SECTION ===
  pdf.setFillColor(lightBg.r, lightBg.g, lightBg.b);
  pdf.roundedRect(15, 58, 180, 60, 4, 4, "F");
  
  // Event title
  pdf.setTextColor(darkColor.r, darkColor.g, darkColor.b);
  pdf.setFontSize(18);
  pdf.setFont("NotoSans", "normal");
  const eventTitle = ticket.eventTitle.length > 40 
    ? ticket.eventTitle.substring(0, 37) + "..." 
    : ticket.eventTitle;
  pdf.text(eventTitle, 105, 75, { align: "center" });

  // Business/Venue name
  if (ticket.businessName) {
    pdf.setTextColor(mutedColor.r, mutedColor.g, mutedColor.b);
    pdf.setFontSize(11);
    pdf.setFont("NotoSans", "normal");
    pdf.text(`Organized by: ${ticket.businessName}`, 105, 85, { align: "center" });
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
  pdf.setFont("NotoSans", "normal");
  pdf.text(`Date: ${formattedEventDate}`, 105, 98, { align: "center" });
  
  // Location
  pdf.setTextColor(mutedColor.r, mutedColor.g, mutedColor.b);
  pdf.text(`Location: ${ticket.eventLocation}`, 105, 108, { align: "center" });

  // === TICKET HOLDER SECTION ===
  pdf.setDrawColor(229, 231, 235);
  pdf.line(25, 128, 185, 128);
  
  pdf.setTextColor(darkColor.r, darkColor.g, darkColor.b);
  pdf.setFontSize(12);
  pdf.setFont("NotoSans", "normal");
  pdf.text("TICKET DETAILS", 105, 141, { align: "center" });

  // Ticket holder name
  if (ticket.customerName) {
    pdf.setFontSize(11);
    pdf.text(`Ticket Holder: ${ticket.customerName}`, 25, 155);
  }

  // Tier and price (use NotoSans to handle any special chars)
  const tierText = ticket.pricePaid 
    ? `Ticket Type: ${ticket.tierName} - ${ticket.pricePaid}`
    : `Ticket Type: ${ticket.tierName}`;
  pdf.text(tierText, 25, 165);

  // Purchase date
  if (ticket.purchaseDate) {
    try {
      const formattedPurchaseDate = format(new Date(ticket.purchaseDate), "dd MMMM yyyy");
      pdf.text(`Purchase Date: ${formattedPurchaseDate}`, 25, 175);
    } catch {
      // Skip if date parsing fails
    }
  }

  // Ticket ID
  pdf.setTextColor(mutedColor.r, mutedColor.g, mutedColor.b);
  pdf.setFontSize(9);
  pdf.text(`Ticket ID: ${ticket.ticketId}`, 25, 185);

  // === QR CODE SECTION ===
  pdf.setDrawColor(229, 231, 235);
  pdf.line(25, 195, 185, 195);
  
  pdf.setTextColor(darkColor.r, darkColor.g, darkColor.b);
  pdf.setFontSize(12);
  pdf.setFont("NotoSans", "normal");
  pdf.text("SCAN FOR ENTRY", 105, 208, { align: "center" });

  // QR Code with teal border
  pdf.setDrawColor(tealColor.r, tealColor.g, tealColor.b);
  pdf.setLineWidth(1.5);
  pdf.roundedRect(67, 213, 76, 76, 4, 4, "S");
  pdf.addImage(qrDataUrl, "PNG", 70, 216, 70, 70);

  // Small ΦΟΜΟ watermark in corner of QR section (using NotoSans)
  pdf.setTextColor(tealColor.r, tealColor.g, tealColor.b);
  pdf.setFontSize(8);
  pdf.setFont("NotoSans", "normal");
  pdf.text("ΦΟΜΟ", 145, 285);

  // Download with ΦΟΜΟ branding
  const fileName = `fomo-ticket-${ticket.eventTitle.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "-")}-${ticket.ticketId.slice(0, 8)}.pdf`;
  pdf.save(fileName);
};
