const STORAGE_KEY_THEME = "color-picker.theme.v1";
const STORAGE_KEY_RECENT = "color-picker.recent.v1";

const state = {
  stream: null,
  recent: [],
  currentHex: "#000000",
};

const els = {
  cameraView: document.getElementById("cameraView"),
  captureCanvas: document.getElementById("captureCanvas"),
  statusMessage: document.getElementById("statusMessage"),
  startCameraBtn: document.getElementById("startCameraBtn"),
  pickColorBtn: document.getElementById("pickColorBtn"),
  stopCameraBtn: document.getElementById("stopCameraBtn"),
  colorPreview: document.getElementById("colorPreview"),
  hexLabel: document.getElementById("hexLabel"),
  rgbLabel: document.getElementById("rgbLabel"),
  copyBtn: document.getElementById("copyBtn"),
  clearRecentBtn: document.getElementById("clearRecentBtn"),
  recentList: document.getElementById("recentList"),
  emptyState: document.getElementById("emptyState"),
  themeToggle: document.getElementById("themeToggle"),
};

init();

function init() {
  loadTheme();
  state.recent = loadRecent();
  bindEvents();
  applyColor("#000000", { saveRecent: false });
  renderRecent();
}

function bindEvents() {
  els.startCameraBtn.addEventListener("click", startCamera);
  els.pickColorBtn.addEventListener("click", pickCenterColor);
  els.stopCameraBtn.addEventListener("click", stopCamera);
  els.cameraView.addEventListener("pointerdown", pickColorFromPointer);
  els.copyBtn.addEventListener("click", copyHex);
  els.clearRecentBtn.addEventListener("click", clearRecent);
  els.themeToggle.addEventListener("click", toggleTheme);
}

async function startCamera() {
  if (state.stream) return;
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    els.cameraView.srcObject = state.stream;
    await els.cameraView.play();
    setStatus("カメラを開始しました");
  } catch {
    setStatus("カメラを開始できませんでした");
  }
}

function stopCamera() {
  if (!state.stream) return;
  state.stream.getTracks().forEach((track) => track.stop());
  state.stream = null;
  els.cameraView.srcObject = null;
  setStatus("カメラを停止しました");
}

function pickCenterColor() {
  if (!state.stream) {
    setStatus("先にカメラを開始してください");
    return;
  }

  const rect = els.cameraView.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const hex = pickColorAtClientPoint(cx, cy);
  if (!hex) return;
  applyColor(hex, { saveRecent: true });
  setStatus("中央の色を取得しました");
}

function pickColorFromPointer(event) {
  if (!state.stream) {
    setStatus("先にカメラを開始してください");
    return;
  }

  const hex = pickColorAtClientPoint(event.clientX, event.clientY);
  if (!hex) return;

  applyColor(hex, { saveRecent: true });
  setStatus(`${hex} を取得しました`);
}

function pickColorAtClientPoint(clientX, clientY) {
  const video = els.cameraView;
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  if (!videoWidth || !videoHeight) return null;

  const rect = video.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const scale = Math.max(rect.width / videoWidth, rect.height / videoHeight);
  const renderWidth = videoWidth * scale;
  const renderHeight = videoHeight * scale;
  const offsetX = (rect.width - renderWidth) / 2;
  const offsetY = (rect.height - renderHeight) / 2;

  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const sourceX = clamp(Math.floor((localX - offsetX) / scale), 0, videoWidth - 1);
  const sourceY = clamp(Math.floor((localY - offsetY) / scale), 0, videoHeight - 1);

  const ctx = els.captureCanvas.getContext("2d");
  if (!ctx) return null;

  els.captureCanvas.width = videoWidth;
  els.captureCanvas.height = videoHeight;
  ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

  const pixel = ctx.getImageData(sourceX, sourceY, 1, 1).data;
  return rgbToHex(pixel[0], pixel[1], pixel[2]);
}

function applyColor(hex, options = { saveRecent: true }) {
  state.currentHex = hex;
  const { r, g, b } = hexToRgb(hex);

  els.colorPreview.style.background = hex;
  els.hexLabel.textContent = hex;
  els.rgbLabel.textContent = `rgb(${r}, ${g}, ${b})`;

  if (options.saveRecent) {
    state.recent = [hex, ...state.recent.filter((c) => c !== hex)].slice(0, 15);
    persistRecent();
    renderRecent();
  }
}

function renderRecent() {
  els.recentList.innerHTML = "";

  state.recent.forEach((hex) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "recent-color";
    btn.style.background = hex;
    btn.title = hex;
    btn.setAttribute("aria-label", `色 ${hex} を適用`);
    btn.addEventListener("click", () => applyColor(hex, { saveRecent: false }));
    els.recentList.appendChild(btn);
  });

  els.emptyState.style.display = state.recent.length ? "none" : "block";
}

async function copyHex() {
  try {
    await navigator.clipboard.writeText(state.currentHex);
    setStatus(`${state.currentHex} をコピーしました`);
  } catch {
    setStatus("コピーに失敗しました");
  }
}

function clearRecent() {
  state.recent = [];
  persistRecent();
  renderRecent();
  setStatus("最近の色をクリアしました");
}

function rgbToHex(r, g, b) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function toHex(value) {
  return Number(value).toString(16).padStart(2, "0");
}

function hexToRgb(hex) {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return { r, g, b };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setStatus(message) {
  els.statusMessage.textContent = message;
}

function loadRecent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECENT);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((hex) => typeof hex === "string" && /^#[0-9A-Fa-f]{6}$/.test(hex));
  } catch {
    return [];
  }
}

function persistRecent() {
  localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(state.recent));
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
