// src/game/types.ts
var SUITS = ["hearts", "diamonds", "clubs", "spades"];
var SUIT_INDEX = {
  hearts: 0,
  diamonds: 1,
  clubs: 2,
  spades: 3
};

// src/game/rules.ts
function isRed(card) {
  return card.suit === "hearts" || card.suit === "diamonds";
}
function canPlaceOnTableau(card, column) {
  if (column.length === 0) return card.rank === 13;
  const top = column[column.length - 1];
  return isRed(card) !== isRed(top) && card.rank === top.rank - 1;
}
function canPlaceOnFoundation(card, foundation) {
  if (foundation.length === 0) return card.rank === 1;
  const top = foundation[foundation.length - 1];
  return card.suit === top.suit && card.rank === top.rank + 1;
}
function canPlace(card, target, state) {
  if (target.kind === "tableau") return canPlaceOnTableau(card, state.tableau[target.column]);
  return canPlaceOnFoundation(card, state.foundations[SUIT_INDEX[target.suit]]);
}
function isWon(state) {
  return state.foundations.every((f) => f.length === 13);
}
function canAutoComplete(state) {
  return state.tableau.every((col) => col.every((card) => card.faceUp));
}

// src/game/deck.ts
function createDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      cards.push({ suit, rank, faceUp: false });
    }
  }
  return cards;
}
function shuffle(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function deal(deck) {
  const cards = [...deck];
  const tableau = [];
  for (let i = 0; i < 7; i++) {
    const col = [];
    for (let j = 0; j < i; j++) col.push({ ...cards.shift(), faceUp: false });
    col.push({ ...cards.shift(), faceUp: true });
    tableau.push(col);
  }
  return {
    stock: cards.map((c) => ({ ...c, faceUp: false })),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    moves: 0,
    startTime: Date.now(),
    pausedAt: null,
    status: "playing"
  };
}

// src/game/autoComplete.ts
function nextAutoCompleteMove(state) {
  const minFoundation = Math.min(...state.foundations.map((f) => f.length));
  if (state.waste.length > 0) {
    const top = state.waste[state.waste.length - 1];
    const fi = SUIT_INDEX[top.suit];
    if (canPlaceOnFoundation(top, state.foundations[fi]) && top.rank <= minFoundation + 2) {
      return { type: "MOVE_CARDS", from: { kind: "waste" }, to: { kind: "foundation", suit: top.suit }, count: 1 };
    }
  }
  for (let col = 0; col < state.tableau.length; col++) {
    const column = state.tableau[col];
    if (column.length === 0) continue;
    const top = column[column.length - 1];
    if (!top.faceUp) continue;
    const fi = SUIT_INDEX[top.suit];
    if (canPlaceOnFoundation(top, state.foundations[fi]) && top.rank <= minFoundation + 2) {
      return { type: "MOVE_CARDS", from: { kind: "tableau", column: col }, to: { kind: "foundation", suit: top.suit }, count: 1 };
    }
  }
  if (state.waste.length > 0) {
    const top = state.waste[state.waste.length - 1];
    const fi = SUIT_INDEX[top.suit];
    if (canPlaceOnFoundation(top, state.foundations[fi])) {
      return { type: "MOVE_CARDS", from: { kind: "waste" }, to: { kind: "foundation", suit: top.suit }, count: 1 };
    }
  }
  for (let col = 0; col < state.tableau.length; col++) {
    const column = state.tableau[col];
    if (column.length === 0) continue;
    const top = column[column.length - 1];
    if (!top.faceUp) continue;
    const fi = SUIT_INDEX[top.suit];
    if (canPlaceOnFoundation(top, state.foundations[fi])) {
      return { type: "MOVE_CARDS", from: { kind: "tableau", column: col }, to: { kind: "foundation", suit: top.suit }, count: 1 };
    }
  }
  return null;
}

// src/game/reducer.ts
function gameReducer(state, action) {
  switch (action.type) {
    case "DRAW": {
      if (state.stock.length === 0) return state;
      const top = state.stock[state.stock.length - 1];
      return {
        ...state,
        stock: state.stock.slice(0, -1),
        waste: [...state.waste, { ...top, faceUp: true }],
        moves: state.moves + 1
      };
    }
    case "RESET_STOCK": {
      if (state.stock.length > 0) return state;
      return {
        ...state,
        stock: [...state.waste].reverse().map((c) => ({ ...c, faceUp: false })),
        waste: [],
        moves: state.moves + 1
      };
    }
    case "MOVE_CARDS": {
      const { from, to, count } = action;
      const newTableau = state.tableau.map((col) => [...col]);
      let newWaste = [...state.waste];
      let movingCards;
      if (from.kind === "waste") {
        if (newWaste.length === 0) return state;
        movingCards = [newWaste[newWaste.length - 1]];
        if (!canPlace(movingCards[0], to, state)) return state;
        newWaste = newWaste.slice(0, -1);
      } else {
        const col = newTableau[from.column];
        const faceUpStart = col.findIndex((c) => c.faceUp);
        if (faceUpStart < 0) return state;
        const takeFrom = col.length - count;
        if (takeFrom < faceUpStart) return state;
        movingCards = col.splice(takeFrom, count);
        if (!canPlace(movingCards[0], to, state)) return state;
        if (col.length > 0 && !col[col.length - 1].faceUp) {
          col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
        }
      }
      const newFoundations = state.foundations.map((f) => [...f]);
      if (to.kind === "tableau") {
        newTableau[to.column].push(...movingCards);
      } else {
        newFoundations[SUIT_INDEX[to.suit]].push(...movingCards);
      }
      const next = {
        ...state,
        waste: newWaste,
        tableau: newTableau,
        foundations: newFoundations,
        moves: state.moves + 1
      };
      return isWon(next) ? { ...next, status: "won" } : next;
    }
    case "AUTO_COMPLETE_STEP": {
      const move = nextAutoCompleteMove(state);
      return move ? gameReducer(state, move) : state;
    }
    case "NEW_GAME":
      return deal(shuffle(createDeck()));
  }
}

// src/store.ts
var history = [];
var current = deal(shuffle(createDeck()));
var listeners = [];
function getState() {
  return current;
}
function dispatch(action) {
  history.push(current);
  current = gameReducer(current, action);
  notify();
}
function undo() {
  if (history.length === 0) return;
  current = history.pop();
  notify();
}
function subscribe(fn) {
  listeners.push(fn);
}
function notify() {
  for (const fn of listeners) fn(current);
}

// src/ui/render.ts
var RANK_LABEL = { 1: "A", 11: "J", 12: "Q", 13: "K" };
var SUIT_SYMBOL = { hearts: "\u2665", diamonds: "\u2666", clubs: "\u2663", spades: "\u2660" };
var rl = (rank) => RANK_LABEL[rank] ?? String(rank);
function makeCard(card, source) {
  const el = document.createElement("div");
  el.className = `card ${card.faceUp ? "face-up" : "face-down"}`;
  if (card.faceUp && (card.suit === "hearts" || card.suit === "diamonds")) el.classList.add("red");
  el.dataset.source = source;
  el.innerHTML = card.faceUp ? `<span class="rank">${rl(card.rank)}</span><span class="suit">${SUIT_SYMBOL[card.suit]}</span>` : `<div class="card-back"></div>`;
  if (card.faceUp) el.draggable = true;
  return el;
}
function renderGame(state) {
  const stockEl = document.getElementById("stock");
  stockEl.innerHTML = "";
  if (state.stock.length > 0) {
    const b = document.createElement("div");
    b.className = "card face-down clickable";
    b.dataset.source = "stock";
    b.innerHTML = '<div class="card-back"></div>';
    stockEl.appendChild(b);
  } else {
    const r = document.createElement("div");
    r.className = "pile-empty clickable";
    r.dataset.source = "stock-empty";
    r.textContent = "\u21BA";
    stockEl.appendChild(r);
  }
  const wasteEl = document.getElementById("waste");
  wasteEl.innerHTML = "";
  if (state.waste.length > 0) wasteEl.appendChild(makeCard(state.waste[state.waste.length - 1], "waste"));
  ["hearts", "diamonds", "clubs", "spades"].forEach((suit) => {
    const el = document.getElementById(`foundation-${suit}`);
    el.innerHTML = "";
    const pile = state.foundations[SUIT_INDEX[suit]];
    if (pile.length > 0) {
      el.appendChild(makeCard(pile[pile.length - 1], `foundation-${suit}`));
    } else {
      el.innerHTML = `<span class="pile-label">${SUIT_SYMBOL[suit]}</span>`;
    }
  });
  document.querySelectorAll(".column").forEach((colEl, ci) => {
    colEl.innerHTML = "";
    const col = state.tableau[ci];
    col.forEach((card, idx) => {
      const cardEl = makeCard(card, `tableau-${ci}-${idx}`);
      cardEl.style.top = `${idx * (card.faceUp ? 28 : 18)}px`;
      colEl.appendChild(cardEl);
    });
    colEl.style.minHeight = `${Math.max(120, col.length * 28 + 72)}px`;
  });
  document.getElementById("moves-display").textContent = `Moves: ${state.moves}`;
  document.getElementById("auto-complete").hidden = !canAutoComplete(state) || state.status === "won";
  document.getElementById("win-screen").hidden = state.status !== "won";
}
function renderTimer(state) {
  if (state.status === "won") return;
  const elapsed = Math.floor((Date.now() - state.startTime) / 1e3);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  document.getElementById("timer-display").textContent = `${m}:${String(s).padStart(2, "0")}`;
}

// src/ui/dragDrop.ts
var dragSource = null;
var dragCount = 1;
function parseTarget(pileAttr) {
  if (pileAttr.startsWith("tableau-")) return { kind: "tableau", column: parseInt(pileAttr.split("-")[1], 10) };
  for (const suit of SUITS) {
    if (pileAttr === `foundation-${suit}`) return { kind: "foundation", suit };
  }
  return null;
}
function parseSource(sourceAttr) {
  if (sourceAttr === "waste") return { source: { kind: "waste" }, count: 1 };
  if (sourceAttr.startsWith("tableau-")) {
    const parts = sourceAttr.split("-");
    const col = parseInt(parts[1], 10);
    const cardIndex = parseInt(parts[2], 10);
    const count = getState().tableau[col].length - cardIndex;
    return { source: { kind: "tableau", column: col }, count };
  }
  return null;
}
function initDragDrop() {
  document.addEventListener("dragstart", (e) => {
    const el = e.target;
    const parsed = parseSource(el.dataset.source ?? "");
    if (!parsed) return;
    dragSource = parsed.source;
    dragCount = parsed.count;
    el.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  document.addEventListener("dragend", (e) => {
    e.target.classList.remove("dragging");
    dragSource = null;
  });
  document.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });
  document.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!dragSource) return;
    const el = e.target.closest("[data-pile]");
    if (!el) return;
    const to = parseTarget(el.dataset.pile);
    if (!to) return;
    dispatch({ type: "MOVE_CARDS", from: dragSource, to, count: dragCount });
    dragSource = null;
  });
}

