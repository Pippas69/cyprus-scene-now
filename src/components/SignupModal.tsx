import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface SignupModalProps {
  onClose: () => void;
  language: "el" | "en";
}

const signupSchema = z.object({
  firstName: z.string().trim().min(1, "Το όνομα είναι υποχρεωτικό").max(100, "Το όνομα πρέπει να είναι λιγότερο από 100 χαρακτήρες"),
  lastName: z.string().trim().min(1, "Το επώνυμο είναι υποχρεωτικό").max(100, "Το επώνυμο πρέπει να είναι λιγότερο από 100 χαρακτήρες"),
  email: z.string().trim().email("Μη έγκυρη διεύθυνση email").max(255, "Το email πρέπει να είναι λιγότερο από 255 χαρακτήρες"),
  password: z.string().min(6, "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες").max(100, "Ο κωδικός πρέπει να είναι λιγότερο από 100 χαρακτήρες"),
  location: z.string().min(1, "Η τοποθεσία είναι υποχρεωτική"),
  preferences: z.array(z.string()).min(1, "Επέλεξε τουλάχιστον ένα ενδιαφέρον"),
});

const SignupModal = ({ onClose, language }: SignupModalProps) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    location: "",
    preferences: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const text = {
    el: {
      title: "Εγγραφή στο ΦΟΜΟ",
      firstName: "Όνομα",
      lastName: "Επώνυμο",
      email: "Email",
      password: "Κωδικός",
      location: "Περιοχή",
      interests: "Τι σε ενδιαφέρει;",
      submit: "Δημιουργία Λογαριασμού",
      success: "Επιτυχής εγγραφή! Καλώς ήρθατε στο ΦΟΜΟ!",
      error: "Σφάλμα εγγραφής. Παρακαλώ δοκιμάστε ξανά.",
    },
    en: {
      title: "Sign Up to ΦΟΜΟ",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      password: "Password",
      location: "Location",
      interests: "What are you interested in?",
      submit: "Create Account",
      success: "Signup successful! Welcome to ΦΟΜΟ!",
      error: "Signup error. Please try again.",
    },
  };

  const t = text[language];

  const locations = [
    "Λευκωσία",
    "Λεμεσός",
    "Λάρνακα",
    "Πάφος",
    "Παραλίμνι",
    "Αγία Νάπα",
  ];

  const interestOptions = [
    { value: "cafe", label: "Καφέ & Εστιατόρια ☕" },
    { value: "nightlife", label: "Νυχτερινή Ζωή 🌃" },
    { value: "art", label: "Τέχνη & Πολιτισμός 🎨" },
    { value: "fitness", label: "Γυμναστική 💪" },
    { value: "family", label: "Οικογένεια 👨‍👩‍👧‍👦" },
    { value: "business", label: "Business 💼" },
    { value: "lifestyle", label: "Lifestyle 🌴" },
    { value: "travel", label: "Ταξίδια ✈️" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    try {
      signupSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Σφάλμα επικύρωσης",
          description: error.errors[0].message,
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
            town: formData.location,
            preferences: formData.preferences,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Profile is created automatically by the trigger

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
      <div className="bg-card rounded-2xl shadow-premium w-full max-w-md p-6 md:p-8 relative animate-scale-in border border-border">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-bold text-center mb-6 text-primary font-cinzel">
          {t.title}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="firstName">{t.firstName}</Label>
            <Input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              disabled={loading}
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
              required
            />
          </div>

          <div>
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">{t.password}</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={loading}
              required
            />
          </div>

          <div>
            <Label htmlFor="location">{t.location}</Label>
            <Select
              value={formData.location}
              onValueChange={(value) => setFormData({ ...formData, location: value })}
              disabled={loading}
              required
            >
              <SelectTrigger id="location">
                <SelectValue placeholder={t.location} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="interests">{t.interests}</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-input rounded-lg p-3">
              {interestOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer hover:bg-accent/10 p-2 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.preferences.includes(option.value)}
                    onChange={(e) => {
                      const newPreferences = e.target.checked
                        ? [...formData.preferences, option.value]
                        : formData.preferences.filter((p) => p !== option.value);
                      setFormData({ ...formData, preferences: newPreferences });
                    }}
                    disabled={loading}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

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
        </form>
      </div>
    </div>
  );
};

export default SignupModal;
