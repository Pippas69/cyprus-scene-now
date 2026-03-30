let eventDetailPreloadPromise: Promise<unknown> | null = null;
let businessProfilePreloadPromise: Promise<unknown> | null = null;
let eventCheckoutFlowsPreloadPromise: Promise<unknown> | null = null;

export const preloadEventDetailPage = () => {
  if (!eventDetailPreloadPromise) {
    eventDetailPreloadPromise = import("@/pages/EventDetail");
  }
  return eventDetailPreloadPromise;
};

export const preloadBusinessProfilePage = () => {
  if (!businessProfilePreloadPromise) {
    businessProfilePreloadPromise = import("@/pages/BusinessProfile");
  }
  return businessProfilePreloadPromise;
};

export const preloadEventCheckoutFlows = () => {
  if (!eventCheckoutFlowsPreloadPromise) {
    eventCheckoutFlowsPreloadPromise = Promise.all([
      import("@/components/business/ReservationDialog"),
      import("@/components/user/ReservationEventCheckout"),
      import("@/components/tickets/KalivaTicketReservationFlow"),
      import("@/components/tickets/TicketPurchaseFlow"),
    ]);
  }
  return eventCheckoutFlowsPreloadPromise;
};
