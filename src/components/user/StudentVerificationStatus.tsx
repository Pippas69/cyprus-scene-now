import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { StudentVerification } from '@/hooks/useStudentVerification';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';

interface StudentVerificationStatusProps {
  verification: StudentVerification;
  language: 'en' | 'el';
}

const translations = {
  en: {
    title: 'Student Verification Status',
    university: 'University',
    email: 'Email',
    status: 'Status',
    submittedOn: 'Submitted',
    approvedOn: 'Approved',
    expiresOn: 'Expires',
    rejectionReason: 'Reason',
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    pendingDescription: 'Your verification request is being reviewed by our team.',
    approvedDescription: 'You are verified as a student and can access student discounts.',
    rejectedDescription: 'Your verification request was rejected.',
  },
  el: {
    title: 'Κατάσταση Επαλήθευσης Φοιτητή',
    university: 'Πανεπιστήμιο',
    email: 'Email',
    status: 'Κατάσταση',
    submittedOn: 'Υποβλήθηκε',
    approvedOn: 'Εγκρίθηκε',
    expiresOn: 'Λήγει',
    rejectionReason: 'Αιτία',
    pending: 'Σε Αναμονή',
    approved: 'Εγκεκριμένο',
    rejected: 'Απορρίφθηκε',
    pendingDescription: 'Η αίτησή σας ελέγχεται από την ομάδα μας.',
    approvedDescription: 'Είστε επαληθευμένος φοιτητής και μπορείτε να έχετε πρόσβαση σε φοιτητικές εκπτώσεις.',
    rejectedDescription: 'Η αίτηση επαλήθευσής σας απορρίφθηκε.',
  },
};

export function StudentVerificationStatus({ verification, language }: StudentVerificationStatusProps) {
  const t = translations[language];
  const locale = language === 'el' ? el : enUS;
  
  const getStatusIcon = () => {
    switch (verification.status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };
  
  const getStatusBadge = () => {
    switch (verification.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">{t.pending}</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">{t.approved}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{t.rejected}</Badge>;
    }
  };
  
  const getDescription = () => {
    switch (verification.status) {
      case 'pending':
        return t.pendingDescription;
      case 'approved':
        return t.approvedDescription;
      case 'rejected':
        return t.rejectedDescription;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          {getStatusIcon()}
          <div className="flex-1">
            <p className="text-sm font-medium">{t.status}</p>
            {getStatusBadge()}
          </div>
        </div>
        
        <div className="grid gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.university}</span>
            <span className="font-medium">{verification.university_name}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.email}</span>
            <span className="font-medium">{verification.university_email}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.submittedOn}</span>
            <span className="font-medium">
              {format(new Date(verification.created_at), 'PPP', { locale })}
            </span>
          </div>
          
          {verification.verified_at && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t.approvedOn}</span>
              <span className="font-medium">
                {format(new Date(verification.verified_at), 'PPP', { locale })}
              </span>
            </div>
          )}
          
          {verification.expires_at && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t.expiresOn}</span>
              <span className="font-medium">
                {format(new Date(verification.expires_at), 'PPP', { locale })}
              </span>
            </div>
          )}
          
          {verification.rejection_reason && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">{t.rejectionReason}</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {verification.rejection_reason}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
