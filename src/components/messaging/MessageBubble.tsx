import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';

interface MessageBubbleProps {
  body: string;
  createdAt: string;
  isOwn: boolean;
  showTimestamp?: boolean;
}

export function MessageBubble({ body, createdAt, isOwn, showTimestamp = true }: MessageBubbleProps) {
  const { language } = useLanguage();
  const dateLocale = language === 'el' ? el : enUS;

  return (
    <div className={cn(
      'flex flex-col max-w-[75%]',
      isOwn ? 'items-end ml-auto' : 'items-start mr-auto'
    )}>
      <div className={cn(
        'px-4 py-2 rounded-2xl',
        isOwn 
          ? 'bg-primary text-primary-foreground rounded-br-md' 
          : 'bg-muted text-foreground rounded-bl-md'
      )}>
        <p className="text-sm whitespace-pre-wrap break-words">{body}</p>
      </div>
      {showTimestamp && (
        <span className="text-[10px] text-muted-foreground mt-1 px-1">
          {format(new Date(createdAt), 'HH:mm', { locale: dateLocale })}
        </span>
      )}
    </div>
  );
}
