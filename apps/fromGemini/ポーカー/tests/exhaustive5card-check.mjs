import { evaluateBestFiveOfSeven } from "../src/game/handEvaluator.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pokerEvaluator = require("poker-evaluator");

const SUITS = ["S", "H", "D", "C"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

function toPokerEvaluatorCard(card) {
  return `${card[0]}${card[1].toLowerCase()}`;
}

function evaluateFiveByPokerEvaluator(cards) {
  return pokerEvaluator.evalHand(cards.map(toPokerEvaluatorCard));
}

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  return deck;
}

function runExhaustive() {
  const deck = createDeck();
  let total = 0;
  let mismatch = 0;
  let firstMismatch = null;

  const started = Date.now();

  for (let a = 0; a < deck.length - 4; a += 1) {
    for (let b = a + 1; b < deck.length - 3; b += 1) {
      for (let c = b + 1; c < deck.length - 2; c += 1) {
        for (let d = c + 1; d < deck.length - 1; d += 1) {
          for (let e = d + 1; e < deck.length; e += 1) {
            const cards = [deck[a], deck[b], deck[c], deck[d], deck[e]];
            const actual = evaluateBestFiveOfSeven(cards);
            const oracle = evaluateFiveByPokerEvaluator(cards);
            const actualValue = evaluateFiveByPokerEvaluator(actual.cards).value;

            if (actualValue !== oracle.value) {
              mismatch += 1;
              if (!firstMismatch) {
                firstMismatch = { cards, actual, oracle };
              }
            }

            total += 1;
          }
        }
      }
    }
  }

  const durationMs = Date.now() - started;
  console.log(JSON.stringify({ total, mismatch, durationMs, firstMismatch }, null, 2));
}

runExhaustive();
