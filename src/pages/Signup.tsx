import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { safeSelectChange } from "@/lib/formSafeUpdate";
import { MapPin, Heart, ArrowLeft, Store, Sun, Moon, Sparkles, Clock, GraduationCap, Mail, CheckCircle, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/hooks/useLanguage";
import { authTranslations } from "@/translations/authTranslations";
import { toastTranslations } from "@/translations/toastTranslations";
import { validationTranslations, formatValidationMessage } from "@/translations/validationTranslations";
import { Confetti, useConfetti } from "@/components/ui/confetti";
import { useBetaMode } from "@/hooks/useBetaMode";
import { OceanLoader } from "@/components/ui/ocean-loader";
import { getCategoriesForUser } from "@/lib/unifiedCategories";
import { CYPRUS_UNIVERSITIES, getUniversityByDomain, isValidUniversityEmail } from "@/lib/cyprusUniversities";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCityOptions, translateCity, cyprusCities } from "@/lib/cityTranslations";

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();
  const t = authTranslations[language];
  const tt = toastTranslations[language];
  const vt = validationTranslations[language];
  const confetti = useConfetti();
  const { isBetaMode, isLoading: betaLoading, betaMessage } = useBetaMode();

  const signupSchema = z.object({
    firstName: z.string().trim().min(2, {
      message: vt.nameRequired
    }),
    lastName: z.string().trim().min(2, {
      message: vt.nameRequired
    }),
    age: z.coerce.number().min(15, {
      message: formatValidationMessage(vt.minValue, { min: 15 })
    }).max(100),
    email: z.string().trim().email({
      message: vt.invalidEmail
    }),
    password: z.string().min(6, {
      message: vt.passwordTooShort
    }),
    town: z.string().min(1, {
      message: vt.selectOption
    }),
    gender: z.enum(['male', 'female', 'other']).optional(),
    preferences: z.array(z.string()).optional(),
    isStudent: z.boolean().optional(),
    universityEmail: z.string().email().optional().or(z.literal('')),
    selectedUniversity: z.string().optional()
  });

  type SignupFormValues = z.infer<typeof signupSchema>;
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      age: 18,
      email: "",
      password: "",
      town: "",
      gender: undefined,
      preferences: [],
      isStudent: false,
      universityEmail: "",
      selectedUniversity: ""
    }
  });
  
  const [isStudent, setIsStudent] = useState(false);
  const [universityEmail, setUniversityEmail] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [studentEmailError, setStudentEmailError] = useState("");
  const [studentVerificationSent, setStudentVerificationSent] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);

  // Validate university email when it changes
  useEffect(() => {
    if (universityEmail && isStudent) {
      const domain = universityEmail.split('@')[1]?.toLowerCase();
      if (domain && selectedUniversity) {
        const matchingUni = CYPRUS_UNIVERSITIES.find(u => u.domain === selectedUniversity);
        if (matchingUni && domain !== matchingUni.domain) {
          setStudentEmailError(
            language === 'el' 
              ? `Το email πρέπει να είναι @${matchingUni.domain}`
              : `Email must be @${matchingUni.domain}`
          );
        } else if (!isValidUniversityEmail(universityEmail)) {
          setStudentEmailError(
            language === 'el' 
              ? 'Παρακαλώ χρησιμοποιήστε ακαδημαϊκό email'
              : 'Please use a valid university email'
          );
        } else {
          setStudentEmailError('');
        }
      }
    } else {
      setStudentEmailError('');
    }
  }, [universityEmail, selectedUniversity, isStudent, language]);

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    try {
      const redirectUrl = searchParams.get('redirect') || '/feed';
      
      // Validate student email if they selected student option
      if (isStudent && universityEmail && selectedUniversity) {
        if (!isValidUniversityEmail(universityEmail)) {
          toast.error(language === 'el' ? 'Μη έγκυρο ακαδημαϊκό email' : 'Invalid university email');
          setIsLoading(false);
          return;
        }
      }
      
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectUrl}`,
          data: {
            first_name: values.firstName,
            last_name: values.lastName,
            age: values.age,
            town: values.town,
            gender: values.gender,
            preferences: selectedPreferences,
            is_student: isStudent,
            university_email: isStudent ? universityEmail : null,
            selected_university: isStudent ? selectedUniversity : null
          }
        }
      });
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error(language === "el" ? "Αυτό το email είναι ήδη καταχωρημένο" : "This email is already registered");
        } else {
          toast.error(error.message);
        }
        return;
      }
      if (data.user) {
        // Ensure demographic/profile fields are persisted immediately (do not rely on triggers)
        const { error: profileUpsertError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: data.user.id,
              gender: values.gender ?? null,
              age: typeof values.age === "number" ? values.age : null,
              // We treat “Περιοχή” as city/town for analytics
              town: values.town,
              city: values.town,
            } as any,
            { onConflict: "id" }
          );

        if (profileUpsertError) {
          console.error("Profile upsert error on signup:", profileUpsertError);
        }

        // If student verification is needed, create the verification record and send email
        if (isStudent && universityEmail && selectedUniversity) {
          const universityData = CYPRUS_UNIVERSITIES.find(u => u.domain === selectedUniversity);
          if (universityData) {
            const { data: verificationData, error: verificationError } = await supabase
              .from('student_verifications')
              .insert({
                user_id: data.user.id,
                university_email: universityEmail,
                university_name: universityData.name,
                university_domain: universityData.domain,
                status: 'pending'
              } as any)
              .select('id')
              .single();
            
            if (verificationError) {
              console.error('Student verification insert error:', verificationError);
              toast.error(language === 'el' ? 'Αποτυχία δημιουργίας επαλήθευσης φοιτητή' : 'Failed to create student verification');
            } else if (verificationData) {
              // Send verification email (non-blocking for signup success)
              try {
                setSendingVerification(true);
                const { error: emailError } = await supabase.functions.invoke('send-student-verification-email', {
                  body: {
                    verificationId: verificationData.id,
                    universityEmail,
                    universityName: universityData.name,
                    userName: `${values.firstName} ${values.lastName}`,
                  },
                });

                if (emailError) {
                  console.error('Student verification email error:', emailError);
                  toast.error(language === 'el' ? 'Δεν στάλθηκε email επαλήθευσης στο πανεπιστήμιο' : 'Verification email was not sent');
                } else {
                  setStudentVerificationSent(true);
                  toast.success(language === 'el' ? 'Στάλθηκε email επαλήθευσης στο πανεπιστήμιο σου' : 'Verification email sent to your university inbox');
                }
              } finally {
                setSendingVerification(false);
              }
            }
          }
        }
        confetti.trigger();
        toast.success(tt.created);
        setTimeout(() => navigate(redirectUrl), 1500);
      }
    } catch (error) {
      toast.error(tt.failed);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePreference = (category: string) => {
    setSelectedPreferences(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };

  // Show loading while checking beta mode
  if (betaLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <OceanLoader size="lg" />
      </div>
    );
  }

  // Show Coming Soon if beta mode is enabled
  if (isBetaMode) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 blur-3xl">
            <div className="w-full h-full rounded-full bg-gradient-glow" />
          </div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-sunset-coral/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-seafoam/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="max-w-md w-full space-y-8 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-white hover:text-seafoam">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.back}
            </Button>
            
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-white hover:text-seafoam"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-3xl shadow-elegant p-8 md:p-12 text-center">
            {/* Logo */}
            <div className="mb-8">
              <h1 className="font-cinzel text-5xl font-bold text-primary mb-2">ΦΟΜΟ</h1>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-seafoam mx-auto rounded-full" />
            </div>

            {/* Coming Soon Icon */}
            <div className="mb-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-10 w-10 text-primary animate-pulse" />
              </div>
            </div>

            {/* Message */}
            <h2 className="font-cinzel text-3xl font-bold text-foreground mb-4">
              {language === 'el' ? betaMessage.el : betaMessage.en}
            </h2>
            
            <p className="font-inter text-muted-foreground mb-8 leading-relaxed">
              {language === 'el' 
                ? 'Ετοιμάζουμε κάτι ξεχωριστό για εσένα! Η εφαρμογή βρίσκεται σε φάση beta.'
                : 'We\'re preparing something special for you! The app is currently in beta phase.'
              }
            </p>

            {/* Sparkles decoration */}
            <div className="flex justify-center gap-2 mb-8">
              <Sparkles className="h-5 w-5 text-primary animate-bounce" style={{ animationDelay: "0s" }} />
              <Sparkles className="h-5 w-5 text-seafoam animate-bounce" style={{ animationDelay: "0.2s" }} />
              <Sparkles className="h-5 w-5 text-sunset-coral animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>

            {/* Business Signup Link */}
            <div className="pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-4">
                {language === 'el' 
                  ? 'Είστε επιχείρηση με κωδικό πρόσκλησης;'
                  : 'Are you a business with an invite code?'
                }
              </p>
              <Button
                variant="outline"
                onClick={() => navigate("/signup-business")}
                className="gap-2"
              >
                <Store className="h-4 w-4" />
                {language === 'el' ? 'Εγγραφή Επιχείρησης' : 'Business Signup'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular signup form (when beta mode is disabled)
  return <>
    <Confetti isActive={confetti.isActive} onComplete={confetti.reset} particleCount={80} />
    <div className="min-h-screen gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 blur-3xl">
          <div className="w-full h-full rounded-full bg-gradient-glow" />
        </div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sunset-coral/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-seafoam/20 rounded-full blur-3xl animate-pulse" style={{
        animationDelay: "1s"
      }} />
      </div>

      <div className="max-w-2xl w-full space-y-8 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="text-white hover:text-seafoam">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.back}
          </Button>
          
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-white hover:text-seafoam"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-3xl shadow-elegant p-8 md:p-12">
          <div className="text-center mb-8">
            <h1 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-seafoam to-aegean bg-clip-text text-transparent mb-2">
              {t.signup}
            </h1>
            <p className="font-inter text-muted-foreground">
              {t.joinUs}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({
                field
              }) => <FormItem>
                      <FormLabel>{language === "el" ? "Όνομα" : "First Name"}</FormLabel>
                      <FormControl>
                        <Input placeholder={language === "el" ? "Γιώργος" : "George"} {...field} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="lastName" render={({
                field
              }) => <FormItem>
                      <FormLabel>{language === "el" ? "Επίθετο" : "Last Name"}</FormLabel>
                      <FormControl>
                        <Input placeholder={language === "el" ? "Παπαδόπουλος" : "Papadopoulos"} {...field} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>

              <FormField control={form.control} name="age" render={({
              field
            }) => <FormItem>
                    <FormLabel>{language === "el" ? "Ηλικία" : "Age"}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="25" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="email" render={({
              field
            }) => <FormItem>
                    <FormLabel>{t.email}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t.emailPlaceholder} {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="password" render={({
              field
            }) => <FormItem>
                    <FormLabel>{t.password}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={t.passwordPlaceholder} {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="town" render={({
              field
            }) => <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {language === "el" ? "Πόλη" : "Town"}
                    </FormLabel>
                    <Select 
                      onValueChange={(v) => safeSelectChange(field.value, v, field.onChange)} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder={language === "el" ? "Επιλέξτε πόλη" : "Select town"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getCityOptions(language).map(city => <SelectItem key={city.value} value={city.value}>
                            {city.label}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="gender" render={({
              field
            }) => <FormItem>
                    <FormLabel>{language === "el" ? "Φύλο" : "Gender"}</FormLabel>
                    <Select 
                      onValueChange={(v) => safeSelectChange(field.value, v, field.onChange)} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder={language === "el" ? "Επιλέξτε φύλο (προαιρετικό)" : "Select gender (optional)"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">
                          {language === "el" ? "Άνδρας" : "Male"}
                        </SelectItem>
                        <SelectItem value="female">
                          {language === "el" ? "Γυναίκα" : "Female"}
                        </SelectItem>
                        <SelectItem value="other">
                          {language === "el" ? "Άλλο" : "Other"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />

              {/* Category Preferences - with subcategories */}
              <div className="space-y-3">
                <FormLabel className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  {language === "el" ? "Τι σας αρέσει;" : "What do you like?"}
                </FormLabel>
                <p className="text-sm text-muted-foreground">
                  {language === "el" ? "Επιλέξτε όσα θέλετε για καλύτερες προτάσεις" : "Select as many as you like for better recommendations"}
                </p>
                <div className="space-y-2">
                  {getCategoriesForUser(language).map(category => {
                    const hasSubOptions = category.hasDropdown && category.subOptions;
                    const selectedSubCount = category.subOptions?.filter(
                      sub => selectedPreferences.includes(sub.id)
                    ).length || 0;
                    const isMainSelected = selectedPreferences.includes(category.id);

                    return (
                      <div key={category.id} className="border border-border rounded-xl overflow-hidden">
                        <div className={`flex items-center justify-between p-3 transition-colors ${(isMainSelected || selectedSubCount > 0) ? "bg-primary/10" : "bg-background hover:bg-muted/50"}`}>
                          <div className="flex items-center gap-3 flex-1">
                            {!hasSubOptions && (
                              <Checkbox
                                id={`signup-${category.id}`}
                                checked={isMainSelected}
                                onCheckedChange={() => togglePreference(category.id)}
                                className="rounded"
                              />
                            )}
                            <label
                              htmlFor={!hasSubOptions ? `signup-${category.id}` : undefined}
                              className={`flex items-center gap-2 text-sm font-medium flex-1 ${!hasSubOptions ? "cursor-pointer" : ""}`}
                            >
                              <span>{category.icon}</span>
                              <span>{category.label}</span>
                              {selectedSubCount > 0 && (
                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">+{selectedSubCount}</span>
                              )}
                            </label>
                          </div>
                        </div>
                        
                        {hasSubOptions && category.subOptions && (
                          <div className="border-t border-border bg-muted/30 p-3 pl-6 space-y-2">
                            {category.subOptions.map(subOption => (
                              <div key={subOption.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`signup-${subOption.id}`}
                                  checked={selectedPreferences.includes(subOption.id)}
                                  onCheckedChange={() => togglePreference(subOption.id)}
                                  className="rounded"
                                />
                                <label
                                  htmlFor={`signup-${subOption.id}`}
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

              {/* Student Verification Section */}
              <div className="space-y-4 p-4 border border-border rounded-xl bg-muted/30">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="isStudent" 
                    checked={isStudent} 
                    onCheckedChange={(checked) => setIsStudent(checked === true)}
                    className="rounded" 
                  />
                  <label htmlFor="isStudent" className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    {language === "el" ? "Είμαι φοιτητής/τρια" : "I am a student"}
                  </label>
                </div>
                
                {isStudent && (
                  <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                    <p className="text-sm text-muted-foreground">
                      {language === "el" 
                        ? "Επαληθεύστε τη φοιτητική σας ιδιότητα για να λαμβάνετε εκπτώσεις σε επιχειρήσεις."
                        : "Verify your student status to receive discounts at businesses."
                      }
                    </p>
                    
                    <div className="space-y-2">
                      <FormLabel>{language === "el" ? "Πανεπιστήμιο" : "University"}</FormLabel>
                      <Select 
                        value={selectedUniversity} 
                        onValueChange={setSelectedUniversity}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder={language === "el" ? "Επιλέξτε πανεπιστήμιο" : "Select university"} />
                        </SelectTrigger>
                        <SelectContent>
                          {CYPRUS_UNIVERSITIES.map(uni => (
                            <SelectItem key={uni.domain} value={uni.domain}>
                              {language === "el" ? uni.nameEl : uni.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedUniversity && (
                      <div className="space-y-2 animate-in slide-in-from-top-2">
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {language === "el" ? "Ακαδημαϊκό Email" : "University Email"}
                        </FormLabel>
                        <Input
                          type="email"
                          value={universityEmail}
                          onChange={(e) => setUniversityEmail(e.target.value)}
                          placeholder={`example@${selectedUniversity}`}
                          className="rounded-xl"
                        />
                        {studentEmailError && (
                          <p className="text-sm text-destructive">{studentEmailError}</p>
                        )}
                        {universityEmail && !studentEmailError && isValidUniversityEmail(universityEmail) && (
                          <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-700 dark:text-green-400">
                              {language === "el" 
                                ? "Θα λάβετε email επαλήθευσης μετά την εγγραφή."
                                : "You will receive a verification email after signup."
                              }
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? t.signingUp : t.signupButton}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                {language === "el" ? (
                  <>Με την εγγραφή σας, αποδέχεστε τους <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">όρους χρήσης</a> και την <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">πολιτική απορρήτου</a>.</>
                ) : (
                  <>By signing up, you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">terms of use</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">privacy policy</a>.</>
                )}
              </p>

              <div className="text-center text-sm text-muted-foreground">
                {t.alreadyHaveAccount}{" "}
                <Link to="/login" className="text-primary hover:underline font-semibold">
                  {t.loginLink}
                </Link>
              </div>
            </form>
          </Form>

          <div className="mt-8 text-right">
            <Link to="/signup-business" className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors font-medium">
              <Store className="h-4 w-4" />
              {t.businessSignupLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  </>;
};
export default Signup;
