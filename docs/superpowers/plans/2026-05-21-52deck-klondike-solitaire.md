# 52deck — Klondike Solitaire Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based Klondike Solitaire game (1-card draw) in Vanilla TypeScript with timer, move counter, undo, and auto-complete.

**Architecture:** Single `GameState` object with a pure `gameReducer(state, action) → GameState`. All game logic lives in `src/game/` (zero DOM imports, fully unit-testable); UI lives in `src/ui/` (zero game logic). A minimal store in `src/store.ts` holds the undo history stack and triggers re-render on every dispatch.

**Tech Stack:** TypeScript 5, esbuild (bundle), Vitest (tests), HTML5 drag-and-drop API.

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/game/types.ts` | `Card`, `GameState`, `Action`, `Source`, `Target`, `SUIT_INDEX`, `SUITS` |
| `src/game/deck.ts` | `createDeck()`, `shuffle()`, `deal()` |
| `src/game/rules.ts` | `canPlaceOnTableau()`, `canPlaceOnFoundation()`, `canPlace()`, `isWon()`, `canAutoComplete()` |
| `src/game/reducer.ts` | `gameReducer(state, action) → GameState` |
| `src/game/autoComplete.ts` | `nextAutoCompleteMove(state) → Action \| null` |
| `src/store.ts` | History stack, `dispatch()`, `undo()`, `subscribe()`, `getState()` |
| `src/ui/render.ts` | `renderGame(state)`, `renderTimer(state)` |
| `src/ui/dragDrop.ts` | HTML5 drag-and-drop → `dispatch()` |
| `src/ui/events.ts` | Click + keyboard → `dispatch()` / `undo()` |
| `src/main.ts` | Entry point: wires store, events, timer, auto-complete interval |
| `index.html` | Game board DOM skeleton |
| `style.css` | Card and layout styles |

---

### Task 1: Project scaffold

**Files:** `package.json`, `tsconfig.json`, `index.html`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "52deck",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "esbuild src/main.ts --bundle --outfile=dist/bundle.js --format=esm",
    "check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "esbuild": "^0.21.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>52deck — Solitaire</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <header>
      <h1>Solitaire</h1>
      <div id="controls">
        <button id="new-game">New Game</button>
        <button id="undo">Undo</button>
        <button id="auto-complete" hidden>Auto-complete</button>
        <span id="moves-display">Moves: 0</span>
        <span id="timer-display">0:00</span>
      </div>
    </header>
    <main id="board">
      <div id="top-row">
        <div class="pile" id="stock" data-pile="stock"></div>
        <div class="pile" id="waste" data-pile="waste"></div>
        <div class="spacer"></div>
        <div class="pile" id="foundation-hearts" data-pile="foundation-hearts"></div>
        <div class="pile" id="foundation-diamonds" data-pile="foundation-diamonds"></div>
        <div class="pile" id="foundation-clubs" data-pile="foundation-clubs"></div>
        <div class="pile" id="foundation-spades" data-pile="foundation-spades"></div>
      </div>
      <div id="tableau">
        <div class="column" data-pile="tableau-0"></div>
        <div class="column" data-pile="tableau-1"></div>
        <div class="column" data-pile="tableau-2"></div>
        <div class="column" data-pile="tableau-3"></div>
        <div class="column" data-pile="tableau-4"></div>
        <div class="column" data-pile="tableau-5"></div>
        <div class="column" data-pile="tableau-6"></div>
      </div>
    </main>
    <div id="win-screen" hidden>
      <h2>You Win!</h2>
      <button id="play-again">Play Again</button>
    </div>
  </div>
  <script type="module" src="dist/bundle.js"></script>
</body>
</html>
```

- [ ] **Step 4: Install dependencies**

```bash
npm install
```

Expected: `added N packages`

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json index.html
git commit -m "feat: project scaffold"
```

---

### Task 2: Types

**Files:** Create `src/game/types.ts`

No tests — type definitions only.

- [ ] **Step 1: Create `src/game/types.ts`**

```typescript
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface GameState {
  stock: Card[];
  waste: Card[];
  foundations: [Card[], Card[], Card[], Card[]]; // indexed by SUIT_INDEX
  tableau: Card[][];                              // 7 columns
  moves: number;
  startTime: number;
  pausedAt: number | null;
  status: 'playing' | 'won';
}

export type Source =
  | { kind: 'waste' }
  | { kind: 'tableau'; column: number };

export type Target =
  | { kind: 'tableau'; column: number }
  | { kind: 'foundation'; suit: Suit };

