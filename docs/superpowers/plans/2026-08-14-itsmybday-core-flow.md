# ItsMyBday — Core Flow (Pedido → Aprovação → Classificação → Lista) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core ItsMyBday product for the 300 Sky Bar venue: a public guest request form, an admin dashboard to approve/deny and classify requests, guest-list building with a shareable link, house rules management, and integration hook points (GetIn, WhatsApp/Nicochat, pensanoevento) that record pending manual actions until the real APIs are wired.

**Architecture:** Next.js 14 (App Router, TypeScript) as an installable PWA, with Supabase for Postgres, Auth, and Realtime. All public-facing writes (guest request submission, guest-list name entries) go through Next.js Route Handlers using the Supabase **service role** key server-side, with business rules (capacity, deadlines) enforced in code — not in RLS. The admin dashboard reads/writes directly via the browser Supabase client under RLS policies scoped to `profiles.role = 'admin'` and the admin's `venue_id`. External integrations (GetIn, Nicochat/WhatsApp, pensanoevento) are represented by an `integration_events` table: every approval/classification/list-creation writes a `pending_manual` row instead of calling a live API, so the UI shows the admin exactly what to do by hand today, and swapping in real API calls later only touches one small module.

**Tech Stack:** Next.js 14 (App Router) + TypeScript, Tailwind CSS, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Zod, date-fns, Vitest + Testing Library, deployed to Vercel.

---

## File Structure

```
itsmybday/
├── app/
│   ├── layout.tsx                          # root layout, PWA meta, dark theme
│   ├── globals.css                         # Tailwind base + dark balada tokens
│   ├── manifest.ts                         # PWA manifest
│   ├── (public)/
│   │   ├── [venueSlug]/pedido/page.tsx     # guest request form
│   │   └── lista/[token]/page.tsx          # shareable guest-list page
│   ├── admin/
│   │   ├── layout.tsx                      # protected layout (checks session)
│   │   ├── login/page.tsx
│   │   ├── page.tsx                        # dashboard: pending requests (realtime)
│   │   ├── pedidos/[id]/page.tsx           # request detail: decide/classify/build list
│   │   ├── disponibilidade/page.tsx        # availability grid management
│   │   ├── regras/page.tsx                 # house rules editor
│   │   └── integracoes/page.tsx            # pending manual integration events
│   └── api/
│       ├── availability/route.ts           # GET open slots
│       ├── requests/route.ts               # POST create request
│       ├── requests/[id]/decision/route.ts # POST approve/deny
│       ├── requests/[id]/classification/route.ts # POST classify
│       ├── requests/[id]/guest-list/route.ts      # POST create guest list
│       ├── lists/[token]/route.ts          # GET list info
│       ├── lists/[token]/entries/route.ts  # POST add name
│       ├── house-rules/route.ts            # GET/PUT
│       └── integration-events/[id]/resolve/route.ts # POST mark resolved
├── lib/
│   ├── supabase/
│   │   ├── browser.ts                      # browser client (anon key)
│   │   ├── server.ts                       # server client (cookies, for admin session)
│   │   └── service.ts                      # service-role client (server-only)
│   ├── domain/
│   │   ├── availability.ts                 # pure: filter open future slots
│   │   ├── guestList.ts                    # pure: capacity + deadline checks
│   │   └── classification.ts               # pure: classification validation
│   ├── validation/
│   │   └── schemas.ts                      # Zod schemas for all inputs
│   └── types.ts                            # shared domain types
├── middleware.ts                           # protects /admin/*
├── supabase/
│   ├── migrations/0001_init.sql
│   └── seed.sql
├── vitest.config.ts
├── vitest.setup.ts
├── tailwind.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, `.env.local.example`, `.gitignore`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Initialize package.json**

```json
{
  "name": "itsmybday",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "14.2.15",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "@supabase/supabase-js": "2.45.4",
    "@supabase/ssr": "0.5.1",
    "zod": "3.23.8",
    "date-fns": "3.6.0"
  },
  "devDependencies": {
    "typescript": "5.5.4",
    "@types/node": "20.14.15",
    "@types/react": "18.3.4",
    "@types/react-dom": "18.3.0",
    "tailwindcss": "3.4.10",
    "postcss": "8.4.41",
    "autoprefixer": "10.4.20",
    "vitest": "2.0.5",
    "@vitejs/plugin-react": "4.3.1",
    "jsdom": "24.1.1",
    "@testing-library/react": "16.0.0",
    "@testing-library/jest-dom": "6.4.8",
    "@testing-library/user-event": "14.5.2"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: `node_modules` populated, no errors.

- [ ] **Step 3: Add TypeScript config**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Add Next.js config**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

Save as `next.config.mjs`.

- [ ] **Step 5: Add Tailwind config with the Dark Balada theme tokens**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0B0C",
        surface: "#17171A",
        border: "#2A2A2E",
        gold: "#D4AF6A",
        "gold-dark": "#B8944F",
        ink: "#F4F4F2",
        muted: "#9A9A9E",
        danger: "#E5484D",
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 6: Add PostCSS config**

```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

Save as `postcss.config.mjs`.

- [ ] **Step 7: Add global styles**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #0b0b0c;
  color: #f4f4f2;
}
```

Save as `app/globals.css`.

- [ ] **Step 8: Add root layout**

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ItsMyBday",
  description: "Pedido e aprovação de listas de aniversário — 300 Sky Bar",
};

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-body min-h-screen bg-bg text-ink">{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Add a placeholder home page**

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="font-display text-2xl text-gold">ItsMyBday</p>
    </main>
  );
}
```

Save as `app/page.tsx`.

- [ ] **Step 10: Add Vitest config**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

```typescript
import "@testing-library/jest-dom/vitest";
```

Save as `vitest.config.ts` and `vitest.setup.ts` respectively.

- [ ] **Step 11: Add .gitignore and env example**

```
node_modules/
.next/
.env.local
.env*.local
```

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Save as `.gitignore` and `.env.local.example`.

- [ ] **Step 12: Verify the app builds and tests run**

Run: `npm run build`
Expected: build completes with no errors.

Run: `npm test`
Expected: `No test files found` (fine — no tests written yet), exits 0.

- [ ] **Step 13: Commit**

```bash
git add package.json tsconfig.json next.config.mjs tailwind.config.ts postcss.config.mjs \
  vitest.config.ts vitest.setup.ts .gitignore .env.local.example app/
git commit -m "chore: scaffold Next.js + TypeScript + Tailwind + Vitest project"
```

---

## Task 2: Supabase Clients

**Files:**
- Create: `lib/supabase/browser.ts`, `lib/supabase/server.ts`, `lib/supabase/service.ts`
- Create: `lib/types.ts`

- [ ] **Step 1: Define shared domain types**

```typescript
export type RequestStatus = "pending" | "approved" | "denied";

export type ClassificationType =
  | "tudo_vip"
  | "vip_ate_hora"
  | "valor_genero"
  | "pagar_antecipado";

export type IntegrationEventType =
  | "getin_reservation"
  | "whatsapp_notification"
  | "pensanoevento_export";

export type IntegrationEventStatus = "pending_manual" | "sent" | "failed";

export interface Venue {
  id: string;
  name: string;
  slug: string;
}

export interface AvailabilitySlot {
  id: string;
  venue_id: string;
  event_date: string; // ISO date, e.g. "2026-09-12"
  time: string; // e.g. "23:00"
  is_open: boolean;
}

export interface GuestRequest {
  id: string;
  venue_id: string;
  requester_name: string;
  event_date: string;
  event_time: string;
  quantity: number;
  instagram: string;
  whatsapp: string;
  referred_by_profile_id: string | null;
  status: RequestStatus;
  denial_reason: string | null;
  created_at: string;
}

export interface Classification {
  id: string;
  request_id: string;
  type: ClassificationType;
  vip_until_time: string | null;
  value_male: number | null;
  value_female: number | null;
  advance_payment_note: string | null;
}

export interface GuestList {
  id: string;
  request_id: string;
  max_men: number;
  max_women: number;
  deadline_at: string; // ISO timestamp
  share_token: string;
}

export interface GuestListEntry {
  id: string;
  guest_list_id: string;
  name: string;
  gender: "male" | "female";
  created_at: string;
}
```

- [ ] **Step 2: Add the browser client (used by admin UI, under RLS)**

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 3: Add the server client (used in Server Components / route handlers with the admin's session cookie)**

```typescript
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}
```

- [ ] **Step 4: Add the service-role client (server-only, bypasses RLS, used for public write routes)**

```typescript
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

- [ ] **Step 5: Install the `server-only` package**

Run: `npm install server-only`
Expected: added to `package.json` dependencies.

- [ ] **Step 6: Verify the project still builds**

