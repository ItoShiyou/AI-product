import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { evaluateBestFiveOfSeven } from "../src/game/handEvaluator.js";

const require = createRequire(import.meta.url);
const pokerEvaluator = require("poker-evaluator");

const SUITS = ["S", "H", "D", "C"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

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

function toPokerEvaluatorCard(card) {
	return `${card[0]}${card[1].toLowerCase()}`;
}

function evaluateFiveByPokerEvaluator(cards) {
	return pokerEvaluator.evalHand(cards.map(toPokerEvaluatorCard));
}

function bestValueByPokerEvaluator(cards) {
	let bestValue = -Infinity;
	for (const five of combinations(cards, 5)) {
		const evaluated = evaluateFiveByPokerEvaluator(five);
		bestValue = Math.max(bestValue, evaluated.value);
	}
	return bestValue;
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

function pickRandomCards(deck, n) {
	const pool = deck.slice();
	const picked = [];
	for (let i = 0; i < n; i += 1) {
		const idx = Math.floor(Math.random() * pool.length);
		picked.push(pool[idx]);
		pool.splice(idx, 1);
	}
	return picked;
}

test("境界値: 5枚未満と7枚超は例外", () => {
	assert.throws(() => evaluateBestFiveOfSeven(["AS", "KS", "QS", "JS"]), /between 5 and 7/);
	assert.throws(
		() => evaluateBestFiveOfSeven(["AS", "KS", "QS", "JS", "TS", "9S", "8S", "7S"]),
		/between 5 and 7/
	);
	assert.throws(() => evaluateBestFiveOfSeven(["AS", "AS", "QS", "JS", "TS"]), /unique/);
});

test("既知ケース: 最強5枚が選ばれる", () => {
	const cases = [
		{
			cards: ["AS", "KS", "QS", "JS", "TS", "2D", "3C"],
			expectedRank: 9,
		},
		{
			cards: ["AH", "AD", "AS", "AC", "KH", "KD", "2C"],
			expectedRank: 8,
		},
		{
			cards: ["2S", "5S", "8S", "JS", "KS", "AD", "AC"],
			expectedRank: 6,
		},
		{
			cards: ["9H", "9D", "9S", "2C", "2D", "AH"],
			expectedRank: 7,
		},
	];

	for (const c of cases) {
		const result = evaluateBestFiveOfSeven(c.cards);
		assert.equal(result.score.rank, c.expectedRank);
		assert.equal(result.cards.length, 5);

		for (const card of result.cards) {
			assert.ok(c.cards.includes(card));
		}
	}
});

test("独立オラクル比較: ランダム7枚を多数検証", () => {
	const deck = createDeck();

	for (let i = 0; i < 3000; i += 1) {
		const cards = pickRandomCards(deck, 7);
		const actual = evaluateBestFiveOfSeven(cards);
		const actualValue = evaluateFiveByPokerEvaluator(actual.cards).value;
		const oracleValue = bestValueByPokerEvaluator(cards);

		assert.equal(actualValue, oracleValue, `score mismatch: cards=${cards.join(" ")}`);

		assert.equal(actual.cards.length, 5);
		for (const card of actual.cards) {
			assert.ok(cards.includes(card));
		}
	}
});

