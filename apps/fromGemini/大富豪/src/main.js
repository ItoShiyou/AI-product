import { app } from "./firebase.js";

const SUITS = ["S", "H", "D", "C"];
const SUIT_LABEL = { S: "スペード", H: "ハート", D: "ダイヤ", C: "クラブ" };
const RANKS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const RANK_LABEL = {
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
  15: "2",
  16: "ジョーカー"
};
const CPU_DELAY_MS = 700;

const state = {
  screen: "home",
  game: null,
  firebaseName: app.name
};

const appRoot = document.getElementById("app");

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createDeck() {
  const cards = [];
  let id = 1;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: id++, suit, rank });
    }
  }
  cards.push({ id: id++, suit: "J", rank: 16 });
  return cards;
}

function isJoker(card) {
  return card.rank === 16;
}

function rankToSortValue(rank, revolution) {
  if (rank === 16) {
    return 999;
  }
  return revolution ? 20 - rank : rank;
}

function sortHand(hand, revolution) {
  return [...hand].sort((a, b) => {
    const rDiff = rankToSortValue(a.rank, revolution) - rankToSortValue(b.rank, revolution);
    if (rDiff !== 0) {
      return rDiff;
    }
    return a.suit.localeCompare(b.suit);
  });
}

function cardLabel(card) {
  if (isJoker(card)) {
    return "ジョーカー";
  }
  return `${SUIT_LABEL[card.suit]} ${RANK_LABEL[card.rank]}`;
}

function moveLabel(move) {
  const countText = move.cards.length > 1 ? `${move.cards.length}枚` : "単騎";
  return `${countText} ${RANK_LABEL[move.rank]}`;
}

function isMoveStronger(moveRank, tableRank, revolution) {
  if (moveRank === 16) {
    return tableRank !== 16;
  }
  if (tableRank === 16) {
    return false;
  }
  return revolution ? moveRank < tableRank : moveRank > tableRank;
}

function roleLabel(place, total) {
  if (place === 1) {
    return "大富豪";
  }
  if (place === 2) {
    return "富豪";
  }
  if (place === total - 1) {
    return "貧民";
  }
  if (place === total) {
    return "大貧民";
  }
  return "平民";
}

function assignRolesByPreviousResult(playerCount, previousResult) {
  const roleByPlayerIndex = {};
  if (!previousResult || previousResult.length !== playerCount) {
    return roleByPlayerIndex;
  }
  previousResult.forEach((entry, index) => {
    roleByPlayerIndex[entry.playerIndex] = roleLabel(index + 1, playerCount);
  });
  return roleByPlayerIndex;
}

function chooseCardsForExchange(hand, count, revolution, strongest) {
  const sorted = sortHand(hand, revolution);
  return strongest ? sorted.slice(-count) : sorted.slice(0, count);
}

function removeCardsFromHand(hand, cardsToRemove) {
  const ids = new Set(cardsToRemove.map((card) => card.id));
  return hand.filter((card) => !ids.has(card.id));
}

function applyCardExchange(players, previousResult) {
  const roles = assignRolesByPreviousResult(players.length, previousResult);
  const byRole = {
    大富豪: players.find((p) => roles[p.id] === "大富豪"),
    富豪: players.find((p) => roles[p.id] === "富豪"),
    貧民: players.find((p) => roles[p.id] === "貧民"),
    大貧民: players.find((p) => roles[p.id] === "大貧民")
  };

  const trades = [];

  if (byRole.大富豪 && byRole.大貧民) {
    trades.push({
      fromPoor: byRole.大貧民,
      fromRich: byRole.大富豪,
      count: 2
    });
  }
  if (byRole.富豪 && byRole.貧民) {
    trades.push({
      fromPoor: byRole.貧民,
      fromRich: byRole.富豪,
      count: 1
    });
  }

  for (const trade of trades) {
    const poorGive = chooseCardsForExchange(trade.fromPoor.hand, trade.count, false, true);
    const richGive = chooseCardsForExchange(trade.fromRich.hand, trade.count, false, false);
    trade.fromPoor.hand = removeCardsFromHand(trade.fromPoor.hand, poorGive).concat(richGive);
    trade.fromRich.hand = removeCardsFromHand(trade.fromRich.hand, richGive).concat(poorGive);
  }
}