export type Action =
  | { type: 'DRAW' }
  | { type: 'RESET_STOCK' }
  | { type: 'MOVE_CARDS'; from: Source; to: Target; count: number }
  | { type: 'AUTO_COMPLETE_STEP' }
  | { type: 'NEW_GAME' };

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export const SUIT_INDEX: Record<Suit, number> = {
  hearts: 0, diamonds: 1, clubs: 2, spades: 3,
};
```

- [ ] **Step 2: Type check**

```bash
npm run check
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/game/types.ts
git commit -m "feat: game type definitions"
```

---

### Task 3: Deck

**Files:** Create `src/game/deck.ts`, `src/game/deck.test.ts`

- [ ] **Step 1: Write failing tests — create `src/game/deck.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, deal } from './deck';

describe('createDeck', () => {
  it('creates 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map(c => `${c.suit}-${c.rank}`)).size).toBe(52);
  });
  it('all cards start face-down', () => {
    expect(createDeck().every(c => !c.faceUp)).toBe(true);
  });
});

describe('shuffle', () => {
  it('returns 52 cards without mutating input', () => {
    const deck = createDeck();
    const copy = [...deck];
    const result = shuffle(deck);
    expect(result).toHaveLength(52);
    expect(deck).toEqual(copy);
  });
});

describe('deal', () => {
  it('produces valid starting state', () => {
    const s = deal(shuffle(createDeck()));
    expect(s.tableau).toHaveLength(7);
    expect(s.stock).toHaveLength(24);
    expect(s.waste).toHaveLength(0);
    expect(s.foundations.every(f => f.length === 0)).toBe(true);
    expect(s.status).toBe('playing');
  });
  it('column i has i+1 cards', () => {
    const s = deal(shuffle(createDeck()));
    for (let i = 0; i < 7; i++) expect(s.tableau[i]).toHaveLength(i + 1);
  });
  it('last card in each column is face-up, rest face-down', () => {
    const s = deal(shuffle(createDeck()));
    for (const col of s.tableau) {
      expect(col[col.length - 1].faceUp).toBe(true);
      for (let i = 0; i < col.length - 1; i++) expect(col[i].faceUp).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run — confirm FAIL**

```bash
npm test
```

Expected: FAIL with `Cannot find module './deck'`

- [ ] **Step 3: Create `src/game/deck.ts`**

```typescript
import type { Card, GameState, Rank } from './types';
import { SUITS } from './types';

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      cards.push({ suit, rank: rank as Rank, faceUp: false });
    }
  }
  return cards;
}

export function shuffle(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function deal(deck: Card[]): GameState {
  const cards = [...deck];
  const tableau: Card[][] = [];
  for (let i = 0; i < 7; i++) {
    const col: Card[] = [];
    for (let j = 0; j < i; j++) col.push({ ...cards.shift()!, faceUp: false });
    col.push({ ...cards.shift()!, faceUp: true });
    tableau.push(col);
  }
  return {
    stock: cards.map(c => ({ ...c, faceUp: false })),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    moves: 0,
    startTime: Date.now(),
    pausedAt: null,
    status: 'playing',
  };
}
```

- [ ] **Step 4: Run — confirm PASS**

```bash
npm test
```

Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/game/deck.ts src/game/deck.test.ts
git commit -m "feat: deck creation, shuffle, deal"
```

---

### Task 4: Rules

**Files:** Create `src/game/rules.ts`, `src/game/rules.test.ts`

- [ ] **Step 1: Write failing tests — create `src/game/rules.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { canPlaceOnTableau, canPlaceOnFoundation, isWon, canAutoComplete } from './rules';
import type { Card, GameState } from './types';

const c = (suit: Card['suit'], rank: Card['rank'], faceUp = true): Card => ({ suit, rank, faceUp });

const empty = (): GameState => ({
  stock: [], waste: [],
  foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], []],
  moves: 0, startTime: 0, pausedAt: null, status: 'playing',
});

describe('canPlaceOnTableau', () => {
  it('King on empty column', () => expect(canPlaceOnTableau(c('spades', 13), [])).toBe(true));
  it('non-King on empty column', () => expect(canPlaceOnTableau(c('spades', 12), [])).toBe(false));
  it('red on black descending', () => expect(canPlaceOnTableau(c('hearts', 7), [c('spades', 8)])).toBe(true));
  it('black on red descending', () => expect(canPlaceOnTableau(c('clubs', 6), [c('hearts', 7)])).toBe(true));
  it('same color rejected', () => expect(canPlaceOnTableau(c('hearts', 7), [c('diamonds', 8)])).toBe(false));
  it('wrong rank rejected', () => expect(canPlaceOnTableau(c('hearts', 6), [c('spades', 8)])).toBe(false));
});

describe('canPlaceOnFoundation', () => {
  it('Ace on empty', () => expect(canPlaceOnFoundation(c('hearts', 1), [])).toBe(true));
  it('non-Ace on empty', () => expect(canPlaceOnFoundation(c('hearts', 2), [])).toBe(false));
  it('same suit ascending', () => expect(canPlaceOnFoundation(c('hearts', 2), [c('hearts', 1)])).toBe(true));
  it('wrong suit', () => expect(canPlaceOnFoundation(c('spades', 2), [c('hearts', 1)])).toBe(false));
  it('wrong rank', () => expect(canPlaceOnFoundation(c('hearts', 3), [c('hearts', 1)])).toBe(false));
});

describe('isWon', () => {
  it('false when incomplete', () => expect(isWon(empty())).toBe(false));
  it('true when all foundations have 13', () => {
    const s = empty();
    s.foundations = [
      Array(13).fill(c('hearts', 1)),
      Array(13).fill(c('diamonds', 1)),
      Array(13).fill(c('clubs', 1)),
      Array(13).fill(c('spades', 1)),
    ];
    expect(isWon(s)).toBe(true);
  });
});

describe('canAutoComplete', () => {
  it('false when face-down card exists', () => {
    const s = empty();
    s.tableau[0] = [c('hearts', 1, false)];
    expect(canAutoComplete(s)).toBe(false);
  });
  it('true when all face-up', () => {
    const s = empty();
    s.tableau[0] = [c('hearts', 1, true)];
    expect(canAutoComplete(s)).toBe(true);
  });
  it('true when all columns empty', () => expect(canAutoComplete(empty())).toBe(true));
});
```

- [ ] **Step 2: Run — confirm FAIL**

```bash
npm test
```

Expected: FAIL with `Cannot find module './rules'`

- [ ] **Step 3: Create `src/game/rules.ts`**

```typescript
import type { Card, GameState, Target } from './types';
import { SUIT_INDEX } from './types';

export function isRed(card: Card): boolean {
  return card.suit === 'hearts' || card.suit === 'diamonds';
}

export function canPlaceOnTableau(card: Card, column: Card[]): boolean {
  if (column.length === 0) return card.rank === 13;
  const top = column[column.length - 1];
  return isRed(card) !== isRed(top) && card.rank === top.rank - 1;
}

export function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 1;
  const top = foundation[foundation.length - 1];
  return card.suit === top.suit && card.rank === top.rank + 1;
}

export function canPlace(card: Card, target: Target, state: GameState): boolean {
  if (target.kind === 'tableau') return canPlaceOnTableau(card, state.tableau[target.column]);
  return canPlaceOnFoundation(card, state.foundations[SUIT_INDEX[target.suit]]);
}

export function isWon(state: GameState): boolean {
  return state.foundations.every(f => f.length === 13);
}

export function canAutoComplete(state: GameState): boolean {
  return state.tableau.every(col => col.every(card => card.faceUp));
}
```

- [ ] **Step 4: Run — confirm PASS**

```bash
npm test
```

Expected: PASS — all rule tests

- [ ] **Step 5: Commit**

```bash
git add src/game/rules.ts src/game/rules.test.ts
git commit -m "feat: placement rules and win/auto-complete detection"
```

---

### Task 5: Auto-complete stub + Reducer

**Files:** Create `src/game/autoComplete.ts` (stub), `src/game/reducer.ts`, `src/game/reducer.test.ts`

The reducer imports `nextAutoCompleteMove`, so create a stub first, then test the reducer.

- [ ] **Step 1: Create stub `src/game/autoComplete.ts`**

```typescript
import type { Action, GameState } from './types';

export function nextAutoCompleteMove(_state: GameState): Action | null {
  return null;
}
```

- [ ] **Step 2: Write failing reducer tests — create `src/game/reducer.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { gameReducer } from './reducer';
import type { Card, GameState } from './types';

const c = (suit: Card['suit'], rank: Card['rank'], faceUp = true): Card => ({ suit, rank, faceUp });

const base = (): GameState => ({
  stock: [c('hearts', 2, false), c('spades', 7, false)],
  waste: [],
  foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], []],
  moves: 0, startTime: 0, pausedAt: null, status: 'playing',
});

