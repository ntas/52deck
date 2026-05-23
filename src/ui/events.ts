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
