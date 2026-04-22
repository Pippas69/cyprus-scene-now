CREATE INDEX IF NOT EXISTS idx_reservations_qr_code_token
  ON public.reservations (qr_code_token);

CREATE INDEX IF NOT EXISTS idx_reservations_confirmation_code
  ON public.reservations (confirmation_code);