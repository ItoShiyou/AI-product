import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getDatabase,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  get,
  ref,
  update,
  set,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";

export function createFirebaseClient(firebaseConfig) {
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  function subscribeRoomPublic(roomId, onChange) {
    const roomPublicRef = ref(db, `rooms/${roomId}/public`);
    return onValue(roomPublicRef, (snapshot) => {
      onChange(snapshot.val() || { communityCards: [], pot: 0, turnIndex: 0 });
    });
  }

  // Player list updates are split into child events to avoid receiving the full list every turn.
  function subscribePlayers(roomId, onPatch) {
    const playersRef = ref(db, `rooms/${roomId}/players`);

    const unsubAdd = onChildAdded(playersRef, (snapshot) => {
      onPatch({ type: "upsert", uid: snapshot.key, player: snapshot.val() });
    });

    const unsubChange = onChildChanged(playersRef, (snapshot) => {
      onPatch({ type: "upsert", uid: snapshot.key, player: snapshot.val() });
    });

    const unsubRemove = onChildRemoved(playersRef, (snapshot) => {
      onPatch({ type: "remove", uid: snapshot.key });
    });

    return () => {
      unsubAdd();
      unsubChange();
      unsubRemove();
    };
  }

  function subscribeOwnHand(roomId, uid, onChange) {
    const privateHandRef = ref(db, `private/${roomId}/${uid}`);
    return onValue(privateHandRef, (snapshot) => {
      onChange(snapshot.val() || []);
    });
  }

  function sendAction(roomId, uid, action, amount = 0) {
    const actionRef = ref(db, `rooms/${roomId}/actionQueue/${uid}`);
    return set(actionRef, {
      action,
      amount,
      createdAt: serverTimestamp(),
    });
  }

  function updatePresence(roomId, uid, online) {
    const updates = {
      [`rooms/${roomId}/players/${uid}/online`]: online,
      [`rooms/${roomId}/players/${uid}/lastSeenAt`]: serverTimestamp(),
    };
    return update(ref(db), updates);
  }

  function setupPresence(roomId, uid) {
    const playerRef = ref(db, `rooms/${roomId}/players/${uid}`);
    const disconnect = onDisconnect(playerRef);

    return Promise.all([
      disconnect.update({
        online: false,
        lastSeenAt: serverTimestamp(),
      }),
      update(ref(db), {
        [`rooms/${roomId}/players/${uid}/online`]: true,
        [`rooms/${roomId}/players/${uid}/lastSeenAt`]: serverTimestamp(),
      }),
    ]);
  }

  async function getInitialRoomSnapshot(roomId, uid) {
    const [publicSnap, handSnap, playerSnap] = await Promise.all([
      get(ref(db, `rooms/${roomId}/public`)),
      get(ref(db, `private/${roomId}/${uid}`)),
      get(ref(db, `rooms/${roomId}/players/${uid}`)),
    ]);

    return {
      publicState: publicSnap.val() || {},
      hand: handSnap.val() || [],
      me: playerSnap.val() || null,
    };
  }

  function writePublicPatch(roomId, patch) {
    const updates = {};
    for (const [key, value] of Object.entries(patch)) {
      updates[`rooms/${roomId}/public/${key}`] = value;
    }
    return update(ref(db), updates);
  }

  return {
    subscribeRoomPublic,
    subscribePlayers,
    subscribeOwnHand,
    sendAction,
    updatePresence,
    setupPresence,
    getInitialRoomSnapshot,
    writePublicPatch,
  };
}
