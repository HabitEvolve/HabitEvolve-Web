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
  sky-ink: "#24344D"
  sky-ink-2: "rgba(36,52,77,0.62)"
  sky-ink-3: "rgba(36,52,77,0.38)"
  sky-deep: "#3D6DA6"
  sky-deep-lo: "#5C8CC4"
  sky-peach: "#F0AC72"
  sky-peach-deep: "#A85F1F"
  sky-rose: "#C4708A"
  sky-surf: "rgba(255,255,255,0.72)"
  sky-surf-border: "rgba(255,255,255,0.92)"
  sky-shadow: "#24344D"
  sky-1: "#A9C7E8"
  sky-2: "#C0D8F1"
  sky-3: "#D7EAF8"
  sky-4: "#EEF6FD"
  sky-cream: "#F5F0E8"
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
  chip: "14px"
  card: "20px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.sky-deep}"
    textColor: "#ffffff"
    rounded: "{rounded.chip}"
    padding: "14px 20px"
  button-primary-hover:
    backgroundColor: "{colors.sky-deep-lo}"
  button-outline:
    backgroundColor: "{colors.sky-surf}"
    textColor: "{colors.sky-ink}"
    rounded: "{rounded.chip}"
    padding: "14px 20px"
  badge-rarity:
    fg: "per-tier — see Rarity Badges"
    bg: "per-tier, 12-14% opacity of fg"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-solid-success:
    backgroundColor: "{colors.success}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  input-default:
    backgroundColor: "{colors.sky-surf}"
    textColor: "{colors.sky-ink}"
    rounded: "{rounded.chip}"
    height: "44px"
  card-glass:
    backgroundColor: "{colors.sky-surf}"
    rounded: "{rounded.card}"
    padding: "24px"
  sidebar-admin-active:
    backgroundColor: "{colors.admin-active}"
    textColor: "#ffffff"
    rounded: "12px"
    padding: "12px 16px"
  sidebar-mentor-active:
    backgroundColor: "{colors.mentor-active}"
    textColor: "#ffffff"
    rounded: "12px"
    padding: "12px 16px"
---

# Design System: HabitEvolve Web

## 1. Overview

**Creative North Star: "The Basecamp, in Glass"**

HabitEvolve Web is the command post from which admins and mentors run other people's expeditions — quests, parties, boss raids, streaks. As of this revision, **the entire console — Admin and Mentor alike — runs on Sky-Pastel**: Mobile's current default visual language (liquid-glass surfaces, mesh-gradient backdrops, soft ink-blue shadows that are never pure black). This replaces the older flat/bordered "operational card" system and fully retires the neo-brutalism (`neo-*`) token set that previously lived on Mentor's motivational surfaces.

**Deprecation notice.** Neo-Brutalism (Sticker layer — heavy `#3d4a3e`/`#000` borders, hard zero-blur offset shadows, `neo-card`/`neo-button`/`neo-input`/`btn-neo`) is **fully deprecated across the whole web project**. It was itself a port of Mobile's *oldest* layer, since superseded on Mobile by Sky-Pastel. Do not use `neo-*` or `btn-neo` classes in new work; treat any surviving instance as migration debt, not a valid alternate register. The tokens remain in `src/index.css` only until existing usages are migrated — do not extend them.

**One system, two moods, not two systems.** Admin and Mentor now share the same glass/mesh/shadow grammar — the distinction between them is no longer "flat vs. game," it's **density and color temperature**:
- **Mentor Portal** — highly gamified: saturated mesh gradients, floating glass cards used liberally, `sky-deep`/`sky-peach` accents front and center.
- **Admin Portal** — high data density: the same glass and radius language, but panels sit on a muted slate-tinted wash rather than the colorful sky mesh, glass effects are restrained to container chrome (page background, card shells) rather than applied inside dense tables/grids, so rows of data stay crisp and legible.

