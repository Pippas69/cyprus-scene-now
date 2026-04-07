# Memory: features/feed/elite-manual-priority-el
Updated: now

Το Feed και ο Χάρτης εφαρμόζουν μια ενοποιημένη ιεράρχηση εμφάνισης και οπτικής σήμανσης βάσει του επιπέδου συνδρομής: 
1) Κατάταξη Feed: Elite (βάσει της χειροκίνητης σειράς ELITE_MANUAL_ORDER) > Pro > Basic > Free. 
2) ELITE_MANUAL_ORDER: 1. Kaliva, 2. Blue Martini, 3. Σουαρέ, 4. Hot Spot, 5. Mythos Nights, 6. Amnesia, 7. Lost + Found, 8. Sugar Wave, 9. Asmation Experience, 10. Element X, 11. 24seven, 12. Dirty Island, 13. PEAK, 14. Crosta Nostra, 15. La Fiesta, 16. Mr. Mellow, 17. Legacy, 18. Notes and Spirits, 19. Eterna.
3) Οπτική Σήμανση Χάρτη: Elite = Χρυσό pin (Gold - hsl(45, 95%, 55%)), Pro = Μωβ pin (Purple), Basic = Κυανό pin (Cyan). 
Η ιεράρχηση αυτή διασφαλίζεται τεχνικά μέσω της view 'public_business_subscriptions', η οποία επιτρέπει τη διαλογή χωρίς την έκθεση ευαίσθητων οικονομικών στοιχείων.
