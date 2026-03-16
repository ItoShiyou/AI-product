const STORAGE_KEY_MEMOS = "simple-memo.list.v3";
const STORAGE_KEY_MEMOS_V2 = "simple-memo.list.v2";
const STORAGE_KEY_MEMOS_V1 = "simple-memo.list.v1";
const STORAGE_KEY_TRASH = "simple-memo.trash.v1";
const STORAGE_KEY_DRAFT = "simple-memo.draft.v3";
const STORAGE_KEY_DRAFT_V2 = "simple-memo.draft.v2";
const STORAGE_KEY_DRAFT_V1 = "simple-memo.draft.v1";
const STORAGE_KEY_THEME = "simple-memo.theme.v1";
const STORAGE_KEY_PREFS = "simple-memo.prefs.v1";

const SVG_PIN_ON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z"/></svg>`;
const SVG_PIN_OFF = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z"/></svg>`;
const SVG_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const SVG_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;

const state = {
  memos: [],
  trash: [],
  query: "",
  sortBy: "updated-desc",
  tagFilter: "all",
  dateDisplay: "updated-first",
  editingMemoId: null,
  activeTab: "list",
  detailMemoId: null,
};

const TAB_ORDER = ["compose", "list", "tools"];
const SWIPE_MIN_DISTANCE = 40;
const SWIPE_HORIZONTAL_DOMINANCE = 1.2;
const SWIPE_EDITABLE_MIN_DISTANCE = 64;

