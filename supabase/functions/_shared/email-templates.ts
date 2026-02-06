// Premium Email Templates - Wolt-inspired clean design with ΦΟΜΟ branding
// White background, minimal typography, premium feel

const BRAND_COLORS = {
  navy: '#0D3B66',
  teal: '#4ECDC4',
  lightTeal: '#E0F7F5',
  darkNavy: '#102b4a',
  gray: '#64748b',
  lightGray: '#94a3b8',
  white: '#ffffff',
  offWhite: '#f8fafc',
};

// Compact, elegant header - square logo feel with smaller text
export const premiumEmailHeader = `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${BRAND_COLORS.white}; border-bottom: 1px solid #e2e8f0;">
    <tr>
      <td style="padding: 24px 32px; text-align: center;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND_COLORS.navy} 0%, ${BRAND_COLORS.teal} 100%); border-radius: 12px; padding: 16px 20px;">
              <span style="color: ${BRAND_COLORS.white}; font-size: 22px; font-weight: bold; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif;">ΦΟΜΟ</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

// Minimal footer with 2026
export const premiumEmailFooter = `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${BRAND_COLORS.white}; border-top: 1px solid #e2e8f0;">
    <tr>
      <td style="padding: 24px 32px; text-align: center;">
        <p style="color: ${BRAND_COLORS.gray}; font-size: 11px; margin: 0; letter-spacing: 0.5px;">
          © 2026 ΦΟΜΟ · Cyprus Events
        </p>
        <p style="color: ${BRAND_COLORS.lightGray}; font-size: 10px; margin: 8px 0 0 0;">
          fomo.com.cy
        </p>
      </td>
    </tr>
  </table>
`;

// Main wrapper - clean white design
export function wrapPremiumEmail(content: string, subheader?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <!--[if mso]>
      <style type="text/css">
        table, td, div, p, span { font-family: Arial, sans-serif !important; }
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f1f5f9; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 520px; background-color: ${BRAND_COLORS.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              <tr>
                <td>
                  ${premiumEmailHeader}
                  ${subheader ? `
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="padding: 16px 32px 0; text-align: center;">
                        <span style="display: inline-block; background-color: ${BRAND_COLORS.lightTeal}; color: ${BRAND_COLORS.navy}; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px;">
                          ${subheader}
                        </span>
                      </td>
                    </tr>
                  </table>
                  ` : ''}
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="padding: 24px 32px;">
                        ${content}
                      </td>
                    </tr>
                  </table>
                  ${premiumEmailFooter}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Reusable components for email content

// Detail row for tables
export function detailRow(label: string, value: string, isHighlight = false): string {
  return `
    <tr>
      <td style="padding: 10px 0; color: ${BRAND_COLORS.gray}; font-size: 13px; border-bottom: 1px solid #f1f5f9;">${label}</td>
      <td style="padding: 10px 0; text-align: right; font-size: 13px; font-weight: ${isHighlight ? '600' : '500'}; color: ${isHighlight ? BRAND_COLORS.navy : '#334155'}; border-bottom: 1px solid #f1f5f9;">${value}</td>
    </tr>
  `;
}

// Info card with light background
export function infoCard(title: string, rows: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${BRAND_COLORS.offWhite}; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px;">
          <p style="color: ${BRAND_COLORS.navy}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px 0;">${title}</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            ${rows}
          </table>
        </td>
      </tr>
    </table>
  `;
}

// QR Code section - clean and centered
export function qrCodeSection(qrUrl: string, code?: string, subtitle?: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND_COLORS.white}; border: 2px solid ${BRAND_COLORS.teal}; border-radius: 16px; padding: 20px;">
            <tr>
              <td align="center">
                <img src="${qrUrl}" alt="QR Code" style="width: 160px; height: 160px; display: block; border-radius: 8px;" />
              </td>
            </tr>
            ${code ? `
            <tr>
              <td align="center" style="padding-top: 12px;">
                <span style="color: ${BRAND_COLORS.navy}; font-size: 18px; font-weight: 700; letter-spacing: 2px;">${code}</span>
              </td>
            </tr>
            ` : ''}
            ${subtitle ? `
            <tr>
              <td align="center" style="padding-top: 6px;">
                <span style="color: ${BRAND_COLORS.lightGray}; font-size: 11px;">${subtitle}</span>
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>
  `;
}