describe('DRAW', () => {
  it('moves last stock card to waste face-up', () => {
    const next = gameReducer(base(), { type: 'DRAW' });
    expect(next.stock).toHaveLength(1);
    expect(next.waste[0]).toMatchObject({ rank: 7, faceUp: true });
    expect(next.moves).toBe(1);
  });
  it('no-op when stock empty', () => {
    const s = { ...base(), stock: [] };
    expect(gameReducer(s, { type: 'DRAW' })).toBe(s);
  });
});

describe('RESET_STOCK', () => {
  it('flips waste to stock reversed', () => {
    const s: GameState = { ...base(), stock: [], waste: [c('hearts', 1), c('clubs', 3)] };
    const next = gameReducer(s, { type: 'RESET_STOCK' });
    expect(next.waste).toHaveLength(0);
    expect(next.stock).toHaveLength(2);
    expect(next.stock.every(c => !c.faceUp)).toBe(true);
    expect(next.stock[0].rank).toBe(3); // reversed
  });
  it('no-op when stock not empty', () => {
    const s = base();
    expect(gameReducer(s, { type: 'RESET_STOCK' })).toBe(s);
  });
});

describe('MOVE_CARDS from waste', () => {
  it('moves to valid tableau column', () => {
    const s: GameState = { ...base(), waste: [c('hearts', 7)], tableau: [[c('spades', 8)], [], [], [], [], [], []] };
    const next = gameReducer(s, { type: 'MOVE_CARDS', from: { kind: 'waste' }, to: { kind: 'tableau', column: 0 }, count: 1 });
    expect(next.waste).toHaveLength(0);
    expect(next.tableau[0][1]).toMatchObject({ rank: 7 });
  });
  it('rejects invalid placement', () => {
    const s: GameState = { ...base(), waste: [c('hearts', 7)], tableau: [[c('spades', 6)], [], [], [], [], [], []] };
    expect(gameReducer(s, { type: 'MOVE_CARDS', from: { kind: 'waste' }, to: { kind: 'tableau', column: 0 }, count: 1 })).toBe(s);
  });
  it('moves Ace to foundation', () => {
    const s: GameState = { ...base(), waste: [c('hearts', 1)] };
    const next = gameReducer(s, { type: 'MOVE_CARDS', from: { kind: 'waste' }, to: { kind: 'foundation', suit: 'hearts' }, count: 1 });
    expect(next.foundations[0]).toHaveLength(1);
  });
});