**Key Characteristics:**
- Liquid-glass containers (`sky-glass`) — translucent frosted surface, real `backdrop-filter: blur()`, specular top edge, faint ink bevel at the bottom.
- Mesh-gradient backdrops (`sky-mesh-bg`) — soft radial color blobs over a diagonal wash, replacing flat single-color page backgrounds.
- Shadows are always soft and ink-blue-tinted (`sky-shadow` / `rgba(36,52,77,…)`), **never pure black** — black shadows read as "dirty" against the warm/cool tints in this system.
- Radius hierarchy: **20px** for cards/modals, **14px** for buttons/chips, full-pill for badges.
- Space Grotesk stays the one typeface (see Named Rules) — only Mobile's *size/weight* scale was adopted, not its font family.
- Role-colored sidebars (mint+orange Admin, lavender+purple Mentor) are unchanged — they're a wayfinding signal orthogonal to the surface-treatment change above.

## 2. Colors

### Primary / Action
- **Sky Deep** (`#3D6DA6`, `sky-deep`): The primary action color across both portals now — buttons, links, focus states, active nav. Paired with **Sky Deep-Lo** (`#5C8CC4`, `sky-deep-lo`) as the light head of primary-action gradients (`sky-glass-fill`).
- **Deep Forest Green** (`#006d36`, `brand-primary`): Reserved for true brand moments — logo, marketing/auth surfaces, the "Visual Gate" panel gradient. No longer the default interactive color inside app chrome; `sky-deep` carries that role now.

### Reward / Destructive
- **Sky Peach** (`#F0AC72`) / **Peach Deep** (`#A85F1F` as text): Reward-only — gold, streak, achievements. Never used for a generic CTA.
- **Sky Rose** (`#C4708A`): Destructive actions (remove mentee, revoke access, log out).

### Secondary — Role Signals (unchanged)
- **Field Mint** (`#B5EBE0`, admin-surface) + **Ember Orange** (`#f7a561`, admin-active): Admin sidebar only.
- **Basecamp Lavender** (`#EDE9FE`, mentor-surface) + **Signal Purple** (`#7C3AED`, mentor-active): Mentor sidebar only.
- **The Role-Color Rule still holds**: sidebar background/active-state color is the only place role identity lives as full saturated color. This is independent of the Sky-Pastel unification above — role color is wayfinding, not surface treatment.

### Ink & Glass
- **Sky Ink** (`#24344D`, `sky-ink`) / **Ink-2** (62% opacity) / **Ink-3** (38% opacity): The three text greys on Sky-Pastel surfaces, replacing `neutral-ink`/`neutral-muted` inside glass containers.
- **Glass surface** (`sky-surf` `rgba(255,255,255,.72)`, border `sky-surf-border` `rgba(255,255,255,.92)`): The frosted-white base every `sky-glass*` utility composites over the mesh.
- **Shadow tint** (`sky-shadow` `#24344D`): Every shadow in the system routes through this ink-blue, at varying opacity — see Elevation.

### Mesh Backdrop (atmosphere only — never text)
`sky-1` `#A9C7E8` → `sky-2` `#C0D8F1` → `sky-3` `#D7EAF8` → `sky-4` `#EEF6FD`, over `sky-cream` `#F5F0E8`. All four sky-N steps are under 2:1 contrast on cream by design — they exist purely for the mesh/glow/chart-fill layer, never for legible type.

### Rarity Badges
Boss-raid / item-tier badges — `fg` on a matching low-opacity `bg`:
| Tier | fg | bg |
|---|---|---|
| Common | `#7E8CA3` | `rgba(126,140,163,0.12)` |
| Rare | `#4C8DD6` | `rgba(76,141,214,0.13)` |
| Epic | `#8B6DE0` | `rgba(139,109,224,0.13)` |
| Legendary | `#E0902F` | `rgba(224,144,47,0.14)` |

### Tertiary — Game Accents (still motivational-surface-only)
**Streak Ember** (`#E85D20`) / **Flame** (`#FF6B35`) for streak counters, **Raid Purple** (`#7e22ce`) for boss-raid accents beyond the rarity table above. These are colors, not the deprecated hard-shadow mechanism — express them via glass badges/pills, never via `neo-*` shadows or thick borders.

### State
Unchanged: **Success** (`#12b76a`), **Error** (`#f04438`), **Warning** (`#f79009`), **Info** (`#0ba5ec`). Always paired with a label or icon (Legibility Rule).

### Named Rules
**The Glass-Not-Black Rule.** Every shadow in this system is ink-blue-tinted (`sky-shadow`), at 14–40% opacity depending on elevation. A pure-black or pure-gray shadow anywhere in new work is a bug, not a style choice — it reads as dirty against both the sky mesh and the slate-tinted Admin wash.
**The Role-Color Rule.** Unchanged from prior revision — see Colors → Secondary above.
**The Legibility Rule.** Unchanged — no state (approved/pending/rejected, subscription tier, boss difficulty) is color-only; every colored badge carries a label.

