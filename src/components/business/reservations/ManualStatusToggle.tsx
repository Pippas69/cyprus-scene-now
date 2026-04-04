import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ManualStatusToggleProps {
  id: string;
  currentStatus: string | null;
  table: 'reservations' | 'tickets';
  language: 'el' | 'en';
  onStatusChange: (newStatus: string | null) => void;
}

export const ManualStatusToggle = ({
  id,
  currentStatus,
  table,
  language,
  onStatusChange,
}: ManualStatusToggleProps) => {
  const [open, setOpen] = useState(false);

  const t = {
    el: { unknown: '—', arrived: 'Ήρθε', noShow: 'Δεν ήρθε' },
    en: { unknown: '—', arrived: 'Arrived', noShow: 'No-show' },
  };

  const txt = t[language];

  const options: { value: string | null; label: string }[] = [
    { value: null, label: txt.unknown },
    { value: 'arrived', label: txt.arrived },
    { value: 'no_show', label: txt.noShow },
  ];

  const handleSelect = async (value: string | null) => {
    setOpen(false);
    try {
      if (table === 'reservations') {
        // Update manual_status and also update checked_in_at / status for analytics
        const updateData: Record<string, any> = { manual_status: value };
        
        if (value === 'arrived') {
          updateData.checked_in_at = new Date().toISOString();
          updateData.status = 'accepted';
        } else if (value === 'no_show') {
          updateData.checked_in_at = null;
          updateData.status = 'no_show';
        } else {
          // Reset to unknown
          updateData.checked_in_at = null;
          updateData.status = 'accepted';
        }

        const { error } = await supabase
          .from(table)
          .update(updateData as any)
          .eq('id', id);
        if (error) throw error;
      } else {
        // Tickets table
        const updateData: Record<string, any> = { manual_status: value };
        
        if (value === 'arrived') {
          updateData.checked_in_at = new Date().toISOString();
          updateData.status = 'used';
        } else if (value === 'no_show') {
          updateData.checked_in_at = null;
          updateData.status = 'valid';
        } else {
          updateData.checked_in_at = null;
          updateData.status = 'valid';
        }

        const { error } = await supabase
          .from(table)
          .update(updateData as any)
          .eq('id', id);
        if (error) throw error;
      }
      
      onStatusChange(value);
    } catch (err) {
      console.error('Error updating manual status:', err);
      toast.error(language === 'el' ? 'Σφάλμα ενημέρωσης' : 'Error updating');
    }
  };

  const renderCurrentStatus = () => {
    if (currentStatus === 'arrived') {
      return <Badge className="bg-green-600 text-white whitespace-nowrap cursor-pointer">{txt.arrived}</Badge>;
    }
    if (currentStatus === 'no_show') {
      return <Badge variant="destructive" className="cursor-pointer whitespace-nowrap">{txt.noShow}</Badge>;
    }
    return (
      <span className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors px-1">
        —
      </span>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center">
          {renderCurrentStatus()}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="start">
        <div className="flex flex-col">
          {options.map((opt) => (
            <button
              key={opt.value ?? 'null'}
              className={`text-left text-sm px-3 py-1.5 rounded hover:bg-muted transition-colors ${
                currentStatus === opt.value ? 'font-semibold text-primary' : ''
              }`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
