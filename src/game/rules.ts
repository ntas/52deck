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