function createMovesFromHand(hand) {
  const grouped = new Map();
  for (const card of hand) {
    if (isJoker(card)) {
      if (!grouped.has(16)) {
        grouped.set(16, []);
      }
      grouped.get(16).push(card);
      continue;
    }
    if (!grouped.has(card.rank)) {
      grouped.set(card.rank, []);
    }
    grouped.get(card.rank).push(card);
  }

  const moves = [];
  for (const [rank, cards] of grouped.entries()) {
    if (rank === 16) {
      moves.push({ cards: [cards[0]], rank: 16, count: 1 });
      continue;
    }
    const max = Math.min(4, cards.length);
    for (let count = 1; count <= max; count += 1) {
      moves.push({ cards: cards.slice(0, count), rank, count });
    }
  }
  return moves;
}

function getValidMoves(hand, table, revolution) {
  const allMoves = createMovesFromHand(hand);
  const filtered = allMoves.filter((move) => {
    if (!table) {
      return true;
    }
    if (move.count !== table.count) {
      return false;
    }
    return isMoveStronger(move.rank, table.rank, revolution);
  });

  return filtered.sort((a, b) => {
    if (a.count !== b.count) {
      return a.count - b.count;
    }
    return rankToSortValue(a.rank, revolution) - rankToSortValue(b.rank, revolution);
  });
}

function nextAlivePlayerIndex(game, startIndex) {
  const total = game.players.length;
  let index = startIndex;
  for (let i = 0; i < total; i += 1) {
    index = (index + 1) % total;
    if (!game.finishedPlayerIndexes.includes(index)) {
      return index;
    }
  }
  return -1;
}

function dealPlayers(previousResult) {
  const deck = shuffle(createDeck());
  const players = [
    { id: 0, name: "あなた", hand: [] },
    { id: 1, name: "CPU1", hand: [] },
    { id: 2, name: "CPU2", hand: [] },
    { id: 3, name: "CPU3", hand: [] }
  ];

  deck.forEach((card, index) => {
    players[index % players.length].hand.push(card);
  });

  if (previousResult && previousResult.length === players.length) {
    applyCardExchange(players, previousResult);
  }

  players.forEach((player) => {
    player.hand = sortHand(player.hand, false);
  });

  return players;
}

function startSingleGame(previousResult = null) {
  state.game = {
    players: dealPlayers(previousResult),
    currentPlayerIndex: 0,
    table: null,
    lastMovePlayerIndex: null,
    consecutivePasses: 0,
    revolution: false,
    finishedPlayerIndexes: [],
    result: null,
    previousResult,
    waitingCpuTurn: false,
    message: "ゲーム開始。あなたからスタートします。"
  };
  state.screen = "single";
  render();
  runCpuIfNeeded();
}

function finishPlayerIfNeeded(playerIndex) {
  const game = state.game;
  const player = game.players[playerIndex];
  if (player.hand.length === 0 && !game.finishedPlayerIndexes.includes(playerIndex)) {
    game.finishedPlayerIndexes.push(playerIndex);
    game.message = `${player.name} が手札を出し切りました。`;
  }

  if (game.finishedPlayerIndexes.length === game.players.length - 1) {
    for (let i = 0; i < game.players.length; i += 1) {
      if (!game.finishedPlayerIndexes.includes(i)) {
        game.finishedPlayerIndexes.push(i);
      }
    }
    game.result = game.finishedPlayerIndexes.map((idx) => ({
      playerIndex: idx,
      name: game.players[idx].name
    }));
    game.message = "ゲーム終了。順位が確定しました。";
  }
}

function clearTableAndSetStarter(playerIndex) {
  const game = state.game;
  game.table = null;
  game.lastMovePlayerIndex = null;
  game.consecutivePasses = 0;
  if (!game.finishedPlayerIndexes.includes(playerIndex)) {
    game.currentPlayerIndex = playerIndex;
    return;
  }
  game.currentPlayerIndex = nextAlivePlayerIndex(game, playerIndex);
}

