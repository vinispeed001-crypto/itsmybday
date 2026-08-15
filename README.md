# ItsMyBday

## Supabase setup

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`.
3. Under Authentication → Users, create the first admin user (email + password).
4. In the SQL editor, link that user to the seeded venue as admin:
   ```sql
   insert into profiles (id, venue_id, role, full_name)
   values ('<auth-user-uuid-from-step-3>', '00000000-0000-0000-0000-000000000001', 'admin', 'Admin 300 Sky Bar');
   ```
5. Copy Project Settings → API → Project URL, anon key, and service_role key into `.env.local` (see `.env.local.example`).
