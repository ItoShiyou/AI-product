const HAND_LABELS = [
  "High Card",
  "One Pair",
  "Two Pair",
  "Three of a Kind",
  "Straight",
  "Flush",
  "Full House",
  "Four of a Kind",
  "Straight Flush",
];

function toSortedValues(cards) {
  return cards.map((c) => c.rank).sort((a, b) => b - a);
}

function findStraight(values) {
  const uniq = [...new Set(values)].sort((a, b) => b - a);
  if (uniq.includes(14)) uniq.push(1);

  let run = 1;
  for (let i = 0; i < uniq.length - 1; i += 1) {
    if (uniq[i] - 1 === uniq[i + 1]) {
      run += 1;
      if (run >= 5) {
        return uniq[i - 3];
      }
    } else {
      run = 1;
    }
  }
  return null;
}

function evaluate5(cards) {
  const values = toSortedValues(cards);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);
  const straightHigh = findStraight(values);

  if (isFlush && straightHigh) {
    return { rank: [8, straightHigh], label: HAND_LABELS[8] };
  }

  const counts = new Map();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  const groups = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  if (groups[0][1] === 4) {
    const quad = groups[0][0];
    const kicker = groups[1][0];
    return { rank: [7, quad, kicker], label: HAND_LABELS[7] };
  }

  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return { rank: [6, groups[0][0], groups[1][0]], label: HAND_LABELS[6] };
  }

  if (isFlush) {
    return { rank: [5, ...values], label: HAND_LABELS[5] };
  }

  if (straightHigh) {
    return { rank: [4, straightHigh], label: HAND_LABELS[4] };
  }

  if (groups[0][1] === 3) {
    const trips = groups[0][0];
    const kickers = groups.slice(1).map(([v]) => v).sort((a, b) => b - a);
    return { rank: [3, trips, ...kickers], label: HAND_LABELS[3] };
  }

  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const pairA = Math.max(groups[0][0], groups[1][0]);
    const pairB = Math.min(groups[0][0], groups[1][0]);
    const kicker = groups.find(([, c]) => c === 1)[0];
    return { rank: [2, pairA, pairB, kicker], label: HAND_LABELS[2] };
  }

  if (groups[0][1] === 2) {
    const pair = groups[0][0];
    const kickers = groups.slice(1).map(([v]) => v).sort((a, b) => b - a);
    return { rank: [1, pair, ...kickers], label: HAND_LABELS[1] };
  }

  return { rank: [0, ...values], label: HAND_LABELS[0] };
}

function compareRank(a, b) {
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

function combinationsOf5(cards) {
  const result = [];
  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            result.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
          }
        }
      }
    }
  }
  return result;
}

export function evaluateBest(cards) {
  if (cards.length < 5) {
    throw new Error("評価には最低5枚のカードが必要です");
  }

  let best = null;
  for (const combo of combinationsOf5(cards)) {
    const value = evaluate5(combo);
    if (!best || compareRank(value.rank, best.rank) > 0) {
      best = value;
    }
  }
  return best;
}

export function compareHands(cardsA, cardsB) {
  const a = evaluateBest(cardsA);
  const b = evaluateBest(cardsB);
  return compareRank(a.rank, b.rank);
}
