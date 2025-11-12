import { Heart, Users, Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  location: string;
  start_at: string;
  end_at: string;
  category: string[];
  price_tier: string;
  interested_count?: number;
  going_count?: number;
  user_status?: string | null;
}

interface EventCardProps {
  language: "el" | "en";
  event: Event;
  user: any;
}

const EventCard = ({ language, event, user }: EventCardProps) => {
  const [status, setStatus] = useState<string | null>(event.user_status || null);
  const [interestedCount, setInterestedCount] = useState(event.interested_count || 0);
  const [goingCount, setGoingCount] = useState(event.going_count || 0);
  const [loading, setLoading] = useState(false);

  const translations = {
    el: {
      interested: "Ενδιαφέρομαι",
      going: "Έννα Πάω",
      ageRange: "Ηλικιακό Εύρος",
      free: "Δωρεάν",
      interestedCount: "Ενδιαφέρονται",
      goingCount: "Έννα Πάσιν",
    },
    en: {
      interested: "Interested",
      going: "I'm Going",
      ageRange: "Age Range",
      free: "Free",
      interestedCount: "Interested",
      goingCount: "Going",
    },
  };

  const t = translations[language];

  useEffect(() => {
    if (!user || !event.id) return;

    // Subscribe to realtime updates for this event's RSVPs
    const channel = supabase
      .channel(`rsvps:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rsvps',
          filter: `event_id=eq.${event.id}`
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id, user]);

  const fetchCounts = async () => {
    const { data, error } = await supabase
      .from('rsvps')
      .select('status')
      .eq('event_id', event.id);

    if (!error && data) {
      const interested = data.filter(r => r.status === 'interested').length;
      const going = data.filter(r => r.status === 'going').length;
      setInterestedCount(interested);
      setGoingCount(going);
    }
  };

  const handleStatusClick = async (newStatus: 'interested' | 'going') => {
    if (!user) {
      toast({
        title: language === "el" ? "Απαιτείται σύνδεση" : "Login required",
        description: language === "el" 
          ? "Παρακαλώ συνδεθείτε για να συμμετάσχετε σε εκδηλώσεις" 
          : "Please log in to participate in events",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check if user already has an RSVP
      const { data: existingRsvp } = await supabase
        .from('rsvps')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .single();

      if (existingRsvp) {
        if (existingRsvp.status === newStatus) {
          // Remove RSVP if clicking the same status
          await supabase
            .from('rsvps')
            .delete()
            .eq('id', existingRsvp.id);
          setStatus(null);
        } else {
          // Update to new status
          await supabase
            .from('rsvps')
            .update({ status: newStatus })
            .eq('id', existingRsvp.id);
          setStatus(newStatus);
        }
      } else {
        // Create new RSVP
        await supabase
          .from('rsvps')
          .insert({
            event_id: event.id,
            user_id: user.id,
            status: newStatus,
          });
        setStatus(newStatus);
      }

      await fetchCounts();
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast({
        title: language === "el" ? "Σφάλμα" : "Error",
        description: language === "el" 
          ? "Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά." 
          : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(language === "el" ? "el-GR" : "en-US", {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="overflow-hidden hover:shadow-hover transition-all duration-300 group">
      {/* Image */}
      <div className="relative h-48 bg-gradient-ocean overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-white/20 text-6xl">
          🌊
        </div>
        <Badge className="absolute top-3 left-3 bg-card/90 text-card-foreground">
          {event.category[0] || "Event"}
        </Badge>
        <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground">
          {event.price_tier === 'free' ? t.free : event.price_tier}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title & Location */}
        <div>
          <h3 className="font-bold text-lg group-hover:text-ocean transition-colors">
            {event.title}
          </h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            <span>{event.location}</span>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{formatTime(event.start_at)} - {formatTime(event.end_at)}</span>
        </div>

        {/* Live Stats */}
        <div className="flex gap-4 py-2 text-sm">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-coral" />
            <span className="font-semibold">{interestedCount}</span>
            <span className="text-muted-foreground">{t.interestedCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-ocean" />
            <span className="font-semibold">{goingCount}</span>
            <span className="text-muted-foreground">{t.goingCount}</span>
          </div>
        </div>

        {/* Action Buttons */}
        {user && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusClick('interested')}
              disabled={loading}
              className={`gap-2 transition-all ${
                status === 'interested'
                  ? 'border-ocean text-ocean bg-ocean/5'
                  : 'border-border text-muted-foreground hover:border-ocean/50'
              }`}
            >
              <Heart className="h-4 w-4" />
              {t.interested}
            </Button>
            <Button
              size="sm"
              onClick={() => handleStatusClick('going')}
              disabled={loading}
              className={`gap-2 transition-all ${
                status === 'going'
                  ? 'bg-ocean hover:bg-ocean/90 text-white'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              <Users className="h-4 w-4" />
              {t.going}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default EventCard;
