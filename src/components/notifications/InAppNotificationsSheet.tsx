import { Bell, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

type Language = "el" | "en";
type NotificationContext = "user" | "business";

interface InAppNotificationsSheetProps {
  userId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  context?: NotificationContext;
}

export const InAppNotificationsSheet = ({
  userId,
  open,
  onOpenChange,
  language,
  context = "user",
}: InAppNotificationsSheetProps) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId, context);

  const t =
    language === "el"
      ? {
          title: "Ειδοποιήσεις",
          empty: "Δεν υπάρχουν ειδοποιήσεις",
          markAll: "Σήμανση όλων ως αναγνωσμένα",
          close: "Κλείσιμο",
        }
      : {
          title: "Notifications",
          empty: "No notifications yet",
          markAll: "Mark all as read",
          close: "Close",
        };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          // Full panel on mobile, column on larger screens
          "w-full sm:max-w-md",
          // Keep content visible and prevent clipping
          "p-0",
        )}
      >
        <header className="sticky top-0 z-10 border-b bg-background">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-base font-semibold">{t.title}</h2>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsRead()}
                  className="text-xs"
                >
                  {t.markAll}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label={t.close}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </header>

        <ScrollArea className="h-[calc(100vh-56px)]">
          {notifications.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <Bell className="mx-auto mb-3 h-12 w-12 opacity-20" aria-hidden="true" />
              <p>{t.empty}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markAsRead(n.id);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-4 transition-colors hover:bg-accent",
                    !n.read && "bg-accent/50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {!n.read && <div className="mt-2 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />}
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-sm font-medium">{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <span
                        className={cn(
                          "text-[11px] font-medium",
                          n.read ? "text-muted-foreground" : "text-foreground",
                        )}
                      >
                        {n.read ? (language === "el" ? "Αναγνωσμένο" : "Read") : language === "el" ? "Νέο" : "Unread"}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