describe('MOVE_CARDS from tableau', () => {
  it('exposes and flips card below', () => {
    const s: GameState = { ...base(), tableau: [[c('hearts', 3, false), c('clubs', 2)], [], [], [], [], [], []] };
    const next = gameReducer(s, { type: 'MOVE_CARDS', from: { kind: 'tableau', column: 0 }, to: { kind: 'foundation', suit: 'clubs' }, count: 1 });
    expect(next.tableau[0][0].faceUp).toBe(true);
    expect(next.foundations[2]).toHaveLength(1);
  });
  it('moves a run to another column', () => {
    const s: GameState = {
      ...base(),
      tableau: [
        [c('hearts', 7), c('spades', 6), c('hearts', 5)],
        [c('clubs', 6)],
        [], [], [], [], [],
      ],
    };
    const next = gameReducer(s, { type: 'MOVE_CARDS', from: { kind: 'tableau', column: 0 }, to: { kind: 'tableau', column: 1 }, count: 1 });
    expect(next.tableau[0]).toHaveLength(2);
    expect(next.tableau[1][1]).toMatchObject({ rank: 5 });
  });
});

describe('NEW_GAME', () => {
  it('resets to fresh dealt state', () => {
    const next = gameReducer(base(), { type: 'NEW_GAME' });
    expect(next.stock).toHaveLength(24);
    expect(next.moves).toBe(0);
    expect(next.status).toBe('playing');
  });
});
```

- [ ] **Step 3: Run — confirm FAIL**

```bash
npm test
```

Expected: FAIL with `Cannot find module './reducer'`

- [ ] **Step 4: Create `src/game/reducer.ts`**

```typescript
import type { Action, Card, GameState } from './types';
import { SUIT_INDEX } from './types';
import { canPlace, isWon } from './rules';
import { createDeck, deal, shuffle } from './deck';
import { nextAutoCompleteMove } from './autoComplete';

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'DRAW': {
      if (state.stock.length === 0) return state;
      const top = state.stock[state.stock.length - 1];
      return { ...state, stock: state.stock.slice(0, -1), waste: [...state.waste, { ...top, faceUp: true }], moves: state.moves + 1 };
    }
    case 'RESET_STOCK': {
      if (state.stock.length > 0) return state;
      return { ...state, stock: [...state.waste].reverse().map(c => ({ ...c, faceUp: false })), waste: [], moves: state.moves + 1 };
    }
    case 'MOVE_CARDS': {
      const { from, to, count } = action;
      const newTableau = state.tableau.map(col => [...col]);
      let newWaste = [...state.waste];
      let movingCards: Card[];

      if (from.kind === 'waste') {
        if (newWaste.length === 0) return state;
        movingCards = [newWaste[newWaste.length - 1]];
        if (!canPlace(movingCards[0], to, state)) return state;
        newWaste = newWaste.slice(0, -1);
      } else {
        const col = newTableau[from.column];
        const faceUpStart = col.findIndex(c => c.faceUp);
        if (faceUpStart < 0) return state;
        const takeFrom = col.length - count;
        if (takeFrom < faceUpStart) return state;
        movingCards = col.splice(takeFrom, count);
        if (!canPlace(movingCards[0], to, state)) return state;
        if (col.length > 0 && !col[col.length - 1].faceUp) {
          col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
        }
      }

      const newFoundations = state.foundations.map(f => [...f]) as [Card[], Card[], Card[], Card[]];
      if (to.kind === 'tableau') {
        newTableau[to.column].push(...movingCards);
      } else {
        newFoundations[SUIT_INDEX[to.suit]].push(...movingCards);
      }

      const next: GameState = { ...state, waste: newWaste, tableau: newTableau, foundations: newFoundations, moves: state.moves + 1 };
      return isWon(next) ? { ...next, status: 'won' } : next;
    }
    case 'AUTO_COMPLETE_STEP': {
      const move = nextAutoCompleteMove(state);
      return move ? gameReducer(state, move) : state;
    }
    case 'NEW_GAME':
      return deal(shuffle(createDeck()));
  }
}
```

- [ ] **Step 5: Run — confirm PASS**

```bash
npm test
```

Expected: PASS — all reducer tests

- [ ] **Step 6: Commit**

```bash
git add src/game/autoComplete.ts src/game/reducer.ts src/game/reducer.test.ts
git commit -m "feat: game reducer"
```

---

### Task 6: Auto-complete (real implementation)

**Files:** Modify `src/game/autoComplete.ts`, create `src/game/autoComplete.test.ts`

- [ ] **Step 1: Write failing tests — create `src/game/autoComplete.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { nextAutoCompleteMove } from './autoComplete';
import type { Card, GameState } from './types';

