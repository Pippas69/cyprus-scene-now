-- Test 6 cleanup proof: simulate SMS-failure branch then verify consume blocks
DO $$
DECLARE
  v_id uuid;
  v_token text;
  v_status text;
  v_consume text;
BEGIN
  -- 1. INSERT pending (όπως κάνει το edge function)
  INSERT INTO public.pending_bookings (
    business_id, created_by_user_id, booking_type, customer_phone, customer_name, status
  ) VALUES (
    'b46262e4-50db-4ad7-83e2-8f06d4975354',
    'ef38d7f1-206a-44e5-ada3-bd6f9f70354b',
    'reservation','+35799000007','TEST6 cleanup proof','pending'
  ) RETURNING id, token INTO v_id, v_token;
  RAISE NOTICE 'TEST6 step=inserted id=% token=% status=pending', v_id, v_token;

  -- 2. Simulate SMS failure cleanup (service_role does this in edge function)
  UPDATE public.pending_bookings SET status = 'cancelled' WHERE id = v_id;
  SELECT status INTO v_status FROM public.pending_bookings WHERE id = v_id;
  RAISE NOTICE 'TEST6 step=after_cleanup id=% status=%', v_id, v_status;

  -- 3. Try to consume the cancelled token → MUST fail
  BEGIN
    PERFORM public.consume_pending_booking(v_token);
    RAISE NOTICE 'TEST6 step=consume_attempt result=UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST6 step=consume_attempt result=BLOCKED reason=%', SQLERRM;
  END;
END $$;