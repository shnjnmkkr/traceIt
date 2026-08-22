<div align="center">

# traceIt

**A timetable and attendance tracker with a weighted calculation engine, an AI advisor, and an option to track attendance backwards.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Overview

traceIt builds a timetable, then tracks attendance against it. It supports two ways of doing that:

- **Normal mode.** Unmarked classes count as absent. You mark the classes you attend.
- **Inverted mode.** Unmarked classes count as attended. You only mark the exceptions: absent, mass-bunked, teacher-absent, holiday. This is the smaller set of marks for most students, since attendance is usually higher than absence. Switching between the two modes doesn't touch any stored data, it only changes how an unmarked class is interpreted.

The calculation engine also separates labs from lectures: a lab counts as one session regardless of length, a lecture counts once per hour. Classes that haven't happened yet are never counted, and holidays are excluded entirely rather than counted as neutral.

Timetables can be built by hand, cloned from a shared community template, or extracted from a photo of a printed timetable using Gemini.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Attendance Calculation Rules](#attendance-calculation-rules)
- [Security & Rate Limiting](#security--rate-limiting)
- [Admin Panel](#admin-panel)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features

**Timetable Builder**
- Interactive weekly grid: click a cell to add a class, click a slot to edit it in place
- Merge consecutive hours into a single multi-hour block for labs, unmerge to split them back apart
- AI image extraction (Beta): upload a screenshot or photo of a timetable and Gemini extracts subjects, timings, and days
- Browse and clone community-shared templates, or share your own back for others to use

**Attendance Engine**
- Per-status tracking: attended, absent, mass-bunked, teacher-absent, holiday, upcoming, unmarked
- Lab vs. lecture weighting built into the calculation, not applied after the fact
- Configurable handling of mass bunks and teacher-absent classes (count as attended, absent, or excluded)
- Inverted mode, described in the [Overview](#overview)
- Bulk "Mark Entire Day" action for when a whole day shares one status

**Analytics**
- Overall and per-subject percentages, split by lab and lecture where relevant
- Weekly trend and attendance heatmap
- Shareable visual summary cards

**AI Advisor**
- Groq-powered chat with automatic model fallback (`groq/compound` 70B, then `groq/compound-mini` 8B fallback)
- Reads live timetable, attendance history, and settings, so questions like "how many classes can I miss and stay above 75%" get a real answer computed from actual data

**Accounts & Access**
- Supabase email auth, plus one-tap anonymous guest mode for trying the app without signing up
- Admin panel for moderating community templates and reviewing bug reports, gated by a dedicated `admin_users` table (guest sessions are blocked from every `/admin` route at the middleware level, independent of `admin_users` state)

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS, Framer Motion, Recharts, lucide-react |
| Language | TypeScript |
| Backend / DB | Supabase (Postgres, Auth, Row Level Security, Storage) |
| AI, chat | Groq (Compound 70B / Compound Mini 8B fallback chain) |
| AI, OCR | Google Gemini (`gemini-2.5-flash`) for timetable image extraction |
| Transactional email | Resend (bug report notifications) |
| Analytics | Custom Postgres-backed page view / feature usage tracking, plus Vercel Analytics |
| Deployment | Vercel |

## Project Structure

```
app/
├── api/                    Route handlers (timetable, attendance, chat, settings, admin, ...)
├── admin/                  Admin-only dashboard, template moderation, bug report triage
├── auth/                   Login and OAuth callback
├── dashboard/              Main app: timetable grid, analytics, AI chat panel
│   └── create-timetable/   Manual, template, and AI-image timetable creation flow
└── about/                  In-app documentation of every calculation rule

components/
├── dashboard/              TimetableGrid, AIChatPanel, slot dialogs, analytics section
├── analytics/              Charts and subject breakdowns
├── timetable/              Inverted mode explainer, shared timetable UI
└── ui/                     Design-system primitives (button, card, dialog, ...)

lib/
├── attendance-calculator.ts  Core weighted attendance math (single source of truth)
├── timetable-constants.ts    Shared TIME_SLOTS / DAYS arrays used across every grid view
├── rate-limiter.ts            In-memory sliding-window rate limiter
├── env-validator.ts           Fails fast on missing required env vars
└── supabase/                  SQL schema/migrations plus client/server Supabase helpers

types/                      Shared TypeScript interfaces (Timetable, UserSettings, ...)
middleware.ts                Session refresh and guest-route protection
```

## Getting Started

### Prerequisites
- Node.js 20+
- A Supabase project
- A Groq API key (required, powers the AI advisor)
- Optionally a Google AI Studio key (timetable OCR) and a Resend key (bug report emails)

### Install

```bash
git clone https://github.com/shnjnmkkr/traceIt.git
cd traceIt
npm install
```

### Configure environment

Create `.env.local` in the project root. See [Environment Variables](#environment-variables) for the full list.

### Set up the database

In the Supabase SQL editor, run the files in `lib/supabase/` in this order:

1. `00-core-schema.sql`: timetables, timetable_slots, attendance_records (the foundation everything else builds on)
2. `user-settings-schema.sql`
3. `add-inverted-mode.sql`
4. `add-include-labs-setting.sql`
5. `community-templates-schema.sql`
6. `community-templates-voting-schema.sql`
7. `add-group-field.sql`
8. `admin-schema.sql`
9. `admin-delete-policy.sql`
10. `add-admin.sql` (edit the email or UUID placeholder first, see [Admin Panel](#admin-panel))
11. `bug-reports-schema.sql`
12. `analytics-schema.sql`

Every table has Row Level Security enabled by default, so a user can only read or write their own rows.

### Run

```bash
npm run dev      # start the dev server on http://localhost:3000
npm run build    # production build
npm start        # serve the production build
npm run lint     # lint
```

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side Supabase key for admin operations. Bypasses RLS, never exposed to the client |
| `GROQ_API_KEY` | Yes | Powers the AI attendance advisor |
| `GOOGLE_GEMINI_API_KEY` | Optional | Enables AI image-to-timetable extraction |
| `RESEND_API_KEY` | Optional | Sends email notifications for bug reports |

`lib/env-validator.ts` throws on startup if a required key is missing, and warns (dev only) about missing optional keys and placeholder-looking values.

## Database Schema

| Table | Purpose |
|---|---|
| `timetables` | One row per user timetable. Only one `is_active` at a time |
| `timetable_slots` | Individual class slots: day, time range, subject, lecture/lab, merge span |
| `attendance_records` | One row per `(user, slot, date)`, upserted on re-mark |
| `user_settings` | Target percentage, mass-bunk/teacher-absent rules, inverted mode, lab inclusion |
| `community_templates` / `community_template_votes` | Shared timetables with up/down voting |
| `admin_users` | Grants access to `/admin/*` via the `is_admin()` / `is_super_admin()` SQL functions |
| `bug_reports` | User-submitted bugs and suggestions, with an optional screenshot upload |
| `page_views` / `feature_usage` | First-party product analytics feeding the admin dashboard |

## Attendance Calculation Rules

The full, user-facing explanation lives at `/about` in the app (`app/about/page.tsx`). The short version:

- Only classes that have already occurred count. Future classes never affect the percentage, even if pre-marked.
- Weekends are always excluded.
- Labs count as one session regardless of duration. Lectures count once per hour, so a merged 2-hour lecture is 2 sessions.
- Holidays are excluded entirely: not attended, not absent, not counted in the total.
- Mass-bunk and teacher-absent classes are counted according to user settings (attended, absent, or excluded).
- An unmarked-but-occurred class defaults to absent in normal mode, or attended in inverted mode. That single conditional in `lib/attendance-calculator.ts` is the entire mechanism behind inverted mode; everything downstream of it is identical between the two modes.

## Security & Rate Limiting

- **Auth.** Every sensitive route requires a Supabase session. Postgres Row Level Security ensures a user can only ever touch their own rows.
- **Rate limiting** (in-memory, `lib/rate-limiter.ts`, swap for Upstash Redis at scale):

  | Action | Limit |
  |---|---|
  | AI chat | 10 messages / minute / user |
  | Timetable image OCR | 5 uploads / hour / user |
  | Bug reports | 5 / day / IP |
  | Community template shares | 10 / day / user |
  | Attendance updates | 100 / hour / user |
  | Timetable structure edits | 50 / hour / user |

- **Input validation.** Message/description length caps, a 5MB screenshot limit, template name/description caps.
- **Secrets.** All keys live in `.env.local` (gitignored). `SUPABASE_SERVICE_ROLE_KEY` is server-only and never shipped to the client.
- **Guest isolation.** Anonymous (`is_guest`) sessions are blocked from every `/admin` route at the middleware level, regardless of `admin_users` state.

Rough free-tier capacity at current limits is comfortable up to around 50 concurrent users. Beyond that, budget for Groq's paid tier and a Redis-backed rate limiter.

## Admin Panel

1. Run `admin-schema.sql` and `admin-delete-policy.sql` (see [Getting Started](#getting-started)).
2. Grant yourself access in the Supabase SQL editor:

   ```sql
   INSERT INTO admin_users (user_id, is_super_admin, created_by)
   SELECT id, true, id FROM auth.users WHERE email = 'you@example.com'
   ON CONFLICT (user_id) DO UPDATE SET is_super_admin = EXCLUDED.is_super_admin;
   ```

3. Log in and open Settings, then Admin Panel, or navigate directly to `/admin/templates`.

From there, search, sort, and delete any community template, and triage submitted bug reports at `/admin/bug-reports`. Admin status is re-checked via `is_admin()` on every relevant API request, so there's no client-side-only gate to bypass.

## Deployment

traceIt is a standard Next.js app. Deploy to Vercel by importing the repository and adding the [environment variables](#environment-variables) in the project settings. Pushes to `main` deploy automatically once the Vercel GitHub integration is connected.

## Contributing

Issues and pull requests are welcome. For anything non-trivial, please open an issue first to discuss the approach, especially for changes touching `lib/attendance-calculator.ts`, which is deliberately kept as a single, auditable function rather than split across per-status handlers.

## License

[MIT](LICENSE). Anyone can use, copy, modify, and redistribute this code, and it comes with no warranty of any kind. The license text is the standard, industry-wide MIT disclaimer: the software is provided "as is," and the author is not liable for any claim or damages arising from its use.
