const STORAGE_KEY_THEME = "stopwatch.theme.v1";

const state = {
  running: false,
  startedAt: 0,
  elapsedMs: 0,
  timerId: null,
  laps: [],
};

const els = {
  timeLabel: document.getElementById("timeLabel"),
  statusMessage: document.getElementById("statusMessage"),
  startStopBtn: document.getElementById("startStopBtn"),
  lapBtn: document.getElementById("lapBtn"),
  resetBtn: document.getElementById("resetBtn"),
  lapList: document.getElementById("lapList"),
  lapCountLabel: document.getElementById("lapCountLabel"),
  emptyState: document.getElementById("emptyState"),
  themeToggle: document.getElementById("themeToggle"),
};

init();

function init() {
  loadTheme();
  bindEvents();
  render();
}

function bindEvents() {
  els.startStopBtn.addEventListener("click", toggleStartStop);
  els.lapBtn.addEventListener("click", addLap);
  els.resetBtn.addEventListener("click", resetAll);
  els.themeToggle.addEventListener("click", toggleTheme);
}

function toggleStartStop() {
  if (state.running) {
    state.elapsedMs = nowElapsed();
    state.running = false;
    clearInterval(state.timerId);
    setStatus("停止しました");
  } else {
    state.startedAt = Date.now() - state.elapsedMs;
    state.running = true;
    clearInterval(state.timerId);
    state.timerId = setInterval(render, 30);
    setStatus("計測中...");
  }
  render();
}

function addLap() {
  if (!state.running && state.elapsedMs <= 0) {
    setStatus("計測を開始してからラップを追加してください");
    return;
  }

  const lapTime = state.running ? nowElapsed() : state.elapsedMs;
  state.laps.unshift(lapTime);
  renderLaps();
  setStatus("ラップを記録しました");
}

function resetAll() {
  state.running = false;
  state.startedAt = 0;
  state.elapsedMs = 0;
  state.laps = [];
  clearInterval(state.timerId);
  setStatus("リセットしました");
  render();
}

function nowElapsed() {
  return Math.max(0, Date.now() - state.startedAt);
}

function render() {
  const elapsed = state.running ? nowElapsed() : state.elapsedMs;
  els.timeLabel.textContent = formatTime(elapsed);
  els.startStopBtn.textContent = state.running ? "停止" : "開始";
  renderLaps();
}

function renderLaps() {
  els.lapList.innerHTML = "";
  state.laps.forEach((lapMs, index) => {
    const item = document.createElement("li");
    item.textContent = `Lap ${state.laps.length - index}: ${formatTime(lapMs)}`;
    els.lapList.appendChild(item);
  });
  els.lapCountLabel.textContent = `${state.laps.length}件`;
  els.emptyState.style.display = state.laps.length ? "none" : "block";
}

function formatTime(ms) {
  const totalCenti = Math.floor(ms / 10);
  const centi = totalCenti % 100;
  const totalSec = Math.floor(totalCenti / 100);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(centi).padStart(2, "0")}`;
}

function setStatus(message) {
  els.statusMessage.textContent = message;
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