const c = (suit: Card['suit'], rank: Card['rank'], faceUp = true): Card => ({ suit, rank, faceUp });
const empty = (): GameState => ({
  stock: [], waste: [], foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], []],
  moves: 0, startTime: 0, pausedAt: null, status: 'playing',
});

describe('nextAutoCompleteMove', () => {
  it('returns null when no card can go to foundation', () => {
    const s = { ...empty(), waste: [c('hearts', 5)] };
    expect(nextAutoCompleteMove(s)).toBeNull();
  });
  it('moves Ace from waste to foundation', () => {
    const s = { ...empty(), waste: [c('hearts', 1)] };
    expect(nextAutoCompleteMove(s)).toEqual({
      type: 'MOVE_CARDS',
      from: { kind: 'waste' },
      to: { kind: 'foundation', suit: 'hearts' },
      count: 1,
    });
  });
  it('moves card from tableau to foundation', () => {
    const s: GameState = {
      ...empty(),
      foundations: [[c('hearts', 1)], [], [], []],
      tableau: [[c('hearts', 2)], [], [], [], [], [], []],
    };
    expect(nextAutoCompleteMove(s)).toEqual({
      type: 'MOVE_CARDS',
      from: { kind: 'tableau', column: 0 },
      to: { kind: 'foundation', suit: 'hearts' },
      count: 1,
    });
  });
});
```

- [ ] **Step 2: Run — confirm FAIL (stub returns null for all)**

```bash
npm test
```

Expected: FAIL — `moves Ace from waste` and `moves card from tableau` tests

- [ ] **Step 3: Replace `src/game/autoComplete.ts`**

```typescript
import type { Action, GameState } from './types';
import { SUIT_INDEX } from './types';
import { canPlaceOnFoundation } from './rules';

export function nextAutoCompleteMove(state: GameState): Action | null {
  const minFoundation = Math.min(...state.foundations.map(f => f.length));

  // Check waste
  if (state.waste.length > 0) {
    const top = state.waste[state.waste.length - 1];
    const fi = SUIT_INDEX[top.suit];
    if (canPlaceOnFoundation(top, state.foundations[fi]) && top.rank <= minFoundation + 2) {
      return { type: 'MOVE_CARDS', from: { kind: 'waste' }, to: { kind: 'foundation', suit: top.suit }, count: 1 };
    }
  }

  // Check tableau columns
  for (let col = 0; col < state.tableau.length; col++) {
    const column = state.tableau[col];
    if (column.length === 0) continue;
    const top = column[column.length - 1];
    if (!top.faceUp) continue;
    const fi = SUIT_INDEX[top.suit];
    if (canPlaceOnFoundation(top, state.foundations[fi]) && top.rank <= minFoundation + 2) {
      return { type: 'MOVE_CARDS', from: { kind: 'tableau', column: col }, to: { kind: 'foundation', suit: top.suit }, count: 1 };
    }
  }

  // Retry without rank guard (end-game)
  if (state.waste.length > 0) {
    const top = state.waste[state.waste.length - 1];
    const fi = SUIT_INDEX[top.suit];
    if (canPlaceOnFoundation(top, state.foundations[fi])) {
      return { type: 'MOVE_CARDS', from: { kind: 'waste' }, to: { kind: 'foundation', suit: top.suit }, count: 1 };
    }
  }
  for (let col = 0; col < state.tableau.length; col++) {
    const column = state.tableau[col];
    if (column.length === 0) continue;
    const top = column[column.length - 1];
    if (!top.faceUp) continue;
    const fi = SUIT_INDEX[top.suit];
    if (canPlaceOnFoundation(top, state.foundations[fi])) {
      return { type: 'MOVE_CARDS', from: { kind: 'tableau', column: col }, to: { kind: 'foundation', suit: top.suit }, count: 1 };
    }
  }

  return null;
}
```

- [ ] **Step 4: Run all tests — confirm PASS**

```bash
npm test
```

Expected: PASS — all tests across all files

- [ ] **Step 5: Commit**

```bash
git add src/game/autoComplete.ts src/game/autoComplete.test.ts
git commit -m "feat: auto-complete move selection"
```

---

### Task 7: Store

**Files:** Create `src/store.ts`

- [ ] **Step 1: Create `src/store.ts`**

```typescript
import type { Action, GameState } from './game/types';
import { gameReducer } from './game/reducer';
import { createDeck, deal, shuffle } from './game/deck';

