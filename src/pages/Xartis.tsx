import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Coffee, Moon, Palette, Dumbbell, Users, Briefcase, Sparkles, Plane } from "lucide-react";
import MapWrapper from "@/components/map/MapWrapper";

const categories = [
  { id: "cafe", label: "Καφέ & Εστιατόρια", icon: Coffee },
  { id: "nightlife", label: "Νυχτερινή Ζωή", icon: Moon },
  { id: "art", label: "Τέχνη & Πολιτισμός", icon: Palette },
  { id: "fitness", label: "Γυμναστική", icon: Dumbbell },
  { id: "family", label: "Οικογένεια", icon: Users },
  { id: "business", label: "Business", icon: Briefcase },
  { id: "lifestyle", label: "Lifestyle", icon: Sparkles },
  { id: "travel", label: "Ταξίδια", icon: Plane },
];

const neighborhoods: Record<string, string[]> = {
  Λευκωσία: [
    "Έγκωμη",
    "Αγλαντζιά",
    "Λατσιά",
    "Στρόβολος",
    "Λακατάμια",
    "Μακεδονίτισσα",
    "Άγιος Δομέτιος",
    "Κάτω Λευκωσία",
  ],
  Λεμεσός: ["Γερμασόγεια", "Αγ. Αθανάσιος", "Μουτταγιάκα", "Κάψαλος", "Ζακάκι", "Παλιά Λεμεσός"],
  Λάρνακα: ["Φινικούδες", "Μακένζυ", "Δροσιά", "Άγιος Νικόλαος"],
  Πάφος: ["Κάτω Πάφος", "Πάνω Πάφος", "Χλώρακας", "Τάλα"],
  Παραλίμνι: ["Κέντρο", "Πρωταράς"],
  "Αγία Νάπα": ["Κέντρο", "Νησί", "Μακρόνησος"],
};

const Xartis = () => {
  const [language, setLanguage] = useState<"el" | "en">("el");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const text = {
    el: {
      title: "Χάρτης Εκδηλώσεων",
      subtitle: "Σύντομα θα βλέπεις ζωντανά τι γίνεται σε όλη την Κύπρο.",
      selectCity: "Επιλέξτε Πόλη",
      selectNeighborhood: "Επιλέξτε Περιοχή",
    },
    en: {
      title: "Events Map",
      subtitle: "Soon you’ll see what’s happening live across Cyprus.",
      selectCity: "Select City",
      selectNeighborhood: "Select Neighborhood",
    },
  };

  const t = text[language];

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar language={language} onLanguageToggle={setLanguage} />

      {/* Header */}
      <header className="pt-24 pb-6 px-4 bg-gradient-to-r from-primary to-accent">
        <div className="container mx-auto">
          <h1 className="font-poppins text-4xl md:text-5xl font-bold text-primary-foreground mb-2">{t.title}</h1>
          <p className="font-inter text-lg text-primary-foreground/90">{t.subtitle}</p>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-border bg-background sticky top-16 z-30">
        <div className="container mx-auto px-4 py-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setNeighborhood("");
              }}
              className="w-full md:w-64 border rounded-lg px-3 py-2 bg-background"
            >
              <option value="">{t.selectCity}</option>
              <option value="Λευκωσία">Λευκωσία</option>
              <option value="Λεμεσός">Λεμεσός</option>
              <option value="Λάρνακα">Λάρνακα</option>
              <option value="Πάφος">Πάφος</option>
              <option value="Παραλίμνι">Παραλίμνι</option>
              <option value="Αγία Νάπα">Αγία Νάπα</option>
            </select>

            {city && (
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full md:w-64 border rounded-lg px-3 py-2 bg-background"
              >
                <option value="">{t.selectNeighborhood}</option>
                {neighborhoods[city]?.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategories.includes(category.id);
              return (
                <Badge
                  key={category.id}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer px-4 py-2 transition-all ${
                    isSelected 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "bg-background text-foreground hover:bg-muted border-2"
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

      {/* Interactive Map */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          <MapWrapper city={city} neighborhood={neighborhood} selectedCategories={selectedCategories} />
        </div>
      </main>

      <Footer language={language} onLanguageToggle={setLanguage} />
    </div>
  );
};

export default Xartis;