function playMove(playerIndex, move) {
  const game = state.game;
  const player = game.players[playerIndex];

  player.hand = removeCardsFromHand(player.hand, move.cards);
  game.table = { rank: move.rank, count: move.count, cards: move.cards };
  game.lastMovePlayerIndex = playerIndex;
  game.consecutivePasses = 0;

  if (move.count === 4 && move.rank !== 16) {
    game.revolution = !game.revolution;
    game.message = `革命発生。${game.revolution ? "強さが逆転" : "通常順に復帰"}しました。`;
  } else {
    game.message = `${player.name} が ${moveLabel(move)} を出しました。`;
  }

  player.hand = sortHand(player.hand, game.revolution);
  finishPlayerIfNeeded(playerIndex);

  if (game.result) {
    render();
    return;
  }

  game.currentPlayerIndex = nextAlivePlayerIndex(game, playerIndex);
  render();
  runCpuIfNeeded();
}

function passTurn(playerIndex) {
  const game = state.game;
  const player = game.players[playerIndex];
  game.consecutivePasses += 1;
  game.message = `${player.name} はパスしました。`;

  const aliveCount = game.players.length - game.finishedPlayerIndexes.length;
  if (game.consecutivePasses >= aliveCount - 1 && game.lastMovePlayerIndex !== null) {
    const starter = game.lastMovePlayerIndex;
    clearTableAndSetStarter(starter);
    game.message = "全員パスで場が流れました。";
    render();
    runCpuIfNeeded();
    return;
  }

  game.currentPlayerIndex = nextAlivePlayerIndex(game, playerIndex);
  render();
  runCpuIfNeeded();
}

function chooseCpuMove(validMoves, game) {
  if (validMoves.length === 0) {
    return null;
  }
  if (!game.table) {
    return validMoves[0];
  }
  return validMoves[0];
}

function runCpuIfNeeded() {
  const game = state.game;
  if (!game || game.result || game.waitingCpuTurn) {
    return;
  }

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id === 0) {
    return;
  }

  game.waitingCpuTurn = true;
  window.setTimeout(() => {
    const liveGame = state.game;
    if (!liveGame || liveGame.result) {
      return;
    }

    const playerIndex = liveGame.currentPlayerIndex;
    const player = liveGame.players[playerIndex];
    if (!player || player.id === 0) {
      liveGame.waitingCpuTurn = false;
      render();
      return;
    }

    const validMoves = getValidMoves(player.hand, liveGame.table, liveGame.revolution);
    const move = chooseCpuMove(validMoves, liveGame);
    liveGame.waitingCpuTurn = false;
    if (move) {
      playMove(playerIndex, move);
    } else {
      passTurn(playerIndex);
    }
  }, CPU_DELAY_MS);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHome() {
  appRoot.innerHTML = `
    <section class="panel">
      <h1 class="title">大富豪</h1>
      <p class="subtitle">Firebase: ${escapeHtml(state.firebaseName)}</p>
      <div class="actions row">
        <button data-action="start-single">ひとりで対戦</button>
        <button class="secondary" data-action="coming-soon-multi">みんなで対戦</button>
        <button class="secondary" data-action="coming-soon-settings">設定</button>
      </div>
      <p class="subtitle">ひとりで対戦は実装済み。みんなで対戦と設定は次段階で実装します。</p>
    </section>
  `;
}

