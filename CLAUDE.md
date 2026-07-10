# Chronos — Project Guide for Claude Code

> This file is the source of truth for how Claude Code should think about, design, and implement Chronos.
> Read this before making product, design, or architecture decisions.
> If code and this document disagree, this document wins until intentionally updated.

---

## 1. What Chronos Is

Chronos is a **personal memory operating system** — not a to-do app, not a habit tracker, not a calendar, not a journal, not a chatbot, not a social network, not a gamification platform. It borrows ideas from all of them but exists for a different purpose.

**Mission:** Chronos exists to become a person's trusted second memory. When people can't remember something about their own lives, Chronos should be the first place they think to look — not because it remembers better than they do, but because it remembers what they chose to preserve.

**Core loop:**
```
Live → Remember → Reflect → Understand → Live Better
```
This loop has no finish line. Chronos is designed to grow more valuable for decades, not to be "completed."

**The core insight driving v1:** People rarely notice how much of their day disappears into things they won't remember (scrolling, idle time, low-attention activity). Most products either track everything passively (creepy, surveillance-like) or ask people to log everything manually (too much friction, gets abandoned). Chronos instead lets people **tell their day naturally**, and lets the *gaps* in their own story reveal what they've forgotten — turning forgetting itself into the insight, without judgment.

---

## 2. Non-Negotiable Principles

These override feature requests, growth pressure, and "best practices" from other products. When in doubt, re-derive the decision from these.

1. **Understand before you improve.** Every feature must help people understand themselves first. Optimization without understanding creates pressure, not change.
2. **Never judge.** No "good day" / "bad day" framing. Chronos reflects; the user decides what mattered.
3. **Stories before timelines.** Capture is always natural language first. Structure is generated *from* the story, never demanded *before* it. `Story → AI understanding → Timeline`, never the reverse.
4. **People's priorities change.** Never lock a user into an outdated version of themselves. Goals, identity, and what matters evolve — the product must evolve with them.
5. **Technology should feel invisible.** Speaking should be easier than typing. Reviewing should be easier than remembering. Friction is the enemy.
6. **Reflection over productivity.** The question is never "how much did I do today?" It's "what kind of life am I building?"
7. **AI is a guide, never a judge.** AI notices patterns, asks thoughtful questions, offers perspective. It never shames, manipulates, or decides who someone is. The user defines themselves.
8. **Memory is more valuable than metrics.** Numbers support memory; they are never the point.
9. **Privacy is non-negotiable.** Not a feature — a responsibility. Users own, control, export, and can delete everything.
10. **Build for decades.** Every decision should still make sense in 5, 10, 20 years. Design for a lifetime, not a trend cycle.
11. **Help people see their journey.** Every feature should help answer: How have I changed? What matters most to me? What have I forgotten about myself?
12. **Build with empathy.** There is a real, complicated person behind every timeline entry. Always choose empathy over efficiency, understanding over optimization.

### The Chronos Test (apply before building anything)
1. Does it help people understand themselves?
2. Does it respect the user's changing life?
3. Does it reduce effort instead of adding it?
4. Does it avoid guilt and judgment?
5. Does it protect privacy?
6. Will this still make sense in ten years?

If any answer is "no" — stop and rethink.

---

## 3. Anti-Goals (What We Will Never Build)

These are permanent constraints, not current-roadmap opinions. Growth pressure will eventually push toward violating these — resist it.

- **Never optimize for addiction.** No engagement-maximizing dark patterns, no infinite scroll, no artificial retention hooks. Success = value delivered, not minutes spent in-app.
- **Never shame people.** No "You wasted your day," "You're falling behind," "You broke your streak." Ever.
- **Never turn life into a competition.** No leaderboards, no public rankings, no social comparison metrics. There is no "streak" concept in this product.
- **Never reduce a person to a number.** No Productivity Score, Life Score, Happiness Score. Numbers may support reflection; they never define a person.
- **Never force consistency.** Missing a day is not failure. Users return exactly where they left off, without punishment or guilt.
- **Never build for trend's sake.** Not every AI/social/viral feature belongs here. Every feature must trace back to the mission or it doesn't ship.
- **Never sell attention.** Notifications exist to help, not to manipulate. Silence is often the correct choice.
- **Never replace human reflection.** AI says "here's a pattern we noticed," never "you are this kind of person." The user always owns the interpretation.
- **Never lock people in.** Export, leave, and keep-your-memories must always be trivially possible.
- **Never monetize personal memories.** No selling personal data, no business model built on exploiting intimate information. Users are the customer, never the product.

---

## 4. Product Philosophy (condensed from full spec)

- **Awareness before improvement** — understand how you're already living before being told how to live.
- **Reflection before action** — most productivity apps plan tomorrow; Chronos first helps you understand today.
- **Memory before metrics** — charts support stories, never replace them.
- **Human before AI** — AI organizes; the user decides. Always.
- **Life before productivity** — three hours with family can outweigh ten completed tasks. Chronos never assumes productivity = a meaningful life.
- **Long-term thinking** — every feature should get *more* valuable over time. Time (not daily engagement) is the core asset.

