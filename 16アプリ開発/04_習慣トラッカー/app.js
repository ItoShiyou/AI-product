const STORAGE_KEY_HABITS = "habit-tracker.habits.v1";
const STORAGE_KEY_THEME = "habit-tracker.theme.v1";

const state = {
  habits: [],
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth() + 1,
};

const els = {
  habitInput: document.getElementById("habitInput"),
  addHabitBtn: document.getElementById("addHabitBtn"),
  statusMessage: document.getElementById("statusMessage"),
  prevMonthBtn: document.getElementById("prevMonthBtn"),
  nextMonthBtn: document.getElementById("nextMonthBtn"),
  monthLabel: document.getElementById("monthLabel"),
  summaryLabel: document.getElementById("summaryLabel"),
  habitList: document.getElementById("habitList"),
  emptyState: document.getElementById("emptyState"),
  themeToggle: document.getElementById("themeToggle"),
};

init();

function init() {
  loadTheme();
  state.habits = loadHabits();
  bindEvents();
  render();
}

function bindEvents() {
  els.addHabitBtn.addEventListener("click", addHabitFromInput);
  els.habitInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addHabitFromInput();
  });

  els.prevMonthBtn.addEventListener("click", () => shiftMonth(-1));
  els.nextMonthBtn.addEventListener("click", () => shiftMonth(1));
  els.themeToggle.addEventListener("click", toggleTheme);
}

function addHabitFromInput() {
  const name = els.habitInput.value.trim();
  if (!name) {
    setStatus("習慣名を入力してください");
    return;
  }

  state.habits.unshift({
    id: createHabitId(),
    name: name.slice(0, 40),
    logs: {},
    createdAt: Date.now(),
  });

  persistHabits();
  els.habitInput.value = "";
  setStatus("習慣を追加しました");
  render();
}

function toggleToday(id) {
  const today = getDateString(new Date());
  state.habits = state.habits.map((habit) => {
    if (habit.id !== id) return habit;
    const nextLogs = { ...habit.logs };
    if (nextLogs[today]) {
      delete nextLogs[today];
    } else {
      nextLogs[today] = true;
    }
    return { ...habit, logs: nextLogs };
  });

  persistHabits();
  render();
}

function deleteHabit(id) {
  state.habits = state.habits.filter((habit) => habit.id !== id);
  persistHabits();
  setStatus("習慣を削除しました");
  render();
}

function shiftMonth(delta) {
  let nextMonth = state.viewMonth + delta;
  let nextYear = state.viewYear;

  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  } else if (nextMonth < 1) {
    nextMonth = 12;
    nextYear -= 1;
  }

  state.viewMonth = nextMonth;
  state.viewYear = nextYear;
  render();
}

function render() {
  const monthPrefix = getMonthPrefix(state.viewYear, state.viewMonth);
  els.monthLabel.textContent = `${state.viewYear}年${state.viewMonth}月`;

  els.habitList.innerHTML = "";
  state.habits.forEach((habit) => {
    els.habitList.appendChild(createHabitElement(habit, monthPrefix));
  });

  const totalDone = state.habits.reduce((sum, habit) => {
    return sum + countMonthlyDone(habit.logs, monthPrefix);
  }, 0);

  els.summaryLabel.textContent = `${state.habits.length}習慣 / 今月達成${totalDone}回`;
  els.emptyState.style.display = state.habits.length ? "none" : "block";
}

function createHabitElement(habit, monthPrefix) {
  const li = document.createElement("li");
  li.className = "habit-item";

  const top = document.createElement("div");
  top.className = "habit-top";

  const name = document.createElement("p");
  name.className = "habit-name";
  name.textContent = habit.name;

  const todayBtn = document.createElement("button");
  todayBtn.type = "button";
  todayBtn.className = "today-btn";
  const today = getDateString(new Date());
  const todayDone = Boolean(habit.logs[today]);
  if (todayDone) todayBtn.classList.add("is-done");
  todayBtn.textContent = todayDone ? "達成済み" : "今日達成";
  todayBtn.addEventListener("click", () => toggleToday(habit.id));

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "delete-btn";
  delBtn.setAttribute("aria-label", "習慣を削除する");
  delBtn.textContent = "×";
  delBtn.addEventListener("click", () => deleteHabit(habit.id));

  top.append(name, todayBtn, delBtn);

  const progress = document.createElement("p");
  progress.className = "progress-label";
  const days = getDaysInMonth(state.viewYear, state.viewMonth);
  const doneCount = countMonthlyDone(habit.logs, monthPrefix);
  progress.textContent = `今月 ${doneCount} / ${days}日`;

  const strip = document.createElement("div");
  strip.className = "day-strip";

  for (let day = 1; day <= days; day += 1) {
    const dateKey = `${monthPrefix}-${String(day).padStart(2, "0")}`;
    const dot = document.createElement("span");
    dot.className = "day-dot";
    dot.textContent = String(day);
    if (habit.logs[dateKey]) {
      dot.classList.add("is-done");
    }
    if (dateKey === getDateString(new Date())) {
      dot.classList.add("is-today");
    }
    strip.appendChild(dot);
  }

  li.append(top, progress, strip);
  return li;
}

function countMonthlyDone(logs, monthPrefix) {
  return Object.keys(logs).filter((key) => key.startsWith(monthPrefix)).length;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getMonthPrefix(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function setStatus(message) {
  els.statusMessage.textContent = message;
}

function createHabitId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadHabits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HABITS);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((habit) => {
        const rawLogs = typeof habit?.logs === "object" && habit.logs ? habit.logs : {};
        const logs = {};
        Object.keys(rawLogs).forEach((key) => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(key) && rawLogs[key]) {
            logs[key] = true;
          }
        });
        return {
          id: typeof habit?.id === "string" ? habit.id : createHabitId(),
          name: typeof habit?.name === "string" ? habit.name.trim().slice(0, 40) : "",
          logs,
          createdAt: Number.isFinite(habit?.createdAt) ? habit.createdAt : Date.now(),
        };
      })
      .filter((habit) => habit.name);
  } catch {
    return [];
  }
}

function persistHabits() {
  localStorage.setItem(STORAGE_KEY_HABITS, JSON.stringify(state.habits));
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
