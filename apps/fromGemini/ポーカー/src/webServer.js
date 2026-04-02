import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import { PokerEngine } from "./game/engine.js";
import { evaluateBestFiveOfSeven } from "./game/handEvaluator.js";

const rootDir = resolve(process.cwd());
const publicFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/src/web/ui.js", "src/web/ui.js"],
  ["/src/web/styles.css", "src/web/styles.css"],
]);

const mimeByExt = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const BOT_THINK_MIN_MS = 1200;
const BOT_THINK_MAX_MS = 2800;

let game = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomThinkDelayMs() {
  return BOT_THINK_MIN_MS + Math.floor(Math.random() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS + 1));
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

function hasAtLeastTwoFundedPlayers(engine) {
  return engine.players.filter((player) => player.chips > 0).length >= 2;
}

async function advanceBotsUntilHuman(engine, humanUid) {
  while (engine.hasActiveHand()) {
    const snapshot = engine.getSnapshot();
    const actor = snapshot.actingIndex == null ? null : engine.players[snapshot.actingIndex];
    if (!actor || actor.uid === humanUid) {
      return;
    }

    await sleep(randomThinkDelayMs());

    const move = chooseBotAction(engine, actor, snapshot);
    try {
      engine.act(actor.uid, move.action, move.amount);
    } catch {
      engine.act(actor.uid, snapshot.currentBet > actor.streetBet ? "call" : "check", 0);
    }
  }
}

function shouldBotsAct(gameState) {
  if (!gameState || !gameState.engine.hasActiveHand()) {
    return false;
  }

  const snapshot = gameState.engine.getSnapshot();
  const actor = snapshot.actingIndex == null ? null : gameState.engine.players[snapshot.actingIndex];
  return !!actor && actor.uid !== gameState.humanUid;
}

function scheduleBotAdvance(gameState) {
  if (!gameState || gameState.botAdvanceRunning) {
    return;
  }
  if (!shouldBotsAct(gameState)) {
    return;
  }

  gameState.botAdvanceRunning = true;
  void (async () => {
    try {
      await advanceBotsUntilHuman(gameState.engine, gameState.humanUid);
    } finally {
      gameState.botAdvanceRunning = false;
      if (shouldBotsAct(gameState)) {
        scheduleBotAdvance(gameState);
      }
    }
  })();
}

function makeState() {
  if (!game) {
    return { ready: false };
  }

  const snapshot = game.engine.getSnapshot();
  const human = snapshot.players.find((player) => player.uid === game.humanUid);
  const toCall = human ? Math.max(0, snapshot.currentBet - human.streetBet) : 0;

  return {
    ready: true,
    snapshot,
    humanCards: game.engine.getPlayerByUid(game.humanUid)?.holeCards ?? [],
    availableActions: game.engine.getAvailableActions(game.humanUid),
    toCall,
    botThinking: game.botAdvanceRunning || shouldBotsAct(game),
  };
}

async function readJson(req) {
  let buf = "";
  for await (const chunk of req) {
    buf += chunk;
  }
  return buf ? JSON.parse(buf) : {};
}

function writeJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

async function handleApi(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.url === "/api/state" && req.method === "GET") {
    writeJson(res, 200, makeState());
    return;
  }

  if (req.url === "/api/new-game" && req.method === "POST") {
    const body = await readJson(req);
    const playerName = String(body.playerName || "You").slice(0, 16) || "You";
    const bots = Math.max(1, Math.min(4, Number.parseInt(String(body.bots || "2"), 10) || 2));

    const engine = new PokerEngine({ smallBlind: 5, bigBlind: 10 });
    const humanUid = "human-1";

    engine.addPlayer(humanUid, playerName, 1000, { isHuman: true });
    for (let i = 1; i <= bots; i += 1) {
      engine.addPlayer(`bot-${i}`, `Bot ${i}`, 1000);
    }

    engine.startHand();

    game = { engine, humanUid, botAdvanceRunning: false };
    scheduleBotAdvance(game);
    writeJson(res, 200, makeState());
    return;
  }

  if (req.url === "/api/action" && req.method === "POST") {
    if (!game) {
      writeJson(res, 400, { error: "game not ready" });
      return;
    }

    const body = await readJson(req);
    const action = String(body.action || "");
    const amount = Number.parseInt(String(body.amount || 0), 10) || 0;

    if (game.botAdvanceRunning || shouldBotsAct(game)) {
      writeJson(res, 409, { error: "bot turn in progress" });
      return;
    }

    game.engine.act(game.humanUid, action, amount);
    scheduleBotAdvance(game);
    writeJson(res, 200, makeState());
    return;
  }

  if (req.url === "/api/next-hand" && req.method === "POST") {
    if (!game || !hasAtLeastTwoFundedPlayers(game.engine)) {
      writeJson(res, 400, { error: "next hand unavailable" });
      return;
    }

    game.engine.startHand();
    scheduleBotAdvance(game);
    writeJson(res, 200, makeState());
    return;
  }

  writeJson(res, 404, { error: "not found" });
}

async function handleStatic(req, res) {
  const pathname = req.url || "/";
  const file = publicFiles.get(pathname);
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("not found");
    return;
  }

  const filePath = join(rootDir, file);
  const data = await readFile(filePath);
  const mime = mimeByExt[extname(filePath)] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": mime });
  res.end(data);
}

const server = createServer(async (req, res) => {
  try {
    if ((req.url || "").startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }

    await handleStatic(req, res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

const port = Number.parseInt(process.env.PORT || "4173", 10);
server.listen(port, () => {
  console.log(`Lite UI server running: http://localhost:${port}`);
});
