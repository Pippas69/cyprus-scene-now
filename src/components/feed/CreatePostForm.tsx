import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, User } from 'lucide-react';

interface CreatePostFormProps {
  onSubmit: (content: string) => Promise<boolean>;
  sending: boolean;
  userAvatar?: string | null;
  userName?: string | null;
  language: 'el' | 'en';
}

export function CreatePostForm({ 
  onSubmit, 
  sending, 
  userAvatar, 
  userName,
  language 
}: CreatePostFormProps) {
  const [content, setContent] = useState('');
  const maxLength = 500;

  const t = {
    el: {
      placeholder: 'Μοιράσου κάτι με τους υπόλοιπους...',
      post: 'Δημοσίευση',
      charactersLeft: 'χαρακτήρες',
    },
    en: {
      placeholder: 'Share something with others...',
      post: 'Post',
      charactersLeft: 'characters',
    },
  };

  const text = t[language];

  const handleSubmit = async () => {
    if (!content.trim() || sending) return;
    
    const success = await onSubmit(content);
    if (success) {
      setContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={userAvatar || ''} />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, maxLength))}
            onKeyDown={handleKeyDown}
            placeholder={text.placeholder}
            className="min-h-[80px] resize-none"
            disabled={sending}
          />
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {maxLength - content.length} {text.charactersLeft}
            </span>
            
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim() || sending}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {text.post}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
