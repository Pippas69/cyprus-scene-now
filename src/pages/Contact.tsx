import { useLanguage } from "@/hooks/useLanguage";
import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, Instagram } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Contact = () => {
  const { language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    business_type: "",
    business_name: "",
    website: "",
    message: ""
  });

  const text = {
    el: {
      heroTitle: "Επικοινώνησε μαζί μας",
      heroSubtitle:
      "Έχεις ερωτήσεις; Θέλεις να μάθεις περισσότερα; Είμαστε εδώ για σένα.",
      firstName: "Όνομα",
      lastName: "Επώνυμο",
      email: "Email",
      phone: "Τηλέφωνο",
      businessType: "Τύπος Επιχείρησης",
      businessName: "Όνομα Επιχείρησης",
      website: "Ιστοσελίδα",
      message: "Μήνυμα",
      submit: "Αποστολή",
      sending: "Αποστολή...",
      successTitle: "Ευχαριστούμε!",
      successMessage: "Θα επικοινωνήσουμε σύντομα μαζί σου.",
      errorMessage: "Κάτι πήγε στραβά. Δοκίμασε ξανά.",
      businessTypes: {
        venue: "Χώρος / Venue",
        organizer: "Διοργανωτής Εκδηλώσεων",
        advertiser: "Διαφημιζόμενος",
        other: "Άλλο"
      },
      contactInfo: "Στοιχεία Επικοινωνίας",
      followUs: "Ακολούθησέ μας",
      demoTitle: "Κλείσε Demo",
      demoDesc:
      "Θέλεις να δεις το ΦΟΜΟ σε δράση; Κλείσε μια δωρεάν επίδειξη με την ομάδα μας.",
      bookDemo: "Κλείσε Demo"
    },
    en: {
      heroTitle: "Contact Us",
      heroSubtitle:
      "Have questions? Want to learn more? We're here for you.",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      phone: "Phone",
      businessType: "Business Type",
      businessName: "Business Name",
      website: "Website",
      message: "Message",
      submit: "Submit",
      sending: "Sending...",
      successTitle: "Thank you!",
      successMessage: "We'll get back to you soon.",
      errorMessage: "Something went wrong. Please try again.",
      businessTypes: {
        venue: "Venue / Location",
        organizer: "Event Organizer",
        advertiser: "Advertiser",
        other: "Other"
      },
      contactInfo: "Contact Information",
      followUs: "Follow Us",
      demoTitle: "Book a Demo",
      demoDesc:
      "Want to see ΦΟΜΟ in action? Book a free demo with our team.",
      bookDemo: "Book Demo"
    }
  };

  const t = text[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.
      from("contact_submissions").
      insert([formData]);

      if (error) throw error;

      toast.success(t.successTitle, {
        description: t.successMessage
      });

      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        business_type: "",
        business_name: "",
        website: "",
        message: ""
      });
    } catch (error) {
      toast.error(t.errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <InfoNavbar />

      {/* Hero Section - Premium Design */}
      <section className="pt-32 pb-12 px-4 relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-seafoam/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-seafoam/10 border border-seafoam/30 text-seafoam px-4 py-1.5 rounded-full text-sm font-medium mb-6">

            <span className="w-2 h-2 bg-seafoam rounded-full animate-pulse" />
            {language === "el" ? "Επικοινωνία" : "Contact"}
          </motion.div>

          







          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">

            {t.heroSubtitle}
          </motion.p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">{t.firstName} *</Label>
                    <Input
                      id="first_name"
                      required
                      value={formData.first_name}
                      onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                      } />

                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">{t.lastName} *</Label>
                    <Input
                      id="last_name"
                      required
                      value={formData.last_name}
                      onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                      } />

                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t.email} *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                      } />

                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t.phone}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                      } />

                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t.businessType}</Label>
                  <Select
                    value={formData.business_type}
                    onValueChange={(value) =>
                    setFormData({ ...formData, business_type: value })
                    }>

                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venue">
                        {t.businessTypes.venue}
                      </SelectItem>
                      <SelectItem value="organizer">
                        {t.businessTypes.organizer}
                      </SelectItem>
                      <SelectItem value="advertiser">
                        {t.businessTypes.advertiser}
                      </SelectItem>
                      <SelectItem value="other">
                        {t.businessTypes.other}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_name">{t.businessName}</Label>
                    <Input
                      id="business_name"
                      value={formData.business_name}
                      onChange={(e) =>
                      setFormData({
                        ...formData,
                        business_name: e.target.value
                      })
                      } />

                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">{t.website}</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://"
                      value={formData.website}
                      onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                      } />

                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t.message}</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    value={formData.message}
                    onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                    } />

                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}>

                  {isSubmitting ?
                  t.sending :

                  <>
                      <Send className="w-4 h-4 mr-2" />
                      {t.submit}
                    </>
                  }
                </Button>
              </form>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-8">

              <div>
                <h2 className="font-urbanist text-2xl font-bold mb-6">
                  {t.contactInfo}
                </h2>
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "mailto:support@fomocy.com";
                    }}
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors cursor-pointer w-full text-left"
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>

                    <Mail className="w-5 h-5 flex-shrink-0" />
                    <span>support@fomocy.com</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "tel:+35799123456";
                    }}
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors cursor-pointer w-full text-left"
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>

                    <Phone className="w-5 h-5 flex-shrink-0" />
                    <span>+357 99 123 456</span>
                  </button>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="w-5 h-5" />
                    Limassol, Cyprus
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">{t.followUs}</h3>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      window.open("https://instagram.com/fomo.cy", "_blank", "noopener,noreferrer");
                    }}
                    className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    aria-label="Instagram">

                    <Instagram className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.open("https://tiktok.com/@fomo.cy", "_blank", "noopener,noreferrer");
                    }}
                    className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    aria-label="TikTok">

                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "mailto:support@fomocy.com";
                    }}
                    className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    aria-label="Email">

                    <Mail className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>);

};

export default Contact;