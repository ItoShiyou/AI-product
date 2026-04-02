const statusText = document.querySelector("#status-text");
const setupPanel = document.querySelector("#setup-panel");
const tablePanel = document.querySelector("#table-panel");
const playerNameInput = document.querySelector("#player-name");
const botCountSelect = document.querySelector("#bot-count");
const startGameButton = document.querySelector("#start-game");
const nextHandButton = document.querySelector("#next-hand");
const raiseInput = document.querySelector("#raise-amount");

const streetEl = document.querySelector("#street");
const potEl = document.querySelector("#pot");
const currentBetEl = document.querySelector("#current-bet");
const toCallEl = document.querySelector("#to-call");
const potCenterEl = document.querySelector("#pot-center");
const boardCardsEl = document.querySelector("#board-cards");
const holeCardsEl = document.querySelector("#hole-cards");
const playersEl = document.querySelector("#players");
const showdownEl = document.querySelector("#showdown");
const winnersEl = document.querySelector("#winners");
const winnerBannerEl = document.querySelector("#winner-banner");
const chipMovementsEl = document.querySelector("#chip-movements");
const settlementOverlayEl = document.querySelector("#settlement-overlay");
const overlayWinnerEl = document.querySelector("#overlay-winner");
const overlayMovementsEl = document.querySelector("#overlay-movements");
const closeOverlayButton = document.querySelector("#close-overlay");
const logsEl = document.querySelector("#logs");
const actionButtons = [...document.querySelectorAll("button[data-action]")];
const actionDockEl = document.querySelector("#action-dock");

const isApiHost = window.location.port === "4173";
const apiBase = isApiHost ? "" : `http://${window.location.hostname || "localhost"}:4173`;

const suitMap = { S: "♠", H: "♥", D: "♦", C: "♣" };
const FLOP_REVEAL_DELAY_MS = 200;
let previousBoardCards = [];
let previousHoleCards = [];
let previousHandEnded = false;
let lastShownHandSummaryNumber = 0;
let isUiLocked = false;
let botPollingTimer = null;
let boardRenderToken = 0;
let boardRevealTimers = [];

const seatLayout = {
  2: [
    { left: 50, top: 84 },
    { left: 50, top: 16 },
  ],
  3: [
    { left: 50, top: 84 },
    { left: 18, top: 27 },
    { left: 82, top: 27 },
  ],
  4: [
    { left: 50, top: 84 },
    { left: 15, top: 56 },
    { left: 50, top: 16 },
    { left: 85, top: 56 },
  ],
  5: [
    { left: 50, top: 85 },
    { left: 18, top: 67 },
    { left: 18, top: 26 },
    { left: 82, top: 26 },
    { left: 82, top: 67 },
  ],
};

class Card {
  constructor(rank, suit, isFaceUp = true) {
    this.rank = rank;
    this.suit = suit;
    this.isFaceUp = isFaceUp;
  }

  static fromRaw(raw, isFaceUp = true) {
    if (!raw || raw.length < 2) {
      return null;
    }
    return new Card(raw[0], raw[1], isFaceUp);
  }
}

function cardText(card) {
  return `${card.rank}${suitMap[card.suit] || card.suit}`;
}

function clearBoardRevealTimers() {
  for (const timerId of boardRevealTimers) {
    clearTimeout(timerId);
  }
  boardRevealTimers = [];
}

function renderSingleCard(el, card, { animate = false, showBack = false } = {}) {
  el.className = "card";
  el.textContent = "";

  if (!card) {
    return;
  }

  if (showBack || !card.isFaceUp) {
    el.classList.add("card-back");
    return;
  }

  el.textContent = cardText(card);
  if (card.suit === "H" || card.suit === "D") {
    el.classList.add("suit-red");
  }
  if (animate) {
    el.classList.add("dealt");
  }
}

function setStatus(text) {
  statusText.textContent = text;
}

function setUiLocked(locked, message = "") {
  isUiLocked = locked;
  raiseInput.disabled = locked;
  actionDockEl.classList.toggle("busy", locked);
  if (locked && message) {
    setStatus(message);
  }
}

