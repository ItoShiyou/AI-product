import { isRedSuit, rankToLabel, suitToGlyph } from "./server/cards.js";
import { createGameApi } from "./data/gameApi.js";
import {
  getAccount,
  recordCharge,
  recordHandResult,
  setLastRoomId,
} from "./data/accountStore.js";
import { joinRoom, leaveRoom, subscribeRoom } from "./data/multiRoomMock.js";

const server = createGameApi("local");

const seatElementById = {
  "bot-1": document.getElementById("seat-bot-1"),
  "bot-2": document.getElementById("seat-bot-2"),
  "bot-3": document.getElementById("seat-bot-3"),
  human: document.getElementById("seat-human"),
};

const potValue = document.getElementById("potValue");
const communityCards = document.getElementById("communityCards");
const tableFelt = document.querySelector(".table-felt");
const potBox = document.querySelector(".pot-box");
const statusText = document.getElementById("statusText");
const logList = document.getElementById("logList");
const topbarSub = document.getElementById("topbarSub");
const homePanel = document.getElementById("homePanel");
const gamePanel = document.getElementById("gamePanel");
const controlPanel = document.getElementById("controlPanel");
const resultStrip = document.getElementById("resultStrip");
const raiseAmountInput = document.getElementById("raiseAmountInput");

const startSingleBtn = document.getElementById("startSingleBtn");
const startMultiBtn = document.getElementById("startMultiBtn");
const backHomeBtn = document.getElementById("backHomeBtn");

const resultModal = document.getElementById("resultModal");
const resultTitle = document.getElementById("resultTitle");
const resultTableBody = document.getElementById("resultTableBody");
const closeResultBtn = document.getElementById("closeResultBtn");

const rulesModal = document.getElementById("rulesModal");
const openRulesBtn = document.getElementById("openRulesBtn");
const closeRulesBtn = document.getElementById("closeRulesBtn");

const multiLobbyModal = document.getElementById("multiLobbyModal");
const roomIdInput = document.getElementById("roomIdInput");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const leaveRoomBtn = document.getElementById("leaveRoomBtn");
const lobbyStatus = document.getElementById("lobbyStatus");
const lobbyMemberList = document.getElementById("lobbyMemberList");
const startFromLobbyBtn = document.getElementById("startFromLobbyBtn");
const closeLobbyBtn = document.getElementById("closeLobbyBtn");

const accountIdText = document.getElementById("accountIdText");
const accountNameText = document.getElementById("accountNameText");
const accountCoinsText = document.getElementById("accountCoinsText");
const accountWinsText = document.getElementById("accountWinsText");
const chargeBtn = document.getElementById("chargeBtn");

const newHandBtn = document.getElementById("newHandBtn");
const foldBtn = document.getElementById("foldBtn");
const checkCallBtn = document.getElementById("checkCallBtn");
const raiseBtn = document.getElementById("raiseBtn");

let working = false;
let inGame = false;
let currentState = server.getState();
let previousState = null;
let shownResultHandNumber = 0;
let recordedHandNumber = 0;
let currentAccount = getAccount();
let roomSubscription = null;
let currentRoom = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stageLabel(stage) {
  if (stage === "idle") return "待機中";
  if (stage === "preflop") return "プリフロップ";
  if (stage === "flop") return "フロップ";
  if (stage === "turn") return "ターン";
  if (stage === "river") return "リバー";
  if (stage === "showdown") return "ショーダウン";
  if (stage === "handOver") return "ハンド終了";
  if (stage === "finished") return "ゲーム終了";
  return stage;
}

function cardHTML(card, classes = "") {
  if (!card || card.hidden) {
    return `<div class="card back ${classes}">?</div>`;
  }

  const suit = suitToGlyph(card.suit);
  const rank = rankToLabel(card.rank);
  const colorClass = isRedSuit(card.suit) ? "red" : "black";
  return `<div class="card front ${colorClass} ${classes}">${rank}${suit}</div>`;
}

function cardKey(card) {
  if (!card || card.hidden) return "hidden";
  return `${card.rank}${card.suit}`;
}

