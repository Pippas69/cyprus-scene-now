import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Target, MessageCircle, Ticket, Shield, Upload, Key, CheckCircle2, XCircle, Sun, Moon, Store, MapPin, Mail, Phone, Globe, Lock, Navigation } from "lucide-react";
import { useTheme } from "next-themes";
import LanguageToggle from "@/components/LanguageToggle";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { MAPBOX_CONFIG } from "@/config/mapbox";
import { useBetaMode, validateInviteCode } from "@/hooks/useBetaMode";
import { useLanguage } from "@/hooks/useLanguage";
import { BusinessCategorySelector } from "@/components/business/BusinessCategorySelector";
import { getCityOptions, cyprusCities } from "@/lib/cityTranslations";
import { compressImage } from "@/lib/imageCompression";

const SignupBusiness = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { isBetaMode, isLoading: betaLoading } = useBetaMode();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coordinates, setCoordinates] = useState<{ lng: number; lat: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [inviteCodeStatus, setInviteCodeStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [inviteCodeError, setInviteCodeError] = useState<string>('');

  const formSchema = z.object({
    inviteCode: z.string().min(1, language === 'el' ? "Απαιτείται κωδικός πρόσκλησης" : "Invite code is required"),
    businessName: z.string().min(2, "Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες"),
    category: z.array(z.string()).min(1, "Επιλέξτε τουλάχιστον μία κατηγορία"),
    city: z.string().min(1, "Επιλέξτε πόλη"),
    address: z.string().min(5, "Εισάγετε διεύθυνση"),
    email: z.string().email("Μη έγκυρο email"),
    phone: z.string()
      .regex(/^[0-9\s\-\+\(\)]+$/, language === 'el' ? 'Μη έγκυρο τηλέφωνο' : 'Invalid phone number')
      .refine((val) => val.replace(/\D/g, '').length >= 8, { message: language === 'el' ? 'Το τηλέφωνο πρέπει να έχει τουλάχιστον 8 ψηφία' : 'Phone must be at least 8 digits' })
      .refine((val) => val.replace(/\D/g, '').length <= 15, { message: language === 'el' ? 'Το τηλέφωνο δεν μπορεί να υπερβαίνει τα 15 ψηφία' : 'Phone cannot exceed 15 digits' }),
    website: z.string().optional(),
    password: z.string().min(8, "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες"),
    confirmPassword: z.string(),
    description: z.string().max(300, "Η περιγραφή δεν μπορεί να υπερβαίνει τους 300 χαρακτήρες").optional(),
    termsAccepted: z.boolean().refine(val => val === true, "Πρέπει να αποδεχτείτε τους όρους")
  }).refine(data => data.password === data.confirmPassword, {
    message: "Οι κωδικοί δεν ταιριάζουν",
    path: ["confirmPassword"]
  });

  type FormData = z.infer<typeof formSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: [],
      termsAccepted: false,
      inviteCode: ''
    }
  });

  const selectedCategories = watch("category") || [];
  const address = watch("address");
  const city = watch("city");
  const inviteCode = watch("inviteCode");

  useEffect(() => {
    if (!inviteCode || inviteCode.length < 5) {
      setInviteCodeStatus('idle');
      setInviteCodeError('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setInviteCodeStatus('checking');
      const result = await validateInviteCode(inviteCode);

      if (result.valid) {
        setInviteCodeStatus('valid');
        setInviteCodeError('');
      } else {
        setInviteCodeStatus('invalid');
        const errorMessages: Record<string, { el: string; en: string }> = {
          invalid: { el: 'Μη έγκυρος κωδικός', en: 'Invalid code' },
          inactive: { el: 'Ο κωδικός έχει απενεργοποιηθεί', en: 'Code has been deactivated' },
          expired: { el: 'Ο κωδικός έχει λήξει', en: 'Code has expired' },
          used: { el: 'Ο κωδικός έχει χρησιμοποιηθεί', en: 'Code has already been used' },
          error: { el: 'Σφάλμα επαλήθευσης', en: 'Verification error' }
        };
        const msg = errorMessages[result.error || 'error'];
        setInviteCodeError(language === 'el' ? msg.el : msg.en);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [inviteCode, isBetaMode, language]);

  useEffect(() => {
    if (!address || !city) {
      setCoordinates(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setGeocoding(true);
      try {
        const searchText = `${address}, ${city}, Cyprus`;
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchText)}.json?access_token=${MAPBOX_CONFIG.publicToken}&country=cy&limit=1`
        );
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          setCoordinates({ lng, lat });
        } else {
          setCoordinates(null);
        }
      } catch (error) {
        setCoordinates(null);
      } finally {
        setGeocoding(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [address, city]);

  const handleCategoryChange = (category: string, checked: boolean) => {
    const current = selectedCategories;
    if (checked) {
      setValue("category", [...current, category]);
    } else {
      setValue("category", current.filter(c => c !== category));
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!data.inviteCode) {
      toast({
        title: language === 'el' ? "Σφάλμα" : "Error",
        description: language === 'el' ? "Απαιτείται κωδικός πρόσκλησης" : "Invite code is required",
        variant: "destructive"
      });
      return;
    }

    const codeValidation = await validateInviteCode(data.inviteCode);
    if (!codeValidation.valid) {
      toast({
        title: language === 'el' ? "Σφάλμα" : "Error",
        description: inviteCodeError || (language === 'el' ? "Μη έγκυρος κωδικός" : "Invalid invite code"),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.businessName,
            role: 'business'
          }
        }
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Αποτυχία δημιουργίας λογαριασμού");

      let logoUrl = null;
      if (logoFile) {
        const compressed = await compressImage(logoFile, 800, 800, 0.9);
        const fileName = `${authData.user.id}/${authData.user.id}-${Date.now()}.jpg`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('business-logos')
          .upload(fileName, compressed, { contentType: 'image/jpeg' });

        if (uploadError) {
          console.error('Logo upload error:', uploadError);
          toast({
            title: "Προειδοποίηση",
            description: "Δεν ήταν δυνατή η αποθήκευση του λογότυπου. Μπορείτε να το προσθέσετε αργότερα.",
            variant: "default"
          });
        } else if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('business-logos')
            .getPublicUrl(fileName);
          logoUrl = publicUrl;
        }
      }

      let businessId: string | null = null;

      if (coordinates) {
        const { data: businessData, error: businessError } = await supabase.rpc('create_business_with_geo', {
          p_user_id: authData.user.id,
          p_name: data.businessName,
          p_category: data.category,
          p_city: data.city,
          p_address: data.address,
          p_phone: data.phone,
          p_website: data.website || null,
          p_description: data.description || null,
          p_logo_url: logoUrl,
          p_longitude: coordinates.lng,
          p_latitude: coordinates.lat
        });
        if (businessError) throw businessError;
        businessId = businessData;
      } else {
        const { data: businessData, error: businessError } = await supabase.from('businesses').insert({
          user_id: authData.user.id,
          name: data.businessName,
          category: data.category,
          city: data.city,
          address: data.address,
          phone: data.phone,
          website: data.website || null,
          description: data.description || null,
          logo_url: logoUrl,
          verified: false
        }).select('id').single();
        if (businessError) throw businessError;
        businessId = businessData?.id;
      }

      if (data.inviteCode && businessId) {
        const normalizedCode = data.inviteCode.toUpperCase().trim();

        const { data: codeData } = await supabase
          .from('beta_invite_codes')
          .select('current_uses')
          .eq('code', normalizedCode)
          .single();

        await supabase
          .from('beta_invite_codes')
          .update({
            current_uses: (codeData?.current_uses || 0) + 1,
            used_by: authData.user.id,
            business_id: businessId,
            used_at: new Date().toISOString()
          })
          .eq('code', normalizedCode);

        const GROWTH_PLAN_ID = '5bd802c4-0aae-4141-a310-f41492aff7e5';
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);

        await supabase.from('business_subscriptions').insert({
          business_id: businessId,
          plan_id: GROWTH_PLAN_ID,
          status: 'active',
          billing_cycle: 'monthly',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          monthly_budget_remaining_cents: 25000,
          commission_free_offers_remaining: 10,
          beta_tester: true,
          beta_discount_percent: 20
        });
      }

      try {
        await supabase.functions.invoke('send-business-notification', {
          body: {
            businessEmail: data.email,
            businessName: data.businessName,
            type: 'registration'
          }
        });
      } catch (emailError) {
        // Silent fail
      }

      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'welcome-business',
            recipientEmail: data.email,
            idempotencyKey: `welcome-business-${authData.user.id}`,
            templateData: { businessName: data.businessName },
          },
        });
      } catch (welcomeErr) {
        console.error('Welcome email error:', welcomeErr);
      }

      toast({
        title: language === 'el' ? "Η εγγραφή σας ολοκληρώθηκε επιτυχώς!" : "Registration completed successfully!",
        description: language === 'el'
          ? "Το αίτημά σας στάλθηκε για έγκριση. Μόλις εγκριθεί από διαχειριστή, θα μπορείτε να συνδεθείτε άμεσα."
          : "Your request was submitted for review. Once approved by an admin, you can log in immediately.",
        duration: 6000,
      });

      setTimeout(() => {
        navigate("/login", {
          state: {
            message: language === 'el'
              ? "Η εγγραφή ολοκληρώθηκε. Περιμένετε έγκριση διαχειριστή για να ενεργοποιηθεί η πρόσβασή σας."
              : "Registration complete. Please wait for admin approval to activate your access."
          }
        });
      }, 3000);
    } catch (error: any) {
      toast({
        title: language === 'el' ? "Σφάλμα" : "Error",
        description: error.message || (language === 'el' ? "Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά." : "Something went wrong. Please try again."),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:flex-col lg:justify-center lg:w-[400px] xl:w-[460px] flex-shrink-0 relative border-r border-white/[0.06] px-10 xl:px-14">
        <div className="absolute top-1/2 left-0 w-[360px] h-[360px] bg-seafoam/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
        <div className="relative z-10">
          <p className="text-seafoam text-xs font-semibold uppercase tracking-widest mb-3">
            {language === 'el' ? 'Για Επιχειρήσεις' : 'For Businesses'}
          </p>
          <h1
            className="font-urbanist font-black leading-none tracking-[-0.05em] mb-4"
            style={{ fontSize: "clamp(4rem, 6vw, 6.5rem)" }}
          >
            <span className="text-[#7EC8F0]">Φ</span><span className="text-white">ΟΜΟ</span>
          </h1>
          <p className="font-inter text-white/45 text-base leading-relaxed mb-10">
            {language === 'el'
              ? 'Φέρε την επιχείρησή σου στην πιο ενεργή νυχτερινή πλατφόρμα της Κύπρου.'
              : "Put your venue on Cyprus's most active nightlife platform."}
          </p>
          <div className="space-y-4">
            {[
              { value: '250+', label: language === 'el' ? 'Καταχωρημένα venue' : 'Registered venues' },
              { value: '€0', label: language === 'el' ? 'Για να ξεκινήσεις' : 'To get started' },
              { value: '24/7', label: language === 'el' ? 'Analytics σε πραγματικό χρόνο' : 'Real-time analytics' },
            ].map(s => (
              <div key={s.value} className="flex items-center gap-3">
                <div className="w-1 h-6 bg-seafoam rounded-full" />
                <div>
                  <div className="font-urbanist font-black text-white text-xl">{s.value}</div>
                  <div className="text-white/40 text-xs">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 pt-5 pb-3 flex-shrink-0">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {language === 'el' ? 'Επιστροφή' : 'Back'}
          </button>
          <div className="flex items-center gap-2">
            <LanguageToggle />
          </div>
        </div>

        {/* Form content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-10 py-4 pb-12">
          <div className="max-w-xl mx-auto lg:mx-0">
            <div className="mb-6">
              <h2 className="font-urbanist font-black text-white text-3xl mb-1">
                {language === 'el' ? 'Εγγραφή Επιχείρησης' : 'Business Registration'}
              </h2>
              <p className="text-white/40 text-sm">
                {language === 'el' ? 'Φέρε την επιχείρησή σου στο ΦΟΜΟ' : 'Bring your business to FOMO'}
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 sm:p-7">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Invite Code */}
                <div className="p-4 bg-seafoam/5 border border-seafoam/20 rounded-xl">
                  <Label htmlFor="inviteCode" className="flex items-center gap-2 text-seafoam font-semibold text-sm">
                    <Key className="h-4 w-4" />
                    {language === 'el' ? 'Κωδικός Πρόσκλησης *' : 'Invite Code *'}
                  </Label>
                  <p className="text-xs text-white/40 mt-1 mb-2">
                    {language === 'el'
                      ? 'Εισάγετε τον κωδικό πρόσκλησης που λάβατε για να εγγραφείτε.'
                      : 'Enter the invite code you received to register.'
                    }
                  </p>
                  <div className="relative">
                    <Input
                      id="inviteCode"
                      {...register("inviteCode")}
                      className="mt-1 uppercase font-mono tracking-wider pr-10 h-10 rounded-xl"
                      placeholder="ΦΟΜΟ-XXXX-XXXX"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5">
                      {inviteCodeStatus === 'checking' && (
                        <div className="w-4 h-4 border-2 border-seafoam border-t-transparent rounded-full animate-spin" />
                      )}
                      {inviteCodeStatus === 'valid' && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {inviteCodeStatus === 'invalid' && (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </div>
                  {errors.inviteCode && <p className="text-sm text-destructive mt-1">{errors.inviteCode.message}</p>}
                  {inviteCodeStatus === 'invalid' && inviteCodeError && (
                    <p className="text-sm text-destructive mt-1">{inviteCodeError}</p>
                  )}
                  {inviteCodeStatus === 'valid' && (
                    <p className="text-sm text-green-500 mt-1">
                      {language === 'el' ? 'Έγκυρος κωδικός!' : 'Valid code!'}
                    </p>
                  )}
                </div>

                {/* Business Name */}
                <div>
                  <div className="relative">
                    <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                    <Input
                      id="businessName"
                      {...register("businessName")}
                      className="h-10 rounded-xl pl-10 placeholder:text-white/40"
                      placeholder={language === 'el' ? 'Όνομα Επιχείρησης' : 'Business Name'}
                    />
                  </div>
                  {errors.businessName && <p className="text-sm text-destructive mt-1">{errors.businessName.message}</p>}
                </div>

                {/* Category */}
                <div>
                  <Label className="mb-2 block text-sm text-white/70">
                    {language === 'el' ? 'Κατηγορίες (Επέλεξε μέχρι 2)' : 'Categories (Select up to 2)'}
                  </Label>
                  <BusinessCategorySelector
                    selectedCategories={selectedCategories}
                    onCategoryChange={handleCategoryChange}
                    language={language}
                    compact
                  />
                  {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
                </div>

                {/* City */}
                <div>
                  <Select value={city || ""} onValueChange={(v) => setValue("city", v)}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MapPin className="h-4 w-4 text-white/25 flex-shrink-0" />
                        <SelectValue placeholder={language === 'el' ? 'Πόλη' : 'City'} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {getCityOptions(language).map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
                </div>

                {/* Address */}
                <div>
                  <div className="relative">
                    <Navigation className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                    <Input
                      id="address"
                      {...register("address")}
                      className="h-10 rounded-xl pl-10 placeholder:text-white/40"
                      placeholder={language === 'el' ? 'Διεύθυνση' : 'Address'}
                    />
                  </div>
                  {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
                </div>

                {/* Email & Phone */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        {...register("email")}
                        className="h-10 rounded-xl pl-10 placeholder:text-white/40"
                        placeholder={language === 'el' ? 'Email Επιχείρησης' : 'Business Email'}
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                      <Input
                        id="phone"
                        {...register("phone")}
                        className="h-10 rounded-xl pl-10 placeholder:text-white/40"
                        placeholder={language === 'el' ? 'Τηλέφωνο' : 'Phone'}
                      />
                    </div>
                    {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
                  </div>
                </div>

                {/* Website */}
                <div>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                    <Input
                      id="website"
                      {...register("website")}
                      className="h-10 rounded-xl pl-10 placeholder:text-white/40"
                      placeholder={language === 'el' ? 'Ιστοσελίδα (προαιρετικό)' : 'Website (optional)'}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none z-10" />
                      <PasswordInput
                        id="password"
                        {...register("password")}
                        className="h-10 rounded-xl pl-10 placeholder:text-white/40"
                        placeholder={language === 'el' ? 'Κωδικός Πρόσβασης' : 'Password'}
                      />
                    </div>
                    {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
                  </div>
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none z-10" />
                      <PasswordInput
                        id="confirmPassword"
                        {...register("confirmPassword")}
                        className="h-10 rounded-xl pl-10 placeholder:text-white/40"
                        placeholder={language === 'el' ? 'Επιβεβαίωση Κωδικού' : 'Confirm Password'}
                      />
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Textarea
                    id="description"
                    {...register("description")}
                    className="text-sm rounded-xl placeholder:text-white/40"
                    rows={3}
                    placeholder={language === 'el' ? 'Περιγραφή επιχείρησης (προαιρετικό, μέχρι 300 χαρακτήρες)' : 'Business description (optional, up to 300 characters)'}
                  />
                  {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
                </div>

                {/* Logo Upload */}
                <div>
                  <Label htmlFor="logo" className="text-sm text-white/70">
                    {language === 'el' ? 'Λογότυπο Επιχείρησης (μέχρι 2 MB)' : 'Business Logo (up to 2 MB)'}
                  </Label>
                  <div className="mt-1.5">
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2.5 border border-white/[0.08] rounded-xl hover:bg-white/[0.05] transition-colors text-sm text-white/50">
                        <Upload className="h-4 w-4" />
                        <span>{logoFile ? logoFile.name : (language === 'el' ? 'Επιλέξτε αρχείο' : 'Choose file')}</span>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file && file.size <= 2 * 1024 * 1024) {
                            setLogoFile(file);
                          } else if (file) {
                            toast({
                              title: language === 'el' ? "Σφάλμα" : "Error",
                              description: language === 'el' ? "Το αρχείο δεν μπορεί να υπερβαίνει τα 2 MB" : "File cannot exceed 2 MB",
                              variant: "destructive"
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start space-x-2.5">
                  <Checkbox
                    id="terms"
                    checked={watch("termsAccepted")}
                    onCheckedChange={checked => setValue("termsAccepted", checked as boolean)}
                    className="mt-0.5"
                  />
                  <label htmlFor="terms" className="text-sm cursor-pointer text-white/60 leading-relaxed">
                    {language === 'el'
                      ? <>Συμφωνώ με τους <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-seafoam underline">όρους χρήσης</a> και την <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-seafoam underline">πολιτική απορρήτου</a> *</>
                      : <>I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-seafoam underline">terms of use</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-seafoam underline">privacy policy</a> *</>
                    }
                  </label>
                </div>
                {errors.termsAccepted && <p className="text-sm text-destructive">{errors.termsAccepted.message}</p>}

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full h-11 bg-seafoam hover:bg-seafoam/90 text-aegean font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || (isBetaMode && inviteCodeStatus !== 'valid') || (watch("password") || "").trim().length < 8 || (watch("confirmPassword") || "").trim().length < 8}
                >
                  {isSubmitting
                    ? (language === 'el' ? "Εγγραφή..." : "Registering...")
                    : (language === 'el' ? "Εγγραφή Επιχείρησης" : "Register Business")
                  }
                </button>
              </form>

              {/* Verification Info */}
              <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-seafoam mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-white/70">
                      {language === 'el' ? 'Διαδικασία Επαλήθευσης' : 'Verification Process'}
                    </p>
                    <p className="text-xs text-white/40 mt-1 leading-relaxed">
                      {language === 'el'
                        ? 'Μετά την εγγραφή, η επιχείρησή σας θα ελεγχθεί από την ομάδα μας. Θα λάβετε email μόλις η επαλήθευση ολοκληρωθεί.'
                        : 'After registration, your business will be reviewed by our team. You will receive an email once verification is complete.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupBusiness;
