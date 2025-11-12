import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Target, MessageCircle, Ticket, Shield, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
const categories = ["Καφετέριες & Εστιατόρια", "Νυχτερινή Διασκέδαση", "Τέχνη & Πολιτισμός", "Fitness & Wellness", "Οικογένεια & Κοινότητα", "Επιχειρηματικότητα & Networking", "Εξωτερικές Δραστηριότητες", "Αγορές & Lifestyle"];
const cities = ["Λευκωσία", "Λεμεσός", "Λάρνακα", "Πάφος", "Παραλίμνι", "Αγία Νάπα"];
const formSchema = z.object({
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
const SignupBusiness = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    formState: {
      errors
    },
    setValue,
    watch
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: [],
      termsAccepted: false
    }
  });
  const selectedCategories = watch("category") || [];
  const handleCategoryChange = (category: string, checked: boolean) => {
    const current = selectedCategories;
    if (checked) {
      setValue("category", [...current, category]);
    } else {
      setValue("category", current.filter(c => c !== category));
    }
  };
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Create user account
      const {
        data: authData,
        error: authError
      } = await supabase.auth.signUp({
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
        const fileName = `${authData.user.id}-${Date.now()}.${fileExt}`;
        const {
          data: uploadData,
          error: uploadError
        } = await supabase.storage.from('business-logos').upload(fileName, logoFile);
        if (!uploadError && uploadData) {
          const {
            data: {
              publicUrl
            }
          } = supabase.storage.from('business-logos').getPublicUrl(fileName);
          logoUrl = publicUrl;
        }
      }

      // Create business record
      const {
        error: businessError
      } = await supabase.from('businesses').insert({
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
      });
      if (businessError) throw businessError;
      toast({
        title: "Επιτυχής Εγγραφή!",
        description: "Η επιχείρησή σας καταχωρήθηκε και εκκρεμεί επαλήθευση."
      });
      navigate("/dashboard-business");
    } catch (error: any) {
      toast({
        title: "Σφάλμα",
        description: error.message || "Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="min-h-screen gradient-hero py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 blur-3xl">
          <div className="w-full h-full rounded-full bg-gradient-glow" />
        </div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sunset-coral/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <Button variant="ghost" onClick={() => navigate("/signup")} className="text-white hover:text-seafoam mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Πίσω στην Εγγραφή Χρήστη
        </Button>

        {/* Why Join ΦΟΜΟ Section */}
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-elegant p-8 mb-8">
          <h2 className="font-cinzel text-2xl text-midnight mb-6 text-center font-bold text-[#235674]">
            Τι προσφέρει το ΦΟΜΟ στις επιχειρήσεις:
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-glow rounded-full flex items-center justify-center mx-auto mb-4 bg-[#235674]">
                <Target className="h-6 w-6 text-white" />
              </div>
              <p className="font-inter text-sm text-muted-foreground">
                Προβολή των εκδηλώσεών σου σε χιλιάδες χρήστες στην Κύπρο
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-glow rounded-full flex items-center justify-center mx-auto mb-4 bg-[#235674]">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <p className="font-inter text-sm text-muted-foreground">
                Επαφή με το κοινό που ενδιαφέρεται πραγματικά για την επιχείρησή σου
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-glow rounded-full flex items-center justify-center mx-auto mb-4 bg-[#225573]">
                <Ticket className="h-6 w-6 text-white" />
              </div>
              <p className="font-inter text-sm text-sm text-muted-foreground">
                QR προσφορές και προγράμματα συνεργασίας που αυξάνουν την επισκεψιμότητα
              </p>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-3xl shadow-elegant p-8 md:p-12">
          <div className="text-center mb-8">
            <h1 className="font-cinzel text-4xl font-bold text-midnight mb-2 text-[#235674]">
              Εγγραφή Επιχείρησης στο ΦΟΜΟ
            </h1>
            <p className="font-inter text-lg text-muted-foreground">
              Καταχώρησε την επιχείρησή σου και έλα σε επαφή με νέο κοινό στην Κύπρο.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Business Name */}
            <div>
              <Label htmlFor="businessName">Όνομα Επιχείρησης *</Label>
              <Input id="businessName" {...register("businessName")} className="mt-1" placeholder="π.χ. Καφέ Παραλία" />
              {errors.businessName && <p className="text-sm text-destructive mt-1">{errors.businessName.message}</p>}
            </div>

            {/* Category */}
            <div>
              <Label>Κατηγορία *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {categories.map(cat => <div key={cat} className="flex items-center space-x-2">
                    <Checkbox id={cat} checked={selectedCategories.includes(cat)} onCheckedChange={checked => handleCategoryChange(cat, checked as boolean)} />
                    <label htmlFor={cat} className="text-sm cursor-pointer">
                      {cat}
                    </label>
                  </div>)}
              </div>
              {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
            </div>

            {/* City */}
            <div>
              <Label htmlFor="city">Τοποθεσία / Πόλη *</Label>
              <select id="city" {...register("city")} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Επιλέξτε πόλη</option>
                {cities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
              {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="address">Διεύθυνση *</Label>
              <Input id="address" {...register("address")} className="mt-1" placeholder="π.χ. Λεωφόρος Μακαρίου 25" />
              {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
            </div>

            {/* Email & Phone */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Επιχείρησης *</Label>
                <Input id="email" type="email" {...register("email")} className="mt-1" placeholder="info@business.com" />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Τηλέφωνο *</Label>
                <Input id="phone" {...register("phone")} className="mt-1" placeholder="99123456" />
                {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
              </div>
            </div>

            {/* Website */}
            <div>
              <Label htmlFor="website">Ιστοσελίδα</Label>
              <Input id="website" {...register("website")} className="mt-1" placeholder="https://www.business.com" />
            </div>

            {/* Password */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">Κωδικός Πρόσβασης *</Label>
                <Input id="password" type="password" {...register("password")} className="mt-1" />
                {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <Label htmlFor="confirmPassword">Επιβεβαίωση Κωδικού *</Label>
                <Input id="confirmPassword" type="password" {...register("confirmPassword")} className="mt-1" />
                {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Περιγραφή (μέχρι 300 χαρακτήρες)</Label>
              <Textarea id="description" {...register("description")} className="mt-1" rows={4} placeholder="Μια σύντομη περιγραφή της επιχείρησής σας..." />
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
            </div>

            {/* Logo Upload */}
            <div>
              <Label htmlFor="logo">Λογότυπο Επιχείρησης (μέχρι 2 MB)</Label>
              <div className="mt-2 flex items-center gap-4">
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">{logoFile ? logoFile.name : "Επιλέξτε αρχείο"}</span>
                  </div>
                  <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file && file.size <= 2 * 1024 * 1024) {
                    setLogoFile(file);
                  } else if (file) {
                    toast({
                      title: "Σφάλμα",
                      description: "Το αρχείο δεν μπορεί να υπερβαίνει τα 2 MB",
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
                Συμφωνώ με τους όρους χρήσης και την πολιτική απορρήτου *
              </label>
            </div>
            {errors.termsAccepted && <p className="text-sm text-destructive">{errors.termsAccepted.message}</p>}

            {/* Submit Button */}
            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Υποβολή..." : "Αποστολή για Επαλήθευση"}
            </Button>
          </form>
        </div>

        {/* Verification Info Section */}
        <div className="mt-8 bg-teal-50 border-2 border-sunset-coral rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-midnight mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-cinzel text-lg font-bold text-midnight mb-2">
                Πώς λειτουργεί η επαλήθευση
              </h3>
              <p className="font-inter text-sm text-muted-foreground">
                Μετά την εγγραφή, η ομάδα του ΦΟΜΟ θα επικοινωνήσει μαζί σας για να επιβεβαιώσει τα στοιχεία της επιχείρησης (μέσω email ή τηλεφώνου).
                Μόλις επαληθευτεί, θα μπορείτε να ανεβάζετε εκδηλώσεις και να προβάλλεστε στο κοινό.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default SignupBusiness;