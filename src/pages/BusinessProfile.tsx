import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEngagement } from "@/lib/analyticsTracking";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RippleButton } from "@/components/ui/ripple-button";
import { CheckCircle, MapPin, Phone, Globe, ArrowLeft, CalendarCheck, GraduationCap } from "lucide-react";
import EventCard from "@/components/EventCard";
import OfferCard from "@/components/OfferCard";
import { FollowButton } from "@/components/business/FollowButton";
import { DirectReservationDialog } from "@/components/business/DirectReservationDialog";
import { StudentDiscountButton } from "@/components/user/StudentDiscountButton";
import { useLanguage } from "@/hooks/useLanguage";

interface Business {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string;
  category: string[];
  verified: boolean;
  accepts_direct_reservations: boolean;
  student_discount_enabled: boolean | null;
  student_discount_percent: number | null;
  student_discount_mode: string | null;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  location: string;
  cover_image_url: string | null;
  category: string[];
  price_tier: string;
  business_id: string;
  businesses: {
    name: string;
    logo_url: string | null;
  };
}

interface Discount {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  start_at: string;
  end_at: string;
  active: boolean;
  business_id: string;
  businesses: {
    name: string;
    logo_url: string | null;
    city: string;
  };
}

// Staggered animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
  },
};

const BusinessProfile = () => {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [business, setBusiness] = useState<Business | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [offers, setOffers] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);

  const translations = {
    el: {
      businessNotFound: "Η επιχείρηση δεν βρέθηκε ή δεν είναι επαληθευμένη",
      loadError: "Σφάλμα φόρτωσης δεδομένων",
      back: "Πίσω",
      city: "Πόλη",
      phone: "Τηλέφωνο",
      website: "Ιστοσελίδα",
      about: "Σχετικά",
      events: "Εκδηλώσεις",
      offers: "Προσφορές",
      noEventsScheduled: "Δεν υπάρχουν προγραμματισμένες εκδηλώσεις αυτή τη στιγμή",
      noActiveOffers: "Δεν υπάρχουν ενεργές προσφορές αυτή τη στιγμή",
      reserveTable: "Κράτηση Τραπεζιού",
      loginToReserve: "Συνδεθείτε για κράτηση",
      studentDiscount: "Φοιτητική Έκπτωση",
      studentDiscountOnce: "στην πρώτη επίσκεψη",
      studentDiscountUnlimited: "σε κάθε επίσκεψη"
    },
    en: {
      businessNotFound: "Business not found or not verified",
      loadError: "Error loading data",
      back: "Back",
      city: "City",
      phone: "Phone",
      website: "Website",
      about: "About",
      events: "Events",
      offers: "Offers",
      noEventsScheduled: "No scheduled events at this time",
      noActiveOffers: "No active offers at this time",
      reserveTable: "Reserve a Table",
      loginToReserve: "Login to reserve",
      studentDiscount: "Student Discount",
      studentDiscountOnce: "on first visit",
      studentDiscountUnlimited: "on every visit"
    }
  };

  const t = translations[language];

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (businessId) {
      fetchBusinessData();
      // Track profile view
      trackEngagement(businessId, 'profile_view', 'business', businessId);
    }
  }, [businessId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchBusinessData = async () => {
    try {
      // Fetch business details including direct reservation settings and student discount
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("*, accepts_direct_reservations, student_discount_enabled, student_discount_percent, student_discount_mode")
        .eq("id", businessId)
        .eq("verified", true)
        .maybeSingle();

      if (businessError) throw businessError;

      if (!businessData) {
        toast.error(t.businessNotFound);
        navigate("/feed");
        return;
      }

      setBusiness(businessData);

      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select(`
          *,
          businesses!inner(name, logo_url, city)
        `)
        .eq("business_id", businessId)
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true });

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Fetch offers
      const { data: offersData, error: offersError } = await supabase
        .from("discounts")
        .select(`
          *,
          businesses!inner(name, logo_url, city)
        `)
        .eq("business_id", businessId)
        .eq("active", true)
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true });

      if (offersError) throw offersError;
      setOffers(offersData || []);
    } catch (error) {
      console.error("Error fetching business data:", error);
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!business) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Hero Section with Cover Image */}
      <div className="relative h-64 md:h-80">
        {business.cover_url ? (
          <div
            className="absolute inset-0 bg-cover bg-center overflow-hidden pointer-events-none"
            style={{ backgroundImage: `url(${business.cover_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background pointer-events-none" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-background pointer-events-none" />
        )}

        {/* Back Button */}
        <RippleButton
          variant="ghost"
          size="sm"
          onClick={() => navigate("/feed")}
          className="absolute top-4 left-4 z-[60] bg-background/80 backdrop-blur-sm hover:bg-background safe-area-top"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t.back}
        </RippleButton>

        {/* Logo positioned at bottom, overlapping */}
        <motion.div 
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
        >
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 md:border-[6px] border-background shadow-lg ring-2 ring-primary/20">
            <AvatarImage src={business.logo_url || undefined} alt={`${business.name} logo`} />
            <AvatarFallback className="text-3xl font-bold bg-muted">
              {business.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </motion.div>
      </div>

      {/* Business Info */}
      <div className="container mx-auto px-4 pt-16 md:pt-24 pb-24 md:pb-8">
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {business.name}
            </h1>
            {business.verified && (
              <CheckCircle className="h-6 w-6 text-green-600" />
            )}
          </div>

          {/* Categories */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {business.category.map((cat) => (
              <Badge key={cat} variant="secondary">
                {cat}
              </Badge>
            ))}
            
            {/* Student Discount Badge */}
            {business.student_discount_enabled && business.student_discount_percent && (
              <Badge 
                variant="outline" 
                className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 text-primary gap-1.5"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                {business.student_discount_percent}% {t.studentDiscount}
                <span className="text-muted-foreground text-[10px]">
                  ({business.student_discount_mode === 'unlimited' ? t.studentDiscountUnlimited : t.studentDiscountOnce})
                </span>
              </Badge>
            )}
          </div>

          {/* Follow Button, Reserve Button, and Student Discount Button */}
          {business.id && (
            <div className="flex justify-center gap-3 flex-wrap">
              <FollowButton businessId={business.id} language={language} />
              
              {/* Direct Reservation Button */}
              {business.accepts_direct_reservations && (
                <RippleButton
                  onClick={() => {
                    if (!user) {
                      toast.error(t.loginToReserve);
                      return;
                    }
                    setReservationDialogOpen(true);
                  }}
                  className="gap-2"
                >
                  <CalendarCheck className="h-4 w-4" />
                  {t.reserveTable}
                </RippleButton>
              )}

              {/* Student Discount Button */}
              {business.student_discount_enabled && business.student_discount_percent && (
                <StudentDiscountButton
                  businessId={business.id}
                  businessName={business.name}
                  discountPercent={business.student_discount_percent}
                  discountMode={business.student_discount_mode === 'unlimited' ? 'unlimited' : 'one_time'}
                  userId={user?.id || null}
                  language={language}
                />
              )}
            </div>
          )}
        </motion.div>

        {/* Contact Info Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {business.city && (
            <motion.div variants={itemVariants}>
              <Card variant="glass" className="backdrop-blur-md hover:shadow-hover transition-all duration-300">
                <CardContent className="flex items-center gap-3 p-4">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t.city}</p>
                    <p className="font-medium">{business.city}</p>
                    {business.address && (
                      <p className="text-sm text-muted-foreground">{business.address}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {business.phone && (
            <motion.div variants={itemVariants}>
              <Card variant="glass" className="backdrop-blur-md hover:shadow-hover transition-all duration-300">
                <CardContent className="flex items-center gap-3 p-4">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t.phone}</p>
                    <a
                      href={`tel:${business.phone}`}
                      className="inline-block py-2 font-medium hover:text-primary transition-colors"
                      onClick={() => trackEngagement(business.id, 'phone_click', 'business', business.id)}
                    >
                      {business.phone}
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {business.website && (
            <motion.div variants={itemVariants}>
              <Card variant="glass" className="backdrop-blur-md hover:shadow-hover transition-all duration-300">
                <CardContent className="flex items-center gap-3 p-4">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{t.website}</p>
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-primary truncate block transition-colors"
                      onClick={() => trackEngagement(business.id, 'website_click', 'business', business.id)}
                    >
                      {business.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>

        {/* Description */}
        {business.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card variant="gradient" shine className="mb-8">
              <CardHeader>
                <CardTitle>{t.about}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {business.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Events and Offers Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Tabs defaultValue="events" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12 md:h-10">
              <TabsTrigger value="events">
                {t.events} ({events.length})
              </TabsTrigger>
              <TabsTrigger value="offers">
                {t.offers} ({offers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="mt-6">
              {events.length === 0 ? (
                <Card variant="glass">
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">
                      {t.noEventsScheduled}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {events.map((event) => (
                    <motion.div key={event.id} variants={itemVariants}>
                      <EventCard event={event} language={language} user={user} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="offers" className="mt-6">
              {offers.length === 0 ? (
                <Card variant="glass">
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">
                      {t.noActiveOffers}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {offers.map((offer) => (
                    <motion.div key={offer.id} variants={itemVariants}>
                      <OfferCard offer={offer} language={language} user={user} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Direct Reservation Dialog */}
      {business.accepts_direct_reservations && user && (
        <DirectReservationDialog
          open={reservationDialogOpen}
          onOpenChange={setReservationDialogOpen}
          businessId={business.id}
          businessName={business.name}
          language={language}
          userId={user.id}
          onSuccess={() => {
            // Reservation tracked via the dialog
          }}
        />
      )}
    </div>
  );
};

export default BusinessProfile;