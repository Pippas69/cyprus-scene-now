import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { InAppNotificationsSheet } from '@/components/notifications/InAppNotificationsSheet';

interface UserAccountDropdownProps {
  userId?: string;
  userName?: string;
  avatarUrl?: string | null;
  variant?: 'avatar' | 'button';
}

export const UserAccountDropdown = ({
  userId,
  userName = 'User',
  avatarUrl,
  variant = 'avatar',
}: UserAccountDropdownProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  
  // Detect if we're on a business dashboard route
  const isBusinessDashboard = location.pathname.startsWith('/dashboard-business');
  const notificationContext = isBusinessDashboard ? 'business' : 'user';
  
  const { unreadCount } = useNotifications(userId, notificationContext);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const translations = {
    el: {
      myAccount: 'Ο λογαριασμός μου',
      notifications: 'Ειδοποιήσεις',
      signOut: 'Αποσύνδεση',
      // (Dropdown no longer contains notifications; keep label for the bell icon)
    },
    en: {
      myAccount: 'My Account',
      notifications: 'Notifications',
      signOut: 'Sign Out',
    },
  };

  const t = translations[language];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleMyAccount = () => {
    setDropdownOpen(false);
    navigate('/feed');
  };

  // Badge component for the bell icon only
  const NotificationBadge = ({ className = '' }: { className?: string }) => {
    if (unreadCount <= 0) return null;
    return (
      <Badge
        variant="destructive"
        className={cn(
          "absolute h-5 min-w-5 flex items-center justify-center p-0 px-1.5 text-xs font-bold",
          className
        )}
      >
        {unreadCount > 9 ? '9+' : unreadCount}
      </Badge>
    );
  };

  return (
    <div className="flex items-center gap-1">
      {/* Full notifications panel (click-only) */}
      <InAppNotificationsSheet
        userId={userId}
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        language={language}
        context={notificationContext}
      />

      {/* Bell button (always visible) */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 sm:h-10 sm:w-10"
        onClick={() => setNotificationsOpen((v) => !v)}
        aria-label={t.notifications}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        <NotificationBadge className="-top-1 -right-1" />
      </Button>

      {/* Account dropdown */}
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          {variant === 'button' ? (
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-none relative">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {userName?.substring(0, 2)?.toUpperCase() || 'U'}
                </AvatarFallback>
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || 'User'} />}
              </Avatar>
              <span className="hidden lg:inline font-medium">{userName}</span>
            </Button>
          ) : (
            <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full p-0">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {userName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
              </Avatar>
            </Button>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48 sm:w-56 bg-background border-border z-50">
          {/* 1. My Account - Opens Feed */}
          <DropdownMenuItem onClick={handleMyAccount} className="text-sm cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            {t.myAccount}
          </DropdownMenuItem>

          {/* Sign Out */}
          <DropdownMenuItem
            onClick={() => {
              setDropdownOpen(false);
              handleSignOut();
            }}
            className="text-sm cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t.signOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
