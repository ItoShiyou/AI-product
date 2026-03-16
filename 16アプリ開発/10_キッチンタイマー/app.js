const STORAGE_KEY_THEME = "kitchen-timer.theme.v1";

const state = {
  totalMs: 180000,
  remainingMs: 180000,
  running: false,
  endAt: 0,
  timerId: null,
};

const els = {
  minutesInput: document.getElementById("minutesInput"),
  secondsInput: document.getElementById("secondsInput"),
  presetBtns: Array.from(document.querySelectorAll(".preset-btn")),
  timeLabel: document.getElementById("timeLabel"),
  statusMessage: document.getElementById("statusMessage"),
  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  resetBtn: document.getElementById("resetBtn"),
  notificationBtn: document.getElementById("notificationBtn"),
  themeToggle: document.getElementById("themeToggle"),
};

init();

function init() {
  loadTheme();
  bindEvents();
  syncFromInputs();
  renderTime();
}

function bindEvents() {
  els.minutesInput.addEventListener("input", syncFromInputs);
  els.secondsInput.addEventListener("input", syncFromInputs);

  els.presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const minutes = Number(btn.dataset.min);
      if (!Number.isFinite(minutes)) return;
      els.minutesInput.value = String(minutes);
      els.secondsInput.value = "0";
      syncFromInputs();
      setStatus(`${minutes}分に設定しました`);
    });
  });

  els.startBtn.addEventListener("click", startTimer);
  els.pauseBtn.addEventListener("click", pauseTimer);
  els.resetBtn.addEventListener("click", resetTimer);
  els.notificationBtn.addEventListener("click", requestNotificationPermission);
  els.themeToggle.addEventListener("click", toggleTheme);
}

function syncFromInputs() {
  if (state.running) return;

  const minutes = clamp(Number(els.minutesInput.value), 0, 180);
  const seconds = clamp(Number(els.secondsInput.value), 0, 59);
  const totalMs = (minutes * 60 + seconds) * 1000;

  state.totalMs = totalMs;
  state.remainingMs = totalMs;
  renderTime();
}

function startTimer() {
  if (state.running) return;
  if (state.remainingMs <= 0) {
    setStatus("1秒以上に設定してください");
    return;
  }

  state.running = true;
  state.endAt = Date.now() + state.remainingMs;
  clearInterval(state.timerId);
  state.timerId = setInterval(tick, 200);
  setStatus("カウントダウン中...");
}

function pauseTimer() {
  if (!state.running) return;
  state.remainingMs = Math.max(0, state.endAt - Date.now());
  state.running = false;
  clearInterval(state.timerId);
  renderTime();
  setStatus("一時停止しました");
}

function resetTimer() {
  state.running = false;
  clearInterval(state.timerId);
  syncFromInputs();
  setStatus("リセットしました");
}

function tick() {
  const rest = Math.max(0, state.endAt - Date.now());
  state.remainingMs = rest;
  renderTime();

  if (rest > 0) return;

  state.running = false;
  clearInterval(state.timerId);
  setStatus("時間になりました");
  playAlarm();
  sendNotification("キッチンタイマー", "時間になりました");
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

  for (let i = 0; i < 3; i += 1) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, now + i * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.35 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.35 + 0.28);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.35);
    osc.stop(now + i * 0.35 + 0.3);
  }
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    setStatus("このブラウザは通知に対応していません");
    return;
  }

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      setStatus("通知を許可しました");
    } else {
      setStatus("通知は許可されませんでした");
    }
  });
}

function sendNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body });
}

function setStatus(message) {
  els.statusMessage.textContent = message;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
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
