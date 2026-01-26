import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2 } from 'lucide-react';

interface ReservationSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: {
    confirmation_code: string;
    qr_code_token: string;
    reservation_name: string;
    party_size: number;
    preferred_time: string;
    business_name: string;
  } | null;
  language: 'el' | 'en';
}

export const ReservationSuccessDialog = ({
  open,
  onOpenChange,
  reservation,
  language,
}: ReservationSuccessDialogProps) => {
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    if (reservation?.qr_code_token) {
      QRCode.toDataURL(reservation.qr_code_token, {
        width: 256,
        margin: 2,
        color: {
          dark: '#102b4a',
          light: '#FFFFFF',
        },
      }).then(setQrCode).catch(console.error);
    }
  }, [reservation?.qr_code_token]);

  if (!reservation) return null;

  const formattedDate = new Date(reservation.preferred_time).toLocaleDateString(
    language === 'el' ? 'el-GR' : 'en-US',
    { day: 'numeric', month: 'long', year: 'numeric' }
  );
  const formattedTime = new Date(reservation.preferred_time).toLocaleTimeString(
    language === 'el' ? 'el-GR' : 'en-US',
    { hour: '2-digit', minute: '2-digit' }
  );

  const t = {
    el: {
      success: 'Η κράτησή σας έγινε επιτυχώς!',
      confirmationCode: 'Κωδικός Επιβεβαίωσης',
      showQr: 'Παρουσιάστε αυτόν τον κωδικό QR στην επιχείρηση',
      date: 'Ημερομηνία',
      time: 'Ώρα',
      people: 'Άτομα',
      close: 'Κλείσιμο',
      viewReservations: 'Οι Κρατήσεις Μου',
    },
    en: {
      success: 'Your reservation was successful!',
      confirmationCode: 'Confirmation Code',
      showQr: 'Present this QR code at the venue',
      date: 'Date',
      time: 'Time',
      people: 'People',
      close: 'Close',
      viewReservations: 'My Reservations',
    },
  };

  const text = t[language];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0 bg-transparent">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          {/* Header with ΦΟΜΟ branding */}
          <div className="bg-gradient-to-br from-[#102b4a] to-[#1a3d5c] px-6 py-5 text-center">
            <h1 className="text-2xl font-bold text-white tracking-wider">ΦΟΜΟ</h1>
            <p className="text-white/70 text-xs mt-1">by {reservation.business_name}</p>
          </div>

          {/* Main Content */}
          <div className="bg-white px-6 py-5">
            {/* Success message */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <p className="text-lg font-semibold text-[#102b4a]">{text.success}</p>
            </div>

            {/* Reservation details */}
            <div className="bg-[#f0fdfa] border border-[#3ec3b7]/30 rounded-lg p-3 mb-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{text.date}:</span>
                <span className="font-medium">{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{text.time}:</span>
                <span className="font-medium">{formattedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{text.people}:</span>
                <span className="font-medium">{reservation.party_size}</span>
              </div>
            </div>

            {/* Confirmation Code */}
            <div className="text-center mb-4">
              <p className="text-[10px] text-[#64748b] uppercase tracking-wide mb-1">
                {text.confirmationCode}
              </p>
              <p className="text-3xl font-bold text-[#102b4a] tracking-widest">
                {reservation.confirmation_code}
              </p>
            </div>

            {/* QR Code */}
            {qrCode && (
              <div className="flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-[#3ec3b7]">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
                <p className="text-xs text-[#64748b] mt-3 text-center">{text.showQr}</p>
              </div>
            )}

            {/* Close button */}
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full mt-4 bg-[#102b4a] hover:bg-[#1a3d5c]"
            >
              {text.close}
            </Button>
          </div>

          {/* Wave Decoration */}
          <div className="relative h-6 bg-white">
            <svg viewBox="0 0 400 24" className="absolute bottom-0 left-0 w-full h-6" preserveAspectRatio="none">
              <path d="M0,24 C100,0 300,0 400,24 L400,24 L0,24 Z" fill="#3ec3b7" opacity="0.3" />
              <path d="M0,24 C150,8 250,8 400,24 L400,24 L0,24 Z" fill="#3ec3b7" opacity="0.5" />
            </svg>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
