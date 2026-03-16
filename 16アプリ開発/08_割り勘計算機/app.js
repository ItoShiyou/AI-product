const STORAGE_KEY_THEME = "split-bill.theme.v1";

const state = {
  total: "",
  people: "",
  rounding: "none",
};

const els = {
  totalInput: document.getElementById("totalInput"),
  peopleInput: document.getElementById("peopleInput"),
  roundingSelect: document.getElementById("roundingSelect"),
  calculateBtn: document.getElementById("calculateBtn"),
  statusMessage: document.getElementById("statusMessage"),
  perPersonLabel: document.getElementById("perPersonLabel"),
  collectedLabel: document.getElementById("collectedLabel"),
  differenceLabel: document.getElementById("differenceLabel"),
  detailLabel: document.getElementById("detailLabel"),
  themeToggle: document.getElementById("themeToggle"),
};

init();

function init() {
  loadTheme();
  bindEvents();
  renderResult(0, 0, 0, 0);
}

function bindEvents() {
  els.totalInput.addEventListener("input", (event) => {
    state.total = event.target.value;
  });

  els.peopleInput.addEventListener("input", (event) => {
    state.people = event.target.value;
  });

  els.roundingSelect.addEventListener("change", (event) => {
    state.rounding = event.target.value;
  });

  els.calculateBtn.addEventListener("click", calculate);
  els.themeToggle.addEventListener("click", toggleTheme);
}

function calculate() {
  const total = Number(state.total);
  const people = Number(state.people);

  if (!Number.isFinite(total) || total <= 0) {
    setStatus("正しい総額を入力してください");
    return;
  }
  if (!Number.isInteger(people) || people <= 0) {
    setStatus("正しい人数を入力してください");
    return;
  }

  const rawPerPerson = total / people;
  const roundedPerPerson = applyRounding(rawPerPerson, state.rounding);
  const collected = roundedPerPerson * people;
  const difference = collected - total;

  renderResult(rawPerPerson, roundedPerPerson, collected, difference);
  setStatus("計算しました");
}

function applyRounding(value, mode) {
  if (mode === "none") return value;

  const [type, unitText] = mode.split("-");
  const unit = Number(unitText);
  if (!Number.isFinite(unit) || unit <= 0) return value;

  if (type === "up") return Math.ceil(value / unit) * unit;
  if (type === "down") return Math.floor(value / unit) * unit;
  return Math.round(value / unit) * unit;
}

function renderResult(rawPerPerson, roundedPerPerson, collected, difference) {
  els.perPersonLabel.textContent = formatYen(roundedPerPerson);
  els.collectedLabel.textContent = formatYen(collected);
  els.differenceLabel.textContent = `${difference >= 0 ? "+" : ""}${formatYen(difference)}`;
  els.detailLabel.textContent = `内訳: ${formatYen(rawPerPerson)} × ${Number(state.people) || 0}人`;
}

function formatYen(value) {
  const rounded = Math.round(value);
  return `¥${rounded.toLocaleString("ja-JP")}`;
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
