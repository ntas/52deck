import type { Action, GameState } from './types';
import { SUIT_INDEX } from './types';
import { canPlaceOnFoundation } from './rules';

export function nextAutoCompleteMove(state: GameState): Action | null {
  const minFoundation = Math.min(...state.foundations.map(f => f.length));

  // Check waste — prefer lower ranks to avoid blocking other suits
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

  // Retry without rank guard for end-game
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
