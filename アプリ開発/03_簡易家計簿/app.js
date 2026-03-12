const STORAGE_KEY_ENTRIES = "kakeibo.entries.v1";
const STORAGE_KEY_THEME = "kakeibo.theme.v1";

const state = {
  entries: [],
  selectedType: "expense",
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth() + 1, // 1-indexed
};

const els = {
  themeToggle: document.getElementById("themeToggle"),
  prevMonthBtn: document.getElementById("prevMonthBtn"),
  nextMonthBtn: document.getElementById("nextMonthBtn"),
  currentMonthLabel: document.getElementById("currentMonthLabel"),
  balanceAmount: document.getElementById("balanceAmount"),
  totalIncome: document.getElementById("totalIncome"),
  totalExpense: document.getElementById("totalExpense"),
  typeButtons: Array.from(document.querySelectorAll(".type-btn")),
  amountInput: document.getElementById("amountInput"),
  categoryInput: document.getElementById("categoryInput"),
  dateInput: document.getElementById("dateInput"),
  addEntryBtn: document.getElementById("addEntryBtn"),
  statusMessage: document.getElementById("statusMessage"),
  entryList: document.getElementById("entryList"),
  entryCount: document.getElementById("entryCount"),
  emptyState: document.getElementById("emptyState"),
};

init();

function init() {
  loadTheme();
  state.entries = loadEntries();
  setDefaultDate();
  bindEvents();
  render();
}

function bindEvents() {
  els.themeToggle.addEventListener("click", toggleTheme);

  els.prevMonthBtn.addEventListener("click", () => {
    shiftMonth(-1);
  });
  els.nextMonthBtn.addEventListener("click", () => {
    shiftMonth(1);
  });

  els.typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.dataset.type;
      if (!next || next === state.selectedType) return;
      state.selectedType = next;
      renderTypeSelector();
    });
  });

  els.addEntryBtn.addEventListener("click", addEntryFromInput);

  els.amountInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      els.categoryInput.focus();
    }
  });

  els.categoryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEntryFromInput();
    }
  });
}

// ===== Entry Operations =====

function addEntryFromInput() {
  const rawAmount = els.amountInput.value.trim();
  const category = els.categoryInput.value.trim();
  const date = els.dateInput.value;

  const amount = Number(rawAmount);

  if (!rawAmount || !Number.isFinite(amount) || amount <= 0) {
    setStatus("正しい金額を入力してください");
    els.amountInput.focus();
    return;
  }
  if (!category) {
    setStatus("項目を入力してください");
    els.categoryInput.focus();
    return;
  }
  if (!date) {
    setStatus("日付を選択してください");
    els.dateInput.focus();
    return;
  }

  const entry = {
    id: createEntryId(),
    type: state.selectedType,
    amount: Math.round(amount),
    category: category.slice(0, 30),
    date,
    createdAt: Date.now(),
  };

  state.entries.unshift(entry);
  persistEntries();

  // Update view month to match the entered date so user sees the new entry
  const [entryYear, entryMonth] = date.split("-").map(Number);
  state.viewYear = entryYear;
  state.viewMonth = entryMonth;

  els.amountInput.value = "";
  els.categoryInput.value = "";
  setStatus(
    `${entry.type === "income" ? "収入" : "支出"}「${entry.category}」を追加しました`
  );
  render();
  els.amountInput.focus();
}

function deleteEntry(id) {
  state.entries = state.entries.filter((e) => e.id !== id);
  persistEntries();
  setStatus("記録を削除しました");
  render();
}

// ===== Rendering =====

function render() {
  renderSummary();
  renderList();
}

function renderSummary() {
  const monthEntries = getMonthEntries();

  const income = monthEntries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);
  const expense = monthEntries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);
  const balance = income - expense;

  els.currentMonthLabel.textContent = `${state.viewYear}年${state.viewMonth}月`;
  els.totalIncome.textContent = formatYen(income);
  els.totalExpense.textContent = formatYen(expense);
  els.balanceAmount.textContent = formatYen(Math.abs(balance));

  els.balanceAmount.classList.remove("is-positive", "is-negative");
  if (balance > 0) {
    els.balanceAmount.classList.add("is-positive");
  } else if (balance < 0) {
    els.balanceAmount.classList.add("is-negative");
  }
}