function startBotPolling() {
  if (botPollingTimer != null) {
    return;
  }
  botPollingTimer = setInterval(() => {
    void refresh({ silent: true });
  }, 600);
}

function stopBotPolling() {
  if (botPollingTimer == null) {
    return;
  }
  clearInterval(botPollingTimer);
  botPollingTimer = null;
}

function applyThinkingState(data) {
  if (data.botThinking) {
    setUiLocked(true, "Botが思考中...");
    startBotPolling();
    return;
  }

  stopBotPolling();
  setUiLocked(false);
}

function formatDelta(delta) {
  if (delta > 0) {
    return `+${delta}`;
  }
  return String(delta);
}

function renderMovements(container, movements) {
  container.innerHTML = "";
  if (!movements || movements.length === 0) {
    const li = document.createElement("li");
    li.textContent = "精算情報なし";
    container.appendChild(li);
    return;
  }

  for (const move of movements) {
    const li = document.createElement("li");
    const stateClass = move.delta > 0 ? "plus" : move.delta < 0 ? "minus" : "even";
    li.className = `chip-move ${stateClass}`;
    li.innerHTML = `
      <span class="name">${move.name}</span>
      <span class="flow">${move.startChips} -> ${move.endChips}</span>
      <span class="delta">${formatDelta(move.delta)}</span>
    `;
    container.appendChild(li);
  }
}

function renderHandSummary(summary) {
  if (!summary || summary.winners.length === 0) {
    winnerBannerEl.textContent = "勝者はまだ確定していません";
    overlayWinnerEl.textContent = "勝者はまだ確定していません";
    renderMovements(chipMovementsEl, []);
    renderMovements(overlayMovementsEl, []);
    return;
  }

  const winnerLine = summary.winners
    .map((winner) => `${winner.name} +${winner.amount} (net ${formatDelta(winner.netDelta)})`)
    .join(" / ");
  const header = `Hand #${summary.handNumber} | POT ${summary.pot} | ${winnerLine}`;
  winnerBannerEl.textContent = header;
  overlayWinnerEl.textContent = header;
  renderMovements(chipMovementsEl, summary.chipMovements);
  renderMovements(overlayMovementsEl, summary.chipMovements);
}

function maybeShowSettlementOverlay(snapshot) {
  if (!snapshot.handEnded || !snapshot.handSummary) {
    settlementOverlayEl.classList.remove("show");
    settlementOverlayEl.setAttribute("aria-hidden", "true");
    previousHandEnded = snapshot.handEnded;
    return;
  }

  const handNumber = snapshot.handSummary.handNumber || 0;
  const finishedNow = !previousHandEnded && snapshot.handEnded;
  if (finishedNow || handNumber > lastShownHandSummaryNumber) {
    settlementOverlayEl.classList.add("show");
    settlementOverlayEl.setAttribute("aria-hidden", "false");
    lastShownHandSummaryNumber = handNumber;
  }

  previousHandEnded = snapshot.handEnded;
}

function setActionButtons(availableActions, handEnded) {
  for (const button of actionButtons) {
    const action = button.dataset.action || "";
    button.disabled = isUiLocked || handEnded || !availableActions.includes(action);
  }
}

function getPlaceholderText(container, index) {
  if (container.id === "board-cards") {
    if (index <= 2) {
      return `FLOP ${index + 1}`;
    }
    if (index === 3) {
      return "TURN";
    }
    return "RIVER";
  }

  if (container.id === "hole-cards") {
    return `HOLE ${index + 1}`;
  }

  return "--";
}

function renderCards(container, cards, previousCards = []) {
  container.innerHTML = "";
  const slotCount = Number.parseInt(container.dataset.slotCount || "0", 10) || cards.length;
  for (let i = 0; i < slotCount; i += 1) {
    const raw = cards[i] || null;
    const card = Card.fromRaw(raw, true);
    const el = document.createElement("div");
    const isNewCard = raw && !previousCards.includes(raw);
    if (card) {
      renderSingleCard(el, card, { animate: isNewCard });
    } else {
      el.classList.add("empty");
      el.textContent = getPlaceholderText(container, i);
    }
    container.appendChild(el);
  }
}