## 3. Typography

**Font:** Space Grotesk stays the system's one typeface. Mobile's Sky-Pastel redesign uses Plus Jakarta Sans — **Web deliberately does not follow that swap**, to preserve brand identity and avoid re-testing line-length/wrap behavior across every dense Admin table. What *was* adopted from Sky-Pastel is its size/weight rhythm, re-set in Space Grotesk:

| Step | Size / Line-height | Typical weight | Use |
|---|---|---|---|
| sky-h1 | 28 / 36px | 800 (extrabold) | Sky-Pastel screen titles (Mentor headers) |
| sky-h2 | 24 / 32px | 700 | Section headers on glass surfaces |
| sky-h3 | 20 / 28px | 600 | Card headers |
| sky-body | 16 / 24px | 400–500 | Default UI text on Sky-Pastel surfaces |
| sky-small | 12 / 18px | 500 | Captions, timestamps, helper hints |
| sky-xs | 10 / 16px | 500 | Micro-labels (rarity chips, currency ticks) |

The pre-existing `display`/`headline`/`title`/`body`/`label` scale (frontmatter above) remains valid for admin-dense contexts (stat headlines, table labels) — use whichever step matches the surface: `sky-*` sizes on glass containers, the original scale on dense data chrome.

### Named Rules
**The One-Family Rule.** Unchanged: every weight from 400 to 900 is Space Grotesk. No second family, on either portal, regardless of Mobile's own font choice.

## 4. Elevation

**Soft, ink-blue, and always blurred — hard zero-blur offset shadows are retired.** Every surface either sits flat (rare — deep in a dense table body) or floats on a `sky-shadow`-tinted soft shadow. There is no longer a "flat operational card vs. game card" fork — glass is now the default container, just tuned differently by portal (see §1, §6).

### Shadow Vocabulary
- **shadow-sky-glass** (`0 6px 20px rgba(36,52,77,.16)`): Default floating glass card (`sky-glass`).
- **shadow-sky-tint** (`0 8px 12px rgba(36,52,77,.20)`): Flat tint panel, no blur (`sky-glass-tint`) — secondary panels, dense list containers.
- **shadow-sky-chip** (`0 8px 12px rgba(36,52,77,.14)`): Small glass buttons/icon chips (`sky-glass-chip`).
- **shadow-sky-fill** (`0 14px 20px rgba(61,109,166,.40)`): Deep-gradient CTA/hero surfaces (`sky-glass-fill`), shadow tinted `sky-deep` instead of `sky-ink`.
- **theme-xs / theme-sm / theme-md / theme-lg / theme-xl**: The prior soft-shadow ladder remains valid for dense Admin data chrome (table containers, dropdowns) that isn't a glass panel — still ink-neutral gray, not black, and never mixed with `sky-*` shadows on the same element.

### Named Rules
**The No-Black-Shadow Rule** (supersedes the old No-Mixing Rule). `neo-*` hard shadows are deprecated project-wide. The live constraint now is: shadow color always comes from `sky-shadow` (glass surfaces) or the neutral `theme-*` gray ladder (dense data chrome) — never black, never mixed within one element.

## 5. Components

### Buttons
- **Shape:** 14px radius (`rounded-sky-chip`) for all buttons, both portals.
- **Primary:** `sky-glass-fill` gradient (`sky-deep-lo` → `sky-deep`), white text, `shadow-sky-fill` at rest.
- **Outline / Glass:** `sky-glass-chip` surface — translucent white, 1px `sky-surf-border`, `shadow-sky-chip`.
- **Destructive:** Same shapes, `sky-rose` as the fill/ink color.
- `neo-button` / `btn-neo` are deprecated — do not use in new components.

### Badges
- **Rarity / tier:** `fg` on tier `bg` from the Rarity Badges table above, fully rounded, 12px label, always paired with text (Legibility Rule).
- **Status (success/error/warning/info):** Unchanged solid/light pattern from the prior system, fully rounded.

