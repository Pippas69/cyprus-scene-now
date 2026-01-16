import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

export const useRealtimeNotifications = (businessId: string | null, userId: string | null) => {
  const queryClient = useQueryClient();
  const notificationShownRef = useRef(new Set<string>());
  const { language } = useLanguage();

  const t = {
    el: {
      newReservation: 'Νέα Κράτηση! 🎉',
      reservedFor: 'κράτηση για',
      people: 'άτομα',
      newRsvp: 'Νέο RSVP',
      willAttend: 'θα παρευρεθεί στο',
      interested: 'ενδιαφέρεται για το',
      someone: 'Κάποιος',
      newTicketSale: 'Νέα Πώληση Εισιτηρίου! 🎫',
      ticketsSold: 'εισιτήρια πωλήθηκαν',
      ticketSold: 'εισιτήριο πωλήθηκε',
      forEvent: 'για την εκδήλωση',
      newOfferPurchase: 'Νέα Αγορά Προσφοράς! 💳',
      offerPurchased: 'Η προσφορά αγοράστηκε',
      qrScanned: 'QR Σαρώθηκε',
      viewed: 'προβλήθηκε',
      verified: 'επαληθεύτηκε',
      redeemed: 'εξαργυρώθηκε',
      directReservation: 'Κράτηση Τραπεζιού',
    },
    en: {
      newReservation: 'New Reservation! 🎉',
      reservedFor: 'reserved for',
      people: 'people',
      newRsvp: 'New RSVP',
      willAttend: 'will attend',
      interested: 'is interested in',
      someone: 'Someone',
      newTicketSale: 'New Ticket Sale! 🎫',
      ticketsSold: 'tickets sold',
      ticketSold: 'ticket sold',
      forEvent: 'for event',
      newOfferPurchase: 'New Offer Purchase! 💳',
      offerPurchased: 'Offer purchased',
      qrScanned: 'QR Scanned',
      viewed: 'viewed',
      verified: 'verified',
      redeemed: 'redeemed',
      directReservation: 'Table Reservation',
    }
  };

  const labels = t[language];

  useEffect(() => {
    if (!businessId || !userId) return;

    // Subscribe to new reservations (both event-based and direct)
    const reservationsChannel = supabase
      .channel('business-reservations-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations'
        },
        async (payload) => {
          // Check if this reservation is for this business
          let isForThisBusiness = false;
          let eventTitle = '';

          // Check direct reservation first (business_id field)
          if (payload.new.business_id === businessId) {
            isForThisBusiness = true;
            eventTitle = labels.directReservation;
          } else if (payload.new.event_id) {
            // Check if event belongs to this business
            const { data: event } = await supabase
              .from('events')
              .select('business_id, title')
              .eq('id', payload.new.event_id)
              .single();

            if (event?.business_id === businessId) {
              isForThisBusiness = true;
              eventTitle = event.title || '';
            }
          }

          if (isForThisBusiness && !notificationShownRef.current.has(payload.new.id)) {
            notificationShownRef.current.add(payload.new.id);
            
            toast(labels.newReservation, {
              description: `${payload.new.reservation_name} ${labels.reservedFor} ${payload.new.party_size} ${labels.people}${eventTitle ? ` - ${eventTitle}` : ''}`,
            });

            queryClient.invalidateQueries({ queryKey: ['business-stats', businessId] });
            queryClient.invalidateQueries({ queryKey: ['business-events', businessId] });
            queryClient.invalidateQueries({ queryKey: ['business-reservations', businessId] });
          }
        }
      )
      .subscribe();

    // Subscribe to new RSVPs
    const rsvpsChannel = supabase
      .channel('business-rsvps-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rsvps'
        },
        async (payload) => {
          const { data: event } = await supabase
            .from('events')
            .select('business_id, title')
            .eq('id', payload.new.event_id)
            .single();

          if (event?.business_id === businessId && !notificationShownRef.current.has(payload.new.id)) {
            notificationShownRef.current.add(payload.new.id);
            
            const status = payload.new.status === 'going' ? labels.willAttend : labels.interested;
            toast(`${labels.newRsvp} - ${event.title}! 👥`, {
              description: `${labels.someone} ${status} ${event.title}`,
            });

            queryClient.invalidateQueries({ queryKey: ['business-stats', businessId] });
            queryClient.invalidateQueries({ queryKey: ['business-events', businessId] });
          }
        }
      )
      .subscribe();

    // Subscribe to ticket sales
    const ticketOrdersChannel = supabase
      .channel('business-ticket-orders-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ticket_orders',
          filter: `business_id=eq.${businessId}`
        },
        async (payload) => {
          // Only notify for completed orders (status changed to completed)
          if (payload.new.status === 'completed' && payload.old?.status !== 'completed' 
              && !notificationShownRef.current.has(payload.new.id)) {
            notificationShownRef.current.add(payload.new.id);
            
            // Get event title
            const { data: event } = await supabase
              .from('events')
              .select('title')
              .eq('id', payload.new.event_id)
              .single();

            // Get ticket count
            const { count } = await supabase
              .from('tickets')
              .select('*', { count: 'exact', head: true })
              .eq('order_id', payload.new.id);

            const ticketCount = count || 1;
            const ticketWord = ticketCount === 1 ? labels.ticketSold : labels.ticketsSold;
            const totalAmount = ((payload.new.total_cents || 0) / 100).toFixed(2);
            
            toast(labels.newTicketSale, {
              description: `${ticketCount} ${ticketWord} ${labels.forEvent} "${event?.title || ''}" - €${totalAmount}`,
            });

            queryClient.invalidateQueries({ queryKey: ['business-stats', businessId] });
            queryClient.invalidateQueries({ queryKey: ['business-events', businessId] });
            queryClient.invalidateQueries({ queryKey: ['ticket-sales', businessId] });
          }
        }
      )
      .subscribe();

    // Subscribe to offer purchases
    const offerPurchasesChannel = supabase
      .channel('business-offer-purchases-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'offer_purchases',
          filter: `business_id=eq.${businessId}`
        },
        async (payload) => {
          // Only notify for completed purchases (status changed to completed)
          if (payload.new.status === 'completed' && payload.old?.status !== 'completed'
              && !notificationShownRef.current.has(payload.new.id)) {
            notificationShownRef.current.add(payload.new.id);
            
            // Get offer title
            const { data: discount } = await supabase
              .from('discounts')
              .select('title')
              .eq('id', payload.new.discount_id)
              .single();

            const totalAmount = ((payload.new.final_price_cents || 0) / 100).toFixed(2);
            
            toast(labels.newOfferPurchase, {
              description: `${labels.offerPurchased}: "${discount?.title || ''}" - €${totalAmount}`,
            });

            queryClient.invalidateQueries({ queryKey: ['business-stats', businessId] });
            queryClient.invalidateQueries({ queryKey: ['offer-purchases', businessId] });
          }
        }
      )
      .subscribe();

    // Subscribe to QR code scans (offer redemptions)
    const scansChannel = supabase
      .channel('business-qr-scans-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'discount_scans'
        },
        async (payload) => {
          // Check if this scan is for this business's offers
          const { data: discount } = await supabase
            .from('discounts')
            .select('business_id, title')
            .eq('id', payload.new.discount_id)
            .single();

          if (discount?.business_id === businessId && !notificationShownRef.current.has(payload.new.id)) {
            notificationShownRef.current.add(payload.new.id);
            
            const scanTypeMap = {
              view: labels.viewed,
              verify: labels.verified,
              redeem: labels.redeemed
            };
            
            const scanAction = scanTypeMap[payload.new.scan_type as keyof typeof scanTypeMap] || labels.viewed;
            const icon = payload.new.scan_type === 'redeem' ? '✅' : payload.new.scan_type === 'verify' ? '🔍' : '👁️';
            
            toast(`${labels.qrScanned}! ${icon}`, {
              description: `${discount.title} - ${scanAction}`,
            });

            queryClient.invalidateQueries({ queryKey: ['business-stats', businessId] });
            queryClient.invalidateQueries({ queryKey: ['discount-scan-stats', businessId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reservationsChannel);
      supabase.removeChannel(rsvpsChannel);
      supabase.removeChannel(ticketOrdersChannel);
      supabase.removeChannel(offerPurchasesChannel);
      supabase.removeChannel(scansChannel);
    };
  }, [businessId, userId, queryClient, language, labels]);
};
