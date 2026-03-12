const STORAGE_KEY_ITEMS = "simple-checklist.items.v1";
const STORAGE_KEY_THEME = "simple-checklist.theme.v1";

const state = {
  items: [],
  filter: "all",
};

const els = {
  itemInput: document.getElementById("itemInput"),
  addItemBtn: document.getElementById("addItemBtn"),
  checklist: document.getElementById("checklist"),
  emptyState: document.getElementById("emptyState"),
  statsLabel: document.getElementById("statsLabel"),
  statusMessage: document.getElementById("statusMessage"),
  resetDoneBtn: document.getElementById("resetDoneBtn"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  themeToggle: document.getElementById("themeToggle"),
  filterButtons: Array.from(document.querySelectorAll(".filter-btn")),
};

init();

function init() {
  loadTheme();
  state.items = loadItems();
  bindEvents();
  render();
}

function bindEvents() {
  els.addItemBtn.addEventListener("click", addItemFromInput);
  els.itemInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addItemFromInput();
  });

  els.resetDoneBtn.addEventListener("click", resetDone);
  els.clearAllBtn.addEventListener("click", clearAll);
  els.themeToggle.addEventListener("click", toggleTheme);

  els.filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.filter;
      if (!next || next === state.filter) return;
      state.filter = next;
      renderFilterUI();
      render();
    });
  });
}

function addItemFromInput() {
  const text = els.itemInput.value.trim();
  if (!text) {
    setStatus("項目を入力してください");
    return;
  }

  state.items.unshift({
    id: createItemId(),
    text: text.slice(0, 80),
    done: false,
    createdAt: Date.now(),
  });

  persistItems();
  els.itemInput.value = "";
  setStatus("項目を追加しました");
  render();
}

function toggleDone(id) {
  state.items = state.items.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      done: !item.done,
    };
  });

  persistItems();
  render();
}

function deleteItem(id) {
  state.items = state.items.filter((item) => item.id !== id);
  persistItems();
  setStatus("項目を削除しました");
  render();
}

function resetDone() {
  const doneCount = state.items.filter((item) => item.done).length;
  if (!doneCount) {
    setStatus("完了済み項目はありません");
    return;
  }

  state.items = state.items.map((item) => ({ ...item, done: false }));
  persistItems();
  setStatus("完了状態をリセットしました");
  render();
}

function clearAll() {
  if (!state.items.length) {
    setStatus("削除する項目がありません");
    return;
  }

  const accepted = window.confirm("すべての項目を削除します。よろしいですか？");
  if (!accepted) return;

  state.items = [];
  persistItems();
  setStatus("すべて削除しました");
  render();
}

function render() {
  const visibleItems = getVisibleItems();
  const doneCount = state.items.filter((item) => item.done).length;

  els.checklist.innerHTML = "";
  visibleItems.forEach((item) => {
    els.checklist.append(createItemElement(item));
  });

  els.emptyState.style.display = visibleItems.length ? "none" : "block";
  els.statsLabel.textContent = `${state.items.length}件 / 完了${doneCount}件`;
}

function renderFilterUI() {
  els.filterButtons.forEach((button) => {
    const active = button.dataset.filter === state.filter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function getVisibleItems() {
  if (state.filter === "active") {
    return state.items.filter((item) => !item.done);
  }
  if (state.filter === "done") {
    return state.items.filter((item) => item.done);
  }
  return state.items;
}

function createItemElement(item) {
  const li = document.createElement("li");
  li.className = `check-item ${item.done ? "is-done" : ""}`.trim();

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "check-toggle";
  toggle.setAttribute("aria-label", item.done ? "未完了に戻す" : "完了にする");
  toggle.addEventListener("click", () => toggleDone(item.id));

  const text = document.createElement("p");
  text.className = "check-text";
  text.textContent = item.text;

  const del = document.createElement("button");
  del.type = "button";
  del.className = "item-delete";
  del.setAttribute("aria-label", "項目を削除する");
  del.textContent = "×";
  del.addEventListener("click", () => deleteItem(item.id));

  li.append(toggle, text, del);
  return li;
}

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ITEMS);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        id: typeof item?.id === "string" ? item.id : createItemId(),
        text: typeof item?.text === "string" ? item.text.trim().slice(0, 80) : "",
        done: Boolean(item?.done),
        createdAt: Number.isFinite(item?.createdAt) ? item.createdAt : Date.now(),
      }))
      .filter((item) => item.text);
  } catch {
    return [];
  }
}

function persistItems() {
  localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(state.items));
}

function setStatus(message) {
  els.statusMessage.textContent = message;
}

function createItemId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
