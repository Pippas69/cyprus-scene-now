import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Euro, Building2, CheckCircle, Clock, Loader2, FileText, RefreshCw, Calendar } from 'lucide-react';
import { useStudentSubsidyInvoices, useMarkInvoicePaid, useGenerateMonthlyInvoices } from '@/hooks/useStudentSubsidies';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';

const translations = {
  en: {
    title: 'Student Subsidy Invoices',
    description: 'Monthly reimbursement tracking for partner businesses',
    all: 'All', pending: 'Pending', paid: 'Paid',
    markPaid: 'Mark as Paid', noInvoices: 'No invoices found',
    redemptions: 'Redemptions', generateInvoices: 'Generate Monthly Invoices',
    paidOn: 'Paid on', totalPending: 'Total Pending', totalPaidThisMonth: 'Paid This Month',
  },
  el: {
    title: 'Τιμολόγια Φοιτητικών Επιδοτήσεων',
    description: 'Μηνιαία παρακολούθηση αποζημιώσεων για συνεργαζόμενες επιχειρήσεις',
    all: 'Όλα', pending: 'Εκκρεμή', paid: 'Πληρωμένα',
    markPaid: 'Σήμανση Πληρωμένο', noInvoices: 'Δεν βρέθηκαν τιμολόγια',
    redemptions: 'Εξαργυρώσεις', generateInvoices: 'Δημιουργία Μηνιαίων Τιμολογίων',
    paidOn: 'Πληρώθηκε', totalPending: 'Συνολικά Εκκρεμή', totalPaidThisMonth: 'Πληρωμένα Αυτόν τον Μήνα',
  },
};

export default function AdminStudentSubsidies() {
  const { language } = useLanguage();
  const t = translations[language];
  const locale = language === 'el' ? el : enUS;
  const [activeTab, setActiveTab] = useState('pending');

  const { data: invoices, isLoading } = useStudentSubsidyInvoices(activeTab === 'all' ? undefined : activeTab);
  const markPaid = useMarkInvoicePaid();
  const generateInvoices = useGenerateMonthlyInvoices();

  const pendingTotal = invoices?.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.total_subsidy_cents, 0) || 0;
  const paidThisMonth = invoices?.filter(i => {
    if (i.status !== 'paid' || !i.paid_at) return false;
    const paidDate = new Date(i.paid_at);
    const now = new Date();
    return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
  }).reduce((sum, i) => sum + i.total_subsidy_cents, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><FileText className="h-8 w-8" />{t.title}</h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <Button variant="outline" onClick={() => generateInvoices.mutate()} disabled={generateInvoices.isPending}>
          {generateInvoices.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {t.generateInvoices}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30"><Clock className="h-5 w-5 text-yellow-600" /></div><div><p className="text-2xl font-bold">€{(pendingTotal / 100).toFixed(2)}</p><p className="text-sm text-muted-foreground">{t.totalPending}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"><CheckCircle className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">€{(paidThisMonth / 100).toFixed(2)}</p><p className="text-sm text-muted-foreground">{t.totalPaidThisMonth}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList><TabsTrigger value="all">{t.all}</TabsTrigger><TabsTrigger value="pending">{t.pending}</TabsTrigger><TabsTrigger value="paid">{t.paid}</TabsTrigger></TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : !invoices?.length ? (
            <div className="text-center py-8 text-muted-foreground">{t.noInvoices}</div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12"><AvatarImage src={invoice.business?.logo_url || undefined} /><AvatarFallback><Building2 className="h-6 w-6" /></AvatarFallback></Avatar>
                    <div>
                      <p className="font-medium">{invoice.business?.name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(invoice.period_start), 'MMM yyyy', { locale })}</span>
                        <span>{invoice.total_redemptions} {t.redemptions}</span>
                      </div>
                      {invoice.paid_at && <p className="text-xs text-green-600 mt-1">{t.paidOn}: {format(new Date(invoice.paid_at), 'PPP', { locale })}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold">€{(invoice.total_subsidy_cents / 100).toFixed(2)}</p>
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>
                        {invoice.status === 'paid' ? <><CheckCircle className="h-3 w-3 mr-1" />{t.paid}</> : <><Clock className="h-3 w-3 mr-1" />{t.pending}</>}
                      </Badge>
                    </div>
                    {invoice.status === 'pending' && (
                      <Button size="sm" onClick={() => markPaid.mutateAsync(invoice.id)} disabled={markPaid.isPending}>
                        {markPaid.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.markPaid}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
