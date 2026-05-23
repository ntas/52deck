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
