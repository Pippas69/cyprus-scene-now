import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, CheckCircle2, ExternalLink, AlertCircle, Banknote, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface StripeConnectOnboardingProps {
  businessId: string;
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: 'Πληρωμές & Εκταμιεύσεις',
    description: 'Συνδέστε τον τραπεζικό σας λογαριασμό για να λαμβάνετε πληρωμές',
    notConnected: 'Δεν έχει συνδεθεί',
    pendingOnboarding: 'Εκκρεμεί ολοκλήρωση',
    connected: 'Συνδεδεμένο',
    payoutsEnabled: 'Εκταμιεύσεις ενεργές',
    payoutsDisabled: 'Εκταμιεύσεις απενεργοποιημένες',
    connectAccount: 'Σύνδεση Τραπεζικού Λογαριασμού',
    completeSetup: 'Ολοκλήρωση Ρύθμισης',
    viewDashboard: 'Προβολή Πίνακα Πληρωμών',
    connectDescription: 'Για να λαμβάνετε πληρωμές, πρέπει να συνδέσετε τον τραπεζικό σας λογαριασμό. Η διαδικασία διαρκεί λίγα λεπτά.',
    pendingDescription: 'Η ρύθμιση του λογαριασμού σας δεν έχει ολοκληρωθεί. Κάντε κλικ παρακάτω για να συνεχίσετε.',
    connectedDescription: 'Ο λογαριασμός σας είναι έτοιμος να λάβει πληρωμές. Τα έσοδα θα κατατίθενται αυτόματα.',
    loading: 'Φόρτωση...',
    error: 'Σφάλμα κατά τη φόρτωση της κατάστασης πληρωμών',
    redirecting: 'Μεταφορά στη ρύθμιση πληρωμών...',
    whatYouNeed: 'Τι θα χρειαστείτε:',
    bankAccount: 'Στοιχεία τραπεζικού λογαριασμού',
    idVerification: 'Ταυτότητα για επαλήθευση',
    businessInfo: 'Φορολογικά στοιχεία επιχείρησης',
    commissionNote: 'Η προμήθεια πλατφόρμας αφαιρείται αυτόματα από κάθε πώληση',
  },
  en: {
    title: 'Payments & Payouts',
    description: 'Connect your bank account to receive payments',
    notConnected: 'Not connected',
    pendingOnboarding: 'Setup pending',
    connected: 'Connected',
    payoutsEnabled: 'Payouts enabled',
    payoutsDisabled: 'Payouts disabled',
    connectAccount: 'Connect Bank Account',
    completeSetup: 'Complete Setup',
    viewDashboard: 'View Payment Dashboard',
    connectDescription: 'To receive payments, you need to connect your bank account. This process takes just a few minutes.',
    pendingDescription: 'Your account setup is not complete. Click below to continue.',
    connectedDescription: 'Your account is ready to receive payments. Revenue will be deposited automatically.',
    loading: 'Loading...',
    error: 'Error loading payment status',
    redirecting: 'Redirecting to payment setup...',
    whatYouNeed: 'What you\'ll need:',
    bankAccount: 'Bank account details',
    idVerification: 'ID for verification',
    businessInfo: 'Business tax information',
    commissionNote: 'Platform commission is automatically deducted from each sale',
  },
};

type ConnectStatus = 'not_connected' | 'pending' | 'connected';

