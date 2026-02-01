import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to fetch all dates that have ALL slots closed for a business.
 * Returns a Set of dates (YYYY-MM-DD format) that are fully closed.
 */
export function useClosedDates(businessId: string | undefined) {
  const [closedDates, setClosedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) {
      setClosedDates(new Set());
      return;
    }

    const fetchClosedDates = async () => {
      setLoading(true);
      try {
        // Get all closure dates for this business
        const { data: closures, error: closuresError } = await supabase
          .from('reservation_slot_closures')
          .select('closure_date, slot_time')
          .eq('business_id', businessId);

        if (closuresError) {
          console.error('Error fetching closures:', closuresError);
          setClosedDates(new Set());
          return;
        }

        // Get business time slots to know total slots per day
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('reservation_time_slots')
          .eq('id', businessId)
          .single();

        if (businessError) {
          console.error('Error fetching business:', businessError);
          setClosedDates(new Set());
          return;
        }

        // Group closures by date
        const closuresByDate = new Map<string, Set<string>>();
        closures?.forEach(closure => {
          const date = closure.closure_date;
          if (!closuresByDate.has(date)) {
            closuresByDate.set(date, new Set());
          }
          closuresByDate.get(date)?.add(closure.slot_time);
        });

        // Count total slot WINDOWS per day from business config.
        // IMPORTANT: Staff controls toggle slot windows (slot_time == window start), not every 30-min interval.
        const timeSlots = business?.reservation_time_slots as any[] | null;
        
        // Find dates where ALL slots are closed
        const fullyClosedDates = new Set<string>();
        
        closuresByDate.forEach((closedSlots, date) => {
          // Get the day of week for this date
          const dateObj = new Date(date + 'T12:00:00');
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = dayNames[dateObj.getDay()];
          
           // Count total slot windows for this day
           let totalSlotsForDay = 0;
          if (timeSlots && Array.isArray(timeSlots)) {
            timeSlots.forEach(slot => {
              if (slot.days && slot.days.includes(dayName)) {
                  totalSlotsForDay += 1;
              }
            });
          }
          
          // If all slots for this day are closed, mark the date as fully closed
          if (totalSlotsForDay > 0 && closedSlots.size >= totalSlotsForDay) {
            fullyClosedDates.add(date);
          }
        });

        setClosedDates(fullyClosedDates);
      } catch (error) {
        console.error('Error fetching closed dates:', error);
        setClosedDates(new Set());
      } finally {
        setLoading(false);
      }
    };

    fetchClosedDates();
  }, [businessId]);

  return { closedDates, loading };
}