const els = {
  memoTitleInput: document.getElementById("memoTitleInput"),
  memoBodyInput: document.getElementById("memoBodyInput"),
  memoTagInput: document.getElementById("memoTagInput"),
  tagSuggestions: document.getElementById("tagSuggestions"),
  saveMemo: document.getElementById("saveMemo"),
  clearDraft: document.getElementById("clearDraft"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  tagFilterSelect: document.getElementById("tagFilterSelect"),
  dateDisplaySelect: document.getElementById("dateDisplaySelect"),
  exportJson: document.getElementById("exportJson"),
  importJson: document.getElementById("importJson"),
  importFileInput: document.getElementById("importFileInput"),
  memoList: document.getElementById("memoList"),
  emptyState: document.getElementById("emptyState"),
  clearAll: document.getElementById("clearAll"),
  memoStats: document.getElementById("memoStats"),
  filterToggle: document.getElementById("filterToggle"),
  filterPanel: document.getElementById("filterPanel"),
  editingBadge: document.getElementById("editingBadge"),
  titleCharCounter: document.getElementById("titleCharCounter"),
  bodyCharCounter: document.getElementById("bodyCharCounter"),
  draftStatus: document.getElementById("draftStatus"),
  themeToggle: document.getElementById("themeToggle"),
  trashList: document.getElementById("trashList"),
  trashEmptyState: document.getElementById("trashEmptyState"),
  trashStats: document.getElementById("trashStats"),
  emptyTrash: document.getElementById("emptyTrash"),
  tabBtnCompose: document.getElementById("tabBtnCompose"),
  tabBtnList: document.getElementById("tabBtnList"),
  tabBtnTools: document.getElementById("tabBtnTools"),
  tabPanelCompose: document.getElementById("tabPanelCompose"),
  tabPanelList: document.getElementById("tabPanelList"),
  tabPanelTools: document.getElementById("tabPanelTools"),
  appShell: document.querySelector(".app-shell"),
  mainContent: document.querySelector(".main-content"),
  composePanelTitle: document.getElementById("composePanelTitle"),
  memoDetail: document.getElementById("memoDetail"),
  detailBack: document.getElementById("detailBack"),
  detailEdit: document.getElementById("detailEdit"),
  detailDelete: document.getElementById("detailDelete"),
  detailTitle: document.getElementById("detailTitle"),
  detailTag: document.getElementById("detailTag"),
  detailMeta: document.getElementById("detailMeta"),
  detailContent: document.getElementById("detailContent"),
};

init();

function init() {
  loadTheme();
  loadPrefs();
  state.memos = loadMemos();
  state.trash = loadTrash();
  loadDraft();
  bindEvents();
  render();
}

function bindEvents() {
  els.saveMemo.addEventListener("click", handleSaveMemo);
  els.clearDraft.addEventListener("click", clearDraft);
  els.searchInput.addEventListener("input", handleSearchInput);
  els.sortSelect.addEventListener("change", handleSortChange);
  els.tagFilterSelect.addEventListener("change", handleTagFilterChange);
  els.dateDisplaySelect.addEventListener("change", handleDateDisplayChange);
  els.clearAll.addEventListener("click", clearAllMemos);
  els.emptyTrash.addEventListener("click", handleEmptyTrash);
  els.memoTitleInput.addEventListener("input", handleDraftInput);
  els.memoBodyInput.addEventListener("input", handleDraftInput);
  els.memoTagInput.addEventListener("input", handleDraftInput);
  els.memoBodyInput.addEventListener("keydown", handleComposerShortcut);
  els.tabBtnCompose.addEventListener("click", () => switchTab("compose"));
  els.tabBtnList.addEventListener("click", () => switchTab("list"));
  els.tabBtnTools.addEventListener("click", () => switchTab("tools"));
  els.filterToggle.addEventListener("click", handleFilterToggle);
  els.themeToggle.addEventListener("click", toggleTheme);
  els.exportJson.addEventListener("click", exportJson);
  els.importJson.addEventListener("click", () => els.importFileInput.click());
  els.importFileInput.addEventListener("change", importJson);
  els.detailBack.addEventListener("click", closeDetail);
  bindSwipeTabSwitch();
  els.detailEdit.addEventListener("click", () => {
    const id = state.detailMemoId;
    closeDetail();
    startEditMemo(id);
  });
  els.detailDelete.addEventListener("click", () => {
    const id = state.detailMemoId;
    const memo = state.memos.find((m) => m.id === id);
    if (!memo) return;
    const accepted = window.confirm(`「${memo.title}」をごみ筱へ移動しますか？`);
    if (!accepted) return;
    closeDetail();
    removeMemoById(id);
  });
}

function bindSwipeTabSwitch() {
  if (!els.appShell) return;

  const swipe = {
    active: false,
    startX: 0,
    startY: 0,
    target: null,
  };

  const onTouchStart = (event) => {
    if (!event.touches?.length || els.memoDetail.classList.contains("is-open")) {
      return;
    }

    const touch = event.touches[0];
    swipe.active = true;
    swipe.startX = touch.clientX;
    swipe.startY = touch.clientY;
    swipe.target = event.target;
  };

  const onTouchEnd = (event) => {
    if (!swipe.active || !event.changedTouches?.length) {
      swipe.active = false;
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipe.startX;
    const deltaY = touch.clientY - swipe.startY;

    const startedOnEditable = Boolean(
      swipe.target?.closest("input, textarea, select, [contenteditable='true']")
    );
    const isHorizontalSwipe = Math.abs(deltaX) >= SWIPE_MIN_DISTANCE;
    const isHorizontalDominant = Math.abs(deltaX) > Math.abs(deltaY) * SWIPE_HORIZONTAL_DOMINANCE;
    const canSwipeFromEditable = !startedOnEditable || Math.abs(deltaX) >= SWIPE_EDITABLE_MIN_DISTANCE;

    if (isHorizontalSwipe && isHorizontalDominant && canSwipeFromEditable) {
      if (deltaX < 0) {
        moveTab(1);
      } else {
        moveTab(-1);
      }
    }

    swipe.active = false;
  };

  const onTouchCancel = () => {
    swipe.active = false;
  };

  els.appShell.addEventListener("touchstart", onTouchStart, { passive: true });
  els.appShell.addEventListener("touchend", onTouchEnd, { passive: true });
  els.appShell.addEventListener("touchcancel", onTouchCancel, { passive: true });
}

function moveTab(step) {
  const currentIndex = TAB_ORDER.indexOf(state.activeTab);
  if (currentIndex === -1) return;
  const nextIndex = currentIndex + step;
  if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) return;
  switchTab(TAB_ORDER[nextIndex]);
}

function handleSaveMemo() {
  const title = els.memoTitleInput.value.trim();
  const body = els.memoBodyInput.value.trim();
  const tag = normalizeTag(els.memoTagInput.value);
  const wasEditing = state.editingMemoId !== null;

  if (!title && !body) {
    setDraftStatus("タイトルまたは本文を入力してください");
    return;
  }

  if (state.editingMemoId) {
    state.memos = state.memos.map((memo) => {
      if (memo.id !== state.editingMemoId) {
        return memo;
      }
      return {
        ...memo,
        title: title || "無題メモ",
        body,
        tag,
        updatedAt: Date.now(),
      };
    });
  } else {
    const now = Date.now();
    state.memos.unshift({
      id: createMemoId(),
      title: title || "無題メモ",
      body,
      tag,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  persistMemos();
  resetComposer();
  setDraftStatus(wasEditing ? "メモを更新しました" : "メモを保存しました");
  render();
  switchTab("list");
}

function handleDraftInput() {
  const draft = {
    title: els.memoTitleInput.value,
    body: els.memoBodyInput.value,
    tag: normalizeTag(els.memoTagInput.value),
  };
  localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(draft));
  updateCharCounters();
  setDraftStatus("下書きを自動保存しました");
}

function clearDraft() {
  const editing = state.editingMemoId !== null;
  resetComposer();
  setDraftStatus(editing ? "編集をキャンセルしました" : "下書きをクリアしました");
}

function handleSearchInput(event) {
  state.query = event.target.value.trim().toLowerCase();
  render();
}

function handleSortChange(event) {
  state.sortBy = event.target.value;
  persistPrefs();
  render();
}

function handleTagFilterChange(event) {
  state.tagFilter = event.target.value;
  render();
}

function handleDateDisplayChange(event) {
  state.dateDisplay = event.target.value;
  persistPrefs();
  render();
}

function handleComposerShortcut(event) {
  const isEnterWithModifier = event.key === "Enter" && (event.metaKey || event.ctrlKey);
  if (!isEnterWithModifier) {
    return;
  }
  event.preventDefault();
  handleSaveMemo();
}

function clearAllMemos() {
  if (!state.memos.length) {
    return;
  }

  const accepted = window.confirm("すべてのメモをごみ箱へ移動します。よろしいですか？");
  if (!accepted) {
    return;
  }

  const now = Date.now();
  const moved = state.memos.map((memo) => ({ ...memo, deletedAt: now }));
  state.trash = [...moved, ...state.trash];
  state.memos = [];

  if (state.editingMemoId) {
    resetComposer();
  }

  if (state.detailMemoId) {
    closeDetail();
  }

  persistMemos();
  persistTrash();
  setDraftStatus("すべてのメモをごみ箱へ移動しました");
  render();
  switchTab("list");
}

function removeMemoById(memoId) {
  const target = state.memos.find((memo) => memo.id === memoId);
  if (!target) {
    return;
  }

  state.memos = state.memos.filter((memo) => memo.id !== memoId);
  state.trash.unshift({ ...target, deletedAt: Date.now() });

  if (state.editingMemoId === memoId) {
    resetComposer();
    setDraftStatus("編集中のメモをごみ箱へ移動しました");
  }
  if (state.detailMemoId === memoId) {
    closeDetail();
  }
  persistMemos();
  persistTrash();
  render();
}

function restoreMemoFromTrash(memoId) {
  const target = state.trash.find((memo) => memo.id === memoId);
  if (!target) {
    return;
  }

  state.trash = state.trash.filter((memo) => memo.id !== memoId);
  const restored = { ...target };
  delete restored.deletedAt;
  restored.updatedAt = Date.now();
  state.memos.unshift(restored);

  persistMemos();
  persistTrash();
  render();
}

function permanentlyDeleteFromTrash(memoId) {
  state.trash = state.trash.filter((memo) => memo.id !== memoId);
  persistTrash();
  render();
}

function handleEmptyTrash() {
  if (!state.trash.length) {
    return;
  }

  const accepted = window.confirm("ごみ箱を空にすると復元できません。よろしいですか？");
  if (!accepted) {
    return;
  }

  state.trash = [];
  persistTrash();
  render();
}

function togglePinMemo(memoId) {
  state.memos = state.memos.map((memo) => {
    if (memo.id !== memoId) {
      return memo;
    }

    return {
      ...memo,
      pinned: !memo.pinned,
      updatedAt: Date.now(),
    };
  });

  persistMemos();
  render();
}

function openMemoDetail(memoId) {
  const memo = state.memos.find((m) => m.id === memoId);
  if (!memo) return;
  state.detailMemoId = memoId;
  els.detailTitle.textContent = memo.title;
  els.detailContent.textContent = memo.body || "";
  els.detailMeta.textContent = formatMemoMeta(memo, state.dateDisplay);
  if (memo.tag) {
    els.detailTag.textContent = memo.tag;
    els.detailTag.hidden = false;
  } else {
    els.detailTag.hidden = true;
  }
  els.memoDetail.classList.add("is-open");
}

function closeDetail() {
  state.detailMemoId = null;
  els.memoDetail.classList.remove("is-open");
}

function startEditMemo(memoId) {
  const target = state.memos.find((memo) => memo.id === memoId);
  if (!target) {
    return;
  }

  state.editingMemoId = memoId;
  els.memoTitleInput.value = target.title;
  els.memoBodyInput.value = target.body;
  els.memoTagInput.value = normalizeTag(target.tag);
  updateCharCounters();
  updateComposerUI();
  setDraftStatus("編集中です。保存すると上書きします");
  switchTab("compose");
  els.memoTitleInput.focus();
}

function exportJson() {
  const payload = {
    version: 1,
    exportedAt: Date.now(),
    memos: state.memos,
    trash: state.trash,
    prefs: {
      sortBy: state.sortBy,
      dateDisplay: state.dateDisplay,
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const fileName = `simple-memo-backup-${formatDateForFileName(Date.now())}.json`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  setDraftStatus("JSONを書き出しました");
}

async function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    const importedMemos = Array.isArray(parsed?.memos) ? parsed.memos.map(normalizeMemo) : [];
    const importedTrash = Array.isArray(parsed?.trash) ? parsed.trash.map(normalizeTrashMemo) : [];

    if (!importedMemos.length && !importedTrash.length) {
      window.alert("有効なメモデータが見つかりませんでした。");
      return;
    }

    const replace = window.confirm("現在のデータを置き換えますか？\nOK: 置換 / キャンセル: 追加取り込み");
    if (replace) {
      state.memos = importedMemos;
      state.trash = importedTrash;
    } else {
      state.memos = mergeById(state.memos, importedMemos);
      state.trash = mergeById(state.trash, importedTrash);
    }

    persistMemos();
    persistTrash();
    setDraftStatus("JSONを読み込みました");
    render();
  } catch {
    window.alert("JSONの読み込みに失敗しました。形式を確認してください。");
  } finally {
    els.importFileInput.value = "";
  }
}

function render() {
  const filtered = sortMemos(filterMemos(state.memos, state.query, state.tagFilter), state.sortBy);

  els.memoList.innerHTML = "";
  filtered.forEach((memo) => {
    els.memoList.append(createMemoListItem(memo));
  });

  els.trashList.innerHTML = "";
  state.trash.forEach((memo) => {
    els.trashList.append(createTrashListItem(memo));
  });

  els.emptyState.style.display = filtered.length ? "none" : "block";
  els.trashEmptyState.style.display = state.trash.length ? "none" : "block";
  els.memoStats.textContent = `${filtered.length}件 / 全${state.memos.length}件`;
  els.trashStats.textContent = `${state.trash.length}件`;
  updateTagUI();
  updateComposerUI();
}

function createMemoListItem(memo) {
  const li = document.createElement("li");
  li.className = "memo-item";
  li.addEventListener("click", (e) => {
    if (!e.target.closest("button")) {
      openMemoDetail(memo.id);
    }
  });

  // 左列: ピンボタン
  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = `memo-pin ${memo.pinned ? "is-pinned" : ""}`.trim();
  pin.innerHTML = memo.pinned ? SVG_PIN_ON : SVG_PIN_OFF;
  pin.setAttribute("aria-label", memo.pinned ? "固定を解除する" : "固定する");
  pin.addEventListener("click", () => togglePinMemo(memo.id));

  // 右列: 本文エリア
  const bodyCol = document.createElement("div");
  bodyCol.className = "memo-body-col";

  const titleRow = document.createElement("div");
  titleRow.className = "memo-title-row";

  const title = document.createElement("h3");
  title.className = "memo-title";
  title.textContent = memo.title;
  titleRow.append(title);

  if (memo.tag) {
    const tag = document.createElement("span");
    tag.className = "tag-pill";
    tag.textContent = memo.tag;
    titleRow.append(tag);
  }

  const body = document.createElement("p");
  body.className = "memo-content";
  body.textContent = memo.body;

  const bottom = document.createElement("div");
  bottom.className = "memo-bottom";

  const meta = document.createElement("span");
  meta.className = "memo-meta";
  meta.textContent = formatMemoMeta(memo, state.dateDisplay);

  const actions = document.createElement("div");
  actions.className = "memo-actions";

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "memo-edit";
  edit.innerHTML = SVG_EDIT;
  edit.setAttribute("aria-label", "編集する");
  edit.addEventListener("click", () => startEditMemo(memo.id));

  const del = document.createElement("button");
  del.type = "button";
  del.className = "memo-delete";
  del.innerHTML = SVG_TRASH;
  del.setAttribute("aria-label", "ごみ箱へ移動する");
  del.addEventListener("click", () => removeMemoById(memo.id));

  actions.append(edit, del);
  bottom.append(meta, actions);
  bodyCol.append(titleRow, body, bottom);
  li.append(pin, bodyCol);
  return li;
}

function createTrashListItem(memo) {
  const li = document.createElement("li");
  li.className = "memo-item trash-item";

  const title = document.createElement("h3");
  title.className = "memo-title";
  title.textContent = memo.title;

  const meta = document.createElement("span");
  meta.className = "memo-meta";
  meta.textContent = formatRelativeTime(memo.deletedAt || Date.now());

  const actions = document.createElement("div");
  actions.className = "memo-actions";

  const restore = document.createElement("button");
  restore.type = "button";
  restore.className = "memo-edit";
  restore.textContent = "復元";
  restore.addEventListener("click", () => restoreMemoFromTrash(memo.id));

  const erase = document.createElement("button");
  erase.type = "button";
  erase.className = "memo-delete";
  erase.textContent = "完全削除";
  erase.addEventListener("click", () => permanentlyDeleteFromTrash(memo.id));

  actions.append(restore, erase);
  li.append(title, meta, actions);
  return li;
}

function filterMemos(memos, query, tagFilter) {
  return memos.filter((memo) => {
    const searchable = `${memo.title} ${memo.body} ${memo.tag || ""}`.toLowerCase();
    const queryMatched = !query || searchable.includes(query);
    const tagMatched =
      tagFilter === "all" ||
      (tagFilter === "none" && !memo.tag) ||
      (tagFilter !== "none" && memo.tag === tagFilter);

    return queryMatched && tagMatched;
  });
}

function sortMemos(memos, sortBy) {
  return [...memos].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }

    if (sortBy === "updated-asc") {
      return a.updatedAt - b.updatedAt;
    }

    if (sortBy === "title-asc") {
      return a.title.localeCompare(b.title, "ja");
    }

    return b.updatedAt - a.updatedAt;
  });
}