Run: `npm run build`
Expected: build fails with "supabaseUrl is required" type errors are NOT expected at build time (env vars aren't read until runtime for these functions) — build should complete. If it fails, confirm no top-level code calls these functions at import time.

- [ ] **Step 7: Commit**

```bash
git add lib/
git commit -m "feat: add Supabase browser, server, and service-role clients"
```

---

## Task 3: Database Schema

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `supabase/seed.sql`
- Create: `README.md` (Supabase setup section only, expanded fully in Task 17)

- [ ] **Step 1: Write the schema migration**

```sql
-- 0001_init.sql
create extension if not exists "pgcrypto";

create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  venue_id uuid not null references venues(id),
  role text not null check (role in ('admin', 'promoter')),
  full_name text,
  created_at timestamptz not null default now()
);

create table availability_slots (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id),
  event_date date not null,
  time text not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  unique (venue_id, event_date, time)
);

create table requests (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id),
  requester_name text not null,
  event_date date not null,
  event_time text not null,
  quantity int not null check (quantity > 0),
  instagram text not null,
  whatsapp text not null,
  referred_by_profile_id uuid references profiles(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  denial_reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references profiles(id)
);

create table classifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references requests(id) on delete cascade,
  type text not null check (type in ('tudo_vip', 'vip_ate_hora', 'valor_genero', 'pagar_antecipado')),
  vip_until_time text,
  value_male numeric(10, 2),
  value_female numeric(10, 2),
  advance_payment_note text,
  created_at timestamptz not null default now()
);

create table guest_lists (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references requests(id) on delete cascade,
  max_men int not null default 0,
  max_women int not null default 0,
  deadline_at timestamptz not null,
  share_token text not null unique,
  created_at timestamptz not null default now()
);

create table guest_list_entries (
  id uuid primary key default gen_random_uuid(),
  guest_list_id uuid not null references guest_lists(id) on delete cascade,
  name text not null,
  gender text not null check (gender in ('male', 'female')),
  created_at timestamptz not null default now()
);

create table house_rules (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null unique references venues(id),
  content text not null default '',
  updated_at timestamptz not null default now()
);

create table integration_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id) on delete cascade,
  type text not null check (type in ('getin_reservation', 'whatsapp_notification', 'pensanoevento_export')),
  status text not null check (status in ('pending_manual', 'sent', 'failed')) default 'pending_manual',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Row Level Security: enabled everywhere. Admin (authenticated, matching venue)
-- gets full access via policies below. No anon policies exist anywhere —
-- all public reads/writes go through server routes using the service role key.

alter table venues enable row level security;
alter table profiles enable row level security;
alter table availability_slots enable row level security;
alter table requests enable row level security;
alter table classifications enable row level security;
alter table guest_lists enable row level security;
alter table guest_list_entries enable row level security;
alter table house_rules enable row level security;
alter table integration_events enable row level security;

create policy "admin reads own venue" on venues for select
  using (id in (select venue_id from profiles where profiles.id = auth.uid()));

create policy "admin reads own profile" on profiles for select
  using (id = auth.uid());

create policy "admin manages availability" on availability_slots for all
  using (venue_id in (select venue_id from profiles where profiles.id = auth.uid() and role = 'admin'))
  with check (venue_id in (select venue_id from profiles where profiles.id = auth.uid() and role = 'admin'));

create policy "admin manages requests" on requests for all
  using (venue_id in (select venue_id from profiles where profiles.id = auth.uid() and role = 'admin'))
  with check (venue_id in (select venue_id from profiles where profiles.id = auth.uid() and role = 'admin'));

create policy "admin manages classifications" on classifications for all
  using (request_id in (
    select r.id from requests r
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ))
  with check (request_id in (
    select r.id from requests r
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "admin manages guest_lists" on guest_lists for all
  using (request_id in (
    select r.id from requests r
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ))
  with check (request_id in (
    select r.id from requests r
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "admin manages guest_list_entries" on guest_list_entries for all
  using (guest_list_id in (
    select gl.id from guest_lists gl
    join requests r on r.id = gl.request_id
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ))
  with check (guest_list_id in (
    select gl.id from guest_lists gl
    join requests r on r.id = gl.request_id
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "admin manages house_rules" on house_rules for all
  using (venue_id in (select venue_id from profiles where profiles.id = auth.uid() and role = 'admin'))
  with check (venue_id in (select venue_id from profiles where profiles.id = auth.uid() and role = 'admin'));

create policy "admin manages integration_events" on integration_events for all
  using (request_id in (
    select r.id from requests r
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ))
  with check (request_id in (
    select r.id from requests r
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ));
```

- [ ] **Step 2: Write the seed data**

```sql
-- seed.sql
insert into venues (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', '300 Sky Bar', '300-sky-bar')
on conflict (slug) do nothing;

insert into house_rules (venue_id, content)
values (
  '00000000-0000-0000-0000-000000000001',
  E'Dress code: esporte fino.\nTaxa de rolha: consulte a equipe.\nTolerância de horário: 30 minutos após o horário reservado.\nNo-show: reservas não confirmadas até o horário limite perdem a prioridade.'
)
on conflict (venue_id) do nothing;

insert into availability_slots (venue_id, event_date, time, is_open)
values
  ('00000000-0000-0000-0000-000000000001', current_date + interval '7 day', '22:00', true),
  ('00000000-0000-0000-0000-000000000001', current_date + interval '7 day', '23:00', true),
  ('00000000-0000-0000-0000-000000000001', current_date + interval '14 day', '22:00', true)
on conflict do nothing;
```

- [ ] **Step 3: Start the README with Supabase setup instructions**

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add supabase/ README.md
git commit -m "feat: add database schema, RLS policies, and seed data"
```

---

## Task 4: Domain Validation Library

**Files:**
- Create: `lib/validation/schemas.ts`
- Create: `lib/domain/availability.ts`
- Test: `lib/domain/availability.test.ts`
- Create: `lib/domain/guestList.ts`
- Test: `lib/domain/guestList.test.ts`
- Create: `lib/domain/classification.ts`
- Test: `lib/domain/classification.test.ts`

- [ ] **Step 1: Write the failing test for availability filtering**

```typescript
import { describe, it, expect } from "vitest";
import { filterOpenFutureSlots } from "./availability";
import type { AvailabilitySlot } from "@/lib/types";

const slot = (overrides: Partial<AvailabilitySlot>): AvailabilitySlot => ({
  id: "1",
  venue_id: "v1",
  event_date: "2099-01-01",
  time: "22:00",
  is_open: true,
  ...overrides,
});

describe("filterOpenFutureSlots", () => {
  it("keeps only slots that are open", () => {
    const slots = [slot({ id: "a", is_open: true }), slot({ id: "b", is_open: false })];
    const result = filterOpenFutureSlots(slots, new Date("2098-01-01"));
    expect(result.map((s) => s.id)).toEqual(["a"]);
  });

  it("excludes slots whose date already passed", () => {
    const slots = [
      slot({ id: "past", event_date: "2020-01-01" }),
      slot({ id: "future", event_date: "2099-01-01" }),
    ];
    const result = filterOpenFutureSlots(slots, new Date("2098-01-01"));
    expect(result.map((s) => s.id)).toEqual(["future"]);
  });

  it("includes a slot dated exactly today", () => {
    const today = new Date("2098-06-15T10:00:00Z");
    const slots = [slot({ id: "today", event_date: "2098-06-15" })];
    const result = filterOpenFutureSlots(slots, today);
    expect(result.map((s) => s.id)).toEqual(["today"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- availability`
Expected: FAIL — `Cannot find module './availability'`.

- [ ] **Step 3: Implement `filterOpenFutureSlots`**

```typescript
import type { AvailabilitySlot } from "@/lib/types";

export function filterOpenFutureSlots(
  slots: AvailabilitySlot[],
  now: Date
): AvailabilitySlot[] {
  const todayIso = now.toISOString().slice(0, 10);
  return slots.filter((slot) => slot.is_open && slot.event_date >= todayIso);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- availability`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing tests for guest-list capacity and deadline rules**

```typescript
import { describe, it, expect } from "vitest";
import { canAddEntry } from "./guestList";
import type { GuestList, GuestListEntry } from "@/lib/types";

const list: GuestList = {
  id: "gl1",
  request_id: "r1",
  max_men: 2,
  max_women: 1,
  deadline_at: "2099-01-01T23:00:00.000Z",
  share_token: "tok",
};

const entry = (gender: "male" | "female", id: string): GuestListEntry => ({
  id,
  guest_list_id: "gl1",
  name: "x",
  gender,
  created_at: "2020-01-01T00:00:00.000Z",
});

describe("canAddEntry", () => {
  it("allows adding when under capacity and before the deadline", () => {
    const result = canAddEntry(list, [], "male", new Date("2020-01-01"));
    expect(result).toEqual({ allowed: true });
  });

  it("rejects when the male quota is full", () => {
    const existing = [entry("male", "e1"), entry("male", "e2")];
    const result = canAddEntry(list, existing, "male", new Date("2020-01-01"));
    expect(result).toEqual({ allowed: false, reason: "quota_full" });
  });

  it("rejects when the female quota is full", () => {
    const existing = [entry("female", "e1")];
    const result = canAddEntry(list, existing, "female", new Date("2020-01-01"));
    expect(result).toEqual({ allowed: false, reason: "quota_full" });
  });

  it("rejects after the deadline has passed", () => {
    const result = canAddEntry(list, [], "male", new Date("2099-06-01"));
    expect(result).toEqual({ allowed: false, reason: "deadline_passed" });
  });

  it("checks the deadline before the quota", () => {
    const existing = [entry("male", "e1"), entry("male", "e2")];
    const result = canAddEntry(list, existing, "male", new Date("2099-06-01"));
    expect(result).toEqual({ allowed: false, reason: "deadline_passed" });
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- guestList`
Expected: FAIL — `Cannot find module './guestList'`.

- [ ] **Step 7: Implement `canAddEntry`**

```typescript
import type { GuestList, GuestListEntry } from "@/lib/types";

export type AddEntryResult =
  | { allowed: true }
  | { allowed: false; reason: "deadline_passed" | "quota_full" };

export function canAddEntry(
  list: GuestList,
  existingEntries: GuestListEntry[],
  gender: "male" | "female",
  now: Date
): AddEntryResult {
  if (now.getTime() >= new Date(list.deadline_at).getTime()) {
    return { allowed: false, reason: "deadline_passed" };
  }

  const countByGender = existingEntries.filter((e) => e.gender === gender).length;
  const max = gender === "male" ? list.max_men : list.max_women;

  if (countByGender >= max) {
    return { allowed: false, reason: "quota_full" };
  }

  return { allowed: true };
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- guestList`
Expected: PASS (5 tests).

- [ ] **Step 9: Write the failing tests for classification validation**

```typescript
import { describe, it, expect } from "vitest";
import { classificationSchema } from "@/lib/validation/schemas";

describe("classificationSchema", () => {
  it("accepts tudo_vip with no extra fields", () => {
    const result = classificationSchema.safeParse({ type: "tudo_vip" });
    expect(result.success).toBe(true);
  });

  it("requires vip_until_time for vip_ate_hora", () => {
    const result = classificationSchema.safeParse({ type: "vip_ate_hora" });
    expect(result.success).toBe(false);
  });

  it("accepts vip_ate_hora with vip_until_time", () => {
    const result = classificationSchema.safeParse({
      type: "vip_ate_hora",
      vip_until_time: "23:00",
    });
    expect(result.success).toBe(true);
  });

  it("requires value_male and value_female for valor_genero", () => {
    const result = classificationSchema.safeParse({ type: "valor_genero" });
    expect(result.success).toBe(false);
  });

  it("accepts valor_genero with both values", () => {
    const result = classificationSchema.safeParse({
      type: "valor_genero",
      value_male: 200,
      value_female: 100,
    });
    expect(result.success).toBe(true);
  });

  it("accepts pagar_antecipado with an optional note", () => {
    const result = classificationSchema.safeParse({
      type: "pagar_antecipado",
      advance_payment_note: "Pix até sexta",
    });
    expect(result.success).toBe(true);
  });
});
```

Save as `lib/domain/classification.test.ts` (it exercises `classificationSchema`, kept in `lib/validation/schemas.ts` since it's a Zod schema, not a plain function — the test file documents classification's *domain* rules, so it stays alongside the other domain tests).

- [ ] **Step 10: Run the test to verify it fails**

Run: `npm test -- classification`
Expected: FAIL — `Cannot find module '@/lib/validation/schemas'`.

- [ ] **Step 11: Implement the Zod schemas, including `classificationSchema`**

```typescript
import { z } from "zod";

export const createRequestSchema = z.object({
  requester_name: z.string().min(2, "Nome muito curto"),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  event_time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  quantity: z.number().int().positive(),
  instagram: z.string().min(2, "Informe o Instagram"),
  whatsapp: z.string().min(8, "Informe um WhatsApp válido"),
  referred_by_profile_id: z.string().uuid().nullable().optional(),
});

export const decisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approve") }),
  z.object({
    decision: z.literal("deny"),
    denial_reason: z.string().min(3, "Informe o motivo"),
  }),
]);

export const classificationSchema = z
  .object({
    type: z.enum(["tudo_vip", "vip_ate_hora", "valor_genero", "pagar_antecipado"]),
    vip_until_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    value_male: z.number().nonnegative().optional(),
    value_female: z.number().nonnegative().optional(),
    advance_payment_note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "vip_ate_hora" && !data.vip_until_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vip_until_time"],
        message: "Informe até que horário vale o VIP",
      });
    }
    if (data.type === "valor_genero" && (data.value_male === undefined || data.value_female === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value_male"],
        message: "Informe o valor para homens e mulheres",
      });
    }
  });

export const guestListSchema = z.object({
  max_men: z.number().int().nonnegative(),
  max_women: z.number().int().nonnegative(),
  deadline_at: z.string().datetime({ message: "Data limite inválida" }),
});

export const guestListEntrySchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  gender: z.enum(["male", "female"]),
});

export const houseRulesSchema = z.object({
  content: z.string(),
});
```

- [ ] **Step 12: Run the test to verify it passes**

Run: `npm test -- classification`
Expected: PASS (6 tests).

- [ ] **Step 13: Run the full test suite**

Run: `npm test`
Expected: all 14 tests pass (3 + 5 + 6).

- [ ] **Step 14: Commit**

```bash
git add lib/domain/ lib/validation/
git commit -m "feat: add domain validation library with unit tests"
```

---

## Task 5: Public Availability API

**Files:**
- Create: `app/api/availability/route.ts`
- Test: `app/api/availability/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

const mockSelect = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    from: () => ({
      select: mockSelect,
    }),
  }),
}));