let history: GameState[] = [];
let current: GameState = deal(shuffle(createDeck()));
const listeners: Array<(s: GameState) => void> = [];

export function getState(): GameState { return current; }

export function dispatch(action: Action): void {
  history.push(current);
  current = gameReducer(current, action);
  notify();
}

export function undo(): void {
  if (history.length === 0) return;
  current = history.pop()!;
  notify();
}

export function subscribe(fn: (s: GameState) => void): void {
  listeners.push(fn);
}

function notify(): void {
  for (const fn of listeners) fn(current);
}
```

- [ ] **Step 2: Type check**

```bash
npm run check
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/store.ts
git commit -m "feat: store with undo history"
```

---

### Task 8: Renderer

**Files:** Create `src/ui/render.ts`

- [ ] **Step 1: Create `src/ui/render.ts`**

```typescript
import type { Card, GameState } from '../game/types';
import { SUIT_INDEX } from '../game/types';
import { canAutoComplete } from '../game/rules';

const RANK_LABEL: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
const SUIT_SYMBOL: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const rl = (rank: number) => RANK_LABEL[rank] ?? String(rank);

function makeCard(card: Card, source: string): HTMLElement {
  const el = document.createElement('div');
  el.className = `card ${card.faceUp ? 'face-up' : 'face-down'}`;
  if (card.faceUp && (card.suit === 'hearts' || card.suit === 'diamonds')) el.classList.add('red');
  el.dataset.source = source;
  el.innerHTML = card.faceUp
    ? `<span class="rank">${rl(card.rank)}</span><span class="suit">${SUIT_SYMBOL[card.suit]}</span>`
    : `<div class="card-back"></div>`;
  if (card.faceUp) el.draggable = true;
  return el;
}

export function renderGame(state: GameState): void {
  // Stock
  const stockEl = document.getElementById('stock')!;
  stockEl.innerHTML = '';
  if (state.stock.length > 0) {
    const b = document.createElement('div');
    b.className = 'card face-down clickable';
    b.dataset.source = 'stock';
    b.innerHTML = '<div class="card-back"></div>';
    stockEl.appendChild(b);
  } else {
    const r = document.createElement('div');
    r.className = 'pile-empty clickable';
    r.dataset.source = 'stock-empty';
    r.textContent = '↺';
    stockEl.appendChild(r);
  }

  // Waste
  const wasteEl = document.getElementById('waste')!;
  wasteEl.innerHTML = '';
  if (state.waste.length > 0) wasteEl.appendChild(makeCard(state.waste[state.waste.length - 1], 'waste'));

  // Foundations
  (['hearts', 'diamonds', 'clubs', 'spades'] as const).forEach(suit => {
    const el = document.getElementById(`foundation-${suit}`)!;
    el.innerHTML = '';
    const pile = state.foundations[SUIT_INDEX[suit]];
    if (pile.length > 0) {
      el.appendChild(makeCard(pile[pile.length - 1], `foundation-${suit}`));
    } else {
      el.innerHTML = `<span class="pile-label">${SUIT_SYMBOL[suit]}</span>`;
    }
  });

  // Tableau
  document.querySelectorAll<HTMLElement>('.column').forEach((colEl, ci) => {
    colEl.innerHTML = '';
    const col = state.tableau[ci];
    col.forEach((card, idx) => {
      const cardEl = makeCard(card, `tableau-${ci}-${idx}`);
      cardEl.style.top = `${idx * (card.faceUp ? 28 : 18)}px`;
      colEl.appendChild(cardEl);
    });
    colEl.style.minHeight = `${Math.max(120, col.length * 28 + 72)}px`;
  });

  // Controls
  (document.getElementById('moves-display') as HTMLElement).textContent = `Moves: ${state.moves}`;
  (document.getElementById('auto-complete') as HTMLButtonElement).hidden =
    !canAutoComplete(state) || state.status === 'won';

  // Win screen
  (document.getElementById('win-screen') as HTMLElement).hidden = state.status !== 'won';
}

