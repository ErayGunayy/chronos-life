# Chronos

> A personal memory operating system — not a to-do app, habit tracker, calendar, or journal.

Chronos exists to become a person's trusted **second memory**. You tell your day
naturally, in your own words, and Chronos turns that story into a timeline — then lets
the *gaps* in your own account reveal what you've forgotten, without judgment.

**Core loop:** `Live → Remember → Reflect → Understand → Live better`

> **Product & design source of truth:** [`CLAUDE.md`](./CLAUDE.md).
> It defines the principles, anti-goals, and every subsystem. When code and `CLAUDE.md`
> disagree, `CLAUDE.md` wins until intentionally updated. This README only covers how to
> run and work on the code.

---

## What's built (v0)

The current version implements the **Forgotten Moments** core mechanic and the systems
around it, all computed as views over a single `LifeEvent` data model:

- **Life Conversation capture** — describe your day in natural language; AI extracts
  candidate events with approximate time ranges. Nothing persists without your review.
- **Today's Story** — the chronological narrative view, with per-event edit and delete.
- **Living Ring** — the SVG ring that shows where time went, with distinct visual states
  for routine gaps, still-open Forgotten Moments (breathing dashed arc), and answered
  "I don't remember" records (static dotted, neutral).
- **Gap detection & Forgotten Moments** — gaps ≥ 1h are surfaced as fillable, never as
  failures. "I don't remember" is a valid, recorded outcome.
- **Pattern engine** — weekly → monthly → yearly promotion with escalating evidence
  thresholds; surfaced only in reflection views, never mid-conversation.
- **Weekly reflection** view (`/reflections/weekly`).
- **Ownership** — full export (JSON + Markdown) and real deletion (event / everything)
  via `/settings`.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| AI extraction | Anthropic Claude · local Ollama · deterministic stub (swappable) |
| Validation | Zod |
| Persistence | JSON file locally (`.chronos-data/`); Supabase planned |
| Tests | Vitest |
| Package manager | pnpm |

The domain core (`src/domain/*`) is pure TypeScript with no framework/AI/DB imports —
gap detection, the pattern engine, invite building, and the tone guardrail all live there.
AI, data, and UI depend inward on it. See [`CLAUDE.md` §8](./CLAUDE.md) for the full
architecture rationale.

---

## Getting started

**Prerequisites:** Node.js 20+ and pnpm.

```bash
pnpm install
```

> **First install may need build approval.** pnpm 11 blocks postinstall scripts by
> default, so native deps (e.g. `sharp`) won't build until you run
> `pnpm approve-builds` once and allow them. If install looks incomplete, run that first.

```bash
pnpm dev        # start the dev server at http://localhost:3000
```

That's enough to run the whole app — with **no API key**, extraction falls back to a
deterministic stub, so every flow works offline and is honestly labelled as non-AI.

### Enabling real AI extraction

Extraction sits behind a `LifeEventExtractor` interface and is selected from the
environment. Create a `.env.local`:

```bash
# Option A — Anthropic Claude (used automatically when a key is present)
ANTHROPIC_API_KEY=sk-ant-...
# CHRONOS_EXTRACTION_MODEL=claude-sonnet-...   # optional model override

# Option B — local Ollama (free, private, no key)
# CHRONOS_OLLAMA_MODEL=llama3.1
# OLLAMA_HOST=http://localhost:11434           # optional, this is the default
```

Selection logic (in `src/ai/get-extractor.ts`):

- `CHRONOS_EXTRACTOR` (`claude` | `ollama` | `stub`) **forces** a provider when set.
- Otherwise: an Anthropic key → Claude; else an Ollama model → local Ollama; else the stub.

---

## Accounts & backend (optional)

With **no Supabase env set, the app runs in single-user local mode** — file-backed in
`.chronos-data/`, no login. To turn on **Google sign-in + per-user Supabase persistence** (RLS
isolates each account), set both:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-or-publishable-key>
```

The database schema (`life_events`, `user_state`, RLS on both) is applied via Supabase migrations.
**Google OAuth is the one part that must be set up by hand** (needs Google Cloud + the Supabase
dashboard):

1. **Google Cloud Console** → APIs & Services → Credentials → *OAuth 2.0 Client ID* (Web).
   Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. **Supabase** → Authentication → Providers → **Google**: paste the client ID + secret, enable.
3. **Supabase** → Authentication → URL Configuration: Site URL `http://localhost:3000` (add your
   production URL later), and add `http://localhost:3000/auth/callback` to the redirect allow-list.
4. Put the two `NEXT_PUBLIC_SUPABASE_*` values in `.env.local` (see `.env.example`).

Runtime uses only the anon/publishable key + the signed-in user's session — no service-role key.

---

## Scripts

```bash
pnpm dev          # dev server (hot reload)
pnpm build        # production build
pnpm start        # serve the production build
pnpm lint         # eslint
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run (single pass)
pnpm test:watch   # vitest in watch mode
```

---

## Project layout

```
src/
├── domain/          # Pure TS core — no framework/AI/DB imports
│   ├── life-event/    # The fundamental LifeEvent model
│   ├── timeline/      # Gap detection
│   ├── forgotten-moments/
│   ├── patterns/      # Weekly/monthly/yearly pattern engine
│   ├── ring/          # Living Ring segments, palette, color assignment
│   ├── reflection/    # Tone guardrail
│   ├── capture/       # Candidate → LifeEvent
│   ├── chapters/ · home/
├── ai/              # LifeEventExtractor + Claude / Ollama / stub implementations
├── data/            # Repositories (JSON-file + in-memory) and export (JSON/Markdown)
├── lib/             # Time helpers, API envelope
├── components/      # Ring, Today's Story, settings UI
└── app/             # Next.js App Router pages + API routes
```

Local data is written to `.chronos-data/` (gitignored) — it survives dev-server restarts.

---

## Data & privacy

Privacy is a responsibility, not a feature. Everything you record is yours: exportable
in durable formats and deletable at any time, with no dark patterns. AI may organize and
summarize, but it never silently rewrites your facts — user-authored **facts** and
AI-generated **perspectives** are kept separate in the data model. See
[`CLAUDE.md` §5.11–§5.12](./CLAUDE.md).

---

## Roadmap notes

- Supabase (PostgreSQL + RLS) swaps in behind the existing repository interface.
- React Native app (voice capture, home-screen widgets, push) is planned.
- Playwright E2E + visual regression is planned; unit/integration tests run on Vitest today.

Exact swap points are documented in `CLAUDE.md`.
