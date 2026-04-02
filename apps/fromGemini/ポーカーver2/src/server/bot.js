import { evaluateBest } from "./handEvaluator.js";

function preflopScore(holeCards) {
  const [a, b] = holeCards;
  const high = Math.max(a.rank, b.rank);
  const low = Math.min(a.rank, b.rank);
  const suited = a.suit === b.suit;
  const gap = Math.abs(a.rank - b.rank);

  let score = 0;
  if (a.rank === b.rank) score += 55 + high;
  score += high * 2 + low;
  if (suited) score += 7;
  if (gap <= 1) score += 5;
  if (high >= 11) score += 8;
  if (high === 14) score += 8;
  return score;
}

function postflopStrength(holeCards, communityCards) {
  const all = [...holeCards, ...communityCards];
  const hand = evaluateBest(all);
  return hand.rank[0] * 22 + (hand.rank[1] ?? 0);
}

function rand() {
  return Math.random();
}

export function chooseBotAction({
  player,
  communityCards,
  toCall,
  minRaise,
  stage,
}) {
  const chips = player.chips;
  if (chips <= 0) {
    return { type: "check" };
  }

  const strength =
    stage === "preflop"
      ? preflopScore(player.holeCards)
      : postflopStrength(player.holeCards, communityCards);

  const pressure = toCall <= 0 ? 0 : Math.min(1, toCall / Math.max(1, chips));
  const aggression = strength / (stage === "preflop" ? 130 : 190);

  if (toCall > 0 && aggression < 0.22 && rand() > 0.15) {
    return { type: "fold" };
  }

  if (toCall > 0 && pressure > 0.35 && aggression < 0.34) {
    return { type: "fold" };
  }

  const raiseChance = Math.max(0, aggression - pressure) * 0.75;
  if (chips > toCall + minRaise && rand() < raiseChance) {
    return { type: "raise", amount: minRaise };
  }

  if (toCall > 0) {
    return { type: "call" };
  }

  if (rand() < raiseChance * 0.7 && chips >= minRaise) {
    return { type: "raise", amount: minRaise };
  }

  return { type: "check" };
}