export function renderTimer(state: GameState): void {
  if (state.status === 'won') return;
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  (document.getElementById('timer-display') as HTMLElement).textContent =
    `${m}:${String(s).padStart(2, '0')}`;
}
```

- [ ] **Step 2: Type check**

```bash
npm run check
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/ui/render.ts
git commit -m "feat: DOM renderer"
```

---

### Task 9: CSS

**Files:** Create `style.css`

- [ ] **Step 1: Create `style.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #1a6b3c;
  font-family: system-ui, sans-serif;
  min-height: 100vh;
  padding: 12px;
  color: #fff;
}

header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
h1 { font-size: 1.25rem; font-weight: 700; }
#controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

button {
  padding: 4px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  background: rgba(255,255,255,0.2);
  color: #fff;
}
button:hover { background: rgba(255,255,255,0.35); }

#top-row { display: flex; gap: 8px; margin-bottom: 16px; }
#top-row .spacer { flex: 1; }
#tableau { display: flex; gap: 8px; }

.pile {
  width: 72px;
  min-height: 100px;
  border-radius: 6px;
  border: 2px dashed rgba(255,255,255,0.3);
  position: relative;
}

.column {
  width: 72px;
  position: relative;
}

.pile-label {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.5rem;
  opacity: 0.4;
}

.pile-empty {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; opacity: 0.6; cursor: pointer;
}

.card {
  width: 72px; height: 100px;
  border-radius: 6px;
  position: absolute;
  user-select: none;
}

.card.face-up {
  background: #fff; color: #222;
  border: 1px solid #ccc;
  padding: 4px; cursor: grab;
}
.card.face-up.red { color: #c0392b; }

.card.face-down {
  background: repeating-linear-gradient(135deg, #1565c0, #1565c0 4px, #1976d2 4px, #1976d2 8px);
  border: 1px solid #0d47a1;
  cursor: default;
}
.card.face-down.clickable { cursor: pointer; }
.card.dragging { opacity: 0.4; }

.card .rank { display: block; font-size: 0.875rem; font-weight: 700; line-height: 1; }
.card .suit { display: block; font-size: 1.25rem; line-height: 1; }

#win-screen {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 20px;
}
#win-screen h2 { font-size: 3rem; }
#win-screen button { font-size: 1.25rem; padding: 10px 32px; background: #fff; color: #1a6b3c; }
```

- [ ] **Step 2: Commit**

```bash
git add style.css
git commit -m "feat: CSS layout and card styles"
```

---

### Task 10: Drag-and-drop

**Files:** Create `src/ui/dragDrop.ts`

- [ ] **Step 1: Create `src/ui/dragDrop.ts`**

```typescript
import { dispatch, getState } from '../store';
import type { Source, Target } from '../game/types';
import { SUITS } from '../game/types';

let dragSource: Source | null = null;
let dragCount = 1;

function parseTarget(pileAttr: string): Target | null {
  if (pileAttr.startsWith('tableau-')) return { kind: 'tableau', column: parseInt(pileAttr.split('-')[1], 10) };
  for (const suit of SUITS) {
    if (pileAttr === `foundation-${suit}`) return { kind: 'foundation', suit };
  }
  return null;
}

function parseSource(sourceAttr: string): { source: Source; count: number } | null {
  if (sourceAttr === 'waste') return { source: { kind: 'waste' }, count: 1 };
  if (sourceAttr.startsWith('tableau-')) {
    const parts = sourceAttr.split('-');
    const col = parseInt(parts[1], 10);
    const cardIndex = parseInt(parts[2], 10);
    const count = getState().tableau[col].length - cardIndex;
    return { source: { kind: 'tableau', column: col }, count };
  }
  return null;
}

export function initDragDrop(): void {
  document.addEventListener('dragstart', e => {
    const el = e.target as HTMLElement;
    const parsed = parseSource(el.dataset.source ?? '');
    if (!parsed) return;
    dragSource = parsed.source;
    dragCount = parsed.count;
    el.classList.add('dragging');
    e.dataTransfer!.effectAllowed = 'move';
  });

  document.addEventListener('dragend', e => {
    (e.target as HTMLElement).classList.remove('dragging');
    dragSource = null;
  });

  document.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  });

  document.addEventListener('drop', e => {
    e.preventDefault();
    if (!dragSource) return;
    const el = (e.target as HTMLElement).closest('[data-pile]') as HTMLElement | null;
    if (!el) return;
    const to = parseTarget(el.dataset.pile!);
    if (!to) return;
    dispatch({ type: 'MOVE_CARDS', from: dragSource, to, count: dragCount });
    dragSource = null;
  });
}
```

- [ ] **Step 2: Type check**

```bash
npm run check
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/ui/dragDrop.ts
git commit -m "feat: HTML5 drag-and-drop"
```

---

### Task 11: Click and keyboard events

**Files:** Create `src/ui/events.ts`

- [ ] **Step 1: Create `src/ui/events.ts`**

```typescript
import { dispatch, getState, undo } from '../store';
import { SUIT_INDEX } from '../game/types';
import { canPlaceOnFoundation, canPlaceOnTableau } from '../game/rules';

