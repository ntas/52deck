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
