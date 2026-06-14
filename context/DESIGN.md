---
version: alpha
name: ProjectForge Design System
description: A sketchy, hand-drawn design system built for collaborative and creative modern teams, blending a playful comic/marker aesthetic with clean functional layout structure.
colors:
  primary: "#000000"
  secondary: "#4A4A4A"
  tertiary: "#00a099" # Teal accent
  tertiary-hover: "#008B8B"
  neutral-bg: "#FAF9F6" # Off-white base
  neutral-dot: "#E5E5E5" # Dot grid color
  surface-card: "#FFFFFF"
  accent-purple: "#6366F1" # Indigo/Purple for Pro plan/Jordan cursors
  accent-purple-light: "#EEF2FF"
  accent-pink: "#FFD2D2" # Muted Pink for Sprints/Testimonials
  accent-yellow: "#FFF2B2" # Muted Yellow for Sprints/Sticky notes
  accent-blue: "#D0E1FD" # Muted Blue for Centralizing/Sticky notes
  accent-green: "#D4EDDA" # Muted Green for Security/Sticky notes
  accent-orange: "#FF7F50" # Cursor orange
  border-dark: "#000000"
  border-subtle: "rgba(0,0,0,0.08)"
  text-muted: "#757575"
gradients:
  flat color system — no gradients used:
    usage: None
typography:
  display:
    fontFamily: "'Caveat', 'Architects Daughter', 'Comic Neue', cursive"
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  h1:
    fontFamily: "'Caveat', 'Architects Daughter', 'Comic Neue', cursive"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0em"
  h2:
    fontFamily: "'Caveat', 'Architects Daughter', 'Comic Neue', cursive"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
  h3:
    fontFamily: "'Caveat', 'Architects Daughter', 'Comic Neue', cursive"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.3
  body-lg:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  label-lg:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.2
    textTransform: "uppercase"
  label-md:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.2
  caption:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3
    textColor: "#757575"
  button:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.2
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  section: 96px
  gutter: 24px
grid:
  columns: 12
  gutter: 24px
  max-width: 1200px
  breakpoints:
    mobile: 375px
    tablet: 768px
    desktop: 1280px
shadows:
  flat:
    offsetX: 0px
    offsetY: 0px
    blur: 0px
    spread: 0px
    color: "transparent"
  sticky-note:
    offsetX: 2px
    offsetY: 4px
    blur: 8px
    spread: 0px
    color: "rgba(0,0,0,0.12)"
  card-offset:
    offsetX: 4px
    offsetY: 4px
    blur: 0px
    spread: 0px
    color: "#000000"
borders:
  width:
    thin: 1px
    default: 2px
    thick: 3px
  style:
    default: solid
    sketchy: "solid" # Hand-drawn strokes simulated with SVG border-image or border-radius curves
  color:
    default: "#000000"
    subtle: "rgba(0,0,0,0.15)"
opacity:
  disabled: 0.4
  muted: 0.7
  overlay: 0.5
z-index:
  base: 0
  raised: 10
  dropdown: 100
  sticky: 200
  overlay: 300
  modal: 400
  tooltip: 500
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 20px
  full: 9999px
motion:
  duration:
    fast: 150ms
    default: 250ms
    slow: 400ms
  easing:
    default: "cubic-bezier(0.4, 0, 0.2, 1)"
    spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)" # Bouncy/springy feel for stickers/cursors
components:
  card-sketchy:
    backgroundColor: "#FFFFFF"
    borderColor: "#000000"
    borderWidth: 2px
    rounded: 12px
    padding: 24px
  sticky-note-yellow:
    backgroundColor: "#FFF2B2"
    borderColor: "rgba(0,0,0,0.1)"
    borderWidth: 1px
    rounded: 2px
    padding: 16px
    shadow: "{shadows.sticky-note}"
  sticky-note-pink:
    backgroundColor: "#FFD2D2"
    borderColor: "rgba(0,0,0,0.1)"
    borderWidth: 1px
    rounded: 2px
    padding: 16px
    shadow: "{shadows.sticky-note}"
  sticky-note-blue:
    backgroundColor: "#D0E1FD"
    borderColor: "rgba(0,0,0,0.1)"
    borderWidth: 1px
    rounded: 2px
    padding: 16px
    shadow: "{shadows.sticky-note}"
  sticky-note-green:
    backgroundColor: "#D4EDDA"
    borderColor: "rgba(0,0,0,0.1)"
    borderWidth: 1px
    rounded: 2px
    padding: 16px
    shadow: "{shadows.sticky-note}"
  btn-primary-teal:
    backgroundColor: "#00a099"
    textColor: "#FFFFFF"
    borderColor: "#000000"
    borderWidth: 2px
    rounded: 9999px
    paddingX: 20px
    paddingY: 12px
  btn-outline-white:
    backgroundColor: "#FFFFFF"
    textColor: "#000000"
    borderColor: "#000000"
    borderWidth: 2px
    rounded: 8px
    paddingX: 16px
    paddingY: 10px
  cursor-badge:
    rounded: 6px
    paddingX: 8px
    paddingY: 4px
    textColor: "#FFFFFF"
    fontSize: 12px
    fontWeight: 700
