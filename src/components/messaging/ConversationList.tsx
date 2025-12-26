import { formatDistanceToNow } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/hooks/useLanguage';
import { Conversation } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  currentUserId: string;
}

const translations = {
  el: {
    noConversations: 'Δεν υπάρχουν συνομιλίες',
    startNew: 'Ξεκινήστε μια νέα συνομιλία',
    you: 'Εσείς',
  },
  en: {
    noConversations: 'No conversations yet',
    startNew: 'Start a new conversation',
    you: 'You',
  },
};

export function ConversationList({ 
  conversations, 
  selectedId, 
  onSelect,
  currentUserId 
}: ConversationListProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const dateLocale = language === 'el' ? el : enUS;

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
        <p className="text-sm">{t.noConversations}</p>
        <p className="text-xs mt-1">{t.startNew}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversations.map((conversation) => {
          const isSelected = selectedId === conversation.id;
          const hasUnread = conversation.unread_count > 0;
          const lastMessagePreview = conversation.last_message?.body 
            ? conversation.last_message.body.length > 40 
              ? conversation.last_message.body.substring(0, 40) + '...'
              : conversation.last_message.body
            : '';
          const isOwnMessage = conversation.last_message?.sender_id === currentUserId;

          return (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                isSelected 
                  ? 'bg-primary/10 border border-primary/20' 
                  : 'hover:bg-muted/50',
                hasUnread && !isSelected && 'bg-accent/5'
              )}
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={conversation.other_participant.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(conversation.other_participant.name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                    {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                  </span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'font-medium truncate',
                    hasUnread && 'text-foreground'
                  )}>
                    {conversation.other_participant.name || 'User'}
                  </span>
                  {conversation.last_message && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                        addSuffix: false,
                        locale: dateLocale,
                      })}
                    </span>
                  )}
                </div>
                {lastMessagePreview && (
                  <p className={cn(
                    'text-sm truncate',
                    hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}>
                    {isOwnMessage && <span className="text-muted-foreground">{t.you}: </span>}
                    {lastMessagePreview}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
