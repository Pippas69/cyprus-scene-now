import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const usePasswordChange = () => {
  const [isChanging, setIsChanging] = useState(false);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const changePassword = async ({ currentPassword, newPassword, confirmPassword }: PasswordChangeData) => {
    setIsChanging(true);

    try {
      // Validate new password
      const validationError = validatePassword(newPassword);
      if (validationError) {
        toast({
          title: 'Invalid password',
          description: validationError,
          variant: 'destructive',
        });
        return false;
      }

      // Check if passwords match
      if (newPassword !== confirmPassword) {
        toast({
          title: 'Passwords do not match',
          description: 'Please make sure your passwords match.',
          variant: 'destructive',
        });
        return false;
      }

      // Get current user email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast({
          title: 'Error',
          description: 'Could not verify user email.',
          variant: 'destructive',
        });
        return false;
      }

      // Re-authenticate with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        toast({
          title: 'Incorrect password',
          description: 'Your current password is incorrect.',
          variant: 'destructive',
        });
        return false;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast({
          title: 'Error',
          description: updateError.message,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully.',
      });
      return true;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsChanging(false);
    }
  };

  return {
    changePassword,
    isChanging,
    validatePassword,
  };
};
