# What's Happening — Modern Independent News & Editorial Platform

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%7C%20Postgres%20%7C%20Realtime-3ecf8e?style=flat&logo=supabase)](https://supabase.com/)

A full-stack, editorial-grade news platform engineered with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase**. Crafted with a signature **White + Editorial Red (`#DC2626`)** aesthetic, typography (Newsreader serif + Inter sans-serif), sleek dark mode, real-time dispatch alerts, and granular role-based publishing controls.

---

## 📑 Table of Contents

1. [Key Features](#-key-features)
2. [Tech Stack](#-tech-stack)
3. [Architecture & Security](#-architecture--security)
4. [Local Setup Guide](#-local-setup-guide)
5. [Database Setup & Migrations](#-database-setup--migrations)
6. [Role-Based Access Control & Admin Setup](#-role-based-access-control--admin-setup)
7. [Step-by-Step Vercel Deployment](#-step-by-step-vercel-deployment)
8. [Supabase Auth Redirect Configuration](#-supabase-auth-redirect-configuration)
9. [SEO & Structured Data](#-seo--structured-data)
10. [License](#-license)

---

## 🌟 Key Features

### 1. Editorial Public Experience
- **Breaking News Ticker**: Real-time red ticker for breaking news stories.
- **Featured Hero Story & Editorial Desks**: Sections for Top Stories, Pakistan, World, Politics, Business & Tech, Science & Climate, and Sports.
- **Dynamic Search**: Filter by keywords, categories, and tags.
- **Article Reader (`/news/[slug]`)**: Headline, cover photo, author bio, social share bar, bookmarking, and incremental view counter with bot protection.
- **Author Pages (`/author/[id]`)**: Full journalistic portfolio by writer.
- **Responsive Dark Mode**: Smooth toggle with persistent state and red accent styling.

### 2. Editorial Writing & Review Workflow
- **Rich-Text TipTap Editor (`/write`)**: Heading levels, bold, italics, blockquotes, code blocks, lists, and direct image uploads to Supabase Storage (`article-images`).
- **Tiered Role Submission**:
  - Regular **`user`**: Submissions automatically enter the review queue (`status: 'pending'`).
  - Vetted **`writer`**: Submissions publish live instantly (`status: 'published'`).
- **Contributor Dashboard (`/dashboard`)**: Track article status (draft, pending, published, rejected with feedback), bookmarks, and personal alerts.

### 3. Administrative Control Center (`/admin`)
- **Protected at Server & RLS Level**: Restricted to users with `role: 'admin'` in `profiles`.
- **Overview Dashboard**: Live statistics for total articles, pending queue, registered accounts, active writers, and cumulative views.
- **Editorial Approval Queue**: Full article preview modal, one-click **Approve & Publish**, or **Reject** with custom feedback notes sent to the author.
- **All Articles Management**: Search and filter by status/desk, edit shortcut, delete confirmation, and inline toggles for **Breaking News** and **Featured Story**.
- **User Management**: Contributor role selector (`user` / `writer` / `admin`) and account deletion/ban actions.
- **News Desks CRUD**: Create, edit, and delete category beats.

### 4. Realtime Notification System
- **Realtime WebSockets**: Supabase Realtime channel listening to `notifications` table changes.
- **Interactive Header Bell**: Dynamic unread counter badge, dropdown popover with recent alerts, and "Mark all as read".
- **Floating Toast Alert**: Real-time notifications slide into the corner with story headline, excerpt, and "Read Article" action button.
- **Dedicated Hub (`/notifications`)**: Full-page notifications center with unread filter, search, and deletion.

---

## 🛠 Tech Stack

- **Framework**: Next.js 16.4.3 (App Router with Turbopack)
- **Language**: TypeScript 5.x (Strict type checking)
- **Styling**: Tailwind CSS + Curated CSS Design System
- **Database & Backend**: Supabase (PostgreSQL 15+)
- **Authentication**: Supabase Auth (Email/Password, PKCE SSR Flow)
- **Realtime**: Supabase Realtime Channels
- **Storage**: Supabase Storage (`article-images` bucket)
- **Validation**: Zod schema validation
- **Editor**: TipTap Headless Rich-Text Editor

---

## 🔒 Architecture & Security

- **Server-Side Authorization**: Every admin action runs inside Next.js Server Actions with `verifyAdminAuth()`, verifying session validity and checking `profile.role === 'admin'`.
- **Row-Level Security (RLS)**: Enforced directly at the Postgres engine level. Public users can only read published articles and categories; authors can only mutate their own drafts; only verified admins can modify roles, approve articles, or delete categories.
- **Zero Key Leaks**: The elevated `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to server-side code (`src/lib/supabase/admin.ts`).
- **Defensive Rendering**: Rich article text is parsed into safe structured elements, preventing arbitrary script injection (XSS).

---

## 🚀 Local Setup Guide

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd "lsm new website"
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# Supabase Public API Keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Supabase Server-Side Secret Key (DO NOT expose to client)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Site Canonical Base URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Run Development Server
```bash
npm run dev
```
Visit `http://localhost:3000` in your browser.

---

## 🗄 Database Setup & Migrations

To set up the complete schema with sample editorial data and triggers:

1. Open your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Navigate to **SQL Editor** > **New Query**.
3. Copy and run the entire contents of [`supabase/full_setup.sql`](supabase/full_setup.sql).
4. Run [`supabase/notifications.sql`](supabase/notifications.sql) to enable the publication triggers and Realtime publication.

---

## 👑 Role-Based Access Control & Admin Setup

By default, all new accounts register with `role: 'user'`.

To grant an account administrator privileges:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

Once promoted, log in and visit [`/admin`](http://localhost:3000/admin) to manage the newsroom.

---

## 🌐 Step-by-Step Vercel Deployment

Deploying "What's Happening" to Vercel takes less than 3 minutes:

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Production release: What's Happening editorial platform"
git push origin main
```

### Step 2: Import into Vercel
1. Log in to **[Vercel](https://vercel.com/)**.
2. Click **Add New...** > **Project**.
3. Import your GitHub repository.
4. Framework Preset will automatically detect **Next.js**.

### Step 3: Configure Environment Variables
Under the **Environment Variables** section, add the following 4 keys:

| Name | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-supabase-anon-key` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-supabase-service-role-key` | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app-name.vercel.app` | Production, Preview, Development |

### Step 4: Deploy
Click **Deploy**. Vercel will compile the Next.js App Router bundle, optimize static routes, and deploy serverless functions.

---

## 🔗 Supabase Auth Redirect Configuration

To ensure signup confirmation links, magic links, and password reset flows redirect properly in production:

1. In the **Supabase Dashboard**, navigate to **Authentication** > **URL Configuration**.
2. Set **Site URL** to:
   ```
   https://your-app-name.vercel.app
   ```
3. Add the following to **Redirect URLs**:
   ```
   https://your-app-name.vercel.app/**
   https://your-app-name.vercel.app/auth/callback
   https://your-app-name.vercel.app/reset-password
   http://localhost:3000/**
   ```
4. Click **Save Changes**.

---

## 📈 SEO & Structured Data

- **Dynamic Metadata & Open Graph**: Auto-generated for every news story with canonical URLs, article tags, and high-res social cards.
- **NewsArticle Schema (JSON-LD)**: Structured data injected on `/news/[slug]` compliant with Google News indexing standards.
- **Robots.txt (`/robots.txt`)**: Dynamic directives indexing public pages and shielding admin/dashboard paths.
- **Sitemap.xml (`/sitemap.xml`)**: Automatically updates with newly published stories and news desks.

---

## 📄 License

MIT License. Designed and engineered for independent journalism.
