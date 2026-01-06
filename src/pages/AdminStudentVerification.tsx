import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  GraduationCap, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  Mail,
  Building2
} from 'lucide-react';
import { 
  useAdminStudentVerifications, 
  useApproveStudentVerification, 
  useRejectStudentVerification 
} from '@/hooks/useStudentVerification';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';

const translations = {
  en: {
    title: 'Student Verification',
    description: 'Review and manage student verification requests',
    all: 'All',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    approve: 'Approve',
    reject: 'Reject',
    approving: 'Approving...',
    rejecting: 'Rejecting...',
    noRequests: 'No verification requests found',
    submittedOn: 'Submitted',
    university: 'University',
    email: 'Email',
    rejectReason: 'Rejection Reason (optional)',
    rejectPlaceholder: 'Enter a reason for rejection...',
    confirmReject: 'Confirm Rejection',
    cancel: 'Cancel',
    stats: 'Statistics',
    totalPending: 'Pending',
    totalApproved: 'Approved',
    totalRejected: 'Rejected',
  },
  el: {
    title: 'Επαλήθευση Φοιτητών',
    description: 'Έλεγχος και διαχείριση αιτήσεων επαλήθευσης φοιτητών',
    all: 'Όλα',
    pending: 'Εκκρεμείς',
    approved: 'Εγκεκριμένες',
    rejected: 'Απορριφθείσες',
    approve: 'Έγκριση',
    reject: 'Απόρριψη',
    approving: 'Έγκριση...',
    rejecting: 'Απόρριψη...',
    noRequests: 'Δεν βρέθηκαν αιτήσεις επαλήθευσης',
    submittedOn: 'Υποβλήθηκε',
    university: 'Πανεπιστήμιο',
    email: 'Email',
    rejectReason: 'Αιτία Απόρριψης (προαιρετικό)',
    rejectPlaceholder: 'Εισάγετε αιτία απόρριψης...',
    confirmReject: 'Επιβεβαίωση Απόρριψης',
    cancel: 'Ακύρωση',
    stats: 'Στατιστικά',
    totalPending: 'Εκκρεμείς',
    totalApproved: 'Εγκεκριμένες',
    totalRejected: 'Απορριφθείσες',
  },
};

export default function AdminStudentVerification() {
  const { language } = useLanguage();
  const t = translations[language];
  const locale = language === 'el' ? el : enUS;
  
  const [activeTab, setActiveTab] = useState('pending');
  const [adminId, setAdminId] = useState<string>();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAdminId(data.user?.id);
    });
  }, []);
  
  const { data: verifications, isLoading } = useAdminStudentVerifications(
    activeTab === 'all' ? undefined : activeTab
  );
  const approveMutation = useApproveStudentVerification();
  const rejectMutation = useRejectStudentVerification();
  
  const pendingCount = verifications?.filter(v => v.status === 'pending').length || 0;
  const approvedCount = verifications?.filter(v => v.status === 'approved').length || 0;
  const rejectedCount = verifications?.filter(v => v.status === 'rejected').length || 0;
  
  const handleApprove = async (verificationId: string) => {
    if (!adminId) return;
    await approveMutation.mutateAsync({ verificationId, adminId });
  };
  
  const handleRejectClick = (verificationId: string) => {
    setSelectedVerification(verificationId);
    setRejectReason('');
    setRejectDialogOpen(true);
  };
  
  const handleRejectConfirm = async () => {
    if (!adminId || !selectedVerification) return;
    await rejectMutation.mutateAsync({ 
      verificationId: selectedVerification, 
      adminId,
      reason: rejectReason || undefined,
    });
    setRejectDialogOpen(false);
    setSelectedVerification(null);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" />{t.pending}</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />{t.approved}</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{t.rejected}</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8" />
            {t.title}
          </h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">{t.totalPending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{approvedCount}</p>
                  <p className="text-sm text-muted-foreground">{t.totalApproved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rejectedCount}</p>
                  <p className="text-sm text-muted-foreground">{t.totalRejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Verifications List */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">{t.all}</TabsTrigger>
                <TabsTrigger value="pending">
                  {t.pending} {pendingCount > 0 && `(${pendingCount})`}
                </TabsTrigger>
                <TabsTrigger value="approved">{t.approved}</TabsTrigger>
                <TabsTrigger value="rejected">{t.rejected}</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !verifications?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                {t.noRequests}
              </div>
            ) : (
              <div className="space-y-4">
                {verifications.map((verification) => (
                  <div
                    key={verification.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={(verification.user as { avatar_url?: string })?.avatar_url || undefined} />
                        <AvatarFallback>
                          {((verification.user as { name?: string })?.name || 'S')[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <p className="font-medium">
                          {(verification.user as { name?: string })?.name || 'Unknown'}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {verification.university_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {verification.university_email}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.submittedOn}: {format(new Date(verification.created_at), 'PPP', { locale })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {getStatusBadge(verification.status)}
                      
                      {verification.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(verification.id)}
                            disabled={approveMutation.isPending}
                          >
                            {approveMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            {t.approve}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectClick(verification.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            {t.reject}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.reject}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t.rejectReason}</label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t.rejectPlaceholder}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                {t.cancel}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRejectConfirm}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {t.confirmReject}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
