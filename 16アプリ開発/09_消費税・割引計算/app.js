const STORAGE_KEY_THEME = "tax-discount.theme.v1";

const state = {
  basePrice: "",
  taxRate: 10,
  discountRate: 0,
};

const els = {
  basePriceInput: document.getElementById("basePriceInput"),
  taxRates: Array.from(document.querySelectorAll('input[name="taxRate"]')),
  discountRange: document.getElementById("discountRange"),
  discountLabel: document.getElementById("discountLabel"),
  calculateBtn: document.getElementById("calculateBtn"),
  statusMessage: document.getElementById("statusMessage"),
  basePriceLabel: document.getElementById("basePriceLabel"),
  discountedLabel: document.getElementById("discountedLabel"),
  taxLabel: document.getElementById("taxLabel"),
  totalLabel: document.getElementById("totalLabel"),
  savedLabel: document.getElementById("savedLabel"),
  themeToggle: document.getElementById("themeToggle"),
};

init();

function init() {
  loadTheme();
  bindEvents();
  renderResult(0, 0, 0, 0);
}

function bindEvents() {
  els.basePriceInput.addEventListener("input", (event) => {
    state.basePrice = event.target.value;
  });

  els.taxRates.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      state.taxRate = Number(event.target.value);
    });
  });

  els.discountRange.addEventListener("input", (event) => {
    state.discountRate = Number(event.target.value);
    els.discountLabel.textContent = `${state.discountRate}%`;
  });

  els.calculateBtn.addEventListener("click", calculate);
  els.themeToggle.addEventListener("click", toggleTheme);
}

function calculate() {
  const base = Number(state.basePrice);
  if (!Number.isFinite(base) || base < 0) {
    setStatus("0以上の定価を入力してください");
    return;
  }

  const discounted = Math.max(0, roundYen(base * (1 - state.discountRate / 100)));
  const tax = roundYen(discounted * (state.taxRate / 100));
  const total = discounted + tax;
  const saved = base - discounted;

  renderResult(base, discounted, tax, total, saved);
  setStatus("計算しました");
}

function renderResult(base, discounted, tax, total, saved = 0) {
  els.basePriceLabel.textContent = formatYen(base);
  els.discountedLabel.textContent = formatYen(discounted);
  els.taxLabel.textContent = `${formatYen(tax)} (${state.taxRate}%)`;
  els.totalLabel.textContent = formatYen(total);
  els.savedLabel.textContent = `値引き額: ${formatYen(saved)}`;
}

function roundYen(value) {
  return Math.round(value);
}

function formatYen(value) {
  const num = Number(value);
  const safeNum = Number.isFinite(num) ? num : 0;
  return `¥${safeNum.toLocaleString("ja-JP")}`;
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
