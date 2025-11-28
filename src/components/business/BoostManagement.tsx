import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap, Ticket, Calendar, TrendingUp, Pause, Play } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { format } from "date-fns";
import { toast } from "sonner";

interface BoostManagementProps {
  businessId: string;
}

const BoostManagement = ({ businessId }: BoostManagementProps) => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [eventBoosts, setEventBoosts] = useState<any[]>([]);
  const [offerBoosts, setOfferBoosts] = useState<any[]>([]);

  useEffect(() => {
    fetchBoosts();
  }, [businessId]);

  const fetchBoosts = async () => {
    setLoading(true);
    try {
      // Fetch event boosts
      const { data: eventData, error: eventError } = await supabase
        .from("event_boosts")
        .select(`
          *,
          events (
            id,
            title,
            start_at
          )
        `)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (eventError) throw eventError;
      setEventBoosts(eventData || []);

      // Fetch offer boosts
      const { data: offerData, error: offerError } = await supabase
        .from("offer_boosts")
        .select(`
          *,
          discounts (
            id,
            title,
            start_at,
            end_at
          )
        `)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (offerError) throw offerError;
      setOfferBoosts(offerData || []);
    } catch (error: any) {
      toast.error(language === "el" ? "Σφάλμα" : "Error", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      scheduled: "secondary",
      active: "default",
      completed: "outline",
      paused: "destructive",
    };

    return (
      <Badge variant={variants[status] || "default"} className={status === "active" ? "bg-green-500 text-white" : ""}>
        {status === "scheduled" && (language === "el" ? "Προγραμματισμένο" : "Scheduled")}
        {status === "active" && (language === "el" ? "Ενεργό" : "Active")}
        {status === "completed" && (language === "el" ? "Ολοκληρώθηκε" : "Completed")}
        {status === "paused" && (language === "el" ? "Παύση" : "Paused")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {language === "el" ? "Διαχείριση Προωθήσεων" : "Boost Management"}
        </h1>
        <p className="text-muted-foreground">
          {language === "el"
            ? "Διαχειριστείτε τις ενεργές και προγραμματισμένες προωθήσεις σας"
            : "Manage your active and scheduled boosts"}
        </p>
      </div>

      <Tabs defaultValue="events">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="events">
            <Zap className="h-4 w-4 mr-2" />
            {language === "el" ? "Εκδηλώσεις" : "Events"} ({eventBoosts.length})
          </TabsTrigger>
          <TabsTrigger value="offers">
            <Ticket className="h-4 w-4 mr-2" />
            {language === "el" ? "Προσφορές" : "Offers"} ({offerBoosts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          {eventBoosts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {language === "el"
                  ? "Δεν υπάρχουν προωθήσεις εκδηλώσεων"
                  : "No event boosts"}
              </CardContent>
            </Card>
          ) : (
            eventBoosts.map((boost) => (
              <Card key={boost.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {boost.events?.title || "Event"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {language === "el" ? "Tier:" : "Tier:"}{" "}
                        <span className="font-semibold capitalize">{boost.boost_tier}</span>
                      </p>
                    </div>
                    {getStatusBadge(boost.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(new Date(boost.start_date), "PP")} -{" "}
                        {format(new Date(boost.end_date), "PP")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {language === "el" ? "Ποιότητα:" : "Quality:"} {boost.targeting_quality}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {language === "el" ? "Συνολικό Κόστος" : "Total Cost"}
                      </p>
                      <p className="text-lg font-bold">
                        €{(boost.total_cost_cents / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {boost.status === "active" && (
                        <Button size="sm" variant="outline">
                          <Pause className="h-4 w-4 mr-1" />
                          {language === "el" ? "Παύση" : "Pause"}
                        </Button>
                      )}
                      {boost.status === "paused" && (
                        <Button size="sm" variant="outline">
                          <Play className="h-4 w-4 mr-1" />
                          {language === "el" ? "Συνέχεια" : "Resume"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          {offerBoosts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {language === "el"
                  ? "Δεν υπάρχουν προωθήσεις προσφορών"
                  : "No offer boosts"}
              </CardContent>
            </Card>
          ) : (
            offerBoosts.map((boost) => (
              <Card key={boost.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {boost.discounts?.title || "Offer"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {boost.commission_percent === 0 ? (
                          <Badge variant="default" className="bg-green-500 text-white">
                            {language === "el" ? "Χωρίς Προμήθεια" : "Commission-Free"}
                          </Badge>
                        ) : (
                          <>
                            {language === "el" ? "Προμήθεια:" : "Commission:"}{" "}
                            <span className="font-semibold">{boost.commission_percent}%</span>
                          </>
                        )}
                      </p>
                    </div>
                    <Badge variant={boost.active ? "default" : "secondary"} className={boost.active ? "bg-green-500 text-white" : ""}>
                      {boost.active
                        ? language === "el"
                          ? "Ενεργό"
                          : "Active"
                        : language === "el"
                        ? "Ανενεργό"
                        : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {language === "el" ? "Ποιότητα Στόχευσης:" : "Targeting Quality:"}{" "}
                      {boost.targeting_quality}%
                    </span>
                  </div>

                  <div className="flex justify-end pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Toggle active status
                        toast.info(
                          language === "el"
                            ? "Λειτουργία σύντομα διαθέσιμη"
                            : "Feature coming soon"
                        );
                      }}
                    >
                      {boost.active
                        ? language === "el"
                          ? "Απενεργοποίηση"
                          : "Deactivate"
                        : language === "el"
                        ? "Ενεργοποίηση"
                        : "Activate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BoostManagement;