function loadMemos() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY_MEMOS) ||
      localStorage.getItem(STORAGE_KEY_MEMOS_V2) ||
      localStorage.getItem(STORAGE_KEY_MEMOS_V1);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeMemo);
  } catch {
    return [];
  }
}

function loadTrash() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRASH);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeTrashMemo);
  } catch {
    return [];
  }
}

function loadDraft() {
  const raw = localStorage.getItem(STORAGE_KEY_DRAFT);
  const rawV2 = localStorage.getItem(STORAGE_KEY_DRAFT_V2);
  const rawV1 = localStorage.getItem(STORAGE_KEY_DRAFT_V1);

  if (raw || rawV2) {
    try {
      const draft = JSON.parse(raw || rawV2);
      els.memoTitleInput.value = typeof draft.title === "string" ? draft.title : "";
      els.memoBodyInput.value = typeof draft.body === "string" ? draft.body : "";
      els.memoTagInput.value = typeof draft.tag === "string" ? draft.tag : "";
    } catch {
      resetComposer();
    }
  } else if (rawV1) {
    els.memoBodyInput.value = rawV1;
  }

  updateCharCounters();
  if (els.memoTitleInput.value || els.memoBodyInput.value) {
    setDraftStatus("前回の下書きを復元しました");
  }
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFS);
    const prefs = JSON.parse(raw || "{}");
    state.sortBy = typeof prefs.sortBy === "string" ? prefs.sortBy : state.sortBy;
    state.dateDisplay = typeof prefs.dateDisplay === "string" ? prefs.dateDisplay : state.dateDisplay;
  } catch {
    state.sortBy = "updated-desc";
    state.dateDisplay = "updated-first";
  }

  els.sortSelect.value = state.sortBy;
  els.dateDisplaySelect.value = state.dateDisplay;
}