---

# ProjectForge Design System

## Overview
ProjectForge uses a highly personalized, **sketchy/hand-drawn visual language** designed to feel approachable, friendly, and deeply collaborative. By combining rough, marker-like black outlines, a playful cursive script for primary headings, and realistic sticky-note metaphors with sharp functional modern Sans-serif text for structure and controls, the interface bridges the gap between structured productivity tools and sandbox wireframes. It aims to evoke the feeling of a physical whiteboard, inspiring teams to brainstorm, structure, and deploy projects together in real-time.

## Colors
The system employs a stark, highly contrasted primary outline strategy alongside a soft, pastel-focused palette for components and cards:

- **Primary (`#000000`)**: Solid hand-drawn borders, primary marker text, and button text.
- **Secondary (`#4A4A4A`)**: Body copy, descriptions, and structural lines.
- **Tertiary (`#00a099`)**: Bright teal highlight color used for primary action buttons, key brand highlights (underlines), and cursors.
- **Neutral Background (`#FAF9F6`)**: Off-white paper background styled with a custom light grey dot grid matrix.
- **Accent Pastels**: Soft backgrounds to distinguish categories, features, and sticky notes:
  - **Yellow (`#FFF2B2`)**: Brainstorming, general tasks, and sticky notes.
  - **Pink (`#FFD2D2`)**: Sprint management, alerts, and feedback.
  - **Blue (`#D0E1FD`)**: Integrations, centralizing elements, and documents.
  - **Green (`#D4EDDA`)**: Security highlights, done markers, and success states.
  - **Indigo (`#6366F1`)**: Interactive active plans (Pro plan) and highlights.

## Gradients
ProjectForge focuses entirely on a **flat color system** with solid pastel fills to preserve the clean, hand-drawn look. No visual gradients are used. Depth is instead achieved by using offsets, overlapping borders, and drop-shadows on elements mimicking physical objects (e.g., sticky notes).

## Typography
A two-font system defines ProjectForge's typographic hierarchy:

1. **Cursive/Sketch Font**: A hand-drawn style font (e.g., *Caveat*, *Architects Daughter*) used for main slogans, page headings, column labels, and cursor tags to give the interface its whiteboard personality.
2. **Sans-serif Font**: A clean, highly legible typeface (e.g., *Inter*, *Outfit*) used for body text, lists, pricing features, and metadata to maintain high-readability in dense sections.

### Hierarchy
- **Display**: 56px, bold, cursive font. Used for hero titles (e.g., "Everything you need, all in one place.").
- **H1**: 40px, bold, cursive font. Used for main landing sections.
- **H2**: 32px, bold, cursive font. Used for section headings.
- **H3**: 24px, bold, cursive font. Used for component headers (e.g., board column headers, card titles).
- **Body Large**: 18px, regular, sans-serif. Used for hero subtitles.
- **Body Medium**: 15px, regular, sans-serif. Used for body text and descriptive cards.
- **Body Small**: 13px, regular, sans-serif. Used for inline feature lists, footnotes, and minor descriptions.
- **Label**: 14px, bold, sans-serif. Used for buttons, inputs, and tab navigation.
- **Caption**: 12px, regular/medium, sans-serif. Used for tiny metadata (e.g., G2 ratings, ratings info, footnotes).

## Layout
The spacing scale is built around an **8px base grid** designed to create a relaxed, breathable page rhythm:

- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px
- **3xl**: 64px
- **Section spacing**: 96px for high-level page divisions.

## Grid
A standard **12-column grid** is used for desktop layouts, with content centered in a maximum container width of `1200px`. Columns utilize a `24px` gutter and `32px` margin. Responsive breakpoints shift from a single column on mobile (`375px`), to stacked rows on tablet (`768px`), to standard grid alignments on desktop (`1280px`).

## Elevation & Depth
Depth is represented using two distinct paradigms:

1. **2D Offsets (Card Shadows)**: Cards, pricing blocks, and testimonial boxes use a solid black offset stroke instead of a soft shadow. This is styled as a duplication border shifted `4px` right and `4px` down, rendering a clean, comic-book pop-art style.
2. **3D Soft Shadows (Physical Objects)**: Realistic elements like sticky notes and interactive avatars use soft, blurry, low-intensity drop shadows (`rgba(0,0,0,0.12)`) to make them appear raised above the board background.

