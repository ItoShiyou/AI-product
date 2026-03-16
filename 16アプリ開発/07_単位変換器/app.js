const STORAGE_KEY_THEME = "unit-converter.theme.v1";

const UNIT_DEFS = {
  length: {
    label: "長さ",
    units: [
      { key: "m", label: "メートル (m)", factor: 1 },
      { key: "km", label: "キロメートル (km)", factor: 1000 },
      { key: "cm", label: "センチメートル (cm)", factor: 0.01 },
      { key: "mm", label: "ミリメートル (mm)", factor: 0.001 },
      { key: "in", label: "インチ (in)", factor: 0.0254 },
      { key: "ft", label: "フィート (ft)", factor: 0.3048 },
    ],
  },
  weight: {
    label: "重さ",
    units: [
      { key: "kg", label: "キログラム (kg)", factor: 1 },
      { key: "g", label: "グラム (g)", factor: 0.001 },
      { key: "mg", label: "ミリグラム (mg)", factor: 0.000001 },
      { key: "lb", label: "ポンド (lb)", factor: 0.45359237 },
      { key: "oz", label: "オンス (oz)", factor: 0.028349523125 },
    ],
  },
  area: {
    label: "面積",
    units: [
      { key: "sqm", label: "平方メートル (m²)", factor: 1 },
      { key: "sqkm", label: "平方キロメートル (km²)", factor: 1000000 },
      { key: "ha", label: "ヘクタール (ha)", factor: 10000 },
      { key: "tsubo", label: "坪", factor: 3.305785124 },
      { key: "sqft", label: "平方フィート (ft²)", factor: 0.09290304 },
    ],
  },
};

const state = {
  category: "length",
  fromUnit: "m",
  toUnit: "km",
  fromValue: "",
};

const els = {
  categorySelect: document.getElementById("categorySelect"),
  fromUnitSelect: document.getElementById("fromUnitSelect"),
  toUnitSelect: document.getElementById("toUnitSelect"),
  fromValueInput: document.getElementById("fromValueInput"),
  swapBtn: document.getElementById("swapBtn"),
  resultValue: document.getElementById("resultValue"),
  resultFormula: document.getElementById("resultFormula"),
  statusMessage: document.getElementById("statusMessage"),
  themeToggle: document.getElementById("themeToggle"),
};

init();

function init() {
  loadTheme();
  bindEvents();
  populateUnitOptions();
  render();
}

function bindEvents() {
  els.categorySelect.addEventListener("change", (event) => {
    state.category = event.target.value;
    const units = UNIT_DEFS[state.category].units;
    state.fromUnit = units[0].key;
    state.toUnit = units[1]?.key || units[0].key;
    populateUnitOptions();
    render();
  });

  els.fromUnitSelect.addEventListener("change", (event) => {
    state.fromUnit = event.target.value;
    render();
  });

  els.toUnitSelect.addEventListener("change", (event) => {
    state.toUnit = event.target.value;
    render();
  });

  els.fromValueInput.addEventListener("input", (event) => {
    state.fromValue = event.target.value;
    render();
  });

  els.swapBtn.addEventListener("click", () => {
    const nextFromUnit = state.toUnit;
    const nextToUnit = state.fromUnit;
    state.fromUnit = nextFromUnit;
    state.toUnit = nextToUnit;
    els.fromUnitSelect.value = state.fromUnit;
    els.toUnitSelect.value = state.toUnit;
    render();
  });

  els.themeToggle.addEventListener("click", toggleTheme);
}

function populateUnitOptions() {
  const units = UNIT_DEFS[state.category].units;

  els.fromUnitSelect.innerHTML = "";
  els.toUnitSelect.innerHTML = "";

  units.forEach((unit) => {
    const fromOption = document.createElement("option");
    fromOption.value = unit.key;
    fromOption.textContent = unit.label;

    const toOption = document.createElement("option");
    toOption.value = unit.key;
    toOption.textContent = unit.label;

    els.fromUnitSelect.appendChild(fromOption);
    els.toUnitSelect.appendChild(toOption);
  });

  els.categorySelect.value = state.category;
  els.fromUnitSelect.value = state.fromUnit;
  els.toUnitSelect.value = state.toUnit;
}

function render() {
  const fromNumber = Number(state.fromValue);
  if (!state.fromValue || !Number.isFinite(fromNumber)) {
    els.resultValue.textContent = "0";
    els.resultFormula.textContent = "変換式: -";
    setStatus("数値を入力してください");
    return;
  }

  const units = UNIT_DEFS[state.category].units;
  const fromDef = units.find((unit) => unit.key === state.fromUnit);
  const toDef = units.find((unit) => unit.key === state.toUnit);
  if (!fromDef || !toDef) {
    els.resultValue.textContent = "0";
    els.resultFormula.textContent = "変換式: -";
    setStatus("単位設定が不正です");
    return;
  }

  const baseValue = fromNumber * fromDef.factor;
  const converted = baseValue / toDef.factor;

  els.resultValue.textContent = `${formatNumber(converted)} ${toDef.key}`;
  els.resultFormula.textContent = `変換式: ${formatNumber(fromNumber)} ${fromDef.key} × ${fromDef.factor} ÷ ${toDef.factor}`;
  setStatus(`${UNIT_DEFS[state.category].label}を変換しました`);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("ja-JP", { maximumFractionDigits: 10 });
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
