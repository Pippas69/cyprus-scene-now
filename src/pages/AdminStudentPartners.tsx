import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Handshake, Plus, Loader2, Building2, Percent, MapPin, Trash2 } from 'lucide-react';
import { useAllStudentPartners, useCreateStudentPartner, useUpdateStudentPartner, useDeleteStudentPartner } from '@/hooks/useStudentPartner';
import { useLanguage } from '@/hooks/useLanguage';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const translations = {
  en: {
    title: 'Student Discount Partners',
    description: 'Manage businesses that offer student discounts',
    addPartner: 'Add Partner',
    selectBusiness: 'Select Business',
    discountPercent: 'Discount Percentage',
    notes: 'Notes (optional)',
    notesPlaceholder: 'Any special terms or conditions...',
    add: 'Add Partner',
    cancel: 'Cancel',
    noPartners: 'No partners added yet',
    active: 'Active',
    inactive: 'Inactive',
    confirmRemove: 'Are you sure you want to remove this partner?',
  },
  el: {
    title: 'Συνεργάτες Φοιτητικών Εκπτώσεων',
    description: 'Διαχείριση επιχειρήσεων που προσφέρουν φοιτητικές εκπτώσεις',
    addPartner: 'Προσθήκη Συνεργάτη',
    selectBusiness: 'Επιλέξτε Επιχείρηση',
    discountPercent: 'Ποσοστό Έκπτωσης',
    notes: 'Σημειώσεις (προαιρετικό)',
    notesPlaceholder: 'Ειδικοί όροι ή προϋποθέσεις...',
    add: 'Προσθήκη Συνεργάτη',
    cancel: 'Ακύρωση',
    noPartners: 'Δεν έχουν προστεθεί συνεργάτες ακόμα',
    active: 'Ενεργός',
    inactive: 'Ανενεργός',
    confirmRemove: 'Είστε σίγουροι ότι θέλετε να αφαιρέσετε αυτόν τον συνεργάτη;',
  },
};

export default function AdminStudentPartners() {
  const { language } = useLanguage();
  const t = translations[language];
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [discountPercent, setDiscountPercent] = useState('10');
  const [notes, setNotes] = useState('');

  const { data: partners, isLoading } = useAllStudentPartners();
  const createPartner = useCreateStudentPartner();
  const updatePartner = useUpdateStudentPartner();
  const deletePartner = useDeleteStudentPartner();

  const { data: businesses } = useQuery({
    queryKey: ['verified-businesses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('businesses').select('id, name, logo_url, city').eq('verified', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  const partnerBusinessIds = new Set(partners?.map(p => p.business_id) || []);
  const availableBusinesses = businesses?.filter(b => !partnerBusinessIds.has(b.id)) || [];

  const handleAddPartner = async () => {
    if (!selectedBusinessId) return;
    await createPartner.mutateAsync({ businessId: selectedBusinessId, discountPercent: parseInt(discountPercent), notes: notes || undefined });
    setIsAddDialogOpen(false);
    setSelectedBusinessId('');
    setDiscountPercent('10');
    setNotes('');
  };

  const handleToggleActive = async (partnerId: string, isActive: boolean) => {
    await updatePartner.mutateAsync({ partnerId, isActive });
  };

  const handleRemove = async (partnerId: string) => {
    if (window.confirm(t.confirmRemove)) {
      await deletePartner.mutateAsync(partnerId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Handshake className="h-8 w-8" />
            {t.title}
          </h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />{t.addPartner}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.addPartner}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.selectBusiness}</Label>
                <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                  <SelectTrigger><SelectValue placeholder={t.selectBusiness} /></SelectTrigger>
                  <SelectContent>
                    {availableBusinesses.map((business) => (
                      <SelectItem key={business.id} value={business.id}>
                        <div className="flex items-center gap-2"><Building2 className="h-4 w-4" />{business.name} - {business.city}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.discountPercent}</Label>
                <div className="relative">
                  <Input type="number" min="1" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} />
                  <Percent className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.notes}</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notesPlaceholder} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{t.cancel}</Button>
              <Button onClick={handleAddPartner} disabled={!selectedBusinessId || createPartner.isPending}>
                {createPartner.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{t.add}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : !partners?.length ? (
            <div className="text-center py-8 text-muted-foreground">{t.noPartners}</div>
          ) : (
            <div className="space-y-4">
              {partners.map((partner) => (
                <div key={partner.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={partner.business?.logo_url || undefined} />
                      <AvatarFallback><Building2 className="h-6 w-6" /></AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{partner.business?.name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{partner.business?.city}</span>
                        <Badge variant="secondary">{partner.discount_percent}% discount</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={partner.is_active} onCheckedChange={(checked) => handleToggleActive(partner.id, checked)} />
                      <span className="text-sm">{partner.is_active ? t.active : t.inactive}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleRemove(partner.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
