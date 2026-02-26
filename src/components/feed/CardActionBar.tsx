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
  /** When true, uses white/light colors for overlay on images */
  onImage?: boolean;
}

export const CardActionBar = ({
  entityId,
  entityType,
  interestedCount: initialInterestedCount,
  goingCount: initialGoingCount,
  language,
  shareData,
  className,
  onImage = false,
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
        // Global counts (must include ALL users)
        await refreshCounts();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsInterested(false);
          setIsGoing(false);
          return;
        }

        // Fetch all RSVPs for this user/event (may have 0, 1, or 2 rows)
        const { data: rows, error } = await supabase
          .from("rsvps")
          .select("status")
          .eq("event_id", entityId)
          .eq("user_id", user.id);

        if (error) {
          console.error("Error fetching RSVP status:", error);
          return;
        }

        setIsInterested(!!rows?.some((r) => r.status === "interested"));
        setIsGoing(!!rows?.some((r) => r.status === "going"));
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
        // Toggle OFF this specific status only
        const { error } = await supabase
          .from("rsvps")
          .delete()
          .eq("event_id", entityId)
          .eq("user_id", user.id)
          .eq("status", actionType);

        if (error) throw error;

        if (actionType === "interested") {
          setIsInterested(false);
        } else {
          setIsGoing(false);
        }
      } else {
        // Insert new row for this status (allows both interested AND going)
        const { error } = await supabase.from("rsvps").insert({
          event_id: entityId,
          user_id: user.id,
          status: actionType,
        });

        if (error) throw error;

        if (actionType === "interested") {
          setIsInterested(true);
        } else {
          setIsGoing(true);
        }

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
              "flex items-center gap-1 text-[11px] font-bold transition-colors",
              isInterested
                ? "text-secondary"
                : onImage
                  ? "text-white hover:text-secondary"
                  : "text-muted-foreground hover:text-secondary"
            )}
          >
            <Heart
              className={cn(
                "h-3.5 w-3.5",
                isInterested && "fill-secondary text-secondary"
              )}
            />
            <span className="font-bold">{interestedCount}</span>
        </button>

        {/* Going Button */}
        <button
          onClick={(e) => handleAction(e, "going")}
          disabled={loading}
            className={cn(
              "flex items-center gap-1 text-[11px] font-bold transition-colors",
              isGoing
                ? "text-ocean"
                : onImage
                  ? "text-white hover:text-ocean"
                  : "text-muted-foreground hover:text-ocean"
            )}
          >
            <Users
              className={cn(
                "h-3.5 w-3.5",
                isGoing && "text-ocean"
              )}
            />
            <span className="font-bold">{goingCount}</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className={cn(
            "flex items-center transition-colors",
            onImage
              ? "text-white hover:text-white/70"
              : "text-muted-foreground hover:text-foreground"
          )}
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
