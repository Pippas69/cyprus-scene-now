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
  Lock
} from "lucide-react";

// Placeholder event data
const placeholderEvents = [
  {
    id: 1,
    title: "Night Vibes at Engomi",
    category: "nightlife",
    location: "Engomi",
    city: "Nicosia",
    position: [35.1596, 33.3201] as LatLngExpression,
    interested: 45,
    going: 23,
    heat: "high",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400"
  },
  {
    id: 2,
    title: "Coffee Gathering",
    category: "cafe",
    location: "Aglantzia",
    city: "Nicosia",
    position: [35.1453, 33.3978] as LatLngExpression,
    interested: 12,
    going: 8,
    heat: "medium",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400"
  },
  {
    id: 3,
    title: "Art Exhibition Opening",
    category: "art",
    location: "Limassol Old Town",
    city: "Limassol",
    position: [34.6747, 33.0427] as LatLngExpression,
    interested: 34,
    going: 19,
    heat: "high",
    image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400"
  },
  {
    id: 4,
    title: "Beach Workout Session",
    category: "fitness",
    location: "Germasogeia",
    city: "Limassol",
    position: [34.7089, 33.0922] as LatLngExpression,
    interested: 28,
    going: 15,
    heat: "medium",
    image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400"
  },
  {
    id: 5,
    title: "Family Fun Day",
    category: "family",
    location: "Larnaca Marina",
    city: "Larnaca",
    position: [34.9176, 33.6367] as LatLngExpression,
    interested: 56,
    going: 32,
    heat: "high",
    image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400"
  }
];

// City neighborhoods data
const neighborhoods = {
  Nicosia: ["Έγκωμη", "Αγλαντζιά", "Λατσιά", "Στρόβολος", "Λακατάμια", "Μακεδονίτισσα", "Άγιος Δομέτιος", "Κάτω Λευκωσία"],
  Limassol: ["Γερμασόγεια", "Αγ. Αθανάσιος", "Μουτταγιάκα", "Κάψαλος", "Ζακάκι", "Παλιά Λεμεσός"],
  Larnaca: ["Φινικούδες", "Μακένζυ", "Δροσιά", "Άγιος Νικόλαος"],
  Paphos: ["Κάτω Πάφος", "Πάνω Πάφος", "Χλώρακας", "Τάλα"],
  Paralimni: ["Κέντρο", "Πρωταράς"],
  "Ayia Napa": ["Κέντρο", "Νησί", "Μακρόνησος"]
};

// Categories
const categories = [
  { id: "cafe", label: "Καφέ & Εστιατόρια", icon: Coffee, color: "#8B4513" },
  { id: "nightlife", label: "Νυχτερινή Ζωή", icon: Moon, color: "#4B0082" },
  { id: "art", label: "Τέχνη & Πολιτισμός", icon: Palette, color: "#FF1493" },
  { id: "fitness", label: "Γυμναστική", icon: Dumbbell, color: "#FF4500" },
  { id: "family", label: "Οικογένεια", icon: Users, color: "#32CD32" },
  { id: "business", label: "Business", icon: Briefcase, color: "#1E90FF" },
  { id: "lifestyle", label: "Lifestyle", icon: Sparkles, color: "#FFD700" },
  { id: "travel", label: "Ταξίδια", icon: Plane, color: "#00CED1" }
];

const Xartis = () => {
  const [language, setLanguage] = useState<"el" | "en">("el");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([35.1264, 33.4299]); // Cyprus center
  const [mapZoom, setMapZoom] = useState(9);

  const text = {
    el: {
      title: "Χάρτης Εκδηλώσεων",
      subtitle: "Ανακαλύψτε τι συμβαίνει τώρα στην Κύπρο",
      selectCity: "Επιλέξτε Περιοχή",
      selectNeighborhood: "Επιλέξτε Γειτονιά",
      allCategories: "Όλες οι Κατηγορίες",
      interested: "Ενδιαφέρομαι",
      going: "Έννα Πάω",
      heatLevels: {
        low: "Χαμηλή δραστηριότητα",
        medium: "Μεσαία δραστηριότητα",
        high: "Υψηλή δραστηριότητα"
      }
    },
    en: {
      title: "Events Map",
      subtitle: "Discover what's happening now in Cyprus",
      selectCity: "Select City",
      selectNeighborhood: "Select Neighborhood",
      allCategories: "All Categories",
      interested: "Interested",
      going: "Going",
      heatLevels: {
        low: "Low activity",
        medium: "Medium activity",
        high: "High activity"
      }
    }
  };

  const t = text[language];

  // Create custom icons for different categories
  const createCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    const color = cat?.color || "#4ECDC4";
    
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

  // Toggle category filter
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Get heat color based on level
  const getHeatColor = (heat: string) => {
    switch(heat) {
      case "high": return "#FF4500";
      case "medium": return "#FFA500";
      case "low": return "#FFD700";
      default: return "#FFD700";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar language={language} onLanguageToggle={setLanguage} />
      
      {/* Header */}
      <div className="pt-24 pb-6 px-4 bg-gradient-to-r from-primary to-accent">
        <div className="container mx-auto">
          <h1 className="font-poppins text-4xl md:text-5xl font-bold text-white mb-2">
            {t.title}
          </h1>
          <p className="font-inter text-lg text-white/90">
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
                <SelectItem value="Nicosia">Λευκωσία</SelectItem>
                <SelectItem value="Limassol">Λεμεσός</SelectItem>
                <SelectItem value="Larnaca">Λάρνακα</SelectItem>
                <SelectItem value="Paphos">Πάφος</SelectItem>
                <SelectItem value="Paralimni">Παραλίμνι</SelectItem>
                <SelectItem value="Ayia Napa">Αγία Νάπα</SelectItem>
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
          {placeholderEvents.map((event) => (
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
          {placeholderEvents.map((event) => (
            <Marker
              key={event.id}
              position={event.position}
              icon={createCategoryIcon(event.category)}
            >
              <Popup>
                <div className="w-64 p-2">
                  <img 
                    src={event.image} 
                    alt={event.title}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                  <h3 className="font-poppins font-bold text-lg text-foreground mb-1">
                    {event.title}
                  </h3>
                  <Badge variant="secondary" className="mb-2">
                    {categories.find(c => c.id === event.category)?.label}
                  </Badge>
                  <p className="text-sm text-muted-foreground mb-3">
                    📍 {event.location}, {event.city}
                  </p>
                  <div className="flex gap-2 mb-3 text-sm text-muted-foreground">
                    <span>👥 {event.interested} ενδιαφέρονται</span>
                    <span>✓ {event.going} πάνε</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 cursor-not-allowed opacity-50"
                      disabled
                    >
                      <Lock className="w-3 h-3 mr-1" />
                      {t.interested}
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="flex-1 cursor-not-allowed opacity-50"
                      disabled
                    >
                      <Lock className="w-3 h-3 mr-1" />
                      {t.going}
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <Footer language={language} onLanguageToggle={setLanguage} />
    </div>
  );
};

export default Xartis;
