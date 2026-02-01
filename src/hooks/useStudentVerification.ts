import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getUniversityByDomain } from '@/lib/cyprusUniversities';

export interface StudentVerification {
  id: string;
  user_id: string;
  university_email: string;
  university_name: string;
  university_domain: string;
  qr_code_token: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  verified_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export function useStudentVerification(userId?: string) {
  return useQuery({
    queryKey: ['student-verification', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('student_verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as StudentVerification | null;
    },
    enabled: !!userId,
  });
}

export function useSubmitStudentVerification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, email }: { userId: string; email: string }) => {
      const university = getUniversityByDomain(email);
      if (!university) {
        throw new Error('Invalid university email');
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if this university email is already used by an approved verification
      const { data: existingApproved } = await supabase
        .from('student_verifications')
        .select('id, user_id')
        .eq('university_email', normalizedEmail)
        .eq('status', 'approved')
        .maybeSingle();
      
      if (existingApproved) {
        throw new Error('EMAIL_ALREADY_USED');
      }
      
      // Check if this user already has a pending verification for this email
      const { data: existingPending } = await supabase
        .from('student_verifications')
        .select('id')
        .eq('user_id', userId)
        .eq('university_email', normalizedEmail)
        .eq('status', 'pending')
        .maybeSingle();
      
      if (existingPending) {
        // Return existing record instead of creating new one
        return existingPending;
      }
      
      const { data, error } = await supabase
        .from('student_verifications')
        .insert({
          user_id: userId,
          university_email: normalizedEmail,
          university_name: university.name,
          university_domain: university.domain,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          throw new Error('EMAIL_ALREADY_USED');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-verification', variables.userId] });
    },
  });
}

export function useAdminStudentVerifications(status?: string) {
  return useQuery({
    queryKey: ['admin-student-verifications', status],
    queryFn: async () => {
      let query = supabase
        .from('student_verifications')
        .select(`
          *,
          user:profiles!student_verifications_user_id_fkey(id, name, email, avatar_url),
          reviewer:profiles!student_verifications_reviewed_by_fkey(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useApproveStudentVerification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ verificationId, adminId }: { verificationId: string; adminId: string }) => {
      const qrToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      
      const { data: verification, error: verificationError } = await supabase
        .from('student_verifications')
        .update({
          status: 'approved',
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          qr_code_token: qrToken,
        })
        .eq('id', verificationId)
        .select('user_id')
        .single();
      
      if (verificationError) throw verificationError;
      
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_student_verified: true,
          student_qr_token: qrToken,
        })
        .eq('id', verification.user_id);
      
      if (profileError) throw profileError;
      
      return verification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-student-verifications'] });
      toast.success('Student verification approved');
    },
    onError: (error) => {
      toast.error('Failed to approve verification');
      console.error(error);
    },
  });
}

export function useRejectStudentVerification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      verificationId, 
      adminId, 
      reason 
    }: { 
      verificationId: string; 
      adminId: string; 
      reason?: string;
    }) => {
      const { error } = await supabase
        .from('student_verifications')
        .update({
          status: 'rejected',
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason || null,
        })
        .eq('id', verificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-student-verifications'] });
      toast.success('Student verification rejected');
    },
    onError: (error) => {
      toast.error('Failed to reject verification');
      console.error(error);
    },
  });
}
