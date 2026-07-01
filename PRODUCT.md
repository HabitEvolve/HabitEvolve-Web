# Product

## Register

product

## Users

Two primary user groups, both working through a desk-based dashboard during focused work sessions:

- **Internal Admins** — ops/support staff who run the whole platform: users, quest library, goals, bosses, subscriptions, courts, questionnaires, system config. High-frequency, high-volume workflows; they live in this tool daily.
- **External Mentors** — paying coaches, often less technical, who manage only their own mentees: assigning quests (individual or party fan-out), reviewing proof submissions, tracking their subscription wallet, and running weekly boss raids for their party.

Both roles are gated by RBAC (`ADMIN` / `MENTOR`) with fully separate layouts (`AppLayout`/`AppSidebar` vs `MentorLayout`/`MentorSidebar`).

## Product Purpose

HabitEvolve Web is the operator and coaching console for the HabitEvolve gamified habit-tracking mobile app. Admins keep the platform running correctly (content, users, economy, system ops); mentors coach real people through it (quests, proof review, boss raids, subscription management). Success looks like: admins complete platform operations quickly and without ambiguity, and mentors — who aren't necessarily technical — complete coaching tasks without confusion or support tickets.

## Brand Personality

Trustworthy, efficient, clean.

- **Admin surfaces** optimize for speed and density: power-user tables, bulk actions, minimal chrome, fewest clicks to the next decision.
- **Mentor surfaces** optimize for approachability: clearer language, fewer simultaneous choices, more confirmation and guidance — same underlying system, different pacing.
- The console echoes HabitEvolve's own identity (brand green, the mobile app's gamified energy) rather than reading as a generic off-the-shelf admin template — but game/neo-brutalism visual language is a seasoning for motivational surfaces (boss raid, streaks), not the base flavor for operational screens.

## Anti-references

- Generic, unmodified admin-template look (visible TailAdmin scaffolding, default component styling with no brand identity layered on).
- Full neo-brutalism/game treatment applied to data-dense operational screens (tables, config forms, approval queues) — undermines clarity and trust where precision matters most.
- Anything that makes the Mentor portal feel as technical/dense as the Admin console — mentors are a different, less technical audience.

## Design Principles

1. **Two sub-registers, one system.** Admin views lean dense and fast; Mentor views lean guided and forgiving. Both draw from the same token system and component library so the product feels coherent, not fragmented.
2. **Evolve past the template.** Retire generic admin-template signatures in favor of HabitEvolve's own green/mint identity so the console reads as a first-party product, not a starter kit.
3. **Borrow game energy sparingly.** The mobile app's neo-brutalism/streak visual language belongs on motivational surfaces (boss raid, wallet, streaks) — not on tables, forms, or system config where clarity wins over personality.
4. **Trustworthy through legible state.** Approval, subscription, wallet, and tier-gated actions must always show unambiguous status (pending/approved/rejected, tier level) — never color alone.
5. **Bilingual by default.** Every user-facing string flows through i18next (EN/VI); no hardcoded copy in new UI.

## Accessibility & Inclusion

- WCAG AA baseline: ≥4.5:1 contrast for body text, ≥3:1 for large text, visible focus states and full keyboard navigation on all interactive elements.
- State is never color-only (approve/reject, tier gates, boss difficulty) — pair color with icon, label, or shape.
- Respect `prefers-reduced-motion` for all animation (toast transitions, hover/press effects, reveals).
- Full EN/VI language support via i18next; no hardcoded strings.
