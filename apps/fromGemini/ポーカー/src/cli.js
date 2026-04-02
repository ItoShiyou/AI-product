import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { PokerEngine } from "./game/engine.js";
import { evaluateBestFiveOfSeven } from "./game/handEvaluator.js";

const SUIT_TO_SYMBOL = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

const BOT_THINK_MIN_MS = 1200;
const BOT_THINK_MAX_MS = 2800;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomThinkDelayMs() {
  return BOT_THINK_MIN_MS + Math.floor(Math.random() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS + 1));
}

function formatCard(card) {
  return `${card[0]}${SUIT_TO_SYMBOL[card[1]] ?? card[1]}`;
}

function formatCards(cards) {
  return cards.map(formatCard).join(" ");
}

function estimatePreflopStrength(holeCards) {
  const ranks = holeCards.map((card) => card[0]);
  const values = ranks.map((rank) => "23456789TJQKA".indexOf(rank) + 2).sort((a, b) => b - a);
  const suited = holeCards[0][1] === holeCards[1][1];
  const paired = values[0] === values[1];

  if (paired && values[0] >= 11) return 0.95;
  if (paired && values[0] >= 8) return 0.83;
  if (paired) return 0.72;
  if (values[0] >= 13 && values[1] >= 10 && suited) return 0.84;
  if (values[0] >= 13 && values[1] >= 10) return 0.75;
  if (suited && values[0] >= 11) return 0.68;
  if (values[0] >= 12 && values[1] >= 8) return 0.62;
  return 0.42;
}

function estimateStrength(holeCards, communityCards) {
  if (communityCards.length < 3) {
    return estimatePreflopStrength(holeCards);
  }

  if (communityCards.length < 5) {
    return estimatePreflopStrength(holeCards) + 0.05;
  }

  const result = evaluateBestFiveOfSeven([...holeCards, ...communityCards]);
  const rankToStrength = {
    1: 0.22,
    2: 0.35,
    3: 0.5,
    4: 0.65,
    5: 0.72,
    6: 0.82,
    7: 0.9,
    8: 0.96,
    9: 0.99,
  };

  return rankToStrength[result.score.rank] ?? 0.45;
}

function chooseBotAction(engine, player, snapshot) {
  const actions = engine.getAvailableActions(player.uid);
  const toCall = Math.max(0, snapshot.currentBet - snapshot.players.find((p) => p.uid === player.uid).streetBet);
  const strength = estimateStrength(player.holeCards, snapshot.communityCards);
  const canRaise = actions.includes("raise");

  if (toCall === 0) {
    if (canRaise && strength > 0.72 && Math.random() < 0.35) {
      const raiseBy = Math.max(snapshot.minRaise, Math.floor(snapshot.pot * 0.35), engine.bigBlind);
      return { action: "raise", amount: Math.min(raiseBy, player.chips) };
    }
    return { action: "check", amount: 0 };
  }

  const pressure = toCall / Math.max(1, snapshot.pot + toCall);
  if (strength < 0.45 && pressure > 0.25 && actions.includes("fold")) {
    return { action: "fold", amount: 0 };
  }

  if (canRaise && strength > 0.82 && Math.random() < 0.28) {
    const raiseBy = Math.max(snapshot.minRaise, Math.floor(snapshot.pot * 0.5), engine.bigBlind);
    return { action: "raise", amount: Math.min(raiseBy, player.chips) };
  }

  if (actions.includes("call")) {
    return { action: "call", amount: 0 };
  }

  return { action: "fold", amount: 0 };
}

function printSnapshot(engine, humanUid) {
  const snapshot = engine.getSnapshot();
  const human = engine.getPlayerByUid(humanUid);

  output.write("\n========================================\n");
  output.write(`Hand #${snapshot.handNumber} | Street: ${snapshot.street} | Pot: ${snapshot.pot}\n`);
  output.write(`Board: ${snapshot.communityCards.length ? formatCards(snapshot.communityCards) : "(none)"}\n`);
  output.write(`Your hand: ${formatCards(human.holeCards)}\n`);

  for (const player of engine.players) {
    const marker = player.uid === humanUid ? "(You)" : "";
    const state = !player.inHand ? "out" : player.folded ? "folded" : player.allIn ? "all-in" : "active";
    output.write(
      `${player.name}${marker} | chips=${player.chips} | committed=${player.committed} | bet=${player.streetBet} | ${state} ${player.lastAction ? `| ${player.lastAction}` : ""}\n`
    );
  }

  const actor = snapshot.actingIndex != null ? engine.players[snapshot.actingIndex] : null;
  if (actor) {
    output.write(`Turn: ${actor.name}\n`);
  }
  output.write("========================================\n");
}

