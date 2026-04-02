const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const TURN_TIMEOUT_MS = 20_000;

exports.consumeActionQueue = functions.database
  .ref("/rooms/{roomId}/actionQueue/{uid}")
  .onCreate(async (snapshot, context) => {
    const action = snapshot.val() || {};
    const roomId = context.params.roomId;
    const uid = context.params.uid;
    const roomRef = admin.database().ref(`/rooms/${roomId}`);

    await roomRef.transaction((room) => {
      if (!room || !room.players || !room.public) {
        return room;
      }

      const players = room.players;
      const playerOrder = Object.keys(players);
      const actor = players[uid];
      if (!actor) {
        return clearQueue(room, uid);
      }

      const expectedUid = room.public.currentTurnUid || playerOrder[room.public.turnIndex || 0];
      if (expectedUid !== uid) {
        return clearQueue(room, uid);
      }

      if (actor.state === "folded") {
        return clearQueue(room, uid);
      }

      const currentBet = Number(room.public.currentBet || 0);
      const actorBet = Number(actor.bet || 0);
      const toCall = Math.max(0, currentBet - actorBet);

      const result = applyValidatedAction({
        action,
        actor,
        toCall,
        currentBet,
        bigBlind: Number(room.meta?.blind || 10),
        minRaise: Number(room.public.minRaise || room.meta?.blind || 10),
      });

      if (!result.accepted) {
        room.public.lastRejectedAction = {
          uid,
          action: action.action || "unknown",
          reason: result.reason,
          at: Date.now(),
        };
        return clearQueue(room, uid);
      }

      actor.chips = result.actorChips;
      actor.bet = result.actorBet;
      actor.state = result.actorState;

      room.public.pot = Number(room.public.pot || 0) + result.addedToPot;
      room.public.currentBet = result.currentBet;
      room.public.minRaise = result.minRaise;
      room.public.lastAction = {
        uid,
        action: result.normalizedAction,
        amount: result.actionAmount,
        at: Date.now(),
      };

      advanceTurn(room, playerOrder);

      room.public.turnDeadlineMs = Date.now() + TURN_TIMEOUT_MS;
      room.public.status = "playing";

      return clearQueue(room, uid);
    });

    return null;
  });

function applyValidatedAction({ action, actor, toCall, currentBet, bigBlind, minRaise }) {
  const kind = String(action.action || "").toLowerCase();
  const chips = Number(actor.chips || 0);
  const bet = Number(actor.bet || 0);

  if (kind === "fold") {
    return {
      accepted: true,
      normalizedAction: "fold",
      actionAmount: 0,
      actorChips: chips,
      actorBet: bet,
      actorState: "folded",
      addedToPot: 0,
      currentBet,
      minRaise,
    };
  }

  if (kind === "check") {
    if (toCall !== 0) {
      return { accepted: false, reason: "cannot-check-when-facing-bet" };
    }

    return {
      accepted: true,
      normalizedAction: "check",
      actionAmount: 0,
      actorChips: chips,
      actorBet: bet,
      actorState: "acting",
      addedToPot: 0,
      currentBet,
      minRaise,
    };
  }

  if (kind === "call") {
    const paid = Math.min(chips, toCall);
    return {
      accepted: true,
      normalizedAction: "call",
      actionAmount: paid,
      actorChips: chips - paid,
      actorBet: bet + paid,
      actorState: chips - paid <= 0 ? "all-in" : "acting",
      addedToPot: paid,
      currentBet,
      minRaise,
    };
  }

  if (kind === "raise") {
    const raiseBy = Number(action.amount || 0);
    const nextMinRaise = Math.max(minRaise, bigBlind);

    if (!Number.isFinite(raiseBy) || raiseBy < nextMinRaise) {
      return { accepted: false, reason: "raise-too-small" };
    }

    const totalRequired = toCall + raiseBy;
    if (chips < totalRequired) {
      return { accepted: false, reason: "insufficient-chips" };
    }

    return {
      accepted: true,
      normalizedAction: "raise",
      actionAmount: totalRequired,
      actorChips: chips - totalRequired,
      actorBet: bet + totalRequired,
      actorState: chips - totalRequired <= 0 ? "all-in" : "acting",
      addedToPot: totalRequired,
      currentBet: Math.max(currentBet, bet + totalRequired),
      minRaise: raiseBy,
    };
  }

  return { accepted: false, reason: "unsupported-action" };
}

function advanceTurn(room, playerOrder) {
  if (!playerOrder.length) {
    room.public.turnIndex = 0;
    room.public.currentTurnUid = null;
    return;
  }

  let currentIndex = Number(room.public.turnIndex || 0);

  for (let i = 0; i < playerOrder.length; i += 1) {
    currentIndex = (currentIndex + 1) % playerOrder.length;
    const nextUid = playerOrder[currentIndex];
    const player = room.players[nextUid];

    if (!player) {
      continue;
    }

    const active = player.state !== "folded";
    if (active) {
      room.public.turnIndex = currentIndex;
      room.public.currentTurnUid = nextUid;
      return;
    }
  }

  room.public.currentTurnUid = null;
}

function clearQueue(room, uid) {
  room.actionQueue = room.actionQueue || {};
  room.actionQueue[uid] = null;
  return room;
}
