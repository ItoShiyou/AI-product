const STORAGE_KEY_THEME = "unified-calculator.theme.v1";

const state = {
  current: "0",
  previous: null,
  operator: null,
  lastHistory: null,
  justEvaluated: false,
};

const els = {
  expressionLabel: document.getElementById("expressionLabel"),
  resultLabel: document.getElementById("resultLabel"),
  historyLabel: document.getElementById("historyLabel"),
  themeToggle: document.getElementById("themeToggle"),
  keys: Array.from(document.querySelectorAll(".key")),
};

init();

function init() {
  loadTheme();
  bindEvents();
  render();
}

function bindEvents() {
  els.keys.forEach((key) => {
    key.addEventListener("click", () => {
      const action = key.dataset.action;
      const value = key.dataset.value;
      handleAction(action, value);
    });
  });

  els.themeToggle.addEventListener("click", toggleTheme);
}

function handleAction(action, value) {
  if (action === "digit") {
    inputDigit(value);
  } else if (action === "dot") {
    inputDot();
  } else if (action === "operator") {
    chooseOperator(value);
  } else if (action === "percent") {
    applyPercent();
  } else if (action === "equals") {
    evaluate();
  } else if (action === "clear") {
    clearAll();
  } else if (action === "delete") {
    deleteOne();
  }
  render();
}

function inputDigit(digit) {
  if (state.justEvaluated && !state.operator) {
    state.current = digit;
    state.justEvaluated = false;
    return;
  }

  if (state.current === "0") {
    state.current = digit;
  } else {
    state.current += digit;
  }
}

function inputDot() {
  if (state.justEvaluated && !state.operator) {
    state.current = "0.";
    state.justEvaluated = false;
    return;
  }
  if (!state.current.includes(".")) {
    state.current += ".";
  }
}

function chooseOperator(nextOperator) {
  const currentValue = Number(state.current);
  if (!Number.isFinite(currentValue)) return;

  if (state.operator && state.previous !== null && !state.justEvaluated) {
    const result = calculate(state.previous, currentValue, state.operator);
    state.previous = result;
    state.current = formatNumber(result);
  } else {
    state.previous = currentValue;
  }

  state.operator = nextOperator;
  state.current = "0";
  state.justEvaluated = false;
}

function applyPercent() {
  const currentValue = Number(state.current);
  if (!Number.isFinite(currentValue)) return;

  let nextValue = currentValue / 100;
  if (state.previous !== null && state.operator && (state.operator === "+" || state.operator === "-")) {
    nextValue = (state.previous * currentValue) / 100;
  }

  state.current = formatNumber(nextValue);
}

function evaluate() {
  if (state.operator === null || state.previous === null) return;

  const currentValue = Number(state.current);
  if (!Number.isFinite(currentValue)) return;

  const result = calculate(state.previous, currentValue, state.operator);
  const expression = `${formatNumber(state.previous)} ${symbolForOperator(state.operator)} ${formatNumber(currentValue)}`;

  state.lastHistory = `${expression} = ${formatNumber(result)}`;
  state.current = formatNumber(result);
  state.previous = null;
  state.operator = null;
  state.justEvaluated = true;
}

function clearAll() {
  state.current = "0";
  state.previous = null;
  state.operator = null;
  state.justEvaluated = false;
}

function deleteOne() {
  if (state.justEvaluated) {
    clearAll();
    return;
  }
  if (state.current.length <= 1) {
    state.current = "0";
  } else {
    state.current = state.current.slice(0, -1);
  }
}

function calculate(a, b, operator) {
  if (operator === "+") return roundResult(a + b);
  if (operator === "-") return roundResult(a - b);
  if (operator === "*") return roundResult(a * b);
  if (operator === "/") return b === 0 ? 0 : roundResult(a / b);
  return b;
}

function roundResult(value) {
  return Math.round(value * 100000000) / 100000000;
}

function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  if (Number.isInteger(num)) return String(num);
  return String(num).replace(/0+$/, "").replace(/\.$/, "");
}

function symbolForOperator(operator) {
  if (operator === "/") return "÷";
  if (operator === "*") return "×";
  if (operator === "-") return "−";
  return "＋";
}

function render() {
  const expression =
    state.previous !== null && state.operator
      ? `${formatNumber(state.previous)} ${symbolForOperator(state.operator)}`
      : "0";

  els.expressionLabel.textContent = expression;
  els.resultLabel.textContent = state.current;
  els.historyLabel.textContent = `履歴: ${state.lastHistory || "なし"}`;
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
