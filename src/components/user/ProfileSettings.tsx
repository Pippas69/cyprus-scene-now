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
import { getCategoriesForUser, unifiedCategories } from '@/lib/unifiedCategories';
import { Heart, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileSettingsProps {
  userId: string;
  language: 'el' | 'en';
}

export const ProfileSettings = ({ userId, language }: ProfileSettingsProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
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

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
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
      interestsDescription: 'Επιλέξτε τι σας αρέσει για καλύτερες προτάσεις (απεριόριστες επιλογές)',
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
      interestsDescription: 'Select what you like for better recommendations (unlimited choices)',
    },
  };

  const labels = text[language];
  const categories = getCategoriesForUser(language);

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

            {/* Category Preferences with hierarchical structure (unlimited selection) */}
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
              <div className="space-y-2">
                {categories.map((category) => {
                  const isExpanded = expandedCategories.includes(category.id);
                  const hasSubOptions = category.hasDropdown && category.subOptions;
                  const selectedSubCount = category.subOptions?.filter(
                    sub => (profile.preferences || []).includes(sub.id)
                  ).length || 0;
                  const isMainSelected = (profile.preferences || []).includes(category.id);

                  return (
                    <div key={category.id} className="border border-border rounded-lg overflow-hidden">
                      <div
                        className={cn(
                          "flex items-center justify-between p-2.5 transition-colors",
                          (isMainSelected || selectedSubCount > 0) ? "bg-primary/10" : "bg-background hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          {!hasSubOptions && (
                            <Checkbox
                              id={`pref-${category.id}`}
                              checked={isMainSelected}
                              onCheckedChange={() => togglePreference(category.id)}
                            />
                          )}
                          <label
                            htmlFor={hasSubOptions ? undefined : `pref-${category.id}`}
                            className={cn(
                              "flex items-center gap-2 text-sm font-medium flex-1",
                              !hasSubOptions && "cursor-pointer"
                            )}
                            onClick={hasSubOptions ? () => toggleExpand(category.id) : undefined}
                          >
                            <span>{category.icon}</span>
                            <span>{category.label}</span>
                            {selectedSubCount > 0 && (
                              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                                +{selectedSubCount}
                              </span>
                            )}
                          </label>
                        </div>
                        
                        {hasSubOptions && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(category.id)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>

                      {hasSubOptions && isExpanded && category.subOptions && (
                        <div className="border-t border-border bg-muted/30 p-2 pl-6 space-y-1.5">
                          {category.subOptions.map(subOption => (
                            <div key={subOption.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`pref-${subOption.id}`}
                                checked={(profile.preferences || []).includes(subOption.id)}
                                onCheckedChange={() => togglePreference(subOption.id)}
                              />
                              <label
                                htmlFor={`pref-${subOption.id}`}
                                className="text-sm cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {subOption.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
