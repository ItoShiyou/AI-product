import { MockPokerServer } from "../server/mockServer.js";

class LocalGameApi {
  constructor() {
    this.server = new MockPokerServer();
  }

  getState() {
    return this.server.getState();
  }

  startSingleModeHand() {
    return this.server.startSingleModeHand();
  }

  getLegalActions(playerId) {
    return this.server.getLegalActions(playerId);
  }

  submitHumanAction(action, amount = null) {
    return this.server.submitHumanAction(action, amount);
  }

  processBotTurn() {
    return this.server.processBotTurn();
  }

  configureHumanProfile(profile) {
    return this.server.configureHumanProfile(profile);
  }

  configureOpponents(names) {
    return this.server.configureOpponents(names);
  }
}

class FirebaseGameApi {
  getState() {
    throw new Error("Firebase API は未接続です");
  }

  startSingleModeHand() {
    throw new Error("Firebase API は未接続です");
  }

  getLegalActions() {
    throw new Error("Firebase API は未接続です");
  }

  submitHumanAction() {
    throw new Error("Firebase API は未接続です");
  }

  processBotTurn() {
    throw new Error("Firebase API は未接続です");
  }

  configureHumanProfile() {
    throw new Error("Firebase API は未接続です");
  }

  configureOpponents() {
    throw new Error("Firebase API は未接続です");
  }
}

export function createGameApi(kind = "local") {
  if (kind === "firebase") {
    return new FirebaseGameApi();
  }
  return new LocalGameApi();
}