function renderBoardCards(street, cards, previousCards = []) {
  boardRenderToken += 1;
  const token = boardRenderToken;
  clearBoardRevealTimers();

  boardCardsEl.innerHTML = "";
  const slotCount = Number.parseInt(boardCardsEl.dataset.slotCount || "5", 10) || 5;
  for (let i = 0; i < slotCount; i += 1) {
    const slot = document.createElement("div");
    slot.className = "card empty";
    slot.textContent = getPlaceholderText(boardCardsEl, i);
    boardCardsEl.appendChild(slot);
  }

  for (let i = 0; i < Math.min(previousCards.length, cards.length); i += 1) {
    const card = Card.fromRaw(cards[i], true);
    const slot = boardCardsEl.children[i];
    renderSingleCard(slot, card);
  }

  const revealIndexes = [];
  if (street === "flop" && previousCards.length < 3 && cards.length >= 3) {
    revealIndexes.push(0, 1, 2);
  } else {
    for (let i = previousCards.length; i < cards.length; i += 1) {
      revealIndexes.push(i);
    }
  }

  for (const [step, index] of revealIndexes.entries()) {
    const raw = cards[index];
    const card = Card.fromRaw(raw, true);
    const slot = boardCardsEl.children[index];
    if (!card || !slot) {
      continue;
    }

    const delay = street === "flop" ? step * FLOP_REVEAL_DELAY_MS : 0;
    const timerId = window.setTimeout(() => {
      if (token !== boardRenderToken) {
        return;
      }

      renderSingleCard(slot, card, { showBack: true });
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (token !== boardRenderToken) {
            return;
          }
          renderSingleCard(slot, card, { animate: true });
        });
      });
    }, delay);
    boardRevealTimers.push(timerId);
  }
}

function getSeatPosition(index, total) {
  const positions = seatLayout[total] || seatLayout[5];
  return positions[index] || positions[positions.length - 1];
}

