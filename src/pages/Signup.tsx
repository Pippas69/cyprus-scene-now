import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { MapPin, Heart, ArrowLeft, Store } from "lucide-react";

const signupSchema = z.object({
  firstName: z.string().trim().min(2, { message: "Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες" }),
  lastName: z.string().trim().min(2, { message: "Το επίθετο πρέπει να έχει τουλάχιστον 2 χαρακτήρες" }),
  age: z.coerce.number().min(15, { message: "Πρέπει να είστε τουλάχιστον 15 ετών" }).max(100),
  email: z.string().trim().email({ message: "Μη έγκυρη διεύθυνση email" }),
  password: z.string().min(6, { message: "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες" }),
  town: z.string().min(1, { message: "Παρακαλώ επιλέξτε πόλη" }),
  preferences: z.array(z.string()).optional(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const towns = [
  "Λευκωσία",
  "Λεμεσός",
  "Λάρνακα",
  "Πάφος",
  "Παραλίμνι",
  "Αγία Νάπα"
];

const categories = [
  "Καφετέριες & Εστιατόρια",
  "Νυχτερινή Διασκέδαση",
  "Τέχνη & Πολιτισμός",
  "Fitness & Wellness",
  "Οικογένεια & Κοινότητα",
  "Επιχειρηματικότητα & Networking",
  "Εξωτερικές Δραστηριότητες",
  "Αγορές & Lifestyle"
];

const Signup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      age: 18,
      email: "",
      password: "",
      town: "",
      preferences: [],
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/feed`,
          data: {
            first_name: values.firstName,
            last_name: values.lastName,
            age: values.age,
            town: values.town,
            preferences: selectedPreferences,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Αυτό το email είναι ήδη καταχωρημένο");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        toast.success("Επιτυχής εγγραφή! Καλώς ήρθες στο ΦΟΜΟ!");
        navigate("/feed");
      }
    } catch (error) {
      toast.error("Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePreference = (category: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 blur-3xl">
          <div className="w-full h-full rounded-full bg-gradient-glow" />
        </div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sunset-coral/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-seafoam/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="max-w-2xl w-full space-y-8 relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-white hover:text-seafoam mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Επιστροφή
        </Button>

        <div className="bg-white rounded-3xl shadow-elegant p-8 md:p-12">
          <div className="text-center mb-8">
            <h1 className="font-cinzel text-4xl font-bold text-midnight mb-2">
              Εγγραφή στο ΦΟΜΟ
            </h1>
            <p className="font-inter text-muted-foreground">
              Γίνε μέλος της κοινότητας ΦΟΜΟ και δες πού αξίζει να είσαι.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Όνομα</FormLabel>
                      <FormControl>
                        <Input placeholder="Γιώργος" {...field} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Επίθετο</FormLabel>
                      <FormControl>
                        <Input placeholder="Παπαδόπουλος" {...field} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ηλικία</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="25" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ηλεκτρονικό Ταχυδρομείο</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="giorgos@example.com" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Κωδικός</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="town"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Πόλη
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Επιλέξτε πόλη" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {towns.map((town) => (
                          <SelectItem key={town} value={town}>
                            {town}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  Τι σου αρέσει περισσότερο; (προαιρετικό)
                </FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={category}
                        checked={selectedPreferences.includes(category)}
                        onCheckedChange={() => togglePreference(category)}
                        className="rounded"
                      />
                      <label
                        htmlFor={category}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Δημιουργία..." : "Δημιουργία Λογαριασμού"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Έχεις ήδη λογαριασμό;{" "}
                <Link to="/login" className="text-primary hover:underline font-semibold">
                  Σύνδεση
                </Link>
              </div>
            </form>
          </Form>

          <div className="mt-8 text-right">
            <Link
              to="/signup-business"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-seafoam transition-colors font-medium"
            >
              <Store className="h-4 w-4" />
              Έχεις δική σου επιχείρηση;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