export function initEvents(): void {
  document.addEventListener('click', e => {
    const cardEl = (e.target as HTMLElement).closest('.card') as HTMLElement | null;
    const source = cardEl?.dataset.source ?? (e.target as HTMLElement).dataset.source;
    if (!source) return;

    if (source === 'stock') { dispatch({ type: 'DRAW' }); return; }
    if (source === 'stock-empty') { dispatch({ type: 'RESET_STOCK' }); return; }

    if (source === 'waste') {
      const state = getState();
      if (state.waste.length === 0) return;
      const top = state.waste[state.waste.length - 1];
      const fi = SUIT_INDEX[top.suit];
      if (canPlaceOnFoundation(top, state.foundations[fi])) {
        dispatch({ type: 'MOVE_CARDS', from: { kind: 'waste' }, to: { kind: 'foundation', suit: top.suit }, count: 1 });
        return;
      }
      for (let col = 0; col < 7; col++) {
        if (canPlaceOnTableau(top, state.tableau[col])) {
          dispatch({ type: 'MOVE_CARDS', from: { kind: 'waste' }, to: { kind: 'tableau', column: col }, count: 1 });
          return;
        }
      }
      return;
    }

    if (source.startsWith('tableau-')) {
      const parts = source.split('-');
      const col = parseInt(parts[1], 10);
      const cardIndex = parseInt(parts[2], 10);
      const state = getState();
      const card = state.tableau[col][cardIndex];
      if (!card?.faceUp) return;
      const isTop = cardIndex === state.tableau[col].length - 1;
      if (isTop) {
        const fi = SUIT_INDEX[card.suit];
        if (canPlaceOnFoundation(card, state.foundations[fi])) {
          dispatch({ type: 'MOVE_CARDS', from: { kind: 'tableau', column: col }, to: { kind: 'foundation', suit: card.suit }, count: 1 });
          return;
        }
      }
      for (let dest = 0; dest < 7; dest++) {
        if (dest === col) continue;
        if (canPlaceOnTableau(card, state.tableau[dest])) {
          const count = state.tableau[col].length - cardIndex;
          dispatch({ type: 'MOVE_CARDS', from: { kind: 'tableau', column: col }, to: { kind: 'tableau', column: dest }, count });
          return;
        }
      }
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'u' || e.key === 'U') undo();
    if (e.key === 'n' || e.key === 'N') dispatch({ type: 'NEW_GAME' });
  });
}
```

- [ ] **Step 2: Type check**

```bash
npm run check
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/ui/events.ts
git commit -m "feat: click and keyboard events"
```

---

### Task 12: Main entry point

**Files:** Create `src/main.ts`

- [ ] **Step 1: Create `src/main.ts`**

```typescript
import { subscribe, dispatch, undo, getState } from './store';
import { renderGame, renderTimer } from './ui/render';
import { initDragDrop } from './ui/dragDrop';
import { initEvents } from './ui/events';

document.getElementById('new-game')!.addEventListener('click', () => dispatch({ type: 'NEW_GAME' }));
document.getElementById('undo')!.addEventListener('click', () => undo());
document.getElementById('play-again')!.addEventListener('click', () => dispatch({ type: 'NEW_GAME' }));

let autoCompleteInterval: ReturnType<typeof setInterval> | null = null;

document.getElementById('auto-complete')!.addEventListener('click', () => {
  if (autoCompleteInterval) return;
  autoCompleteInterval = setInterval(() => {
    if (getState().status === 'won') { clearInterval(autoCompleteInterval!); autoCompleteInterval = null; return; }
    dispatch({ type: 'AUTO_COMPLETE_STEP' });
  }, 300);
});

subscribe(state => {
  renderGame(state);
  if (state.status === 'won' && autoCompleteInterval) {
    clearInterval(autoCompleteInterval);
    autoCompleteInterval = null;
  }
});

setInterval(() => renderTimer(getState()), 1000);

initDragDrop();
initEvents();
renderGame(getState());
```

- [ ] **Step 2: Type check**

```bash
npm run check
```

Expected: no errors

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: `dist/bundle.js` created, no errors

- [ ] **Step 4: Open in browser and verify**

Open `index.html` (or `npx serve . --listen 3000` then visit `http://localhost:3000`).

Verify manually:
- Cards render on the board
- Clicking stock deals a card to waste
- Cards drag to valid positions; invalid drops are silent no-ops
- Clicking a card dispatches first legal move
- `U` undoes; `N` starts new game
- "Auto-complete" button appears when all tableau cards are face-up
- Win screen appears when all foundations complete
- Timer counts up; move counter increments

- [ ] **Step 5: Commit**

```bash
git add src/main.ts
git commit -m "feat: main entry point — game is playable"
```

---

### Task 13: Update CLAUDE.md

**Files:** Modify `CLAUDE.md`

- [ ] **Step 1: Replace `CLAUDE.md` contents**

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
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
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with commands and architecture"
```