function triggerChipFlight(playerId, amount) {
  if (!tableFelt || !potBox) return;
  const fromEl = seatElementById[playerId];
  if (!fromEl) return;

  const feltRect = tableFelt.getBoundingClientRect();
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = potBox.getBoundingClientRect();

  const startX = fromRect.left + fromRect.width / 2 - feltRect.left;
  const startY = fromRect.top + fromRect.height / 2 - feltRect.top;
  const endX = toRect.left + toRect.width / 2 - feltRect.left;
  const endY = toRect.top + toRect.height / 2 - feltRect.top;

  const chip = document.createElement("div");
  chip.className = "chip-flight";
  chip.style.left = `${startX}px`;
  chip.style.top = `${startY}px`;
  chip.style.setProperty("--chip-x", `${endX - startX}px`);
  chip.style.setProperty("--chip-y", `${endY - startY}px`);
  chip.textContent = amount > 0 ? `+${amount}` : "";

  tableFelt.appendChild(chip);
  chip.addEventListener("animationend", () => chip.remove(), { once: true });
}

function animateBetMovements(prev, next) {
  if (!prev || !next) return;
  const prevById = new Map(prev.players.map((p) => [p.id, p]));

  for (const p of next.players) {
    const before = prevById.get(p.id);
    if (!before) continue;
    const diff = (p.currentBet || 0) - (before.currentBet || 0);
    if (diff > 0) {
      triggerChipFlight(p.id, diff);
    }
  }
}

function refreshAccount() {
  currentAccount = getAccount();
}

function renderAccount() {
  refreshAccount();
  accountIdText.textContent = currentAccount.accountId;
  accountNameText.textContent = currentAccount.displayName;
  accountCoinsText.textContent = String(currentAccount.coins);
  accountWinsText.textContent = `${currentAccount.stats.wins} / ${currentAccount.stats.totalHands}`;
}

function applyAccountToEngine() {
  server.configureHumanProfile({
    name: currentAccount.displayName,
    chips: currentAccount.coins,
  });
}

function renderPlayer(player, state) {
  const element = seatElementById[player.id];
  if (!element) return;

  const badges = [];
  if (player.id === state.dealerId) badges.push('<span class="badge">Dealer</span>');
  if (player.currentBet > 0) badges.push(`<span class="badge bet">Bet ${player.currentBet}</span>`);
  if (player.lastAction) badges.push(`<span class="badge">${player.lastAction}</span>`);

  const showdown = state.lastShowdown.find((s) => s.playerId === player.id);
  if (showdown) badges.push(`<span class="badge">${showdown.hand}</span>`);

  const isBotCardsHidden =
    player.isBot && player.holeCards.length > 0 && player.holeCards.every((c) => !c || c.hidden);
  const prevPlayer = previousState?.players.find((x) => x.id === player.id);
  const holeCardsHtml = isBotCardsHidden
    ? ""
    : player.holeCards
        .map((c, idx) => {
          const before = prevPlayer?.holeCards?.[idx];
          const isNew = cardKey(before) !== cardKey(c);
          const classes = isNew ? "deal-motion" : "";
          return cardHTML(c, classes);
        })
        .join("");

  element.innerHTML = `
    <div class="seat-head">
      <span class="name">${player.name}</span>
      <span class="chips">${player.chips} chips</span>
    </div>
    <div class="badges">${badges.join("")}</div>
    <div class="hole-cards">
      ${holeCardsHtml}
    </div>
  `;

  element.classList.toggle("is-turn", state.currentPlayerId === player.id);
  element.classList.toggle("is-folded", player.folded);
}

function renderCommunity(state) {
  const prevCards = previousState?.communityCards ?? [];
  const cards = [...state.communityCards];
  while (cards.length < 5) cards.push({ hidden: true });
  communityCards.innerHTML = cards
    .map((c, idx) => {
      const before = prevCards[idx];
      const isNew = cardKey(before) !== cardKey(c);
      const flip = !c.hidden && (!before || before.hidden);
      const classes = `${isNew ? "deal-motion" : ""} ${flip ? "flip-motion" : ""}`.trim();
      return cardHTML(c, classes);
    })
    .join("");
}