**Experience principles for every feature:**
- Minimal friction (conversation over forms)
- Immediate value (give before asking for more)
- Long-term compounding (today's small memory may be priceless in ten years)
- Human language in the UI (never "database/records/entries" — always "story/memory/reflection/chapter")
- Calm technology (Chronos earns attention, never steals it)

**AI behavior rules:**
- May: organize memories, connect related events, suggest categories, summarize, detect trends, explain patterns, answer questions about recorded life, help reconstruct incomplete days.
- Must never: invent memories, silently modify facts, auto-delete information, shame users, diagnose mental health, state predictions as certainty, or pretend to know what it doesn't.
- Must always communicate uncertainty honestly ("I may be mistaken...", "I found two possible matches...").
- User has final authority on every AI suggestion (categories, chapters, goal evolution) — AI proposes, user confirms.
- Every meaningful AI action should be explainable in plain language.
- AI-generated content is always visually distinguishable from what the user wrote themselves.

---

## 5. Core Systems (from the full product specification)

These are the named subsystems that make up Chronos. Every one of them is generated *from* the same underlying data model — nothing should be built as a parallel, disconnected system. Treat this section as the architectural map before designing any new feature.

### 5.1 LifeEvent — the fundamental domain object
Chronos does not store "activities." It stores **LifeEvents** — the smallest meaningful unit of a person's lived experience (studying, having dinner, traveling, doing absolutely nothing — all equally valid). Every other system in Chronos (Living Ring, Timeline, Reflection, Search, Chapters, AI reasoning) is a view *over* LifeEvents, not an independent data store.

**Properties every LifeEvent should satisfy:**
- **Human** — reads like "Coffee with Sarah," never "Task #182" or "Session 34." Users never see database language.
- **Temporal** — has a place in time, but precision is not required; Chronos accepts approximate durations and uncertainty.
- **Editable** — time, title, notes, people, category can all be corrected later. Memories are living, not frozen.
- **Searchable** — discoverable via natural language, never by remembering exact dates.
- **Connected** — links to People, Places, Categories, Projects, Goals, Chapters, other LifeEvents. Chronos stores relationships, not isolated records.

**Suggested fields:** Core (title, description, category, start/end/duration), Context (people, place, project, goal), Content (notes, voice transcript, AI summary, future attachments), Metadata (source, confidence score, created/updated timestamps).

**Confidence:** Every extracted property (time, category, location) can carry a confidence score. High confidence → Chronos proceeds quietly. Low confidence → Chronos asks. Never pretend certainty that doesn't exist.

**Ownership:** AI may organize, enrich, summarize, suggest — it may never silently rewrite personal history. Every meaningful modification stays transparent to the user.

### 5.2 Living Ring — the visual identity of the product
A ring visualization showing where time went for a selected period (Today / Week / Month / Year — Life view planned for later). Each segment = one category's share of time. This is the single most recognizable interface element in Chronos and should be treated as such in any design work.

- **Explicitly free of gamification:** no streaks, levels, XP, achievements, or rankings on the ring. It visualizes reality; it does not gamify it.
- **Unaccounted time is shown, not hidden** — displayed as "Still Unwritten" / "Missing Moments," inviting curiosity rather than implying failure.
- **"Remembered %"** communicates memory coverage only (e.g., "72% Remembered") — never a judgment of how good the day was.
- **Motion:** smooth, subtle, calming. Segments grow gently as memories are added. The ring never spins, flashes, or animates aggressively — calmness over excitement, always.
- **Categories are fully user-customizable** (rename, merge, archive, create) — Chronos adapts to the person, never the reverse.
- Tapping a segment navigates into the underlying Timeline entries, notes, people, and places for that category — it's a navigation surface, not just a static chart.
- **Engineering implication:** the ring stores nothing of its own; it's 100% computed from LifeEvents, guaranteeing it can never drift out of sync with the rest of the app.

#### 5.2.1 Two gap states on the ring (designed alongside Forgotten Moments, §6)
The ring must visually distinguish the two gap types defined in the Forgotten Moments spec — this distinction is a core product feature, not an edge case, so it must survive into the ring's visual language, not just the timeline view.

- **Short gaps (< 1 hour, routine):** rendered as a neutral, silent, solid-fill segment in a dark neutral tone (no category color, no border, no animation). Reads as "an unremarkable pause" — never draws the eye.
- **Forgotten Moments (≥ 1 hour):** rendered as a **dashed-outline arc with no fill** (transparent), using a warm neutral accent distinct from category colors. Carries a **slow "breathing" animation**: opacity oscillates roughly 22%→55%→22% and stroke-width oscillates subtly (e.g. 11px→14px→11px) on a ~4.5s ease-in-out loop. This stays consistent with the "never spins, flashes, or animates aggressively" rule — the motion is slow and ambient, not attention-grabbing. Purpose: signal "this is still open and fillable," never "you failed to log this."
- These two states must use visually distinct treatments (fill vs. dashed-outline-only) at all zoom levels/time periods, not just in the Today view — a Forgotten Moment should never be visually confusable with a routine gap.
- **A third state, added 2026-07-04:** an *answered* "I don't remember" record (`kind: 'unremembered'`, §6.4) is neither a routine gap nor still-open — it needs its own ring treatment, distinct from the breathing Forgotten Moment arc by both **color** (a neutral muted tone, matching how Today's Story already renders this record — not the amber "still open" accent) and **texture** (fine static dots, not the breathing arc's longer dashes), so the two "unaccounted time" states are never confused at a glance, on top of one animating and the other not.

#### 5.2.2 Interaction: tapping a Forgotten Moment segment
Because the segment's position on the ring already communicates *which hour range* is missing, tapping it is an unambiguous signal of intent to fill it in — no separate "are you sure" or "not now" affordance is needed; standard overlay-dismiss (tap outside / close) is sufficient.

Flow:
1. User taps a breathing/dashed segment.
2. A small, lightweight conversational overlay opens near the ring (not a full-screen takeover, not a form) — e.g. *"13:00–15:00 arası neredeydin?"*
3. User responds via voice or text, same as any other Life Conversation input (this reuses the existing "Instant Capture" conversation style from §5.4 — no new capture mechanism is introduced).
4. AI processes the response, creates/updates the corresponding LifeEvent. The ring itself never stores this answer — it only re-renders once the underlying LifeEvent changes, preserving the "AI never modifies the Living Ring directly" rule (§5.12).
5. If the user dismisses without answering, nothing happens — the segment simply remains a Forgotten Moment, answerable again later.

#### 5.2.3 Segment ordering & color system
**Ordering depends on the view (revised 2026-07-10, §9 Session 23).** Two orderings, chosen by scale:

- **Today view — a literal 24h clock.** The Today ring reads like a clock face: 00:00 at the top (12 o'clock), time running clockwise to 23:59, and every event and gap sits at its **real position in the day**. Nothing is merged or reordered — a category that happened twice (e.g. Work in the morning and again at night) appears as two bands at their true times, both in the same fixed color; the un-narrated night/edges become calm "unaccounted" wedges at their real position; each Forgotten Moment stays its own tappable band (§5.2.2). Implemented as `buildDayClock` (`src/domain/ring/segments.ts`) with absolute-position arc math (`ringArcsClock`, `src/components/ring/geometry.ts`); the whole day tiles the circle exactly (overlapping/contained events are clipped, never double-counted). The Today legend becomes a chronological, schedule-style list carrying each band's start time.
- **Week / Month / Year — the aggregate pie (unchanged).** A clock is meaningless across many days, so aggregate periods keep the original behavior: one segment per category, **summed and sorted largest → smallest** from 12 o'clock (`buildRingSegments`), Forgotten Moments combined into one arc, no 24h remainder wedge (§5.2.4).

*Why this changed:* the earlier design sorted the Today ring largest→smallest too ("the single biggest thing is always the most prominent segment"), deliberately treating position as not sacred and letting segments move day to day. In practice a chronological clock proved far more legible — people read their own day as a timeline, not a ranked bar chart — so for the single-day view we traded "biggest is most prominent" for "when did it happen." Recognizability is still carried by **color, not position** (see below), which is what makes the clock's day-to-day movement fine. The largest→smallest rationale still holds for aggregate periods, where there is no clock to map onto.

**Color is fixed per category, independent of position.** Once a category is assigned a color, that color never changes as segment order shifts day to day — this is what keeps the ring readable despite dynamic ordering; the user learns "blue = Learning" once and it holds regardless of where the blue segment sits that day.

**Default palette:**
- New categories draw from a predefined default palette in creation order (1st category → palette color 1, 2nd → color 2, etc.) — never random, so early behavior is predictable and reproducible.
- Default palette should contain roughly **8–10 colors**, sized for realistic category counts (Learning, Health, Family, Work, Social, Entertainment, Projects, etc.). Categories beyond the palette size get tonal variations (lighter/darker shades) rather than expanding into visually-similar hues.
- Because ordering is dynamic, **any two colors in the palette may end up adjacent on any given day** — unlike a fixed-position ring, adjacent-pair contrast alone isn't sufficient. Every color in the default palette must be mutually distinguishable from every other color, not just its usual neighbors.
- Palette must account for color-blindness (most commonly red-green) — avoid relying on hue alone between colors that collide under common color-vision deficiencies; vary lightness/saturation as a second distinguishing channel, not just hue.

**User customization + collision guidance:** users remain free to fully customize category colors (per the existing customization rule in §5.2). If a user picks a color very close to an existing category's color, Chronos should show a **gentle, non-blocking warning** (e.g., "This color is very close to Health's — they may be hard to tell apart") — informational only, never prevented. This preserves "Chronos adapts to people" while still supporting usability; the user always keeps final say.

#### 5.2.4 Week / Month / Year views
Aggregate periods are the **pie** ordering, not the Today clock (§5.2.3): a clock can't span many days, so widening to Week/Month/Year switches to an aggregation window where category segments represent **summed duration** for that category across the whole period (e.g., "12 hours Learning this week"), sorted largest-to-smallest, with the same fixed per-category colors. (The Today view alone is the chronological 24h clock; everything else in this section — combined Forgotten Moments, patterns-stay-out — applies to the aggregate views.)

**Forgotten Moments at aggregate scale:** a week/month/year necessarily contains multiple, separate Forgotten Moment gaps (e.g., Monday 14:00–15:00, Wednesday 19:00–21:00, Friday 10:00–11:00). These are combined into a **single breathing/dashed segment** on the ring representing the total unaccounted duration for the period — the ring never tries to render each individual gap as its own arc at this scale. Tapping this aggregate segment does **not** open the Today-style single-question micro-dialog (§5.2.2) — at this scale there are multiple unrelated gaps, so a single question doesn't make sense. Instead, tapping navigates into Today's Story / Timeline, where the individual underlying gaps are listed and can be addressed one at a time.

**Patterns stay out of the ring.** Weekly/Monthly/Yearly pattern detection (§6.6, the "recurring 15:00 gap" mechanic) is deliberately **not** surfaced on the ring itself — patterns remain exclusive to the dedicated Weekly/Monthly/Yearly Reflection views. The ring stays a pure, fact-only visualization of recorded duration (Facts, per §5.12); pattern commentary is an AI-generated *interpretation* (Perspective) and belongs in Reflection, not layered onto the ring. This keeps the ring's role consistent and unambiguous at every zoom level: it shows what happened, never what it might mean.

### 5.3 Today's Story — the chronological narrative view
Where the Living Ring answers "where did my time go," Today's Story answers "what actually happened." Each LifeEvent renders as a **Story Block** (time, title, category, optional notes/people/place/transcript/AI summary), read top to bottom like a modern journal — never like a spreadsheet or task list.

- **Missing Moments render explicitly** in the flow (e.g., "13:00–15:00 — Still Unwritten — Looks like this part of today hasn't been recorded yet. [Continue Story]") — an invitation, never an accusation. This is the direct ancestor of the Forgotten Moments mechanic in §6.
- Every block is fully editable (retime, rename, move, merge, split, delete) and remembers its **source** (Life Conversation, Quick Add, Manual Edit, AI Reconstruction, etc.) for transparency.
- **Today's Reflection sits at the end of the story, after the last block** — the day closes with reflection, not a statistics screen.
- Fully searchable at the block level (people, places, projects, categories, natural language).

### 5.4 Life Conversation — the primary capture mechanism
The main way people record their lives: describing the day naturally (voice, text, or mixed) instead of filling forms. Chronos listens and quietly converts narrative into structured LifeEvents in the background.

**Supported conversation styles:**
- **Instant Capture** — very short updates ("Gym for one hour.") → immediate LifeEvent, no friction.
- **Partial Story** — user only remembers part of the day; the rest stays unwritten. Never forced to "complete" anything.
- **End-of-Day Reflection** — the full day narrated at once; Chronos reconstructs the timeline automatically. (This is the primary mode the Forgotten Moments feature in §6 is built around.)
- **Multi-Day Recall** — recording yesterday, last weekend, even last year. Memory isn't bound to "today."

**Follow-up questions** are asked only when genuinely needed to resolve uncertainty (e.g., "About what time was that?") — never to interrupt narrative flow or perform routine data collection. Nothing becomes permanent without the user reviewing/approving the reconstructed day afterward.

### 5.5 Reflection Engine — the emotional/intellectual core
Generates reflections at four time scales — **Daily, Weekly, Monthly, Yearly** — each with a distinct purpose:
- Daily: help understand today
- Weekly: reveal short-term patterns
- Monthly: show gradual change
- Yearly: reveal long-term growth, told as a *story* of change, not just statistics

**Reflection writing rules (apply to all AI-generated reflection copy, everywhere in the product):**
1. **Observe before interpreting** — "You spent six evenings with family this week," never "You should study more."
2. **Respect context** — if Family is a stated priority, family time is never implicitly framed as "unproductive."
3. **Avoid guilt vocabulary entirely** — banned words: wasted, failed, lazy, disappointing. Preferred framing: "I noticed...", "It seems...", "Compared to...", "You may want to explore..."
4. **Ask more than it tells** — "What made this week feel different?" outperforms unsolicited advice.
5. **Tone = thoughtful friend**, not coach/manager/therapist: calm, humble, curious, encouraging. Openly hedges uncertainty ("It looks like...", "I may be wrong, but...").

**Goal Awareness & Evolution:** users define what currently matters (e.g., "Graduate," "Spend more time with family"). These goals give reflection its interpretive context but are never obligations. Every few weeks, if behavior meaningfully diverges from stated goals, Chronos may gently ask whether priorities have shifted — it never silently updates goals on the user's behalf.

**Engineering implication:** reflections are *regenerated interpretations*, not permanent records — if underlying LifeEvents change, reflections should be able to change too. LifeEvents are the source of truth; reflections are a derived, disposable layer on top.

### 5.6 Memory Explorer — search as remembering, not querying
Natural-language retrieval of moments, people, places, and periods — never keyword/document search. Example queries the system should just handle: *"When did I start learning Python?"*, *"What was I doing during exam week?"*, *"When was the last time I saw my grandparents?"*

- **Semantic, not literal** — searching "Programming" should also surface "Coding," "Python," "Machine Learning" if conceptually related.
- Results should feel like *memories*, not file listings (include time, Living Ring preview, related people/place, AI summary).
- **Search confidence is communicated honestly** — "I found two possible memories from that period" beats false precision.
- **Empty results are never framed as failure** — "That moment may never have been recorded" instead of "No Results Found."

#### 5.6.1 Search results and the Forgotten Moments bridge
When a search resolves to a time range, Memory Explorer must distinguish between three distinct states, not just "found" vs. "not found":
- **Never narrated at all** — no conversation ever covered that period; Chronos has no awareness of it. Result: the standard neutral empty state (§5.6's existing "That moment may never have been recorded" copy).
- **Known Forgotten Moment, still unfilled** — the period was already flagged as a gap (§6.3) but hasn't been answered yet. Result: Memory Explorer explicitly surfaces this as a recognized, already-tracked gap rather than a generic empty result — e.g., *"I don't have a record for that time — it's actually a moment we noticed earlier that hasn't been filled in yet. Want to try remembering it now?"* — and offers the same fill-in interaction used elsewhere (reuses the Life Conversation capture flow, §5.4, no new mechanism).
- **Recorded** — normal search result, rendered per §5.6's existing rules.

This makes Memory Explorer a **second entry point** into resolving Forgotten Moments (alongside the ring's tap-to-fill in §5.2.2 and the end-of-conversation bundled invite in §6.4) rather than a wholly separate system — the same underlying gap data just becomes reachable from wherever the user happens to be looking for it. It also reinforces the product's core intent in a second, complementary direction: where Forgotten Moments proactively surfaces the past, this makes the *consequence* of not narrating visible exactly when someone goes looking for that past — a natural nudge toward paying closer attention to the present, without ever saying so explicitly or judgmentally.

#### 5.6.2 Semantic matching mechanism
"Semantic, not literal" matching (§5.6's existing rule — e.g., "Programming" surfacing "Coding," "Python," "Machine Learning") is powered by two complementary signals, not one:

- **Primary: embedding/semantic similarity.** Works regardless of how (or whether) the user has organized categories — a brand-new user with zero customization still gets meaningful semantic matches, since this doesn't depend on any user-built structure existing yet.
- **Secondary, boosting signal: the user's own category structure** (§5.2's customizable categories). When LifeEvents already share a user-defined category or sub-grouping (e.g., "Python" and "Machine Learning" both filed under a "Programming" category), that shared structure boosts relevance for related searches on top of the semantic baseline — rewarding a user's own organization rather than ignoring it.

Together these mean search quality doesn't depend on the user having organized anything (semantic similarity always works), but improves further as their own categorization becomes richer (their structure adds a personalized relevance boost on top).

#### 5.6.3 Result ranking
Ranking uses two signals only — **relevance** (from §5.6.2's semantic + category-boost score) and **temporal proximity** (how close a result is to any time expression present in the query) — combined based on what the query itself contains: a purely conceptual/thematic query ("times I felt overwhelmed") ranks primarily by relevance; a query containing a time expression ("last summer," "exam week") weights temporal proximity more heavily; a query with both ("where was I in Istanbul last summer") blends the two.

**Deliberately excluded: any "emotional richness" or content-length signal** (e.g., ranking a long, detailed entry above a short one on the assumption the longer entry is more significant). This was considered and rejected — it would mean the system is implicitly deciding which memories matter more, which directly conflicts with Principle 2, "Never Judge" (§2): a terse "Went to the hospital today" can matter far more than a long, detailed walk-in-the-park entry, and Chronos has no basis for guessing which is which. Ranking stays confined to signals that describe *how well a result matches the query*, never *how important the result seems*.

### 5.7 Life Chapters — meaningful eras, not folders
Where LifeEvents describe moments, **Chapters describe eras** (e.g., "University Years," "First Internship," "The summer I lived in Antalya"). A chapter is never a manually-created folder or tag — it's discovered.

- **Discovery signals:** recurring places/people/projects/categories, routine shifts, location changes, user-defined milestones. A single event never creates a chapter — chapters emerge from sustained patterns over weeks/months.
- **Always suggested, never silently created:** *"It looks like the past four months have been centered around your internship. Would you like to group this into a Life Chapter?"* — user can accept, rename, merge, or ignore.
- Each chapter aggregates its own Timeline, Living Ring, Reflections, Milestones, Relationships, and Projects — nothing is duplicated; it's a view over existing LifeEvents.
- **Chapter Milestones** are auto-identified anchors within a chapter (first day, major transition, graduation, first release, etc.).
- Chapters connect to each other chronologically (High School → University → Internship → First Job → Chronos), so life reads as one continuous journey.

#### 5.7.1 Chapter suggestion threshold
Reuses the same evidence-based-promotion logic already established for Forgotten Moments patterns (§6.6) rather than inventing a separate threshold model — keeps the "don't claim a pattern without enough evidence" principle consistent across the whole product.

- **Minimum window:** at least **6 weeks** of data must exist before a chapter can be suggested at all — chapters are a bigger, more permanent-feeling claim than a weekly pattern, so the minimum observation window is longer than the 7-day minimum used for Forgotten Moments patterns.
- **Threshold:** within that window, the same theme (place, person, project, or category) must be dominant on **≥75%** of days — matching the strictest tier already used for Forgotten Moments' yearly "life theme" promotion (§6.6), since a chapter is a comparably strong, lasting claim about someone's life.
- As with all pattern-based suggestions in Chronos, this only ever produces a **suggestion** — "It looks like the past six weeks have been centered around your internship. Would you like to group this into a Life Chapter?" — never an auto-created chapter (§5.7's existing rule).

**Overlapping chapters are independent, never merged.** When multiple themes cross the threshold in the same window (e.g., a new city *and* a new relationship starting around the same time), each is suggested as its **own separate chapter** rather than being combined into one. This is a deliberate choice, not just a simplicity shortcut: chapters have independent lifecycles — "Living in Istanbul" might last three years while "Relationship with X" lasts eight months, and their start dates coinciding is coincidental, not causal. Merging them would break the moment their lifecycles diverge (e.g., the relationship ending would incorrectly appear to end the city chapter too, or vice versa). Multiple chapters can be active/overlapping at once; the user can always manually merge two chapters later if they genuinely want to (per §5.7's existing accept/rename/merge/ignore options), but Chronos itself never assumes two co-occurring themes are the same story.

#### 5.7.2 Chapter closing
Endings are treated as symmetrically important as beginnings, and reuse the same evidence model rather than inventing a separate one. A chapter is suggested as **complete** when its dominant theme (place/person/project/category) **drops below 25%** of days over the same 6-week evaluation window used for opening a chapter (§5.7.1) — the inverse of the ≥75% threshold that opens it. This mirrors real life directly: when a chapter genuinely ends (e.g., moving from Istanbul to Izmir), nearly everything tied to it — neighborhoods, commute patterns, routines, the people seen day to day — actually does drop away at once, so a sharp decline is a meaningful signal, not noise.

**Closing date is anchored to the real-world event, not the detection moment.** Because the system only confirms a decline after the 6-week window has played out, there's an inherent lag between the actual life change and Chronos noticing it. Rather than dating the chapter's end to whenever the system happened to detect it:
- If a relevant **Chapter Milestone** (§5.7) already exists in that period (e.g., a "Moved to Izmir" LifeEvent), that real event's date is used as the chapter's actual end date.
- If no such milestone exists, the start of the declining window is used as a default end date — and, like every AI-derived date/fact in Chronos, it remains user-editable/correctable.

**Closing is a suggestion, never automatic** — consistent with how chapters open (§5.7.1): *"Istanbul doesn't look like it's been part of your daily life for the last six weeks — should we mark 'Living in Istanbul' as complete as of [date]?"* The user accepts, adjusts the date, or dismisses it.

### 5.8 Home Experience (Dashboard) — "value before input"
The core design law of the home screen: **users receive something meaningful before Chronos asks them for anything.** Six sections, always in this priority order:
1. **Living Ring** — always the first visual element
2. **Today's Reflection** — tone adapts by time of day (morning = gentle intention, afternoon = ongoing pattern observation, evening = reflection prompt)
3. **Continue Your Story** — only appears if the day is genuinely incomplete; disappears on its own otherwise, never a nagging prompt
4. **Memory Spotlight** — one resurfaced meaningful memory per day ("This day three years ago...")
5. **Quick Capture** — voice / text / quick add — appears *after* value has already been delivered, and always feels optional
6. **Today's Progress** — memory coverage %, explicitly not a productivity score

**Notably absent by design:** anything about *tomorrow*. Chronos is about understanding the life already lived, not planning the life ahead — that's a deliberate exclusion, not an oversight.

The dashboard personalizes over time (e.g., shifts prompt timing toward when a user naturally engages, promotes voice capture if that's the preferred input) — but adaptation must remain explainable, never a black box.

#### 5.8.1 Evening invite → Home flow (resolves the overlap with §6.1's daily notification)
Tapping the daily evening notification (§6.1) does **not** drop the user straight into conversation, and does not require an extra manual step to reach the conversation either — it opens **Home already in its evening state** (per the existing adaptive-Home behavior above: Reflection, Memory Session, Missing Moments surface at this time of day). Today's Reflection is already the topmost, most prominent element, already carrying the day's invitation (e.g., "Bugünü konuşalım mı?") — so starting the conversation is still effectively one tap, but the Living Ring and any Memory Spotlight are seen first. This preserves "value before input" (§5.8's core law) without adding real friction, since the invite-to-start distance stays the same as a direct deep-link would have been.

**Day-1 / empty-state behavior requires no special-casing.** Because every Home section already disappears or adapts gracefully when it has nothing to show (§5.8's per-section empty-state design), a brand-new user's Home naturally resolves itself:
- Living Ring shows existing empty-state copy ("Your story hasn't started yet" / "Today is still waiting to be remembered") rather than looking broken.
- Memory Spotlight has nothing to resurface yet, so the section simply doesn't render — same rule as "Continue Your Story" disappearing when the day is already complete.
- Today's Reflection still occupies its normal top position and still carries an invitation, but its tone shifts from retrospective ("here's what I noticed") to initiating ("Bugün başlasın mı?") — the section's *position and role* don't change, only the copy adapts to having no history yet.

No separate "Day 1 mode" needs to be designed or built — this falls out naturally from the existing per-section empty-state rules already defined for Home.

#### 5.8.2 Memory Spotlight — selection logic
Memory Spotlight's content is deliberately weighted toward **process and continuity**, not toward resurfacing arbitrary past events. Chronos records a person's life without judgment (§2, Principle 2), which means it inevitably also stores difficult periods — an unweighted "on this day..." mechanic risks surfacing something painful without warning. Rather than solving this with an explicit "mark as sensitive" flagging system (rejected — it works against the spirit of recording lived process rather than curating a highlight reel), the fix is structural: bias the candidate pool itself toward inherently low-risk content — beginnings and continuity — rather than raw individual events.

**Candidate pool, in priority order (highest wins if multiple qualify on a given day):**
1. **Chapter Milestones** (§5.7) — "First day," "major transition," and similar milestones the Life Chapters system already identifies. Highest priority since these are already-vetted, structurally significant anchors.
2. **Continuity/progress markers** — derived from a category or project's *sustained duration* rather than a single LifeEvent (e.g., "It's been exactly one year since you started learning Python," "100 days building Chronos"). These emerge from tracking how long a theme has continuously appeared, not from any one day's content.
3. **Simple anniversary** ("On this day, N years ago...") — lowest priority, a fallback only used when neither of the above produces a candidate for that day.

If no candidate exists at all for a given day, the Memory Spotlight section simply doesn't render (consistent with Home's general empty-state rule, §5.8.1).

#### 5.8.3 Quick Capture — voice vs. text default
**Default is voice-first, text-secondary.** This follows directly from the existing "speaking should always feel easier than typing" rule (§5.4) — Quick Capture should surface voice as the primary, most prominent action from Day 1, with text always available as a lightweight secondary option (e.g., a small "or type instead" link), never hidden or removed.

**No separate context-awareness engine is needed.** Rather than building bespoke logic to guess when text might be preferable (e.g., commuting, being around other people, late at night), Quick Capture's default input mode should simply be governed by the existing Personalization Engine (§5.10) — which already learns per-user, per-context input preferences over time. This keeps Quick Capture consistent with how the rest of Home already personalizes (e.g., prompt timing) without introducing a new, parallel adaptation system. Day 1 stays simple and predictable (voice-first for everyone); personalization naturally takes over as real usage data accumulates.

#### 5.8.4 Today's Progress — percentage calculation
**Denominator is fixed at 24 hours** (not "waking hours") — kept simple and universal, no per-user awake-window configuration needed. This only works fairly because of the sleep-handling rule below; without it, a fixed 24-hour denominator would unfairly cap most users around 65–70% and manufacture a false sense of "always behind."

**Sleep is a semi-automatic LifeEvent**, not something the user has to narrate like other activities. Two lightweight paths, either is acceptable at implementation time:
- User states a default sleep window once (e.g., "I usually sleep 23:00–07:00"), and Chronos auto-fills that block into each day going forward, editable/correctable like any other LifeEvent.
- Or Chronos asks a very light one-time-per-day confirmation ("Did you sleep around your usual time?") rather than requiring full narration.

Because sleep resolves to a real LifeEvent either way, it counts as "remembered" time — it never shows up as a gap or Forgotten Moment, and the 24-hour-denominator percentage isn't artificially deflated by a block of time nobody expects to actively narrate. This keeps §5.8's existing rule intact: "Remembered %" reflects memory coverage only, never a judgment of the day's quality — and now also never penalizes the user for the simple fact of having slept.

### 5.9 Gentle Presence — notifications & widgets
Governing rule: **attention is earned, never demanded.** Success is not measured by how often the app is opened.

**Four notification types**, all non-urgent, all avoidable without penalty:
- Gentle Reminders ("today still has a few unwritten moments")
- Memory Moments ("this day, two years ago...")
- Chapter Moments (observational, e.g. "you've now spent six months building Chronos" — never framed as an achievement/badge)
- Reflection Invitations ("How was today?") — this is the canonical touchpoint the Forgotten Moments daily invite (§6.1) is built from

**Frequency principle:** "One meaningful notification is worth more than ten ignored ones." Silence is an explicitly acceptable, often-correct product behavior — the system should default to sending nothing rather than sending something low-value. Timing should adapt to the individual's real routine rather than firing on a fixed global schedule.

**Engineering implication:** every notification must be explainable after the fact — the system should always be able to answer "why did the user get this?"

### 5.10 Personalization Engine
Chronos becomes more personal with use, but strictly to **reduce friction and increase relevance** — never to predict or manipulate. Learns things like preferred recording time, voice-vs-text preference, reflection depth preference, and which memory themes (Family, Travel, Projects...) the user actually revisits.

**Hard boundaries (personalization must never):**
- manipulate emotions
- change the interface unexpectedly
- hide information
- optimize for engagement
- exploit behavioral patterns

Every adaptation should be explainable ("why did this change?") — invisible adaptation still requires visible reasoning available to the user on request.

### 5.11 Ownership & Longevity
Chronos is designed to survive the product itself. Core commitments, treated as permanent constraints on any technical design:
- **Full export** at any time, in durable formats (JSON, Markdown, PDF, Calendar, Personal Archive) — memories must stay readable *without* Chronos.
- **Full, frictionless deletion** — individual events, entire days, chapters, or everything. No dark patterns, no artificial friction.
- **Facts vs. interpretations vs. suggestions are always distinguishable** to the user — this transparency layering is a hard product requirement, not a nice-to-have.
- **AI independence:** if AI models change or improve, previously recorded LifeEvents (facts) remain valid and unchanged — only *interpretations* may be regenerated. Facts never get silently rewritten by a model upgrade.
- Every core data model should be versioned; migrations must never risk personal history. Treat user memories with at least the rigor of source code.

### 5.12 Trust & AI Principles (facts vs. perspectives)
Formalizes a layering that should show up in the actual data model, not just in copywriting:
- **Facts** — objective, user-owned (time, place, person, duration, the recorded event itself). Foundation of the system, immutable.
- **Perspectives** — AI-generated (reflections, trends, patterns, insights). Explicitly **suggestions, never truth** — always editable, replaceable, or regenerable without touching the underlying facts.

AI responsibilities and limits (system-wide, not feature-specific):
- **May:** organize memories, connect related events, suggest categories, summarize, detect trends, explain patterns, answer questions about recorded life, help reconstruct incomplete days.
- **Must never:** invent memories, silently modify facts, auto-delete information, shame users, diagnose mental health, state predictions as certainty, or pretend to know what it doesn't.
- **User authority is always final** — category suggestions, chapter suggestions, goal evolution all require explicit user confirmation. AI assists; it never takes control.
- **Explainability is mandatory** — any meaningful AI action should be answerable with "because similar events have previously been categorized as Learning," not a black box.
- Nothing AI-generated should ever appear as if the user wrote it themselves — always visually/contextually marked as AI-originated (summary, reflection, suggestion, generated story).

---

## 6. Designed Feature: Forgotten Moments (v0 core mechanic)

This is the first concrete feature spec, designed to directly test the core hypothesis: *"Do people value having their forgotten time surfaced back to them, without judgment?"* It deliberately avoids passive tracking (screen time APIs, permissions, platform restrictions) and instead derives everything from the user's own natural-language account of their day.

### 6.1 Trigger — the daily invite
- **Frequency:** Exactly one notification per day. No second reminder. No "we missed you" messages. Missing a day has zero penalty and no streak concept exists.
- **Timing:** Hybrid model.
  - User picks their preferred time during onboarding (e.g., 21:00).
  - AI silently observes actual response times. If the user consistently responds at a meaningfully different time for ~2 weeks, AI may ask **once**, gently: *"You usually reply around 22:00 — want me to move the reminder there?"* User decides; AI never silently changes it.
- **Tone:** Same format every day (predictability builds trust). Content can lightly vary — sometimes a plain invite ("Want to talk about today?"), sometimes a thread from the previous day's conversation for continuity. Never gimmicky, never emoji-driven manipulation.

### 6.2 Capture — the conversation
- User describes their day in natural language (voice or text), uninterrupted. No mid-conversation interruptions to ask about gaps — that happens only at the end.
- AI extracts events/activities and their approximate time ranges from the narrative as it's told.

### 6.3 Gap detection
- After the conversation ends, AI analyzes the described events and finds time gaps between them.
- **Gaps under 1 hour:** treated as normal/routine (bathroom breaks, small errands, transitions). Rendered as neutral **gray** segments on the timeline. Never surfaced or questioned.
- **Gaps of 1 hour or more:** flagged as a **Forgotten Moment**. Rendered as a **question-mark segment** on the timeline (not gray) — signals "this can still be filled in," inviting rather than accusatory.

### 6.4 The invite to fill gaps
- AI never interrogates gap-by-gap. All detected Forgotten Moments for that day are bundled into **one single, gentle invitation** at the end of the conversation, ordered starting with the longest gap.
- Example tone: *"You've covered most of today — I didn't catch what happened between 13:00–15:00 or 19:00–20:00. Want to fill one in now, or come back to them later?"*
- Control stays with the user: fill it in now, ask the AI to help reconstruct it, or leave it unfilled.
- **"I don't remember" is a valid, complete outcome** — not an error state. It gets recorded as-is. The absence of memory is itself meaningful data, not a failure to fix.

### 6.5 Forgotten Moment timeline representation
- Stays marked with a question-mark indicator (not gray) even if never filled — because unlike routine gaps, this represents something that happened but wasn't remembered, and remains fillable retroactively (the user might recall it days later; that recall should be easy to add back).

### 6.6 Pattern detection — the compounding layer
Patterns are the mechanism that makes forgotten time *mean something* over time, not just a one-off log.

**Weekly pattern (birth of a pattern):**
- Requires a minimum of 7 days of data (a full week) before any pattern is calculated — never before. This prevents false-confidence patterns from small samples.
- If a given time-of-day range (not specific days — the *hour range* is what matters, e.g. "15:00–16:00") appears as a Forgotten Moment in **≥50%** of the days with data that week → it becomes a **weekly pattern**.

**Monthly promotion:**
- Tracked across the last 4 weekly cycles.
- If the same time-range pattern recurs in **≥75%** of those weeks (i.e., 3 of the last 4) → promoted to a **monthly pattern** ("a recurring pattern," not just a one-week blip).

**Yearly promotion — "life theme":**
- Tracked across the last 12 monthly cycles.
- If the same pattern recurs in **≥75%** of those months (i.e., 9 of the last 12) → promoted to a **yearly "life theme."**
- Thresholds intentionally get stricter at each level — a bigger claim requires stronger evidence. This also means reaching "life theme" status is rare and should feel meaningful to the user, not inflated.

**Pattern identity:** Patterns are keyed by time-of-day range, not by specific weekday — what matters is *which part of the day* keeps disappearing, not which days of the week.

**Surfacing patterns:**
- Never shown mid-conversation or immediately upon detection — that would break the calm, uninterrupted capture flow and feel surveillance-like.
- Shown only in dedicated **Weekly / Monthly / Yearly reflection views** — moments the user has already entered a "looking back" mindset, so a pattern feels like insight, not intrusion.
- Tone is always observational, never diagnostic. Never: *"You're always distracted at 3pm."* Always: *"Over the last week, mid-afternoon around 15:00 has often gone unaccounted for — that seems to be a recurring gap for you. Curious what's usually happening there?"*
- Never states a conclusion. Always ends with the question returned to the user — they own the interpretation, per Principle 7 and the AI Limitations rules in §4.

### 6.7 Full v0 flow (reference)
```
Single daily invite (fixed time, fixed tone)
        ↓
User narrates their day naturally, uninterrupted
        ↓
AI detects gaps after the conversation ends
        ↓
Gaps < 1hr → gray, silent, routine
Gaps ≥ 1hr → Forgotten Moment (question-mark)
        ↓
One bundled, gentle invitation (longest gap first)
        ↓
User fills it / AI helps reconstruct / left unfilled — all valid
        ↓
Weekly pattern (≥50%, min. 7 days of data)
        ↓
Monthly promotion (≥75% of last 4 weeks)
        ↓
Yearly "life theme" promotion (≥75% of last 12 months)
        ↓
Surfaced only in Weekly/Monthly/Yearly reflection views, always as an open question
```

### 6.8 Why this design (for future feature decisions, use this as the template)
- Avoids passive tracking entirely (no Screen Time API, no permissions friction, no platform-specific limitations) — value is derived purely from the user's own account of their day.
- "I don't remember" being a valid, non-error outcome is the actual point of the feature, not a failure mode — it's where the self-awareness the product is trying to build actually happens.
- The escalating evidence thresholds (50% → 75% → 75%) encode "don't destroy trust with false confidence" directly into the mechanic, not just as a UI copy guideline.
- The single bundled invite (vs. sequential gap-by-gap questioning) is what keeps the conversation feeling like being talked *with*, not interrogated.

---

## 7. Working Notes for Claude Code

- When implementing anything, check it against §2 (Principles) and §3 (Anti-Goals) first. If a feature or copy choice violates either, flag it rather than silently building it.
- Default to natural-language-first UX. If a feature seems to require the user to fill out a form or pick from rigid structured input where a conversational alternative is plausible, prefer the conversational alternative.
- Any user-facing copy involving time, gaps, or reflection must follow the "observation, not verdict" tone shown in §5.5 (Reflection Engine rules) and §6.6 (Pattern surfacing) — no diagnostic or judgmental phrasing, ever end on a question that returns interpretation to the user.
- No streaks, no leaderboards, no engagement-maximizing notification patterns — these are permanently out of scope, not just deferred.
- Every feature should be understood as a view over LifeEvents (§5.1) wherever possible — avoid creating parallel data models for new features unless a LifeEvent-based approach genuinely can't express it.
- This document will grow as more features are designed together. Treat it as living — update it rather than letting design decisions live only in chat history.

---

## 8. Tech Stack & Architecture Decisions (v0)

> Recorded 2026-07-02, when Forgotten Moments v0 implementation began. This is the durable home for the stack/architecture choices that used to live in the (now-removed) `README.md`. Update it as decisions change — it is part of the source of truth now.

### Confirmed stack
- **Frontend:** Next.js (App Router) · React · TypeScript · Tailwind CSS · shadcn/ui
- **Backend / persistence:** Supabase · PostgreSQL (Row Level Security on from day one). **Now provisioned & wired (2026-07-07, §9 Session 21):** Google sign-in (Supabase Auth) + per-user `life_events` / `user_state` tables with RLS `auth.uid() = user_id`. Activates only when `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set; **with them unset the app falls back to the original single-user, file-backed local mode** (no auth, offline dev).
- **AI:** Anthropic Claude via the Anthropic API. Extraction sits behind a `LifeEventExtractor` interface so the model is swappable; multi-model (incl. OpenAI) stays a *planned* option, not a v0 dependency. Default model: Claude Sonnet 5, configurable.
- **Mobile:** React Native (planned, later — voice capture, home-screen widgets, and push notifications per §5.9 live there).

> **Voice on web (added 2026-07-06).** §5.8.3 requires Quick Capture to be voice-first from Day 1, but there is no React Native app yet — so v0 ships a *web* voice path via the browser **Web Speech API** (dictation into the existing capture surfaces through a `useSpeechRecognition` hook + reusable `MicButton`), not the RN voice capture noted above. Tradeoff, disclosed in the Quick Capture UI: in Chrome the audio is transcribed server-side by the browser vendor (the single external-service touchpoint against Principle 9). **No transcript is persisted** — the spec's LifeEvent transcript field (§5.1/§5.3) stays unimplemented; recognized speech becomes the `narrative` text, which the extractor turns into candidate events like any typed story (so no schema/migration was needed).
- **Tooling:** pnpm · Vitest (unit/integration) · Playwright (E2E + visual regression).

### Architecture principles (v0)
- **Layered, framework-agnostic core.** `src/domain/*` is pure TypeScript (no framework/AI/DB imports) and holds the heart of the product: gap detection, the pattern engine, invite building, the tone guardrail. AI, data, and UI all depend inward on it. This is how "build for decades" (§10) becomes concrete — the core outlives any framework.
- **Everything is a view over LifeEvents (§5.1).** No parallel data stores. Timeline, Forgotten Moments, patterns, and "Remembered %" are all *computed* from the same `LifeEvent[]`.
- **Gaps are computed, never stored.** Routine gaps (<1h) and Forgotten Moments (≥1h) are derived on the fly from the ordered events of a day; nothing gap-related is persisted. Pattern history is recomputed from events too. This guarantees the timeline can never drift out of sync (§5.2).
- **Facts vs. Perspectives are separated in the schema (§5.11 / §5.12).** User-authored facts live in `life_events`; AI output (summaries, patterns, reflections) lives in `perspectives`. A model upgrade may regenerate *perspectives* but must never rewrite a *fact*.
- **"I don't remember" is a real record, not an error (§6.4).** Filling a gap → a substantive `LifeEvent`. Saying "I don't remember" → a `LifeEvent` with `kind: 'unremembered'`: it still shows a question-mark (§6.5), still counts as forgotten for pattern detection, but is no longer re-surfaced in the invite.
- **Nothing AI-extracted persists without user review (§5.4 / §5.12).** Capture → AI candidate events → user reviews/edits/confirms → persist. AI-authored content is always visually marked as AI.
- **Time model.** Store a UTC instant + IANA timezone. A "day" = the user's local calendar day; gaps are computed only *between* the first and last recorded event of that day (so unnarrated sleep/night is never flagged as forgotten). Patterns are keyed by **hour-of-day bucket** (§6.6), not by weekday. Note (2026-07-03): §5.8.4 later makes sleep a semi-automatic LifeEvent; once that lands, the sleep block bounds the day as a real event and this between-first-and-last-event scope needs revisiting. Update (2026-07-06): on the **Today** view the Living Ring's *circle* is the full 24h day, with the un-narrated remainder shown as one calm "unaccounted" wedge (§9 Sessions 18, 20); **aggregate periods (week/month/year) omit that wedge** — their circle is just the accounted time, since a multi-day remainder would swamp the ring (§9 Session 20). This only ever changed the ring's denominator — *gap detection* is unchanged (still between-events), so the sleep caveat above still stands for Forgotten Moments specifically.
- **Ownership primitives are first-class (§5.11).** Export (JSON + Markdown in v0) and real deletion (event / day / everything) are built at the data layer, not bolted on afterward.

### App theme palette — "Chronos Design System"
Adopted 2026-07-10 (§9 Session 24), **superseding "Quiet Teal";** refined into a **"warm paper"** variant 2026-07-10 (§9 Session 25). Direction: warm off-white paper + a single **deep-green** accent, Notion/Linear/Apple restraint — color is reserved for the ring, progress, active controls and status. **Inter** for UI/body, **Fraunces** (a warm literary serif, semibold) for the brand/display (`src/app/layout.tsx`). The Session 25 refinement kept every Session 24 structural decision (deep-green accent, semantic tokens, 18px radius) but (a) warmed the neutral paper/ink a touch so it reads like a journal rather than a productivity tool, and (b) swapped the display face from Geist (sans) back to a serif — recovering the narrative character "Quiet Teal" carried, without giving up the newer system's discipline. Implemented as CSS custom properties in `src/app/globals.css`; light is `:root`, dark follows the OS's `prefers-color-scheme` (no manual toggle — every Tailwind utility resolves through these variables via `@theme inline`, so the theme swap needed no component changes). The serif reaches the whole app through the existing `.font-display` class (brand wordmark, section headings, Story titles, ring center, Forgotten-Moment labels). Also set via `@theme`: an 18px house radius (`--radius-xl`, on cards/dialogs) and an 8pt-friendly radius scale.

| Token | Light | Dark |
|---|---|---|
| `--background` | `#f8f6f1` | `#121110` |
| `--surface` (secondary bg) | `#efece4` | `#201e1c` |
| `--card` | `#fffdf9` | `#1a1917` |
| `--foreground` | `#1e1c19` | `#f4f1ea` |
| `--muted` | `#6c6862` | `#a7a29a` |
| `--line` | `#e6e1d7` | `#2c2a27` |
| `--accent` | `#295e4a` | `#4f9d7c` |
| `--accent-ink` | `#f1f7f4` | `#0e1a15` |
| `--accent-soft` | `#dde7e0` | `#22352c` |
| `--success` | `#43a047` | `#55c07a` |
| `--warning` | `#e59b28` | `#f1a63b` |
| `--error` | `#d94a4a` | `#e06a6a` |
| `--question` | `#e59b28` | `#f1a63b` |
| `--question-bg` | `#fbf0dc` | `#2c2417` |
| `--question-line` | `#efd9a9` | `#4a3c22` |

`--question` (the "unwritten time" amber) equals the Living Ring's `RING_FORGOTTEN_ACCENT` (`src/domain/ring/palette.ts`); they remain two separately-maintained literals (a CSS custom property can't be read by the TS domain layer), cross-referenced by comment in both files.

**Ring category palette (§5.2.3) is green-anchored to match this system:** `DEFAULT_CATEGORY_PALETTE` leads with the deep-green accent as category 1, then muted premium hues chosen to stay mutually distinct and CVD-safe (per the design decision, over a pure monochrome-green ramp, which failed §5.2.3's distinctness rule). "Sleep = grey" from the raw design brief is deliberately **not** a palette default — grey belongs to the gap states; Sleep gets a normal palette hue.

**Known follow-up, still not done:** the Ring's own colors (category palette + gap neutrals + forgotten accent) are plain TS hex constants baked into SVG `stroke` values — they don't route through `var(--...)`, so they use a single value on both themes rather than switching. They were chosen to read on both the light paper and the dark ground; migrating them to CSS custom properties (so they'd inherit the light/dark mechanism) remains the cleaner long-term fix.

### Living plan
Active implementation plan: `.claude/plans/forgotten-moments-v0.plan.md`.

---

## 9. Design Decision Log

Reverse-chronological log of the design sessions that shaped this document. Add a new entry at the top whenever a design session changes the spec.

- **[Session 25]** **"Warm paper" refinement of the Chronos Design System** (§8 updated). Kept every Session 24 structural decision — deep-green accent (`#295E4A`/`#4F9D7C`), `--surface` + semantic `--success/--warning/--error` tokens, the 18px radius scale, Inter for UI/body — but changed two things that made the Session 24 look drift toward generic clean-SaaS: (1) **warmed the neutral paper/ink** on both themes (light `--background` `#fafaf8`→`#f8f6f1`, `--foreground` `#161616`→`#1e1c19`, plus surface/card/muted/line; dark warmed symmetrically `#101112`→`#121110`, ink `#f5f5f5`→`#f4f1ea`) so it reads like a journal, not a tool; (2) **swapped the display/brand face from Geist (sans) back to a serif — Fraunces** (semibold), reaching the whole app via the existing `.font-display` class (wordmark, headings, Story titles, ring center, Forgotten-Moment labels) with zero component changes. Rationale: recover the narrative character "Quiet Teal" had (warm paper + serif) without giving up the newer system's discipline — the hybrid a user comparison asked for. The Ring category palette (`palette.ts`) is unchanged; the "Ring colors don't route through CSS vars" follow-up still stands. Files: `src/app/layout.tsx`, `src/app/globals.css`. Published a light/dark side-by-side artifact comparing all three directions (Quiet Teal / Session-24 green / Warm Paper). 277 tests green; `build` clean.
- **[Session 24]** **New visual identity — "Chronos Design System"** (§8 rewritten, superseding "Quiet Teal"). Clean off-white paper + a single deep-green accent (`#295E4A` light / `#4F9D7C` dark), Notion/Linear/Apple restraint; added `--surface` and semantic `--success/--warning/--error` tokens, an 18px house radius, and switched UI/body to **Inter** with **Geist** (bold) for the brand (`layout.tsx`). Token-only swap in `globals.css` — zero component changes (every utility resolves through `@theme` vars). The Living Ring category palette (`palette.ts`) was re-anchored to lead with the deep green, then muted, mutually-distinct, CVD-safe hues — chosen over the raw brief's monochrome-green ramp, which would have broken §5.2.3's distinctness/legibility rule (4 adjacent greens); gap neutrals + the forgotten amber were retuned to the new theme too. "Sleep = grey" intentionally left out of the palette (grey stays reserved for gap states). Published a light/dark preview artifact of the full system (theme, the 24h ring, palette, type, components). 277 tests green; `tsc`/`eslint`/`build` clean.
- **[Session 23]** **Living Ring → literal 24h clock on Today (§5.2.3 revised).** The Today ring was a duration-sorted pie (largest→smallest from 12 o'clock); it's now a real clock — 00:00 at top, clockwise to 23:59, every event/gap at its true position, nothing merged or reordered. Same-category blocks appear as separate bands at their real times (same fixed color); the un-narrated night/edges become "unaccounted" wedges in place; each Forgotten Moment stays its own tappable band. New `buildDayClock` + `ringArcsClock` (absolute-position arc math, touching bands, no padding); the day tiles the circle exactly (overlaps clipped, never double-counted). The Today legend is now a chronological, start-time-tagged schedule. **Week/Month/Year are unchanged** — still the aggregate largest→smallest pie (`buildRingSegments`), since a clock can't span multiple days; the handler picks `buildDayClock` when the window is a single day, else `buildRingSegments`, and returns a `layout: 'clock' | 'aggregate'` flag the ring uses to choose geometry. Files: `src/domain/ring/segments.ts`, `src/components/ring/{geometry,LivingRing,RingSection,labels}.tsx`, `src/app/api/ring/handler.ts`. Verified on real 2026-07-04 data (13 bands tiling 1440 min, chronological). 277 tests green.
- **[Session 22]** Added a **Google Gemini extractor** (`src/ai/gemini-extractor.ts`) — a free-tier cloud option behind the same `LifeEventExtractor` interface, using Gemini's `responseSchema` for reliable structured output (the local qwen2.5:7b was dropping times). Wired into `get-extractor.ts` (`CHRONOS_EXTRACTOR=gemini` + `GEMINI_API_KEY`, auto-picked after Claude, before Ollama); `ExtractorKind` + the review provenance badge gained `'gemini'`. Also fixed a backend RLS gap from Session 21: raw-SQL-created tables don't inherit Supabase's automatic grants, so `authenticated` had no table privileges (`permission denied for table`) — added an explicit `grant … to authenticated` migration.
- **[Session 21]** **Accounts + real multi-user backend.** Wired the long-planned Supabase swap (§8): **Google sign-in** via Supabase Auth (`@supabase/ssr` cookie sessions) and **Postgres persistence with RLS** — `life_events` + `user_state` tables, policies `auth.uid() = user_id` (incl. `with check` on insert/update, closing the write-time ownership gap the file store never had). New Supabase repositories drop in behind the existing `LifeEventRepository`/`UserStateRepository` interfaces (request-scoped, RLS-bound); `user_state.update` uses optimistic concurrency (`updated_at` guard + retry) to replace the file store's in-process write-queue. A single `resolveDataContext()` picks Supabase-authed vs. the **file-backed dev fallback** — so with no Supabase env the app runs exactly as before (single-user, offline, no login). All handlers unchanged (they already took `userId` + repos); only the `route.ts` seam + the weekly page changed. Login/callback/signout routes + middleware guard added. The `DEV_USER_ID` → `auth.uid()` migration was indeed just a value swap. Google OAuth (Google Cloud Console + Supabase provider config) is the one hand-setup step (see README). Files: `src/lib/supabase/*`, `src/data/{data-context,supabase-*}.ts`, `src/middleware.ts`, `src/app/{login,auth/*}`, the API `route.ts` set, `settings`/`reflections/weekly` pages.
- **[Session 20]** Living Ring, two tweaks from real use. (1) **Category palette redone** (`DEFAULT_CATEGORY_PALETTE`) — the earlier muted Paul-Tol scheme read as too similar; replaced with saturated, well-separated hues that also vary in lightness (so pairs stay distinct including under red-green CVD, per §5.2.3), still avoiding the reserved gap neutrals. (2) **The "unaccounted" / "Yet to tell" wedge is now Today-only** — week/month/year omit it (a multi-day 24h remainder swamped the ring and said nothing useful); aggregate periods show only accounted time again. Guard is `days.length === 1` in `buildRingSegments`. Files: `src/domain/ring/palette.ts`, `src/domain/ring/segments.ts`.
- **[Session 19]** Review step + web layout. (1) The review step's free-text **Category** field is now **preset chips** — the user's own used categories first (colored to match the ring), then a Turkish default seed (İş, Öğrenme, Sağlık, Aile, Sosyal, Dinlenme, Ev, Spor), plus a **"+ Yeni"** chip to add one. Picking a chip sets `categoryConfidence: 1` (a human choice, not an AI guess). New read-only `GET /api/categories` (`buildCategorySuggestions` over `categoryColors` + defaults); categories remain free-form everywhere — chips are pure convenience, and new ones still get colors via the normal commit→ring flow. Covers Quick Capture too (same review step). (2) **Web gets a two-column story view** at `lg:` (≥1024px): the Living Ring is **sticky on the left**, the story + Quick Capture on the **right**, root widened to `max-w-6xl`; **mobile is unchanged** (single stacked column, same DOM order). Files: `src/domain/category/suggestions.ts`, `src/app/api/categories/*`, `src/components/today/{CategoryPicker,ReviewList,TodayApp,api}`, `src/components/ring/{RingSection,LivingRing}`.
- **[Session 18]** Living Ring, three fixes from real use. (1) The ring's circle is now the **full 24h day** (period = 24h × days), not just the narrated span — whatever the story doesn't cover surfaces as one calm **"unaccounted" wedge** ("Yet to tell", faint neutral `RING_UNACCOUNTED_COLOR`), added only once a day has any events (an empty day keeps its empty-ring placeholder). Aligns the ring with §5.8.4's 24h denominator; gap detection is untouched (still between-events, so sleep is still never flagged "forgotten"). (2) **Uncategorized events now render as their own titled wedges** instead of merging into one anonymous blob — a recorded moment always shows as itself, which is what "my added things don't show" actually was. (3) Retired the "Not yet sorted" label. Files: `src/domain/ring/segments.ts`, `src/domain/ring/palette.ts`, `src/app/api/ring/handler.ts`, `src/components/ring/labels.ts`.
- **[Session 17]** Capture: added the two missing ways to record a day — **voice input** and **Quick Capture** (§5.4 / §5.8.3), both web-first since there's no React Native yet. Voice is dictation via the browser Web Speech API (new `useSpeechRecognition` hook + reusable `MicButton`) feeding the existing story textarea and the new quick box — greenfield, no persistence change; the Chrome-transcribes-server-side privacy caveat is disclosed in the UI and documented in §8. Quick Capture is a voice-first single-line box on the story view: a short natural-language line runs through the same AI extraction and is handed to the *existing* review step tagged `source: 'quick-add'` (reused rather than a parallel confirm UI), preserving "nothing AI-extracted persists without review." The `'quick-add'` source already existed in the type system but had no UI producer until now.
- **[Session 16]** Living Ring: gave the answered "unremembered" record its own visual treatment (§5.2.1's new third bullet) — it had been reusing the Forgotten Moment's amber/breathing look dimmed down, which read as visually confusable with the still-open state it's meant to be distinct from. Now a neutral muted color (matching Today's Story's own treatment of the same record) with a fine dotted texture, no animation — color and shape both signal "answered, settled," never "still open." Also added a hover tooltip, ring/legend hover-linking, and a gentle grow-in entrance animation fulfilling the previously-unimplemented "segments grow gently" line in §5.2.
- **[Session 15]** Decided the app's overall UI theme palette (§8 "App theme palette"), previously an undocumented inline code comment — direction "Quiet Teal," with a proper dark mode via `prefers-color-scheme` (the app was light-only before). Unified the "unwritten time" amber between Today's Story and the Living Ring into one shared value; flagged the Ring's own colors as not yet dark-mode-aware. Also shipped real deletion end-to-end (§5.11 — previously only the data layer existed, no UI ever called it): per-event delete in Today's Story, and a `/settings` page for exporting or permanently deleting everything.

- **[Session 14]** Memory Explorer: defined result ranking (§5.6.3) — relevance + temporal proximity only, weighted by what the query itself contains; explicitly excluded an "emotional richness"/length-based signal since it would implicitly judge which memories matter more, conflicting with Principle 2. **Memory Explorer design is now complete** (§5.6, §5.6.1–§5.6.3).
- **[Session 13]** Memory Explorer: defined the semantic matching mechanism (§5.6.2) — embedding-based similarity as the always-on primary signal, with the user's own category structure acting as a secondary relevance boost on top.
- **[Session 12]** Memory Explorer: defined the three-state search result model (§5.6.1) — never-narrated / known-unfilled-Forgotten-Moment / recorded — making Memory Explorer a second entry point for resolving Forgotten Moments alongside the ring and the end-of-conversation invite.
- **[Session 11]** Life Chapters: defined chapter closing (§5.7.2) — symmetric to opening, triggers when dominance drops below 25% over the same 6-week window; closing date anchors to a real Chapter Milestone when one exists rather than the detection moment; closing is always a suggestion, never automatic. **Life Chapters design is now complete** (§5.7, §5.7.1, §5.7.2).
- **[Session 10]** Life Chapters: overlapping themes (e.g., new city + new relationship starting together) are suggested as independent chapters, never auto-merged — chapters have independent start/end lifecycles, and conflating them would break when one ends and the other doesn't. User can still manually merge if desired.
- **[Session 9]** Life Chapters: defined the chapter-suggestion threshold (§5.7.1) by reusing the Forgotten Moments pattern-promotion model (§6.6) — minimum 6-week observation window, ≥75% day-dominance required (matching the "life theme" tier), always a suggestion, never auto-created.
- **[Session 8]** Home Experience: Today's Progress uses a fixed 24-hour denominator (§5.8.4), made fair by treating sleep as a semi-automatic LifeEvent (user-set default window or light daily confirmation) so sleep counts as "remembered" rather than manufacturing a permanent gap. **Home Experience design is now complete** (§5.8.1–§5.8.4).
- **[Session 7]** Home Experience: Quick Capture defaults to voice-first/text-secondary from Day 1 (§5.8.3); no new context-awareness engine — voice-vs-text preference over time is handled entirely by the existing Personalization Engine (§5.10).
- **[Session 6]** Home Experience: defined Memory Spotlight's selection logic (§5.8.2) — candidate pool deliberately weighted toward process/continuity (Chapter Milestones > continuity markers > simple anniversary) instead of an explicit sensitive-memory flagging system, to structurally reduce the risk of surfacing painful content unprompted.
- **[Session 5]** Home Experience: resolved the overlap between the daily evening notification (§6.1) and the Home dashboard — notification opens Home already in evening state with the invite already topmost (§5.8.1), and Day-1/empty-state behavior falls out naturally from existing per-section empty-state rules, no special-casing needed.
- **[Session 4]** Living Ring: defined Week/Month/Year behavior — same duration-aggregation logic at all scales (§5.2.4), Forgotten Moments combine into one aggregate segment that navigates to Today's Story rather than opening a micro-dialog, and patterns stay excluded from the ring entirely (Reflection-only).
- **[Session 3]** Living Ring: decided dynamic largest-to-smallest segment ordering (12 o'clock start) with fixed-per-category color (§5.2.3), default palette sizing/accessibility rules, and gentle non-blocking color-collision warnings.
- **[Session 2]** Living Ring: detailed the two-gap-state visual language (§5.2.1) and the tap-to-fill micro-interaction (§5.2.2) for Forgotten Moments on the ring.