describe("GET /api/availability", () => {
  beforeEach(() => {
    mockSelect.mockReset();
  });

  it("returns 400 when venue query param is missing", async () => {
    const req = new NextRequest("http://localhost/api/availability");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns the open slots for the venue", async () => {
    mockSelect.mockReturnValue({
      eq: () => ({
        gte: () =>
          Promise.resolve({
            data: [{ id: "1", venue_id: "v1", event_date: "2099-01-01", time: "22:00", is_open: true }],
            error: null,
          }),
      }),
    });

    const req = new NextRequest("http://localhost/api/availability?venue=300-sky-bar");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.slots).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- api/availability`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Implement the route handler**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const venueSlug = req.nextUrl.searchParams.get("venue");

  if (!venueSlug) {
    return NextResponse.json({ error: "venue query param is required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("availability_slots")
    .select("id, venue_id, event_date, time, is_open")
    .eq("is_open", true)
    .gte("event_date", today);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ slots: data ?? [] });
}
```

Note: this queries `availability_slots` directly without joining on venue slug for simplicity in the MVP (single venue). The `venue` param is validated as present but not yet used to filter — this is safe because there is only one venue row. Task note for future multi-venue work: join through `venues.slug`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- api/availability`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/availability/
git commit -m "feat: add public availability API route"
```

---

## Task 6: Public Guest Request Form

**Files:**
- Create: `app/api/requests/route.ts`
- Test: `app/api/requests/route.test.ts`
- Create: `app/(public)/[venueSlug]/pedido/page.tsx`
- Create: `app/(public)/[venueSlug]/pedido/RequestForm.tsx`
- Test: `app/(public)/[venueSlug]/pedido/RequestForm.test.tsx`

- [ ] **Step 1: Write the failing test for the POST route**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockInsert = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/requests", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/requests", () => {
  beforeEach(() => {
    mockInsert.mockReset();
  });

  it("rejects an invalid payload", async () => {
    const res = await POST(makeRequest({ requester_name: "a" }));
    expect(res.status).toBe(400);
  });

  it("inserts a valid request and returns 201", async () => {
    mockInsert.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: { id: "req-1" },
            error: null,
          }),
      }),
    });

    const res = await POST(
      makeRequest({
        requester_name: "Camila Souza",
        event_date: "2099-01-01",
        event_time: "22:00",
        quantity: 12,
        instagram: "camila.s",
        whatsapp: "+5511999999999",
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("req-1");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        requester_name: "Camila Souza",
        venue_id: "00000000-0000-0000-0000-000000000001",
        status: "pending",
      })
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- api/requests`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Implement the POST route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createRequestSchema } from "@/lib/validation/schemas";

const DEFAULT_VENUE_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = createRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("requests")
    .insert({
      venue_id: DEFAULT_VENUE_ID,
      requester_name: parsed.data.requester_name,
      event_date: parsed.data.event_date,
      event_time: parsed.data.event_time,
      quantity: parsed.data.quantity,
      instagram: parsed.data.instagram,
      whatsapp: parsed.data.whatsapp,
      referred_by_profile_id: parsed.data.referred_by_profile_id ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- api/requests`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for the form component**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestForm } from "./RequestForm";

describe("RequestForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "req-1" }),
    })) as unknown as typeof fetch;
  });

  it("submits the form and shows a confirmation", async () => {
    render(<RequestForm venueSlug="300-sky-bar" />);

    await userEvent.type(screen.getByLabelText(/nome/i), "Camila Souza");
    await userEvent.type(screen.getByLabelText(/quantidade/i), "12");
    await userEvent.type(screen.getByLabelText(/instagram/i), "camila.s");
    await userEvent.type(screen.getByLabelText(/whatsapp/i), "+5511999999999");
    await userEvent.click(screen.getByRole("button", { name: /enviar pedido/i }));

    await waitFor(() => {
      expect(screen.getByText(/pedido enviado/i)).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/requests",
      expect.objectContaining({ method: "POST" })
    );
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- RequestForm`
Expected: FAIL — `Cannot find module './RequestForm'`.

- [ ] **Step 7: Implement `RequestForm`**

```tsx
"use client";

import { useState, type FormEvent } from "react";

export function RequestForm({ venueSlug }: { venueSlug: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      requester_name: String(form.get("requester_name") ?? ""),
      event_date: String(form.get("event_date") ?? ""),
      event_time: String(form.get("event_time") ?? ""),
      quantity: Number(form.get("quantity") ?? 0),
      instagram: String(form.get("instagram") ?? ""),
      whatsapp: String(form.get("whatsapp") ?? ""),
    };

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Não deu pra enviar o pedido. Confira os dados e tente de novo.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="rounded-card border border-border bg-surface p-6 text-ink">
        Pedido enviado! A equipe do {venueSlug.replace(/-/g, " ")} vai avaliar e te
        avisar pelo WhatsApp.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Nome
        <input
          name="requester_name"
          required
          minLength={2}
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Data
        <input
          name="event_date"
          type="date"
          required
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Horário
        <input
          name="event_time"
          type="time"
          required
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Quantidade de pessoas
        <input
          name="quantity"
          type="number"
          min={1}
          required
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Instagram
        <input
          name="instagram"
          required
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        WhatsApp
        <input
          name="whatsapp"
          required
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      {error && <p className="text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-card bg-gold px-4 py-3 font-semibold text-bg disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar pedido"}
      </button>
    </form>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- RequestForm`
Expected: PASS (1 test).

- [ ] **Step 9: Wire the page**

```tsx
import { RequestForm } from "./RequestForm";

export default function PedidoPage({ params }: { params: { venueSlug: string } }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <h1 className="font-display text-2xl text-gold">Peça sua data</h1>
      <RequestForm venueSlug={params.venueSlug} />
    </main>
  );
}
```

- [ ] **Step 10: Run the full suite and commit**

Run: `npm test`
Expected: all previous tests plus 3 new tests pass.

```bash
git add app/api/requests/ "app/(public)/"
git commit -m "feat: add public guest request form and API"
```

---

## Task 7: Admin Auth

**Files:**
- Create: `middleware.ts`
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/login/LoginForm.tsx`
- Test: `app/admin/login/LoginForm.test.tsx`
- Create: `app/admin/layout.tsx`

- [ ] **Step 1: Write the failing test for the login form**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";

const mockSignIn = vi.fn();
const mockPush = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signInWithPassword: mockSignIn },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockPush.mockReset();
  });

  it("shows an error on invalid credentials", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/email/i), "admin@300skybar.com");
    await userEvent.type(screen.getByLabelText(/senha/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/e-mail ou senha inválidos/i)).toBeInTheDocument();
    });
  });

  it("redirects to /admin on success", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/email/i), "admin@300skybar.com");
    await userEvent.type(screen.getByLabelText(/senha/i), "correct-password");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin");
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- LoginForm`
Expected: FAIL — `Cannot find module './LoginForm'`.

- [ ] **Step 3: Implement `LoginForm`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    setLoading(false);

    if (error) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    router.push("/admin");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Email
        <input
          name="email"
          type="email"
          required
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Senha
        <input
          name="password"
          type="password"
          required
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>

      {error && <p className="text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-card bg-gold px-4 py-3 font-semibold text-bg disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- LoginForm`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the login page**

```tsx
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="font-display text-2xl text-gold">ItsMyBday — Admin</h1>
      <LoginForm />
    </main>
  );
}
```

- [ ] **Step 6: Add middleware that protects `/admin/*` (except `/admin/login`)**

