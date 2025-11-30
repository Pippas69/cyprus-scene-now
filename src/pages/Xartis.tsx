import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coffee, Moon, Palette, Dumbbell, Users, Briefcase, Sparkles, Plane, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MapWrapper from "@/components/map/MapWrapper";
import { useLanguage } from "@/hooks/useLanguage";

const categories = {
  el: [
    { id: "cafe", label: "Καφέ & Εστιατόρια", icon: Coffee },
    { id: "nightlife", label: "Νυχτερινή Ζωή", icon: Moon },
    { id: "art", label: "Τέχνη & Πολιτισμός", icon: Palette },
    { id: "fitness", label: "Γυμναστική", icon: Dumbbell },
    { id: "family", label: "Οικογένεια", icon: Users },
    { id: "business", label: "Business", icon: Briefcase },
    { id: "lifestyle", label: "Lifestyle", icon: Sparkles },
    { id: "travel", label: "Ταξίδια", icon: Plane },
  ],
  en: [
    { id: "cafe", label: "Cafés & Restaurants", icon: Coffee },
    { id: "nightlife", label: "Nightlife", icon: Moon },
    { id: "art", label: "Art & Culture", icon: Palette },
    { id: "fitness", label: "Fitness", icon: Dumbbell },
    { id: "family", label: "Family", icon: Users },
    { id: "business", label: "Business", icon: Briefcase },
    { id: "lifestyle", label: "Lifestyle", icon: Sparkles },
    { id: "travel", label: "Travel", icon: Plane },
  ],
};

const neighborhoods = {
  el: {
    Λευκωσία: ["Έγκωμη", "Αγλαντζιά", "Λατσιά", "Στρόβολος", "Λακατάμια", "Μακεδονίτισσα", "Άγιος Δομέτιος", "Κάτω Λευκωσία"],
    Λεμεσός: ["Γερμασόγεια", "Αγ. Αθανάσιος", "Μουτταγιάκα", "Κάψαλος", "Ζακάκι", "Παλιά Λεμεσός"],
    Λάρνακα: ["Φινικούδες", "Μακένζυ", "Δροσιά", "Άγιος Νικόλαος"],
    Πάφος: ["Κάτω Πάφος", "Πάνω Πάφος", "Χλώρακας", "Τάλα"],
    Παραλίμνι: ["Κέντρο", "Πρωταράς"],
    "Αγία Νάπα": ["Κέντρο", "Νησί", "Μακρόνησος"],
  },
  en: {
    Nicosia: ["Egkomi", "Aglandjia", "Latsia", "Strovolos", "Lakatamia", "Makedonitissa", "Agios Dometios", "Kato Nicosia"],
    Limassol: ["Germasogeia", "Ag. Athanasios", "Mouttagiaka", "Kapsalos", "Zakaki", "Old Limassol"],
    Larnaca: ["Finikoudes", "Mackenzie", "Drosia", "Agios Nikolaos"],
    Paphos: ["Kato Paphos", "Pano Paphos", "Chlorakas", "Tala"],
    Paralimni: ["Center", "Protaras"],
    "Ayia Napa": ["Center", "Nissi", "Makronissos"],
  },
};

const Xartis = () => {
  const { language, setLanguage } = useLanguage();
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});

  const text = {
    el: {
      title: "Χάρτης Εκδηλώσεων",
      subtitle: "Σύντομα θα βλέπεις ζωντανά τι γίνεται σε όλη την Κύπρο.",
      selectCity: "Επιλέξτε Πόλη",
      selectNeighborhood: "Επιλέξτε Περιοχή",
      clearFilters: "Καθαρισμός φίλτρων",
      activeFilters: "Ενεργά φίλτρα",
    },
    en: {
      title: "Events Map",
      subtitle: "Soon you’ll see what’s happening live across Cyprus.",
      selectCity: "Select City",
      selectNeighborhood: "Select Neighborhood",
      clearFilters: "Clear Filters",
      activeFilters: "Active Filters",
    },
  };

  const t = text[language];

  // Fetch event counts per category
  useEffect(() => {
    const fetchEventCounts = async () => {
      const { data } = await supabase
        .from('events')
        .select('category')
        .gte('end_at', new Date().toISOString());

      if (data) {
        const counts: Record<string, number> = {};
        categories.el.forEach(cat => {
          counts[cat.id] = data.filter(event => 
            event.category.includes(cat.id)
          ).length;
        });
        setEventCounts(counts);
      }
    };

    fetchEventCounts();
  }, []);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setCity("");
    setNeighborhood("");
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Filters Section */}
      <div className="bg-background border-b border-border p-4">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setNeighborhood("");
                }}
                className="w-full md:w-64 border rounded-lg px-3 py-2 bg-background text-foreground"
              >
                <option value="">{t.selectCity}</option>
                {Object.keys(neighborhoods[language]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {city && (
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full md:w-64 border rounded-lg px-3 py-2 bg-background text-foreground"
                >
                  <option value="">{t.selectNeighborhood}</option>
                  {neighborhoods[language][city]?.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Clear Filters */}
            {(selectedCategories.length > 0 || city || neighborhood) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="gap-2 whitespace-nowrap"
              >
                <X size={16} />
                {t.clearFilters}
              </Button>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories[language].map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategories.includes(category.id);
              const count = eventCounts[category.id] || 0;

              return (
                <Badge
                  key={category.id}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5 gap-2 transition-all duration-300 ease-out hover:scale-105 hover:-translate-y-0.5 active:scale-95"
                  onClick={() => toggleCategory(category.id)}
                >
                  <Icon size={14} />
                  <span className="text-xs">{category.label}</span>
                  {count > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      isSelected 
                        ? "bg-primary-foreground/20 text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  )}
                </Badge>
              );
            })}
          </div>

          {/* Active filters indicator */}
          {selectedCategories.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {t.activeFilters}: {selectedCategories.length}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Map */}
      <div className="flex-1 w-full">
        <MapWrapper 
          city={city} 
          neighborhood={neighborhood} 
          selectedCategories={selectedCategories}
          eventCounts={eventCounts}
        />
      </div>
    </div>
  );
};

export default Xartis;
