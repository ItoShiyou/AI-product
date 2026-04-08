import { app } from "./firebase.js";

const SUITS = ["S", "H", "D", "C"];
const SUIT_LABEL = { S: "スペード", H: "ハート", D: "ダイヤ", C: "クラブ" };
const SUIT_MARK = { S: "♠", H: "♥", D: "♦", C: "♣" };
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
  firebaseName: app.name,
  selectedCardIds: []
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

function cardShortLabel(card) {
  if (isJoker(card)) {
    return "JOKER";
  }
  return `${SUIT_MARK[card.suit]} ${RANK_LABEL[card.rank]}`;
}

function cardSuitClass(card) {
  if (isJoker(card)) {
    return "suit-joker";
  }
  if (card.suit === "H") {
    return "suit-hearts";
  }
  if (card.suit === "D") {
    return "suit-diamonds";
  }
  if (card.suit === "S") {
    return "suit-spades";
  }
  return "suit-clubs";
}

function cardRankText(card) {
  if (isJoker(card)) {
    return "J";
  }
  return RANK_LABEL[card.rank];
}

function renderCenterContent(card) {
  if (isJoker(card)) {
    return '<span class="center-face"><span class="face-label">JOKER</span></span>';
  }

  // J/Q/K は中央の追加描画を行わない。
  if (card.rank >= 11 && card.rank <= 13) {
    return "";
  }

  // 数札は中央にスートマークを枚数分表示する（3-10 と A と 2）。
  const pipCount =
    card.rank === 14 ? 1 : card.rank === 15 ? 2 : card.rank >= 3 && card.rank <= 10 ? card.rank : null;
  if (pipCount) {
    return `<span class="center-symbols pip-count-${pipCount}">${Array.from({ length: pipCount }, () => `<span class="pip">${SUIT_MARK[card.suit]}</span>`).join("")}</span>`;
  }

  return `<span class="center-face"><span class="face-label">${RANK_LABEL[card.rank]}</span><span class="face-suit">${SUIT_MARK[card.suit]}</span></span>`;
}

function renderCardShell(card, sizeClass = "") {
  const suitClass = cardSuitClass(card);
  const rank = cardRankText(card);
  const mark = isJoker(card) ? "★" : SUIT_MARK[card.suit];
  const corners = isJoker(card)
    ? ""
    : `<span class="corner top"><span class="rank">${rank}</span><span class="mark">${mark}</span></span>
          <span class="corner bottom"><span class="rank">${rank}</span><span class="mark">${mark}</span></span>`;

  return `
    <span class="card-shell ${sizeClass}">
      <span class="card-inner">
        <span class="card-front ${suitClass}">
          ${corners}
          ${renderCenterContent(card)}
        </span>
        <span class="card-back"></span>
      </span>
    </span>
  `;
}

function renderBackCards(count) {
  const visible = Math.min(count, 10);
  return Array.from({ length: visible }, () => '<span class="back-card"></span>').join("");
}

function renderOpponentSeat(player, seatLabel, currentPlayerIndex, finishedPlayerIndexes) {
  return `
    <div class="opponent-seat ${player.id === currentPlayerIndex ? "current" : ""} ${
      finishedPlayerIndexes.includes(player.id) ? "finished" : ""
    }">
      <div class="opponent-hand">
        <span class="opponent-count">${player.hand.length}</span>
        ${renderBackCards(player.hand.length)}
      </div>
      <div class="opponent-meta">
        <span class="opponent-name">${escapeHtml(seatLabel)} ${escapeHtml(player.name)}</span>
      </div>
    </div>
  `;
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
  const jokers = [];

  for (const card of hand) {
    if (isJoker(card)) {
      jokers.push(card);
      continue;
    }
    if (!grouped.has(card.rank)) {
      grouped.set(card.rank, []);
    }
    grouped.get(card.rank).push(card);
  }

  const jokerCount = jokers.length;
  const moves = [];

  if (jokerCount > 0) {
    moves.push({ cards: [jokers[0]], rank: 16, count: 1 });
  }

  for (const [rank, cards] of grouped.entries()) {
    const maxCount = Math.min(4, cards.length + jokerCount);
    for (let count = 1; count <= maxCount; count += 1) {
      const maxJokersUsed = Math.min(jokerCount, count - 1);
      for (let jokersUsed = 0; jokersUsed <= maxJokersUsed; jokersUsed += 1) {
        const nonJokerUsed = count - jokersUsed;
        if (nonJokerUsed < 1 || nonJokerUsed > cards.length) {
          continue;
        }
        const combinations = createCardCombinations(cards, nonJokerUsed);
        combinations.forEach((combo) => {
          const moveCards = combo.concat(jokers.slice(0, jokersUsed));
          moves.push({ cards: moveCards, rank, count });
        });
      }
    }
  }

  return dedupeMoves(moves);
}

