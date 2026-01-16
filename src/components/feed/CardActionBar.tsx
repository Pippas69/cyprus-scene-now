import { useState, useEffect } from "react";
import { Heart, Users, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShareDialog } from "@/components/sharing/ShareDialog";

interface CardActionBarProps {
  entityId: string;
  entityType: "event";
  interestedCount: number;
  goingCount: number;
  language: "el" | "en";
  // For share dialog
  shareData?: {
    title: string;
    description?: string;
    location: string;
    start_at: string;
    cover_image_url?: string;
    businesses?: {
      id: string;
      name: string;
    };
  };
  className?: string;
}

export const CardActionBar = ({
  entityId,
  entityType,
  interestedCount: initialInterestedCount,
  goingCount: initialGoingCount,
  language,
  shareData,
  className,
}: CardActionBarProps) => {
  const { toast } = useToast();
  const [isInterested, setIsInterested] = useState(false);
  const [isGoing, setIsGoing] = useState(false);
  const [interestedCount, setInterestedCount] = useState(initialInterestedCount);
  const [goingCount, setGoingCount] = useState(initialGoingCount);
  const [loading, setLoading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const refreshCounts = async () => {
    const { data, error } = await supabase.rpc("get_event_rsvp_counts", {
      p_event_id: entityId,
    });

    if (error) {
      console.error("Error fetching RSVP counts:", error);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setInterestedCount(Number(row?.interested_count ?? 0));
    setGoingCount(Number(row?.going_count ?? 0));
  };

  // Fetch current user's RSVP status and actual counts on mount
  useEffect(() => {
    const fetchRSVPData = async () => {
      try {
        // Global counts (must include ALL users, regardless of profile visibility)
        await refreshCounts();

        // Check if current user has RSVPs
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: userRsvps } = await supabase
            .from("rsvps")
            .select("status")
            .eq("event_id", entityId)
            .eq("user_id", user.id);

          setIsInterested(!!userRsvps?.some((r) => r.status === "interested"));
          setIsGoing(!!userRsvps?.some((r) => r.status === "going"));
        } else {
          setIsInterested(false);
          setIsGoing(false);
        }
      } catch (error) {
        console.error("Error fetching RSVP data:", error);
      }
    };

    fetchRSVPData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const handleAction = async (
    e: React.MouseEvent,
    actionType: "interested" | "going"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if user is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: language === "el" ? "Συνδεθείτε" : "Please login",
        description:
          language === "el"
            ? "Πρέπει να συνδεθείτε για αυτή την ενέργεια"
            : "You need to login for this action",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const isCurrentlyActive = actionType === "interested" ? isInterested : isGoing;

      if (isCurrentlyActive) {
        // Remove this specific RSVP
        const { error } = await supabase
          .from("rsvps")
          .delete()
          .eq("event_id", entityId)
          .eq("user_id", user.id)
          .eq("status", actionType);

        if (error) throw error;
      } else {
        // Add new RSVP (allows both interested AND going)
        const { error } = await supabase.from("rsvps").insert({
          event_id: entityId,
          user_id: user.id,
          status: actionType,
        });

        if (error) throw error;

        toast({
          title: language === "el" ? "Επιτυχία!" : "Success!",
          description:
            actionType === "interested"
              ? language === "el"
                ? "Ενδιαφέρεστε!"
                : "You're interested!"
              : language === "el"
                ? "Θα πάτε!"
                : "You're going!",
        });
      }

      // Re-sync user state + global counts after any mutation
      const { data: userRsvps } = await supabase
        .from("rsvps")
        .select("status")
        .eq("event_id", entityId)
        .eq("user_id", user.id);

      setIsInterested(!!userRsvps?.some((r) => r.status === "interested"));
      setIsGoing(!!userRsvps?.some((r) => r.status === "going"));

      await refreshCounts();
    } catch (error) {
      console.error("RSVP error:", error);
      toast({
        title: language === "el" ? "Σφάλμα" : "Error",
        description: language === "el" ? "Κάτι πήγε στραβά" : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareDialog(true);
  };

  return (
    <>
      <div className={cn("flex items-center gap-4", className)}>
        {/* Interested Button */}
        <button
          onClick={(e) => handleAction(e, "interested")}
          disabled={loading}
          className={cn(
            "flex items-center gap-1 text-[11px] transition-colors",
            isInterested
              ? "text-secondary"
              : "text-muted-foreground hover:text-secondary"
          )}
        >
          <Heart
            className={cn(
              "h-3.5 w-3.5",
              isInterested && "fill-secondary text-secondary"
            )}
          />
          <span>{interestedCount}</span>
        </button>

        {/* Going Button */}
        <button
          onClick={(e) => handleAction(e, "going")}
          disabled={loading}
          className={cn(
            "flex items-center gap-1 text-[11px] transition-colors",
            isGoing
              ? "text-ocean"
              : "text-muted-foreground hover:text-ocean"
          )}
        >
          <Users
            className={cn(
              "h-3.5 w-3.5",
              isGoing && "text-ocean"
            )}
          />
          <span>{goingCount}</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Share Dialog */}
      {shareData && (
        <ShareDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          event={{
            id: entityId,
            title: shareData.title,
            description: shareData.description,
            location: shareData.location,
            start_at: shareData.start_at,
            cover_image_url: shareData.cover_image_url,
            businesses: shareData.businesses,
          }}
          language={language}
        />
      )}
    </>
  );
};

export default CardActionBar;
