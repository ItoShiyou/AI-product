const STORAGE_KEY_RECORDS = "weight-tracker.records.v1";
const STORAGE_KEY_THEME = "weight-tracker.theme.v1";

const state = {
  records: [],
};

const els = {
  weightInput: document.getElementById("weightInput"),
  dateInput: document.getElementById("dateInput"),
  addRecordBtn: document.getElementById("addRecordBtn"),
  statusMessage: document.getElementById("statusMessage"),
  latestLabel: document.getElementById("latestLabel"),
  changeLabel: document.getElementById("changeLabel"),
  countLabel: document.getElementById("countLabel"),
  recordList: document.getElementById("recordList"),
  emptyState: document.getElementById("emptyState"),
  trendChart: document.getElementById("trendChart"),
  themeToggle: document.getElementById("themeToggle"),
};

init();

function init() {
  loadTheme();
  state.records = loadRecords();
  setDefaultDate();
  bindEvents();
  render();
}

function bindEvents() {
  els.addRecordBtn.addEventListener("click", addRecordFromInput);
  els.weightInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addRecordFromInput();
  });
  els.themeToggle.addEventListener("click", toggleTheme);
}

function addRecordFromInput() {
  const rawWeight = els.weightInput.value.trim();
  const date = els.dateInput.value;
  const weight = Number(rawWeight);

  if (!rawWeight || !Number.isFinite(weight) || weight < 20 || weight > 300) {
    setStatus("20.0〜300.0kg の範囲で入力してください");
    return;
  }
  if (!date) {
    setStatus("日付を選択してください");
    return;
  }

  const rounded = Math.round(weight * 10) / 10;
  const existing = state.records.find((record) => record.date === date);

  if (existing) {
    existing.weight = rounded;
    existing.updatedAt = Date.now();
    setStatus("同日の記録を更新しました");
  } else {
    state.records.push({
      id: createRecordId(),
      date,
      weight: rounded,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setStatus("記録を追加しました");
  }

  persistRecords();
  els.weightInput.value = "";
  render();
}

function deleteRecord(id) {
  state.records = state.records.filter((record) => record.id !== id);
  persistRecords();
  setStatus("記録を削除しました");
  render();
}

function render() {
  const sorted = getSortedRecords();
  renderList(sorted);
  renderSummary(sorted);
  renderTrendChart(sorted);
}

function renderList(sortedRecords) {
  els.recordList.innerHTML = "";
  sortedRecords.forEach((record) => {
    const li = document.createElement("li");
    li.className = "record-item";

    const date = document.createElement("p");
    date.className = "record-date";
    date.textContent = formatDateLabel(record.date);

    const weight = document.createElement("span");
    weight.className = "record-weight";
    weight.textContent = `${record.weight.toFixed(1)}kg`;

    const del = document.createElement("button");
    del.type = "button";
    del.className = "delete-btn";
    del.setAttribute("aria-label", "この記録を削除する");
    del.textContent = "×";
    del.addEventListener("click", () => deleteRecord(record.id));

    li.append(date, weight, del);
    els.recordList.appendChild(li);
  });

  els.countLabel.textContent = `${sortedRecords.length}件`;
  els.emptyState.style.display = sortedRecords.length ? "none" : "block";
}

function renderSummary(sortedRecords) {
  if (!sortedRecords.length) {
    els.latestLabel.textContent = "最新: --.-kg";
    els.changeLabel.textContent = "前回差分: --";
    return;
  }

  const asc = [...sortedRecords].sort((a, b) => a.date.localeCompare(b.date));
  const latest = asc[asc.length - 1];
  els.latestLabel.textContent = `最新: ${latest.weight.toFixed(1)}kg`;

  if (asc.length < 2) {
    els.changeLabel.textContent = "前回差分: 初回記録";
    return;
  }

  const prev = asc[asc.length - 2];
  const diff = Math.round((latest.weight - prev.weight) * 10) / 10;
  const sign = diff > 0 ? "+" : "";
  els.changeLabel.textContent = `前回差分: ${sign}${diff.toFixed(1)}kg`;
}

function renderTrendChart(sortedRecords) {
  const ctx = els.trendChart.getContext("2d");
  if (!ctx) return;

  const width = els.trendChart.width;
  const height = els.trendChart.height;
  ctx.clearRect(0, 0, width, height);

  if (!sortedRecords.length) {
    ctx.fillStyle = getCssVar("--font-sub");
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("記録を追加するとグラフを表示します", width / 2, height / 2);
    return;
  }

  const asc = [...sortedRecords].sort((a, b) => a.date.localeCompare(b.date));
  const minWeight = Math.min(...asc.map((record) => record.weight));
  const maxWeight = Math.max(...asc.map((record) => record.weight));
  const range = Math.max(maxWeight - minWeight, 1);

  const left = 40;
  const right = width - 20;
  const top = 20;
  const bottom = height - 30;

  ctx.strokeStyle = getCssVar("--surface-border");
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();

  const points = asc.map((record, index) => {
    const x = left + (index / Math.max(asc.length - 1, 1)) * (right - left);
    const y = bottom - ((record.weight - minWeight) / range) * (bottom - top);
    return { x, y, record };
  });

  ctx.strokeStyle = getCssVar("--app-main-color-strong");
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.stroke();

  ctx.fillStyle = getCssVar("--app-main-color");
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = getCssVar("--font-sub");
  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${maxWeight.toFixed(1)}kg`, 6, top + 6);
  ctx.fillText(`${minWeight.toFixed(1)}kg`, 6, bottom + 4);
}

function getSortedRecords() {
  return [...state.records].sort((a, b) => b.date.localeCompare(a.date));
}

function setDefaultDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  els.dateInput.value = `${y}-${m}-${d}`;
}

function formatDateLabel(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return `${year}/${month}/${day}`;
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function setStatus(message) {
  els.statusMessage.textContent = message;
}

function createRecordId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((record) => ({
        id: typeof record?.id === "string" ? record.id : createRecordId(),
        date: typeof record?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.date) ? record.date : "",
        weight: Number.isFinite(record?.weight) ? Number(record.weight) : 0,
        createdAt: Number.isFinite(record?.createdAt) ? record.createdAt : Date.now(),
        updatedAt: Number.isFinite(record?.updatedAt) ? record.updatedAt : Date.now(),
      }))
      .filter((record) => record.date && record.weight >= 20 && record.weight <= 300);
  } catch {
    return [];
  }
}

function persistRecords() {
  localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(state.records));
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
  renderTrendChart(getSortedRecords());
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeToggle.textContent = theme === "dark" ? "Light" : "Dark";
}
