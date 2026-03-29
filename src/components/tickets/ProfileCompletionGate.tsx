import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Phone, MapPin } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { getCityOptions } from "@/lib/cityTranslations";

const translations = {
  el: {
    title: "Ολοκλήρωση Προφίλ",
    subtitle: "Συμπληρώστε τα στοιχεία σας για να συνεχίσετε",
    firstName: "Όνομα",
    lastName: "Επίθετο",
    phone: "Τηλέφωνο",
    city: "Πόλη",
    country: "Χώρα",
    cyprus: "Κύπρος",
    greece: "Ελλάδα",
    cityPlaceholder: "Εισάγετε πόλη",
    save: "Συνέχεια",
    processing: "Αποθήκευση...",
    invalidPhone: "Μη έγκυρος αριθμός τηλεφώνου",
    cyprusPhoneHint: "8 ψηφία (π.χ. 99123456)",
    greecePhoneHint: "10 ψηφία (π.χ. 6912345678)",
    fillAll: "Συμπληρώστε όλα τα πεδία",
  },
  en: {
    title: "Complete Your Profile",
    subtitle: "Fill in your details to continue",
    firstName: "First Name",
    lastName: "Last Name",
    phone: "Phone",
    city: "City",
    country: "Country",
    cyprus: "Cyprus",
    greece: "Greece",
    cityPlaceholder: "Enter city",
    save: "Continue",
    processing: "Saving...",
    invalidPhone: "Invalid phone number",
    cyprusPhoneHint: "8 digits (e.g. 99123456)",
    greecePhoneHint: "10 digits (e.g. 6912345678)",
    fillAll: "Please fill in all fields",
  },
};

interface ProfileCompletionGateProps {
  onComplete: (profile: { firstName: string; lastName: string; phone: string; city: string }) => void;
}

export const ProfileCompletionGate: React.FC<ProfileCompletionGateProps> = ({ onComplete }) => {
  const { language } = useLanguage();
  const t = translations[language];

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<'CY' | 'GR'>('CY');
  const [city, setCity] = useState('');
  const [greekCity, setGreekCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const cityOptions = getCityOptions(language);

  // Check if profile is already complete
  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setChecking(false); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, city, town')
        .eq('id', user.id)
        .single();

      if (profile) {
        const p = profile as any;
        const profileCity = p.city || p.town || '';
        if (p.first_name && p.last_name && p.phone && profileCity) {
          onComplete({
            firstName: p.first_name,
            lastName: p.last_name,
            phone: p.phone,
            city: profileCity,
          });
        } else {
          if (p.first_name) setFirstName(p.first_name);
          if (p.last_name) setLastName(p.last_name);
          if (p.phone) setPhone(p.phone);
          if (profileCity) setCity(profileCity);
        }
      }
      setChecking(false);
    };
    checkProfile();
  }, []);

  const getPhoneDigits = (val: string) => val.replace(/\D/g, '');

  const validatePhone = (): boolean => {
    const digits = getPhoneDigits(phone);
    if (country === 'CY') {
      return digits.length === 8;
    } else {
      return digits.length === 10;
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error(t.fillAll);
      return;
    }

    const selectedCity = country === 'CY' ? city : greekCity;
    if (!selectedCity.trim()) {
      toast.error(t.fillAll);
      return;
    }

    if (!validatePhone()) {
      toast.error(t.invalidPhone);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fullPhone = country === 'CY' ? `+357${phone}` : `+30${phone}`;

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: fullPhone,
          city: selectedCity.trim(),
          town: selectedCity.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

      onComplete({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: fullPhone,
        city: selectedCity.trim(),
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="font-semibold text-base">{t.title}</h3>
        <p className="text-xs text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="space-y-3">
        {/* First Name & Last Name */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="profile-firstname" className="text-sm flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> {t.firstName}
            </Label>
            <Input
              id="profile-firstname"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-lastname" className="text-sm">{t.lastName}</Label>
            <Input
              id="profile-lastname"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Country + Phone */}
        <div className="space-y-1">
          <Label className="text-sm flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" /> {t.phone}
          </Label>
          <div className="flex gap-2">
            <Select value={country} onValueChange={(val) => { setCountry(val as 'CY' | 'GR'); setPhone(''); }}>
              <SelectTrigger className="h-9 w-[100px] text-sm shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CY">🇨🇾 +357</SelectItem>
                <SelectItem value="GR">🇬🇷 +30</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d]/g, '');
                const maxLen = country === 'CY' ? 8 : 10;
                setPhone(val.slice(0, maxLen));
              }}
              placeholder={country === 'CY' ? '99123456' : '6912345678'}
              className="h-9 text-sm flex-1"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {country === 'CY' ? t.cyprusPhoneHint : t.greecePhoneHint}
          </p>
        </div>

        {/* City */}
        <div className="space-y-1">
          <Label className="text-sm flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {t.city}
          </Label>
          {country === 'CY' ? (
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={t.city} />
              </SelectTrigger>
              <SelectContent>
                {cityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={greekCity}
              onChange={(e) => setGreekCity(e.target.value)}
              placeholder={t.cityPlaceholder}
              className="h-9 text-sm"
            />
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={loading || !firstName.trim() || !lastName.trim() || !phone.trim() || (country === 'CY' ? !city : !greekCity.trim())}
          className="w-full"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t.processing}</>
          ) : (
            t.save
          )}
        </Button>
      </div>
    </div>
  );
};