function persistMemos() {
  localStorage.setItem(STORAGE_KEY_MEMOS, JSON.stringify(state.memos));
}

function persistTrash() {
  localStorage.setItem(STORAGE_KEY_TRASH, JSON.stringify(state.trash));
}

function persistPrefs() {
  localStorage.setItem(
    STORAGE_KEY_PREFS,
    JSON.stringify({
      sortBy: state.sortBy,
      dateDisplay: state.dateDisplay,
    })
  );
}

function resetComposer() {
  els.memoTitleInput.value = "";
  els.memoBodyInput.value = "";
  els.memoTagInput.value = "";
  state.editingMemoId = null;
  localStorage.removeItem(STORAGE_KEY_DRAFT);
  localStorage.removeItem(STORAGE_KEY_DRAFT_V2);
  localStorage.removeItem(STORAGE_KEY_DRAFT_V1);
  updateCharCounters();
  updateComposerUI();
}

function updateComposerUI() {
  const editing = state.editingMemoId !== null;
  els.saveMemo.textContent = editing ? "更新する" : "メモを保存";
  els.clearDraft.textContent = editing ? "編集をキャンセル" : "下書きクリア";
  els.editingBadge.hidden = !editing;
  els.composePanelTitle.textContent = editing ? "メモを編集" : "新しいメモ";
  els.tabBtnCompose.textContent = editing ? "メモを編集" : "新しいメモ";
}

