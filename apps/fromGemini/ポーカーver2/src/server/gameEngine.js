import { chooseBotAction } from "./bot.js";
import { createDeck, draw, shuffle } from "./cards.js";
import { compareHands, evaluateBest } from "./handEvaluator.js";

const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const MIN_RAISE = 20;
const STARTING_CHIPS = 1000;

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export class GameEngine {
  constructor() {
    this.players = [
      { id: "human", name: "あなた", isBot: false, chips: STARTING_CHIPS, folded: false, allIn: false, streetBet: 0, totalCommitted: 0, hasActed: false, holeCards: [], lastAction: "" },
      { id: "bot-1", name: "Bot MINT", isBot: true, chips: STARTING_CHIPS, folded: false, allIn: false, streetBet: 0, totalCommitted: 0, hasActed: false, holeCards: [], lastAction: "" },
      { id: "bot-2", name: "Bot PEACH", isBot: true, chips: STARTING_CHIPS, folded: false, allIn: false, streetBet: 0, totalCommitted: 0, hasActed: false, holeCards: [], lastAction: "" },
      { id: "bot-3", name: "Bot SKY", isBot: true, chips: STARTING_CHIPS, folded: false, allIn: false, streetBet: 0, totalCommitted: 0, hasActed: false, holeCards: [], lastAction: "" },
    ];

    this.dealerIndex = -1;
    this.handNumber = 0;
    this.stage = "idle";
    this.deck = [];
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.currentMinRaise = MIN_RAISE;
    this.currentPlayerIndex = null;
    this.logs = [];
    this.lastShowdown = [];
    this.lastPayout = [];
    this.lastSettlement = null;
    this.handStartChipsById = {};
  }

  setHumanProfile({ name, chips }) {
    const human = this.players.find((p) => p.id === "human");
    if (!human) return;
    if (typeof name === "string" && name.trim()) {
      human.name = name.trim().slice(0, 20);
    }
    if (Number.isFinite(chips)) {
      human.chips = Math.max(0, Math.floor(chips));
    }
  }

  setOpponentNames(names = []) {
    const botPlayers = this.players.filter((p) => p.isBot);
    for (let i = 0; i < botPlayers.length; i += 1) {
      const nextName = names[i];
      if (typeof nextName === "string" && nextName.trim()) {
        botPlayers[i].name = nextName.trim().slice(0, 20);
      }
    }
  }

  startNewHand() {
    const alive = this.players.filter((p) => p.chips > 0);
    if (alive.length < 2) {
      this.stage = "finished";
      this.log("ゲーム終了: 対戦継続に必要なプレイヤーが不足しています。");
      return;
    }

    this.handNumber += 1;
    this.stage = "preflop";
    this.deck = shuffle(createDeck());
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.currentMinRaise = MIN_RAISE;
    this.lastShowdown = [];
    this.lastPayout = [];
    this.lastSettlement = null;
    this.handStartChipsById = Object.fromEntries(this.players.map((p) => [p.id, p.chips]));

    for (const p of this.players) {
      p.folded = p.chips <= 0;
      p.allIn = false;
      p.streetBet = 0;
      p.totalCommitted = 0;
      p.hasActed = false;
      p.holeCards = [];
      p.lastAction = "";
      if (p.chips <= 0) p.folded = true;
    }

    this.dealerIndex = this.nextActiveIndex(this.dealerIndex);

    for (let i = 0; i < 2; i += 1) {
      for (let pi = 0; pi < this.players.length; pi += 1) {
        const idx = (this.dealerIndex + 1 + pi) % this.players.length;
        const p = this.players[idx];
        if (!p.folded) {
          p.holeCards.push(...draw(this.deck, 1));
        }
      }
    }

    const sbIndex = this.nextActiveIndex(this.dealerIndex);
    const bbIndex = this.nextActiveIndex(sbIndex);
    this.postBlind(sbIndex, SMALL_BLIND, "SB");
    this.postBlind(bbIndex, BIG_BLIND, "BB");

    this.currentBet = BIG_BLIND;
    this.currentMinRaise = BIG_BLIND;
    this.currentPlayerIndex = this.nextActiveIndex(bbIndex);
    this.log(`--- Hand ${this.handNumber} 開始 ---`);
    this.log(`${this.players[this.dealerIndex].name} がディーラーです。`);
  }

  postBlind(playerIndex, amount, label) {
    const player = this.players[playerIndex];
    const paid = Math.min(player.chips, amount);
    player.chips -= paid;
    player.streetBet += paid;
    player.totalCommitted += paid;
    this.pot += paid;
    if (player.chips === 0) player.allIn = true;
    player.lastAction = `${label} ${paid}`;
  }

  nextActiveIndex(fromIndex) {
    for (let step = 1; step <= this.players.length; step += 1) {
      const idx = (fromIndex + step + this.players.length) % this.players.length;
      if (this.players[idx].chips > 0) return idx;
    }
    return 0;
  }

  nextTurnIndex(fromIndex) {
    for (let step = 1; step <= this.players.length; step += 1) {
      const idx = (fromIndex + step) % this.players.length;
      const p = this.players[idx];
      if (!p.folded && !p.allIn && p.chips >= 0) {
        return idx;
      }
    }
    return null;
  }

  getCurrentPlayer() {
    if (this.currentPlayerIndex === null) return null;
    return this.players[this.currentPlayerIndex];
  }

  getToCall(player) {
    return Math.max(0, this.currentBet - player.streetBet);
  }

  getLegalActions(playerId) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || this.stage === "idle" || this.stage === "finished" || this.stage === "handOver") {
      return { canFold: false, canCheckCall: false, canRaise: false, toCall: 0, minRaise: MIN_RAISE };
    }

    const turn = this.getCurrentPlayer();
    if (!turn || turn.id !== playerId) {
      return { canFold: false, canCheckCall: false, canRaise: false, toCall: 0, minRaise: MIN_RAISE };
    }

    const toCall = this.getToCall(player);
    const canCheckCall = player.chips > 0 || toCall === 0;
    const canRaise = player.chips > toCall && player.chips >= toCall + this.currentMinRaise;

    return {
      canFold: toCall > 0,
      canCheckCall,
      canRaise,
      toCall,
      minRaise: this.currentMinRaise,
    };
  }

  applyAction(playerId, action, raiseAmount = this.currentMinRaise) {
    const player = this.players.find((p) => p.id === playerId);
    const current = this.getCurrentPlayer();
    if (!player || !current || current.id !== playerId) {
      throw new Error("現在このプレイヤーは行動できません");
    }

    const toCall = this.getToCall(player);

    if (action === "fold") {
      player.folded = true;
      player.hasActed = true;
      player.lastAction = "Fold";
      this.log(`${player.name}: Fold`);
    } else if (action === "check" || action === "call") {
      if (action === "check" && toCall > 0) {
        throw new Error("ベットがあるためCheckできません");
      }

      const paid = Math.min(player.chips, toCall);
      player.chips -= paid;
      player.streetBet += paid;
      player.totalCommitted += paid;
      this.pot += paid;
      if (player.chips === 0) player.allIn = true;
      player.hasActed = true;
      if (toCall === 0) {
        player.lastAction = "Check";
        this.log(`${player.name}: Check`);
      } else {
        player.lastAction = `Call ${paid}`;
        this.log(`${player.name}: Call ${paid}`);
      }
    } else if (action === "raise") {
      const requestedAdd = Math.max(0, raiseAmount);
      const totalPay = Math.min(player.chips, toCall + requestedAdd);
      const actualAdd = totalPay - toCall;
      const isAllIn = totalPay === player.chips;
      const isShortAllInRaise = isAllIn && actualAdd < this.currentMinRaise;

      if (actualAdd <= 0) {
        throw new Error("Raise額が不足しています");
      }

      if (actualAdd < this.currentMinRaise && !isShortAllInRaise) {
        throw new Error(`最低レイズは ${this.currentMinRaise} です`);
      }

      player.chips -= totalPay;
      player.streetBet += totalPay;
      player.totalCommitted += totalPay;
      this.pot += totalPay;
      if (player.chips === 0) player.allIn = true;

      this.currentBet = Math.max(this.currentBet, player.streetBet);

      if (!isShortAllInRaise) {
        this.currentMinRaise = Math.max(this.currentMinRaise, actualAdd);
        for (const p of this.players) {
          if (!p.folded && !p.allIn) p.hasActed = false;
        }
        player.lastAction = `Raise ${totalPay}`;
      } else {
        player.lastAction = `All-in ${totalPay}`;
      }

      player.hasActed = true;
      this.log(`${player.name}: ${player.lastAction}`);
    } else {
      throw new Error("不正なアクション");
    }

    if (this.countActivePlayers() <= 1) {
      this.finishByFold();
      return;
    }

    if (this.isBettingRoundComplete()) {
      this.advanceStage();
      return;
    }

    this.currentPlayerIndex = this.nextTurnIndex(this.currentPlayerIndex);
  }

  performBotTurn() {
    const player = this.getCurrentPlayer();
    if (!player || !player.isBot) return;

    const legal = this.getLegalActions(player.id);
    const decision = chooseBotAction({
      player,
      communityCards: this.communityCards,
      toCall: legal.toCall,
      minRaise: legal.minRaise,
      stage: this.stage,
    });

    if (decision.type === "fold" && !legal.canFold) {
      this.applyAction(player.id, "check");
      return;
    }

    if (decision.type === "raise" && !legal.canRaise) {
      this.applyAction(player.id, legal.toCall > 0 ? "call" : "check");
      return;
    }

    if (decision.type === "call") {
      this.applyAction(player.id, "call");
      return;
    }

    if (decision.type === "check") {
      this.applyAction(player.id, "check");
      return;
    }

    if (decision.type === "raise") {
      this.applyAction(player.id, "raise", decision.amount);
      return;
    }

    this.applyAction(player.id, legal.toCall > 0 ? "call" : "check");
  }

  countActivePlayers() {
    return this.players.filter((p) => !p.folded).length;
  }

  isBettingRoundComplete() {
    const contenders = this.players.filter((p) => !p.folded);
    const actionable = contenders.filter((p) => !p.allIn);
    if (actionable.length <= 1) return true;

    for (const p of actionable) {
      if (!p.hasActed) return false;
      if (p.streetBet !== this.currentBet) return false;
    }
    return true;
  }

  resetRoundState() {
    this.currentBet = 0;
    this.currentMinRaise = MIN_RAISE;
    for (const p of this.players) {
      p.streetBet = 0;
      p.hasActed = false;
      p.lastAction = "";
    }
  }

  advanceStage() {
    if (this.stage === "preflop") {
      this.stage = "flop";
      this.communityCards.push(...draw(this.deck, 3));
      this.log("Flop");
      this.resetRoundState();
    } else if (this.stage === "flop") {
      this.stage = "turn";
      this.communityCards.push(...draw(this.deck, 1));
      this.log("Turn");
      this.resetRoundState();
    } else if (this.stage === "turn") {
      this.stage = "river";
      this.communityCards.push(...draw(this.deck, 1));
      this.log("River");
      this.resetRoundState();
    } else if (this.stage === "river") {
      this.stage = "showdown";
      this.showdown();
      return;
    }

    this.currentPlayerIndex = this.nextTurnIndex(this.dealerIndex);
    if (this.currentPlayerIndex === null) {
      this.stage = "showdown";
      this.showdown();
    }
  }

  finishByFold() {
    const winner = this.players.find((p) => !p.folded);
    if (!winner) return;
    const potBeforeAward = this.pot;
    winner.chips += this.pot;
    this.log(`${winner.name} が ${this.pot} チップ獲得（他プレイヤーFold）`);
    this.lastPayout = [{ playerId: winner.id, amount: potBeforeAward }];
    const payoutById = new Map(this.players.map((p) => [p.id, p.id === winner.id ? potBeforeAward : 0]));
    this.lastSettlement = this.buildSettlement(payoutById);
    this.pot = 0;
    this.stage = "handOver";
    this.currentPlayerIndex = null;
  }

  showdown() {
    const alive = this.players.filter((p) => !p.folded);
    if (alive.length === 0) return;

    const handCardsById = new Map(
      alive.map((p) => [p.id, [...p.holeCards, ...this.communityCards]])
    );

    const payoutById = this.distributeSidePots(alive, handCardsById);
    for (const p of alive) {
      const amount = payoutById.get(p.id) ?? 0;
      if (amount > 0) {
        p.chips += amount;
      }
    }

    this.lastShowdown = alive.map((p) => ({
      playerId: p.id,
      hand: evaluateBest([...p.holeCards, ...this.communityCards]).label,
    }));

    this.lastPayout = [...payoutById.entries()].map(([playerId, amount]) => ({
      playerId,
      amount,
    }));
    this.lastSettlement = this.buildSettlement(payoutById);

    const winners = this.players
      .filter((p) => (payoutById.get(p.id) ?? 0) > 0)
      .map((p) => `${p.name} +${payoutById.get(p.id)}`);

    if (winners.length > 0) {
      this.log(`配当: ${winners.join(" / ")}`);
    }

    this.pot = 0;
    this.stage = "handOver";
    this.currentPlayerIndex = null;
  }

  distributeSidePots(alive, handCardsById) {
    const payoutById = new Map(this.players.map((p) => [p.id, 0]));
    const levels = [...new Set(this.players.map((p) => p.totalCommitted).filter((v) => v > 0))].sort(
      (a, b) => a - b
    );

    let prevLevel = 0;
    for (const level of levels) {
      const contributors = this.players.filter((p) => p.totalCommitted >= level);
      const sidePotAmount = (level - prevLevel) * contributors.length;
      prevLevel = level;

      const eligible = contributors.filter((p) => !p.folded && handCardsById.has(p.id));
      if (sidePotAmount <= 0 || eligible.length === 0) continue;

      let best = [eligible[0]];
      let bestCards = handCardsById.get(eligible[0].id);
      for (let i = 1; i < eligible.length; i += 1) {
        const challenger = eligible[i];
        const challengerCards = handCardsById.get(challenger.id);
        const cmp = compareHands(challengerCards, bestCards);
        if (cmp > 0) {
          best = [challenger];
          bestCards = challengerCards;
        } else if (cmp === 0) {
          best.push(challenger);
        }
      }

      const share = Math.floor(sidePotAmount / best.length);
      let residue = sidePotAmount - share * best.length;
      for (const winner of best) {
        payoutById.set(winner.id, (payoutById.get(winner.id) ?? 0) + share);
        if (residue > 0) {
          payoutById.set(winner.id, (payoutById.get(winner.id) ?? 0) + 1);
          residue -= 1;
        }
      }
    }

    return payoutById;
  }

  buildSettlement(payoutById) {
    const items = this.players.map((p) => {
      const paid = p.totalCommitted;
      const won = payoutById.get(p.id) ?? 0;
      const net = won - paid;
      const start = this.handStartChipsById[p.id] ?? p.chips;
      const end = p.chips;
      return {
        playerId: p.id,
        name: p.name,
        paid,
        won,
        net,
        start,
        end,
      };
    });

    return {
      handNumber: this.handNumber,
      items,
    };
  }

  log(message) {
    this.logs.unshift(message);
    this.logs = this.logs.slice(0, 40);
  }

  getState() {
    const showdownOpenSet = new Set(this.lastShowdown.map((s) => s.playerId));
    return deepCopy({
      handNumber: this.handNumber,
      stage: this.stage,
      pot: this.pot,
      dealerId: this.players[this.dealerIndex]?.id,
      currentPlayerId: this.getCurrentPlayer()?.id ?? null,
      players: this.players.map((p) => {
        const shouldReveal = !p.isBot || showdownOpenSet.has(p.id);
        return {
          id: p.id,
          name: p.name,
          isBot: p.isBot,
          chips: p.chips,
          folded: !!p.folded,
          allIn: !!p.allIn,
          currentBet: p.streetBet,
          totalCommitted: p.totalCommitted,
          lastAction: p.lastAction,
          holeCards: shouldReveal ? p.holeCards ?? [] : [],
        };
      }),
      communityCards: this.communityCards,
      logs: this.logs,
      lastShowdown: this.lastShowdown,
      lastPayout: this.lastPayout,
      lastSettlement: this.lastSettlement,
      blinds: {
        small: SMALL_BLIND,
        big: BIG_BLIND,
        minRaise: this.currentMinRaise,
      },
    });
  }
}
