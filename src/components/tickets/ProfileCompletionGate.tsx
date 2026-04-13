import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Phone, MapPin } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { getCityOptions } from "@/lib/cityTranslations";
import { InlineAuthGate } from "./InlineAuthGate";
import { parseE164Phone } from "@/lib/countries";

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
    cyprusPhoneHint: "8 ψηφία",
    greecePhoneHint: "10 ψηφία",
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
    cyprusPhoneHint: "8 digits",
    greecePhoneHint: "10 digits",
    fillAll: "Please fill in all fields",
  },
};

interface ProfileCompletionGateProps {
  onComplete: (profile: { firstName: string; lastName: string; phone: string; city: string; email: string }) => void;
}

export const ProfileCompletionGate: React.FC<ProfileCompletionGateProps> = ({ onComplete }) => {
  const { language } = useLanguage();
  const t = translations[language];

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(''); // E.164 format
  const [city, setCity] = useState('');
  const [greekCity, setGreekCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [authRetryTick, setAuthRetryTick] = useState(0);

  const cityOptions = getCityOptions(language);

  // Determine if stored phone is CY/GR for city logic
  const getCountryFromPhone = (phoneVal: string): 'CY' | 'GR' | 'OTHER' => {
    const parsed = parseE164Phone(phoneVal);
    if (!parsed) return 'CY';
    if (parsed.countryCode === 'CY') return 'CY';
    if (parsed.countryCode === 'GR') return 'GR';
    return 'OTHER';
  };

  const phoneCountry = getCountryFromPhone(phone);

  // Check if profile is already complete; if not authenticated, show auth gate first
  useEffect(() => {
    const checkProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user ?? null;
      if (!user) {
        user = (await supabase.auth.getUser()).data.user ?? null;
      }

      if (!user) {
        setAuthRequired(true);
        setChecking(false);
        return;
      }

      setAuthRequired(false);

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, city, town')
        .eq('id', user.id)
        .single();

      if (profile) {
        const p = profile as any;
        const profileCity = p.city || p.town || '';
        const storedPhone = p.phone || '';
        const phoneDigitCount = storedPhone.replace(/\D/g, '').length;
        const hasValidPhone = phoneDigitCount >= 8;

        if (p.first_name && p.last_name && hasValidPhone && profileCity) {
          const authEmail = (await supabase.auth.getUser()).data.user?.email || '';

          onComplete({
            firstName: p.first_name,
            lastName: p.last_name,
            phone: storedPhone,
            city: profileCity,
            email: authEmail,
          });
        } else {
          if (p.first_name) setFirstName(p.first_name);
          if (p.last_name) setLastName(p.last_name);

          if (storedPhone) {
            setPhone(storedPhone); // Already E.164
          }

          if (profileCity) {
            const parsedCountry = getCountryFromPhone(storedPhone);
            if (parsedCountry === 'GR') {
              setGreekCity(profileCity);
            } else {
              setCity(profileCity);
            }
          }
        }
      }
      setChecking(false);
    };
    checkProfile();
  }, [authRetryTick]);

  const phoneDigitCount = phone.replace(/\D/g, '').length;
  const isPhoneValid = phoneDigitCount >= 8;

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error(t.fillAll);
      return;
    }

    const selectedCity = phoneCountry === 'GR' ? greekCity : city;
    if (phoneCountry !== 'OTHER' && !selectedCity.trim()) {
      toast.error(t.fillAll);
      return;
    }

    if (!isPhoneValid) {
      toast.error(t.invalidPhone);
      return;
    }

    setLoading(true);
    try {
      let user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user ?? null;
      }
      if (!user) throw new Error('Not authenticated');

      // Phone is already E.164 from PhoneInput
      const fullPhone = phone;
      const finalCity = phoneCountry === 'GR' ? greekCity.trim() : (phoneCountry === 'OTHER' ? greekCity.trim() || city : city);

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: fullPhone,
          city: finalCity.trim(),
          town: finalCity.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

      const authEmail = (await supabase.auth.getUser()).data.user?.email || '';

      onComplete({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: fullPhone,
        city: selectedCity.trim(),
        email: authEmail,
      });
    } catch (err: any) {
      if (err?.message === 'Not authenticated') {
        setAuthRequired(true);
      }
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

  if (authRequired) {
    return (
      <div className="space-y-4">
        <InlineAuthGate onAuthSuccess={() => {
          setAuthRequired(false);
          setChecking(true);
          setAuthRetryTick((prev) => prev + 1);
        }} />
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
              maxLength={expectedPhoneLength}
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d]/g, '');
                setPhone(val.slice(0, expectedPhoneLength));
              }}
              placeholder={country === 'CY' ? '99123456' : '6912345678'}
              className="h-9 text-sm flex-1"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {country === 'CY' ? t.cyprusPhoneHint : t.greecePhoneHint}
          </p>
          {!!phoneDigits && !isPhoneLengthValid && (
            <p className="text-[10px] text-destructive">{t.invalidPhone}</p>
          )}
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
          disabled={
            loading ||
            !firstName.trim() ||
            !lastName.trim() ||
            !phone.trim() ||
            !isPhoneLengthValid ||
            (country === 'CY' ? !city : !greekCity.trim())
          }
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