function updateCharCounters() {
  const titleCurrent = els.memoTitleInput.value.length;
  const titleMax = Number(els.memoTitleInput.getAttribute("maxlength"));
  els.titleCharCounter.textContent = `${titleCurrent} / ${titleMax}`;

  const bodyCurrent = els.memoBodyInput.value.length;
  const bodyMax = Number(els.memoBodyInput.getAttribute("maxlength"));
  els.bodyCharCounter.textContent = `${bodyCurrent} / ${bodyMax}`;
}

function setDraftStatus(message) {
  els.draftStatus.textContent = message;
}

function normalizeMemo(item) {
  const title = typeof item?.title === "string" ? item.title.trim() : "";
  const bodyFromLegacy = typeof item?.content === "string" ? item.content : "";
  const body = typeof item?.body === "string" ? item.body : bodyFromLegacy;
  const createdAt = Number.isFinite(item?.createdAt) ? item.createdAt : Date.now();
  const updatedAt = Number.isFinite(item?.updatedAt) ? item.updatedAt : createdAt;

  return {
    id: typeof item?.id === "string" ? item.id : createMemoId(),
    title: title || "無題メモ",
    body,
    tag: normalizeTag(item?.tag),
    pinned: Boolean(item?.pinned),
    createdAt,
    updatedAt,
  };
}

