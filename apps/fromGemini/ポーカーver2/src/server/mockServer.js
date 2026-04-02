import { GameEngine } from "./gameEngine.js";

export class MockPokerServer {
  constructor() {
    this.engine = new GameEngine();
  }

  startSingleModeHand() {
    this.engine.startNewHand();
    return this.engine.getState();
  }

  getState() {
    return this.engine.getState();
  }

  getLegalActions(playerId) {
    return this.engine.getLegalActions(playerId);
  }

  configureHumanProfile(profile) {
    this.engine.setHumanProfile(profile || {});
    return this.engine.getState();
  }

  configureOpponents(names) {
    this.engine.setOpponentNames(names || []);
    return this.engine.getState();
  }

  submitHumanAction(action, raiseAmount = null) {
    const normalized = action === "checkCall" ? this.normalizeCheckCall() : action;
    if (normalized === "raise" && Number.isFinite(raiseAmount)) {
      this.engine.applyAction("human", normalized, raiseAmount);
    } else {
      this.engine.applyAction("human", normalized);
    }
    return this.engine.getState();
  }

  processBotTurn() {
    this.engine.performBotTurn();
    return this.engine.getState();
  }

  normalizeCheckCall() {
    const legal = this.engine.getLegalActions("human");
    if (legal.toCall > 0) return "call";
    return "check";
  }
}