export const StripeConnectOnboarding = ({ businessId, language }: StripeConnectOnboardingProps) => {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState<ConnectStatus>('not_connected');
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);

  const t = translations[language];

  useEffect(() => {
    // Check URL params for onboarding completion
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_onboarding') === 'complete') {
      window.history.replaceState({}, '', window.location.pathname);
      // Sync with Stripe to get accurate status after onboarding
      syncConnectStatus();
    } else if (urlParams.get('stripe_refresh') === 'true') {
      toast.info(language === 'el' ? 'Παρακαλώ ολοκληρώστε τη ρύθμιση' : 'Please complete setup');
      window.history.replaceState({}, '', window.location.pathname);
      fetchConnectStatus();
    } else {
      fetchConnectStatus();
    }
  }, [businessId]);

  // Sync with Stripe API to get accurate account status
  const syncConnectStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: syncError } = await supabase.functions.invoke('sync-connect-status');
      
      if (syncError) {
        console.error('Error syncing connect status:', syncError);
        // Fall back to database fetch
        await fetchConnectStatus();
        return;
      }

      if (data?.status_changed) {
        toast.success(language === 'el' ? 'Ρύθμιση ολοκληρώθηκε!' : 'Setup complete!');
      } else if (data?.onboarding_completed && data?.payouts_enabled) {
        toast.success(language === 'el' ? 'Ο λογαριασμός σας είναι έτοιμος!' : 'Your account is ready!');
      } else if (data?.onboarding_completed && !data?.payouts_enabled) {
        toast.info(language === 'el' 
          ? 'Η επαλήθευση είναι σε εξέλιξη' 
          : 'Verification in progress');
      }

      // Update local state based on sync result
      if (!data?.onboarding_completed && data?.success === false) {
        setStatus('not_connected');
      } else if (data?.onboarding_completed) {
        setStatus('connected');
      } else {
        setStatus('pending');
      }
      
      setPayoutsEnabled(data?.payouts_enabled ?? false);
    } catch (err) {
      console.error('Error syncing connect status:', err);
      // Fall back to database fetch
      await fetchConnectStatus();
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('businesses')
        .select('stripe_account_id, stripe_onboarding_completed, stripe_payouts_enabled')
        .eq('id', businessId)
        .single();

      if (fetchError) throw fetchError;

      if (!data.stripe_account_id) {
        setStatus('not_connected');
      } else if (!data.stripe_onboarding_completed) {
        setStatus('pending');
      } else {
        setStatus('connected');
      }

      setPayoutsEnabled(data.stripe_payouts_enabled ?? false);
    } catch (err) {
      console.error('Error fetching connect status:', err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectOrContinue = async () => {
    try {
      setActionLoading(true);
      setRedirectUrl(null);
      setShowFallback(false);

      const { data, error } = await supabase.functions.invoke('create-connect-account');

      if (error) throw error;

      if (data?.url) {
        // Store the URL for fallback
        setRedirectUrl(data.url);
        
        // Attempt to open in new tab (works outside iframe restrictions)
        const newWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
        
        if (newWindow) {
          // Successfully opened - show "opened in new tab" state
          toast.success(language === 'el' 
            ? 'Η ρύθμιση άνοιξε σε νέα καρτέλα' 
            : 'Setup opened in new tab');
        } else {
          // Popup was blocked - show fallback immediately
          setShowFallback(true);
          toast.warning(language === 'el'
            ? 'Το popup μπλοκαρίστηκε. Πατήστε το κουμπί παρακάτω.'
            : 'Popup blocked. Click the button below.');
        }
      } else {
        setActionLoading(false);
      }
    } catch (err) {
      console.error('Error creating connect account:', err);
      toast.error(language === 'el' ? 'Σφάλμα κατά τη ρύθμιση' : 'Error during setup');
      setActionLoading(false);
    }
  };

  const handleViewDashboard = async () => {
    try {
      setActionLoading(true);
      setDashboardUrl(null);

      const { data, error } = await supabase.functions.invoke('create-connect-login-link');

      if (error) throw error;

      if (data?.url) {
        // Don't try window.open() - just show the fallback UI with explicit links
        // This avoids COOP blocks on iOS Safari
        setDashboardUrl(data.url);
      }
    } catch (err) {
      console.error('Error creating login link:', err);
      toast.error(language === 'el' ? 'Σφάλμα κατά τη φόρτωση' : 'Error loading dashboard');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyDashboardLink = async () => {
    if (!dashboardUrl) return;
    try {
      await navigator.clipboard.writeText(dashboardUrl);
      toast.success(language === 'el' ? 'Ο σύνδεσμος αντιγράφηκε' : 'Link copied to clipboard');
    } catch {
      toast.error(language === 'el' ? 'Αποτυχία αντιγραφής' : 'Failed to copy link');
    }
  };

  // Show dashboard link options (always show explicit links, no auto-open)
  if (dashboardUrl) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          <ExternalLink className="h-8 w-8 text-primary" />
          
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {language === 'el' 
              ? 'Επιλέξτε πώς θέλετε να ανοίξετε τον πίνακα πληρωμών:' 
              : 'Choose how to open your payment dashboard:'}
          </p>
          
          {/* Primary: Open in same tab - most reliable on iOS */}
          <a
            href={dashboardUrl}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors w-full max-w-xs"
          >
            {language === 'el' ? 'Άνοιγμα Πίνακα' : 'Open Dashboard'}
          </a>
          
          <p className="text-xs text-muted-foreground">
            {language === 'el' ? 'Συνιστάται για iPhone' : 'Recommended for iPhone'}
          </p>
          
          {/* Secondary options */}
          <div className="flex gap-2">
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              {language === 'el' ? 'Νέα καρτέλα' : 'New tab'}
            </a>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyDashboardLink}
            >
              {language === 'el' ? 'Αντιγραφή' : 'Copy link'}
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDashboardUrl(null)}
          >
            {language === 'el' ? 'Πίσω' : 'Go back'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show redirect fallback UI if waiting for redirect
  if (redirectUrl) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          {!showFallback && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
          
          <p className="text-sm text-muted-foreground">
            {showFallback 
              ? (language === 'el' 
                  ? 'Το popup μπλοκαρίστηκε. Πατήστε παρακάτω για να ανοίξει η ρύθμιση:' 
                  : 'Popup blocked. Click below to open setup:')
              : (language === 'el'
                  ? 'Η ρύθμιση άνοιξε σε νέα καρτέλα. Επιστρέψτε εδώ όταν ολοκληρώσετε.'
                  : 'Setup opened in a new tab. Return here when done.')
            }
          </p>
          
          <a
            href={redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            {language === 'el' ? 'Άνοιγμα Ρύθμισης Stripe' : 'Open Stripe Setup'}
          </a>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRedirectUrl(null);
              setShowFallback(false);
              setActionLoading(false);
              syncConnectStatus();
            }}
          >
            {language === 'el' ? 'Ολοκλήρωσα τη ρύθμιση' : 'I completed setup'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 hidden sm:block">
              <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-lg whitespace-nowrap">{t.title}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t.description}</CardDescription>
            </div>
          </div>
          {/* Icons on mobile below the text */}
          <div className="flex sm:hidden items-center gap-2 mt-1">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <CreditCard className="h-3 w-3 text-primary" />
            </div>
            <div className="p-1.5 rounded-lg bg-primary/10">
              <CheckCircle2 className="h-3 w-3 text-primary" />
            </div>
          </div>
          <Badge 
            variant={status === 'connected' ? 'default' : status === 'pending' ? 'secondary' : 'outline'}
            className={`text-[10px] sm:text-xs ${status === 'connected' && payoutsEnabled ? 'bg-green-500 hover:bg-green-600' : ''}`}
          >
            {status === 'not_connected' && t.notConnected}
            {status === 'pending' && t.pendingOnboarding}
            {status === 'connected' && (payoutsEnabled ? t.payoutsEnabled : t.connected)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        {status === 'not_connected' && (
          <>
            <p className="text-xs sm:text-sm text-muted-foreground">{t.connectDescription}</p>
            
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2">
              <p className="text-xs sm:text-sm font-medium">{t.whatYouNeed}</p>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                  {t.bankAccount}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  {t.idVerification}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  {t.businessInfo}
                </li>
              </ul>
            </div>
            
            <Button 
              onClick={handleConnectOrContinue} 
              disabled={actionLoading}
              className="w-full text-xs sm:text-sm h-9 sm:h-10"
              size="lg"
            >
              {actionLoading ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              )}
              {t.connectAccount}
            </Button>
          </>
        )}

        {status === 'pending' && (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t.pendingDescription}</AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleConnectOrContinue} 
              disabled={actionLoading}
              className="w-full"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              {t.completeSetup}
            </Button>
          </>
        )}

        {status === 'connected' && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-muted-foreground">{t.connectedDescription}</span>
            </div>
            
            <p className="text-xs text-muted-foreground italic">
              {t.commissionNote}
            </p>
            
            <Button 
              variant="outline"
              onClick={handleViewDashboard} 
              disabled={actionLoading}
              className="w-full"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              {t.viewDashboard}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StripeConnectOnboarding;
