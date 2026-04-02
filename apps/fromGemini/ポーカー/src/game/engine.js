import { createDeck, fisherYatesShuffle } from "./deck.js";
import { compareHands, evaluateBestFiveOfSeven } from "./handEvaluator.js";

export class PokerEngine {
  constructor({ smallBlind = 5, bigBlind = 10 } = {}) {
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.players = [];
    this.dealerIndex = -1;
    this.handNumber = 0;
    this.logs = [];
    this.handEnded = true;
    this.winners = [];
    this.showdownResults = [];
    this.deck = [];
    this.communityCards = [];
    this.street = "waiting";
    this.currentBet = 0;
    this.minRaise = bigBlind;
    this.pendingToAct = new Set();
    this.actingIndex = null;
    this.handStartChips = new Map();
    this.lastHandSummary = null;
  }

  addPlayer(uid, name, chips = 1000, { isHuman = false } = {}) {
    this.players.push({
      uid,
      name,
      chips,
      isHuman,
      holeCards: [],
      inHand: false,
      folded: false,
      allIn: false,
      committed: 0,
      streetBet: 0,
      lastAction: "",
    });
  }

  startHand() {
    const eligible = this.getEligiblePlayerIndices();
    if (eligible.length < 2) {
      throw new Error("At least two players with chips are required");
    }

    this.handNumber += 1;
    this.handEnded = false;
    this.winners = [];
    this.showdownResults = [];
    this.communityCards = [];
    this.street = "preflop";
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.pendingToAct = new Set();
    this.lastHandSummary = null;

    this.deck = fisherYatesShuffle(createDeck());
    this.handStartChips = new Map(this.players.map((player) => [player.uid, player.chips]));
    for (const player of this.players) {
      player.holeCards = [];
      player.inHand = player.chips > 0;
      player.folded = false;
      player.allIn = false;
      player.committed = 0;
      player.streetBet = 0;
      player.lastAction = "";
    }

    this.dealerIndex = this.nextEligibleIndex(this.dealerIndex);
    const activeCount = this.getUnfoldedPlayers().length;
    const sbIndex = activeCount === 2 ? this.dealerIndex : this.nextEligibleIndex(this.dealerIndex);
    const bbIndex = this.nextEligibleIndex(sbIndex);

    this.dealHoleCards();
    this.postBlind(sbIndex, this.smallBlind, "SB");
    this.postBlind(bbIndex, this.bigBlind, "BB");

    this.currentBet = this.players[bbIndex].streetBet;
    this.actingIndex = activeCount === 2 ? sbIndex : this.nextEligibleIndex(bbIndex);
    this.resetPendingForStreet();

    this.log(`--- Hand #${this.handNumber} ---`);
    this.log(`Dealer: ${this.players[this.dealerIndex].name}`);
  }

  hasActiveHand() {
    return !this.handEnded;
  }

  getSnapshot() {
    return {
      handNumber: this.handNumber,
      street: this.street,
      dealerIndex: this.dealerIndex,
      actingIndex: this.actingIndex,
      pot: this.getPot(),
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      communityCards: this.communityCards.slice(),
      players: this.players.map((player) => ({
        uid: player.uid,
        name: player.name,
        chips: player.chips,
        inHand: player.inHand,
        folded: player.folded,
        allIn: player.allIn,
        committed: player.committed,
        streetBet: player.streetBet,
        lastAction: player.lastAction,
      })),
      handEnded: this.handEnded,
      winners: this.winners.slice(),
      showdownResults: this.showdownResults.slice(),
      handSummary: this.lastHandSummary,
      logs: this.logs.slice(0, 16),
    };
  }

  getPlayerByUid(uid) {
    return this.players.find((player) => player.uid === uid) || null;
  }

