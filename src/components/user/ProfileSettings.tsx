import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toastTranslations } from '@/translations/toastTranslations';
import { getMainCategories } from '@/lib/unifiedCategories';
import { Heart } from 'lucide-react';

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
        gender: profile.gender,
        preferences: profile.preferences || [],
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

  const togglePreference = (categoryId: string) => {
    const currentPreferences = profile.preferences || [];
    const newPreferences = currentPreferences.includes(categoryId)
      ? currentPreferences.filter((id: string) => id !== categoryId)
      : [...currentPreferences, categoryId];
    setProfile({ ...profile, preferences: newPreferences });
  };

  const text = {
    el: {
      title: 'Ρυθμίσεις Προφίλ',
      name: 'Όνομα',
      email: 'Email',
      city: 'Πόλη',
      town: 'Περιοχή',
      gender: 'Φύλο',
      genderPlaceholder: 'Επιλέξτε φύλο',
      male: 'Άνδρας',
      female: 'Γυναίκα',
      other: 'Άλλο',
      save: 'Αποθήκευση',
      interests: 'Ενδιαφέροντα',
      interestsDescription: 'Επιλέξτε τι σας αρέσει για καλύτερες προτάσεις',
    },
    en: {
      title: 'Profile Settings',
      name: 'Name',
      email: 'Email',
      city: 'City',
      town: 'Town',
      gender: 'Gender',
      genderPlaceholder: 'Select gender',
      male: 'Male',
      female: 'Female',
      other: 'Other',
      save: 'Save Changes',
      interests: 'Interests',
      interestsDescription: 'Select what you like for better recommendations',
    },
  };

  const labels = text[language];
  const categories = getMainCategories(language);

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
            <div className="space-y-2">
              <Label htmlFor="gender">{labels.gender}</Label>
              <Select
                value={profile.gender || ''}
                onValueChange={(value) => setProfile({ ...profile, gender: value })}
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder={labels.genderPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{labels.male}</SelectItem>
                  <SelectItem value="female">{labels.female}</SelectItem>
                  <SelectItem value="other">{labels.other}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Preferences */}
            <div className="space-y-3 pt-4 border-t">
              <div>
                <Label className="flex items-center gap-2 text-base">
                  <Heart className="h-4 w-4 text-primary" />
                  {labels.interests}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {labels.interestsDescription}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pref-${category.id}`}
                      checked={(profile.preferences || []).includes(category.id)}
                      onCheckedChange={() => togglePreference(category.id)}
                      className="rounded"
                    />
                    <label
                      htmlFor={`pref-${category.id}`}
                      className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                    >
                      <span>{category.icon}</span>
                      <span>{category.label}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={loading} className="mt-4">
              {labels.save}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
