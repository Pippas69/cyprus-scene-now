import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toastTranslations } from '@/translations/toastTranslations';

interface ProfileSettingsProps {
  userId: string;
  language: 'el' | 'en';
}

export const ProfileSettings = ({ userId, language }: ProfileSettingsProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const t = toastTranslations[language];

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) setProfile(data);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        name: profile.name,
        city: profile.city,
        town: profile.town,
      })
      .eq('id', userId);

    if (error) {
      toast({
        title: t.error,
        description: t.profileUpdateFailed,
        variant: "destructive",
      });
    } else {
      toast({
        title: t.success,
        description: t.profileUpdated,
      });
    }

    setLoading(false);
  };

  const text = {
    el: {
      title: 'Ρυθμίσεις Προφίλ',
      name: 'Όνομα',
      email: 'Email',
      city: 'Πόλη',
      town: 'Περιοχή',
      save: 'Αποθήκευση',
    },
    en: {
      title: 'Profile Settings',
      name: 'Name',
      email: 'Email',
      city: 'City',
      town: 'Town',
      save: 'Save Changes',
    },
  };

  const labels = text[language];

  if (!profile) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{labels.name}</Label>
              <Input
                id="name"
                value={profile.name || ''}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{labels.email}</Label>
              <Input
                id="email"
                value={profile.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{labels.city}</Label>
              <Input
                id="city"
                value={profile.city || ''}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="town">{labels.town}</Label>
              <Input
                id="town"
                value={profile.town || ''}
                onChange={(e) => setProfile({ ...profile, town: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {labels.save}
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  );
};
