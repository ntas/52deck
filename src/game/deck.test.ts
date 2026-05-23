import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, deal } from './deck';

describe('createDeck', () => {
  it('creates 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map(c => `${c.suit}-${c.rank}`)).size).toBe(52);
  });
  it('all cards start face-down', () => {
    expect(createDeck().every(c => !c.faceUp)).toBe(true);
  });
});

describe('shuffle', () => {
  it('returns 52 cards without mutating input', () => {
    const deck = createDeck();
    const copy = [...deck];
    const result = shuffle(deck);
    expect(result).toHaveLength(52);
    expect(deck).toEqual(copy);
  });
});

describe('deal', () => {
  it('produces valid starting state', () => {
    const s = deal(shuffle(createDeck()));
    expect(s.tableau).toHaveLength(7);
    expect(s.stock).toHaveLength(24);
    expect(s.waste).toHaveLength(0);
    expect(s.foundations.every(f => f.length === 0)).toBe(true);
    expect(s.status).toBe('playing');
  });
  it('column i has i+1 cards', () => {
    const s = deal(shuffle(createDeck()));
    for (let i = 0; i < 7; i++) expect(s.tableau[i]).toHaveLength(i + 1);
  });
  it('last card in each column is face-up, rest face-down', () => {
    const s = deal(shuffle(createDeck()));
    for (const col of s.tableau) {
      expect(col[col.length - 1].faceUp).toBe(true);
      for (let i = 0; i < col.length - 1; i++) expect(col[i].faceUp).toBe(false);
    }
  });
});
