# Memory: technical/boost/management-deduplication-logic-el
Updated: now

Η διαχείριση προωθήσεων (Boost Management) ομαδοποιεί τις προωθήσεις ανά 'event_id' ή 'discount_id' και υπολογίζει τα metrics ΜΙΑ ΦΟΡΑ ανά ομάδα, ελέγχοντας κάθε εγγραφή αν πέφτει σε ΟΠΟΙΟΔΗΠΟΤΕ boost window (χρήση 'isInAnyWindow' με 'some()'). Αυτό αποτρέπει τη διπλομέτρηση σε περίπτωση αλληλεπικαλυπτόμενων windows. Τα pending boosts εξαιρούνται από τους υπολογισμούς. Για τα metadata (tier, dates, status), επιλέγεται το ενεργό boost ή αυτό με την πιο πρόσφατη ημερομηνία λήξης. Το συνολικό κόστος αθροίζεται από ΟΛΑ τα boosts της ομάδας.
