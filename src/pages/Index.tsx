import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Sparkles, TrendingUp } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          {/* Logo */}
          <div className="animate-float">
            <h1 className="text-6xl md:text-8xl font-bold gradient-ocean bg-clip-text text-transparent mb-4">
              ΦΟΜΟ
            </h1>
            <div className="text-xl md:text-2xl text-muted-foreground font-medium">
              Fear Of Missing Out
            </div>
          </div>

          {/* Tagline */}
          <p className="text-2xl md:text-3xl font-bold text-foreground mt-8">
            Discover what's happening<br />
            <span className="gradient-sunset bg-clip-text text-transparent">
              right now in Cyprus
            </span>
          </p>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Live social discovery platform — see where people are going, join trending events,
            and get exclusive QR discounts from partner businesses across Cyprus.
          </p>

          {/* CTA Button */}
          <div className="pt-6">
            <Button
              size="lg"
              onClick={() => navigate("/feed")}
              className="bg-ocean hover:bg-ocean/90 text-lg px-8 py-6 shadow-glow gap-3"
            >
              Explore Events
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
          {/* Feature 1 */}
          <div className="bg-card rounded-xl p-6 shadow-card hover:shadow-hover transition-all">
            <div className="w-12 h-12 rounded-full bg-ocean/10 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-ocean" />
            </div>
            <h3 className="font-bold text-xl mb-2">Live Discovery</h3>
            <p className="text-muted-foreground">
              See real-time crowd counts and age mix for events happening right now
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-card rounded-xl p-6 shadow-card hover:shadow-hover transition-all">
            <div className="w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-coral" />
            </div>
            <h3 className="font-bold text-xl mb-2">Explore Cyprus</h3>
            <p className="text-muted-foreground">
              From Nicosia cafés to Ayia Napa nightlife — discover every corner of the island
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-card rounded-xl p-6 shadow-card hover:shadow-hover transition-all">
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-gold" />
            </div>
            <h3 className="font-bold text-xl mb-2">QR Discounts</h3>
            <p className="text-muted-foreground">
              Exclusive offers from partner businesses — redeem instantly with QR codes
            </p>
          </div>
        </div>

        {/* Cities */}
        <div className="mt-20 text-center">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Featured Cities
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["Nicosia", "Limassol", "Larnaca", "Paphos", "Ayia Napa", "Protaras"].map((city) => (
              <div
                key={city}
                className="px-4 py-2 bg-card rounded-full text-sm font-medium shadow-sm"
              >
                {city}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
