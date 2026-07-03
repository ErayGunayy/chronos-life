# Plan: Forgotten Moments v0

**Source:** `CLAUDE.md` §6 (Forgotten Moments — v0 core mechanic)
**Selected scope:** Forgotten Moments daily loop, end-to-end vertical slice
**Complexity:** Large (foundational slice)
**Started:** 2026-07-02

## Summary
Build the first working slice of Chronos — the daily loop from §6 that tests the core hypothesis: *"do people value having their forgotten time surfaced back to them, without judgment?"* User narrates a day → AI extracts events → user reviews/commits → gaps are detected (<1h gray, ≥1h Forgotten Moment) → timeline shows them → one bundled gentle invite lets the user fill / reconstruct / leave / say "I don't remember." Plus a pure pattern engine (weekly surfaced; monthly/yearly engine-only this round).

## Confirmed stack
Next.js (App Router) · React · TypeScript · Tailwind · shadcn/ui · Supabase/Postgres · Anthropic Claude (behind an interface) · pnpm · Vitest · Playwright. See `CLAUDE.md` §8.

## Patterns to Mirror
Greenfield repo — no existing code to mirror. This plan *establishes* the conventions (layered pure-domain core, repository pattern, feature-folder UI, AAA tests). Stated explicitly rather than inventing a fake precedent.

## Key modeling decisions
1. **Gaps computed, never stored** — derived from the day's ordered `LifeEvent[]` (§5.2).
2. **Facts vs. Perspectives** — separate tables `life_events` vs `perspectives` (§5.11/§5.12).
3. **"I don't remember"** — a `LifeEvent` with `kind:'unremembered'`; valid, non-error (§6.4/§6.5).
4. **Time** — UTC instant + IANA tz; day = local calendar day; gaps only between first/last event; patterns keyed by hour-of-day bucket (§6.6).

## Architecture
```
src/
  domain/                # PURE TS, most-tested — the heart
    life-event/          # LifeEvent types, facts/perspectives split, immutable factory
    timeline/            # detectGaps(), Segment types
    forgotten-moments/   # buildInvite(), forgotten-moment logic
    patterns/            # weekly/monthly/yearly engine + threshold constants
    reflection/tone.ts   # tone guardrail (banned-word enforcement, §5.5/§6.6)
  ai/                    # LifeEventExtractor interface, StubExtractor, ClaudeExtractor, prompts/
  data/                  # LifeEventRepository interface, SupabaseLifeEventRepo, InMemoryRepo, export/{toJson,toMarkdown}
  app/                   # Next.js App Router: /api routes + pages
  components/            # feature-folder UI
  lib/time/              # day bounds, IANA tz, hour-bucketing, overlap union
```

## Data model (first migration)
- `life_events` — facts (immutable history): id, user_id, title, description, category, category_confidence, start_at, end_at, tz, kind (`substantive|unremembered`), source (enum), version, created_at, updated_at, deleted_at. People/places as `text[]`/`text` for v0.
- `perspectives` — AI output (regenerable): id, life_event_id?, scope (`event|day|week`), type (`summary|pattern|reflection`), body, model, created_at.
- `capture_sessions` — raw narrative + review state: id, user_id, raw_narrative, status (`draft|reviewed|committed`).
- `settings` — user_id, timezone, daily_invite_time.
- RLS enabled (`user_id = auth.uid()`), single-user v0. Real deletion (no dark patterns, §5.11).

## Phases (each ends at a validation gate)
- **Phase 0 — Skeleton & foundation:** Next.js+TS+Tailwind+shadcn, Vitest/Playwright, folder structure, SQL migration file, `LifeEvent` types + immutable factory, repository (in-memory + Supabase impl), export/delete primitives. Record stack in CLAUDE.md §8. Gate: `pnpm build` green, repo unit tests pass.
- **Phase 1 — Time & gap detection (pure, TDD):** `lib/time`, `detectGaps()`, `FORGOTTEN_MOMENT_THRESHOLD_MINUTES=60`. Gate: exhaustive unit tests incl. 60-min boundary, overlaps, empty/single, cross-midnight; ~100% on detectGaps.
- **Phase 2 — Capture & extraction boundary:** `LifeEventExtractor` interface, `StubExtractor`, capture API routes, `ClaudeExtractor` (Anthropic, server-side, structured output; prompt encodes §4/§5.5 no-invention + per-field confidence; consult `claude-api` skill when wiring). Gate: capture→extract via stub (integration); Claude contract test (mocked); key server-side only.
- **Phase 3 — Review & commit:** review UI (low-confidence flagged, editable, AI-marked), commit → persist. Nothing permanent pre-confirmation (§5.4). Gate: E2E capture→review→commit; edits persist.
- **Phase 4 — Today's Story + Forgotten Moments:** story-block timeline, gray routine gaps, question-mark Forgotten Moments, inline "Missing Moments" copy, "Remembered %", tone guardrail routing all copy. Gate: E2E + visual regression @320/768/1024/1440; reduced-motion; tone tests.
- **Phase 5 — Bundled invite + fill/leave/don't-remember:** `buildForgottenMomentsInvite()` (longest-first), four actions incl. `unremembered`, in-app "Continue Your Story" invite (§5.8; scheduled push deferred). Gate: E2E fill + "don't remember"; unremembered keeps question-mark, not re-invited; ordering test.
- **Phase 6 — Pattern engine + Weekly reflection (fast-follow-able):** pure weekly/monthly/yearly engine (50/75/75 + min-7-days guard, hour-bucket keying), minimal Weekly reflection view (observational, ends in a question, reflection-view only). Monthly/yearly = engine + tests only. Gate: engine unit tests on synthetic data; weekly view renders from seed.