```typescript
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname === "/admin/login") {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 7: Add the protected admin layout with a sign-out control**

```tsx
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen">
      <nav className="flex gap-4 border-b border-border bg-surface p-4 text-sm">
        <Link href="/admin" className="text-gold">Pedidos</Link>
        <Link href="/admin/disponibilidade" className="text-muted hover:text-ink">Disponibilidade</Link>
        <Link href="/admin/regras" className="text-muted hover:text-ink">Regras da casa</Link>
        <Link href="/admin/integracoes" className="text-muted hover:text-ink">Integrações</Link>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 8: Run the full suite and commit**

Run: `npm test`
Expected: all previous tests plus 2 new tests pass.

```bash
git add middleware.ts app/admin/login/ app/admin/layout.tsx
git commit -m "feat: add admin authentication (login, protected layout, middleware)"
```

---

## Task 8: Admin Dashboard — Pending Requests (Realtime)

**Files:**
- Create: `app/admin/page.tsx`
- Create: `app/admin/RequestsList.tsx`
- Test: `app/admin/RequestsList.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RequestsList } from "./RequestsList";
import type { GuestRequest } from "@/lib/types";

const mockOn = vi.fn().mockReturnThis();
const mockSubscribe = vi.fn().mockReturnThis();
const mockRemoveChannel = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    channel: () => ({ on: mockOn, subscribe: mockSubscribe }),
    removeChannel: mockRemoveChannel,
  }),
}));

const pendingRequest: GuestRequest = {
  id: "r1",
  venue_id: "v1",
  requester_name: "Camila Souza",
  event_date: "2099-01-01",
  event_time: "22:00",
  quantity: 12,
  instagram: "camila.s",
  whatsapp: "+5511999999999",
  referred_by_profile_id: null,
  status: "pending",
  denial_reason: null,
  created_at: "2098-01-01T00:00:00.000Z",
};

describe("RequestsList", () => {
  beforeEach(() => {
    mockOn.mockClear();
    mockSubscribe.mockClear();
    mockRemoveChannel.mockClear();
  });

  it("renders the initial pending requests", () => {
    render(<RequestsList initialRequests={[pendingRequest]} />);
    expect(screen.getByText("Camila Souza")).toBeInTheDocument();
    expect(screen.getByText(/12 pessoas/i)).toBeInTheDocument();
  });

  it("shows an empty state when there are no pending requests", () => {
    render(<RequestsList initialRequests={[]} />);
    expect(screen.getByText(/nenhum pedido pendente/i)).toBeInTheDocument();
  });

  it("subscribes to realtime updates on mount", () => {
    render(<RequestsList initialRequests={[]} />);
    expect(mockOn).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- RequestsList`
Expected: FAIL — `Cannot find module './RequestsList'`.

- [ ] **Step 3: Implement `RequestsList`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { GuestRequest } from "@/lib/types";

export function RequestsList({ initialRequests }: { initialRequests: GuestRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("requests-pending")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        () => {
          window.location.reload();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (requests.length === 0) {
    return <p className="text-muted">Nenhum pedido pendente.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {requests.map((request) => (
        <li key={request.id}>
          <Link
            href={`/admin/pedidos/${request.id}`}
            className="block rounded-card border border-border bg-surface p-4 hover:border-gold"
          >
            <p className="font-semibold text-ink">{request.requester_name}</p>
            <p className="text-sm text-muted">
              {request.event_date} · {request.quantity} pessoas · @{request.instagram}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

Note: on any change to `requests`, the realtime handler does a full page reload rather than patching local state. This is a deliberate MVP simplification — correct and simple, at the cost of a visible refresh. Revisit with incremental state updates if the reload proves disruptive in real use.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- RequestsList`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the dashboard page (Server Component, fetches initial data)**

```tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RequestsList } from "./RequestsList";

export default async function AdminDashboard() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-gold">Pedidos pendentes</h1>
      <RequestsList initialRequests={data ?? []} />
    </div>
  );
}
```

- [ ] **Step 6: Run the full suite and commit**

Run: `npm test`
Expected: all previous tests plus 3 new tests pass.

```bash
git add app/admin/page.tsx app/admin/RequestsList.tsx app/admin/RequestsList.test.tsx
git commit -m "feat: add admin dashboard with realtime pending requests list"
```

---

## Task 9: Approve/Deny Flow

**Files:**
- Create: `app/api/requests/[id]/decision/route.ts`
- Test: `app/api/requests/[id]/decision/route.test.ts`
- Create: `app/admin/pedidos/[id]/page.tsx`
- Create: `app/admin/pedidos/[id]/DecisionPanel.tsx`
- Test: `app/admin/pedidos/[id]/DecisionPanel.test.tsx`

- [ ] **Step 1: Write the failing test for the decision route**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getSession: mockGetSession },
    from: (table: string) => {
      if (table === "requests") {
        return { update: mockUpdate };
      }
      return { insert: mockInsert };
    },
  }),
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/requests/req-1/decision", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/requests/[id]/decision", () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockInsert.mockReset();
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "admin-1" } } } });
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const res = await POST(makeRequest({ decision: "approve" }), { params: { id: "req-1" } });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid payload", async () => {
    const res = await POST(makeRequest({ decision: "deny" }), { params: { id: "req-1" } });
    expect(res.status).toBe(400);
  });

  it("approves and creates getin + whatsapp integration events", async () => {
    mockUpdate.mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    mockInsert.mockResolvedValue({ error: null });

    const res = await POST(makeRequest({ decision: "approve" }), { params: { id: "req-1" } });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", decided_by: "admin-1" })
    );
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({ request_id: "req-1", type: "getin_reservation" }),
      expect.objectContaining({ request_id: "req-1", type: "whatsapp_notification" }),
    ]);
  });

  it("denies with a reason and creates a whatsapp integration event", async () => {
    mockUpdate.mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    mockInsert.mockResolvedValue({ error: null });

    const res = await POST(
      makeRequest({ decision: "deny", denial_reason: "Lotação máxima pra essa data" }),
      { params: { id: "req-1" } }
    );

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "denied", denial_reason: "Lotação máxima pra essa data" })
    );
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({ request_id: "req-1", type: "whatsapp_notification" }),
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- decision`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Implement the decision route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decisionSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = decisionSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const requestId = params.id;

  if (parsed.data.decision === "approve") {
    const { error: updateError } = await supabase
      .from("requests")
      .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: session.user.id })
      .eq("id", requestId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: eventsError } = await supabase.from("integration_events").insert([
      { request_id: requestId, type: "getin_reservation", status: "pending_manual", payload: {} },
      {
        request_id: requestId,
        type: "whatsapp_notification",
        status: "pending_manual",
        payload: { kind: "approval" },
      },
    ]);

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 });
    }

    return NextResponse.json({ status: "approved" });
  }

  const { error: updateError } = await supabase
    .from("requests")
    .update({
      status: "denied",
      denial_reason: parsed.data.denial_reason,
      decided_at: new Date().toISOString(),
      decided_by: session.user.id,
    })
    .eq("id", requestId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: eventError } = await supabase.from("integration_events").insert([
    {
      request_id: requestId,
      type: "whatsapp_notification",
      status: "pending_manual",
      payload: { kind: "denial", reason: parsed.data.denial_reason },
    },
  ]);

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  return NextResponse.json({ status: "denied" });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- decision`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing test for `DecisionPanel`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecisionPanel } from "./DecisionPanel";

describe("DecisionPanel", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ status: "approved" }) })) as unknown as typeof fetch;
  });

  it("approves with one click", async () => {
    render(<DecisionPanel requestId="req-1" />);
    await userEvent.click(screen.getByRole("button", { name: /aceitar/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/requests/req-1/decision",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ decision: "approve" }) })
      );
    });
  });

  it("requires a reason before denying", async () => {
    render(<DecisionPanel requestId="req-1" />);
    await userEvent.click(screen.getByRole("button", { name: /negar/i }));

    expect(screen.getByLabelText(/motivo/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(global.fetch).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText(/motivo/i), "Lotação máxima pra essa data");
    await userEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/requests/req-1/decision",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ decision: "deny", denial_reason: "Lotação máxima pra essa data" }),
        })
      );
    });
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- DecisionPanel`
Expected: FAIL — `Cannot find module './DecisionPanel'`.

- [ ] **Step 7: Implement `DecisionPanel`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REASON_SUGGESTIONS = [
  "Casa alugada para evento",
  "Lotação máxima para essa data",
  "Quer tentar outra data?",
];

export function DecisionPanel({ requestId }: { requestId: string }) {
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();

  async function approve() {
    await fetch(`/api/requests/${requestId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "approve" }),
    });
    router.refresh();
  }

  async function confirmDeny() {
    if (reason.trim().length < 3) return;

    await fetch(`/api/requests/${requestId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "deny", denial_reason: reason }),
    });
    router.refresh();
  }

  if (showDenyForm) {
    return (
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Motivo
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-card border border-border bg-bg p-3 text-ink"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {REASON_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setReason(suggestion)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-gold hover:text-ink"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={confirmDeny}
          className="rounded-card bg-danger px-4 py-2 font-semibold text-ink"
        >
          Confirmar
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={approve}
        className="rounded-card bg-gold px-4 py-2 font-semibold text-bg"
      >
        Aceitar
      </button>
      <button
        type="button"
        onClick={() => setShowDenyForm(true)}
        className="rounded-card border border-border px-4 py-2 text-muted hover:text-ink"
      >
        Negar
      </button>
    </div>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- DecisionPanel`
Expected: PASS (2 tests).

- [ ] **Step 9: Wire the request detail page**

```tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DecisionPanel } from "./DecisionPanel";

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: request } = await supabase
    .from("requests")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!request) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-gold">{request.requester_name}</h1>
        <p className="text-muted">
          {request.event_date} às {request.event_time} · {request.quantity} pessoas · @
          {request.instagram} · {request.whatsapp}
        </p>
        <p className="mt-2 text-sm uppercase tracking-wide text-muted">Status: {request.status}</p>
      </div>

      {request.status === "pending" && <DecisionPanel requestId={request.id} />}

      {request.status === "denied" && request.denial_reason && (
        <p className="text-danger">Negado: {request.denial_reason}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 10: Run the full suite and commit**

Run: `npm test`
Expected: all previous tests plus 6 new tests pass.

```bash
git add app/api/requests/\[id\]/decision/ "app/admin/pedidos/"
git commit -m "feat: add approve/deny flow with integration event stubs"
```

---

## Task 10: Classification Flow

**Files:**
- Create: `app/api/requests/[id]/classification/route.ts`
- Test: `app/api/requests/[id]/classification/route.test.ts`
- Create: `app/admin/pedidos/[id]/ClassificationForm.tsx`
- Test: `app/admin/pedidos/[id]/ClassificationForm.test.tsx`
- Modify: `app/admin/pedidos/[id]/page.tsx`

- [ ] **Step 1: Write the failing test for the classification route**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockGetSession = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getSession: mockGetSession },
    from: () => ({ upsert: mockUpsert }),
  }),
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/requests/req-1/classification", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/requests/[id]/classification", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockUpsert.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "admin-1" } } } });
  });

  it("returns 401 without a session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const res = await POST(makeRequest({ type: "tudo_vip" }), { params: { id: "req-1" } });
    expect(res.status).toBe(401);
  });

  it("rejects vip_ate_hora without vip_until_time", async () => {
    const res = await POST(makeRequest({ type: "vip_ate_hora" }), { params: { id: "req-1" } });
    expect(res.status).toBe(400);
  });

  it("saves a valid classification", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const res = await POST(
      makeRequest({ type: "valor_genero", value_male: 200, value_female: 100 }),
      { params: { id: "req-1" } }
    );

    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: "req-1",
        type: "valor_genero",
        value_male: 200,
        value_female: 100,
      }),
      { onConflict: "request_id" }
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- classification/route`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Implement the classification route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { classificationSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = classificationSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await supabase.from("classifications").upsert(
    {
      request_id: params.id,
      type: parsed.data.type,
      vip_until_time: parsed.data.vip_until_time ?? null,
      value_male: parsed.data.value_male ?? null,
      value_female: parsed.data.value_female ?? null,
      advance_payment_note: parsed.data.advance_payment_note ?? null,
    },
    { onConflict: "request_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "classified" });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- classification/route`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing test for `ClassificationForm`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClassificationForm } from "./ClassificationForm";

