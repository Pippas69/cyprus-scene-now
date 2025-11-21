import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEventView, trackEngagement } from '@/lib/analyticsTracking';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Share2,
  Building2,
  ArrowLeft,
  Heart,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import EventCard from '@/components/EventCard';
import { EventAttendees } from '@/components/EventAttendees';

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [event, setEvent] = useState<any>(null);
  const [similarEvents, setSimilarEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
    if (eventId) {
      fetchEventDetails();
      trackEventView(eventId, 'direct');
    }
  }, [eventId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchEventDetails = async () => {
    if (!eventId) return;

    setLoading(true);

    // Fetch event with business details
    const { data: eventData, error } = await supabase
      .from('events')
      .select(`
        *,
        businesses!inner(
          id,
          name,
          logo_url,
          verified,
          city,
          category
        )
      `)
      .eq('id', eventId)
      .single();

    if (error || !eventData) {
      toast.error('Event not found');
      navigate('/feed');
      return;
    }

    setEvent(eventData);

    // Fetch similar events (same category or location)
    const { data: similar } = await supabase
      .from('events')
      .select(`
        *,
        businesses!inner(name, logo_url, verified)
      `)
      .neq('id', eventId)
      .gte('end_at', new Date().toISOString())
      .or(
        `location.ilike.%${eventData.location}%,category.cs.{${eventData.category[0] || ''}}`
      )
      .limit(3);

    setSimilarEvents(similar || []);
    setLoading(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    // Track share engagement
    if (event?.businesses?.id) {
      trackEngagement(event.businesses.id, 'share', 'event', eventId || '');
    }
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description || '',
          url,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const t = {
    el: {
      backToEvents: 'Επιστροφή στα Events',
      share: 'Κοινοποίηση',
      hostedBy: 'Διοργάνωση από',
      similarEvents: 'Παρόμοια Events',
      interested: 'Ενδιαφέρομαι',
      going: 'Θα πάω',
    },
    en: {
      backToEvents: 'Back to Events',
      share: 'Share',
      hostedBy: 'Hosted by',
      similarEvents: 'Similar Events',
      interested: 'Interested',
      going: 'Going',
    },
  };

  const text = t[language];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar language={language} onLanguageToggle={() => {}} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {text.backToEvents}
        </Button>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Hero Image */}
            {event.cover_image_url && (
              <div className="aspect-video rounded-lg overflow-hidden">
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Title and Categories */}
            <div>
              <h1 className="text-4xl font-bold mb-4">{event.title}</h1>
              <div className="flex flex-wrap gap-2">
                {event.category?.map((cat: string) => (
                  <Badge key={cat} variant="secondary">
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {event.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Similar Events */}
            {similarEvents.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">{text.similarEvents}</h2>
                <div className="grid gap-4">
                  {similarEvents.map((similar) => (
                    <EventCard
                      key={similar.id}
                      event={similar}
                      language={language}
                      user={user}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Share Button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              {text.share}
            </Button>

            {/* Event Details Card */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(event.start_at), 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.start_at), 'HH:mm')} -{' '}
                      {format(new Date(event.end_at), 'HH:mm')}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <p className="font-medium">{event.location}</p>
                </div>
              </CardContent>
            </Card>

            {/* Business Card */}
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-3">{text.hostedBy}</p>
                <Link
                  to={`/business/${event.businesses.id}`}
                  className="flex items-center gap-3 hover:bg-accent p-2 rounded-lg transition-colors"
                >
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={event.businesses.logo_url || ''} />
                    <AvatarFallback>
                      <Building2 className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{event.businesses.name}</p>
                      {event.businesses.verified && (
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {event.businesses.city}
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* Event Attendees */}
            <EventAttendees eventId={eventId!} />
          </div>
        </div>
      </div>

      <Footer language={language} onLanguageToggle={() => {}} />
    </div>
  );
}
