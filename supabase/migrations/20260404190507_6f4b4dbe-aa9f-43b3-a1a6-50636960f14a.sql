ALTER TABLE public.reservations ALTER COLUMN party_size DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN source DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN source DROP DEFAULT;