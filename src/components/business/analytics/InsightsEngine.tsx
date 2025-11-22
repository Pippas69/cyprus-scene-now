import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { AdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface InsightsEngineProps {
  data: AdvancedAnalytics;
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: 'Αυτόματες Συστάσεις',
    description: 'Εξατομικευμένες συστάσεις με βάση τα δεδομένα σας',
    urgent: 'Επείγον',
    opportunity: 'Ευκαιρία',
    success: 'Επιτυχία',
    trend: 'Τάση',
    noInsights: 'Δεν υπάρχουν διαθέσιμες συστάσεις',
    takeAction: 'Λήψη Μέτρων',
  },
  en: {
    title: 'AI-Powered Insights',
    description: 'Personalized recommendations based on your data',
    urgent: 'Urgent',
    opportunity: 'Opportunity',
    success: 'Success',
    trend: 'Trend',
    noInsights: 'No insights available',
    takeAction: 'Take Action',
  },
};

interface Insight {
  type: 'urgent' | 'opportunity' | 'success' | 'trend';
  message: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

const generateInsights = (data: AdvancedAnalytics, language: 'el' | 'en'): Insight[] => {
  const insights: Insight[] = [];

  // Traffic source insights
  if (data.trafficSources && data.trafficSources.length > 0) {
    const sortedSources = [...data.trafficSources].sort((a, b) => b.views - a.views);
    const topSource = sortedSources[0];
    const totalViews = data.trafficSources.reduce((sum, s) => sum + s.views, 0);
    
    if (topSource && totalViews > 0 && topSource.views / totalViews > 0.25) {
      insights.push({
        type: 'opportunity',
        priority: 'high',
        message: language === 'el'
          ? `Η πηγή '${topSource.source}' οδηγεί το ${((topSource.views / totalViews) * 100).toFixed(0)}% των προβολών σας - εξετάστε να επενδύσετε περισσότερο εκεί`
          : `Your '${topSource.source}' source drives ${((topSource.views / totalViews) * 100).toFixed(0)}% of views - consider investing more there`,
      });
    }
  }

  // Device performance insights
  if (data.deviceAnalytics && data.deviceAnalytics.length > 1) {
    const mobile = data.deviceAnalytics.find(d => d.device_type === 'mobile');
    const desktop = data.deviceAnalytics.find(d => d.device_type === 'desktop');
    
    if (mobile && desktop && mobile.views > 0 && desktop.views > 0) {
      const mobileConv = (mobile.conversions / mobile.views) * 100;
      const desktopConv = (desktop.conversions / desktop.views) * 100;
      
      if (mobileConv < desktopConv * 0.7) {
        insights.push({
          type: 'urgent',
          priority: 'high',
          message: language === 'el'
            ? `Οι χρήστες κινητών μετατρέπονται ${((desktopConv - mobileConv) / desktopConv * 100).toFixed(0)}% λιγότερο - ελέγξτε την εμπειρία χρήστη σε κινητά`
            : `Mobile users convert ${((desktopConv - mobileConv) / desktopConv * 100).toFixed(0)}% less - check mobile UX`,
        });
      }
    }
  }

  // Engagement insights
  if (data.engagementAnalysis && data.engagementAnalysis.avgActionsPerUser > 0) {
    const avgActions = data.engagementAnalysis.avgActionsPerUser;
    
    if (avgActions > 2) {
      insights.push({
        type: 'success',
        priority: 'medium',
        message: language === 'el'
          ? `Εξαιρετική αφοσίωση! Οι χρήστες κάνουν κατά μέσο όρο ${avgActions.toFixed(1)} ενέργειες - συνεχίστε έτσι!`
          : `Excellent engagement! Users take ${avgActions.toFixed(1)} actions on average - keep it up!`,
      });
    } else if (avgActions < 1) {
      insights.push({
        type: 'opportunity',
        priority: 'medium',
        message: language === 'el'
          ? `Χαμηλή αφοσίωση (${avgActions.toFixed(1)} ενέργειες/χρήστη) - δοκιμάστε πιο ελκυστικό περιεχόμενο`
          : `Low engagement (${avgActions.toFixed(1)} actions/user) - try more compelling content`,
      });
    }
  }

  // Conversion funnel insights
  if (data.conversionFunnel) {
    const { views, engagements, committed } = data.conversionFunnel;
    
    if (views > 0) {
      const engagementRate = (engagements / views) * 100;
      const commitmentRate = (committed / views) * 100;
      
      if (engagementRate > 40) {
        insights.push({
          type: 'success',
          priority: 'medium',
          message: language === 'el'
            ? `Υψηλό ποσοστό αφοσίωσης ${engagementRate.toFixed(1)}% - οι χρήστες αλληλεπιδρούν με το περιεχόμενό σας!`
            : `High engagement rate of ${engagementRate.toFixed(1)}% - users are interacting with your content!`,
        });
      }
      
      if (engagementRate > 20 && commitmentRate < 5) {
        insights.push({
          type: 'opportunity',
          priority: 'high',
          message: language === 'el'
            ? `Οι χρήστες αλληλεπιδρούν αλλά δεν δεσμεύονται - βελτιώστε τη διαδικασία RSVP/κράτησης`
            : `Users engage but don't commit - improve your RSVP/reservation process`,
        });
      }
    }
  }

  // Follower growth insights
  if (data.followerGrowthDetailed) {
    const { netGrowth, churnRate } = data.followerGrowthDetailed;
    
    if (netGrowth > 10) {
      insights.push({
        type: 'success',
        priority: 'medium',
        message: language === 'el'
          ? `Ισχυρή ανάπτυξη με +${netGrowth} νέους ακόλουθους - διατηρήστε τη δυναμική!`
          : `Strong growth with +${netGrowth} new followers - keep the momentum!`,
      });
    } else if (netGrowth < 0) {
      insights.push({
        type: 'urgent',
        priority: 'high',
        message: language === 'el'
          ? `Αρνητική ανάπτυξη (${netGrowth} ακόλουθοι) - επικεντρωθείτε στην ποιότητα περιεχομένου`
          : `Negative growth (${netGrowth} followers) - focus on content quality`,
      });
    }
    
    if (churnRate > 20) {
      insights.push({
        type: 'urgent',
        priority: 'high',
        message: language === 'el'
          ? `Υψηλό ποσοστό εγκατάλειψης ${churnRate.toFixed(1)}% - ερευνήστε γιατί οι χρήστες διακόπτουν την παρακολούθηση`
          : `High churn rate of ${churnRate.toFixed(1)}% - investigate why users are unfollowing`,
      });
    }
  }

  // Time-based insights
  if (data.timeAnalytics && data.timeAnalytics.hourlyEngagement) {
    const hourlyData = Object.entries(data.timeAnalytics.hourlyEngagement);
    if (hourlyData.length > 0) {
      const peakHour = hourlyData.reduce((max, [hour, count]) => 
        count > (max[1] as number) ? [hour, count] : max
      );
      
      insights.push({
        type: 'trend',
        priority: 'medium',
        message: language === 'el'
          ? `Η μέγιστη αφοσίωση συμβαίνει στις ${peakHour[0]}:00 - προγραμματίστε εκδηλώσεις γύρω από αυτή την ώρα`
          : `Peak engagement happens at ${peakHour[0]}:00 - schedule events around this time`,
      });
    }
  }

  // RSVP insights
  if (data.rsvpAnalytics && data.rsvpAnalytics.statusBreakdown) {
    const interested = (data.rsvpAnalytics.statusBreakdown.interested as number) || 0;
    const going = (data.rsvpAnalytics.statusBreakdown.going as number) || 0;
    
    if (interested > going * 2 && interested > 5) {
      insights.push({
        type: 'opportunity',
        priority: 'medium',
        message: language === 'el'
          ? `${interested} χρήστες ενδιαφέρονται αλλά μόνο ${going} θα πάνε - στείλτε υπενθυμίσεις`
          : `${interested} users interested but only ${going} going - send reminders`,
      });
    }
  }

  return insights.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

const insightIcons = {
  urgent: AlertTriangle,
  opportunity: Lightbulb,
  success: CheckCircle,
  trend: TrendingUp,
};

const insightColors = {
  urgent: 'destructive',
  opportunity: 'default',
  success: 'secondary',
  trend: 'outline',
} as const;

export const InsightsEngine = ({ data, language }: InsightsEngineProps) => {
  const t = translations[language];
  const insights = generateInsights(data, language);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t.noInsights}</p>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, index) => {
              const Icon = insightIcons[insight.type];
              return (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${
                    insight.type === 'urgent' ? 'bg-destructive/10' :
                    insight.type === 'success' ? 'bg-primary/10' :
                    insight.type === 'opportunity' ? 'bg-chart-2/10' :
                    'bg-muted'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      insight.type === 'urgent' ? 'text-destructive' :
                      insight.type === 'success' ? 'text-primary' :
                      insight.type === 'opportunity' ? 'text-chart-2' :
                      'text-foreground'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={insightColors[insight.type]}>
                        {t[insight.type]}
                      </Badge>
                      {insight.priority === 'high' && (
                        <span className="text-xs text-muted-foreground font-semibold">
                          {language === 'el' ? 'Υψηλή Προτεραιότητα' : 'High Priority'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{insight.message}</p>
                    {insight.action && (
                      <Button variant="link" className="p-0 h-auto mt-2" size="sm">
                        {t.takeAction}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
