import { Heart, Users, Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface EventCardProps {
  language: "el" | "en";
}

const EventCard = ({ language }: EventCardProps) => {
  const translations = {
    el: {
      interested: "Ενδιαφέρον",
      going: "Πάω",
      ageRange: "Ηλικιακό Εύρος",
      free: "Δωρεάν",
    },
    en: {
      interested: "Interested",
      going: "Going",
      ageRange: "Age Range",
      free: "Free",
    },
  };

  const t = translations[language];

  return (
    <Card className="overflow-hidden hover:shadow-hover transition-all duration-300 group">
      {/* Image */}
      <div className="relative h-48 bg-gradient-ocean overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-white/20 text-6xl">
          🌊
        </div>
        <Badge className="absolute top-3 left-3 bg-card/90 text-card-foreground">
          ☕ Café
        </Badge>
        <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground">
          {t.free}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title & Location */}
        <div>
          <h3 className="font-bold text-lg group-hover:text-ocean transition-colors">
            Sunday Brunch at Lost + Found
          </h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            <span>Nicosia • 2.3 km away</span>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Today, 11:00 - 15:00</span>
        </div>

        {/* Live Stats */}
        <div className="flex gap-4 py-2">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-coral" />
            <span className="font-semibold">42</span>
            <span className="text-sm text-muted-foreground">{t.interested}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-ocean" />
            <span className="font-semibold">18</span>
            <span className="text-sm text-muted-foreground">{t.going}</span>
          </div>
        </div>

        {/* Age Distribution */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t.ageRange}</span>
            <span>18-24 • 25-34 • 35-44</span>
          </div>
          <div className="flex gap-1">
            <Progress value={30} className="h-1.5" />
            <Progress value={50} className="h-1.5" />
            <Progress value={20} className="h-1.5" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Heart className="h-4 w-4" />
            {t.interested}
          </Button>
          <Button size="sm" className="gap-2 bg-ocean hover:bg-ocean/90">
            <Users className="h-4 w-4" />
            {t.going}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default EventCard;
