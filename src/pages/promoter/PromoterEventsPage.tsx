/**
 * PR Dashboard — Section 2: Events & Links
 * Λίστα όλων των ενεργών events με στατιστικά + κουμπί Αντιγραφή Link.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';
import { usePromoterEvents } from '@/hooks/usePromoterLinks';
import { PromoterEventCard } from '@/components/promoter/PromoterEventCard';

const PromoterEventsPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUserId(user.id);
    })();
  }, [navigate]);

  const { data: events = [], isLoading } = usePromoterEvents(userId);

  return (
    <div className="w-full max-w-full px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Events & Links</h1>
        <p className="text-sm text-muted-foreground">
          Αντίγραψε το μοναδικό σου link για κάθε event και μοιράσου το όπου θέλεις.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
            Ενεργά Events
            <Badge variant="secondary" className="ml-2">{events.length}</Badge>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Κάθε πώληση μέσω του link σου καταγράφεται αυτόματα στα κέρδη σου.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Φόρτωση events…
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Δεν υπάρχουν ενεργά events αυτή τη στιγμή από τις επιχειρήσεις σου.
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <PromoterEventCard key={ev.id} event={ev} userId={userId} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PromoterEventsPage;
