# Memory: features/analytics/boost-metrics-logic-v2
Updated: now

Boost analytics for offers measure interactions using 'offer_redeem_click' events (clicks on the 'Redeem' button) from the engagement_events table, while event boosts track RSVP actions. All boost-related queries normalize date ranges to full ISO timestamps (e.g., end_date at 23:59:59.999Z) to ensure activity on the final day of the boost is accurately captured.

**CRITICAL for Visits**: Event boost visits (check-ins) are counted by `checked_in_at` date, NOT by ticket purchase or reservation creation date. This ensures check-ins that occur during the boost period are counted, regardless of when the ticket was purchased or reservation was made.

**Tooltip text for event visits**: "Check-ins εισιτηρίων και κρατήσεων αποκλειστικά για Boosted εκδηλώσεις"
**Tooltip text for offer visits**: "QR check-ins από εξαργυρώσεις boosted προσφοράς, είτε με κράτηση είτε χωρίς"
