import { useState } from "react";
import { MapPin, Calendar, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EventCard from "@/components/EventCard";
import CategoryFilter from "@/components/CategoryFilter";
import LanguageToggle from "@/components/LanguageToggle";

const Feed = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("trending");
  const [language, setLanguage] = useState<"el" | "en">("el");

  const translations = {
    el: {
      title: "Ανακαλύψτε το ΦΟΜΟ",
      subtitle: "Δείτε τι συμβαίνει τώρα στην Κύπρο",
      trending: "Δημοφιλή",
      upcoming: "Επερχόμενα",
      offers: "Προσφορές",
      map: "Χάρτης",
    },
    en: {
      title: "Discover ΦΟΜΟ",
      subtitle: "See what's happening now in Cyprus",
      trending: "Trending",
      upcoming: "Upcoming",
      offers: "Offers",
      map: "Map",
    },
  };

  const t = translations[language];

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-ocean bg-clip-text text-transparent">
                ΦΟΜΟ
              </h1>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>
            <LanguageToggle language={language} onToggle={setLanguage} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="mb-6">
          <CategoryFilter
            selectedCategories={selectedCategories}
            onCategoryChange={setSelectedCategories}
            language={language}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="trending" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              {t.trending}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2">
              <Calendar className="h-4 w-4" />
              {t.upcoming}
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-2">
              <span className="text-lg">🎟️</span>
              {t.offers}
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <MapPin className="h-4 w-4" />
              {t.map}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-4">
            <EventCard language={language} />
            <EventCard language={language} />
            <EventCard language={language} />
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            <p className="text-center text-muted-foreground py-8">
              {language === "el" ? "Επερχόμενα events..." : "Upcoming events..."}
            </p>
          </TabsContent>

          <TabsContent value="offers" className="space-y-4">
            <p className="text-center text-muted-foreground py-8">
              {language === "el" ? "Προσφορές με QR..." : "QR Offers..."}
            </p>
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <div className="bg-muted rounded-lg h-[500px] flex items-center justify-center">
              <p className="text-muted-foreground">
                {language === "el" ? "Χάρτης σύντομα..." : "Map coming soon..."}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Feed;
