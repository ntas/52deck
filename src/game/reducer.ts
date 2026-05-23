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
      return {
        ...state,
        stock: state.stock.slice(0, -1),
        waste: [...state.waste, { ...top, faceUp: true }],
        moves: state.moves + 1,
      };
    }

    case 'RESET_STOCK': {
      if (state.stock.length > 0) return state;
      return {
        ...state,
        stock: [...state.waste].reverse().map(c => ({ ...c, faceUp: false })),
        waste: [],
        moves: state.moves + 1,
      };
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

      const next: GameState = {
        ...state,
        waste: newWaste,
        tableau: newTableau,
        foundations: newFoundations,
        moves: state.moves + 1,
      };
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