function createCardCombinations(cards, pickCount) {
  if (pickCount === 0) {
    return [[]];
  }

  const result = [];
  const current = [];

  function dfs(start) {
    if (current.length === pickCount) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < cards.length; i += 1) {
      current.push(cards[i]);
      dfs(i + 1);
      current.pop();
    }
  }

  dfs(0);
  return result;
}

function moveKey(move) {
  const ids = move.cards
    .map((card) => card.id)
    .sort((a, b) => a - b)
    .join("-");
  return `${move.rank}:${move.count}:${ids}`;
}

function dedupeMoves(moves) {
  const map = new Map();
  moves.forEach((move) => {
    map.set(moveKey(move), move);
  });
  return [...map.values()];
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

function isSubsetCardIds(subsetCards, targetCards) {
  const targetIds = new Set(targetCards.map((card) => card.id));
  return subsetCards.every((card) => targetIds.has(card.id));
}

function findExactMoveByCards(cards, validMoves) {
  const cardIds = new Set(cards.map((card) => card.id));
  return (
    validMoves.find((move) => {
      if (move.cards.length !== cards.length) {
        return false;
      }
      return move.cards.every((card) => cardIds.has(card.id));
    }) || null
  );
}

function isSelectionPlayable(cards, validMoves) {
  if (cards.length === 0) {
    return false;
  }
  return Boolean(findExactMoveByCards(cards, validMoves));
}

function canCardBeSelected(card, selectedCards, validMoves) {
  const nextCards = [...selectedCards, card];
  return validMoves.some((move) => isSubsetCardIds(nextCards, move.cards));
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
  state.selectedCardIds = [];
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

  if (playerIndex === 0) {
    state.selectedCardIds = [];
  }

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
  if (playerIndex === 0) {
    state.selectedCardIds = [];
  }
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
  const me = game.players[0];
  const validMoves =
    game.result || game.currentPlayerIndex !== 0 ? [] : getValidMoves(me.hand, game.table, game.revolution);
  const sortedHand = sortHand(me.hand, game.revolution);
  const handCardIds = new Set(sortedHand.map((card) => card.id));
  state.selectedCardIds = state.selectedCardIds.filter((id) => handCardIds.has(id));
  if (game.currentPlayerIndex !== 0 || game.result) {
    state.selectedCardIds = [];
  }

  const selectedSet = new Set(state.selectedCardIds);
  const selectedCards = sortedHand.filter((card) => selectedSet.has(card.id));
  const selectedCardIdSet = new Set(selectedCards.map((card) => card.id));
  const canSubmit = isSelectionPlayable(selectedCards, validMoves);
  const canCancel = selectedCards.length > 0;

  const playerA = game.players.find((p) => p.id === 1);
  const playerB = game.players.find((p) => p.id === 2);
  const playerC = game.players.find((p) => p.id === 3);

  const tableText = game.table
    ? `${moveLabel({ cards: game.table.cards, rank: game.table.rank })}`
    : "場は空です";
  const tableCards = game.table
    ? game.table.cards
        .map((card) => `<span class="table-card">${renderCardShell(card, "table-size")}</span>`)
        .join("")
    : "";
  const lastPlayerName = game.lastMovePlayerIndex !== null ? game.players[game.lastMovePlayerIndex].name : "-";
  const messageChip = game.waitingCpuTurn ? "CPU 思考中" : game.currentPlayerIndex === 0 ? "あなたの手番" : "CPUの手番";

  appRoot.innerHTML = `
    <section class="game-shell table-layout">
      <div class="hud-row">
        <span class="hud-chip turn">${escapeHtml(messageChip)}</span>
        <span class="hud-chip state ${game.revolution ? "warn" : "ok"}">${game.revolution ? "革命" : "通常"}</span>
        <span class="hud-chip last">LAST: ${escapeHtml(lastPlayerName)}</span>
      </div>
      <div class="table-felt mt">
        <div class="seat-a">
          ${playerA ? renderOpponentSeat(playerA, "A", game.currentPlayerIndex, game.finishedPlayerIndexes) : ""}
        </div>
        <div class="seat-b">
          ${playerB ? renderOpponentSeat(playerB, "B", game.currentPlayerIndex, game.finishedPlayerIndexes) : ""}
        </div>
        <div class="seat-c">
          ${playerC ? renderOpponentSeat(playerC, "C", game.currentPlayerIndex, game.finishedPlayerIndexes) : ""}
        </div>
        <div class="center-pile">
          ${
            game.table
              ? `<div class="table arena">
                   <div class="table-head">
                     <p>${escapeHtml(tableText)}</p>
                   </div>
                   <div class="table-cards">${tableCards}</div>
                 </div>`
              : '<p class="table-empty-floating">場は空です</p>'
          }
        </div>
        <div class="seat-p">
          <div class="you-seat ${game.currentPlayerIndex === 0 ? "current" : ""}">
            <span class="you-seat-label">P</span>
            <span class="you-seat-count">${me.hand.length}</span>
          </div>
        </div>
      </div>
      <section class="bottom-dock">
        <div class="hand-zone">
          <div class="hand-head">
            <span class="you-label">YOU</span>
            <span class="you-count">${me.hand.length}</span>
          </div>
          <div class="cards player-cards">
            ${sortedHand
              .map((card) => {
                const selected = selectedCardIdSet.has(card.id) ? "selected" : "";
                const selectable = selectedCardIdSet.has(card.id) || canCardBeSelected(card, selectedCards, validMoves);
                return `<button type="button" class="card ${selected}" data-action="select-card" data-card-id="${card.id}" ${
                  selectable ? "" : "disabled"
                }>${renderCardShell(card, "player-size")}</button>`;
              })
              .join("")}
          </div>
        </div>
        <div class="controls-zone">
          <div class="actions row action-row compact">
            <button data-action="submit-selected" ${canSubmit ? "" : "disabled"}>出す</button>
            <button class="secondary" data-action="cancel-selection" ${canCancel ? "" : "disabled"}>キャンセル</button>
            <button class="danger" data-action="pass" ${game.table ? "" : "disabled"}>パス</button>
          </div>
          <p class="compact-message">${escapeHtml(game.message)}</p>
        </div>
      </section>
    </section>
    ${game.result ? renderResult(game) : ""}
  `;

  if (!game.result && game.currentPlayerIndex === 0 && validMoves.length === 0 && game.table) {
    game.message = "出せる手がないためパスしてください。";
  }

  bindSingleEvents();
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

function bindSingleEvents() {
  appRoot.querySelectorAll('[data-action="select-card"]').forEach((button) => {
    button.addEventListener("click", () => {
      const game = state.game;
      if (!game || game.currentPlayerIndex !== 0 || game.result) {
        return;
      }

      const cardId = Number(button.getAttribute("data-card-id"));
      const me = game.players[0];
      const validMoves = getValidMoves(me.hand, game.table, game.revolution);
      const sortedHand = sortHand(me.hand, game.revolution);
      const card = sortedHand.find((item) => item.id === cardId);
      if (!card) {
        return;
      }

      const selectedSet = new Set(state.selectedCardIds);
      if (selectedSet.has(cardId)) {
        selectedSet.delete(cardId);
        state.selectedCardIds = [...selectedSet];
        render();
        return;
      }

      const selectedCards = sortedHand.filter((item) => selectedSet.has(item.id));
      if (!canCardBeSelected(card, selectedCards, validMoves)) {
        return;
      }

      selectedSet.add(cardId);
      state.selectedCardIds = [...selectedSet];
      render();
    });
  });

  appRoot.querySelector('[data-action="submit-selected"]')?.addEventListener("click", () => {
    const game = state.game;
    if (!game || game.currentPlayerIndex !== 0 || game.result) {
      return;
    }

    const me = game.players[0];
    const sortedHand = sortHand(me.hand, game.revolution);
    const selectedSet = new Set(state.selectedCardIds);
    const selectedCards = sortedHand.filter((card) => selectedSet.has(card.id));
    const validMoves = getValidMoves(me.hand, game.table, game.revolution);

    const move = findExactMoveByCards(selectedCards, validMoves);
    if (!move) {
      return;
    }

    playMove(0, move);
  });

  appRoot.querySelector('[data-action="cancel-selection"]')?.addEventListener("click", () => {
    const game = state.game;
    if (!game || game.currentPlayerIndex !== 0 || game.result) {
      return;
    }
    state.selectedCardIds = [];
    render();
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
      state.selectedCardIds = [];
      render();
    });
  });
}

function render() {
  if (!appRoot) {
    return;
  }
  const gameMode = state.screen === "single" && state.game;
  document.body.classList.toggle("game-view", Boolean(gameMode));
  if (state.screen === "single" && state.game) {
    renderSingle();
    return;
  }
  renderHome();
  bindHomeEvents();
}

render();
