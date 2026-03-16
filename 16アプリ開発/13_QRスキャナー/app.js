const STORAGE_KEY_THEME = "qr-scanner.theme.v1";
const STORAGE_KEY_HISTORY = "qr-scanner.history.v1";

const state = {
  stream: null,
  scanId: null,
  history: [],
  detector: null,
  lastValue: "",
};

const els = {
  cameraView: document.getElementById("cameraView"),
  captureCanvas: document.getElementById("captureCanvas"),
  statusMessage: document.getElementById("statusMessage"),
  startScanBtn: document.getElementById("startScanBtn"),
  stopScanBtn: document.getElementById("stopScanBtn"),
  resultLabel: document.getElementById("resultLabel"),
  openLink: document.getElementById("openLink"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  historyList: document.getElementById("historyList"),
  emptyState: document.getElementById("emptyState"),
  themeToggle: document.getElementById("themeToggle"),
};

init();

function init() {
  loadTheme();
  state.history = loadHistory();
  initDetector();
  bindEvents();
  renderHistory();
}

function initDetector() {
  if ("BarcodeDetector" in window) {
    state.detector = new BarcodeDetector({ formats: ["qr_code"] });
    setStatus("スキャン準備完了");
  } else {
    setStatus("このブラウザはQR読み取りAPIに未対応です");
  }
}

function bindEvents() {
  els.startScanBtn.addEventListener("click", startScan);
  els.stopScanBtn.addEventListener("click", stopScan);
  els.clearHistoryBtn.addEventListener("click", clearHistory);
  els.themeToggle.addEventListener("click", toggleTheme);
}

async function startScan() {
  if (!state.detector) return;
  if (state.stream) return;

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    els.cameraView.srcObject = state.stream;
    await els.cameraView.play();
    setStatus("スキャン中...");
    scanLoop();
  } catch {
    setStatus("カメラの起動に失敗しました");
  }
}

function stopScan() {
  if (state.scanId) {
    cancelAnimationFrame(state.scanId);
    state.scanId = null;
  }

  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }

  els.cameraView.srcObject = null;
  setStatus("スキャンを停止しました");
}

async function scanLoop() {
  if (!state.stream || !state.detector) return;

  const ctx = els.captureCanvas.getContext("2d");
  if (!ctx) return;

  const w = els.captureCanvas.width;
  const h = els.captureCanvas.height;
  ctx.drawImage(els.cameraView, 0, 0, w, h);

  try {
    const barcodes = await state.detector.detect(els.captureCanvas);
    if (barcodes.length > 0) {
      const rawValue = (barcodes[0].rawValue || "").trim();
      if (rawValue && rawValue !== state.lastValue) {
        handleDetected(rawValue);
      }
    }
  } catch {
    // Detection can fail intermittently while camera is warming up.
  }

  state.scanId = requestAnimationFrame(scanLoop);
}

function handleDetected(value) {
  state.lastValue = value;
  els.resultLabel.textContent = `結果: ${value}`;

  const isUrl = isLikelyUrl(value);
  els.openLink.hidden = !isUrl;
  if (isUrl) {
    els.openLink.href = value;
  }

  state.history.unshift({
    id: createId(),
    value,
    isUrl,
    scannedAt: Date.now(),
  });
  state.history = state.history.slice(0, 30);
  persistHistory();
  renderHistory();
  setStatus("QRを検出しました");
}

function renderHistory() {
  els.historyList.innerHTML = "";
  state.history.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const value = document.createElement("p");
    value.textContent = item.value;

    const time = document.createElement("p");
    time.className = "history-time";
    time.textContent = formatTimestamp(item.scannedAt);

    li.append(value, time);
    els.historyList.appendChild(li);
  });

  els.emptyState.style.display = state.history.length ? "none" : "block";
}

function clearHistory() {
  state.history = [];
  persistHistory();
  renderHistory();
  setStatus("履歴を削除しました");
}

function isLikelyUrl(text) {
  return /^https?:\/\//i.test(text);
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function setStatus(message) {
  els.statusMessage.textContent = message;
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        id: typeof item?.id === "string" ? item.id : createId(),
        value: typeof item?.value === "string" ? item.value : "",
        isUrl: Boolean(item?.isUrl),
        scannedAt: Number.isFinite(item?.scannedAt) ? item.scannedAt : Date.now(),
      }))
      .filter((item) => item.value);
  } catch {
    return [];
  }
}

function persistHistory() {
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.history));
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
