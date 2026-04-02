const SUITS = ["S", "H", "D", "C"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

function randomInt(maxExclusive) {
  if (maxExclusive <= 0) {
    throw new Error("maxExclusive must be > 0");
  }

  if (globalThis.crypto?.getRandomValues) {
    const maxUint32 = 0xffffffff;
    const threshold = maxUint32 - (maxUint32 % maxExclusive);
    const randomBuffer = new Uint32Array(1);

    while (true) {
      globalThis.crypto.getRandomValues(randomBuffer);
      const value = randomBuffer[0];
      if (value < threshold) {
        return value % maxExclusive;
      }
    }
  }

  return Math.floor(Math.random() * maxExclusive);
}

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  return deck;
}

export function fisherYatesShuffle(cards) {
  const result = cards.slice();

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
