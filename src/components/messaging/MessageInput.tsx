import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const translations = {
  el: {
    placeholder: 'Γράψτε ένα μήνυμα...',
    send: 'Αποστολή',
  },
  en: {
    placeholder: 'Type a message...',
    send: 'Send',
  },
};

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const { language } = useLanguage();
  const t = translations[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 p-4 border-t bg-background">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t.placeholder}
        disabled={disabled}
        className="min-h-[44px] max-h-[120px] resize-none"
        rows={1}
      />
      <Button 
        type="submit" 
        size="icon" 
        disabled={!message.trim() || disabled}
        className="shrink-0"
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">{t.send}</span>
      </Button>
    </form>
  );
}
