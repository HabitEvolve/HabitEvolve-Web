---
name: HabitEvolve Web
description: Operator and coaching console for the HabitEvolve gamified habit-tracking app
colors:
  brand-primary: "#006d36"
  brand-primary-light: "#4ade80"
  brand-primary-dark: "#004d26"
  admin-surface: "#B5EBE0"
  admin-active: "#f7a561"
  mentor-surface: "#EDE9FE"
  mentor-active: "#7C3AED"
  neutral-bg: "#f4fafd"
  neutral-surface: "#ffffff"
  neutral-ink: "#0e1a12"
  neutral-border: "#e4e7ec"
  neutral-muted: "#667085"
  success: "#12b76a"
  error: "#f04438"
  warning: "#f79009"
  info: "#0ba5ec"
  game-streak: "#E85D20"
  game-flame: "#FF6B35"
  game-tertiary: "#7e22ce"
  neo-outline: "#3d4a3e"
typography:
  display:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "72px"
    fontWeight: 900
    lineHeight: "90px"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: "44px"
    letterSpacing: "normal"
  title:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "30px"
    letterSpacing: "normal"
  body:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
    letterSpacing: "normal"
  label:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "18px"
    letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "14px 20px"
  button-primary-hover:
    backgroundColor: "#005a2e"
  button-outline:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "#344054"
    rounded: "{rounded.sm}"
    padding: "14px 20px"
  badge-light-primary:
    backgroundColor: "#dcfce7"
    textColor: "{colors.brand-primary}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-solid-success:
    backgroundColor: "{colors.success}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  input-default:
    backgroundColor: "transparent"
    textColor: "#1a2b1e"
    rounded: "{rounded.sm}"
    height: "44px"
  card-default:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
  sidebar-admin-active:
    backgroundColor: "{colors.admin-active}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  sidebar-mentor-active:
    backgroundColor: "{colors.mentor-active}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

# Design System: HabitEvolve Web

## 1. Overview

**Creative North Star: "The Basecamp"**

HabitEvolve Web is the calm command post from which admins and mentors run other people's expeditions — quests, parties, boss raids, streaks. The people using it are not here to be delighted by the interface; they're here to move fast, trust the numbers, and get back to coaching. So the chrome stays precise and unshowy: flat surfaces, an 8px-based radius system, one typeface, and shadows that only ever answer a question of depth (is this floating above the page?) rather than decorate.

Game energy is real in this product — it's the whole point of the mobile app this console operates — but it lives at the edges here: icon sets, streak colors, the neo-brutalism button/card variants reserved for motivational surfaces (boss raid, wallet, streaks). It never invades a data table, a config form, or an approval queue, where clarity is the only job. This system explicitly rejects looking like an unmodified admin template (visible TailAdmin scaffolding) and rejects applying the mobile app's full neo-brutalism treatment to operational screens.

One deliberate signal carries through every screen: **role color**. Admin surfaces run on mint-and-orange (sidebar `#B5EBE0`, active `#f7a561`); the Mentor portal runs on lavender-and-purple (sidebar `#EDE9FE`, active `#7C3AED`). Neither role's sidebar borrows brand green — that's reserved for buttons, links, and true brand moments — so at a glance, the sidebar alone tells you which seat you're sitting in.

**Key Characteristics:**
- Single typeface (Space Grotesk) carrying everything from 72px stat headlines down to 12px table labels
- Flat cards and inputs with soft utility shadows, never decorative ones
- 8/12/16/24px radius ladder shared by both admin chrome and game components
- Role-colored sidebars (mint+orange for Admin, lavender+purple for Mentor) as a functional wayfinding signal, not a cosmetic choice
- Neo-brutalism (`neo-card`, `neo-button`, hard-offset shadows) reserved for gamified surfaces only

## 2. Colors

The palette is a trustworthy, low-saturation neutral base (cool white-mint) with brand green as the one true accent, plus two role-signal pairs that exist only in sidebar chrome.

### Primary
- **Deep Forest Green** (`#006d36`, brand-primary): The one brand color that means "this is HabitEvolve" and "this is actionable." Primary buttons, active links, focus rings, checked states. Never used as a sidebar background — that's the role-color's job.
- **Sprout Green** (`#4ade80`, brand-primary-light): Highlight/container tint for brand-colored surfaces on gamified screens (quest progress, primary game containers).
- **Pine Green** (`#004d26`, brand-primary-dark): Hover/pressed state for primary actions, and dark-mode brand text.

