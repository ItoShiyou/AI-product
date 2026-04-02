const PREFIX = "pastel-room-";
const channelByRoom = new Map();

function roomKey(roomId) {
  return `${PREFIX}${roomId}`;
}

function readRoom(roomId) {
  const raw = localStorage.getItem(roomKey(roomId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeRoom(roomId, room) {
  localStorage.setItem(roomKey(roomId), JSON.stringify(room));
}

function ensureRoom(roomId) {
  const now = Date.now();
  const existing = readRoom(roomId);
  if (existing) return existing;

  const created = {
    roomId,
    createdAt: now,
    updatedAt: now,
    members: [],
    bots: 0,
  };
  writeRoom(roomId, created);
  return created;
}

function getChannel(roomId) {
  if (!channelByRoom.has(roomId)) {
    channelByRoom.set(roomId, new BroadcastChannel(`pastel-room:${roomId}`));
  }
  return channelByRoom.get(roomId);
}

function normalizeRoom(room) {
  const members = room.members.filter((m) => Date.now() - m.lastSeenAt < 60_000);
  const bots = Math.max(0, room.bots || 0);
  return {
    ...room,
    members,
    bots,
    updatedAt: Date.now(),
  };
}

export function joinRoom({ roomId, accountId, displayName }) {
  const room = normalizeRoom(ensureRoom(roomId));

  const exists = room.members.some((m) => m.accountId === accountId);
  if (!exists) {
    if (room.members.length + room.bots >= 8) {
      if (room.bots > 0) {
        room.bots -= 1;
      } else {
        return { ok: false, reason: "満室です" };
      }
    }

    room.members.push({ accountId, displayName, joinedAt: Date.now(), lastSeenAt: Date.now() });
  } else {
    room.members = room.members.map((m) =>
      m.accountId === accountId ? { ...m, displayName, lastSeenAt: Date.now() } : m
    );
  }

  if (room.members.length === 1 && room.bots === 0) {
    room.waitStartAt = Date.now();
  }

  writeRoom(roomId, room);
  getChannel(roomId).postMessage({ type: "room-updated" });
  return { ok: true, room };
}

export function leaveRoom({ roomId, accountId }) {
  const room = readRoom(roomId);
  if (!room) return;
  room.members = room.members.filter((m) => m.accountId !== accountId);
  if (room.members.length === 0) {
    localStorage.removeItem(roomKey(roomId));
  } else {
    writeRoom(roomId, normalizeRoom(room));
  }
  getChannel(roomId).postMessage({ type: "room-updated" });
}

export function tickRoom(roomId) {
  const roomRaw = readRoom(roomId);
  if (!roomRaw) return null;
  const room = normalizeRoom(roomRaw);

  if (room.members.length === 1) {
    const waited = Date.now() - (room.waitStartAt || room.createdAt || Date.now());
    if (waited >= 20_000 && room.bots === 0) {
      room.bots = 1;
    }
  }

  if (room.members.length >= 2) {
    room.waitStartAt = null;
  }

  writeRoom(roomId, room);
  return room;
}

export function subscribeRoom(roomId, onChange) {
  const channel = getChannel(roomId);
  const listener = () => {
    const room = tickRoom(roomId);
    onChange(room);
  };

  channel.addEventListener("message", listener);
  const interval = setInterval(listener, 1000);
  listener();

  return () => {
    channel.removeEventListener("message", listener);
    clearInterval(interval);
  };
}
