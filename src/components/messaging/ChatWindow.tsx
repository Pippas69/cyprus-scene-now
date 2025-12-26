import { useEffect, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { useDirectMessages, useSendMessage, useMarkAsRead } from '@/hooks/useDirectMessages';
import { Conversation } from '@/hooks/useConversations';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';

interface ChatWindowProps {
  conversation: Conversation;
  currentUserId: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

const translations = {
  el: {
    today: 'Σήμερα',
    yesterday: 'Χθες',
    noMessages: 'Δεν υπάρχουν μηνύματα',
    startConversation: 'Ξεκινήστε τη συνομιλία',
  },
  en: {
    today: 'Today',
    yesterday: 'Yesterday',
    noMessages: 'No messages yet',
    startConversation: 'Start the conversation',
  },
};

export function ChatWindow({ 
  conversation, 
  currentUserId, 
  onBack,
  showBackButton = false 
}: ChatWindowProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const dateLocale = language === 'el' ? el : enUS;
  
  const { data: messages, isLoading } = useDirectMessages(conversation.id);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutate: markAsRead } = useMarkAsRead();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when conversation is opened
  useEffect(() => {
    if (conversation.unread_count > 0) {
      markAsRead(conversation.id);
    }
  }, [conversation.id, conversation.unread_count, markAsRead]);

  const handleSend = (body: string) => {
    sendMessage({ conversationId: conversation.id, body });
  };

  const formatDateHeader = (date: Date) => {
    if (isToday(date)) return t.today;
    if (isYesterday(date)) return t.yesterday;
    return format(date, 'PPP', { locale: dateLocale });
  };

  // Group messages by date
  const groupedMessages = messages?.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, typeof messages>);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background">
        {showBackButton && onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-10 w-10">
          <AvatarImage src={conversation.other_participant.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {(conversation.other_participant.name || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {conversation.other_participant.name || 'User'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
                <Skeleton className="h-10 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : !messages?.length ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p className="text-sm">{t.noMessages}</p>
            <p className="text-xs mt-1">{t.startConversation}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages && Object.entries(groupedMessages).map(([date, dayMessages]) => (
              <div key={date}>
                <div className="flex justify-center my-4">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {formatDateHeader(new Date(date))}
                  </span>
                </div>
                <div className="space-y-2">
                  {dayMessages?.map((message, index) => {
                    const prevMessage = dayMessages[index - 1];
                    const showTimestamp = !prevMessage || 
                      new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000; // 5 min

                    return (
                      <MessageBubble
                        key={message.id}
                        body={message.body}
                        createdAt={message.created_at}
                        isOwn={message.sender_id === currentUserId}
                        showTimestamp={showTimestamp}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <MessageInput onSend={handleSend} disabled={isSending} />
    </div>
  );
}
