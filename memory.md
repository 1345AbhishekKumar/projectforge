# Memory — Digital Puppet Show, Custom 'You' Cursor & Left Pencil

Last updated: 2026-06-13T21:42:00+05:30

## What was built

- **Left Pencil & "Only Pencil" Layout**: Relocated the 3D Marker Pen absolute container to the top-left corner (`left-8`) in [Hero.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/homepage/Hero.tsx) and removed the tray background SVG.
- **Writing Path Adjustments**: Corrected the pen writing `offset-path` in [globals.css](file:///d:/MyProjects/ongoing_Projects/projectforge/app/globals.css) to write from right-to-left and dock at `5vw, 12vh` without visual jumps.
- **Custom "You" Cursor**: Added coordinate tracking state (`userCursor`) inside [Hero.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/homepage/Hero.tsx) and bound pointer handlers to the board.
- **Pointer Hiding**: Added the `.custom-board-cursor` rule to [globals.css](file:///d:/MyProjects/ongoing_Projects/projectforge/app/globals.css) to hide the default browser cursor over the board.
- **Digital Puppet Show Timeline**: Built a looping GSAP timeline orchestrating Priya and Jordan's cursors moving notes across TO DO, DOING, and DONE columns.
- **Interaction Guards**: Wired up immediate pause/kill triggers on user drag-and-drop or text editing, with an automatic restart 6 seconds after user inactivity.
- **Dynamic Counters**: Transformed column count headers from hardcoded values into dynamic calculations from the `stickies` state.
- **Dynamic Drop Statuses**: Updated the manual `handlePointerUp` drag handler to calculate dropped column coordinates and update card status (`todo`, `doing`, `done`) in the state.
- **Clean Coordinate Alignment**: Shifted initial sticky coordinates down (minimum `y: 26%`) and raised manual drag bounds (minimum `y: 25%`) to prevent overlaps with headers.

## Decisions made

- **React-GSAP Decoupling**: Omitted static `left` and `top` styles from the React JSX for Priya's and Jordan's cursors, setting them dynamically via GSAP on mount instead. This prevents React state updates from resetting GSAP cursor coordinates.
- **Fine-Grained clearProps**: Swapped `clearProps: "all"` and `clearProps: "left,top..."` for `clearProps: "transform,scale,rotate"` on sticky notes and `clearProps: "scale"` on cursors. This prevents React from losing layout properties and snapping elements to `0,0` (top-left).

## Problems solved

- **Snapping to 0,0 (Top-Left)**: Solved by preserving GSAP-applied `left`/`top` styles and using precise `clearProps` properties.
- **Overlapping Notes & Headers**: Solved by raising the minimum y-coordinate boundaries (to `25%` and `26%`) and spacing notes vertically by at least `30%` within columns.

## Current state

- The collaborative whiteboard board features are completely implemented, fully polished, and synchronized between manual interactions, dynamic state updates, and the automated puppet show.

## Next session starts with

- Continuing with the homepage layout sections (e.g. Features grid, pricing tier layouts, or onboarding walkthrough components).

## Open questions

- None.
