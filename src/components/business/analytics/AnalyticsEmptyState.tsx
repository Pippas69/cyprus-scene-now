import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Users, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AnalyticsEmptyStateProps {
  language: 'el' | 'en';
  hasEvents: boolean;
  hasViews: boolean;
}

export const AnalyticsEmptyState = ({ language, hasEvents, hasViews }: AnalyticsEmptyStateProps) => {
  const navigate = useNavigate();

  const translations = {
    el: {
      noDataYet: 'Δεν υπάρχουν δεδομένα ακόμα',
      welcomeTitle: 'Καλώς ήρθατε στα Analytics!',
      welcomeDescription: 'Για να ξεκινήσετε τη συλλογή δεδομένων:',
      step1: 'Δημιουργήστε και δημοσιεύστε το πρώτο σας event',
      step2: 'Μοιραστείτε το με το κοινό σας',
      step3: 'Παρακολουθήστε τα analytics σας να αυξάνονται',
      createFirstEvent: 'Δημιουργήστε το πρώτο Event',
      eventsLiveTitle: 'Τα Events σας είναι live!',
      eventsLiveDescription: 'Τα analytics θα εμφανιστούν μόλις:',
      view1: 'Οι χρήστες δουν τα events σας στο feed',
      view2: 'Άτομα επισκεφτούν το προφίλ της επιχείρησής σας',
      view3: 'Τα events σας εμφανιστούν στα αποτελέσματα αναζήτησης',
      tip: 'Συμβουλή: Μοιραστείτε τους συνδέσμους των events σας στα social media!',
      shareEvent: 'Μοιραστείτε Event',
      greatStartTitle: 'Εξαιρετική αρχή!',
      greatStartDescription: 'Έχετε κάποια views. Συνεχίστε έτσι!',
      improveTip: 'Τα analytics βελτιώνονται με περισσότερα δεδομένα. Δείτε πώς:',
      improve1: 'Δημοσιεύστε events συστηματικά',
      improve2: 'Αλληλεπιδράστε με τους followers σας',
      improve3: 'Χρησιμοποιήστε σχετικές κατηγορίες και tags',
      viewTips: 'Δείτε Συμβουλές',
      preview: 'Προεπισκόπηση των δεδομένων που θα δείτε:',
      totalReach: 'Συνολική Εμβέλεια: Αριθμός μοναδικών ατόμων που είδαν τα events σας',
      impressions: 'Προβολές: Συνολικές προβολές σε όλα τα events',
      engagementRate: 'Ποσοστό Αλληλεπίδρασης: % των θεατών που αλληλεπίδρασαν',
      followerGrowth: 'Αύξηση Followers: Νέοι followers με την πάροδο του χρόνου',
      conversionRate: 'Ποσοστό Μετατροπής: Θεατές που έγιναν συμμετέχοντες',
    },
    en: {
      noDataYet: 'No Data Yet',
      welcomeTitle: 'Welcome to Analytics!',
      welcomeDescription: 'To start collecting data:',
      step1: 'Create and publish your first event',
      step2: 'Share it with your audience',
      step3: 'Watch your analytics grow',
      createFirstEvent: 'Create First Event',
      eventsLiveTitle: 'Your Events Are Live!',
      eventsLiveDescription: 'Analytics will start showing once:',
      view1: 'Users view your events in the feed',
      view2: 'People visit your business profile',
      view3: 'Your events appear in search results',
      tip: 'Tip: Share your event links on social media to boost visibility!',
      shareEvent: 'Share Event',
      greatStartTitle: 'Great Start!',
      greatStartDescription: 'You have some views so far. Keep going!',
      improveTip: 'Analytics improve with more data. Here\'s how:',
      improve1: 'Post events consistently',
      improve2: 'Engage with your followers',
      improve3: 'Use relevant categories and tags',
      viewTips: 'View Performance Tips',
      preview: 'Preview of what you\'ll see:',
      totalReach: 'Total Reach: Number of unique people who saw your events',
      impressions: 'Impressions: Total views across all events',
      engagementRate: 'Engagement Rate: % of viewers who interacted',
      followerGrowth: 'Follower Growth: New followers over time',
      conversionRate: 'Conversion Rate: Viewers who became attendees',
    },
  };

  const t = translations[language];

  const metrics = [
    { icon: Users, label: t.totalReach },
    { icon: Eye, label: t.impressions },
    { icon: TrendingUp, label: t.engagementRate },
    { icon: BarChart3, label: t.followerGrowth },
    { icon: TrendingUp, label: t.conversionRate },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-6">
                <BarChart3 className="h-12 w-12 text-primary" />
              </div>
            </div>

            {!hasEvents ? (
              <>
                <div>
                  <h3 className="text-2xl font-bold mb-2">{t.welcomeTitle}</h3>
                  <p className="text-muted-foreground mb-4">{t.welcomeDescription}</p>
                </div>

                <div className="space-y-3 text-left max-w-md mx-auto">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/20 p-1.5 mt-0.5">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <p className="text-sm">{t.step1}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/20 p-1.5 mt-0.5">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <p className="text-sm">{t.step2}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/20 p-1.5 mt-0.5">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <p className="text-sm">{t.step3}</p>
                  </div>
                </div>

                <Button onClick={() => navigate('/dashboard-business/events/new')}>
                  {t.createFirstEvent}
                </Button>
              </>
            ) : !hasViews ? (
              <>
                <div>
                  <h3 className="text-2xl font-bold mb-2">{t.eventsLiveTitle}</h3>
                  <p className="text-muted-foreground mb-4">{t.eventsLiveDescription}</p>
                </div>

                <div className="space-y-3 text-left max-w-md mx-auto">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/20 p-1.5 mt-0.5">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <p className="text-sm">{t.view1}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/20 p-1.5 mt-0.5">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <p className="text-sm">{t.view2}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/20 p-1.5 mt-0.5">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <p className="text-sm">{t.view3}</p>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">{t.tip}</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-2xl font-bold mb-2">{t.greatStartTitle}</h3>
                  <p className="text-muted-foreground mb-4">{t.greatStartDescription}</p>
                </div>

                <div className="space-y-3 text-left max-w-md mx-auto">
                  <p className="font-medium text-sm">{t.improveTip}</p>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/20 p-1.5 mt-0.5">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <p className="text-sm">{t.improve1}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/20 p-1.5 mt-0.5">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <p className="text-sm">{t.improve2}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/20 p-1.5 mt-0.5">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <p className="text-sm">{t.improve3}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-4">{t.preview}</h4>
          <div className="space-y-3">
            {metrics.map((metric, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <metric.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
