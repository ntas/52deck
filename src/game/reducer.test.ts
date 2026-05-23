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
    const s: GameState = { ...base(), tableau: [[c('hearts', 3, false), c('clubs', 1)], [], [], [], [], [], []] };
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