describe("ClassificationForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ status: "classified" }) })) as unknown as typeof fetch;
  });

  it("submits valor_genero with both values", async () => {
    render(<ClassificationForm requestId="req-1" />);

    await userEvent.selectOptions(screen.getByLabelText(/tipo/i), "valor_genero");
    await userEvent.type(screen.getByLabelText(/valor homem/i), "200");
    await userEvent.type(screen.getByLabelText(/valor mulher/i), "100");
    await userEvent.click(screen.getByRole("button", { name: /salvar classificação/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/requests/req-1/classification",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ type: "valor_genero", value_male: 200, value_female: 100 }),
        })
      );
    });
  });

  it("shows only the vip_until_time field for vip_ate_hora", async () => {
    render(<ClassificationForm requestId="req-1" />);
    await userEvent.selectOptions(screen.getByLabelText(/tipo/i), "vip_ate_hora");

    expect(screen.getByLabelText(/até que horário/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/valor homem/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- ClassificationForm`
Expected: FAIL — `Cannot find module './ClassificationForm'`.

- [ ] **Step 7: Implement `ClassificationForm`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ClassificationType } from "@/lib/types";

const LABELS: Record<ClassificationType, string> = {
  tudo_vip: "Tudo VIP",
  vip_ate_hora: "VIP até X hora",
  valor_genero: "Valor por gênero",
  pagar_antecipado: "Pagar valor antecipado",
};

export function ClassificationForm({ requestId }: { requestId: string }) {
  const [type, setType] = useState<ClassificationType>("tudo_vip");
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const payload: Record<string, unknown> = { type };

    if (type === "vip_ate_hora") {
      payload.vip_until_time = String(form.get("vip_until_time") ?? "");
    }
    if (type === "valor_genero") {
      payload.value_male = Number(form.get("value_male") ?? 0);
      payload.value_female = Number(form.get("value_female") ?? 0);
    }
    if (type === "pagar_antecipado") {
      payload.advance_payment_note = String(form.get("advance_payment_note") ?? "");
    }

    await fetch(`/api/requests/${requestId}/classification`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Tipo
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ClassificationType)}
          className="rounded-card border border-border bg-bg p-3 text-ink"
        >
          {Object.entries(LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {type === "vip_ate_hora" && (
        <label className="flex flex-col gap-1 text-sm text-muted">
          Até que horário
          <input
            name="vip_until_time"
            type="time"
            required
            className="rounded-card border border-border bg-bg p-3 text-ink"
          />
        </label>
      )}

      {type === "valor_genero" && (
        <>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Valor homem (R$)
            <input
              name="value_male"
              type="number"
              min={0}
              step="0.01"
              required
              className="rounded-card border border-border bg-bg p-3 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Valor mulher (R$)
            <input
              name="value_female"
              type="number"
              min={0}
              step="0.01"
              required
              className="rounded-card border border-border bg-bg p-3 text-ink"
            />
          </label>
        </>
      )}

      {type === "pagar_antecipado" && (
        <label className="flex flex-col gap-1 text-sm text-muted">
          Observação (opcional)
          <input
            name="advance_payment_note"
            className="rounded-card border border-border bg-bg p-3 text-ink"
          />
        </label>
      )}

      <button type="submit" className="rounded-card bg-gold px-4 py-2 font-semibold text-bg">
        Salvar classificação
      </button>
    </form>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- ClassificationForm`
Expected: PASS (2 tests).

- [ ] **Step 9: Wire `ClassificationForm` into the request detail page**

```tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DecisionPanel } from "./DecisionPanel";
import { ClassificationForm } from "./ClassificationForm";

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: request } = await supabase
    .from("requests")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!request) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-gold">{request.requester_name}</h1>
        <p className="text-muted">
          {request.event_date} às {request.event_time} · {request.quantity} pessoas · @
          {request.instagram} · {request.whatsapp}
        </p>
        <p className="mt-2 text-sm uppercase tracking-wide text-muted">Status: {request.status}</p>
      </div>

      {request.status === "pending" && <DecisionPanel requestId={request.id} />}

      {request.status === "denied" && request.denial_reason && (
        <p className="text-danger">Negado: {request.denial_reason}</p>
      )}

      {request.status === "approved" && <ClassificationForm requestId={request.id} />}
    </div>
  );
}
```

- [ ] **Step 10: Run the full suite and commit**

Run: `npm test`
Expected: all previous tests plus 5 new tests pass.

```bash
git add app/api/requests/\[id\]/classification/ app/admin/pedidos/\[id\]/ClassificationForm.tsx \
  app/admin/pedidos/\[id\]/ClassificationForm.test.tsx app/admin/pedidos/\[id\]/page.tsx
git commit -m "feat: add request classification flow"
```

---

## Task 11: Guest List Creation and Shareable Link

**Files:**
- Create: `app/api/requests/[id]/guest-list/route.ts`
- Test: `app/api/requests/[id]/guest-list/route.test.ts`
- Create: `app/admin/pedidos/[id]/GuestListForm.tsx`
- Test: `app/admin/pedidos/[id]/GuestListForm.test.tsx`
- Modify: `app/admin/pedidos/[id]/page.tsx`

- [ ] **Step 1: Write the failing test for the guest-list creation route**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockGetSession = vi.fn();
const mockInsert = vi.fn();
const mockEventsInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getSession: mockGetSession },
    from: (table: string) => {
      if (table === "guest_lists") {
        return { insert: mockInsert };
      }
      return { insert: mockEventsInsert };
    },
  }),
}));

vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto");
  return { ...actual, randomUUID: () => "fixed-token-1234" };
});

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/requests/req-1/guest-list", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/requests/[id]/guest-list", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockInsert.mockReset();
    mockEventsInsert.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "admin-1" } } } });
  });

  it("returns 401 without a session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const res = await POST(makeRequest({ max_men: 2, max_women: 2, deadline_at: "2099-01-01T20:00:00.000Z" }), {
      params: { id: "req-1" },
    });
    expect(res.status).toBe(401);
  });

  it("creates the guest list with a generated share token and a whatsapp event", async () => {
    mockInsert.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "gl-1", share_token: "fixed-token-1234" }, error: null }),
      }),
    });
    mockEventsInsert.mockResolvedValue({ error: null });

    const res = await POST(
      makeRequest({ max_men: 2, max_women: 2, deadline_at: "2099-01-01T20:00:00.000Z" }),
      { params: { id: "req-1" } }
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.share_token).toBe("fixed-token-1234");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ request_id: "req-1", max_men: 2, max_women: 2, share_token: "fixed-token-1234" })
    );
    expect(mockEventsInsert).toHaveBeenCalledWith([
      expect.objectContaining({ request_id: "req-1", type: "whatsapp_notification", payload: { kind: "guest_list_link", share_token: "fixed-token-1234" } }),
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- guest-list/route`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Implement the guest-list creation route**

```typescript
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { guestListSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = guestListSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const shareToken = randomUUID();

  const { data, error } = await supabase
    .from("guest_lists")
    .insert({
      request_id: params.id,
      max_men: parsed.data.max_men,
      max_women: parsed.data.max_women,
      deadline_at: parsed.data.deadline_at,
      share_token: shareToken,
    })
    .select("id, share_token")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: eventError } = await supabase.from("integration_events").insert([
    {
      request_id: params.id,
      type: "whatsapp_notification",
      status: "pending_manual",
      payload: { kind: "guest_list_link", share_token: data.share_token },
    },
  ]);

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, share_token: data.share_token }, { status: 201 });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- guest-list/route`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for `GuestListForm`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuestListForm } from "./GuestListForm";

describe("GuestListForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "gl-1", share_token: "abc123" }),
    })) as unknown as typeof fetch;
  });

  it("creates the list and shows the shareable link", async () => {
    render(<GuestListForm requestId="req-1" />);

    await userEvent.type(screen.getByLabelText(/máximo de homens/i), "10");
    await userEvent.type(screen.getByLabelText(/máximo de mulheres/i), "10");
    await userEvent.type(screen.getByLabelText(/horário limite/i), "2099-01-01T20:00");
    await userEvent.click(screen.getByRole("button", { name: /gerar lista/i }));

    await waitFor(() => {
      expect(screen.getByText(/\/lista\/abc123/)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- GuestListForm`
Expected: FAIL — `Cannot find module './GuestListForm'`.

- [ ] **Step 7: Implement `GuestListForm`**

