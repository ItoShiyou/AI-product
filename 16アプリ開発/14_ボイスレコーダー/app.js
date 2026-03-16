const STORAGE_KEY_THEME = "voice-recorder.theme.v1";

const state = {
  mediaStream: null,
  mediaRecorder: null,
  chunks: [],
  records: [],
  recording: false,
  startedAt: 0,
  timerId: null,
};

const els = {
  statusMessage: document.getElementById("statusMessage"),
  recordingLabel: document.getElementById("recordingLabel"),
  startBtn: document.getElementById("startBtn"),
  stopBtn: document.getElementById("stopBtn"),
  recordList: document.getElementById("recordList"),
  countLabel: document.getElementById("countLabel"),
  emptyState: document.getElementById("emptyState"),
  themeToggle: document.getElementById("themeToggle"),
};

init();

function init() {
  loadTheme();
  bindEvents();
  renderRecords();
}

function bindEvents() {
  els.startBtn.addEventListener("click", startRecording);
  els.stopBtn.addEventListener("click", stopRecording);
  els.themeToggle.addEventListener("click", toggleTheme);
}

async function startRecording() {
  if (state.recording) return;
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    setStatus("このブラウザは録音に対応していません");
    return;
  }

  try {
    state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.chunks = [];
    state.mediaRecorder = new MediaRecorder(state.mediaStream);

    state.mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        state.chunks.push(event.data);
      }
    });

    state.mediaRecorder.addEventListener("stop", handleRecordStop);
    state.mediaRecorder.start();

    state.recording = true;
    state.startedAt = Date.now();
    clearInterval(state.timerId);
    state.timerId = setInterval(renderRecordingTime, 200);
    setStatus("録音中...");
  } catch {
    setStatus("マイクの利用に失敗しました");
  }
}

function stopRecording() {
  if (!state.recording || !state.mediaRecorder) return;
  state.mediaRecorder.stop();
  state.recording = false;
  clearInterval(state.timerId);
  renderRecordingTime();
  setStatus("録音を停止しました");
}

function handleRecordStop() {
  const blob = new Blob(state.chunks, { type: "audio/webm" });
  const url = URL.createObjectURL(blob);
  const durationMs = Math.max(0, Date.now() - state.startedAt);

  state.records.unshift({
    id: createId(),
    name: `record-${formatFileDate(Date.now())}.webm`,
    url,
    blob,
    durationMs,
    createdAt: Date.now(),
  });

  cleanupStream();
  renderRecords();
}

function cleanupStream() {
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach((track) => track.stop());
    state.mediaStream = null;
  }
  state.mediaRecorder = null;
  state.chunks = [];
}

function renderRecordingTime() {
  const elapsed = state.recording ? Date.now() - state.startedAt : 0;
  els.recordingLabel.textContent = formatDuration(elapsed);
}

function renderRecords() {
  els.recordList.innerHTML = "";

  state.records.forEach((record) => {
    const li = document.createElement("li");
    li.className = "record-item";

    const top = document.createElement("div");
    top.className = "record-top";

    const name = document.createElement("p");
    name.className = "record-name";
    name.textContent = `${record.name} (${formatDuration(record.durationMs)})`;

    const actions = document.createElement("div");
    actions.className = "record-actions";

    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "btn-secondary";
    downloadBtn.textContent = "保存";
    downloadBtn.addEventListener("click", () => downloadRecord(record));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-secondary";
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", () => deleteRecord(record.id));

    actions.append(downloadBtn, deleteBtn);
    top.append(name, actions);

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = record.url;

    li.append(top, audio);
    els.recordList.appendChild(li);
  });

  els.countLabel.textContent = `${state.records.length}件`;
  els.emptyState.style.display = state.records.length ? "none" : "block";
}

function downloadRecord(record) {
  const a = document.createElement("a");
  a.href = record.url;
  a.download = record.name;
  a.click();
}

function deleteRecord(id) {
  const target = state.records.find((record) => record.id === id);
  if (target) {
    URL.revokeObjectURL(target.url);
  }
  state.records = state.records.filter((record) => record.id !== id);
  renderRecords();
  setStatus("録音を削除しました");
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatFileDate(timestamp) {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