  getAvailableActions(uid) {
    const idx = this.players.findIndex((player) => player.uid === uid);
    if (idx < 0 || this.handEnded || this.actingIndex !== idx) {
      return [];
    }

    const player = this.players[idx];
    if (!player.inHand || player.folded || player.allIn) {
      return [];
    }

    const toCall = Math.max(0, this.currentBet - player.streetBet);
    const actions = ["fold"];
    if (toCall === 0) {
      actions.push("check");
      if (player.chips > 0) {
        actions.push("raise");
      }
      return actions;
    }

    if (player.chips > 0) {
      actions.push("call");
    }
    if (player.chips > toCall) {
      actions.push("raise");
    }
    return actions;
  }

  act(uid, action, amount = 0) {
    const idx = this.players.findIndex((player) => player.uid === uid);
    if (idx < 0 || this.handEnded) {
      return;
    }
    if (this.actingIndex !== idx) {
      throw new Error("Not this player's turn");
    }

    const player = this.players[idx];
    const toCall = Math.max(0, this.currentBet - player.streetBet);

    if (action === "fold") {
      player.folded = true;
      player.lastAction = "fold";
      this.pendingToAct.delete(idx);
      this.log(`${player.name} folds`);
    } else if (action === "check") {
      if (toCall !== 0) {
        throw new Error("Cannot check when facing a bet");
      }
      player.lastAction = "check";
      this.pendingToAct.delete(idx);
      this.log(`${player.name} checks`);
    } else if (action === "call") {
      const paid = this.commitChips(idx, toCall);
      player.lastAction = paid < toCall ? `call(all-in ${paid})` : `call ${paid}`;
      this.pendingToAct.delete(idx);
      this.log(`${player.name} ${player.lastAction}`);
    } else if (action === "raise") {
      this.applyRaise(idx, amount);
    } else {
      throw new Error(`Unsupported action: ${action}`);
    }

    if (this.getUnfoldedPlayers().length === 1) {
      this.finishByFold();
      return;
    }

    this.advanceIfNeeded();
  }

  getPot() {
    return this.players.reduce((sum, player) => sum + player.committed, 0);
  }

  log(message) {
    this.logs.unshift(`${new Date().toLocaleTimeString("ja-JP")} ${message}`);
    this.logs = this.logs.slice(0, 64);
  }

