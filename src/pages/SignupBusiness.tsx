import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Target, MessageCircle, Ticket, Shield, Upload, Key, CheckCircle2, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { MAPBOX_CONFIG } from "@/config/mapbox";
import { useBetaMode, validateInviteCode } from "@/hooks/useBetaMode";
import { useLanguage } from "@/hooks/useLanguage";

const categories = ["Καφετέριες & Εστιατόρια", "Νυχτερινή Διασκέδαση", "Τέχνη & Πολιτισμός", "Fitness & Wellness", "Οικογένεια & Κοινότητα", "Επιχειρηματικότητα & Networking", "Εξωτερικές Δραστηριότητες", "Αγορές & Lifestyle"];
const cities = ["Λευκωσία", "Λεμεσός", "Λάρνακα", "Πάφος", "Παραλίμνι", "Αγία Νάπα"];

const SignupBusiness = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const { isBetaMode, isLoading: betaLoading } = useBetaMode();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coordinates, setCoordinates] = useState<{ lng: number; lat: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [inviteCodeStatus, setInviteCodeStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [inviteCodeError, setInviteCodeError] = useState<string>('');

  const formSchema = z.object({
    inviteCode: isBetaMode 
      ? z.string().min(1, language === 'el' ? "Απαιτείται κωδικός πρόσκλησης" : "Invite code is required")
      : z.string().optional(),
    businessName: z.string().min(2, "Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες"),
    category: z.array(z.string()).min(1, "Επιλέξτε τουλάχιστον μία κατηγορία"),
    city: z.string().min(1, "Επιλέξτε πόλη"),
    address: z.string().min(5, "Εισάγετε διεύθυνση"),
    email: z.string().email("Μη έγκυρο email"),
    phone: z.string().min(8, "Εισάγετε έγκυρο τηλέφωνο"),
    website: z.string().optional(),
    password: z.string().min(6, "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες"),
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

  // Validate invite code when it changes
  useEffect(() => {
    if (!isBetaMode || !inviteCode || inviteCode.length < 5) {
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

  // Auto-geocode address and city
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
    // Validate invite code if beta mode is enabled
    if (isBetaMode) {
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
    }

    setIsSubmitting(true);
    try {
      // Create user account
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

      // Upload logo if provided
      let logoUrl = null;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${authData.user.id}/${authData.user.id}-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('business-logos')
          .upload(fileName, logoFile);
        
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

      // Create business record with geo coordinates if available
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
        // Fallback to regular insert without geo coordinates
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

      // Update invite code if used and create beta subscription
      if (isBetaMode && data.inviteCode && businessId) {
        const normalizedCode = data.inviteCode.toUpperCase().trim();
        
        // First get current uses
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

        // Auto-assign Growth Plan for beta businesses
        const GROWTH_PLAN_ID = '5bd802c4-0aae-4141-a310-f41492aff7e5';
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setFullYear(periodEnd.getFullYear() + 1); // 1 year validity for beta

        await supabase.from('business_subscriptions').insert({
          business_id: businessId,
          plan_id: GROWTH_PLAN_ID,
          status: 'active',
          billing_cycle: 'monthly',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          monthly_budget_remaining_cents: 25000, // €250 Growth plan budget
          commission_free_offers_remaining: 10,  // Growth plan offers
          beta_tester: true,
          beta_discount_percent: 20 // 20% discount when they choose a paid plan post-launch
        });
      }

      // Send registration confirmation email
      try {
        await supabase.functions.invoke('send-business-notification', {
          body: {
            businessEmail: data.email,
            businessName: data.businessName,
            type: 'registration'
          }
        });
      } catch (emailError) {
        // Silent fail - email notification is not critical
      }

      // Show detailed success message
      toast({
        title: language === 'el' ? "Η εγγραφή σας ολοκληρώθηκε επιτυχώς!" : "Registration completed successfully!",
        description: language === 'el' 
          ? "Θα λάβετε email επιβεβαίωσης. Μετά την επαλήθευση από τον διαχειριστή, μπορείτε να συνδεθείτε."
          : "You will receive a confirmation email. After verification by the administrator, you can log in.",
        duration: 6000,
      });

      // Wait a moment, then redirect to login with message
      setTimeout(() => {
        navigate("/login", { 
          state: { 
            message: language === 'el'
              ? "Η εγγραφή σας ολοκληρώθηκε! Συνδεθείτε μετά την επαλήθευση από τον διαχειριστή."
              : "Registration complete! Log in after verification by the administrator."
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
    <div className="min-h-screen gradient-hero py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 blur-3xl">
          <div className="w-full h-full rounded-full bg-gradient-glow" />
        </div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sunset-coral/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <Button variant="ghost" onClick={() => navigate("/signup")} className="text-white hover:text-seafoam mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {language === 'el' ? 'Πίσω στην Εγγραφή Χρήστη' : 'Back to User Signup'}
        </Button>

        {/* Why Join ΦΟΜΟ Section */}
        <div className="bg-card/95 backdrop-blur rounded-3xl shadow-elegant p-8 mb-8">
          <h2 className="font-cinzel text-2xl text-foreground mb-6 text-center font-bold">
            {language === 'el' ? 'Τι προσφέρει το ΦΟΜΟ στις επιχειρήσεις:' : 'What ΦΟΜΟ offers to businesses:'}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-6 w-6 text-white" />
              </div>
              <p className="font-inter text-sm text-muted-foreground">
                {language === 'el' 
                  ? 'Προβολή των εκδηλώσεών σου σε χιλιάδες χρήστες στην Κύπρο'
                  : 'Showcase your events to thousands of users in Cyprus'
                }
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <p className="font-inter text-sm text-muted-foreground">
                {language === 'el'
                  ? 'Επαφή με το κοινό που ενδιαφέρεται πραγματικά για την επιχείρησή σου'
                  : 'Connect with an audience genuinely interested in your business'
                }
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Ticket className="h-6 w-6 text-white" />
              </div>
              <p className="font-inter text-sm text-muted-foreground">
                {language === 'el'
                  ? 'QR προσφορές και προγράμματα συνεργασίας που αυξάνουν την επισκεψιμότητα'
                  : 'QR offers and partnership programs that increase foot traffic'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-card rounded-3xl shadow-elegant p-8 md:p-12">
          <div className="text-center mb-8">
            <h1 className="font-cinzel text-4xl font-bold text-foreground mb-2">
              {language === 'el' ? 'Εγγραφή Επιχείρησης στο ΦΟΜΟ' : 'Business Registration to ΦΟΜΟ'}
            </h1>
            <p className="font-inter text-lg text-muted-foreground">
              {language === 'el'
                ? 'Καταχώρησε την επιχείρησή σου και έλα σε επαφή με νέο κοινό στην Κύπρο.'
                : 'Register your business and connect with new audiences in Cyprus.'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Invite Code - Only shown in beta mode */}
            {isBetaMode && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-6">
                <Label htmlFor="inviteCode" className="flex items-center gap-2 text-primary font-semibold">
                  <Key className="h-4 w-4" />
                  {language === 'el' ? 'Κωδικός Πρόσκλησης *' : 'Invite Code *'}
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {language === 'el'
                    ? 'Εισάγετε τον κωδικό πρόσκλησης που λάβατε για να εγγραφείτε στο beta.'
                    : 'Enter the invite code you received to register for the beta.'
                  }
                </p>
                <div className="relative">
                  <Input 
                    id="inviteCode" 
                    {...register("inviteCode")} 
                    className="mt-1 uppercase font-mono tracking-wider pr-10" 
                    placeholder="FOMO-XXXX-XXXX"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {inviteCodeStatus === 'checking' && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
                  <p className="text-sm text-green-600 mt-1">
                    {language === 'el' ? 'Έγκυρος κωδικός!' : 'Valid code!'}
                  </p>
                )}
              </div>
            )}

            {/* Business Name */}
            <div>
              <Label htmlFor="businessName">{language === 'el' ? 'Όνομα Επιχείρησης *' : 'Business Name *'}</Label>
              <Input id="businessName" {...register("businessName")} className="mt-1" placeholder={language === 'el' ? 'π.χ. Καφέ Παραλία' : 'e.g. Beach Cafe'} />
              {errors.businessName && <p className="text-sm text-destructive mt-1">{errors.businessName.message}</p>}
            </div>

            {/* Category */}
            <div>
              <Label>{language === 'el' ? 'Κατηγορία *' : 'Category *'}</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center space-x-2">
                    <Checkbox 
                      id={cat} 
                      checked={selectedCategories.includes(cat)} 
                      onCheckedChange={checked => handleCategoryChange(cat, checked as boolean)} 
                    />
                    <label htmlFor={cat} className="text-sm cursor-pointer">
                      {cat}
                    </label>
                  </div>
                ))}
              </div>
              {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
            </div>

            {/* City */}
            <div>
              <Label htmlFor="city">{language === 'el' ? 'Τοποθεσία / Πόλη *' : 'Location / City *'}</Label>
              <select id="city" {...register("city")} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">{language === 'el' ? 'Επιλέξτε πόλη' : 'Select city'}</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="address">{language === 'el' ? 'Διεύθυνση *' : 'Address *'}</Label>
              <Input id="address" {...register("address")} className="mt-1" placeholder={language === 'el' ? 'π.χ. Λεωφόρος Μακαρίου 25' : 'e.g. 25 Makarios Avenue'} />
              {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
            </div>

            {/* Email & Phone */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">{language === 'el' ? 'Email Επιχείρησης *' : 'Business Email *'}</Label>
                <Input id="email" type="email" {...register("email")} className="mt-1" placeholder="info@business.com" />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone">{language === 'el' ? 'Τηλέφωνο *' : 'Phone *'}</Label>
                <Input id="phone" {...register("phone")} className="mt-1" placeholder="99123456" />
                {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
              </div>
            </div>

            {/* Website */}
            <div>
              <Label htmlFor="website">{language === 'el' ? 'Ιστοσελίδα' : 'Website'}</Label>
              <Input id="website" {...register("website")} className="mt-1" placeholder="https://www.business.com" />
            </div>

            {/* Password */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">{language === 'el' ? 'Κωδικός Πρόσβασης *' : 'Password *'}</Label>
                <Input id="password" type="password" {...register("password")} className="mt-1" />
                {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <Label htmlFor="confirmPassword">{language === 'el' ? 'Επιβεβαίωση Κωδικού *' : 'Confirm Password *'}</Label>
                <Input id="confirmPassword" type="password" {...register("confirmPassword")} className="mt-1" />
                {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">{language === 'el' ? 'Περιγραφή (μέχρι 300 χαρακτήρες)' : 'Description (up to 300 characters)'}</Label>
              <Textarea id="description" {...register("description")} className="mt-1" rows={4} placeholder={language === 'el' ? 'Μια σύντομη περιγραφή της επιχείρησής σας...' : 'A brief description of your business...'} />
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
            </div>

            {/* Logo Upload */}
            <div>
              <Label htmlFor="logo">{language === 'el' ? 'Λογότυπο Επιχείρησης (μέχρι 2 MB)' : 'Business Logo (up to 2 MB)'}</Label>
              <div className="mt-2 flex items-center gap-4">
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">{logoFile ? logoFile.name : (language === 'el' ? 'Επιλέξτε αρχείο' : 'Choose file')}</span>
                  </div>
                  <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={e => {
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
                  }} />
                </label>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start space-x-2">
              <Checkbox id="terms" checked={watch("termsAccepted")} onCheckedChange={checked => setValue("termsAccepted", checked as boolean)} />
              <label htmlFor="terms" className="text-sm cursor-pointer">
                {language === 'el' 
                  ? 'Συμφωνώ με τους όρους χρήσης και την πολιτική απορρήτου *'
                  : 'I agree to the terms of use and privacy policy *'
                }
              </label>
            </div>
            {errors.termsAccepted && <p className="text-sm text-destructive">{errors.termsAccepted.message}</p>}

            {/* Submit Button */}
            <Button 
              type="submit" 
              variant="gradient" 
              size="lg" 
              className="w-full" 
              disabled={isSubmitting || (isBetaMode && inviteCodeStatus !== 'valid')}
            >
              {isSubmitting 
                ? (language === 'el' ? "Εγγραφή..." : "Registering...") 
                : (language === 'el' ? "Εγγραφή Επιχείρησης" : "Register Business")
              }
            </Button>
          </form>

          {/* Verification Info */}
          <div className="mt-8 p-4 bg-muted/50 rounded-xl">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">
                  {language === 'el' ? 'Διαδικασία Επαλήθευσης' : 'Verification Process'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
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
  );
};

export default SignupBusiness;
