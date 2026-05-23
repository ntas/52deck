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
