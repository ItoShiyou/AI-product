const STORAGE_KEY = "pastel-poker-account-v1";

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultAccount() {
  const now = Date.now();
  return {
    accountId: createId("acct"),
    displayName: `Player-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    coins: 1000,
    stats: {
      totalHands: 0,
      wins: 0,
      losses: 0,
    },
    payments: {
      totalCharged: 0,
      chargeHistory: [],
    },
    lastRoomId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const next = createDefaultAccount();
    save(next);
    return next;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.accountId) throw new Error("broken account");
    return parsed;
  } catch {
    const next = createDefaultAccount();
    save(next);
    return next;
  }
}

function save(account) {
  const next = { ...account, updatedAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function getAccount() {
  return load();
}

export function updateDisplayName(name) {
  const account = load();
  account.displayName = String(name || "").trim() || account.displayName;
  return save(account);
}

export function recordCharge(amount, memo = "manual") {
  const safeAmount = Math.max(0, Number(amount) || 0);
  if (safeAmount <= 0) return load();

  const account = load();
  account.coins += safeAmount;
  account.payments.totalCharged += safeAmount;
  account.payments.chargeHistory.unshift({
    amount: safeAmount,
    memo,
    at: Date.now(),
  });
  account.payments.chargeHistory = account.payments.chargeHistory.slice(0, 20);
  return save(account);
}

export function recordHandResult({ humanNet, resultingChips }) {
  const account = load();
  account.stats.totalHands += 1;
  if (humanNet > 0) account.stats.wins += 1;
  else if (humanNet < 0) account.stats.losses += 1;

  if (Number.isFinite(resultingChips)) {
    account.coins = Math.max(0, Math.floor(resultingChips));
  }

  return save(account);
}

export function setLastRoomId(roomId) {
  const account = load();
  account.lastRoomId = roomId || null;
  return save(account);
}
