# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dev dependencies (first time)
npm test          # unit tests (Vitest)
npm run check     # TypeScript type check
npm run build     # bundle src/ → dist/bundle.js via esbuild
```

Open the game: `npm run build`, then open `index.html` (or `npx serve . --listen 3000`).

## Architecture

**52deck** is a browser-based Klondike Solitaire game (1-card draw). No runtime dependencies.

**State machine:** All game state lives in one `GameState` object (`src/game/types.ts`). Every player action goes through `gameReducer(state, action) → GameState` (`src/game/reducer.ts`). Invalid moves return the current state unchanged — no exceptions at runtime.

**Undo:** `src/store.ts` maintains an array of past `GameState` snapshots. `undo()` pops the last snapshot without touching the reducer.

**Boundary rule:** `src/game/` has zero DOM imports (fully unit-testable). `src/ui/` has zero game logic.

**Foundation indexing:** `state.foundations` is a 4-tuple indexed by `SUIT_INDEX` (hearts=0, diamonds=1, clubs=2, spades=3).

**Rendering:** `renderGame(state)` does a full DOM replacement on every dispatch. `renderTimer` runs on a separate 1-second interval and never touches the store.

**Auto-complete:** `nextAutoCompleteMove(state)` returns the next safe `MOVE_CARDS` action toward a foundation. `main.ts` drives it on a 300 ms interval when the user clicks "Auto-complete".