### Cards / Containers
- **Shape:** 20px radius (`rounded-sky-card`) for every card, replacing the old 16px (`rounded-2xl`) operational default.
- **Mentor:** `sky-glass` (frosted, blurred, over `sky-mesh-bg`) as the default; `sky-glass-tint` for secondary panels; `sky-glass-fill` for hero/CTA surfaces.
- **Admin:** Same `sky-glass`/`sky-glass-tint` shells, composited over a **muted slate wash** (existing neutral `gray-50`/`gray-100` tokens) instead of the colorful sky mesh — glass chrome stays on the *container* (page background, card shell, panel header), while table/grid **row content itself stays on an opaque `gray-50`/`white` background**, not blurred, so dense data keeps full contrast and render performance stays acceptable at row-count scale. *(Note: the slate-tinted mesh/glass variant for Admin is a documented target — `src/index.css` currently only ships the colorful Mentor-tuned `sky-mesh-bg`; a neutral Admin variant needs to be added before Admin components can consume this literally — see follow-up.)*

### Inputs / Fields
- **Style:** 44px height, 14px radius, `sky-surf` background, `sky-surf-border` border.
- **Focus:** Border shifts to `sky-deep` with a 3px `sky-deep/20` ring.
- **Error / Success:** Border/ring swap to `error-500`/`success-500`; hint text always restates state in words.

### Navigation
Unchanged from prior revision — Admin sidebar Field Mint + Ember Orange active, Mentor sidebar Basecamp Lavender + Signal Purple active, both 12px-radius nav items. Sidebar chrome is intentionally exempt from the glass treatment — it's the one place role-color solidity matters more than the shared surface language.

## 6. Portal Distinction (within one shared system)

| | Mentor Portal | Admin Portal |
|---|---|---|
| Backdrop | `sky-mesh-bg` — full saturated mesh gradient, used extensively per-screen | Muted slate wash (neutral gray tokens) — see follow-up note in §5 |
| Card default | `sky-glass`, liberal use, floating feel | `sky-glass`/`sky-glass-tint` restrained to container chrome; row/cell content stays opaque |
| Density | Low — fewer simultaneous choices, generous spacing | High — power-user tables, bulk actions, minimal chrome |
| Accent temperature | `sky-peach` reward accents, rarity badges, streak colors used freely | Accent kept to state colors (success/error/warning/info) + `sky-deep` actions; reward/rarity colors rarely appear |

Both portals draw from the same token system (§2–§5) — this table is about *how much* of the glass/mesh vocabulary a screen reaches for, not a different vocabulary.

## 7. Do's and Don'ts

### Do:
- **Do** use `sky-glass`/`sky-glass-tint`/`sky-glass-chip`/`sky-glass-fill` as the default container vocabulary on both portals.
- **Do** keep every shadow ink-blue-tinted (`sky-shadow`) or neutral-gray (`theme-*`) — never black.
- **Do** keep role color (mint+orange / lavender+purple) exclusive to sidebar chrome.
- **Do** pair every status/rarity color with a text label or distinct icon shape.
- **Do** use the 20px (card) / 14px (button/chip) / full (badge/pill) radius steps for new components.
- **Do** run every new string through i18next (EN/VI) — no hardcoded copy.

### Don't:
- **Don't** use `neo-card`, `neo-button`, `neo-input`, or `btn-neo` in new work — deprecated project-wide.
- **Don't** apply live `backdrop-filter: blur()` inside dense table/grid rows — keep blur to container chrome; row content stays opaque for legibility and render performance.
- **Don't** introduce a second typeface — Space Grotesk carries the whole hierarchy, including the ported Sky-Pastel size steps.
- **Don't** use `brand-primary` (`#006d36`) as an interactive/action color inside app chrome — that's `sky-deep`'s role now; `brand-primary` is reserved for true brand/marketing moments.
- **Don't** drop text below the 4.5:1 contrast floor — glass surfaces are translucent, so re-check contrast per background, especially `sky-ink-2`/`sky-ink-3` over saturated mesh regions.

---

**Follow-up needed (not yet in `src/index.css`):** a neutral/slate-tinted variant of `sky-mesh-bg` and possibly `sky-glass-tint` for Admin's muted backdrop, distinct from Mentor's colorful mesh. Flagging so the next implementation pass adds it rather than reusing the Mentor-tuned mesh literally on Admin screens.
