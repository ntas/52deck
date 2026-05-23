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
