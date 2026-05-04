import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Target, MessageCircle, Ticket, Shield, Upload, Key, CheckCircle2, XCircle, TrendingUp, Users, Building2, Star } from "lucide-react";
import LanguageToggle from "@/components/LanguageToggle";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MAPBOX_CONFIG } from "@/config/mapbox";
import { useBetaMode, validateInviteCode } from "@/hooks/useBetaMode";
import { useLanguage } from "@/hooks/useLanguage";
import { BusinessCategorySelector } from "@/components/business/BusinessCategorySelector";
import { getCityOptions } from "@/lib/cityTranslations";
import { compressImage } from "@/lib/imageCompression";

const SignupBusiness = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const { isBetaMode, isLoading: betaLoading } = useBetaMode();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lng: number; lat: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [inviteCodeStatus, setInviteCodeStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [inviteCodeError, setInviteCodeError] = useState<string>("");

  const formSchema = z.object({
    inviteCode: z.string().min(1, language === "el" ? "Απαιτείται κωδικός πρόσκλησης" : "Invite code is required"),
    businessName: z.string().min(2, "Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες"),
    category: z.array(z.string()).min(1, "Επιλέξτε τουλάχιστον μία κατηγορία"),
    city: z.string().min(1, "Επιλέξτε πόλη"),
    address: z.string().min(5, "Εισάγετε διεύθυνση"),
    email: z.string().email("Μη έγκυρο email"),
    phone: z.string()
      .regex(/^[0-9\s\-\+\(\)]+$/, language === "el" ? "Μη έγκυρο τηλέφωνο" : "Invalid phone number")
      .refine(v => v.replace(/\D/g, "").length >= 8, { message: language === "el" ? "Τουλάχιστον 8 ψηφία" : "Phone must be at least 8 digits" })
      .refine(v => v.replace(/\D/g, "").length <= 15, { message: language === "el" ? "Μέχρι 15 ψηφία" : "Phone cannot exceed 15 digits" }),
    website: z.string().optional(),
    password: z.string().min(8, "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες"),
    confirmPassword: z.string(),
    description: z.string().max(300, "Μέχρι 300 χαρακτήρες").optional(),
    termsAccepted: z.boolean().refine(v => v === true, "Πρέπει να αποδεχτείτε τους όρους")
  }).refine(d => d.password === d.confirmPassword, { message: "Οι κωδικοί δεν ταιριάζουν", path: ["confirmPassword"] });

  type FormData = z.infer<typeof formSchema>;

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { category: [], termsAccepted: false, inviteCode: "" }
  });

  const selectedCategories = watch("category") || [];
  const address = watch("address");
  const city = watch("city");
  const inviteCode = watch("inviteCode");

  useEffect(() => {
    if (!inviteCode || inviteCode.length < 5) { setInviteCodeStatus("idle"); setInviteCodeError(""); return; }
    const id = setTimeout(async () => {
      setInviteCodeStatus("checking");
      const result = await validateInviteCode(inviteCode);
      if (result.valid) { setInviteCodeStatus("valid"); setInviteCodeError(""); }
      else {
        setInviteCodeStatus("invalid");
        const msgs: Record<string, { el: string; en: string }> = {
          invalid: { el: "Μη έγκυρος κωδικός", en: "Invalid code" },
          inactive: { el: "Ο κωδικός έχει απενεργοποιηθεί", en: "Code has been deactivated" },
          expired: { el: "Ο κωδικός έχει λήξει", en: "Code has expired" },
          used: { el: "Ο κωδικός έχει χρησιμοποιηθεί", en: "Code has already been used" },
          error: { el: "Σφάλμα επαλήθευσης", en: "Verification error" },
        };
        const m = msgs[result.error || "error"];
        setInviteCodeError(language === "el" ? m.el : m.en);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [inviteCode, isBetaMode, language]);

  useEffect(() => {
    if (!address || !city) { setCoordinates(null); return; }
    const id = setTimeout(async () => {
      setGeocoding(true);
      try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${address}, ${city}, Cyprus`)}.json?access_token=${MAPBOX_CONFIG.publicToken}&country=cy&limit=1`);
        const data = await res.json();
        if (data.features?.length > 0) { const [lng, lat] = data.features[0].center; setCoordinates({ lng, lat }); }
        else setCoordinates(null);
      } catch { setCoordinates(null); } finally { setGeocoding(false); }
    }, 1000);
    return () => clearTimeout(id);
  }, [address, city]);

  const handleCategoryChange = (category: string, checked: boolean) => {
    setValue("category", checked ? [...selectedCategories, category] : selectedCategories.filter(c => c !== category));
  };

  const onSubmit = async (data: FormData) => {
    if (!data.inviteCode) { toast({ title: language === "el" ? "Σφάλμα" : "Error", description: language === "el" ? "Απαιτείται κωδικός πρόσκλησης" : "Invite code is required", variant: "destructive" }); return; }
    const codeValidation = await validateInviteCode(data.inviteCode);
    if (!codeValidation.valid) { toast({ title: language === "el" ? "Σφάλμα" : "Error", description: inviteCodeError || (language === "el" ? "Μη έγκυρος κωδικός" : "Invalid invite code"), variant: "destructive" }); return; }

    setIsSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: data.email, password: data.password, options: { data: { first_name: data.businessName, role: "business" } } });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Αποτυχία δημιουργίας λογαριασμού");

      let logoUrl = null;
      if (logoFile) {
        const compressed = await compressImage(logoFile, 800, 800, 0.9);
        const fileName = `${authData.user.id}/${authData.user.id}-${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from("business-logos").upload(fileName, compressed, { contentType: "image/jpeg" });
        if (uploadError) toast({ title: "Προειδοποίηση", description: "Δεν ήταν δυνατή η αποθήκευση του λογότυπου.", variant: "default" });
        else if (uploadData) { const { data: { publicUrl } } = supabase.storage.from("business-logos").getPublicUrl(fileName); logoUrl = publicUrl; }
      }

      let businessId: string | null = null;
      if (coordinates) {
        const { data: bData, error: bError } = await supabase.rpc("create_business_with_geo", { p_user_id: authData.user.id, p_name: data.businessName, p_category: data.category, p_city: data.city, p_address: data.address, p_phone: data.phone, p_website: data.website || null, p_description: data.description || null, p_logo_url: logoUrl, p_longitude: coordinates.lng, p_latitude: coordinates.lat });
        if (bError) throw bError;
        businessId = bData;
      } else {
        const { data: bData, error: bError } = await supabase.from("businesses").insert({ user_id: authData.user.id, name: data.businessName, category: data.category, city: data.city, address: data.address, phone: data.phone, website: data.website || null, description: data.description || null, logo_url: logoUrl, verified: false }).select("id").single();
        if (bError) throw bError;
        businessId = bData?.id;
      }

      if (data.inviteCode && businessId) {
        const normalizedCode = data.inviteCode.toUpperCase().trim();
        const { data: codeData } = await supabase.from("beta_invite_codes").select("current_uses").eq("code", normalizedCode).single();
        await supabase.from("beta_invite_codes").update({ current_uses: (codeData?.current_uses || 0) + 1, used_by: authData.user.id, business_id: businessId, used_at: new Date().toISOString() }).eq("code", normalizedCode);
        const GROWTH_PLAN_ID = "5bd802c4-0aae-4141-a310-f41492aff7e5";
        const periodStart = new Date(); const periodEnd = new Date(); periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        await supabase.from("business_subscriptions").insert({ business_id: businessId, plan_id: GROWTH_PLAN_ID, status: "active", billing_cycle: "monthly", current_period_start: periodStart.toISOString(), current_period_end: periodEnd.toISOString(), monthly_budget_remaining_cents: 25000, commission_free_offers_remaining: 10, beta_tester: true, beta_discount_percent: 20 });
      }

      try { await supabase.functions.invoke("send-business-notification", { body: { businessEmail: data.email, businessName: data.businessName, type: "registration" } }); } catch {}
      try { await supabase.functions.invoke("send-transactional-email", { body: { templateName: "welcome-business", recipientEmail: data.email, idempotencyKey: `welcome-business-${authData.user.id}`, templateData: { businessName: data.businessName } } }); } catch {}

      toast({ title: language === "el" ? "Η εγγραφή ολοκληρώθηκε!" : "Registration completed!", description: language === "el" ? "Το αίτημά σας στάλθηκε για έγκριση." : "Your request was submitted for review.", duration: 6000 });
      setTimeout(() => navigate("/login", { state: { message: language === "el" ? "Η εγγραφή ολοκληρώθηκε. Περιμένετε έγκριση διαχειριστή." : "Registration complete. Please wait for admin approval." } }), 3000);
    } catch (error: any) {
      toast({ title: language === "el" ? "Σφάλμα" : "Error", description: error.message || (language === "el" ? "Κάτι πήγε στραβά." : "Something went wrong."), variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const copy = {
    el: {
      eyebrow: "Για Επιχειρήσεις",
      headline: "Φέρε\nπελάτες\nστην πόρτα σου.",
      sub: "Δημιούργησε events, τρέξε προσφορές και δες analytics σε πραγματικό χρόνο.",
      benefits: [
        { icon: TrendingUp, title: "Real-time Analytics", desc: "Δες πόσοι σε βρίσκουν" },
        { icon: Ticket, title: "QR Offers", desc: "Εκπτώσεις που μετράνε" },
        { icon: Users, title: "10K+ χρήστες", desc: "Κοινό έτοιμο να σε ανακαλύψει" },
        { icon: Target, title: "Boost Promotions", desc: "Αυξημένη ορατότητα" },
      ],
      planBadge: "Growth Plan · 1 χρόνο δωρεάν",
      formTitle: "Εγγραφή Επιχείρησης",
      formSub: "Ξεκίνα μέσα σε λίγα λεπτά",
      inviteLabel: "Κωδικός Πρόσκλησης",
      inviteSub: "Εισάγετε τον κωδικό που λάβατε",
      invitePlaceholder: "ΦΟΜΟ-XXXX-XXXX",
      nameLabel: "Όνομα Επιχείρησης *",
      namePlaceholder: "π.χ. Καφέ Παραλία",
      catLabel: "Κατηγορίες (μέχρι 2)",
      cityLabel: "Πόλη *",
      cityPlaceholder: "Επιλέξτε πόλη",
      addressLabel: "Διεύθυνση *",
      addressPlaceholder: "π.χ. Λεωφόρος Μακαρίου 25",
      emailLabel: "Email Επιχείρησης *",
      phoneLabel: "Τηλέφωνο *",
      websiteLabel: "Ιστοσελίδα",
      passLabel: "Κωδικός Πρόσβασης *",
      confirmLabel: "Επιβεβαίωση Κωδικού *",
      descLabel: "Περιγραφή (μέχρι 300 χαρακτήρες)",
      descPlaceholder: "Μια σύντομη περιγραφή...",
      logoLabel: "Λογότυπο (μέχρι 2 MB)",
      logoBtn: "Επιλέξτε αρχείο",
      terms1: "Συμφωνώ με τους",
      terms2: "όρους χρήσης",
      terms3: "και την",
      terms4: "πολιτική απορρήτου",
      submit: "Εγγραφή Επιχείρησης",
      submitting: "Εγγραφή...",
      verifyTitle: "Διαδικασία Επαλήθευσης",
      verifyDesc: "Μετά την εγγραφή, η επιχείρησή σας θα ελεγχθεί από την ομάδα μας.",
      back: "Επιστροφή",
      validCode: "Έγκυρος κωδικός!",
    },
    en: {
      eyebrow: "For Businesses",
      headline: "Bring\ncustomers\nto your door.",
      sub: "Create events, run offers and see real-time analytics from your dashboard.",
      benefits: [
        { icon: TrendingUp, title: "Real-time Analytics", desc: "See who's finding you" },
        { icon: Ticket, title: "QR Offers", desc: "Discounts that convert" },
        { icon: Users, title: "10K+ users", desc: "Audience ready to discover you" },
        { icon: Target, title: "Boost Promotions", desc: "Increased visibility" },
      ],
      planBadge: "Growth Plan · 1 year free",
      formTitle: "Business Registration",
      formSub: "Get started in minutes",
      inviteLabel: "Invite Code",
      inviteSub: "Enter the invite code you received",
      invitePlaceholder: "FOMO-XXXX-XXXX",
      nameLabel: "Business Name *",
      namePlaceholder: "e.g. Beach Cafe",
      catLabel: "Categories (up to 2)",
      cityLabel: "City *",
      cityPlaceholder: "Select city",
      addressLabel: "Address *",
      addressPlaceholder: "e.g. 25 Makarios Avenue",
      emailLabel: "Business Email *",
      phoneLabel: "Phone *",
      websiteLabel: "Website",
      passLabel: "Password *",
      confirmLabel: "Confirm Password *",
      descLabel: "Description (up to 300 characters)",
      descPlaceholder: "A brief description of your business...",
      logoLabel: "Business Logo (up to 2 MB)",
      logoBtn: "Choose file",
      terms1: "I agree to the",
      terms2: "terms of use",
      terms3: "and",
      terms4: "privacy policy",
      submit: "Register Business",
      submitting: "Registering...",
      verifyTitle: "Verification Process",
      verifyDesc: "After registration, your business will be reviewed by our team.",
      back: "Back",
      validCode: "Valid code!",
    },
  };
  const c = copy[language];

  const fieldClass = "h-10 rounded-xl bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25 focus:border-seafoam/50 text-sm";
  const labelClass = "text-white/55 text-xs font-medium tracking-wide uppercase mb-1 block";

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-[38%] xl:w-[34%] relative flex-col justify-between p-10 xl:p-12 overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_60%,hsl(var(--golden)/0.2),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_20%,hsl(var(--primary)/0.15),transparent)]" />
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />

        {/* Top */}
        <div className="relative z-10 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> {c.back}
          </button>
          <LanguageToggle />
        </div>

        {/* Main copy */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 space-y-6"
        >
          <p className="text-golden text-xs font-semibold tracking-widest uppercase">{c.eyebrow}</p>
          <h1 className="font-urbanist font-black text-4xl xl:text-5xl text-white leading-[0.92] tracking-tight whitespace-pre-line">
            {c.headline}
          </h1>
          <p className="text-white/40 text-sm leading-relaxed">{c.sub}</p>

          {/* Plan badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-golden/10 border border-golden/25">
            <Star className="w-3 h-3 text-golden fill-golden/50" />
            <span className="text-golden text-xs font-semibold">{c.planBadge}</span>
          </div>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 space-y-2.5"
        >
          {c.benefits.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-golden/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-golden" />
              </div>
              <div>
                <p className="text-white/80 text-xs font-semibold">{title}</p>
                <p className="text-white/35 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-white/[0.06]">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-cinzel font-black text-base text-white tracking-widest">ΦΟΜΟ</span>
          <LanguageToggle />
        </div>

        <div className="px-5 sm:px-8 lg:px-12 py-8 lg:py-10 max-w-2xl mx-auto lg:mx-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Form header */}
            <div className="mb-8 lg:mt-4">
              <p className="text-golden text-xs font-semibold tracking-widest uppercase mb-2">{c.eyebrow}</p>
              <h2 className="font-urbanist font-black text-3xl text-white">{c.formTitle}</h2>
              <p className="text-white/40 text-sm mt-1">{c.formSub}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Invite Code */}
              <div className="p-4 sm:p-5 rounded-2xl bg-golden/[0.05] border border-golden/20">
                <div className="flex items-center gap-2 mb-1">
                  <Key className="w-3.5 h-3.5 text-golden" />
                  <Label className="text-golden text-xs font-semibold tracking-wide uppercase">{c.inviteLabel}</Label>
                </div>
                <p className="text-white/35 text-xs mb-3">{c.inviteSub}</p>
                <div className="relative">
                  <Input
                    {...register("inviteCode")}
                    className={`${fieldClass} uppercase font-mono tracking-widest pr-10`}
                    placeholder={c.invitePlaceholder}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {inviteCodeStatus === "checking" && <div className="w-4 h-4 border-2 border-golden border-t-transparent rounded-full animate-spin" />}
                    {inviteCodeStatus === "valid" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    {inviteCodeStatus === "invalid" && <XCircle className="h-4 w-4 text-red-400" />}
                  </div>
                </div>
                {errors.inviteCode && <p className="text-xs text-red-400 mt-1.5">{errors.inviteCode.message}</p>}
                {inviteCodeStatus === "invalid" && inviteCodeError && <p className="text-xs text-red-400 mt-1.5">{inviteCodeError}</p>}
                {inviteCodeStatus === "valid" && <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {c.validCode}</p>}
              </div>

              {/* Business Name + Category */}
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>{c.nameLabel}</label>
                  <Input {...register("businessName")} className={fieldClass} placeholder={c.namePlaceholder} />
                  {errors.businessName && <p className="text-xs text-red-400 mt-1">{errors.businessName.message}</p>}
                </div>

                <div>
                  <label className={labelClass}>{c.catLabel}</label>
                  <BusinessCategorySelector selectedCategories={selectedCategories} onCategoryChange={handleCategoryChange} language={language} compact />
                  {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category.message}</p>}
                </div>
              </div>

              {/* City + Address */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{c.cityLabel}</label>
                  <select {...register("city")} className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white px-3 text-sm focus:border-seafoam/50 focus:outline-none">
                    <option value="" className="bg-background">{c.cityPlaceholder}</option>
                    {getCityOptions(language).map(c => <option key={c.value} value={c.value} className="bg-background">{c.label}</option>)}
                  </select>
                  {errors.city && <p className="text-xs text-red-400 mt-1">{errors.city.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>{c.addressLabel}</label>
                  <Input {...register("address")} className={fieldClass} placeholder={c.addressPlaceholder} />
                  {errors.address && <p className="text-xs text-red-400 mt-1">{errors.address.message}</p>}
                </div>
              </div>

              {/* Email + Phone */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{c.emailLabel}</label>
                  <Input type="email" {...register("email")} className={fieldClass} placeholder="info@business.com" />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>{c.phoneLabel}</label>
                  <Input {...register("phone")} className={fieldClass} placeholder="99123456" />
                  {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone.message}</p>}
                </div>
              </div>

              {/* Website */}
              <div>
                <label className={labelClass}>{c.websiteLabel}</label>
                <Input {...register("website")} className={fieldClass} placeholder="https://www.business.com" />
              </div>

              {/* Password */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{c.passLabel}</label>
                  <PasswordInput {...register("password")} className={fieldClass} />
                  {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>{c.confirmLabel}</label>
                  <PasswordInput {...register("confirmPassword")} className={fieldClass} />
                  {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={labelClass}>{c.descLabel}</label>
                <Textarea {...register("description")} className="rounded-xl bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25 focus:border-seafoam/50 text-sm resize-none" rows={3} placeholder={c.descPlaceholder} />
                {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>}
              </div>

              {/* Logo Upload */}
              <div>
                <label className={labelClass}>{c.logoLabel}</label>
                <label className="cursor-pointer block">
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:border-white/20 transition-colors ${logoFile ? "border-seafoam/30" : ""}`}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="logo" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                        <Upload className="w-3.5 h-3.5 text-white/40" />
                      </div>
                    )}
                    <span className="text-sm text-white/40">{logoFile ? logoFile.name : c.logoBtn}</span>
                  </div>
                  <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file && file.size <= 2 * 1024 * 1024) {
                      setLogoFile(file);
                      setLogoPreview(URL.createObjectURL(file));
                    } else if (file) {
                      toast({ title: language === "el" ? "Σφάλμα" : "Error", description: language === "el" ? "Το αρχείο δεν μπορεί να υπερβαίνει τα 2 MB" : "File cannot exceed 2 MB", variant: "destructive" });
                    }
                  }} />
                </label>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3">
                <Checkbox id="terms" checked={watch("termsAccepted")} onCheckedChange={checked => setValue("termsAccepted", checked as boolean)} className="mt-0.5" />
                <label htmlFor="terms" className="text-sm text-white/50 cursor-pointer leading-relaxed">
                  {c.terms1}{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-seafoam hover:underline">{c.terms2}</a>
                  {" "}{c.terms3}{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-seafoam hover:underline">{c.terms4}</a> *
                </label>
              </div>
              {errors.termsAccepted && <p className="text-xs text-red-400">{errors.termsAccepted.message}</p>}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || (isBetaMode && inviteCodeStatus !== "valid") || (watch("password") || "").trim().length < 8 || (watch("confirmPassword") || "").trim().length < 8}
                className="w-full h-12 flex items-center justify-center gap-2 bg-golden text-background font-bold rounded-xl hover:bg-golden/90 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-golden/20 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                {isSubmitting ? (
                  <><div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" /> {c.submitting}</>
                ) : (
                  <><Building2 className="w-4 h-4" /> {c.submit}</>
                )}
              </button>

              {/* Verification notice */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Shield className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white/55 text-xs font-semibold">{c.verifyTitle}</p>
                  <p className="text-white/30 text-xs mt-0.5 leading-relaxed">{c.verifyDesc}</p>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SignupBusiness;
