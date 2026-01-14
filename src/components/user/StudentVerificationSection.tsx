import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Mail, CheckCircle2, Clock, XCircle, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { CYPRUS_UNIVERSITIES, isValidUniversityEmail, getUniversityByDomain } from "@/lib/cyprusUniversities";
import { useStudentVerification, useSubmitStudentVerification } from "@/hooks/useStudentVerification";

interface StudentVerificationSectionProps {
  userId: string;
  userName?: string;
}

const translations = {
  en: {
    title: "Student Status",
    description: "Verify your student status to unlock exclusive discounts",
    verified: "Verified Student",
    verifiedDesc: "You have access to student discounts at participating businesses",
    pending: "Verification Pending",
    pendingDesc: "Check your university email for a verification link",
    rejected: "Verification Rejected",
    university: "University",
    selectUniversity: "Select your university",
    email: "University Email",
    emailPlaceholder: "your.email@students.ucy.ac.cy",
    submit: "Send Verification Email",
    submitting: "Sending...",
    resend: "Resend Verification Email",
    invalidEmail: "Please enter a valid university email",
    emailMismatch: "Email domain doesn't match selected university",
    success: "Verification email sent! Check your university inbox.",
    error: "Failed to send verification email",
    expiresAt: "Valid until",
  },
  el: {
    title: "Φοιτητική Ιδιότητα",
    description: "Επαλήθευσε τη φοιτητική σου ιδιότητα για αποκλειστικές εκπτώσεις",
    verified: "Επιβεβαιωμένος Φοιτητής",
    verifiedDesc: "Έχεις πρόσβαση σε φοιτητικές εκπτώσεις σε συμμετέχουσες επιχειρήσεις",
    pending: "Εκκρεμεί Επαλήθευση",
    pendingDesc: "Έλεγξε το πανεπιστημιακό σου email για τον σύνδεσμο επαλήθευσης",
    rejected: "Η Επαλήθευση Απορρίφθηκε",
    university: "Πανεπιστήμιο",
    selectUniversity: "Επίλεξε πανεπιστήμιο",
    email: "Πανεπιστημιακό Email",
    emailPlaceholder: "to.email.sou@students.ucy.ac.cy",
    submit: "Αποστολή Email Επαλήθευσης",
    submitting: "Αποστολή...",
    resend: "Επαναποστολή Email Επαλήθευσης",
    invalidEmail: "Παρακαλώ εισάγετε έγκυρο πανεπιστημιακό email",
    emailMismatch: "Το domain του email δεν ταιριάζει με το επιλεγμένο πανεπιστήμιο",
    success: "Το email επαλήθευσης στάλθηκε! Έλεγξε τα εισερχόμενά σου.",
    error: "Αποτυχία αποστολής email επαλήθευσης",
    expiresAt: "Ισχύει μέχρι",
  }
};

export function StudentVerificationSection({ userId, userName }: StudentVerificationSectionProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const { data: verification, isLoading } = useStudentVerification(userId);
  const submitMutation = useSubmitStudentVerification();
  
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validate email
    if (!isValidUniversityEmail(email)) {
      toast.error(t.invalidEmail);
      return;
    }

    const university = getUniversityByDomain(email);
    if (!university || (selectedUniversity && university.domain !== selectedUniversity)) {
      toast.error(t.emailMismatch);
      return;
    }

    setSubmitting(true);
    try {
      // Create verification record
      const result = await submitMutation.mutateAsync({ userId, email });

      // Send verification email
      const { error } = await supabase.functions.invoke('send-student-verification-email', {
        body: {
          verificationId: result.id,
          universityEmail: email,
          universityName: university.name,
          userName: userName || '',
        }
      });

      if (error) throw error;

      toast.success(t.success);
    } catch (err) {
      console.error('Failed to submit verification:', err);
      toast.error(t.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!verification) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('send-student-verification-email', {
        body: {
          verificationId: verification.id,
          universityEmail: verification.university_email,
          universityName: verification.university_name,
          userName: userName || '',
        }
      });

      if (error) throw error;
      toast.success(t.success);
    } catch (err) {
      console.error('Failed to resend verification:', err);
      toast.error(t.error);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Already verified
  if (verification?.status === 'approved') {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              {t.verified}
            </CardTitle>
            <Badge variant="outline" className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700">
              <GraduationCap className="h-3 w-3 mr-1" />
              {verification.university_name}
            </Badge>
          </div>
          <CardDescription className="text-green-600 dark:text-green-500">
            {t.verifiedDesc}
          </CardDescription>
        </CardHeader>
        {verification.expires_at && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t.expiresAt}: {new Date(verification.expires_at).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-GB')}
            </p>
          </CardContent>
        )}
      </Card>
    );
  }

  // Pending verification
  if (verification?.status === 'pending') {
    return (
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Clock className="h-5 w-5" />
            {t.pending}
          </CardTitle>
          <CardDescription className="text-amber-600 dark:text-amber-500">
            {t.pendingDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            <Mail className="inline h-4 w-4 mr-1" />
            {verification.university_email}
          </p>
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={submitting}
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.submitting}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t.resend}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Rejected or no verification - show form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          {t.title}
        </CardTitle>
        <CardDescription>
          {verification?.status === 'rejected' ? (
            <span className="flex items-center gap-1 text-red-500">
              <XCircle className="h-4 w-4" />
              {t.rejected}: {verification.rejection_reason || ''}
            </span>
          ) : (
            t.description
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t.university}</Label>
          <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
            <SelectTrigger>
              <SelectValue placeholder={t.selectUniversity} />
            </SelectTrigger>
            <SelectContent>
              {CYPRUS_UNIVERSITIES.map(uni => (
                <SelectItem key={uni.domain} value={uni.domain}>
                  {language === 'el' ? uni.nameEl : uni.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t.email}</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!email || submitting}
          className="w-full gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.submitting}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {t.submit}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
