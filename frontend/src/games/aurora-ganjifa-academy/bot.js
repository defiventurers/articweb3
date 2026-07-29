import { getLegalActions } from "./rules.js";

export function chooseGanjifaBotAction(state, seat = state.currentPlayer) {
  const actions = getLegalActions(state, seat);
  if (!actions.length) return null;
  const hand = state.hands[seat] || [];
  const cards = actions.map((action) => ({ action, card: hand.find((card) => card.id === action.cardId) })).filter((entry) => entry.card);
  const currentWinner = state.currentTrick.length ? [...state.currentTrick].filter((play) => play.card.suit === state.ledSuit).sort((a,b) => b.card.strength - a.card.strength)[0]?.card : null;
  const winning = currentWinner ? cards.filter((entry) => entry.card.suit === state.ledSuit && entry.card.strength > currentWinner.strength).sort((a,b) => a.card.strength - b.card.strength)[0] : null;
  return (winning || cards.sort((a,b) => a.card.strength - b.card.strength)[0])?.action || actions[0];
}
