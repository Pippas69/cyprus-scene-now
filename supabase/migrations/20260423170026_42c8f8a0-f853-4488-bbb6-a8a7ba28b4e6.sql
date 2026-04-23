DELETE FROM public.pending_bookings
WHERE customer_phone IN (
  '+35799000001','+35799000003','+35799000004','+35799000006','+35799000007'
)
OR customer_name LIKE 'TEST%';