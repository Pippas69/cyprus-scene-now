import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GraduationCap, Mail, Loader2, AlertCircle } from 'lucide-react';
import { useSubmitStudentVerification } from '@/hooks/useStudentVerification';
import { isValidUniversityEmail, getUniversityByDomain, CYPRUS_UNIVERSITIES } from '@/lib/cyprusUniversities';

interface StudentVerificationFormProps {
  userId: string;
  language: 'en' | 'el';
  onSuccess?: () => void;
}

const translations = {
  en: {
    title: 'Verify Student Status',
    description: 'Enter your university email to apply for student verification',
    emailLabel: 'University Email',
    emailPlaceholder: 'your.name@ucy.ac.cy',
    submit: 'Submit for Verification',
    submitting: 'Submitting...',
    acceptedUniversities: 'Accepted Universities',
    invalidEmail: 'Please enter a valid email from an accepted Cyprus university',
    success: 'Your verification request has been submitted. You will be notified once reviewed.',
    error: 'Failed to submit verification request. Please try again.',
    alreadySubmitted: 'You already have a pending or approved verification.',
  },
  el: {
    title: 'Επαλήθευση Φοιτητικής Ιδιότητας',
    description: 'Εισάγετε το πανεπιστημιακό email σας για αίτηση επαλήθευσης',
    emailLabel: 'Πανεπιστημιακό Email',
    emailPlaceholder: 'your.name@ucy.ac.cy',
    submit: 'Υποβολή για Επαλήθευση',
    submitting: 'Υποβολή...',
    acceptedUniversities: 'Αποδεκτά Πανεπιστήμια',
    invalidEmail: 'Παρακαλώ εισάγετε έγκυρο email από αποδεκτό κυπριακό πανεπιστήμιο',
    success: 'Η αίτησή σας υποβλήθηκε. Θα ειδοποιηθείτε μόλις ελεγχθεί.',
    error: 'Αποτυχία υποβολής αίτησης. Παρακαλώ δοκιμάστε ξανά.',
    alreadySubmitted: 'Έχετε ήδη αίτηση σε εκκρεμότητα ή εγκεκριμένη.',
  },
};

export function StudentVerificationForm({ userId, language, onSuccess }: StudentVerificationFormProps) {
  const t = translations[language];
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const submitMutation = useSubmitStudentVerification();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isValidUniversityEmail(email)) {
      setError(t.invalidEmail);
      return;
    }
    
    try {
      await submitMutation.mutateAsync({ userId, email });
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      setError(t.error);
    }
  };
  
  const detectedUniversity = getUniversityByDomain(email);
  
  if (success) {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
        <GraduationCap className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700 dark:text-green-400">
          {t.success}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="university-email">{t.emailLabel}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="university-email"
                type="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            {detectedUniversity && (
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ {language === 'el' ? detectedUniversity.nameEl : detectedUniversity.name}
              </p>
            )}
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={submitMutation.isPending || !email}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.submitting}
              </>
            ) : (
              t.submit
            )}
          </Button>
        </form>
        
        <div className="pt-4 border-t">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {t.acceptedUniversities}:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {CYPRUS_UNIVERSITIES.map((uni) => (
              <li key={uni.domain}>
                • {language === 'el' ? uni.nameEl : uni.name}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