```tsx
"use client";

import { useState, type FormEvent } from "react";

export function GuestListForm({ requestId }: { requestId: string }) {
  const [shareToken, setShareToken] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const payload = {
      max_men: Number(form.get("max_men") ?? 0),
      max_women: Number(form.get("max_women") ?? 0),
      deadline_at: new Date(String(form.get("deadline_at"))).toISOString(),
    };

    const res = await fetch(`/api/requests/${requestId}/guest-list`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    setShareToken(body.share_token);
  }

  if (shareToken) {
    return (
      <p className="rounded-card border border-border bg-surface p-4 text-ink">
        Lista criada! Link: <span className="text-gold">/lista/{shareToken}</span>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Máximo de homens
        <input name="max_men" type="number" min={0} required className="rounded-card border border-border bg-bg p-3 text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Máximo de mulheres
        <input name="max_women" type="number" min={0} required className="rounded-card border border-border bg-bg p-3 text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Horário limite pra acrescentar nomes
        <input name="deadline_at" type="datetime-local" required className="rounded-card border border-border bg-bg p-3 text-ink" />
      </label>
      <button type="submit" className="rounded-card bg-gold px-4 py-2 font-semibold text-bg">
        Gerar lista
      </button>
    </form>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- GuestListForm`
Expected: PASS (1 test).

- [ ] **Step 9: Wire `GuestListForm` into the request detail page (shown once classified)**

```tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DecisionPanel } from "./DecisionPanel";
import { ClassificationForm } from "./ClassificationForm";
import { GuestListForm } from "./GuestListForm";

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: request } = await supabase
    .from("requests")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!request) {
    notFound();
  }

  const { data: classification } = await supabase
    .from("classifications")
    .select("*")
    .eq("request_id", params.id)
    .maybeSingle();

  const { data: guestList } = await supabase
    .from("guest_lists")
    .select("*")
    .eq("request_id", params.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-gold">{request.requester_name}</h1>
        <p className="text-muted">
          {request.event_date} às {request.event_time} · {request.quantity} pessoas · @
          {request.instagram} · {request.whatsapp}
        </p>
        <p className="mt-2 text-sm uppercase tracking-wide text-muted">Status: {request.status}</p>
      </div>

      {request.status === "pending" && <DecisionPanel requestId={request.id} />}

      {request.status === "denied" && request.denial_reason && (
        <p className="text-danger">Negado: {request.denial_reason}</p>
      )}

      {request.status === "approved" && !classification && <ClassificationForm requestId={request.id} />}

      {request.status === "approved" && classification && !guestList && (
        <GuestListForm requestId={request.id} />
      )}

      {guestList && (
        <p className="rounded-card border border-border bg-surface p-4 text-ink">
          Lista ativa: <span className="text-gold">/lista/{guestList.share_token}</span> · limite{" "}
          {new Date(guestList.deadline_at).toLocaleString("pt-BR")}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 10: Run the full suite and commit**

Run: `npm test`
Expected: all previous tests plus 3 new tests pass.

```bash
git add app/api/requests/\[id\]/guest-list/ app/admin/pedidos/\[id\]/GuestListForm.tsx \
  app/admin/pedidos/\[id\]/GuestListForm.test.tsx app/admin/pedidos/\[id\]/page.tsx
git commit -m "feat: add guest list creation with shareable link"
```

---

## Task 12: Public Shareable List Page

**Files:**
- Create: `app/api/lists/[token]/route.ts`
- Test: `app/api/lists/[token]/route.test.ts`
- Create: `app/api/lists/[token]/entries/route.ts`
- Test: `app/api/lists/[token]/entries/route.test.ts`
- Create: `app/lista/[token]/page.tsx`
- Create: `app/lista/[token]/EntryForm.tsx`
- Test: `app/lista/[token]/EntryForm.test.tsx`

- [ ] **Step 1: Write the failing test for GET list info**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

const mockSingle = vi.fn();
const mockEntriesSelect = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    from: (table: string) => {
      if (table === "guest_lists") {
        return { select: () => ({ eq: () => ({ single: mockSingle }) }) };
      }
      return { select: () => ({ eq: mockEntriesSelect }) };
    },
  }),
}));

describe("GET /api/lists/[token]", () => {
  beforeEach(() => {
    mockSingle.mockReset();
    mockEntriesSelect.mockReset();
  });

  it("returns 404 when the token does not match any list", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });
    const res = await GET(new NextRequest("http://localhost/api/lists/bad-token"), {
      params: { token: "bad-token" },
    });
    expect(res.status).toBe(404);
  });

  it("returns the list with its entries", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "gl-1", max_men: 2, max_women: 2, deadline_at: "2099-01-01T00:00:00.000Z", share_token: "tok" },
      error: null,
    });
    mockEntriesSelect.mockResolvedValue({ data: [{ id: "e1", name: "João", gender: "male" }], error: null });

    const res = await GET(new NextRequest("http://localhost/api/lists/tok"), { params: { token: "tok" } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.list.id).toBe("gl-1");
    expect(body.entries).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lists/\[token\]/route`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Implement the GET list-info route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = createSupabaseServiceClient();

  const { data: list, error } = await supabase
    .from("guest_lists")
    .select("id, max_men, max_women, deadline_at, share_token")
    .eq("share_token", params.token)
    .single();

  if (error || !list) {
    return NextResponse.json({ error: "list not found" }, { status: 404 });
  }

  const { data: entries } = await supabase
    .from("guest_list_entries")
    .select("id, name, gender")
    .eq("guest_list_id", list.id);

  return NextResponse.json({ list, entries: entries ?? [] });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lists/\[token\]/route`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for POST entry (capacity + deadline enforcement)**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockListSingle = vi.fn();
const mockEntriesSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    from: (table: string) => {
      if (table === "guest_lists") {
        return { select: () => ({ eq: () => ({ single: mockListSingle }) }) };
      }
      if (table === "guest_list_entries") {
        return {
          select: () => ({ eq: mockEntriesSelect }),
          insert: mockInsert,
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/lists/tok/entries", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/lists/[token]/entries", () => {
  beforeEach(() => {
    mockListSingle.mockReset();
    mockEntriesSelect.mockReset();
    mockInsert.mockReset();
    mockListSingle.mockResolvedValue({
      data: { id: "gl-1", max_men: 1, max_women: 1, deadline_at: "2099-01-01T00:00:00.000Z" },
      error: null,
    });
  });

  it("returns 404 for an unknown token", async () => {
    mockListSingle.mockResolvedValue({ data: null, error: { message: "not found" } });
    const res = await POST(makeRequest({ name: "João", gender: "male" }), { params: { token: "bad" } });
    expect(res.status).toBe(404);
  });

  it("rejects when the quota is full", async () => {
    mockEntriesSelect.mockResolvedValue({ data: [{ id: "e1", gender: "male" }], error: null });
    const res = await POST(makeRequest({ name: "Pedro", gender: "male" }), { params: { token: "tok" } });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.reason).toBe("quota_full");
  });

  it("adds the entry when there is room before the deadline", async () => {
    mockEntriesSelect.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });

    const res = await POST(makeRequest({ name: "João", gender: "male" }), { params: { token: "tok" } });

    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith({ guest_list_id: "gl-1", name: "João", gender: "male" });
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- lists/\[token\]/entries/route`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 7: Implement the POST entry route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { guestListEntrySchema } from "@/lib/validation/schemas";
import { canAddEntry } from "@/lib/domain/guestList";
import type { GuestList, GuestListEntry } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const json = await req.json();
  const parsed = guestListEntrySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: list, error: listError } = await supabase
    .from("guest_lists")
    .select("id, max_men, max_women, deadline_at, share_token")
    .eq("share_token", params.token)
    .single();

  if (listError || !list) {
    return NextResponse.json({ error: "list not found" }, { status: 404 });
  }

  const { data: existingEntries } = await supabase
    .from("guest_list_entries")
    .select("id, gender")
    .eq("guest_list_id", list.id);

  const result = canAddEntry(
    list as GuestList,
    (existingEntries ?? []) as GuestListEntry[],
    parsed.data.gender,
    new Date()
  );

  if (!result.allowed) {
    return NextResponse.json({ reason: result.reason }, { status: 409 });
  }

  const { error: insertError } = await supabase
    .from("guest_list_entries")
    .insert({ guest_list_id: list.id, name: parsed.data.name, gender: parsed.data.gender });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ status: "added" }, { status: 201 });
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- lists/\[token\]/entries/route`
Expected: PASS (3 tests).

- [ ] **Step 9: Write the failing test for `EntryForm`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryForm } from "./EntryForm";

describe("EntryForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ status: "added" }) })) as unknown as typeof fetch;
  });

  it("adds a name and clears the input", async () => {
    render(<EntryForm token="tok" />);

    await userEvent.type(screen.getByLabelText(/nome do convidado/i), "João");
    await userEvent.selectOptions(screen.getByLabelText(/gênero/i), "male");
    await userEvent.click(screen.getByRole("button", { name: /adicionar/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/lists/tok/entries",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "João", gender: "male" }) })
      );
    });
  });

  it("shows a quota-full message on 409", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 409, json: async () => ({ reason: "quota_full" }) })) as unknown as typeof fetch;
    render(<EntryForm token="tok" />);

    await userEvent.type(screen.getByLabelText(/nome do convidado/i), "João");
    await userEvent.selectOptions(screen.getByLabelText(/gênero/i), "male");
    await userEvent.click(screen.getByRole("button", { name: /adicionar/i }));

    await waitFor(() => {
      expect(screen.getByText(/vagas esgotadas/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 10: Run the test to verify it fails**

Run: `npm test -- EntryForm`
Expected: FAIL — `Cannot find module './EntryForm'`.

- [ ] **Step 11: Implement `EntryForm`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function EntryForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? ""),
      gender: String(data.get("gender") ?? "male"),
    };

    const res = await fetch(`/api/lists/${token}/entries`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 409) {
      const body = await res.json();
      setError(
        body.reason === "deadline_passed"
          ? "O horário limite pra essa lista já passou."
          : "Vagas esgotadas pra esse gênero."
      );
      return;
    }

    if (!res.ok) {
      setError("Não deu pra adicionar. Tenta de novo.");
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Nome do convidado
        <input name="name" required minLength={2} className="rounded-card border border-border bg-surface p-3 text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Gênero
        <select name="gender" className="rounded-card border border-border bg-surface p-3 text-ink">
          <option value="male">Homem</option>
          <option value="female">Mulher</option>
        </select>
      </label>
      {error && <p className="text-danger">{error}</p>}
      <button type="submit" className="rounded-card bg-gold px-4 py-2 font-semibold text-bg">
        Adicionar
      </button>
    </form>
  );
}
```