function renderState(payload) {
  const { snapshot, humanCards, availableActions = [], toCall = 0, botThinking = false } = payload;
  streetEl.textContent = snapshot.street;
  potEl.textContent = String(snapshot.pot);
  potCenterEl.textContent = String(snapshot.pot);
  currentBetEl.textContent = String(snapshot.currentBet);
  toCallEl.textContent = String(toCall);

  renderBoardCards(snapshot.street, snapshot.communityCards, previousBoardCards);
  renderCards(holeCardsEl, humanCards, previousHoleCards);
  previousBoardCards = snapshot.communityCards.slice();
  previousHoleCards = humanCards.slice();

  playersEl.innerHTML = "";
  const totalPlayers = snapshot.players.length;
  for (const [index, p] of snapshot.players.entries()) {
    const li = document.createElement("li");
    const role = p.uid === "human-1" ? "You" : "Bot";
    const state = p.folded ? "folded" : p.allIn ? "all-in" : p.inHand ? "active" : "out";
    const position = getSeatPosition(index, totalPlayers);
    const isCurrent = snapshot.actingIndex === index && !snapshot.handEnded;
    li.className = `seat ${state}${isCurrent ? " current" : ""}`;
    li.style.left = `${position.left}%`;
    li.style.top = `${position.top}%`;
    li.innerHTML = `
      <div class="seat-head">
        <span class="seat-name">${p.name}</span>
        <span class="seat-badge">${role}</span>
      </div>
      <div class="seat-meta">chips ${p.chips} / bet ${p.streetBet}</div>
      <div class="seat-action">${p.lastAction || state}</div>
    `;
    playersEl.appendChild(li);
  }

  showdownEl.innerHTML = "";
  if (snapshot.showdownResults.length === 0) {
    const li = document.createElement("li");
    li.textContent = "ショーダウン待機中";
    showdownEl.appendChild(li);
  } else {
    for (const item of snapshot.showdownResults) {
      const li = document.createElement("li");
      const cards = (item.cards || []).map((card) => cardText(card)).join(" ");
      const bestFive = (item.bestFive || []).map((card) => cardText(card)).join(" ");
      li.textContent = `${item.name}: ${item.handName} (${cards}) | best ${bestFive}`;
      showdownEl.appendChild(li);
    }
  }

  if (snapshot.winners.length === 0) {
    winnersEl.textContent = "勝者はまだ確定していません";
  } else {
    winnersEl.textContent = snapshot.winners.map((w) => `${w.name} +${w.amount}`).join(" / ");
  }

  renderHandSummary(snapshot.handSummary);

  logsEl.innerHTML = "";
  for (const line of snapshot.logs) {
    const li = document.createElement("li");
    li.textContent = line;
    logsEl.appendChild(li);
  }

  if (botThinking) {
    setStatus("Botが思考中...");
  } else if (snapshot.handEnded) {
    setStatus("ハンド終了: 次ハンドを開始できます");
  } else {
    const actor = snapshot.actingIndex == null ? null : snapshot.players[snapshot.actingIndex];
    setStatus(actor ? `行動中: ${actor.name}` : "進行中");
  }

  setActionButtons(availableActions, snapshot.handEnded);
  nextHandButton.disabled = isUiLocked || !snapshot.handEnded;
  maybeShowSettlementOverlay(snapshot);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(`${apiBase}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `request failed: ${response.status}`);
  }

  return response.json();
}

async function refresh({ silent = false } = {}) {
  try {
    const data = await fetchJson("/api/state");
    if (!data.ready) {
      tablePanel.style.display = "none";
      setupPanel.style.display = "flex";
      stopBotPolling();
      return;
    }
    setupPanel.style.display = "none";
    tablePanel.style.display = "block";
    applyThinkingState(data);
    renderState(data);
  } catch (error) {
    if (!silent) {
      setStatus(`状態取得失敗: ${error.message}`);
    }
  }
}

async function startGame() {
  const playerName = (playerNameInput.value || "You").trim() || "You";
  const bots = Number.parseInt(botCountSelect.value, 10) || 2;
  try {
    setUiLocked(true, "ゲームを準備中...");
    await fetchJson("/api/new-game", {
      method: "POST",
      body: JSON.stringify({ playerName, bots }),
    });
    previousBoardCards = [];
    previousHoleCards = [];
    setupPanel.style.display = "none";
    tablePanel.style.display = "block";
    await refresh();
  } catch (error) {
    setStatus(`開始失敗: ${error.message}`);
  } finally {
    await refresh({ silent: true });
  }
}

async function sendAction(action) {
  const amount = Number.parseInt(raiseInput.value, 10) || 0;
  try {
    setUiLocked(true, "Botが思考中...");
    await fetchJson("/api/action", {
      method: "POST",
      body: JSON.stringify({ action, amount }),
    });
    await refresh();
  } catch (error) {
    setStatus(`操作失敗: ${error.message}`);
  } finally {
    await refresh();
  }
}

async function nextHand() {
  try {
    setUiLocked(true, "次ハンドを準備中...");
    await fetchJson("/api/next-hand", { method: "POST" });
    previousBoardCards = [];
    previousHoleCards = [];
    await refresh();
  } catch (error) {
    setStatus(`次ハンド失敗: ${error.message}`);
  } finally {
    await refresh({ silent: true });
  }
}

startGameButton.addEventListener("click", () => {
  void startGame();
});

for (const button of document.querySelectorAll("button[data-action]")) {
  button.addEventListener("click", () => {
    void sendAction(button.dataset.action);
  });
}

nextHandButton.addEventListener("click", () => {
  void nextHand();
});

closeOverlayButton.addEventListener("click", () => {
  settlementOverlayEl.classList.remove("show");
  settlementOverlayEl.setAttribute("aria-hidden", "true");
});

settlementOverlayEl.addEventListener("click", (event) => {
  if (event.target === settlementOverlayEl) {
    settlementOverlayEl.classList.remove("show");
    settlementOverlayEl.setAttribute("aria-hidden", "true");
  }
});

tablePanel.style.display = "none";
nextHandButton.disabled = true;
setActionButtons([], true);
setStatus("名前とBot数を選んで開始してください");
void refresh();