function renderList() {
  const monthEntries = getMonthEntries();

  els.entryCount.textContent = `${monthEntries.length}件`;
  els.emptyState.style.display = monthEntries.length ? "none" : "block";
  els.entryList.innerHTML = "";

  if (!monthEntries.length) return;

  // Group by date descending
  const groups = groupByDate(monthEntries);

  groups.forEach(({ date, entries }) => {
    const groupEl = document.createElement("div");
    groupEl.className = "date-group";

    const labelEl = document.createElement("p");
    labelEl.className = "date-group-label";
    labelEl.textContent = formatDateLabel(date);
    groupEl.appendChild(labelEl);

    entries.forEach((entry) => {
      groupEl.appendChild(createEntryElement(entry));
    });

    els.entryList.appendChild(groupEl);
  });
}

function renderTypeSelector() {
  els.typeButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.type === state.selectedType);
  });
}

function createEntryElement(entry) {
  const item = document.createElement("div");
  item.className = `entry-item is-${entry.type}`;

  const dot = document.createElement("span");
  dot.className = "entry-type-dot";
  dot.setAttribute("aria-hidden", "true");

  const category = document.createElement("p");
  category.className = "entry-category";
  category.textContent = entry.category;

  const amount = document.createElement("span");
  amount.className = "entry-amount";
  amount.textContent = (entry.type === "income" ? "+" : "−") + formatYen(entry.amount);

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "entry-delete";
  delBtn.setAttribute("aria-label", "この記録を削除する");
  delBtn.textContent = "×";
  delBtn.addEventListener("click", () => deleteEntry(entry.id));

  item.append(dot, category, amount, delBtn);
  return item;
}

// ===== Month Navigation =====

function shiftMonth(delta) {
  let month = state.viewMonth + delta;
  let year = state.viewYear;

  if (month > 12) {
    month = 1;
    year += 1;
  } else if (month < 1) {
    month = 12;
    year -= 1;
  }

  state.viewYear = year;
  state.viewMonth = month;
  render();
}

// ===== Helpers =====

function getMonthEntries() {
  const prefix = `${state.viewYear}-${String(state.viewMonth).padStart(2, "0")}`;
  return state.entries.filter((e) => e.date.startsWith(prefix));
}

function groupByDate(entries) {
  const map = new Map();
  // Sort by date descending, then createdAt descending within same date
  const sorted = [...entries].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });

  sorted.forEach((entry) => {
    if (!map.has(entry.date)) map.set(entry.date, []);
    map.get(entry.date).push(entry);
  });

  return Array.from(map.entries()).map(([date, entryList]) => ({ date, entries: entryList }));
}

function formatDateLabel(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  return `${month}月${day}日（${dayNames[d.getDay()]}）`;
}

function formatYen(amount) {
  return "¥" + amount.toLocaleString("ja-JP");
}

function setDefaultDate() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  els.dateInput.value = `${y}-${m}-${d}`;
}

function setStatus(message) {
  els.statusMessage.textContent = message;
}

function createEntryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ===== Persistence =====

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENTRIES);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((e) => ({
        id: typeof e?.id === "string" ? e.id : createEntryId(),
        type: e?.type === "income" ? "income" : "expense",
        amount: Number.isFinite(e?.amount) && e.amount > 0 ? Math.round(e.amount) : 0,
        category: typeof e?.category === "string" ? e.category.trim().slice(0, 30) : "",
        date: typeof e?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : "",
        createdAt: Number.isFinite(e?.createdAt) ? e.createdAt : Date.now(),
      }))
      .filter((e) => e.amount > 0 && e.category && e.date);
  } catch {
    return [];
  }
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(state.entries));
}

// ===== Theme =====

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