async function askAction(rl, engine, humanUid) {
  while (true) {
    const snapshot = engine.getSnapshot();
    const human = engine.getPlayerByUid(humanUid);
    const toCall = Math.max(0, snapshot.currentBet - human.streetBet);
    const actions = engine.getAvailableActions(humanUid);

    output.write(`To call: ${toCall}, Min raise: ${snapshot.minRaise}\n`);
    const line = (await rl.question(`Action [${actions.join("/")}] > `)).trim().toLowerCase();

    if (!actions.includes(line)) {
      output.write("Invalid action.\n");
      continue;
    }

    if (line !== "raise") {
      return { action: line, amount: 0 };
    }

    const amountInput = await rl.question(`Raise by (>= ${snapshot.minRaise}) > `);
    const amount = Number.parseInt(amountInput.trim(), 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      output.write("Invalid raise amount.\n");
      continue;
    }

    return { action: "raise", amount };
  }
}

function printHandResult(engine) {
  const snapshot = engine.getSnapshot();
  output.write("\n----- Hand Result -----\n");

  if (snapshot.showdownResults.length > 0) {
    for (const result of snapshot.showdownResults) {
      output.write(
        `${result.name}: hole=${formatCards(result.cards)} | ${result.handName} | best=${formatCards(result.bestFive)}\n`
      );
    }
  }

  for (const winner of snapshot.winners) {
    output.write(`Winner: ${winner.name} +${winner.amount}\n`);
  }
}

function hasAtLeastTwoFundedPlayers(engine) {
  return engine.players.filter((player) => player.chips > 0).length >= 2;
}

async function run() {
  const rl = createInterface({ input, output });

  try {
    output.write("\nText Texas Hold'em (CLI)\n");
    const nameInput = await rl.question("Your name [You] > ");
    const name = nameInput.trim() || "You";

    const botsInput = await rl.question("Number of bots (1-5) [3] > ");
    const bots = Math.min(5, Math.max(1, Number.parseInt(botsInput.trim() || "3", 10) || 3));

    const engine = new PokerEngine({ smallBlind: 5, bigBlind: 10 });
    const humanUid = "human-1";

    engine.addPlayer(humanUid, name, 1000, { isHuman: true });
    for (let i = 1; i <= bots; i += 1) {
      engine.addPlayer(`bot-${i}`, `Bot ${i}`, 1000);
    }

    while (hasAtLeastTwoFundedPlayers(engine)) {
      if (engine.getPlayerByUid(humanUid).chips <= 0) {
        output.write("\nYou are out of chips. Game over.\n");
        break;
      }

      engine.startHand();

      while (engine.hasActiveHand()) {
        const snapshot = engine.getSnapshot();
        const actor = snapshot.actingIndex != null ? engine.players[snapshot.actingIndex] : null;
        if (!actor) {
          break;
        }

        if (actor.uid === humanUid) {
          printSnapshot(engine, humanUid);
          const { action, amount } = await askAction(rl, engine, humanUid);
          try {
            engine.act(humanUid, action, amount);
          } catch (error) {
            output.write(`${error.message}\n`);
          }
          continue;
        }

        output.write(`${actor.name} is thinking...\n`);
        await sleep(randomThinkDelayMs());

        const botMove = chooseBotAction(engine, actor, snapshot);
        try {
          engine.act(actor.uid, botMove.action, botMove.amount);
        } catch {
          engine.act(actor.uid, snapshot.currentBet > actor.streetBet ? "call" : "check", 0);
        }
      }

      printSnapshot(engine, humanUid);
      printHandResult(engine);

      if (!hasAtLeastTwoFundedPlayers(engine)) {
        break;
      }

      const answer = (await rl.question("Continue next hand? [Y/n] > ")).trim().toLowerCase();
      if (answer === "n" || answer === "no") {
        break;
      }
    }

    output.write("\n=== Final Chips ===\n");
    const ranking = engine.players.slice().sort((a, b) => b.chips - a.chips);
    for (const player of ranking) {
      output.write(`${player.name}: ${player.chips}\n`);
    }
  } finally {
    rl.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