  getEligiblePlayerIndices() {
    return this.players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => player.chips > 0)
      .map(({ index }) => index);
  }

  getUnfoldedPlayers() {
    return this.players.filter((player) => player.inHand && !player.folded);
  }

  nextEligibleIndex(fromIndex) {
    const total = this.players.length;
    for (let offset = 1; offset <= total; offset += 1) {
      const idx = (fromIndex + offset + total) % total;
      if (this.players[idx].chips > 0) {
        return idx;
      }
    }
    return -1;
  }

  nextActingIndex(fromIndex) {
    const total = this.players.length;
    for (let offset = 1; offset <= total; offset += 1) {
      const idx = (fromIndex + offset + total) % total;
      const player = this.players[idx];
      if (player.inHand && !player.folded && !player.allIn) {
        return idx;
      }
    }
    return null;
  }

  dealHoleCards() {
    const inHandIndices = this.players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => player.inHand)
      .map(({ index }) => index);

    let cursor = this.dealerIndex;
    for (let round = 0; round < 2; round += 1) {
      for (let i = 0; i < inHandIndices.length; i += 1) {
        cursor = this.nextFromAllowed(cursor, inHandIndices);
        this.players[cursor].holeCards.push(this.deck.pop());
      }
    }
  }

  nextFromAllowed(fromIndex, allowedIndices) {
    const allowed = new Set(allowedIndices);
    const total = this.players.length;
    for (let offset = 1; offset <= total; offset += 1) {
      const idx = (fromIndex + offset + total) % total;
      if (allowed.has(idx)) {
        return idx;
      }
    }
    return fromIndex;
  }

  postBlind(index, amount, label) {
    const paid = this.commitChips(index, amount);
    this.players[index].lastAction = `${label} ${paid}`;
    this.log(`${this.players[index].name} posts ${label} ${paid}${this.players[index].allIn ? " (all-in)" : ""}`);
  }

  commitChips(index, amount) {
    const player = this.players[index];
    const committed = Math.max(0, Math.min(player.chips, amount));
    player.chips -= committed;
    player.streetBet += committed;
    player.committed += committed;
    if (player.chips === 0) {
      player.allIn = true;
    }
    return committed;
  }

  applyRaise(index, amount) {
    const player = this.players[index];
    const toCall = Math.max(0, this.currentBet - player.streetBet);
    const raiseBy = Math.max(0, Math.floor(amount));
    const paid = this.commitChips(index, toCall + raiseBy);
    const actualRaiseBy = paid - toCall;

    if (actualRaiseBy <= 0) {
      player.lastAction = paid < toCall ? `call(all-in ${paid})` : `call ${paid}`;
      this.pendingToAct.delete(index);
      this.log(`${player.name} ${player.lastAction}`);
      return;
    }

    if (actualRaiseBy < this.minRaise && !player.allIn) {
      player.chips += paid;
      player.streetBet -= paid;
      player.committed -= paid;
      throw new Error(`Minimum raise is ${this.minRaise}`);
    }

    if (actualRaiseBy < this.minRaise && player.allIn) {
      player.lastAction = `call(all-in ${paid})`;
      this.pendingToAct.delete(index);
      this.log(`${player.name} ${player.lastAction}`);
      return;
    }

    this.currentBet = player.streetBet;
    this.minRaise = actualRaiseBy;
    player.lastAction = `raise ${paid}`;
    this.resetPendingAfterAggression(index);
    this.log(`${player.name} raises by ${actualRaiseBy} (total ${player.streetBet})`);
  }

  resetPendingForStreet() {
    this.pendingToAct = new Set();
    for (let i = 0; i < this.players.length; i += 1) {
      const player = this.players[i];
      if (player.inHand && !player.folded && !player.allIn) {
        this.pendingToAct.add(i);
      }
    }
  }

  resetPendingAfterAggression(aggressorIndex) {
    this.pendingToAct = new Set();
    for (let i = 0; i < this.players.length; i += 1) {
      const player = this.players[i];
      if (i !== aggressorIndex && player.inHand && !player.folded && !player.allIn) {
        this.pendingToAct.add(i);
      }
    }
  }

  canAnyPlayerAct() {
    return this.players.filter((player) => player.inHand && !player.folded && !player.allIn).length >= 2;
  }

  advanceIfNeeded() {
    if (this.pendingToAct.size === 0 || !this.canAnyPlayerAct()) {
      this.advanceStreetOrShowdown();
      return;
    }
    this.actingIndex = this.nextActingIndex(this.actingIndex ?? this.dealerIndex);
  }

  advanceStreetOrShowdown() {
    if (this.getUnfoldedPlayers().length === 1) {
      this.finishByFold();
      return;
    }

    if (this.street === "river") {
      this.finishByShowdown();
      return;
    }

    this.dealNextStreet();
    if (!this.canAnyPlayerAct()) {
      while (this.street !== "river") {
        this.dealNextStreet();
      }
      this.finishByShowdown();
      return;
    }

    this.actingIndex = this.nextActingIndex(this.dealerIndex);
    this.resetPendingForStreet();
  }

  dealNextStreet() {
    for (const player of this.players) {
      player.streetBet = 0;
    }
    this.currentBet = 0;
    this.minRaise = this.bigBlind;

    if (this.street === "preflop") {
      this.street = "flop";
      this.deck.pop();
      this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
      this.log(`Flop: ${this.communityCards.join(" ")}`);
      return;
    }

    if (this.street === "flop") {
      this.street = "turn";
      this.deck.pop();
      this.communityCards.push(this.deck.pop());
      this.log(`Turn: ${this.communityCards.join(" ")}`);
      return;
    }

    this.street = "river";
    this.deck.pop();
    this.communityCards.push(this.deck.pop());
    this.log(`River: ${this.communityCards.join(" ")}`);
  }

  finishByFold() {
    const winnerIndex = this.players.findIndex((player) => player.inHand && !player.folded);
    const winner = this.players[winnerIndex];
    const pot = this.getPot();
    winner.chips += pot;
    this.winners = [{ uid: winner.uid, name: winner.name, amount: pot }];
    this.handEnded = true;
    this.street = "showdown";
    this.lastHandSummary = this.buildHandSummary("fold");
    this.log(`${winner.name} wins ${pot} (everyone folded)`);
  }

  finishByShowdown() {
    this.street = "showdown";
    this.handEnded = true;

    const contenders = this.players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => player.inHand && !player.folded);

    const scores = new Map();
    for (const { player, index } of contenders) {
      scores.set(index, evaluateBestFiveOfSeven([...player.holeCards, ...this.communityCards]));
    }

    this.showdownResults = contenders.map(({ player, index }) => ({
      uid: player.uid,
      name: player.name,
      cards: player.holeCards.slice(),
      handName: scores.get(index).score.name,
      score: scores.get(index).score.value,
      bestFive: scores.get(index).cards.slice(),
    }));

    this.winners = this.distributeSidePots(scores);
    this.lastHandSummary = this.buildHandSummary("showdown");
    for (const winner of this.winners) {
      this.log(`${winner.name} wins ${winner.amount}`);
    }
  }

  buildHandSummary(reason) {
    const movements = this.players.map((player) => {
      const startChips = this.handStartChips.get(player.uid) ?? player.chips;
      const delta = player.chips - startChips;
      return {
        uid: player.uid,
        name: player.name,
        startChips,
        endChips: player.chips,
        delta,
      };
    });

    const movementMap = new Map(movements.map((entry) => [entry.uid, entry]));
    const winners = this.winners.map((winner) => ({
      ...winner,
      netDelta: movementMap.get(winner.uid)?.delta ?? 0,
    }));

    return {
      handNumber: this.handNumber,
      reason,
      pot: this.getPot(),
      winners,
      chipMovements: movements.sort((a, b) => b.delta - a.delta),
    };
  }

  distributeSidePots(scores) {
    const payouts = new Map();
    const levels = [...new Set(this.players.map((player) => player.committed).filter((value) => value > 0))].sort((a, b) => a - b);

    let previous = 0;
    for (const level of levels) {
      const contributors = this.players
        .map((player, index) => ({ player, index }))
        .filter(({ player }) => player.committed >= level);
      const amount = (level - previous) * contributors.length;
      previous = level;

      const eligible = contributors.filter(({ player }) => player.inHand && !player.folded);
      if (amount <= 0 || eligible.length === 0) {
        continue;
      }

      let bestScore = null;
      for (const { index } of eligible) {
        const score = scores.get(index).score;
        if (!bestScore || compareHands(score, bestScore) > 0) {
          bestScore = score;
        }
      }

      const winners = eligible.filter(({ index }) => compareHands(scores.get(index).score, bestScore) === 0);
      const share = Math.floor(amount / winners.length);
      let odd = amount % winners.length;

      for (const { index } of winners) {
        this.players[index].chips += share;
        payouts.set(index, (payouts.get(index) || 0) + share);
      }

      if (odd > 0) {
        for (const index of this.orderClockwiseFromDealer(winners.map(({ index: i }) => i))) {
          if (odd === 0) {
            break;
          }
          this.players[index].chips += 1;
          payouts.set(index, (payouts.get(index) || 0) + 1);
          odd -= 1;
        }
      }
    }

    return [...payouts.entries()].map(([index, amount]) => ({
      uid: this.players[index].uid,
      name: this.players[index].name,
      amount,
    }));
  }

  orderClockwiseFromDealer(indices) {
    const allowed = new Set(indices);
    const ordered = [];
    for (let offset = 1; offset <= this.players.length; offset += 1) {
      const idx = (this.dealerIndex + offset) % this.players.length;
      if (allowed.has(idx)) {
        ordered.push(idx);
      }
    }
    return ordered;
  }
}