### Secondary — Role Signals (Admin)
- **Field Mint** (`#B5EBE0`, admin-surface): Admin sidebar background. Exists only there.
- **Ember Orange** (`#f7a561`, admin-active): Admin sidebar active/open-submenu state. The one warm color allowed inside admin chrome.

### Secondary — Role Signals (Mentor)
- **Basecamp Lavender** (`#EDE9FE`, mentor-surface): Mentor sidebar background. Exists only there.
- **Signal Purple** (`#7C3AED`, mentor-active): Mentor sidebar active state, and the mentor-only "coach" badge.

### Tertiary — Game Accents (motivational surfaces only)
- **Streak Ember** (`#E85D20`, game-streak) and **Flame** (`#FF6B35`, game-flame): Streak counters and daily-fire indicators.
- **Raid Purple** (`#7e22ce`, game-tertiary): Boss raid tier/rarity accents.
- **Outline Ink** (`#3d4a3e`, neo-outline): The hard 4px border and drop-shadow color for every `neo-*` component.

### Neutral
- **Mist White** (`#f4fafd`, neutral-bg): Page background.
- **Paper** (`#ffffff`, neutral-surface): Cards, inputs, modals, table rows.
- **Ink** (`#0e1a12`, neutral-ink): Primary text, headline numbers.
- **Hairline** (`#e4e7ec`, neutral-border): Card borders, table dividers.
- **Slate** (`#667085`, neutral-muted): Secondary text, hints, placeholders (always checked against 4.5:1, never a lighter step).

### State
- **Success** (`#12b76a`), **Error** (`#f04438`), **Warning** (`#f79009`), **Info** (`#0ba5ec`): Badge and inline-status colors. Always paired with a label or icon — see the Legibility Rule below.

### Named Rules
**The Role-Color Rule.** Sidebar background and active-state color are the only place role identity lives as full color. Admin = mint surface + orange active. Mentor = lavender surface + purple active. Brand green never appears as a sidebar background in either role — it stays reserved for actionable brand moments (buttons, links, focus rings) so it keeps meaning "do this," not "you are here."

**The Legibility Rule.** No state (approved/pending/rejected, subscription tier, boss difficulty) is communicated by color alone. Every colored badge carries a label; every colored icon carries a shape distinct from its neighbors.

## 3. Typography

**Display/Body/Label Font:** Space Grotesk (fallback: sans-serif) — one family for the entire system, weight does the differentiating work instead of a second typeface.

**Character:** A geometric grotesk that reads as confident and current without being decorative — it carries both a $125,000 dashboard stat and a 12px table label without switching personality.

### Hierarchy
- **Display** (900, 72px / 90px, -0.02em): Rare — hero dashboard stat callouts only (e.g. `text-3xl font-black` stat cards use a scaled-down 30px cut of this same weight).
- **Headline** (700, 36px / 44px): Section-level numbers and page-level emphasis.
- **Title** (700, 20px / 30px): Card headers, page titles, modal headers.
- **Body** (500, 14px / 20px): Default UI text — labels, table cells, form copy. Caps at 65–75ch in prose contexts (proof descriptions, quest instructions).
- **Label** (600, 12px / 18px, +0.02em): Table column headers, badges, timestamps, helper hints.

### Named Rules
**The One-Family Rule.** Every weight from 500 to 900 is Space Grotesk. Introducing a second family for "emphasis" is prohibited — reach for weight or size first.

## 4. Elevation

Flat by default, with soft utility shadows reserved for real overlays. Cards and inputs sit on the page with a 1px border and, at most, a barely-visible ambient shadow (`shadow-theme-xs`) — depth is not the point, legibility is. Shadow grows only when something is genuinely floating above the page: dropdowns, modals, tooltips, the date picker.

### Shadow Vocabulary
- **theme-xs** (`0px 1px 2px 0px rgba(16,24,40,0.05)`): Resting state for inputs, small buttons.
- **theme-sm** (`0px 1px 3px 0px rgba(16,24,40,0.1), 0px 1px 2px 0px rgba(16,24,40,0.06)`): Resting cards, table containers.
- **theme-md** (`0px 4px 8px -2px rgba(16,24,40,0.1), 0px 2px 4px -2px rgba(16,24,40,0.06)`): Dropdowns, popovers.
- **theme-lg / theme-xl**: Modals and the date picker — the deepest shadows in the system, used sparingly.
- **neo-card / neo-button / neo-modal**: Hard 4–6px offset shadows with zero blur, color `#3d4a3e`. Exclusive to gamified components — never mixed with the soft `theme-*` shadows on the same element.

### Named Rules
**The No-Mixing Rule.** Soft ambient shadows (`theme-*`) and hard neo-brutalism offset shadows (`neo-*`) never appear on the same component. A card is either an operational card (soft, bordered, flat) or a game card (hard border, hard offset shadow) — never both.