## Borders
Borders define the core character of the design system:
- **Default Width**: `2px` solid black (`#000000`) for all primary container boxes, inputs, buttons, and columns.
- **Secondary Width**: `1px` subtle border or black opacity for internal divider lines.
- **Sketchy Outline**: Borders have slightly irregular border-radii (`border-radius: 255px 15px 225px 15px/15px 225px 15px 255px`) or custom SVG masks to simulate marker strokes.

## Opacity
- **Disabled State**: `0.4` opacity applied to buttons and inputs.
- **Muted text**: `0.7` opacity on paragraph summaries.
- **Modal backdrop**: `0.5` dark grey overlay scrim.

## Z-Index
- **Base Level**: `0`
- **Floating Cursors**: `10`
- **Header Navigation**: `200`
- **Modals / Dialogs**: `400`
- **Active tooltips**: `500`

## Shapes
- **Sharp / Physical**: `0px` to `2px` border-radius for sticky notes and paper grids.
- **Organic Sketchy**: `8px` to `12px` border-radius for cards and content blocks, simulating natural hand drawing.
- **Pill**: `full` (9999px) border-radius for rounded action buttons, highlight pills, and search boxes.

## Motion
Animations support the playful, bouncy whiteboard feeling:
- **Hover Transitions**: `250ms` using a bouncy cubic-bezier curve (`cubic-bezier(0.175, 0.885, 0.32, 1.275)`) for sticky notes, badges, and primary buttons.
- **Standard UI Fades**: `150ms` linear transitions for opacity and background color changes.

## Icons
Icons follow a simplified, hand-drawn outline style matching the stroke weight of the text:
- **Style**: Hand-drawn sketches, outline-only with thick lines (`1.5px` to `2px` equivalent).
- **Sizes**: Standardized to `20px` in cards, `24px` in headers, and `32px` in key feature lists.
- **Coloring**: Inside card illustrations, icons sit inside a circular solid pastel background corresponding to the card's accent color (e.g., pink backdrop for sprints, yellow for plans).

## Layout Structure
The interface utilizes a classic responsive landing page structure that moves into a wide-canvas horizontal board layout.

### ASCII Wireframe Diagram
```
┌────────────────────────────────────────────────────────────────────────┐
│  [PF LOGO] ProjectForge                Product  Solutions  Pricing ... │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                      Work, together, right now.                        │
│                                                                        │
│       ┌───────────────┐   ┌───────────────┐   ┌───────────────┐        │
│       │ TO DO         │   │ DOING         │   │ DONE          │        │
│       ├───────────────┤   ├───────────────┤   ├───────────────┤        │
│       │ ┌───────────┐ │   │ ┌───────────┐ │   │ ┌───────────┐ │        │
│       │ │Sticky Note│ │   │ │Sticky Note│ │   │ │Sticky Note│ │        │
│       │ └───────────┘ │   │ └───────────┘ │   │ └───────────┘ │        │
│       │               │   │ (Cursor PRIYA)│   │               │        │
│       └───────────────┘   └───────────────┘   └───────────────┘        │
│                                                                        │
│  [Try it now →] (Button)                                               │
└────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Sketchy Cards (`card-sketchy`)
Used to group features, testimonials, and pricing plans. High-contrast white box with a thick sketchy black border and an optional solid black offset drop-shadow.

### 2. Sticky Notes (`sticky-note-color`)
Metaphors for work tasks. Rendered as square post-its in soft pastel colors (Yellow, Pink, Blue, Green). They feature slight rotational offsets (`rotate(-1deg)` to `rotate(1.5deg)`) and custom handwriting font styling.

### 3. Sketchy Buttons (`btn-primary-teal`, `btn-outline-white`)
- **Primary Teal**: Pill-shaped action button with teal background, black border, white text, and a bouncy hover lift.
- **Outline White**: Rectangular button with white background, black border, black text, and standard hover scaling.

### 4. Custom Cursor Badges (`cursor-badge`)
Used to depict real-time collaborative users on the board. Composed of an arrow pointer icon combined with a solid-color pill badge displaying the user's name (e.g., Priya in Purple, Jordan in Orange, You in Teal).

## Do's and Don'ts

- **DO** use the cursive font exclusively for header text, sticky notes, and badges.
- **DON'T** use the cursive font for paragraphs, features lists, or dense navigation text where readability is critical.
- **DO** keep cards separated with thick hand-drawn outlines and soft pastel fills.
- **DON'T** mix different font sizes or drop shadows in a single sticky-note category.
- **DO** display collaborators using specific color-coded cursors to show presence.
- **DON'T** introduce modern gradients or glossy shadows that clash with the flat, sketchy aesthetic.
- **DO** use the off-white dotted grid as the background canvas to represent a physical whiteboard.
- **DON'T** use stark white or generic primary colors that strain readability.
