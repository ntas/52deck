export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface GameState {
  stock: Card[];
  waste: Card[];
  foundations: [Card[], Card[], Card[], Card[]]; // indexed by SUIT_INDEX
  tableau: Card[][];                              // 7 columns
  moves: number;
  startTime: number;
  pausedAt: number | null;
  status: 'playing' | 'won';
}

export type Source =
  | { kind: 'waste' }
  | { kind: 'tableau'; column: number };

export type Target =
  | { kind: 'tableau'; column: number }
  | { kind: 'foundation'; suit: Suit };

export type Action =
  | { type: 'DRAW' }
  | { type: 'RESET_STOCK' }
  | { type: 'MOVE_CARDS'; from: Source; to: Target; count: number }
  | { type: 'AUTO_COMPLETE_STEP' }
  | { type: 'NEW_GAME' };

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export const SUIT_INDEX: Record<Suit, number> = {
  hearts: 0, diamonds: 1, clubs: 2, spades: 3,
};
