import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
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
  Plane
} from "lucide-react";

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

const Xartis = () => {
  const [language, setLanguage] = useState<"el" | "en">("el");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const text = {
    el: {
      title: "Χάρτης Εκδηλώσεων",
      subtitle: "Ανακαλύψτε τι συμβαίνει τώρα στην Κύπρο",
      selectCity: "Επιλέξτε Πόλη",
      selectNeighborhood: "Επιλέξτε Περιοχή"
    },
    en: {
      title: "Events Map",
      subtitle: "Discover what's happening now in Cyprus",
      selectCity: "Select City",
      selectNeighborhood: "Select Neighborhood"
    }
  };

  const t = text[language];

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

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

      {/* Placeholder Events List */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="font-poppins text-xl font-semibold text-foreground mb-4">
            Placeholder Events
          </h2>
          <div className="space-y-2 text-muted-foreground">
            {placeholderEvents.map((event, index) => (
              <p key={index}>{event}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="container mx-auto px-4 pb-8">
        <div 
          className="w-full rounded-lg border-2 border-dashed border-border bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 flex items-center justify-center"
          style={{ height: '70vh' }}
        >
          <div className="text-center">
            <p className="text-2xl font-poppins font-semibold text-muted-foreground mb-2">
              Map Placeholder – Cyprus
            </p>
            <p className="text-sm text-muted-foreground">
              Interactive map will be added in Step 2
            </p>
          </div>
        </div>
      </div>

      <Footer language={language} onLanguageToggle={setLanguage} />
    </div>
  );
};

export default Xartis;