- [ ] **Step 12: Run the test to verify it passes**

Run: `npm test -- EntryForm`
Expected: PASS (2 tests).

- [ ] **Step 13: Wire the public list page**

```tsx
import { EntryForm } from "./EntryForm";

async function getListData(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/lists/${token}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function ListPage({ params }: { params: { token: string } }) {
  const data = await getListData(params.token);

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
        <p className="text-danger">Essa lista não existe ou o link está errado.</p>
      </main>
    );
  }

  const { list, entries } = data;
  const menCount = entries.filter((e: { gender: string }) => e.gender === "male").length;
  const womenCount = entries.filter((e: { gender: string }) => e.gender === "female").length;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <h1 className="font-display text-2xl text-gold">Lista de convidados</h1>
      <p className="text-muted">
        {menCount}/{list.max_men} homens · {womenCount}/{list.max_women} mulheres · limite{" "}
        {new Date(list.deadline_at).toLocaleString("pt-BR")}
      </p>
      <EntryForm token={params.token} />
      <ul className="flex flex-col gap-2">
        {entries.map((entry: { id: string; name: string; gender: string }) => (
          <li key={entry.id} className="rounded-card border border-border bg-surface p-3 text-ink">
            {entry.name} <span className="text-muted">({entry.gender === "male" ? "homem" : "mulher"})</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 14: Run the full suite and commit**

Run: `npm test`
Expected: all previous tests plus 7 new tests pass.

```bash
git add app/api/lists/ app/lista/
git commit -m "feat: add public shareable guest-list page with capacity and deadline checks"
```

---

## Task 13: House Rules Management

**Files:**
- Create: `app/api/house-rules/route.ts`
- Test: `app/api/house-rules/route.test.ts`
- Create: `app/admin/regras/page.tsx`
- Create: `app/admin/regras/HouseRulesForm.tsx`
- Test: `app/admin/regras/HouseRulesForm.test.tsx`

- [ ] **Step 1: Write the failing test for the house-rules route**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "./route";
import { NextRequest } from "next/server";

const mockGetSession = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getSession: mockGetSession },
    from: () => ({
      select: () => ({ eq: () => ({ single: mockSingle }) }),
      update: mockUpdate,
    }),
  }),
}));

describe("/api/house-rules", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockSingle.mockReset();
    mockUpdate.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "admin-1" } } } });
  });

  it("GET returns the current rules", async () => {
    mockSingle.mockResolvedValue({ data: { content: "Dress code: esporte fino." }, error: null });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.content).toBe("Dress code: esporte fino.");
  });

  it("PUT returns 401 without a session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const req = new NextRequest("http://localhost/api/house-rules", {
      method: "PUT",
      body: JSON.stringify({ content: "novo texto" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("PUT updates the rules", async () => {
    mockUpdate.mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    const req = new NextRequest("http://localhost/api/house-rules", {
      method: "PUT",
      body: JSON.stringify({ content: "novo texto" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ content: "novo texto", updated_at: expect.any(String) });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- house-rules`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Implement the house-rules route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { houseRulesSchema } from "@/lib/validation/schemas";

const DEFAULT_VENUE_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("house_rules")
    .select("content")
    .eq("venue_id", DEFAULT_VENUE_ID)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ content: data.content });
}

export async function PUT(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = houseRulesSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await supabase
    .from("house_rules")
    .update({ content: parsed.data.content, updated_at: new Date().toISOString() })
    .eq("venue_id", DEFAULT_VENUE_ID);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "updated" });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- house-rules`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing test for `HouseRulesForm`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HouseRulesForm } from "./HouseRulesForm";

describe("HouseRulesForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ status: "updated" }) })) as unknown as typeof fetch;
  });

  it("saves the edited content", async () => {
    render(<HouseRulesForm initialContent="Texto antigo" />);

    const textarea = screen.getByLabelText(/regras da casa/i);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Texto novo");
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/house-rules",
        expect.objectContaining({ method: "PUT", body: JSON.stringify({ content: "Texto novo" }) })
      );
    });
    expect(screen.getByText(/salvo/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- HouseRulesForm`
Expected: FAIL — `Cannot find module './HouseRulesForm'`.

- [ ] **Step 7: Implement `HouseRulesForm`**

```tsx
"use client";

import { useState, type FormEvent } from "react";

export function HouseRulesForm({ initialContent }: { initialContent: string }) {
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const form = new FormData(e.currentTarget);
    const content = String(form.get("content") ?? "");

    await fetch("/api/house-rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });

    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Regras da casa
        <textarea
          name="content"
          defaultValue={initialContent}
          rows={10}
          className="rounded-card border border-border bg-surface p-3 text-ink"
        />
      </label>
      <button type="submit" className="w-fit rounded-card bg-gold px-4 py-2 font-semibold text-bg">
        Salvar
      </button>
      {saved && <p className="text-gold">Salvo!</p>}
    </form>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- HouseRulesForm`
Expected: PASS (1 test).

- [ ] **Step 9: Wire the page**

```tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HouseRulesForm } from "./HouseRulesForm";

const DEFAULT_VENUE_ID = "00000000-0000-0000-0000-000000000001";

export default async function RegrasPage() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("house_rules")
    .select("content")
    .eq("venue_id", DEFAULT_VENUE_ID)
    .single();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-gold">Regras da casa</h1>
      <HouseRulesForm initialContent={data?.content ?? ""} />
    </div>
  );
}
```

- [ ] **Step 10: Run the full suite and commit**

Run: `npm test`
Expected: all previous tests plus 4 new tests pass.

```bash
git add app/api/house-rules/ app/admin/regras/
git commit -m "feat: add house rules management"
```

---

## Task 14: Availability Grid Management

**Files:**
- Create: `app/api/availability-admin/route.ts`
- Test: `app/api/availability-admin/route.test.ts`
- Create: `app/admin/disponibilidade/page.tsx`
- Create: `app/admin/disponibilidade/AvailabilityForm.tsx`
- Test: `app/admin/disponibilidade/AvailabilityForm.test.tsx`

- [ ] **Step 1: Write the failing test for the admin availability route**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockGetSession = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getSession: mockGetSession },
    from: () => ({ insert: mockInsert }),
  }),
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/availability-admin", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/availability-admin", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockInsert.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "admin-1" } } } });
  });

  it("returns 401 without a session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const res = await POST(makeRequest({ event_date: "2099-01-01", time: "22:00" }));
    expect(res.status).toBe(401);
  });

  it("rejects an invalid time format", async () => {
    const res = await POST(makeRequest({ event_date: "2099-01-01", time: "10pm" }));
    expect(res.status).toBe(400);
  });

  it("creates an open slot for the default venue", async () => {
    mockInsert.mockResolvedValue({ error: null });
    const res = await POST(makeRequest({ event_date: "2099-01-01", time: "22:00" }));
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith({
      venue_id: "00000000-0000-0000-0000-000000000001",
      event_date: "2099-01-01",
      time: "22:00",
      is_open: true,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- availability-admin`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Implement the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const DEFAULT_VENUE_ID = "00000000-0000-0000-0000-000000000001";

const slotSchema = z.object({
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = slotSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await supabase.from("availability_slots").insert({
    venue_id: DEFAULT_VENUE_ID,
    event_date: parsed.data.event_date,
    time: parsed.data.time,
    is_open: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "created" }, { status: 201 });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- availability-admin`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing test for `AvailabilityForm`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AvailabilityForm } from "./AvailabilityForm";

describe("AvailabilityForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ status: "created" }) })) as unknown as typeof fetch;
  });

  it("adds a new open slot", async () => {
    render(<AvailabilityForm />);

    await userEvent.type(screen.getByLabelText(/data/i), "2099-01-01");
    await userEvent.type(screen.getByLabelText(/horário/i), "22:00");
    await userEvent.click(screen.getByRole("button", { name: /adicionar horário/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/availability-admin",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ event_date: "2099-01-01", time: "22:00" }),
        })
      );
    });
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- AvailabilityForm`
Expected: FAIL — `Cannot find module './AvailabilityForm'`.

- [ ] **Step 7: Implement `AvailabilityForm`**

```tsx
"use client";

import { type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AvailabilityForm() {
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    await fetch("/api/availability-admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event_date: String(data.get("event_date") ?? ""),
        time: String(data.get("time") ?? ""),
      }),
    });

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 rounded-card border border-border bg-surface p-4">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Data
        <input name="event_date" type="date" required className="rounded-card border border-border bg-bg p-3 text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Horário
        <input name="time" type="time" required className="rounded-card border border-border bg-bg p-3 text-ink" />
      </label>
      <button type="submit" className="rounded-card bg-gold px-4 py-3 font-semibold text-bg">
        Adicionar horário
      </button>
    </form>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- AvailabilityForm`
Expected: PASS (1 test).

- [ ] **Step 9: Wire the page, listing existing slots grouped by date**

```tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AvailabilityForm } from "./AvailabilityForm";

export default async function DisponibilidadePage() {
  const supabase = createSupabaseServerClient();
  const { data: slots } = await supabase
    .from("availability_slots")
    .select("*")
    .order("event_date", { ascending: true })
    .order("time", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-gold">Disponibilidade</h1>
      <AvailabilityForm />
      <ul className="flex flex-col gap-2">
        {(slots ?? []).map((slot) => (
          <li key={slot.id} className="rounded-card border border-border bg-surface p-3 text-ink">
            {slot.event_date} · {slot.time} · {slot.is_open ? "aberto" : "fechado"}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 10: Run the full suite and commit**

Run: `npm test`
Expected: all previous tests plus 4 new tests pass.

```bash
git add app/api/availability-admin/ app/admin/disponibilidade/
git commit -m "feat: add admin availability grid management"
```

---

## Task 15: Integration Events Panel

**Files:**
- Create: `app/api/integration-events/[id]/resolve/route.ts`
- Test: `app/api/integration-events/[id]/resolve/route.test.ts`
- Create: `app/admin/integracoes/page.tsx`
- Create: `app/admin/integracoes/ResolveButton.tsx`
- Test: `app/admin/integracoes/ResolveButton.test.tsx`

- [ ] **Step 1: Write the failing test for the resolve route**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockGetSession = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getSession: mockGetSession },
    from: () => ({ update: mockUpdate }),
  }),
}));