// CTA Button - teal gradient
export function ctaButton(text: string, url: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background: linear-gradient(135deg, ${BRAND_COLORS.navy} 0%, ${BRAND_COLORS.teal} 100%); border-radius: 8px;">
                <a href="${url}" target="_blank" style="display: inline-block; color: ${BRAND_COLORS.white}; text-decoration: none; padding: 12px 28px; font-weight: 600; font-size: 13px; letter-spacing: 0.5px;">
                  ${text}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

// Success badge
export function successBadge(text: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
      <tr>
        <td align="center">
          <span style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: ${BRAND_COLORS.white}; padding: 8px 20px; border-radius: 20px; font-size: 13px; font-weight: 600;">
            ✓ ${text}
          </span>
        </td>
      </tr>
    </table>
  `;
}

// Title and subtitle
export function emailTitle(title: string, subtitle?: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: ${subtitle ? '8px' : '16px'};">
          <h1 style="color: ${BRAND_COLORS.navy}; font-size: 20px; font-weight: 600; margin: 0; line-height: 1.4;">${title}</h1>
        </td>
      </tr>
      ${subtitle ? `
      <tr>
        <td align="center" style="padding-bottom: 16px;">
          <p style="color: ${BRAND_COLORS.gray}; font-size: 14px; margin: 0; line-height: 1.5;">${subtitle}</p>
        </td>
      </tr>
      ` : ''}
    </table>
  `;
}

// Greeting
export function emailGreeting(name: string): string {
  return `
    <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
      Γεια σου <strong>${name}</strong>,
    </p>
  `;
}

// Warning/Note box
export function noteBox(text: string, type: 'warning' | 'info' = 'info'): string {
  const bgColor = type === 'warning' ? '#fef3c7' : BRAND_COLORS.lightTeal;
  const borderColor = type === 'warning' ? '#f59e0b' : BRAND_COLORS.teal;
  const textColor = type === 'warning' ? '#92400e' : BRAND_COLORS.navy;
  const icon = type === 'warning' ? '⚠️' : 'ℹ️';
  
  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0;">
      <tr>
        <td style="background-color: ${bgColor}; border-left: 3px solid ${borderColor}; border-radius: 0 8px 8px 0; padding: 12px 16px;">
          <p style="color: ${textColor}; font-size: 12px; margin: 0; line-height: 1.5;">
            ${icon} ${text}
          </p>
        </td>
      </tr>
    </table>
  `;
}

// Compact event/offer header with image
export function eventHeader(title: string, businessName: string, imageUrl?: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
      ${imageUrl ? `
      <tr>
        <td style="padding-bottom: 16px;">
          <img src="${imageUrl}" alt="${title}" style="width: 100%; height: auto; max-height: 180px; object-fit: cover; border-radius: 12px; display: block;" />
        </td>
      </tr>
      ` : ''}
      <tr>
        <td align="center">
          <h2 style="color: ${BRAND_COLORS.navy}; font-size: 18px; font-weight: 600; margin: 0 0 4px 0;">${title}</h2>
          <p style="color: ${BRAND_COLORS.gray}; font-size: 13px; margin: 0;">${businessName}</p>
        </td>
      </tr>
    </table>
  `;
}

// Discount badge for offers
export function discountBadge(discountText: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0;">
      <tr>
        <td align="center">
          <span style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.navy} 0%, ${BRAND_COLORS.teal} 100%); color: ${BRAND_COLORS.white}; padding: 10px 24px; border-radius: 8px; font-size: 20px; font-weight: 700;">
            ${discountText}
          </span>
        </td>
      </tr>
    </table>
  `;
}

// Business notification specific templates

// Business header variant
export const businessEmailHeader = `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${BRAND_COLORS.white}; border-bottom: 1px solid #e2e8f0;">
    <tr>
      <td style="padding: 24px 32px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td>
              <table cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, ${BRAND_COLORS.navy} 0%, ${BRAND_COLORS.teal} 100%); border-radius: 10px; padding: 12px 16px;">
                <tr>
                  <td>
                    <span style="color: ${BRAND_COLORS.white}; font-size: 18px; font-weight: bold; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif;">ΦΟΜΟ</span>
                  </td>
                </tr>
              </table>
            </td>
            <td align="right">
              <span style="color: ${BRAND_COLORS.gray}; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Business</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

export function wrapBusinessEmail(content: string, subheader?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <!--[if mso]>
      <style type="text/css">
        table, td, div, p, span { font-family: Arial, sans-serif !important; }
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f1f5f9; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 520px; background-color: ${BRAND_COLORS.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              <tr>
                <td>
                  ${businessEmailHeader}
                  ${subheader ? `
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="padding: 16px 32px 0; text-align: center;">
                        <span style="display: inline-block; background-color: ${BRAND_COLORS.lightTeal}; color: ${BRAND_COLORS.navy}; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                          ${subheader}
                        </span>
                      </td>
                    </tr>
                  </table>
                  ` : ''}
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="padding: 24px 32px;">
                        ${content}
                      </td>
                    </tr>
                  </table>
                  ${premiumEmailFooter}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Stat box for business notifications (e.g., tickets sold, reservations)
export function statBox(value: string | number, label: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="display: inline-block; margin: 0 8px;">
      <tr>
        <td align="center" style="background-color: ${BRAND_COLORS.offWhite}; border-radius: 8px; padding: 12px 20px;">
          <p style="color: ${BRAND_COLORS.navy}; font-size: 22px; font-weight: 700; margin: 0;">${value}</p>
          <p style="color: ${BRAND_COLORS.gray}; font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px;">${label}</p>
        </td>
      </tr>
    </table>
  `;
}
