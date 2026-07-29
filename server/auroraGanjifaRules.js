const AURORA_GANJIFA_RULESET = Object.freeze({
  gameId: "aurora-ganjifa-academy",
  rulesetVersion: "ignca-mughal-teaching-baseline-1.0.0",
  traditionalName: "Mughal Ganjifa",
  source: "IGNCA, Ganjifa — Traditional Playing Cards of India workshop report",
  playerCounts: [3, 4],
  suits: 8,
  cardsPerSuit: 12,
  cards: 96,
  direction: "anticlockwise",
  permanentTrump: false,
  openingPolicy: "holder-of-taj-raja",
  tiePolicy: "shared-draw"
});

const STRONG_SUITS = Object.freeze(["taj", "safed", "samsher", "ghulam"]);
const WEAK_SUITS = Object.freeze(["chang", "surkh", "barat", "qimash"]);
const SUITS = Object.freeze([
  { id: "taj", name: "Taj", symbol: "♛", class: "strong" },
  { id: "safed", name: "Safed", symbol: "◌", class: "strong" },
  { id: "samsher", name: "Samsher", symbol: "⚔", class: "strong" },
  { id: "ghulam", name: "Ghulam", symbol: "♞", class: "strong" },
  { id: "chang", name: "Chang", symbol: "◖", class: "weak" },
  { id: "surkh", name: "Surkh", symbol: "●", class: "weak" },
  { id: "barat", name: "Barat", symbol: "✦", class: "weak" },
  { id: "qimash", name: "Qimash", symbol: "◆", class: "weak" }
]);
const RANKS = Object.freeze(["raja", "pradhan", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
const SEATS = Object.freeze(["north", "west", "south", "east"]);

function seatOrder(playerCount = 3) { return SEATS.slice(0, playerCount === 4 ? 4 : 3); }
function nextSeat(seats, seat) { return seats[(seats.indexOf(seat) + 1) % seats.length]; }
function suitInfo(suit) { return SUITS.find((entry) => entry.id === suit) || SUITS[0]; }
function rankLabel(rank) { return rank === "raja" ? "Raja" : rank === "pradhan" ? "Pradhan" : rank === "1" ? "Ace" : rank; }
function cardStrength(card) {
  if (card.rank === "raja") return 120;
  if (card.rank === "pradhan") return 110;
  const numeral = Number(card.rank);
  return STRONG_SUITS.includes(card.suit) ? 20 - numeral : 9 + numeral;
}
function makeDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({
    id: `${suit.id}-${rank}`,
    suit: suit.id,
    suitName: suit.name,
    suitClass: suit.class,
    symbol: suit.symbol,
    rank,
    rankLabel: rankLabel(rank),
    strength: cardStrength({ suit: suit.id, rank })
  })));
}
function seededRandom(seed) {
  let value = Number(seed || 1) >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
function shuffleDeck(deck, random = Math.random) {
  const cards = deck.map((card) => ({ ...card }));
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }
  return cards;
}
function createAcademyState({ playerCount = 3, seed = Date.now(), deckOrder = null, mode = "practice" } = {}) {
  const seats = seatOrder(playerCount);
  const deck = deckOrder ? deckOrder.map((card) => ({ ...card })) : shuffleDeck(makeDeck(), seededRandom(seed));
  const hands = Object.fromEntries(seats.map((seat) => [seat, []]));
  deck.forEach((card, index) => hands[seats[index % seats.length]].push(card));
  Object.values(hands).forEach(sortHand);
  const opener = seats.find((seat) => hands[seat].some((card) => card.id === "taj-raja")) || seats[0];
  const state = {
    gameId: AURORA_GANJIFA_RULESET.gameId,
    rulesetVersion: AURORA_GANJIFA_RULESET.rulesetVersion,
    mode,
    playerCount: seats.length,
    seats,
    hands,
    currentPlayer: opener,
    leader: opener,
    currentTrick: [],
    ledSuit: null,
    completedTricks: [],
    tricksWon: Object.fromEntries(seats.map((seat) => [seat, 0])),
    capturedCards: Object.fromEntries(seats.map((seat) => [seat, 0])),
    trickNumber: 1,
    phase: "playing",
    winner: null,
    winners: [],
    isDraw: false,
    winReason: null,
    lastAction: null
  };
  assertStateInvariant(state);
  return state;
}
function createFollowSuitLesson() {
  const seats = seatOrder(3);
  const state = createAcademyState({ playerCount: 3, seed: 17, mode: "lesson" });
  state.hands = {
    north: [card("taj", "7"), card("surkh", "10")],
    west: [card("taj", "1"), card("surkh", "1")],
    south: [card("taj", "10"), card("barat", "raja")]
  };
  Object.values(state.hands).forEach(sortHand);
  state.currentPlayer = "north";
  state.leader = "north";
  state.currentTrick = [];
  state.ledSuit = null;
  state.trickNumber = 1;
  state.tricksWon = Object.fromEntries(seats.map((seat) => [seat, 0]));
  state.capturedCards = Object.fromEntries(seats.map((seat) => [seat, 0]));
  state.completedTricks = [];
  return state;
}
function card(suit, rank) { return makeDeck().find((entry) => entry.suit === suit && entry.rank === rank); }
function sortHand(hand) {
  hand.sort((a, b) => SUITS.findIndex((suit) => suit.id === a.suit) - SUITS.findIndex((suit) => suit.id === b.suit) || b.strength - a.strength);
  return hand;
}
function getLegalActions(state, seat = state.currentPlayer) {
  if (!state || state.phase !== "playing" || seat !== state.currentPlayer) return [];
  const hand = state.hands[seat] || [];
  if (!hand.length) return [];
  const ledSuit = state.currentTrick[0]?.card.suit || null;
  const matching = ledSuit ? hand.filter((card) => card.suit === ledSuit) : hand;
  const legal = ledSuit && matching.length ? matching : hand;
  return legal.map((card) => ({ type: "play-card", seat, cardId: card.id }));
}
function validateAction(state, action, seat = state.currentPlayer) {
  if (!state || state.phase !== "playing") return { valid: false, reason: "The academy deal is complete." };
  if (seat !== state.currentPlayer) return { valid: false, reason: "It is not this seat's turn." };
  const legal = getLegalActions(state, seat).find((candidate) => candidate.cardId === action?.cardId);
  if (!legal) return { valid: false, reason: "Follow the led suit when you hold it." };
  return { valid: true, action: legal };
}
function applyAction(state, action, seat = state.currentPlayer) {
  const validation = validateAction(state, action, seat);
  if (!validation.valid) return { state, error: validation.reason };
  const next = JSON.parse(JSON.stringify(state));
  const hand = next.hands[seat];
  const index = hand.findIndex((card) => card.id === validation.action.cardId);
  const [played] = hand.splice(index, 1);
  next.currentTrick.push({ seat, card: played });
  next.ledSuit = next.currentTrick[0].card.suit;
  next.lastAction = { type: "play-card", seat, cardId: played.id, trickNumber: next.trickNumber };
  if (next.currentTrick.length < next.playerCount) {
    next.currentPlayer = nextSeat(next.seats, seat);
  } else {
    const winningPlay = [...next.currentTrick]
      .filter((play) => play.card.suit === next.ledSuit)
      .sort((a, b) => b.card.strength - a.card.strength)[0];
    const winner = winningPlay.seat;
    next.completedTricks.push({ number: next.trickNumber, ledSuit: next.ledSuit, winner, cards: next.currentTrick });
    next.tricksWon[winner] += 1;
    next.capturedCards[winner] += next.playerCount;
    next.lastAction.trickWinner = winner;
    next.currentTrick = [];
    next.ledSuit = null;
    next.leader = winner;
    next.currentPlayer = winner;
    next.trickNumber += 1;
    if (next.seats.every((candidate) => next.hands[candidate].length === 0)) finalizeDeal(next);
  }
  assertStateInvariant(next);
  return { state: next, error: null };
}
function finalizeDeal(state) {
  const best = Math.max(...state.seats.map((seat) => state.capturedCards[seat]));
  const winners = state.seats.filter((seat) => state.capturedCards[seat] === best);
  state.phase = "finished";
  state.winners = winners;
  state.winner = winners.length === 1 ? winners[0] : null;
  state.isDraw = winners.length > 1;
  state.winReason = winners.length === 1 ? "most-cards" : "shared-most-cards";
}
function publicState(state) {
  return {
    gameId: state.gameId,
    rulesetVersion: state.rulesetVersion,
    mode: state.mode,
    playerCount: state.playerCount,
    seats: state.seats,
    currentPlayer: state.currentPlayer,
    leader: state.leader,
    currentTrick: state.currentTrick,
    ledSuit: state.ledSuit,
    completedTricks: state.completedTricks,
    tricksWon: state.tricksWon,
    capturedCards: state.capturedCards,
    handCounts: Object.fromEntries(state.seats.map((seat) => [seat, state.hands[seat].length])),
    trickNumber: state.trickNumber,
    phase: state.phase,
    winner: state.winner,
    winners: state.winners,
    isDraw: state.isDraw,
    winReason: state.winReason,
    lastAction: state.lastAction
  };
}
function playerProjection(state, seat = null) {
  return { ...publicState(state), privateHand: seat && state.hands[seat] ? state.hands[seat] : [], viewerSeat: seat };
}
function resultTitle(state) {
  if (state.phase !== "finished") return "Academy deal in progress";
  if (state.isDraw) return "Shared academy victory";
  return `${seatName(state.winner)} wins the deal`;
}
function seatName(seat) { return ({ north: "Aurora North", west: "Glacier West", south: "Ember South", east: "Moonlit East" })[seat] || seat; }
function assertStateInvariant(state) {
  if (![3, 4].includes(state.playerCount)) throw new Error("Ganjifa player-count invariant failed.");
  if (state.seats.length !== state.playerCount) throw new Error("Ganjifa seat invariant failed.");
  const cards = state.seats.flatMap((seat) => state.hands[seat] || []).concat(state.currentTrick.map((play) => play.card), state.completedTricks.flatMap((trick) => trick.cards.map((play) => play.card)));
  if (state.mode !== "lesson" && cards.length !== 96) throw new Error(`Ganjifa card conservation failed: ${cards.length}.`);
  if (new Set(cards.map((card) => card.id)).size !== cards.length) throw new Error("Ganjifa duplicate-card invariant failed.");
  if (state.currentTrick.length > state.playerCount) throw new Error("Ganjifa trick-size invariant failed.");
  return true;
}

module.exports = {
  AURORA_GANJIFA_RULESET, STRONG_SUITS, WEAK_SUITS, SUITS, RANKS, SEATS,
  makeDeck, shuffleDeck, createAcademyState, createFollowSuitLesson, cardStrength,
  getLegalActions, validateAction, applyAction, publicState, playerProjection,
  resultTitle, seatName, assertStateInvariant
};
