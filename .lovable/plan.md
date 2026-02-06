
## Account Role Switcher

Add a context-aware menu option in the user dropdown that allows users to switch between their User and Business accounts.

---

## How It Will Work

- **When on User pages (Feed, Events, etc.)**: If the user owns a business, show "My Business" option → navigates to `/dashboard-business`
- **When on Business Dashboard**: Show "My User Account" option → navigates to `/feed`

---

## Changes Required

### File: `src/components/UserAccountDropdown.tsx`

1. **Import the hook**
   - Add `useBusinessOwner` import

2. **Add translations**
   - Greek: "Η επιχείρησή μου" (My Business) and "Ο προσωπικός μου λογαριασμός" (My User Account)  
   - English: "My Business" and "My User Account"

3. **Add conditional menu item**
   - If on business dashboard → Show "My User Account" button with User icon
   - If on user pages AND user has business → Show "My Business" button with Building/Briefcase icon

4. **Add click handlers**
   - "My Business" → `navigate('/dashboard-business')`
   - "My User Account" → `navigate('/feed')`

---

## Technical Details

```text
┌─────────────────────────────┐
│  [Avatar]                   │
├─────────────────────────────┤
│  👤 My Account              │  ← Always visible
├─────────────────────────────┤
│  🏢 My Business             │  ← Only if isBusinessOwner AND not on business dashboard
│  ──── OR ────               │
│  👤 My User Account         │  ← Only if on business dashboard
├─────────────────────────────┤
│  🚪 Sign Out                │  ← Always visible
└─────────────────────────────┘
```

### Code Structure

```typescript
// Import
import { useBusinessOwner } from '@/hooks/useBusinessOwner';
import { Building2 } from 'lucide-react';

// Inside component
const { isBusinessOwner, isLoading: isBusinessLoading } = useBusinessOwner();

// Translations
myBusiness: 'Η επιχείρησή μου',      // Greek
myUserAccount: 'Ο προσωπικός μου λογαριασμός',
myBusiness: 'My Business',            // English
myUserAccount: 'My User Account',

// Conditional menu item (between My Account and Sign Out)
{isBusinessDashboard ? (
  <DropdownMenuItem onClick={() => navigate('/feed')}>
    <User className="mr-2 h-4 w-4" />
    {t.myUserAccount}
  </DropdownMenuItem>
) : (
  !isBusinessLoading && isBusinessOwner && (
    <DropdownMenuItem onClick={() => navigate('/dashboard-business')}>
      <Building2 className="mr-2 h-4 w-4" />
      {t.myBusiness}
    </DropdownMenuItem>
  )
)}
```

---

## Result

- Business owners can seamlessly switch between personal and business views
- Clear visual distinction with appropriate icons (Building for business, User for personal)
- No UI clutter for users without businesses
- Works on both desktop and mobile
