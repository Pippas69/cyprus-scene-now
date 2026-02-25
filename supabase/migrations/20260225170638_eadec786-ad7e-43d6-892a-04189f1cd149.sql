-- Confirm the latest early access signup
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'mkleanth@gmail.com' AND email_confirmed_at IS NULL;