// src/ui/events.ts
function initEvents() {
  document.addEventListener("click", (e) => {
    const cardEl = e.target.closest(".card");
    const source = cardEl?.dataset.source ?? e.target.dataset.source;
    if (!source) return;
    if (source === "stock") {
      dispatch({ type: "DRAW" });
      return;
    }
    if (source === "stock-empty") {
      dispatch({ type: "RESET_STOCK" });
      return;
    }
    if (source === "waste") {
      const state = getState();
      if (state.waste.length === 0) return;
      const top = state.waste[state.waste.length - 1];
      const fi = SUIT_INDEX[top.suit];
      if (canPlaceOnFoundation(top, state.foundations[fi])) {
        dispatch({ type: "MOVE_CARDS", from: { kind: "waste" }, to: { kind: "foundation", suit: top.suit }, count: 1 });
        return;
      }
      for (let col = 0; col < 7; col++) {
        if (canPlaceOnTableau(top, state.tableau[col])) {
          dispatch({ type: "MOVE_CARDS", from: { kind: "waste" }, to: { kind: "tableau", column: col }, count: 1 });
          return;
        }
      }
      return;
    }
    if (source.startsWith("tableau-")) {
      const parts = source.split("-");
      const col = parseInt(parts[1], 10);
      const cardIndex = parseInt(parts[2], 10);
      const state = getState();
      const card = state.tableau[col][cardIndex];
      if (!card?.faceUp) return;
      const isTop = cardIndex === state.tableau[col].length - 1;
      if (isTop) {
        const fi = SUIT_INDEX[card.suit];
        if (canPlaceOnFoundation(card, state.foundations[fi])) {
          dispatch({ type: "MOVE_CARDS", from: { kind: "tableau", column: col }, to: { kind: "foundation", suit: card.suit }, count: 1 });
          return;
        }
      }
      for (let dest = 0; dest < 7; dest++) {
        if (dest === col) continue;
        if (canPlaceOnTableau(card, state.tableau[dest])) {
          const count = state.tableau[col].length - cardIndex;
          dispatch({ type: "MOVE_CARDS", from: { kind: "tableau", column: col }, to: { kind: "tableau", column: dest }, count });
          return;
        }
      }
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "u" || e.key === "U") undo();
    if (e.key === "n" || e.key === "N") dispatch({ type: "NEW_GAME" });
  });
}

// src/main.ts
document.getElementById("new-game").addEventListener("click", () => dispatch({ type: "NEW_GAME" }));
document.getElementById("undo").addEventListener("click", () => undo());
document.getElementById("play-again").addEventListener("click", () => dispatch({ type: "NEW_GAME" }));
var autoCompleteInterval = null;
document.getElementById("auto-complete").addEventListener("click", () => {
  if (autoCompleteInterval) return;
  autoCompleteInterval = setInterval(() => {
    if (getState().status === "won") {
      clearInterval(autoCompleteInterval);
      autoCompleteInterval = null;
      return;
    }
    dispatch({ type: "AUTO_COMPLETE_STEP" });
  }, 300);
});
subscribe((state) => {
  renderGame(state);
  if (state.status === "won" && autoCompleteInterval) {
    clearInterval(autoCompleteInterval);
    autoCompleteInterval = null;
  }
});
setInterval(() => renderTimer(getState()), 1e3);
initDragDrop();
initEvents();
renderGame(getState());
