const STORAGE_KEY_THEME = "focus-timer.theme.v1";
const STORAGE_KEY_STATS = "focus-timer.stats.v1";

const DURATIONS = {
  focus: 25 * 60 * 1000,
  break: 5 * 60 * 1000,
};

const state = {
  phase: "focus",
  running: false,
  remainingMs: DURATIONS.focus,
  endAt: 0,
  timerId: null,
  cycleCount: 0,
};

const els = {
  focusModeBtn: document.getElementById("focusModeBtn"),
  breakModeBtn: document.getElementById("breakModeBtn"),
  phaseLabel: document.getElementById("phaseLabel"),
  timeLabel: document.getElementById("timeLabel"),
  statusMessage: document.getElementById("statusMessage"),
  startPauseBtn: document.getElementById("startPauseBtn"),
  skipBtn: document.getElementById("skipBtn"),
  resetBtn: document.getElementById("resetBtn"),
  notificationBtn: document.getElementById("notificationBtn"),
  cycleCountLabel: document.getElementById("cycleCountLabel"),
  focusMinutesLabel: document.getElementById("focusMinutesLabel"),
  themeToggle: document.getElementById("themeToggle"),
};

init();

function init() {
  loadTheme();
  loadStats();
  bindEvents();
  render();
}

function bindEvents() {
  els.focusModeBtn.addEventListener("click", () => setPhase("focus"));
  els.breakModeBtn.addEventListener("click", () => setPhase("break"));
  els.startPauseBtn.addEventListener("click", toggleStartPause);
  els.skipBtn.addEventListener("click", skipPhase);
  els.resetBtn.addEventListener("click", resetPhase);
  els.notificationBtn.addEventListener("click", requestNotificationPermission);
  els.themeToggle.addEventListener("click", toggleTheme);
}

function setPhase(nextPhase) {
  if (state.running) return;
  state.phase = nextPhase;
  state.remainingMs = DURATIONS[nextPhase];
  setStatus(nextPhase === "focus" ? "集中モードに切り替えました" : "休憩モードに切り替えました");
  render();
}

function toggleStartPause() {
  if (state.running) {
    state.remainingMs = Math.max(0, state.endAt - Date.now());
    state.running = false;
    clearInterval(state.timerId);
    setStatus("一時停止しました");
  } else {
    if (state.remainingMs <= 0) {
      state.remainingMs = DURATIONS[state.phase];
    }
    state.running = true;
    state.endAt = Date.now() + state.remainingMs;
    clearInterval(state.timerId);
    state.timerId = setInterval(tick, 200);
    setStatus("タイマー進行中...");
  }
  render();
}

function tick() {
  state.remainingMs = Math.max(0, state.endAt - Date.now());
  renderTime();

  if (state.remainingMs > 0) return;

  clearInterval(state.timerId);
  state.running = false;
  handlePhaseFinished();
}

function handlePhaseFinished() {
  if (state.phase === "focus") {
    state.cycleCount += 1;
    persistStats();
  }

  const message = state.phase === "focus" ? "集中時間が終了しました。休憩へ" : "休憩が終了しました。次の集中へ";
  setStatus(message);
  playAlarm();
  sendNotification("集中タイマー", message);

  state.phase = state.phase === "focus" ? "break" : "focus";
  state.remainingMs = DURATIONS[state.phase];
  render();
}

function skipPhase() {
  state.running = false;
  clearInterval(state.timerId);
  state.phase = state.phase === "focus" ? "break" : "focus";
  state.remainingMs = DURATIONS[state.phase];
  setStatus("フェーズをスキップしました");
  render();
}

function resetPhase() {
  state.running = false;
  clearInterval(state.timerId);
  state.remainingMs = DURATIONS[state.phase];
  setStatus("現在フェーズをリセットしました");
  render();
}

function render() {
  els.phaseLabel.textContent = `現在: ${state.phase === "focus" ? "集中" : "休憩"}`;
  els.focusModeBtn.classList.toggle("btn-primary", state.phase === "focus");
  els.breakModeBtn.classList.toggle("btn-primary", state.phase === "break");
  els.startPauseBtn.textContent = state.running ? "一時停止" : "開始";
  els.cycleCountLabel.textContent = String(state.cycleCount);
  els.focusMinutesLabel.textContent = `${state.cycleCount * 25}分`;
  renderTime();
}

function renderTime() {
  const totalSec = Math.ceil(state.remainingMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  els.timeLabel.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function playAlarm() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;
  for (let i = 0; i < 2; i += 1) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = i === 0 ? 660 : 880;
    gain.gain.setValueAtTime(0.0001, now + i * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.4 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.4 + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.4);
    osc.stop(now + i * 0.4 + 0.32);
  }
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    setStatus("このブラウザは通知に対応していません");
    return;
  }
  Notification.requestPermission().then((permission) => {
    setStatus(permission === "granted" ? "通知を許可しました" : "通知は許可されませんでした");
  });
}

function sendNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body });
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATS);
    const parsed = JSON.parse(raw || "{}");
    state.cycleCount = Number.isFinite(parsed.cycleCount) ? Math.max(0, Math.floor(parsed.cycleCount)) : 0;
  } catch {
    state.cycleCount = 0;
  }
}

function persistStats() {
  localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify({ cycleCount: state.cycleCount }));
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
