import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isValidPhone } from "@/lib/phoneValidation";
import { z } from "zod";

const demoSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().min(1, "Phone is required"),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

const BookDemo = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const t = {
    el: {
      title: "Κλείσε ένα Demo",
      subtitle: "Συμπλήρωσε τη φόρμα και θα επικοινωνήσουμε μαζί σου για να κανονίσουμε μια προσωπική παρουσίαση της πλατφόρμας.",
      name: "Ονοματεπώνυμο",
      email: "Email",
      phone: "Τηλέφωνο",
      message: "Μήνυμα (προαιρετικό)",
      messagePlaceholder: "Πες μας λίγα λόγια για την επιχείρησή σου...",
      submit: "Υποβολή",
      submitting: "Υποβολή...",
      successTitle: "Ευχαριστούμε!",
      successMessage: "Λάβαμε το αίτημά σου. Θα επικοινωνήσουμε μαζί σου σύντομα για να κανονίσουμε το demo.",
      backHome: "Πίσω στην Αρχική",
      invalidPhone: "Μη έγκυρο τηλέφωνο",
      required: "Υποχρεωτικό πεδίο",
      invalidEmail: "Μη έγκυρο email",
    },
    en: {
      title: "Book a Demo",
      subtitle: "Fill in the form and we'll get in touch to schedule a personal platform walkthrough.",
      name: "Full Name",
      email: "Email",
      phone: "Phone",
      message: "Message (optional)",
      messagePlaceholder: "Tell us a bit about your business...",
      submit: "Submit",
      submitting: "Submitting...",
      successTitle: "Thank you!",
      successMessage: "We received your request. We'll get in touch soon to schedule your demo.",
      backHome: "Back to Home",
      invalidPhone: "Invalid phone number",
      required: "Required field",
      invalidEmail: "Invalid email",
    },
  };

  const c = t[language];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const result = demoSchema.safeParse(form);
    
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (field === "email") newErrors.email = c.invalidEmail;
        else newErrors[field] = c.required;
      }
    }
    
    if (form.phone && !isValidPhone(form.phone)) {
      newErrors.phone = c.invalidPhone;
    }
    
    if (!form.phone.trim()) {
      newErrors.phone = c.required;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("demo_requests").insert({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim() || null,
      });

      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast.error(language === "el" ? "Κάτι πήγε στραβά. Δοκίμασε ξανά." : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <>
        <InfoNavbar />
        <div className="min-h-screen bg-background pt-20 flex items-center justify-center px-4">
          <Card className="max-w-md w-full border-primary/20">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-seafoam/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-seafoam" />
              </div>
              <h2 className="font-cinzel text-2xl font-bold text-foreground mb-3">{c.successTitle}</h2>
              <p className="text-foreground/70 text-sm mb-6">{c.successMessage}</p>
              <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                {c.backHome}
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <InfoNavbar />
      <div className="min-h-screen bg-background pt-16 sm:pt-20">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <CalendarClock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-foreground mb-3">
              {c.title}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">{c.subtitle}</p>
          </div>

          <Card className="border-border/50">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-foreground/80 text-sm">{c.name}</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`text-base ${errors.name ? "border-red-500" : ""}`}
                    autoComplete="name"
                  />
                  {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-foreground/80 text-sm">{c.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`text-base ${errors.email ? "border-red-500" : ""}`}
                    autoComplete="email"
                  />
                  {errors.email && <p className="text-red-400 text-xs">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-foreground/80 text-sm">{c.phone}</Label>
                  <PhoneInput
                    id="phone"
                    value={form.phone}
                    onChange={(val) => setForm({ ...form, phone: val })}
                    language={language}
                    inputClassName={`text-base ${errors.phone ? "border-red-500" : ""}`}
                  />
                  {errors.phone && <p className="text-red-400 text-xs">{errors.phone}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message" className="text-foreground/80 text-sm">{c.message}</Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="text-base min-h-[100px] resize-none"
                    maxLength={1000}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-seafoam hover:bg-seafoam/90 text-aegean font-semibold"
                >
                  {loading ? c.submitting : c.submit}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default BookDemo;
