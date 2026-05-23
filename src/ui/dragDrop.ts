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
