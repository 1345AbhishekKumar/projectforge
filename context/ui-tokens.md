# UI Tokens

Design tokens for ProjectForge. All colors, typography, spacing, and component values extracted from the delivered hand-drawn/sketch design. Use these exact values throughout the codebase — never hardcode colors or use raw Tailwind/CSS classes for non-token values.

---

## Colors

| Token Name | CSS Variable | Hex Value | Role / Usage |
| :--- | :--- | :--- | :--- |
| **Primary** | `--color-primary` | `#000000` | Marker outline strokes, page titles, text |
| **Secondary** | `--color-secondary` | `#4A4A4A` | Body copy, descriptions, structural details |
| **Tertiary** | `--color-tertiary` | `#00a099` | Teal brand highlight, CTA buttons, active state accents |
| **Tertiary Hover** | `--color-tertiary-hover` | `#008B8B` | Hover state for teal elements |
| **Neutral Background**| `--color-neutral-bg` | `#FAF9F6` | Off-white canvas background representing a paper board |
| **Neutral Dot** | `--color-neutral-dot`| `#E5E5E5` | Grid background dots |
| **Surface Card** | `--color-surface-card`| `#FFFFFF` | Core container backgrounds |
| **Accent Indigo** | `--color-accent-indigo`| `#6366F1` | Interactive elements, active plan highlight |
| **Accent Yellow** | `--color-accent-yellow`| `#FFF2B2` | Post-it task notes, general task badges |
| **Accent Pink** | `--color-accent-pink` | `#FFD2D2` | Sprint tracking, alert highlights |
| **Accent Blue** | `--color-accent-blue` | `#D0E1FD` | Document management cards, metadata groups |
| **Accent Green** | `--color-accent-green`| `#D4EDDA` | Done column task badges, success indicators |
| **Accent Orange** | `--color-accent-orange`| `#FF7F50` | collaborator cursor pointers |

---

## Typography

Two main font families must be registered and used:
1. **Sketch Font (`--font-sketch`)**: Hand-drawn style font (`Caveat`, `Architects Daughter`, or `Comic Neue`) for headlines and playful details.
2. **Sans Font (`--font-sans`)**: Clean Sans-serif (`Inter`, `Outfit`) for core functional text, feature details, and forms.

| Style Level | Font Family | Size | Weight | Line Height | Case / Spacing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `--font-sketch` | `56px` | Bold (`700`) | `1.1` | `-0.01em` |
| **H1** | `--font-sketch` | `40px` | Bold (`700`) | `1.2` | `0em` |
| **H2** | `--font-sketch` | `32px` | Bold (`700`) | `1.2` | `0em` |
| **H3** | `--font-sketch` | `24px` | Bold (`700`) | `1.3` | `0em` |
| **Body LG** | `--font-sans` | `18px` | Regular (`400`) | `1.6` | `0em` |
| **Body MD** | `--font-sans` | `15px` | Regular (`400`) | `1.5` | `0em` |
| **Body SM** | `--font-sans` | `13px` | Regular (`400`) | `1.4` | `0em` |
| **Label LG** | `--font-sans` | `15px` | Bold (`600`) | `1.2` | Uppercase |
| **Label MD** | `--font-sans` | `14px` | Bold (`600`) | `1.2` | `0em` |
| **Caption** | `--font-sans` | `12px` | Medium (`500`) | `1.3` | `0em` |

---

## Spacing & Layout

The spatial rhythm relies on an **8px base grid**:

- `--space-xs`: `4px`
- `--space-sm`: `8px`
- `--space-md`: `16px`
- `--space-lg`: `24px`
- `--space-xl`: `32px`
- `--space-2xl`: `48px`
- `--space-3xl`: `64px`
- `--space-section`: `96px` (vertical section margins)
- `--space-gutter`: `24px` (grid gutter width)

---

## Elevation (Shadows & Offsets)

- **Sketchy Offsets (`--shadow-card-offset`)**: `4px 4px 0px 0px #000000` (renders a solid black offset copy for 2D pop-art depth).
- **Physical Elevation (`--shadow-sticky-note`)**: `2px 4px 8px 0px rgba(0,0,0,0.12)` (renders soft realistic depth for physical objects like post-its).

---

## Shapes (Border Radius)

- `--radius-sharp`: `2px` (Sticky notes, paper cuts)
- `--radius-sketch`: `12px` (Standard sketchy cards, boards, column lists)
- `--radius-pill`: `9999px` (Teal buttons, active highlighting badges, user tags)
