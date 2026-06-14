# UI Rules

Concise rules for building the ProjectForge UI. Design files and mockups represent a hand-drawn, whiteboard-style collaboration environment. These rules define how components, colors, and layout patterns are written to ensure visual consistency across the application.

---

## Font Registration

Always import the fonts via Next.js `next/font/google` in the root layout.
- The hand-drawn cursive/script font (e.g., `Caveat`) is loaded under `--font-sketch` variables.
- The clean functional sans font (`Inter`) is loaded under `--font-sans` variables.

Apply both classes in the root layout HTML to make them accessible via utility classes.

---

## Layout Rules

- **Whiteboard Canvas**: The main page background must always use the off-white `#FAF9F6` color combined with a light gray dot grid repeating pattern to simulate a physical brainstorm board.
- **Max Width**: Centered grids use a maximum width of `1200px` (`max-w-[1200px] mx-auto`).
- **Section Gaps**: Pages use large spaces between blocks (default `96px` margins vertically).
- **Columns**: The landing page sections use 3-column rows or grid cards (`grid grid-cols-1 md:grid-cols-3 gap-6`).
- **Board Grid**: Columns for the task board (TO DO, DOING, DONE) must sit horizontally inside a flexible wrapper (`flex flex-row overflow-x-auto gap-6 items-start`).

---

## Component Outlines & Borders

- **Outline Stroke**: Every card, outline button, inputs, and board column must feature a solid `2px` black border (`border-2 border-black`).
- **Simulating Hand-Drawn Outlines**: In order to make outlines look organic, components should use slightly irregular borders. In CSS, simulate this with:
  ```css
  border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
  ```
  or alternate radius classes (e.g., `rounded-[12px]` with a slight custom tilt of `rotate-[-0.5deg]` or `rotate-[0.5deg]`).

---

## Cards & Testimonials

Cards represent whiteboard boards or paper slips.

- **Sketchy Shadow**: Use a solid black offset copy instead of soft CSS box-shadows. Implement this via translation/offset borders:
  ```css
  box-shadow: 4px 4px 0px 0px #000000;
  ```
- **Fills**: Use a flat `#FFFFFF` surface color for feature cards. For testimonials, use white backgrounds with custom borders.
- **Rating Stars**: Testimonial rating indicators use exactly 5 yellow hand-drawn star shapes (`color: #FFC439`).

---

## Sticky Notes

Sticky notes model tasks on a collaboration board:
- **Shape**: Square elements with high height-to-width ratios. Use very slight, sharp rounding (`rounded-[2px]`).
- **Rotation**: Rotate individual notes slightly to give them a organic feel:
  ```css
  transform: rotate(-1deg) or transform: rotate(1.2deg)
  ```
  Distribute rotations randomly (`even:rotate-[1deg] odd:rotate-[-1deg]`).
- **Depth**: Apply a soft realistic drop-shadow (`shadow-[2px_4px_8px_0px_rgba(0,0,0,0.12)]`) to make notes look three-dimensional.
- **Fills**: Always map task states to these light pastel tokens:
  - Yellow: `#FFF2B2`
  - Pink: `#FFD2D2`
  - Blue: `#D0E1FD`
  - Green: `#D4EDDA`

---

## Interactive Avatars & Cursors

Showcase collaboration presence using color-coded user nodes:
- **Cursor Pointer**: Colorized pointer icons indicating active coordinates.
- **Label Tag**: A pill badge containing the user name (`rounded-md font-sketch text-[12px] font-bold px-2 py-0.5 text-white`) that floats adjacent to the cursor:
  - Priya: Purple (`bg-[#6366F1]`)
  - Jordan: Orange (`bg-[#FF7F50]`)
  - You: Teal (`bg-[#00a099]`)

---

## Buttons

- **Primary CTA (Teal Pill)**: Fully rounded (`rounded-full`), teal background (`bg-[#00a099]`), `2px` black border, white text (`text-white`), custom cursive arrow symbol (`→`) for action confirmation. On hover, translate upward slightly and darken background (`hover:bg-[#008B8B] hover:-translate-y-0.5 transition-all`).
- **Outline Buttons (Border Card)**: White background (`bg-white`), black text, `2px` black border, slightly rounded corners (`rounded-md`).

---

## Tailwind Config Notes

This project uses Tailwind CSS. Define custom tokens under `@theme` inside `globals.css`:
- Ensure you set `--font-sketch` mapping to the Caveat/handwriting font.
- Ensure custom pastels (`--color-accent-*`) are correctly declared.

---

## Do Nots

- **NEVER** use Tailwind's default dark saturated backgrounds (e.g. `bg-blue-600`, `bg-purple-800`). All highlights are pastel or deep teal `#00a099`.
- **NEVER** apply blurred standard drop-shadows on cards — always use flat `4px 4px 0px 0px #000000` outlines.
- **NEVER** present text in uppercase cursive font unless specified (Caveat text reads best in sentence-case/lowercase variations).
- **NEVER** place sticky notes horizontally straight — always apply a rotation of `rotate-[-1.5deg]` to `rotate-[1.5deg]`.
- **NEVER** use gradients on cards or backgrounds. All canvases are solid off-white with gray dots.
