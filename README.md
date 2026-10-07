# HM1 — Contact Directory (React + Supabase CRUD)

A modern React (Vite) web application featuring:
- **Two Input Fields**: **Name** and **Contact number**.
- **Permanent Cloud Persistence**: Submissions are stored persistently in a Supabase (PostgreSQL) database.
- **Persistent History List**: Displays all stored records chronologically with real-time refresh.
- **Full CRUD Support**: 
  - **Create**: Add new records with form validation.
  - **Read**: Fetch and display history records from Supabase.
  - **Update**: Select any record to edit and update it directly in the database.
  - **Delete**: Remove records with inline confirmation.
- **Additional UX Features**: Search filter by name/phone, 1-click phone copying, initials avatars, and responsive glassmorphic UI.
- **Zero-impact deployment**: Deployed as an independent new project on Vercel without altering any existing repositories or deployment setups.

---

## 1. Create the Supabase Table

In your [Supabase Dashboard](https://app.supabase.com) → **SQL Editor**, run the following schema:

```sql
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  created_at timestamptz not null default now()
);

alter table public.contacts enable row level security;

-- Demo/assignment policy: allow anon CRUD access
create policy "anon full access" on public.contacts
  for all to anon using (true) with check (true);
```

Then navigate to **Project Settings → API** and copy:
- **Project URL**
- **anon public key**

---

## 2. Local Development

1. Duplicate `.env.example` to create `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. Install dependencies and start the local development server:
   ```bash
   npm install
   npm run dev
   ```

*(Note: If `.env` is not set, the app will run in an interactive local demo mode with sample records and copyable SQL schema instructions).*

---

## 3. Push to GitHub

To keep this homework strictly isolated within `hm1`:

```bash
git clone https://github.com/sheikhkaifsadiq/cloudcomputing.git
cd cloudcomputing
# Copy this hm1 directory into the repo root if not already present
git add hm1
git commit -m "feat(hm1): React + Supabase Contacts CRUD application"
git push origin main
```

---

## 4. Deploy as a New Project on Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New… → Project**.
3. Import your repository: `cloudcomputing`.
4. In the **Configure Project** screen:
   - **Project Name**: `hm1-contacts` (or your choice).
   - **Root Directory**: Click **Edit** and select `hm1`. *(This isolates the build to `hm1` and ensures no other homework or project is touched).*
   - **Framework Preset**: Auto-detects **Vite**.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-public-key`
6. Click **Deploy**.

> **Note:** A `vercel.json` file is included in `hm1/` to ensure clean client-side routing and single-page-app redirects out of the box without any extra plugins.

---

## Stack & Versions

- **Frontend**: React 19, Vite 6
- **Database**: Supabase (`@supabase/supabase-js` v2.58)
- **Deployment**: Vercel
- **Styling**: Vanilla CSS (Custom design system, glassmorphism, responsive)
