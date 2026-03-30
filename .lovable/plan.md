

## Πλήρης Διαγραφή Επιχείρησης — "Σαν να μην υπήρξε ποτέ"

### Πρόβλημα

Η τρέχουσα edge function `admin-delete-business` λειτουργεί αλλά έχει σημαντικά κενά:

1. **Λείπουν 20+ πίνακες** από τη διαγραφή (tickets, reservation_guests, favorites, notifications, featured_content, κλπ.)
2. **Δεν διαγράφει αρχεία storage** (logos, covers, event images, offer images)
3. **Δεν διαγράφει τον Auth user** — ο ιδιοκτήτης εξακολουθεί να υπάρχει στο σύστημα
4. **Δεν καθαρίζει notifications/emails** — ο business owner συνεχίζει να λαμβάνει ειδοποιήσεις
5. **Δεν καθαρίζει featured content** — η επιχείρηση μπορεί να εξακολουθεί να εμφανίζεται σε curated λίστες

### Λύση

Πλήρης ανακατασκευή της edge function με cascade deletion **ΟΛΩΝ** των δεδομένων, συμπεριλαμβανομένων storage files και auth user.

---

### Τεχνικές Λεπτομέρειες

#### Βήμα 1: Ανακατασκευή `admin-delete-business` edge function

Πλήρης σειρά διαγραφής (child-first):

```text
ΕΠΙΠΕΔΟ 1 — Tickets & παράγωγα
├── show_instance_seats (via tickets → ticket_orders → events)
├── tickets (via ticket_orders)
├── commission_ledger (via ticket_orders)
├── ticket_orders (via events)
├── ticket_tiers (via events)
├── ticket_commission_rates (via events)

ΕΠΙΠΕΔΟ 2 — Reservations & παράγωγα
├── reservation_guests
├── reservation_scans
├── reservation_table_assignments
├── reservation_zone_assignments
├── reservation_no_shows
├── reservation_slot_closures
├── reservations

ΕΠΙΠΕΔΟ 3 — Events & παράγωγα
├── boost_analytics (via event_boosts)
├── event_boosts
├── event_posts
├── event_views
├── favorites (via event_id)
├── free_entry_reports
├── messages (via event_id)
├── realtime_stats
├── rsvps
├── reservation_seating_types
├── seating_type_tiers (via reservation_seating_types)
├── events

ΕΠΙΠΕΔΟ 4 — Productions & παράγωγα
├── show_zone_pricing (via show_instances)
├── show_instance_seats (via show_instances)
├── show_instances (via productions)
├── production_cast
├── productions

ΕΠΙΠΕΔΟ 5 — Discounts/Offers & παράγωγα
├── offer_purchase_guests (via offer_purchases)
├── offer_purchases
├── offer_boosts
├── discount_scans
├── discount_views
├── discount_items
├── favorite_discounts (via discounts)
├── redemptions (via discounts)
├── commission_ledger (via discounts)
├── discounts

ΕΠΙΠΕΔΟ 6 — Business Posts
├── business_post_poll_votes
├── business_post_likes
├── business_post_views
├── business_posts

ΕΠΙΠΕΔΟ 7 — CRM
├── crm_guest_tag_assignments
├── crm_guest_notes
├── crm_communication_log
├── crm_guests
├── crm_guest_tags

ΕΠΙΠΕΔΟ 8 — Floor Plans
├── floor_plan_tables
├── floor_plan_rooms
├── floor_plan_zones

ΕΠΙΠΕΔΟ 9 — Venue (αν υπάρχει)
├── venue_seats (via venue_zones)
├── venue_zones (via venues)
├── venues (αν reference business)

ΕΠΙΠΕΔΟ 10 — Λοιπά business-level
├── profile_boosts
├── credit_transactions
├── business_followers
├── business_subscriptions
├── business_subscription_plan_history
├── beta_invite_codes
├── daily_analytics
├── engagement_events
├── student_discount_redemptions
├── student_discount_partners
├── student_redemptions
├── student_subsidy_invoices
├── payment_invoices
├── posts
├── offline_scan_results

ΕΠΙΠΕΔΟ 11 — Notifications & Emails
├── notifications (where entity_id = business_id or related)
├── notifications (where user_id = business owner)
├── featured_content (where entity_id = business/event/discount IDs)

ΕΠΙΠΕΔΟ 12 — Storage
├── business-logos/{business_id}/
├── business-covers/{business_id}/
├── event-covers/{event_ids}/
├── offer-images/{discount_ids}/
├── floor-plans/{business_id}/
├── floor-plan-references/{business_id}/

ΕΠΙΠΕΔΟ 13 — Auth User
├── profiles (user_id του business owner)
├── user_roles
├── push_subscriptions
├── auth.users (deleteUser via service role)

ΤΕΛΟΣ — businesses row
```

Επιπλέον:
- Αποθήκευση audit log ΠΡΙΝ τη διαγραφή (με full snapshot: name, city, user_id, created_at)
- Error handling: αν αποτύχει κρίσιμο βήμα, abort και report
- Logging κάθε βήματος

#### Βήμα 2: Update `AdminBusinesses.tsx`

- Εμφάνιση ονόματος ιδιοκτήτη (email) στη λίστα
- Πιο αυστηρό confirmation dialog: ο admin πρέπει να πληκτρολογήσει το όνομα της επιχείρησης για επιβεβαίωση
- Warning message: "Θα διαγραφεί ο λογαριασμός, τα αρχεία, τα emails, οι ειδοποιήσεις — ΟΛΑ. Μη αναστρέψιμο."

#### Βήμα 3: Fix user self-delete (3 components)

Τα 3 αρχεία που χρησιμοποιούν `supabase.auth.admin.deleteUser()` (που αποτυγχάνει):
- `UserSettings.tsx`
- `UserAccountSettings.tsx`
- `BusinessAccountSettings.tsx`

Αντικατάσταση με κλήση σε νέα edge function `delete-user-account` που:
- Για business users: καλεί την ίδια cascade logic
- Για απλούς users: διαγράφει profile, notifications, favorites, reservations, tickets, κλπ.
- Διαγράφει auth user server-side