function renderLogs(state) {
  logList.innerHTML = state.logs.map((log) => `<li>${log}</li>`).join("");
}

function renderStatus(state) {
  if (state.stage === "idle") {
    statusText.textContent = "新しいハンドを開始してください。";
    return;
  }

  if (state.stage === "handOver") {
    statusText.textContent = `Hand ${state.handNumber} 終了。次のハンドを開始できます。`;
    return;
  }

  if (state.stage === "finished") {
    statusText.textContent = "ゲームが終了しました。";
    return;
  }

  const turnPlayer = state.players.find((p) => p.id === state.currentPlayerId);
  const turnText = turnPlayer ? `${turnPlayer.name} のターン` : "進行中";
  statusText.textContent = `Hand ${state.handNumber} | ${stageLabel(state.stage)} | ${turnText}`;
}

function renderControls(state) {
  const legal = server.getLegalActions("human");
  const humanTurn = state.currentPlayerId === "human";
  const playable = ["preflop", "flop", "turn", "river"].includes(state.stage);

  foldBtn.disabled = working || !playable || !humanTurn || !legal.canFold;
  checkCallBtn.disabled = working || !playable || !humanTurn || !legal.canCheckCall;
  raiseBtn.disabled = working || !playable || !humanTurn || !legal.canRaise;

  if (legal.toCall > 0) {
    checkCallBtn.textContent = `Call ${legal.toCall}`;
  } else {
    checkCallBtn.textContent = "Check";
  }

  raiseBtn.textContent = `Raise +${legal.minRaise}`;
  raiseAmountInput.min = String(legal.minRaise);
  if (Number(raiseAmountInput.value) < legal.minRaise) {
    raiseAmountInput.value = String(legal.minRaise);
  }
  raiseAmountInput.disabled = working || !playable || !humanTurn || !legal.canRaise;

  const handResolved = state.stage === "handOver" || state.stage === "finished";
  newHandBtn.disabled = working || !inGame || !handResolved;
}

function renderPayout(state) {
  if (!state.lastPayout || state.lastPayout.length === 0) {
    resultStrip.textContent = "配当情報: まだありません";
    return;
  }

  const lines = state.lastPayout
    .filter((p) => p.amount > 0)
    .map((p) => {
      const player = state.players.find((x) => x.id === p.playerId);
      return `${player ? player.name : p.playerId} +${p.amount}`;
    });
  resultStrip.textContent = `配当情報: ${lines.join(" / ")}`;
}

function renderResultModal(state) {
  const settlement = state.lastSettlement;
  if (!settlement || !settlement.items || settlement.items.length === 0) {
    resultModal.classList.add("hidden");
    resultModal.setAttribute("aria-hidden", "true");
    return;
  }

  resultTitle.textContent = `Hand ${settlement.handNumber} 結果`;
  const rows = settlement.items
    .slice()
    .sort((a, b) => b.net - a.net)
    .map((item) => {
      const deltaClass = item.net > 0 ? "plus" : item.net < 0 ? "minus" : "";
      const netText = item.net > 0 ? `+${item.net}` : `${item.net}`;
      return `
        <tr>
          <td>${item.name}</td>
          <td class="num">${item.paid}</td>
          <td class="num">${item.won}</td>
          <td class="num delta ${deltaClass}">${netText}</td>
        </tr>
      `;
    })
    .join("");
  resultTableBody.innerHTML = rows;

  resultModal.classList.remove("hidden");
  resultModal.setAttribute("aria-hidden", "false");
}

function closeResultModal() {
  resultModal.classList.add("hidden");
  resultModal.setAttribute("aria-hidden", "true");
}

function openRulesModal() {
  rulesModal.classList.remove("hidden");
  rulesModal.setAttribute("aria-hidden", "false");
}

function closeRulesModal() {
  rulesModal.classList.add("hidden");
  rulesModal.setAttribute("aria-hidden", "true");
}

function openLobbyModal() {
  multiLobbyModal.classList.remove("hidden");
  multiLobbyModal.setAttribute("aria-hidden", "false");
}