function renderResult(game) {
  return `
    <section class="panel mt">
      <h3>最終順位</h3>
      <div class="grid mt">
        ${game.result
          .map(
            (entry, index) => `
              <div class="stat">
                <p>${index + 1}位 ${escapeHtml(entry.name)}</p>
                <p>${roleLabel(index + 1, game.result.length)}</p>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="actions row mt">
        <button data-action="continue-game">このまま続ける</button>
        <button class="secondary" data-action="go-home">ホームに戻る</button>
      </div>
    </section>
  `;
}

function renderSingle() {
  const game = state.game;
  const current = game.players[game.currentPlayerIndex];
  const me = game.players[0];
  const validMoves =
    game.result || game.currentPlayerIndex !== 0 ? [] : getValidMoves(me.hand, game.table, game.revolution);

  const cpuStats = game.players
    .filter((p) => p.id !== 0)
    .map(
      (p) => `
      <div class="stat">
        <p>${escapeHtml(p.name)}</p>
        <p>残り ${p.hand.length} 枚</p>
      </div>
    `
    )
    .join("");

  const tableText = game.table
    ? `${moveLabel({ cards: game.table.cards, rank: game.table.rank })}`
    : "場は空です";

  appRoot.innerHTML = `
    <section class="panel">
      <h2>ひとりで対戦</h2>
      <p class="subtitle">あなた vs CPU3人</p>
      <div class="grid mt">${cpuStats}</div>
      <div class="status">
        <p>手番: ${escapeHtml(current.name)}</p>
        <p>状態: ${game.revolution ? '<span class="badge warn">革命中</span>' : '<span class="badge ok">通常</span>'}</p>
        <p>メッセージ: ${escapeHtml(game.message)}</p>
      </div>
      <div class="table">
        <p>場のカード: ${escapeHtml(tableText)}</p>
      </div>
      <section class="mt">
        <h3>あなたの手札 (${me.hand.length}枚)</h3>
        <div class="cards">
          ${sortHand(me.hand, game.revolution)
            .map((card) => {
              const red = card.suit === "H" || card.suit === "D" ? "red" : "";
              return `<span class="card ${red}">${escapeHtml(cardLabel(card))}</span>`;
            })
            .join("")}
        </div>
      </section>
      <section class="mt">
        <h3>出せる手</h3>
        <div class="playable">
          ${validMoves
            .slice(0, 12)
            .map(
              (move, index) =>
                `<button data-action="play" data-move-index="${index}">${escapeHtml(moveLabel(move))}</button>`
            )
            .join("")}
        </div>
        ${
          validMoves.length > 12
            ? `<p class="subtitle">候補が多いため先頭12件を表示しています。</p>`
            : ""
        }
        <div class="actions row mt">
          <button class="danger" data-action="pass" ${game.table ? "" : "disabled"}>パス</button>
          <button class="secondary" data-action="go-home">ホームに戻る</button>
        </div>
      </section>
    </section>
    ${game.result ? renderResult(game) : ""}
  `;

  if (!game.result && game.currentPlayerIndex !== 0) {
    const cpuNotice = document.createElement("p");
    cpuNotice.className = "subtitle mt";
    cpuNotice.textContent = "CPU の手番です...";
    appRoot.querySelector(".panel")?.appendChild(cpuNotice);
  }

  if (!game.result && game.currentPlayerIndex === 0 && validMoves.length === 0 && game.table) {
    game.message = "出せる手がないためパスしてください。";
  }

  bindSingleEvents(validMoves);
}

function bindHomeEvents() {
  appRoot.querySelector('[data-action="start-single"]')?.addEventListener("click", () => {
    startSingleGame();
  });

  appRoot.querySelector('[data-action="coming-soon-multi"]')?.addEventListener("click", () => {
    window.alert("みんなで対戦はこれから実装します。現在はひとりで対戦を利用できます。");
  });

  appRoot.querySelector('[data-action="coming-soon-settings"]')?.addEventListener("click", () => {
    window.alert("設定画面はこれから実装します。");
  });
}

function bindSingleEvents(validMoves) {
  appRoot.querySelectorAll('[data-action="play"]').forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.getAttribute("data-move-index"));
      const move = validMoves[index];
      if (!move || state.game.currentPlayerIndex !== 0 || state.game.result) {
        return;
      }
      playMove(0, move);
    });
  });

  appRoot.querySelector('[data-action="pass"]')?.addEventListener("click", () => {
    if (state.game.currentPlayerIndex !== 0 || state.game.result || !state.game.table) {
      return;
    }
    passTurn(0);
  });

  appRoot.querySelector('[data-action="continue-game"]')?.addEventListener("click", () => {
    const previous = state.game?.result ? [...state.game.result] : null;
    startSingleGame(previous);
  });

  appRoot.querySelectorAll('[data-action="go-home"]').forEach((button) => {
    button.addEventListener("click", () => {
      state.screen = "home";
      state.game = null;
      render();
    });
  });
}

function render() {
  if (!appRoot) {
    return;
  }
  if (state.screen === "single" && state.game) {
    renderSingle();
    return;
  }
  renderHome();
  bindHomeEvents();
}

render();
