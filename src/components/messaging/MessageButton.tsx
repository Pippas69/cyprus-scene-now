import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useStartConversation } from '@/hooks/useConversations';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';

interface MessageButtonProps {
  userId: string;
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

const translations = {
  el: {
    message: 'Μήνυμα',
    error: 'Σφάλμα κατά την έναρξη συνομιλίας',
  },
  en: {
    message: 'Message',
    error: 'Error starting conversation',
  },
};

export function MessageButton({ 
  userId, 
  variant = 'ghost',
  size = 'sm',
  showLabel = false,
  className 
}: MessageButtonProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];
  const { mutate: startConversation, isPending } = useStartConversation();

  const handleClick = () => {
    startConversation(userId, {
      onSuccess: (conversationId) => {
        navigate(`/messages?conversation=${conversationId}`);
      },
      onError: () => {
        toast.error(t.error);
      },
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isPending}
      className={className}
    >
      <MessageCircle className="h-4 w-4" />
      {showLabel && <span className="ml-2">{t.message}</span>}
    </Button>
  );
}
