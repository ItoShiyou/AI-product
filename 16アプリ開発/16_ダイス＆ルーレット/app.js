const STORAGE_KEY_THEME = "dice-roulette.theme.v1";
const STORAGE_KEY_ITEMS = "dice-roulette.items.v1";

const state = {
  mode: "dice",
  history: [],
  animating: false,
};

const els = {
  diceModeBtn: document.getElementById("diceModeBtn"),
  rouletteModeBtn: document.getElementById("rouletteModeBtn"),
  dicePanel: document.getElementById("dicePanel"),
  roulettePanel: document.getElementById("roulettePanel"),
  diceSidesInput: document.getElementById("diceSidesInput"),
  itemsInput: document.getElementById("itemsInput"),
  rollBtn: document.getElementById("rollBtn"),
  statusMessage: document.getElementById("statusMessage"),
  resultLabel: document.getElementById("resultLabel"),
  subLabel: document.getElementById("subLabel"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  historyList: document.getElementById("historyList"),
  emptyState: document.getElementById("emptyState"),
  themeToggle: document.getElementById("themeToggle"),
};

init();

function init() {
  loadTheme();
  loadItems();
  bindEvents();
  render();
}

function bindEvents() {
  els.diceModeBtn.addEventListener("click", () => setMode("dice"));
  els.rouletteModeBtn.addEventListener("click", () => setMode("roulette"));
  els.rollBtn.addEventListener("click", runDraw);
  els.clearHistoryBtn.addEventListener("click", clearHistory);
  els.itemsInput.addEventListener("input", persistItems);
  els.themeToggle.addEventListener("click", toggleTheme);
}

function setMode(mode) {
  state.mode = mode;
  renderMode();
  setStatus(mode === "dice" ? "ダイスモードに切り替えました" : "ルーレットモードに切り替えました");
}

function renderMode() {
  const dice = state.mode === "dice";
  els.dicePanel.classList.toggle("hidden", !dice);
  els.roulettePanel.classList.toggle("hidden", dice);
  els.diceModeBtn.classList.toggle("btn-primary", dice);
  els.diceModeBtn.classList.toggle("btn-secondary", !dice);
  els.rouletteModeBtn.classList.toggle("btn-primary", !dice);
  els.rouletteModeBtn.classList.toggle("btn-secondary", dice);
}

function runDraw() {
  if (state.animating) return;

  let candidates = [];
  if (state.mode === "dice") {
    const sides = clamp(Number(els.diceSidesInput.value), 2, 100);
    els.diceSidesInput.value = String(sides);
    candidates = Array.from({ length: sides }, (_, i) => String(i + 1));
  } else {
    candidates = parseRouletteItems();
    if (candidates.length < 2) {
      setStatus("ルーレット項目を2つ以上入力してください");
      return;
    }
  }

  animateResult(candidates, (finalResult) => {
    addHistory(finalResult);
    els.subLabel.textContent = `直近結果: ${finalResult}`;
    setStatus("抽選しました");
  });
}

function animateResult(candidates, onDone) {
  state.animating = true;
  let count = 0;

  const intervalId = setInterval(() => {
    const randomValue = randomPick(candidates);
    els.resultLabel.textContent = randomValue;
    count += 1;

    if (count < 14) return;

    clearInterval(intervalId);
    const finalResult = randomPick(candidates);
    els.resultLabel.textContent = finalResult;
    state.animating = false;
    onDone(finalResult);
  }, 70);
}

function parseRouletteItems() {
  return els.itemsInput.value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function addHistory(result) {
  state.history.unshift({
    id: createId(),
    mode: state.mode,
    result,
    createdAt: Date.now(),
  });
  state.history = state.history.slice(0, 20);
  renderHistory();
}

function renderHistory() {
  els.historyList.innerHTML = "";
  state.history.forEach((entry) => {
    const li = document.createElement("li");
    const label = entry.mode === "dice" ? "ダイス" : "ルーレット";
    li.textContent = `${label}: ${entry.result} (${formatTime(entry.createdAt)})`;
    els.historyList.appendChild(li);
  });
  els.emptyState.style.display = state.history.length ? "none" : "block";
}

function clearHistory() {
  state.history = [];
  renderHistory();
  setStatus("履歴をクリアしました");
}

function randomPick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function loadItems() {
  const stored = localStorage.getItem(STORAGE_KEY_ITEMS);
  els.itemsInput.value = stored || "コーヒー\n紅茶\n水";
}

function persistItems() {
  localStorage.setItem(STORAGE_KEY_ITEMS, els.itemsInput.value);
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function setStatus(message) {
  els.statusMessage.textContent = message;
}

function render() {
  renderMode();
  renderHistory();
}

function loadTheme() {
  const stored = localStorage.getItem(STORAGE_KEY_THEME);
  applyTheme(stored === "dark" ? "dark" : "light");
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem(STORAGE_KEY_THEME, next);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeToggle.textContent = theme === "dark" ? "Light" : "Dark";
}
