import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pokerEvaluator = require("poker-evaluator");

function combinations(cards, k) {
  const result = [];

  function dfs(start, path) {
    if (path.length === k) {
      result.push(path.slice());
      return;
    }

    for (let i = start; i < cards.length; i += 1) {
      path.push(cards[i]);
      dfs(i + 1, path);
      path.pop();
    }
  }

  dfs(0, []);
  return result;
}

function normalizeCard(card) {
  if (typeof card !== "string" || card.length !== 2) {
    throw new Error(`invalid card: ${String(card)}`);
  }
  return card.toUpperCase();
}

function toPokerEvaluatorCard(card) {
  const normalized = normalizeCard(card);
  return `${normalized[0]}${normalized[1].toLowerCase()}`;
}

function evaluateFiveCards(cards) {
  if (cards.length !== 5) {
    throw new Error("five cards are required");
  }

  const evaluated = pokerEvaluator.evalHand(cards.map(toPokerEvaluatorCard));
  return {
    rank: evaluated.handType,
    value: evaluated.value,
    name: evaluated.handName,
  };
}

export function compareHands(a, b) {
  return a.value - b.value;
}

export function evaluateBestFiveOfSeven(cards) {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error("cards must be between 5 and 7");
  }

  const uniqueCards = new Set(cards.map(normalizeCard));
  if (uniqueCards.size !== cards.length) {
    throw new Error("cards must be unique");
  }

  if (cards.length === 5) {
    return { cards: cards.slice(), score: evaluateFiveCards(cards) };
  }

  const allFiveHands = combinations(cards, 5);
  let best = null;

  for (const fiveCards of allFiveHands) {
    const score = evaluateFiveCards(fiveCards);
    if (!best || compareHands(score, best.score) > 0) {
      best = { cards: fiveCards, score };
    }
  }

  return best;
}
