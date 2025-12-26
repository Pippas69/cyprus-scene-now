import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useConversations, Conversation } from '@/hooks/useConversations';
import { ConversationList, ChatWindow } from '@/components/messaging';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import Navbar from '@/components/Navbar';

const translations = {
  el: {
    title: 'Μηνύματα',
    selectConversation: 'Επιλέξτε μια συνομιλία',
    noConversations: 'Δεν έχετε ακόμα συνομιλίες',
    startMessaging: 'Ξεκινήστε να στέλνετε μηνύματα σε άλλους χρήστες',
    loading: 'Φόρτωση...',
  },
  en: {
    title: 'Messages',
    selectConversation: 'Select a conversation',
    noConversations: 'No conversations yet',
    startMessaging: 'Start messaging other users',
    loading: 'Loading...',
  },
};

export default function Messages() {
  const { language } = useLanguage();
  const t = translations[language];
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  
  const { data: conversations, isLoading } = useConversations();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Handle conversation from URL param
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId && conversations) {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }, [searchParams, conversations]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSearchParams({ conversation: conversation.id });
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setSearchParams({});
  };

  if (!currentUserId) {
    return (
      <>
        <Navbar />
        <div className="pt-20 px-4">
          <Skeleton className="h-96 w-full" />
        </div>
      </>
    );
  }

  // Mobile: Show either list or chat
  if (isMobile) {
    return (
      <>
        <Navbar />
        <div className="pt-16 h-screen flex flex-col">
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              currentUserId={currentUserId}
              onBack={handleBack}
              showBackButton
            />
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b">
                <h1 className="text-xl font-bold">{t.title}</h1>
              </div>
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <ConversationList
                  conversations={conversations || []}
                  selectedId={null}
                  onSelect={handleSelectConversation}
                  currentUserId={currentUserId}
                />
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  // Desktop: Show list and chat side by side
  return (
    <>
      <Navbar />
      <div className="pt-20 px-4 md:px-8 lg:px-16 pb-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{t.title}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
            {/* Conversation List */}
            <div className="md:col-span-1 border rounded-lg overflow-hidden bg-card">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <ConversationList
                  conversations={conversations || []}
                  selectedId={selectedConversation?.id || null}
                  onSelect={handleSelectConversation}
                  currentUserId={currentUserId}
                />
              )}
            </div>

            {/* Chat Window */}
            <div className="md:col-span-2 border rounded-lg overflow-hidden bg-card">
              {selectedConversation ? (
                <ChatWindow
                  conversation={selectedConversation}
                  currentUserId={currentUserId}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">{t.selectConversation}</p>
                  {(!conversations || conversations.length === 0) && (
                    <p className="text-sm mt-2">{t.startMessaging}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
