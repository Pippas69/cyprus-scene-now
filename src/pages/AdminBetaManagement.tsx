import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Key, Copy, Trash2, RefreshCw, Plus, Ticket, Users, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { adminTranslations } from '@/translations/adminTranslations';
import { AdminOceanHeader } from '@/components/admin/AdminOceanHeader';

interface InviteCode {
  id: string;
  code: string;
  created_by: string | null;
  used_by: string | null;
  business_id: string | null;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
  used_at: string | null;
}

interface BetaSettings {
  enabled: boolean;
  message_el: string;
  message_en: string;
}

const AdminBetaManagement = () => {
  const { language } = useLanguage();
  const t = (adminTranslations[language] as any).beta;
  const tc = adminTranslations[language].common;
  
  const [betaSettings, setBetaSettings] = useState<BetaSettings>({ enabled: true, message_el: '', message_en: '' });
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');
  
  // New code form
  const [newCodeNote, setNewCodeNote] = useState('');
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(1);
  const [newCodeExpiry, setNewCodeExpiry] = useState('');
  const [bulkCount, setBulkCount] = useState(5);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'beta_mode')
        .single();

      if (settingsError) throw settingsError;
      setBetaSettings(settingsData?.value as unknown as BetaSettings);

      const { data: codesData, error: codesError } = await supabase
        .from('beta_invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;
      setCodes(codesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(tc.error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBetaMode = async () => {
    try {
      const newSettings = { ...betaSettings, enabled: !betaSettings.enabled };
      
      const { error } = await supabase
        .from('app_settings')
        .update({ value: newSettings, updated_at: new Date().toISOString() })
        .eq('key', 'beta_mode');

      if (error) throw error;
      
      setBetaSettings(newSettings);
      toast.success(tc.success);
    } catch (error) {
      console.error('Error toggling beta mode:', error);
      toast.error(tc.error);
    }
  };

  const generateCode = (): string => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = 'ΦΟΜΟ-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createCode = async () => {
    setGenerating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const code = generateCode();
      const { error } = await supabase.from('beta_invite_codes').insert({
        code,
        created_by: userData.user?.id,
        max_uses: newCodeMaxUses,
        expires_at: newCodeExpiry ? new Date(newCodeExpiry).toISOString() : null,
        note: newCodeNote || null,
        is_active: true
      });

      if (error) throw error;
      
      toast.success(tc.success);
      setNewCodeNote('');
      setNewCodeExpiry('');
      fetchData();
    } catch (error) {
      console.error('Error creating code:', error);
      toast.error(tc.error);
    } finally {
      setGenerating(false);
    }
  };

  const createBulkCodes = async () => {
    setGenerating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const codesToCreate = [];
      for (let i = 0; i < bulkCount; i++) {
        codesToCreate.push({
          code: generateCode(),
          created_by: userData.user?.id,
          max_uses: 1,
          is_active: true
        });
      }

      const { error } = await supabase.from('beta_invite_codes').insert(codesToCreate);
      if (error) throw error;
      
      toast.success(tc.success);
      fetchData();
    } catch (error) {
      console.error('Error creating bulk codes:', error);
      toast.error(tc.error);
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(language === 'el' ? 'Αντιγράφηκε!' : 'Copied!');
  };

  const toggleCodeActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('beta_invite_codes')
        .update({ is_active: !currentActive })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(tc.success);
      fetchData();
    } catch (error) {
      toast.error(tc.error);
    }
  };

  const deleteCode = async (id: string) => {
    if (!confirm(language === 'el' ? 'Διαγραφή κωδικού;' : 'Delete code?')) return;
    
    try {
      const { error } = await supabase.from('beta_invite_codes').delete().eq('id', id);
      if (error) throw error;
      
      toast.success(tc.success);
      fetchData();
    } catch (error) {
      toast.error(tc.error);
    }
  };

  const getCodeStatus = (code: InviteCode): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (!code.is_active) return { label: language === 'el' ? 'Ανενεργός' : 'Inactive', variant: 'secondary' };
    if (code.expires_at && new Date(code.expires_at) < new Date()) return { label: language === 'el' ? 'Έληξε' : 'Expired', variant: 'destructive' };
    if (code.current_uses >= code.max_uses) return { label: language === 'el' ? 'Χρησιμοποιήθηκε' : 'Used', variant: 'outline' };
    return { label: language === 'el' ? 'Ενεργός' : 'Active', variant: 'default' };
  };

  const filteredCodes = codes.filter(code => {
    const status = getCodeStatus(code);
    if (filter === 'all') return true;
    if (filter === 'active') return status.label === (language === 'el' ? 'Ενεργός' : 'Active');
    if (filter === 'used') return status.label === (language === 'el' ? 'Χρησιμοποιήθηκε' : 'Used');
    if (filter === 'expired') return status.label === (language === 'el' ? 'Έληξε' : 'Expired');
    return true;
  });

  const stats = {
    total: codes.length,
    active: codes.filter(c => c.is_active && c.current_uses < c.max_uses && (!c.expires_at || new Date(c.expires_at) > new Date())).length,
    used: codes.filter(c => c.current_uses >= c.max_uses).length,
    expired: codes.filter(c => c.expires_at && new Date(c.expires_at) < new Date()).length
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminOceanHeader
        title={t.title}
        subtitle={t.description}
      />

      <div className="max-w-7xl mx-auto px-4 pb-8 space-y-6">
        {/* Beta Mode Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-[hsl(var(--ocean))]" />
              {t.betaMode}
            </CardTitle>
            <CardDescription>{t.betaModeDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {betaSettings.enabled 
                    ? (language === 'el' ? 'Λειτουργία Beta Ενεργή' : 'Beta Mode Active')
                    : (language === 'el' ? 'Λειτουργία Beta Ανενεργή' : 'Beta Mode Inactive')
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {betaSettings.enabled 
                    ? (language === 'el' ? 'Μόνο επιχειρήσεις με κωδικό πρόσκλησης μπορούν να εγγραφούν' : 'Only businesses with invite codes can register')
                    : (language === 'el' ? 'Όλοι μπορούν να εγγραφούν' : 'Everyone can register')
                  }
                </p>
              </div>
              <Switch checked={betaSettings.enabled} onCheckedChange={toggleBetaMode} />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-t-2 border-[hsl(var(--aegean))]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-[hsl(var(--aegean))]" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">{t.totalCodes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-[hsl(var(--seafoam))]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[hsl(var(--seafoam))]" />
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">{t.activeCodes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-[hsl(var(--ocean))]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[hsl(var(--ocean))]" />
                <div>
                  <p className="text-2xl font-bold">{stats.used}</p>
                  <p className="text-xs text-muted-foreground">{t.usedCodes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-[hsl(var(--soft-aegean))]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-[hsl(var(--soft-aegean))]" />
                <div>
                  <p className="text-2xl font-bold">{stats.expired}</p>
                  <p className="text-xs text-muted-foreground">{t.expiredCodes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generate Codes */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-[hsl(var(--seafoam))]" />
                {t.generateSingle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t.note}</Label>
                <Input 
                  value={newCodeNote}
                  onChange={(e) => setNewCodeNote(e.target.value)}
                  placeholder={language === 'el' ? 'π.χ. Για Restaurant ABC' : 'e.g. For Restaurant ABC'}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t.maxUses}</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    value={newCodeMaxUses}
                    onChange={(e) => setNewCodeMaxUses(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label>{t.expiry}</Label>
                  <Input 
                    type="date" 
                    value={newCodeExpiry}
                    onChange={(e) => setNewCodeExpiry(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={createCode} 
                disabled={generating} 
                className="w-full bg-[hsl(var(--seafoam))] hover:bg-[hsl(var(--seafoam))]/90"
              >
                {generating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {t.generateCode}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-[hsl(var(--ocean))]" />
                {t.generateBulk}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t.numberOfCodes}</Label>
                <Input 
                  type="number" 
                  min={1} 
                  max={50}
                  value={bulkCount}
                  onChange={(e) => setBulkCount(parseInt(e.target.value) || 5)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'el' ? 'Μέγιστο 50 κωδικοί' : 'Maximum 50 codes'}
                </p>
              </div>
              <Button 
                onClick={createBulkCodes} 
                disabled={generating} 
                variant="outline" 
                className="w-full border-[hsl(var(--ocean))] text-[hsl(var(--ocean))]"
              >
                {generating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Ticket className="h-4 w-4 mr-2" />}
                {t.generateBulkButton}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Codes Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle>{t.manageCodes}</CardTitle>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'active', 'used', 'expired'] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className={filter === f ? 'bg-[hsl(var(--ocean))]' : ''}
                  >
                    {f === 'all' && (language === 'el' ? 'Όλοι' : 'All')}
                    {f === 'active' && (language === 'el' ? 'Ενεργοί' : 'Active')}
                    {f === 'used' && (language === 'el' ? 'Χρησιμοποιημένοι' : 'Used')}
                    {f === 'expired' && (language === 'el' ? 'Ληγμένοι' : 'Expired')}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-[hsl(var(--ocean))]" />
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {tc.noData}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.code}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead>{t.uses}</TableHead>
                      <TableHead>{t.note}</TableHead>
                      <TableHead>{t.created}</TableHead>
                      <TableHead>{t.expires}</TableHead>
                      <TableHead>{tc.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCodes.map((code) => {
                      const status = getCodeStatus(code);
                      return (
                        <TableRow key={code.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-sm bg-muted px-2 py-1 rounded">{code.code}</code>
                              <Button variant="ghost" size="icon" onClick={() => copyCode(code.code)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell>{code.current_uses}/{code.max_uses}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{code.note || '-'}</TableCell>
                          <TableCell>{format(new Date(code.created_at), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{code.expires_at ? format(new Date(code.expires_at), 'dd/MM/yyyy') : '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => toggleCodeActive(code.id, code.is_active)}>
                                {code.is_active ? <CheckCircle className="h-4 w-4 text-[hsl(var(--seafoam))]" /> : <RefreshCw className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteCode(code.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminBetaManagement;