describe("POST /api/integration-events/[id]/resolve", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockUpdate.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "admin-1" } } } });
  });

  it("returns 401 without a session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const res = await POST(new NextRequest("http://localhost/api/integration-events/ev-1/resolve", { method: "POST" }), {
      params: { id: "ev-1" },
    });
    expect(res.status).toBe(401);
  });

  it("marks the event as sent", async () => {
    mockUpdate.mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    const res = await POST(new NextRequest("http://localhost/api/integration-events/ev-1/resolve", { method: "POST" }), {
      params: { id: "ev-1" },
    });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ status: "sent", resolved_at: expect.any(String) });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- integration-events`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Implement the resolve route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("integration_events")
    .update({ status: "sent", resolved_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "resolved" });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- integration-events`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for `ResolveButton`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResolveButton } from "./ResolveButton";

describe("ResolveButton", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ status: "resolved" }) })) as unknown as typeof fetch;
  });

  it("calls the resolve endpoint on click", async () => {
    render(<ResolveButton eventId="ev-1" />);
    await userEvent.click(screen.getByRole("button", { name: /marcar como feito/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/integration-events/ev-1/resolve",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- ResolveButton`
Expected: FAIL — `Cannot find module './ResolveButton'`.

- [ ] **Step 7: Implement `ResolveButton`**

```tsx
"use client";

import { useRouter } from "next/navigation";

export function ResolveButton({ eventId }: { eventId: string }) {
  const router = useRouter();

  async function handleClick() {
    await fetch(`/api/integration-events/${eventId}/resolve`, { method: "POST" });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-card border border-gold px-3 py-1 text-xs text-gold hover:bg-gold hover:text-bg"
    >
      Marcar como feito
    </button>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- ResolveButton`
Expected: PASS (1 test).

- [ ] **Step 9: Wire the integrations page, with human-readable labels per pending action**

```tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResolveButton } from "./ResolveButton";

const TYPE_LABELS: Record<string, string> = {
  getin_reservation: "Lançar reserva no GetIn",
  whatsapp_notification: "Enviar mensagem no WhatsApp",
  pensanoevento_export: "Subir lista no pensanoevento",
};

const KIND_LABELS: Record<string, string> = {
  approval: "aprovação do pedido",
  denial: "recusa do pedido",
  guest_list_link: "link da lista de convidados",
};

export default async function IntegracoesPage() {
  const supabase = createSupabaseServerClient();
  const { data: events } = await supabase
    .from("integration_events")
    .select("*, requests(requester_name)")
    .eq("status", "pending_manual")
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-gold">Pendências manuais</h1>
      <p className="text-muted">
        Essas ações ainda não são automáticas (falta liberar a API do GetIn, do Nicochat ou do
        pensanoevento). Faça manualmente e marque como feito.
      </p>
      <ul className="flex flex-col gap-2">
        {(events ?? []).map((event) => (
          <li
            key={event.id}
            className="flex items-center justify-between rounded-card border border-border bg-surface p-4"
          >
            <div>
              <p className="text-ink">{TYPE_LABELS[event.type] ?? event.type}</p>
              <p className="text-sm text-muted">
                {event.requests?.requester_name}
                {event.payload?.kind ? ` · ${KIND_LABELS[event.payload.kind] ?? event.payload.kind}` : ""}
              </p>
            </div>
            <ResolveButton eventId={event.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 10: Run the full suite and commit**

Run: `npm test`
Expected: all previous tests plus 3 new tests pass.

```bash
git add app/api/integration-events/ app/admin/integracoes/
git commit -m "feat: add pending manual integrations panel"
```

---

## Task 16: PWA Installability

**Files:**
- Create: `app/manifest.ts`
- Modify: `app/layout.tsx`
- Create: `public/icon-192.png`, `public/icon-512.png` (placeholder icons)

- [ ] **Step 1: Add the web app manifest**

```typescript
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ItsMyBday",
    short_name: "ItsMyBday",
    description: "Pedido e aprovação de listas de aniversário",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0B0C",
    theme_color: "#0B0B0C",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

- [ ] **Step 2: Generate placeholder icons**

Adding a native image dependency (e.g. `canvas`) for two solid-color placeholder
icons is unnecessary weight. Generate them with a small script using only Node's
built-in `zlib` — no dependency needed.

Run: `mkdir -p public`

```javascript
const zlib = require("zlib");
const fs = require("fs");

function makePng(size, path) {
  const width = size;
  const height = size;
  const raw = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const i = rowStart + 1 + x * 4;
      raw[i] = 0x0b;
      raw[i + 1] = 0x0b;
      raw[i + 2] = 0x0c;
      raw[i + 3] = 255;
    }
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crc = Buffer.alloc(4);
    const zlibCrc = require("zlib").crc32
      ? require("zlib").crc32(Buffer.concat([typeBuf, data]))
      : 0;
    crc.writeUInt32BE(zlibCrc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const png = Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
  fs.writeFileSync(path, png);
}

makePng(192, "public/icon-192.png");
makePng(512, "public/icon-512.png");
console.log("icons written");
```

Save as `scripts/make-placeholder-icons.js` and run: `node scripts/make-placeholder-icons.js`
Expected: `icons written`, and `public/icon-192.png` + `public/icon-512.png` exist.

Note: `zlib.crc32` requires Node 20.12+. Run `node --version` first; if older, tell the user to swap in any 192x192 and 512x512 PNG of the ItsMyBday mark before launch — the placeholder only unblocks installability testing.

- [ ] **Step 3: Reference the manifest and add PWA meta tags in the root layout**

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ItsMyBday",
  description: "Pedido e aprovação de listas de aniversário — 300 Sky Bar",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ItsMyBday",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-body min-h-screen bg-bg text-ink">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify the build produces the manifest**

Run: `npm run build && npm run start &`
Then: `curl -s http://localhost:3000/manifest.webmanifest | head -c 200`
Expected: JSON starting with `{"name":"ItsMyBday",...}`.

Stop the server: `kill %1`

- [ ] **Step 5: Commit**

```bash
git add app/manifest.ts app/layout.tsx scripts/make-placeholder-icons.js public/icon-192.png public/icon-512.png
git commit -m "feat: add PWA manifest and installability meta tags"
```

---

## Task 17: Seed Data, README, and Manual QA

**Files:**
- Modify: `README.md`
- Modify: `supabase/seed.sql` (add a promoter placeholder note — Plan 2 will extend this)

- [ ] **Step 1: Finish the README with run/test/deploy instructions**

```markdown
# ItsMyBday

Sistema de pedido, aprovação e montagem de lista de convidados do 300 Sky Bar.

## Rodando localmente

1. Siga "Supabase setup" acima para criar o banco e o primeiro admin.
2. Copie `.env.local.example` para `.env.local` e preencha com as chaves do seu projeto Supabase.
3. Instale as dependências: `npm install`
4. Rode em desenvolvimento: `npm run dev` — abre em http://localhost:3000
5. Formulário público: http://localhost:3000/300-sky-bar/pedido
6. Painel admin: http://localhost:3000/admin/login

## Testes

```bash
npm test
```

## Deploy

1. Crie um projeto na Vercel apontando pra este repositório.
2. Configure as mesmas variáveis de `.env.local` nas Environment Variables da Vercel.
3. Deploy automático a cada push na branch principal.

## Pendências manuais (até liberar as integrações)

Toda aprovação, recusa e criação de lista gera um item em `/admin/integracoes` — é ali que
a equipe confere o que ainda precisa ser feito manualmente:
- Lançar a reserva no GetIn (até termos a API/chave do parceiro).
- Mandar a mensagem no WhatsApp (até mapearmos a API/webhook do Nicochat).
- Subir a lista final no pensanoevento (até integrarmos a API deles).
```

- [ ] **Step 2: Run the entire suite one final time**

Run: `npm test`
Expected: every test across all 17 tasks passes (no regressions).

- [ ] **Step 3: Run the production build one final time**

Run: `npm run build`
Expected: build completes cleanly.

- [ ] **Step 4: Manual QA checklist (perform by hand in the browser, not automated)**

1. Open `/300-sky-bar/pedido`, submit a request → confirm it appears in `/admin` after logging in.
2. From `/admin/pedidos/<id>`, click Negar, pick a suggested reason, confirm → status shows "denied" with the reason.
3. Submit a second request, approve it, fill classification (`valor_genero`), create a guest list → confirm the `/lista/<token>` page loads and accepts names up to the configured max, and rejects the (max+1)th name of a gender.
4. Confirm `/admin/integracoes` lists the pending GetIn reservation and WhatsApp notification for that approval, and that "Marcar como feito" removes it from the list.
5. Edit house rules in `/admin/regras`, reload, confirm the saved text persists.
6. Add an availability slot in `/admin/disponibilidade` dated tomorrow, confirm `/api/availability?venue=300-sky-bar` includes it.
7. On a phone, open the site and use "Add to Home Screen" — confirm it installs with the ItsMyBday name and dark icon.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: finish README with run, test, deploy, and QA instructions"
```

---

## Plan Self-Review Notes

- **Spec coverage:** every MVP item from the design spec has a task — request form with calendar (Task 5, 6), approval with panel buttons (Task 9; WhatsApp-side commands deferred to when Nicochat's webhook format is confirmed, tracked as a pending manual item so nothing silently breaks), denial reason with suggestions (Task 9), classification types (Task 10), guest list with capacity/deadline (Task 11, 12), house rules (Task 13), availability grid (Task 14), GetIn/pensanoevento as pending-manual hooks (Task 9, 11, 15), Dark Balada theme (Task 1, applied throughout), PWA (Task 16).
- **Known gap, called out explicitly:** the "aprovar respondendo no WhatsApp" half of the approval flow needs Nicochat's real webhook payload shape before it can be built — building against a guessed shape would violate the no-placeholder rule with untestable code. This plan ships the panel-button half (fully working) and leaves WhatsApp-side commands as a fast-follow once that contract is confirmed with the user.
- **Type consistency:** `GuestList`, `GuestListEntry`, `ClassificationType`, `IntegrationEventType` are defined once in `lib/types.ts` (Task 2) and reused verbatim in every later task's code and tests.
