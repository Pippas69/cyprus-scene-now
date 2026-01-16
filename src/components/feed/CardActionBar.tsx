import { useState } from "react";
import { Heart, Users, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShareDialog } from "@/components/sharing/ShareDialog";

interface CardActionBarProps {
  entityId: string;
  entityType: "event" | "offer";
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
  const [status, setStatus] = useState<"interested" | "going" | null>(null);
  const [interestedCount, setInterestedCount] = useState(initialInterestedCount);
  const [goingCount, setGoingCount] = useState(initialGoingCount);
  const [loading, setLoading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleAction = async (
    e: React.MouseEvent,
    actionType: "interested" | "going"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: language === "el" ? "Συνδεθείτε" : "Please login",
        description: language === "el" 
          ? "Πρέπει να συνδεθείτε για αυτή την ενέργεια" 
          : "You need to login for this action",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (status === actionType) {
        // Remove RSVP
        const { error } = await supabase
          .from("rsvps")
          .delete()
          .eq("event_id", entityId)
          .eq("user_id", user.id);

        if (error) throw error;

        setStatus(null);
        if (actionType === "interested") {
          setInterestedCount((prev) => Math.max(0, prev - 1));
        } else {
          setGoingCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        // Add or update RSVP
        const { error } = await supabase.from("rsvps").upsert({
          event_id: entityId,
          user_id: user.id,
          status: actionType,
        });

        if (error) throw error;

        // Update counts
        if (status === "interested") {
          setInterestedCount((prev) => Math.max(0, prev - 1));
        } else if (status === "going") {
          setGoingCount((prev) => Math.max(0, prev - 1));
        }

        if (actionType === "interested") {
          setInterestedCount((prev) => prev + 1);
        } else {
          setGoingCount((prev) => prev + 1);
        }

        setStatus(actionType);

        toast({
          title: language === "el" ? "Επιτυχία!" : "Success!",
          description:
            actionType === "interested"
              ? language === "el"
                ? "Προστέθηκε στα ενδιαφέροντά σας"
                : "Added to your interests"
              : language === "el"
              ? "Θα πάτε!"
              : "You're going!",
        });
      }
    } catch (error) {
      console.error("RSVP error:", error);
      toast({
        title: language === "el" ? "Σφάλμα" : "Error",
        description: language === "el" 
          ? "Κάτι πήγε στραβά" 
          : "Something went wrong",
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
            status === "interested"
              ? "text-secondary"
              : "text-muted-foreground hover:text-secondary"
          )}
        >
          <Heart
            className={cn(
              "h-3.5 w-3.5",
              status === "interested" && "fill-secondary"
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
            status === "going"
              ? "text-ocean"
              : "text-muted-foreground hover:text-ocean"
          )}
        >
          <Users
            className={cn(
              "h-3.5 w-3.5",
              status === "going" && "fill-ocean/20"
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
