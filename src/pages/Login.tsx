import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Μη έγκυρη διεύθυνση email" }),
  password: z.string().min(6, { message: "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const stateMessage = location.state?.message;
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (stateMessage) {
      toast.success(stateMessage, { duration: 5000 });
      // Clear the state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [stateMessage, navigate, location.pathname]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Λάθος email ή κωδικός");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // Check user role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        // Check if user owns a business
        const { data: business } = await supabase
          .from("businesses")
          .select("id, verified")
          .eq("user_id", data.user.id)
          .maybeSingle();

        // Determine redirect based on role and business ownership
        let redirectPath = "/feed";
        let successMessage = "Επιτυχής σύνδεση!";

        if (profile?.role === 'admin') {
          redirectPath = "/admin/verification";
          successMessage = "Καλωσόρισες, Διαχειριστή του ΦΟΜΟ!";
        } else if (business) {
          redirectPath = "/dashboard-business";
          successMessage = business.verified 
            ? "Καλωσόρισες στο dashboard σου!" 
            : "Καλωσόρισες! Η επαλήθευση σου εκκρεμεί.";
        }

        toast.success(successMessage);
        navigate(redirectPath);
      }
    } catch (error) {
      toast.error("Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 blur-3xl">
          <div className="w-full h-full rounded-full bg-gradient-glow" />
        </div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sunset-coral/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-white hover:text-seafoam"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Επιστροφή
          </Button>
          
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

        <div className="bg-white dark:bg-card rounded-3xl shadow-elegant p-8 md:p-12">
          <div className="text-center mb-8">
            <h1 className="font-cinzel text-4xl font-bold text-midnight mb-2">
              Σύνδεση στο ΦΟΜΟ
            </h1>
            <p className="font-inter text-foreground/80">
              Καλώς ήρθες πίσω!
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Σύνδεση..." : "Σύνδεση"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm text-accent hover:text-accent/80 hover:underline mb-4 font-medium"
                >
                  Ξέχασες τον κωδικό σου;
                </button>
              </div>

              <div className="text-center text-sm mb-4 p-3 bg-muted/30 dark:bg-muted/20 rounded-lg border border-border">
                <p className="font-medium text-foreground">
                  💼 Επιχείρηση;
                </p>
                <p className="mt-1 text-foreground/80">
                  Χρησιμοποιήστε αυτή τη φόρμα για να συνδεθείτε στο dashboard σας.
                </p>
              </div>

              <div className="text-center text-sm">
                <span className="text-foreground/80">Δεν έχεις λογαριασμό;</span>{" "}
                <Link to="/signup" className="text-accent hover:text-accent/80 hover:underline font-semibold">
                  Εγγραφή
                </Link>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;
