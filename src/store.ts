import type { Action, GameState } from './game/types';
import { gameReducer } from './game/reducer';
import { createDeck, deal, shuffle } from './game/deck';

let history: GameState[] = [];
let current: GameState = deal(shuffle(createDeck()));
const listeners: Array<(s: GameState) => void> = [];

export function getState(): GameState { return current; }

export function dispatch(action: Action): void {
  history.push(current);
  current = gameReducer(current, action);
  notify();
}

export function undo(): void {
  if (history.length === 0) return;
  current = history.pop()!;
  notify();
}

export function subscribe(fn: (s: GameState) => void): void {
  listeners.push(fn);
}

function notify(): void {
  for (const fn of listeners) fn(current);
}