function normalizeTrashMemo(item) {
  const memo = normalizeMemo(item);
  const deletedAt = Number.isFinite(item?.deletedAt) ? item.deletedAt : Date.now();
  return {
    ...memo,
    deletedAt,
  };
}

function normalizeTag(tag) {
  if (typeof tag !== "string") return "";
  return tag.trim().slice(0, 20);
}

function mergeById(current, incoming) {
  const map = new Map();
  current.forEach((item) => {
    map.set(item.id, item);
  });
  incoming.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
}

function createMemoId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatMemoMeta(memo, mode) {
  const ts = mode === "created-first" ? memo.createdAt : memo.updatedAt;
  return formatRelativeTime(ts);
}

function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (diff < 60000) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days === 1) return "昨日";
  if (days < 7) return `${days}日前`;

  const date = new Date(timestamp);
  const today = new Date();
  if (date.getFullYear() === today.getFullYear()) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatDateForFileName(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}`;
}

function loadTheme() {
  const stored = localStorage.getItem(STORAGE_KEY_THEME);
  const theme = stored === "dark" ? "dark" : "light";
  applyTheme(theme);
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

function updateTagUI() {
  const allTags = [...new Set(state.memos.map((m) => m.tag).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ja")
  );

  els.tagSuggestions.innerHTML = "";
  allTags.forEach((tag) => {
    const opt = document.createElement("option");
    opt.value = tag;
    els.tagSuggestions.appendChild(opt);
  });

  const currentFilter = state.tagFilter;
  els.tagFilterSelect.innerHTML = "";

  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "すべて";
  els.tagFilterSelect.appendChild(allOpt);

  allTags.forEach((tag) => {
    const opt = document.createElement("option");
    opt.value = tag;
    opt.textContent = tag;
    els.tagFilterSelect.appendChild(opt);
  });

  const noneOpt = document.createElement("option");
  noneOpt.value = "none";
  noneOpt.textContent = "タグなし";
  els.tagFilterSelect.appendChild(noneOpt);

  const exists = [...els.tagFilterSelect.options].some((o) => o.value === currentFilter);
  els.tagFilterSelect.value = exists ? currentFilter : "all";
  if (!exists) state.tagFilter = "all";
}

function handleFilterToggle() {
  const isOpen = els.filterPanel.classList.contains("is-open");
  els.filterPanel.classList.toggle("is-open", !isOpen);
  els.filterToggle.classList.toggle("is-active", !isOpen);
  els.filterToggle.setAttribute("aria-expanded", !isOpen ? "true" : "false");
}

function switchTab(tabId) {
  state.activeTab = tabId;
  ["Compose", "List", "Tools"].forEach((name) => {
    const id = name.toLowerCase();
    const active = id === tabId;
    els[`tabBtn${name}`].classList.toggle("is-active", active);
    els[`tabBtn${name}`].setAttribute("aria-selected", active ? "true" : "false");
    els[`tabPanel${name}`].hidden = !active;
  });
}
