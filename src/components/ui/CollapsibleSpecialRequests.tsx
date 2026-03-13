import { useState } from 'react';
import { MessageSquare, ChevronDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface CollapsibleSpecialRequestsProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  optionalLabel: string;
  placeholder?: string;
}

export function CollapsibleSpecialRequests({
  value,
  onChange,
  label,
  optionalLabel,
  placeholder,
}: CollapsibleSpecialRequestsProps) {
  const [open, setOpen] = useState(!!value);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        <MessageSquare className="h-3 w-3" />
        <span>{label}</span>
        <span className="text-muted-foreground/60">({optionalLabel})</span>
        <ChevronDown className="h-3 w-3 ml-0.5" />
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => { if (!value) setOpen(false); }}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquare className="h-3 w-3" />
        <span>{label}</span>
        <span className="text-muted-foreground/60">({optionalLabel})</span>
      </button>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="text-sm min-h-[56px] resize-none"
        placeholder={placeholder}
        autoFocus
      />
    </div>
  );
}
