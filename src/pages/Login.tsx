import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Μη έγκυρη διεύθυνση email" }),
  password: z.string().min(6, { message: "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

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

        toast.success(profile?.role === 'admin' ? "Καλωσόρισες, Διαχειριστή του ΦΟΜΟ!" : "Επιτυχής σύνδεση!");
        
        // Redirect based on role
        if (profile?.role === 'admin') {
          navigate("/admin/verification");
        } else {
          navigate("/feed");
        }
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
              Σύνδεση στο ΦΟΜΟ
            </h1>
            <p className="font-inter text-muted-foreground">
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

              <div className="text-center text-sm text-muted-foreground">
                Δεν έχεις λογαριασμό;{" "}
                <Link to="/signup" className="text-primary hover:underline font-semibold">
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
