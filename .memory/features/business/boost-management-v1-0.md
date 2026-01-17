# Memory: features/business/boost-management-v1-0
Updated: now

The 'Boost Management' (Διαχείριση Προωθήσεων) section displays EXCLUSIVELY boosted content, organized into 'Events' and 'Offers' tabs. Standard (non-boosted) content is hidden. Each card shows: 1) Performance metrics (Impressions, Interactions, Visits) with hover tooltips explaining each metric, 2) Boost details (Tier, Date Range, Total Cost), and 3) An Active/Pause toggle. For Events, a Revenue section is displayed ONLY for paid events (tickets or prepaid reservations) and includes Sold Tickets, Reservation Guests, and Gross Revenue; free events show no revenue data. Offer cards do not show revenue or CPC metrics.

**Important UX rules:**
- Boosts can ONLY be created from Events or Offers sections (requires payment), never from Boost Management
- When a boost is paused, clicking the paused button shows a tooltip instructing the user to recreate the boost from Events/Offers sections
- The 'Performance' button is removed from all cards in this view to maintain a focused dashboard look

**Metric tooltips:**
- Events Impressions: "How many times users viewed your boosted event pages from anywhere"
- Events Interactions: "User RSVPs: Interested or Going for boosted events"
- Events Visits: "Ticket and minimum charge reservation check-ins exclusively for boosted events"
- Offers Impressions: "How many times users viewed your boosted offer pages from anywhere"
- Offers Interactions: "Clicks on Redeem button – shows intent to use the boosted offer"
- Offers Visits: "QR scans for boosted offer redemption at your venue, with or without reservation (walk-in)"
