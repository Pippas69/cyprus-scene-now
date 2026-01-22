import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Loader2, MapPin, Heart, GraduationCap, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { validationTranslations, formatValidationMessage } from "@/translations/validationTranslations";
import { getMainCategories } from "@/lib/unifiedCategories";
import { CYPRUS_UNIVERSITIES, isValidUniversityEmail } from "@/lib/cyprusUniversities";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCityOptions, cyprusCities } from "@/lib/cityTranslations";

interface SignupModalProps {
  onClose: () => void;
  language: "el" | "en";
}

const createSignupSchema = (language: "el" | "en") => {
  const vt = validationTranslations[language];
  
  return z.object({
    firstName: z.string().trim().min(2, vt.nameRequired),
    lastName: z.string().trim().min(2, vt.nameRequired),
    age: z.coerce.number().min(15, formatValidationMessage(vt.minValue, { min: 15 })).max(100),
    email: z.string().trim().email(vt.invalidEmail),
    password: z.string().min(6, vt.passwordTooShort),
    town: z.string().min(1, vt.selectOption),
    gender: z.enum(['male', 'female', 'other']).optional(),
    preferences: z.array(z.string()).optional(),
  });
};

const SignupModal = ({ onClose, language }: SignupModalProps) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: 18,
    email: "",
    password: "",
    town: "",
    gender: "",
  });
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [isStudent, setIsStudent] = useState(false);
  const [universityEmail, setUniversityEmail] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [studentEmailError, setStudentEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const text = {
    el: {
      title: "Εγγραφή στο ΦΟΜΟ",
      firstName: "Όνομα",
      lastName: "Επώνυμο",
      age: "Ηλικία",
      email: "Email",
      password: "Κωδικός",
      town: "Πόλη",
      townPlaceholder: "Επιλέξτε πόλη",
      gender: "Φύλο",
      genderPlaceholder: "Επιλέξτε φύλο (προαιρετικό)",
      male: "Άνδρας",
      female: "Γυναίκα",
      other: "Άλλο",
      interests: "Τι σου αρέσει περισσότερο; (προαιρετικό)",
      isStudent: "Είμαι φοιτητής/τρια",
      studentDescription: "Επαληθεύστε τη φοιτητική σας ιδιότητα για να λαμβάνετε εκπτώσεις σε επιχειρήσεις.",
      university: "Πανεπιστήμιο",
      universityPlaceholder: "Επιλέξτε πανεπιστήμιο",
      universityEmail: "Ακαδημαϊκό Email",
      verificationNote: "Θα λάβετε email επαλήθευσης μετά την εγγραφή.",
      submit: "Δημιουργία Λογαριασμού",
      success: "Επιτυχής εγγραφή! Καλώς ήρθατε στο ΦΟΜΟ!",
      error: "Σφάλμα εγγραφής. Παρακαλώ δοκιμάστε ξανά.",
      termsText: "Με την εγγραφή σας, αποδέχεστε τους",
      terms: "όρους χρήσης",
      and: "και την",
      privacy: "πολιτική απορρήτου",
    },
    en: {
      title: "Sign Up to ΦΟΜΟ",
      firstName: "First Name",
      lastName: "Last Name",
      age: "Age",
      email: "Email",
      password: "Password",
      town: "Town",
      townPlaceholder: "Select town",
      gender: "Gender",
      genderPlaceholder: "Select gender (optional)",
      male: "Male",
      female: "Female",
      other: "Other",
      interests: "What do you like most? (optional)",
      isStudent: "I am a student",
      studentDescription: "Verify your student status to receive discounts at businesses.",
      university: "University",
      universityPlaceholder: "Select university",
      universityEmail: "University Email",
      verificationNote: "You will receive a verification email after signup.",
      submit: "Create Account",
      success: "Signup successful! Welcome to ΦΟΜΟ!",
      error: "Signup error. Please try again.",
      termsText: "By signing up, you agree to our",
      terms: "terms of use",
      and: "and",
      privacy: "privacy policy",
    },
  };

  const t = text[language];

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

  const togglePreference = (category: string) => {
    setSelectedPreferences(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const signupSchema = createSignupSchema(language);
    try {
      signupSchema.parse({
        ...formData,
        preferences: selectedPreferences,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: language === 'el' ? 'Σφάλμα επικύρωσης' : 'Validation Error',
          description: error.issues[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate student email if they selected student option
    if (isStudent && universityEmail && selectedUniversity) {
      if (!isValidUniversityEmail(universityEmail)) {
        toast({
          title: language === 'el' ? 'Μη έγκυρο email' : 'Invalid email',
          description: language === 'el' ? 'Μη έγκυρο ακαδημαϊκό email' : 'Invalid university email',
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/ekdiloseis`;
      
      // Sign up with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            age: formData.age,
            town: formData.town,
            gender: formData.gender || null,
            preferences: selectedPreferences,
            is_student: isStudent,
            university_email: isStudent ? universityEmail : null,
            selected_university: isStudent ? selectedUniversity : null,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Ensure demographic/profile fields are persisted immediately (do not rely on triggers)
        const { error: profileUpsertError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: authData.user.id,
              gender: formData.gender || null,
              age: typeof formData.age === "number" ? formData.age : null,
              town: formData.town,
              city: formData.town,
            } as any,
            { onConflict: "id" }
          );

        if (profileUpsertError) {
          console.error("Profile upsert error on signup (modal):", profileUpsertError);
        }

        // If student verification is needed, create the verification record and send email
        if (isStudent && universityEmail && selectedUniversity) {
          const universityData = CYPRUS_UNIVERSITIES.find(u => u.domain === selectedUniversity);
          if (universityData) {
            const { data: verificationData, error: verificationError } = await supabase
              .from('student_verifications')
              .insert({
                user_id: authData.user.id,
                university_email: universityEmail,
                university_name: universityData.name,
                university_domain: universityData.domain,
                status: 'pending'
              } as any)
              .select('id')
              .single();
            
            if (verificationError) {
              console.error('Student verification insert error:', verificationError);
            } else if (verificationData) {
              // Send verification email (non-blocking for signup success)
              try {
                await supabase.functions.invoke('send-student-verification-email', {
                  body: {
                    verificationId: verificationData.id,
                    universityEmail,
                    universityName: universityData.name,
                    userName: `${formData.firstName} ${formData.lastName}`,
                  },
                });
              } catch (emailError) {
                console.error('Student verification email error:', emailError);
              }
            }
          }
        }

        toast({
          title: t.success,
          description: "",
        });

        // Close modal - auth listener will handle the unlock
        onClose();
      }
    } catch (error: any) {
      toast({
        title: t.error,
        description: error.message || "Unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-premium w-full max-w-lg relative animate-scale-in border border-border max-h-[90vh] flex flex-col">
        <div className="p-6 pb-0 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <h2 className="text-2xl font-bold text-center mb-4 text-primary font-cinzel">
            {t.title}
          </h2>
        </div>

        <ScrollArea className="flex-1 px-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-6">
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">{t.firstName}</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={loading}
                  className="rounded-xl"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">{t.lastName}</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={loading}
                  className="rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Age */}
            <div>
              <Label htmlFor="age">{t.age}</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 18 })}
                disabled={loading}
                className="rounded-xl"
                min={15}
                max={100}
                required
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">{t.email}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
                className="rounded-xl"
                required
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password">{t.password}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
                className="rounded-xl"
                required
              />
            </div>

            {/* Town */}
            <div>
              <Label htmlFor="town" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {t.town}
              </Label>
              <Select
                value={formData.town}
                onValueChange={(value) => setFormData({ ...formData, town: value })}
                disabled={loading}
              >
                <SelectTrigger id="town" className="rounded-xl">
                  <SelectValue placeholder={t.townPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {getCityOptions(language).map((city) => (
                    <SelectItem key={city.value} value={city.value}>
                      {city.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gender */}
            <div>
              <Label htmlFor="gender">{t.gender}</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
                disabled={loading}
              >
                <SelectTrigger id="gender" className="rounded-xl">
                  <SelectValue placeholder={t.genderPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t.male}</SelectItem>
                  <SelectItem value="female">{t.female}</SelectItem>
                  <SelectItem value="other">{t.other}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preferences */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                {t.interests}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {getMainCategories(language).map(category => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`modal-${category.id}`} 
                      checked={selectedPreferences.includes(category.id)} 
                      onCheckedChange={() => togglePreference(category.id)} 
                      className="rounded"
                      disabled={loading}
                    />
                    <label 
                      htmlFor={`modal-${category.id}`} 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                    >
                      <span>{category.icon}</span>
                      <span>{category.label}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Verification Section */}
            <div className="space-y-4 p-4 border border-border rounded-xl bg-muted/30">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="modal-isStudent" 
                  checked={isStudent} 
                  onCheckedChange={(checked) => setIsStudent(checked === true)}
                  className="rounded"
                  disabled={loading}
                />
                <label htmlFor="modal-isStudent" className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  {t.isStudent}
                </label>
              </div>
              
              {isStudent && (
                <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                  <p className="text-sm text-muted-foreground">
                    {t.studentDescription}
                  </p>
                  
                  <div className="space-y-2">
                    <Label>{t.university}</Label>
                    <Select 
                      value={selectedUniversity} 
                      onValueChange={setSelectedUniversity}
                      disabled={loading}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder={t.universityPlaceholder} />
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
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {t.universityEmail}
                      </Label>
                      <Input
                        type="email"
                        value={universityEmail}
                        onChange={(e) => setUniversityEmail(e.target.value)}
                        placeholder={`example@${selectedUniversity}`}
                        className="rounded-xl"
                        disabled={loading}
                      />
                      {studentEmailError && (
                        <p className="text-sm text-destructive">{studentEmailError}</p>
                      )}
                      {universityEmail && !studentEmailError && isValidUniversityEmail(universityEmail) && (
                        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-700 dark:text-green-400">
                            {t.verificationNote}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90 transition-opacity mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === "el" ? "Φόρτωση..." : "Loading..."}
                </>
              ) : (
                t.submit
              )}
            </Button>

            {/* Terms */}
            <p className="text-xs text-center text-muted-foreground">
              {t.termsText}{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {t.terms}
              </a>{" "}
              {t.and}{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {t.privacy}
              </a>.
            </p>
          </form>
        </ScrollArea>
      </div>
    </div>
  );
};

export default SignupModal;
