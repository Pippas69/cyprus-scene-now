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
        <CardHeader className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
              <span className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-400 whitespace-nowrap">
                {t.verified}
              </span>
            </div>
            <Badge variant="outline" className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 text-[10px] sm:text-xs px-1.5 py-0.5 whitespace-nowrap shrink-0">
              <GraduationCap className="h-2.5 w-2.5 mr-0.5 shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-none">{verification.university_name}</span>
            </Badge>
          </div>
          <CardDescription className="text-green-600 dark:text-green-500 text-[10px] sm:text-xs mt-1">
            {t.verifiedDesc}
          </CardDescription>
        </CardHeader>
        {verification.expires_at && (
          <CardContent className="pt-0 px-3 pb-3 sm:px-4 sm:pb-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
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
        <CardHeader className="p-3 sm:p-4">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
              {t.pending}
            </span>
          </div>
          <CardDescription className="text-amber-600 dark:text-amber-500 text-[10px] sm:text-xs mt-1">
            {t.pendingDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3 sm:px-4 sm:pb-4 space-y-3">
          <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{verification.university_email}</span>
          </p>
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={submitting}
            size="sm"
            className="gap-1.5 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 whitespace-nowrap"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                {t.submitting}
              </>
            ) : (
              <>
                <Send className="h-3 w-3" />
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
      <CardHeader className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5">
          <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-xs sm:text-sm font-semibold">{t.title}</span>
        </div>
        <CardDescription className="text-[10px] sm:text-xs mt-1">
          {verification?.status === 'rejected' ? (
            <span className="flex items-center gap-1 text-red-500">
              <XCircle className="h-3 w-3 shrink-0" />
              {t.rejected}: {verification.rejection_reason || ''}
            </span>
          ) : (
            t.description
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] sm:text-xs">{t.university}</Label>
          <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
            <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue placeholder={t.selectUniversity} />
            </SelectTrigger>
            <SelectContent>
              {CYPRUS_UNIVERSITIES.map(uni => (
                <SelectItem key={uni.domain} value={uni.domain} className="text-xs sm:text-sm">
                  {language === 'el' ? uni.nameEl : uni.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] sm:text-xs">{t.email}</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            className="h-8 sm:h-9 text-xs sm:text-sm"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!email || submitting}
          size="sm"
          className="w-full gap-1.5 text-xs sm:text-sm h-8 sm:h-9"
        >
          {submitting ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              {t.submitting}
            </>
          ) : (
            <>
              <Send className="h-3 w-3" />
              {t.submit}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