function closeLobbyModal() {
  multiLobbyModal.classList.add("hidden");
  multiLobbyModal.setAttribute("aria-hidden", "true");
}

function recordSettlementToAccount(state) {
  if (state.stage !== "handOver" || !state.lastSettlement) return;
  const handNumber = state.lastSettlement.handNumber;
  if (handNumber <= recordedHandNumber) return;

  const humanItem = state.lastSettlement.items.find((x) => x.playerId === "human");
  const humanPlayer = state.players.find((x) => x.id === "human");
  recordHandResult({
    humanNet: humanItem?.net ?? 0,
    resultingChips: humanPlayer?.chips,
  });
  recordedHandNumber = handNumber;
  renderAccount();
}

function render(state) {
  previousState = currentState;
  currentState = state;
  potValue.textContent = String(state.pot);

  for (const p of state.players) {
    renderPlayer(p, state);
  }

  renderCommunity(state);
  renderLogs(state);
  renderStatus(state);
  renderControls(state);
  renderPayout(state);
  recordSettlementToAccount(state);
  animateBetMovements(previousState, state);

  if (state.stage === "handOver" && state.lastSettlement?.handNumber > shownResultHandNumber) {
    shownResultHandNumber = state.lastSettlement.handNumber;
    renderResultModal(state);
  }
}

async function runBotsLoop() {
  if (working) return;
  working = true;
  renderControls(currentState);

  while (true) {
    const state = server.getState();
    const stageActive = ["preflop", "flop", "turn", "river"].includes(state.stage);
    if (!stageActive || state.currentPlayerId === "human" || !state.currentPlayerId) {
      render(server.getState());
      break;
    }

    const actor = state.players.find((p) => p.id === state.currentPlayerId);
    if (!actor || !actor.isBot) break;

    statusText.textContent = `${actor.name} が思考中...`;
    await sleep(1000 + Math.floor(Math.random() * 1000));
    render(server.processBotTurn());
  }

  working = false;
  renderControls(server.getState());
}

async function onHumanAction(action) {
  if (working) return;

  try {
    working = true;
    renderControls(currentState);
    const raiseAmount = action === "raise" ? Number.parseInt(raiseAmountInput.value, 10) || 20 : null;
    render(server.submitHumanAction(action, raiseAmount));
  } catch (error) {
    statusText.textContent = error instanceof Error ? error.message : "操作に失敗しました";
  } finally {
    working = false;
    renderControls(server.getState());
  }

  await runBotsLoop();
}

function showHome() {
  inGame = false;
  homePanel.classList.remove("hidden");
  gamePanel.classList.add("hidden");
  controlPanel.classList.add("hidden");
  topbarSub.textContent = "ホーム";
  closeResultModal();
  renderAccount();
}

function showGame(subTitle = "ひとりで対戦モード") {
  inGame = true;
  homePanel.classList.add("hidden");
  gamePanel.classList.remove("hidden");
  controlPanel.classList.remove("hidden");
  topbarSub.textContent = subTitle;
}

function renderLobby(room) {
  currentRoom = room;
  if (!room) {
    lobbyStatus.textContent = "未入室";
    lobbyMemberList.innerHTML = "";
    startFromLobbyBtn.disabled = true;
    return;
  }

  const totalSeats = room.members.length + room.bots;
  const lines = [`roomId: ${room.roomId}`, `人間: ${room.members.length} / Bot: ${room.bots}`];
  if (room.members.length === 1 && room.bots === 0) {
    const waited = Math.max(0, 20 - Math.floor((Date.now() - (room.waitStartAt || Date.now())) / 1000));
    lines.push(`Bot補充まで: ${waited}s`);
  }
  if (totalSeats > 4) {
    lines.push("開発版UIは4席表示です（内部待機は8席まで対応）");
  }
  lobbyStatus.textContent = lines.join(" | ");

  lobbyMemberList.innerHTML = room.members
    .map((m) => `<li>${m.displayName}${m.accountId === currentAccount.accountId ? "（あなた）" : ""}</li>`)
    .join("");

  startFromLobbyBtn.disabled = totalSeats < 2;
}

