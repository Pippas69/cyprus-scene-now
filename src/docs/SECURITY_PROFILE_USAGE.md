# Security Guide: Profile Data Access

This document explains when and how to access user profile data securely in the application.

## Overview

We have two ways to access user profile data:

1. **`profiles` table** - Complete user data including sensitive information (email, DOB, admin status)
2. **`public_profiles` view** - Public-safe view excluding sensitive information

## When to Use Each

### Use `profiles` Table When:

✅ **User is viewing their own profile**
```typescript
import { useUserProfile } from '@/hooks/useUserProfile';

const { data: profile } = useUserProfile(currentUser.id);
// Can access: name, email, city, interests, dob, etc.
```

✅ **Business owner viewing reservation details**
```typescript
// RLS policy ensures only business owners can see reservation emails
const { data } = await supabase
  .from('reservations')
  .select('*, profiles(email, name)')
  .eq('event_id', myEventId);
```

✅ **Admin performing administrative tasks**
```typescript
// RLS policy ensures only admins can access
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('is_admin', true);
```

### Use `public_profiles` View When:

✅ **Displaying event attendees publicly**
```typescript
import { usePublicProfile } from '@/hooks/usePublicProfile';

const { data: attendee } = usePublicProfile(userId);
// Can access: name, city, interests, avatar
// Cannot access: email, dob, admin status
```

✅ **Showing user cards/badges**
```typescript
const { data } = await supabase
  .from('public_profiles')
  .select('id, name, avatar_url, city')
  .in('id', userIds);
```

✅ **Public user search functionality**
```typescript
import { useSearchPublicProfiles } from '@/hooks/usePublicProfile';

const { data: results } = useSearchPublicProfiles(searchTerm);
```

## Row Level Security (RLS) Policies

### `profiles` Table Policies:
- **Users can view own complete profile** - Users can see their own email and sensitive data
- RLS automatically filters queries to only return data the user has access to

### `public_profiles` View:
- Accessible by everyone (anon + authenticated)
- Only exposes safe fields: `id`, `name`, `first_name`, `last_name`, `avatar_url`, `city`, `town`, `interests`, `created_at`
- Explicitly excludes: `email`, `dob_month`, `dob_year`, `is_admin`, `user_id`

## Common Patterns

### Pattern 1: Display Current User's Profile
```typescript
// ProfileSettings.tsx
const { data: profile } = useUserProfile(user.id);

<div>
  <p>Name: {profile?.name}</p>
  <p>Email: {profile?.email}</p> {/* ✅ Can see own email */}
</div>
```

### Pattern 2: Display Event Attendees List
```typescript
// EventAttendeesPage.tsx
const { data: attendees } = usePublicProfiles(attendeeIds);

{attendees.map(attendee => (
  <UserCard 
    name={attendee.name}
    city={attendee.city}
    avatar={attendee.avatar_url}
    {/* ✅ No email exposed */}
  />
))}
```

### Pattern 3: Business Viewing Reservations
```typescript
// ReservationManagement.tsx
const { data: reservations } = await supabase
  .from('reservations')
  .select('*, profiles(email, name)')
  .in('event_id', myEventIds);

{/* ✅ Business owners can see reservation emails via RLS */}
```

## Security Checklist

Before writing a profile query, ask:

1. ❓ **Is this the current user viewing their own data?**
   - YES → Use `profiles` table
   - NO → Continue to next question

2. ❓ **Does the user have legitimate business need for email/sensitive data?**
   - YES (admin/business owner) → Use `profiles` table (RLS will protect)
   - NO → Use `public_profiles` view

3. ❓ **Is this a public display of user information?**
   - YES → Use `public_profiles` view
   - NO → Review RLS policies and use appropriate table

## Available Hooks

- **`useUserProfile(userId)`** - Fetch current user's complete profile
- **`usePublicProfile(userId)`** - Fetch single public profile
- **`usePublicProfiles(userIds[])`** - Fetch multiple public profiles
- **`useSearchPublicProfiles(searchTerm)`** - Search public profiles

## Testing

To verify security:

1. Log in as a regular user
2. Try to access another user's email directly:
   ```sql
   SELECT email FROM profiles WHERE id = 'other-user-id'
   ```
   Result: Empty (RLS blocks it)

3. Query public_profiles:
   ```sql
   SELECT * FROM public_profiles WHERE id = 'any-user-id'
   ```
   Result: Safe fields only (no email)

## Questions?

If you're unsure which approach to use, default to **`public_profiles`** view.
It's always safer to expose less data than more.
