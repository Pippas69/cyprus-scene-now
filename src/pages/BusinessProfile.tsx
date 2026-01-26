import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEngagement } from "@/lib/analyticsTracking";
import { getCategoryLabel } from "@/lib/categoryTranslations";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { RippleButton } from "@/components/ui/ripple-button";
import { CheckCircle, MapPin, Phone, Globe, ArrowLeft, CalendarCheck, GraduationCap, Share2 } from "lucide-react";
import { UnifiedEventCard } from "@/components/feed/UnifiedEventCard";
import OfferCard from "@/components/OfferCard";
import { FollowButton } from "@/components/business/FollowButton";
import { DirectReservationDialog } from "@/components/business/DirectReservationDialog";
import { StudentDiscountButton } from "@/components/user/StudentDiscountButton";
import { ShareProfileDialog } from "@/components/sharing/ShareProfileDialog";
import { useLanguage } from "@/hooks/useLanguage";
import { translateCity } from "@/lib/cityTranslations";

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
  const location = useLocation();
  const { language } = useLanguage();
  const [business, setBusiness] = useState<Business | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [offers, setOffers] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerSrc, setImageViewerSrc] = useState<string | null>(null);
  const [imageViewerAlt, setImageViewerAlt] = useState<string>("");

  const translations = {
    el: {
      businessNotFound: "Η επιχείρηση δεν βρέθηκε ή δεν είναι επαληθευμένη",
      loadError: "Σφάλμα φόρτωσης δεδομένων",
      back: "Πίσω",
      city: "Πόλη",
      phone: "Τηλέφωνο",
      website: "Ιστοσελίδα",
      about: "Σχετικά",
      noContent: "Δεν υπάρχουν εκδηλώσεις ή προσφορές αυτή τη στιγμή",
      reserveTable: "Κράτηση Τραπεζιού",
      loginToReserve: "Συνδεθείτε για κράτηση",
      studentDiscount: "Φοιτητική Έκπτωση",
      studentDiscountOnce: "στην πρώτη επίσκεψη",
      studentDiscountUnlimited: "σε κάθε επίσκεψη",
      share: "Κοινοποίηση",
      copied: "Αντιγράφηκε!"
    },
    en: {
      businessNotFound: "Business not found or not verified",
      loadError: "Error loading data",
      back: "Back",
      city: "City",
      phone: "Phone",
      website: "Website",
      about: "About",
      noContent: "No events or offers at this time",
      reserveTable: "Reserve a Table",
      loginToReserve: "Login to reserve",
      studentDiscount: "Student Discount",
      studentDiscountOnce: "on first visit",
      studentDiscountUnlimited: "on every visit",
      share: "Share",
      copied: "Copied!"
    }
  };

  const t = translations[language];

  const openImageViewer = (src: string | null, alt: string) => {
    if (!src) return;
    setImageViewerSrc(src);
    setImageViewerAlt(alt);
    setImageViewerOpen(true);
  };

  const handleBack = () => {
    const from = (location.state as any)?.from as string | undefined;
    if (from) {
      navigate(from);
      return;
    }
    // Prefer history back when possible to keep user within their current context (user vs business dashboard).
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/feed");
  };

  const handleShareProfile = () => {
    if (!businessId) return;

    // Track share intent
    trackEngagement(businessId, 'share', 'business', businessId);

    // Open our in-app share dialog (like events)
    setShowShareDialog(true);
  };

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (businessId) {
      fetchBusinessData();
      // Do NOT count views when navigation originated from the user's dashboard sections.
      const src = new URLSearchParams(location.search).get('src');
      if (src !== 'dashboard_user') {
        trackEngagement(businessId, 'profile_view', 'business', businessId);
      }
    }
  }, [businessId, location.search]);

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

      // Fetch offers - include full business details for OfferPurchaseDialog
      const { data: offersData, error: offersError } = await supabase
        .from("discounts")
        .select(`
          *,
          businesses!inner(name, logo_url, city, cover_url, accepts_direct_reservations, reservation_time_slots, reservation_days)
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

  // Navigate to map with this business
  const handleCityClick = () => {
    navigate(`/xartis?business=${businessId}`);
  };

  // Format website URL for display and links
  const getWebsiteUrl = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Hero Section with Cover Image */}
      <div className="relative h-56 md:h-72">
        {business.cover_url ? (
          <button
            type="button"
            aria-label={language === 'el' ? 'Προβολή εικόνας εξωφύλλου' : 'View cover image'}
            onClick={() => openImageViewer(business.cover_url, `${business.name} cover`)}
            className="absolute inset-0 bg-cover bg-center overflow-hidden cursor-zoom-in"
            style={{ backgroundImage: `url(${business.cover_url})` }}
          >
            <span className="sr-only">cover</span>
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background pointer-events-none" />
          </button>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-background pointer-events-none" />
        )}

        {/* Back Button */}
        <RippleButton
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="absolute top-4 left-4 z-[60] bg-background/80 backdrop-blur-sm hover:bg-background safe-area-top"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t.back}
        </RippleButton>

        {/* Avatar centered, follow/share icons positioned to the right */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-[calc(50%-36px)] translate-y-1/2">
          <div className="flex items-center gap-3">
            {/* Avatar - centered with icons offset to the right */}
            <motion.div
              className="relative"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
            >
              <button
                type="button"
                aria-label={language === 'el' ? 'Προβολή λογότυπου' : 'View logo'}
                onClick={() => openImageViewer(business.logo_url, `${business.name} logo`)}
                className="rounded-full cursor-zoom-in"
              >
                <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-background shadow-lg ring-2 ring-primary/20">
                  <AvatarImage src={business.logo_url || undefined} alt={`${business.name} logo`} />
                  <AvatarFallback className="text-3xl font-bold bg-muted">
                    {business.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
              
              {/* Student Discount Badge overlaid on avatar - clickable with icon + percentage */}
              {business.student_discount_enabled && business.student_discount_percent && user && (
                <div className="absolute -top-1 -right-1 z-10">
                  <StudentDiscountButton
                    businessId={business.id}
                    businessName={business.name}
                    discountPercent={business.student_discount_percent}
                    discountMode={business.student_discount_mode === 'unlimited' ? 'unlimited' : 'one_time'}
                    userId={user?.id || null}
                    language={language}
                    variant="badge"
                  />
                </div>
              )}
              
              {/* Non-clickable badge when not logged in */}
              {business.student_discount_enabled && business.student_discount_percent && !user && (
                <div className="absolute -top-1 -right-1 z-10">
                  <div className="bg-accent text-accent-foreground text-[9px] font-bold rounded-full h-7 w-7 flex flex-col items-center justify-center border-2 border-background shadow-md">
                    <GraduationCap className="h-3 w-3" />
                    <span className="-mt-0.5">{business.student_discount_percent}%</span>
                  </div>
                </div>
              )}
            </motion.div>
            
            {/* Follow + Share icons to the right of avatar */}
            <motion.div 
              className="flex items-center gap-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <FollowButton businessId={business.id} language={language} variant="compact" />
              <button
                type="button"
                onClick={handleShareProfile}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                title={t.share}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Image Viewer - Premium Instagram-style */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent 
          className={cn(
            "p-0 overflow-hidden border-0 bg-transparent shadow-none",
            // If viewing logo (circular avatar), use circular preview
            imageViewerAlt.includes('logo') 
              ? "max-w-[200px] sm:max-w-[280px] md:max-w-[320px]" 
              : "max-w-[85vw] sm:max-w-lg md:max-w-xl"
          )}
        >
          <div className={cn(
            "relative",
            imageViewerAlt.includes('logo') && "flex items-center justify-center"
          )}>
            {imageViewerSrc && (
              imageViewerAlt.includes('logo') ? (
                // Circular logo preview - Instagram style magnification
                <div className="relative">
                  <img
                    src={imageViewerSrc}
                    alt={imageViewerAlt}
                    className="w-[180px] h-[180px] sm:w-[240px] sm:h-[240px] md:w-[280px] md:h-[280px] rounded-full object-cover ring-4 ring-background shadow-2xl"
                    loading="eager"
                  />
                </div>
              ) : (
                // Cover image preview - smaller and more premium
                <img
                  src={imageViewerSrc}
                  alt={imageViewerAlt}
                  className="w-full h-auto max-h-[50vh] sm:max-h-[55vh] md:max-h-[60vh] object-contain rounded-xl"
                  loading="eager"
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Business Info - centered below avatar */}
      <div className="container mx-auto px-4 pt-16 md:pt-20 pb-24 md:pb-8">
        <motion.div 
          className="text-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Name + Verified - centered */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {business.name}
            </h1>
            {business.verified && (
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
            )}
          </div>

          {/* Category as plain text (not badges) */}
          <p className="text-sm text-muted-foreground mb-1">
            {business.category.map(cat => getCategoryLabel(cat, language)).join(" & ")}
          </p>
          
          {/* Description - centered */}
          {business.description && (
            <p className="text-muted-foreground text-sm max-w-md mx-auto text-center">
              {business.description}
            </p>
          )}
        </motion.div>

        {/* Reservation Button - above contact cards */}
        {business.accepts_direct_reservations && (
          <motion.div 
            className="flex justify-center mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
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
          </motion.div>
        )}

        {/* Contact Info Cards - 3-column row on mobile */}
        <motion.div 
          className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-3 mb-6 max-w-2xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* City Card - Clickable to map */}
          <motion.div variants={itemVariants} className="sm:flex-1 sm:min-w-[120px] sm:max-w-[200px]">
            <Card 
              variant="glass" 
              className="backdrop-blur-md hover:shadow-hover transition-all duration-300 cursor-pointer h-full"
              onClick={handleCityClick}
            >
              <CardContent className="flex flex-col items-center text-center p-2 sm:p-4">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mb-0.5 sm:mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t.city}</p>
                <p className="font-medium text-xs sm:text-sm truncate max-w-full">{translateCity(business.city, language)}</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Phone Card */}
          {business.phone && (
            <motion.div variants={itemVariants} className="sm:flex-1 sm:min-w-[120px] sm:max-w-[200px]">
              <a href={`tel:${business.phone}`} onClick={() => trackEngagement(business.id, 'phone_click', 'business', business.id)}>
                <Card variant="glass" className="backdrop-blur-md hover:shadow-hover transition-all duration-300 cursor-pointer h-full">
                  <CardContent className="flex flex-col items-center text-center p-2 sm:p-4">
                    <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mb-0.5 sm:mb-1" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{t.phone}</p>
                    <p className="font-medium text-xs sm:text-sm truncate max-w-full">{business.phone}</p>
                  </CardContent>
                </Card>
              </a>
            </motion.div>
          )}

          {/* Website Card */}
          {business.website && (
            <motion.div variants={itemVariants} className="sm:flex-1 sm:min-w-[120px] sm:max-w-[200px]">
              <a 
                href={getWebsiteUrl(business.website)} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => trackEngagement(business.id, 'website_click', 'business', business.id)}
              >
                <Card variant="glass" className="backdrop-blur-md hover:shadow-hover transition-all duration-300 cursor-pointer h-full">
                  <CardContent className="flex flex-col items-center text-center p-2 sm:p-4">
                    <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mb-0.5 sm:mb-1" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{t.website}</p>
                    <p className="font-medium text-xs sm:text-sm truncate max-w-full">
                      {business.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </p>
                  </CardContent>
                </Card>
              </a>
            </motion.div>
          )}
        </motion.div>


        {/* Unified Events & Offers List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {events.length === 0 && offers.length === 0 ? (
            <Card variant="glass">
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  {t.noContent}
                </p>
              </CardContent>
            </Card>
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Render all events */}
              {events.map((event) => (
                <motion.div key={`event-${event.id}`} variants={itemVariants}>
                  {/* Mobile: mobileFixed matches MyOffers card, Desktop: full */}
                  <div className="md:hidden">
                    <UnifiedEventCard 
                      event={event} 
                      language={language} 
                      size="mobileFixed"
                      isFree={event.price_tier === "free"}
                    />
                  </div>
                  <div className="hidden md:block">
                    <UnifiedEventCard 
                      event={event} 
                      language={language} 
                      size="full"
                      isFree={event.price_tier === "free"}
                    />
                  </div>
                </motion.div>
              ))}
              {/* Render all offers */}
              {offers.map((offer) => (
                <motion.div key={`offer-${offer.id}`} variants={itemVariants}>
                  <OfferCard offer={offer} language={language} user={user} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Share Profile Dialog */}
      {business && (
        <ShareProfileDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          business={business}
          language={language}
        />
      )}

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