-- Add unique constraint on university_email in student_verifications to prevent multiple accounts with same university email
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_verifications_university_email_unique 
ON student_verifications(university_email) 
WHERE status = 'approved';