## Deferred (not this plan)
Full Living Ring viz, voice capture, scheduled push, adaptive invite timing (§6.1), Life Chapters, Memory Explorer, full Reflection Engine, multi-user auth.

## Validation
```bash
pnpm lint
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest
pnpm test:e2e         # playwright
pnpm build
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| AI extraction quality/latency/cost | HIGH | Interface + stub; structured output; per-field confidence; mandatory user review |
| Time/timezone/day-boundary bugs | HIGH | UTC+IANA tz; pure tested time lib; gaps only within [first,last]; document night/sleep simplification |
| A single judgmental line breaks trust | HIGH | Central tone guardrail + banned-word tests; all copy routed through it; prompts encode rules |
| Pattern false-confidence | MEDIUM | Hard min-7-days guard + threshold constants + tests; only in reflection views |
| Secret/privacy exposure | MED→CRIT | ANTHROPIC_API_KEY server-side only; RLS on; export/delete real |
| Scope creep | MEDIUM | Deferral list is a hard boundary |

## Environment notes
- pnpm enabled via Corepack (Node 24). Supabase CLI + Docker not installed → Phases 0–1 need no live DB (pure logic + in-memory repo); Supabase provisioning (local-with-Docker or cloud) decided at Phase 2/3. Do not create cloud resources without user confirmation.

## Status — 2026-07-03 (all phases implemented)
| Phase | Commit | Gate |
|---|---|---|
| 0 Foundation | 878e50a…05bc8e2 | 54 unit tests, build green |
| 1 Time & gaps | ee73617 | 84 tests incl. DST 23/25h days, 60-min boundary |
| 2 Extraction | e79456f | 120 tests; mocked Claude contract; key server-only |
| 3–5 Story slice | 88fc938 | 155 tests + UI (capture→review→commit→timeline→invite) |
| 6 Patterns | b6ed814 | 170 tests; weekly view live at /reflections/weekly |
| E2E smoke | (not committed — `$CLAUDE_JOB_DIR/tmp/smoke.mjs`) | 18/18 checks over real HTTP against `next start` |

**Deferred, deliberately:**
- Supabase provisioning (needs user credentials/confirmation). Interface + migration SQL ready; `JsonFileLifeEventRepository` (`.chronos-data/`, gitignored) serves local runtime. Swap point: `src/data/get-repository.ts`.
- Playwright E2E + visual regression (heavy browser download; the smoke script covers the loop over HTTP for now).
- shadcn/ui init — v0 UI is hand-rolled Tailwind components (`src/components/today/ui.ts` tokens); adopt shadcn when the component surface grows.
- Voice capture, push notifications, adaptive invite timing, monthly/yearly reflection UI — per original deferral list.

## Acceptance
- [x] Daily loop works end-to-end (narrate → review → timeline → invite → fill/leave/don't-remember) — verified by 18-check HTTP smoke
- [x] Gaps computed (not stored); facts/perspectives separated in schema; "I don't remember" is a real `kind:'unremembered'` record
- [x] All gap/pattern copy passes the tone guardrail (enforced in code via `assertCalmCopy`, tested)
- [x] Weekly pattern surfaces only from ≥7 days of data; monthly/yearly engine tested (50%→75%→75%)
- [x] Export (JSON round-trip + human Markdown) + real deletion work end-to-end
- [x] `pnpm build`, typecheck, lint, 170 unit/integration tests green
- [ ] Playwright E2E + visual regression (deferred, see above)
- [ ] Supabase persistence in production (deferred until provisioning)
