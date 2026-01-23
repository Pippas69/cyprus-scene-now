import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const { language } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const translations = {
    el: {
      myAccount: 'Ο λογαριασμός μου',
      notifications: 'Ειδοποιήσεις',
      signOut: 'Αποσύνδεση',
      noNotifications: 'Δεν υπάρχουν ειδοποιήσεις',
      markAllRead: 'Σήμανση όλων ως αναγνωσμένα',
    },
    en: {
      myAccount: 'My Account',
      notifications: 'Notifications',
      signOut: 'Sign Out',
      noNotifications: 'No notifications yet',
      markAllRead: 'Mark all as read',
    },
  };

  const t = translations[language];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleMyAccount = () => {
    navigate('/feed');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'button' ? (
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-none">
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

        {/* 2. Notifications - Opens Popover with in-app notifications */}
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <DropdownMenuItem
              className="text-sm cursor-pointer relative"
              onSelect={(e) => {
                e.preventDefault();
                setNotificationsOpen(true);
              }}
            >
              <Bell className="mr-2 h-4 w-4" />
              {t.notifications}
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-auto h-5 min-w-5 flex items-center justify-center p-0 px-1.5 text-xs"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </DropdownMenuItem>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end" side="left" sideOffset={8}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{t.notifications}</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    markAllAsRead();
                  }}
                  className="text-xs"
                >
                  {t.markAllRead}
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" aria-hidden="true" />
                  <p>{t.noNotifications}</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => {
                        if (!notification.read) markAsRead(notification.id);
                      }}
                      className={cn(
                        'w-full text-left p-4 hover:bg-accent transition-colors',
                        !notification.read && 'bg-accent/50'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm mb-1">{notification.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* 3. Sign Out */}
        <DropdownMenuItem onClick={handleSignOut} className="text-sm cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          {t.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
