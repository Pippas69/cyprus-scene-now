import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

/**
 * 403 Forbidden page for non-admin users
 */
export const AdminForbidden = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">403</h1>
          <h2 className="text-2xl font-semibold">
            {language === 'el' ? 'Δεν Επιτρέπεται η Πρόσβαση' : 'Access Denied'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'el'
              ? 'Απαιτείται πρόσβαση διαχειριστή για αυτή τη σελίδα.'
              : 'Admin access is required to view this page.'}
          </p>
        </div>

        <Button onClick={() => navigate('/')} size="lg">
          {language === 'el' ? 'Επιστροφή στην Αρχική' : 'Go Back Home'}
        </Button>
      </div>
    </div>
  );
};

export default AdminForbidden;
