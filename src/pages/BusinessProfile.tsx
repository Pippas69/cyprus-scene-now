import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, MapPin, Phone, Globe, ArrowLeft } from "lucide-react";
import EventCard from "@/components/EventCard";
import OfferCard from "@/components/OfferCard";
import { FollowButton } from "@/components/business/FollowButton";
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

const BusinessProfile = () => {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [business, setBusiness] = useState<Business | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [offers, setOffers] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (businessId) {
      fetchBusinessData();
    }
  }, [businessId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchBusinessData = async () => {
    try {
      // Fetch business details
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .eq("verified", true)
        .maybeSingle();

      if (businessError) throw businessError;

      if (!businessData) {
        toast.error("Η επιχείρηση δεν βρέθηκε ή δεν είναι επαληθευμένη");
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
      toast.error("Σφάλμα φόρτωσης δεδομένων");
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-[60] bg-background/80 backdrop-blur-sm hover:bg-background safe-area-top"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Πίσω
        </Button>

        {/* Logo positioned at bottom, overlapping */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 md:border-[6px] border-background shadow-lg">
            <AvatarImage src={business.logo_url || undefined} alt={`${business.name} logo`} />
            <AvatarFallback className="text-3xl font-bold bg-muted">
              {business.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Business Info */}
      <div className="container mx-auto px-4 pt-16 md:pt-24 pb-24 md:pb-8">
        <div className="text-center mb-8">
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
          </div>

          {/* Follow Button */}
          {business.id && (
            <div className="flex justify-center">
              <FollowButton businessId={business.id} language={language} />
            </div>
          )}
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {business.city && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Πόλη</p>
                  <p className="font-medium">{business.city}</p>
                  {business.address && (
                    <p className="text-sm text-muted-foreground">{business.address}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {business.phone && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Τηλέφωνο</p>
                  <a
                    href={`tel:${business.phone}`}
                    className="inline-block py-2 font-medium hover:text-primary"
                  >
                    {business.phone}
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {business.website && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Ιστοσελίδα</p>
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-primary truncate block"
                  >
                    {business.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Description */}
        {business.description && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Σχετικά</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {business.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Events and Offers Tabs */}
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12 md:h-10">
            <TabsTrigger value="events">
              Εκδηλώσεις ({events.length})
            </TabsTrigger>
            <TabsTrigger value="offers">
              Προσφορές ({offers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-6">
            {events.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    Δεν υπάρχουν προγραμματισμένες εκδηλώσεις αυτή τη στιγμή
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} language="el" user={user} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="offers" className="mt-6">
            {offers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    Δεν υπάρχουν ενεργές προσφορές αυτή τη στιγμή
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} language="el" />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BusinessProfile;