function stopLobbySubscription() {
  if (roomSubscription) {
    roomSubscription();
    roomSubscription = null;
  }
}

function joinLobbyRoom() {
  const roomId = (roomIdInput.value || "").trim();
  if (!roomId) {
    lobbyStatus.textContent = "roomId を入力してください";
    return;
  }

  const result = joinRoom({
    roomId,
    accountId: currentAccount.accountId,
    displayName: currentAccount.displayName,
  });

  if (!result.ok) {
    lobbyStatus.textContent = result.reason || "入室に失敗しました";
    return;
  }

  setLastRoomId(roomId);
  stopLobbySubscription();
  roomSubscription = subscribeRoom(roomId, renderLobby);
}

function leaveLobbyRoom() {
  if (!currentRoom) return;
  leaveRoom({ roomId: currentRoom.roomId, accountId: currentAccount.accountId });
  stopLobbySubscription();
  renderLobby(null);
}

function configureFromLobbyAndStart() {
  if (!currentRoom) return;

  const otherHumans = currentRoom.members
    .filter((m) => m.accountId !== currentAccount.accountId)
    .map((m) => m.displayName);
  const botNames = [];
  for (let i = 0; i < currentRoom.bots; i += 1) {
    botNames.push(`AI-${i + 1}`);
  }

  const opponentNames = [...otherHumans, ...botNames].slice(0, 3);
  server.configureOpponents(opponentNames);
  server.configureHumanProfile({ name: currentAccount.displayName, chips: currentAccount.coins });

  showGame("みんなで対戦モード（開発版）");
  closeLobbyModal();
  closeResultModal();
  render(server.startSingleModeHand());
  void runBotsLoop();
}

startSingleBtn.addEventListener("click", async () => {
  applyAccountToEngine();
  showGame("ひとりで対戦モード");
  closeResultModal();
  render(server.startSingleModeHand());
  await runBotsLoop();
});

startMultiBtn.addEventListener("click", () => {
  roomIdInput.value = currentAccount.lastRoomId || "room-" + Math.random().toString(36).slice(2, 6);
  openLobbyModal();
});

joinRoomBtn.addEventListener("click", () => {
  joinLobbyRoom();
});

leaveRoomBtn.addEventListener("click", () => {
  leaveLobbyRoom();
});

startFromLobbyBtn.addEventListener("click", () => {
  configureFromLobbyAndStart();
});

closeLobbyBtn.addEventListener("click", () => {
  closeLobbyModal();
});

chargeBtn.addEventListener("click", () => {
  recordCharge(500, "dev-charge");
  renderAccount();
  lobbyStatus.textContent = "課金テスト: +500 コインを反映しました";
});

backHomeBtn.addEventListener("click", () => {
  showHome();
});

newHandBtn.addEventListener("click", async () => {
  if (!inGame) return;
  closeResultModal();
  render(server.startSingleModeHand());
  await runBotsLoop();
});

closeResultBtn.addEventListener("click", () => {
  closeResultModal();
});

openRulesBtn.addEventListener("click", () => {
  openRulesModal();
});

closeRulesBtn.addEventListener("click", () => {
  closeRulesModal();
});

resultModal.addEventListener("click", (event) => {
  if (event.target === resultModal) {
    closeResultModal();
  }
});

rulesModal.addEventListener("click", (event) => {
  if (event.target === rulesModal) {
    closeRulesModal();
  }
});

multiLobbyModal.addEventListener("click", (event) => {
  if (event.target === multiLobbyModal) {
    closeLobbyModal();
  }
});

foldBtn.addEventListener("click", () => onHumanAction("fold"));
checkCallBtn.addEventListener("click", () => onHumanAction("checkCall"));
raiseBtn.addEventListener("click", () => onHumanAction("raise"));

renderAccount();
applyAccountToEngine();
render(currentState);
showHome();
window.addEventListener("beforeunload", () => {
  if (currentRoom) {
    leaveRoom({ roomId: currentRoom.roomId, accountId: currentAccount.accountId });
  }
});
