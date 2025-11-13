import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { Icon, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Coffee, 
  Moon, 
  Palette, 
  Dumbbell, 
  Users, 
  Briefcase, 
  Sparkles, 
  Plane,
  Lock,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const categories = [
  { id: "cafe", label: "Καφέ & Εστιατόρια", icon: Coffee },
  { id: "nightlife", label: "Νυχτερινή Ζωή", icon: Moon },
  { id: "art", label: "Τέχνη & Πολιτισμός", icon: Palette },
  { id: "fitness", label: "Γυμναστική", icon: Dumbbell },
  { id: "family", label: "Οικογένεια", icon: Users },
  { id: "business", label: "Business", icon: Briefcase },
  { id: "lifestyle", label: "Lifestyle", icon: Sparkles },
  { id: "travel", label: "Ταξίδια", icon: Plane }
];

const neighborhoods = {
  "Λευκωσία": ["Έγκωμη", "Αγλαντζιά", "Λατσιά", "Στρόβολος", "Λακατάμια", "Μακεδονίτισσα", "Άγιος Δομέτιος", "Κάτω Λευκωσία"],
  "Λεμεσός": ["Γερμασόγεια", "Αγ. Αθανάσιος", "Μουτταγιάκα", "Κάψαλος", "Ζακάκι", "Παλιά Λεμεσός"],
  "Λάρνακα": ["Φινικούδες", "Μακένζυ", "Δροσιά", "Άγιος Νικόλαος"],
  "Πάφος": ["Κάτω Πάφος", "Πάνω Πάφος", "Χλώρακας", "Τάλα"],
  "Παραλίμνι": ["Κέντρο", "Πρωταράς"],
  "Αγία Νάπα": ["Κέντρο", "Νησί", "Μακρόνησος"]
};

const placeholderEvents = [
  "• Test Event 1 – Engomi",
  "• Test Event 2 – Aglantzia",
  "• Test Event 3 – Limassol Marina"
];

interface EventWithLocation {
  id: string;
  title: string;
  category: string[];
  location: string;
  city: string;
  position: LatLngExpression;
  interested: number;
  going: number;
  heat: "low" | "medium" | "high";
  image?: string;
  business_id: string;
}

const Xartis = () => {
  const { toast } = useToast();
  const [language, setLanguage] = useState<"el" | "en">("el");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [events, setEvents] = useState<EventWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([35.1264, 33.4299]);
  const [mapZoom, setMapZoom] = useState(9);
  const [userRsvps, setUserRsvps] = useState<Record<string, string>>({});

  const text = {
    el: {
      title: "Χάρτης Εκδηλώσεων",
      subtitle: "Ανακαλύψτε τι συμβαίνει τώρα στην Κύπρο",
      selectCity: "Επιλέξτε Πόλη",
      selectNeighborhood: "Επιλέξτε Περιοχή",
      interested: "Ενδιαφέρομαι",
      going: "Έννα Πάω"
    },
    en: {
      title: "Events Map",
      subtitle: "Discover what's happening now in Cyprus",
      selectCity: "Select City",
      selectNeighborhood: "Select Neighborhood",
      interested: "Interested",
      going: "Going"
    }
  };

  const t = text[language];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchEvents();
    if (user) {
      fetchUserRsvps();
    }
  }, [selectedCity, selectedNeighborhood, selectedCategories, user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("events")
        .select(`
          *,
          businesses!inner(id, geo, city, address, name),
          realtime_stats(interested_count, going_count)
        `)
        .gte("end_at", new Date().toISOString());

      if (selectedCity) {
        query = query.eq("businesses.city", selectedCity);
      }

      const { data, error } = await query;

      if (error) throw error;

      const eventsWithLocation: EventWithLocation[] = data
        ?.filter((event: any) => {
          if (!event.businesses?.geo) return false;
          
          const matchesCategory = selectedCategories.length === 0 || 
            event.category?.some((cat: string) => selectedCategories.includes(cat));
          
          return matchesCategory;
        })
        .map((event: any) => {
          const coords = event.businesses.geo.coordinates;
          const stats = event.realtime_stats?.[0] || { interested_count: 0, going_count: 0 };
          const totalActivity = stats.interested_count + stats.going_count;
          
          let heat: "low" | "medium" | "high" = "low";
          if (totalActivity > 50) heat = "high";
          else if (totalActivity > 20) heat = "medium";

          return {
            id: event.id,
            title: event.title,
            category: event.category || [],
            location: event.businesses.address || event.location,
            city: event.businesses.city || "Cyprus",
            position: [coords[1], coords[0]] as LatLngExpression,
            interested: stats.interested_count,
            going: stats.going_count,
            heat,
            image: event.cover_image_url,
            business_id: event.business_id
          };
        }) || [];

      setEvents(eventsWithLocation);

      if (eventsWithLocation.length > 0) {
        setMapCenter(eventsWithLocation[0].position);
        setMapZoom(12);
      } else if (selectedCity) {
        const cityCoords = getCityCoordinates(selectedCity);
        if (cityCoords) {
          setMapCenter(cityCoords);
          setMapZoom(11);
        }
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRsvps = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("rsvps")
      .select("event_id, status")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching RSVPs:", error);
      return;
    }

    const rsvpMap: Record<string, string> = {};
    data?.forEach((rsvp) => {
      rsvpMap[rsvp.event_id] = rsvp.status;
    });
    setUserRsvps(rsvpMap);
  };

  const getCityCoordinates = (city: string): LatLngExpression | null => {
    const coords: Record<string, LatLngExpression> = {
      "Λευκωσία": [35.1856, 33.3823],
      "Λεμεσός": [34.6747, 33.0427],
      "Λάρνακα": [34.9176, 33.6367],
      "Πάφος": [34.7571, 32.4240],
      "Παραλίμνι": [35.0385, 33.9819],
      "Αγία Νάπα": [34.9908, 34.0004]
    };
    return coords[city] || null;
  };

  const handleRsvp = async (eventId: string, status: "interested" | "going") => {
    if (!user) {
      toast({
        title: language === "el" ? "Απαιτείται σύνδεση" : "Login required",
        description: language === "el" ? "Παρακαλώ συνδεθείτε για να κάνετε RSVP" : "Please login to RSVP",
        variant: "destructive"
      });
      return;
    }

    const currentStatus = userRsvps[eventId];
    
    if (currentStatus === status) {
      const { error } = await supabase
        .from("rsvps")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (!error) {
        const newRsvps = { ...userRsvps };
        delete newRsvps[eventId];
        setUserRsvps(newRsvps);
        await fetchEvents();
      }
    } else {
      const { error } = await supabase
        .from("rsvps")
        .upsert({
          event_id: eventId,
          user_id: user.id,
          status
        });

      if (!error) {
        setUserRsvps({ ...userRsvps, [eventId]: status });
        await fetchEvents();
      }
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const createCategoryIcon = (category: string[]) => {
    const mainCategory = category[0] || "cafe";
    const cat = categories.find(c => c.id === mainCategory);
    const color = cat ? "#4ECDC4" : "#4ECDC4";
    
    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="3"/>
          <circle cx="20" cy="20" r="6" fill="white"/>
        </svg>
      `)}`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
  };

  const getHeatColor = (heat: string) => {
    switch(heat) {
      case "high": return "#FF4500";
      case "medium": return "#FFA500";
      case "low": return "#FFD700";
      default: return "#FFD700";
    }
  };

  const filteredEvents = events;

  return (
    <div className="min-h-screen bg-background">
      <Navbar language={language} onLanguageToggle={setLanguage} />
      
      {/* Header */}
      <div className="pt-24 pb-6 px-4 bg-gradient-to-r from-primary to-accent">
        <div className="container mx-auto">
          <h1 className="font-poppins text-4xl md:text-5xl font-bold text-primary-foreground mb-2">
            {t.title}
          </h1>
          <p className="font-inter text-lg text-primary-foreground/90">
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="sticky top-16 z-40 bg-background border-b border-border shadow-md">
        <div className="container mx-auto px-4 py-4 space-y-4">
          {/* City and Neighborhood Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={selectedCity} onValueChange={(value) => {
              setSelectedCity(value);
              setSelectedNeighborhood("");
            }}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder={t.selectCity} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="Λευκωσία">Λευκωσία</SelectItem>
                <SelectItem value="Λεμεσός">Λεμεσός</SelectItem>
                <SelectItem value="Λάρνακα">Λάρνακα</SelectItem>
                <SelectItem value="Πάφος">Πάφος</SelectItem>
                <SelectItem value="Παραλίμνι">Παραλίμνι</SelectItem>
                <SelectItem value="Αγία Νάπα">Αγία Νάπα</SelectItem>
              </SelectContent>
            </Select>

            {selectedCity && (
              <Select value={selectedNeighborhood} onValueChange={setSelectedNeighborhood}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder={t.selectNeighborhood} />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {neighborhoods[selectedCity as keyof typeof neighborhoods]?.map((neighborhood) => (
                    <SelectItem key={neighborhood} value={neighborhood}>
                      {neighborhood}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategories.includes(category.id);
              
              return (
                <Badge
                  key={category.id}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer px-4 py-2 transition-all hover:scale-105 ${
                    isSelected 
                      ? "bg-primary text-primary-foreground shadow-hover" 
                      : "hover:bg-muted"
                  }`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {category.label}
                </Badge>
              );
            })}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-[calc(100vh-320px)] md:h-[calc(100vh-280px)]">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center bg-muted/10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {filteredEvents.map((event) => (
              <Circle
                key={`heat-${event.id}`}
                center={event.position}
                radius={event.heat === "high" ? 1000 : event.heat === "medium" ? 700 : 500}
                pathOptions={{
                  fillColor: getHeatColor(event.heat),
                  fillOpacity: 0.15,
                  color: getHeatColor(event.heat),
                  weight: 1,
                  opacity: 0.3
                }}
              />
            ))}

            {filteredEvents.map((event) => (
              <Marker
                key={event.id}
                position={event.position}
                icon={createCategoryIcon(event.category)}
              >
                <Popup><div className="w-64 p-2">{event.image && <img src={event.image} alt={event.title} className="w-full h-32 object-cover rounded-lg mb-3" />}<h3 className="font-poppins font-bold text-lg text-foreground mb-1">{event.title}</h3><Badge variant="secondary" className="mb-2">{event.category[0] && categories.find(c => c.id === event.category[0])?.label}</Badge><p className="text-sm text-muted-foreground mb-3">📍 {event.location}, {event.city}</p><div className="flex gap-2 mb-3 text-sm text-muted-foreground"><span>👥 {event.interested} {language === "el" ? "ενδιαφέρονται" : "interested"}</span><span>✓ {event.going} {language === "el" ? "πάνε" : "going"}</span></div><div className="flex gap-2">{user ? <><Button variant={userRsvps[event.id] === "interested" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => handleRsvp(event.id, "interested")}>{t.interested}</Button><Button variant={userRsvps[event.id] === "going" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => handleRsvp(event.id, "going")}>{t.going}</Button></> : <><Button variant="outline" size="sm" className="flex-1 cursor-not-allowed opacity-50" disabled><Lock className="w-3 h-3 mr-1" />{t.interested}</Button><Button variant="outline" size="sm" className="flex-1 cursor-not-allowed opacity-50" disabled><Lock className="w-3 h-3 mr-1" />{t.going}</Button></>}</div></div></Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      <Footer language={language} onLanguageToggle={setLanguage} />
    </div>
  );
};

export default Xartis;