## 5. Components

Precise and unshowy: shapes stay small and consistent, feedback is quick and quiet, and the "game" variants are a clearly separate register rather than a stylistic option applied inconsistently.

### Buttons
- **Shape:** 8px radius (`rounded-lg`) for all standard buttons.
- **Primary:** Deep Forest Green background, white text, `shadow-theme-xs` at rest, Pine Green (`#005a2e`) on hover, 40%-opacity Sprout Green fill when disabled.
- **Outline:** White background, slate text, 1px gray-300 ring, hover fills to gray-50.
- **Game / Game-Outline:** `neo-button` — 4px solid `#3d4a3e` border, hard offset shadow that lifts on hover (`translate(-2px,-2px)`) and collapses flat on press (`translate(2px,2px)`, shadow removed). Reserved for boss raid, wallet, and other motivational mentor screens.

### Badges
- **Light variant:** Tinted background (e.g. `bg-brand-50` / `text-brand-500`) — default for status pills in tables.
- **Solid variant:** Full-color background, white text — used when a status needs to dominate the row (rejected, expired).
- **Shape:** Fully rounded (`rounded-full`), 12px label text, always includes a text label alongside color (Legibility Rule).

### Cards / Containers
- **Corner Style:** 16px radius (`rounded-2xl`) for operational cards; 16–24px (`neo-card`) for game cards.
- **Background:** White, 1px `gray-200` border, `shadow-theme-xs`-or-none at rest.
- **Border:** Present on every operational card — this system does not float cards on background-tint alone.
- **Internal Padding:** 24px body, with a 20px header separated by a 1px `gray-100` divider (see `ComponentCard`).

### Inputs / Fields
- **Style:** 44px height, 8px radius, 1px `gray-300` border, transparent background, gray-400 placeholder.
- **Focus:** Border shifts to Sprout Green (`brand-300`) with a 3px `brand-500/20` ring — no color change without the ring, no ring without the border shift.
- **Error / Success:** Border and ring swap to `error-500`/`success-500`; the hint text below the field always restates the state in words.

### Navigation
- **Admin Sidebar:** Field Mint background, 12px-radius nav items, Ember Orange fill on the active item, `hover:bg-white/30` on inactive items.
- **Mentor Sidebar:** Basecamp Lavender background, same 12px-radius items, Signal Purple fill on active, game-icon set (64px PNGs from the mobile icon library) instead of line icons.
- **Both:** Section dividers are a 1px hairline in the role's own outline tint (`#1a3a3a`/20 for Admin, `#3b1f6e`/20 for Mentor), never the neutral gray divider.

### Neo Components (mentor game surfaces)
`neo-card`, `neo-button`, `neo-input` share one visual grammar: 2–4px solid `#3d4a3e` (or `game-border`) outlines, hard offset shadows with zero blur, and a lift-on-hover/press-on-active motion instead of an opacity or color fade. This is the only place in the system where borders exceed 1–2px and shadows have zero blur — a deliberate, contained exception.

## 6. Do's and Don'ts

### Do:
- **Do** keep role color (mint+orange / lavender+purple) exclusive to sidebar chrome — it's a wayfinding signal, not a decoration to reuse elsewhere.
- **Do** pair every status color with a text label or distinct icon shape (approve/reject, subscription tier, boss difficulty).
- **Do** use the 8/12/16/24px radius ladder for every new component — pick the nearest existing step rather than a new value.
- **Do** reserve `neo-*` hard-shadow components for gamified, motivational surfaces (boss raid, streaks, wallet) in the Mentor portal.
- **Do** run every new string through i18next (EN/VI) — no hardcoded copy.

### Don't:
- **Don't** let the interface read as an unmodified admin template — no visible generic TailAdmin scaffolding without HabitEvolve's own color and type layered on.
- **Don't** apply full neo-brutalism treatment (hard borders, zero-blur offset shadows) to operational screens — tables, config forms, and approval queues stay flat and soft-shadowed.
- **Don't** mix `theme-*` soft shadows and `neo-*` hard shadows on the same element.
- **Don't** use brand green (`#006d36`) as a sidebar background in either role — it's reserved for actionable brand moments, not identity chrome.
- **Don't** introduce a second typeface for "emphasis." Space Grotesk carries the whole hierarchy through weight and size alone.
- **Don't** drop body/placeholder text below the 4.5:1 contrast floor — `neutral-muted` (`#667085`) is the lightest allowed step on white, never a lighter gray "for elegance."
