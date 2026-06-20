/**
 * RoundManager — Round lifecycle for TREZO reward rounds.
 * Requires 10 wallet-connected players. Guests explore but don't earn rewards.
 */

class RoundManager {
  constructor() {
    this.state = null;
    this.roundNumber = 1;
    this.rewardPool = 0;
    this.rewardPoolRemaining = 0;
    this.totalDistributed = 0;
    this.countdownTime = 0;
    this.roundTime = 0;
    this.results = null;
    this.walletPlayerCount = 0;
    this.waitingForPlayers = false;
    this._stateTimer = 0;
    this._started = false;

    this.WAITING_DURATION = 1;
    this.COUNTDOWN_DURATION = ROUND_CONFIG.COUNTDOWN_SECONDS;
    this.ENDING_DURATION = 2;
    this.RESULTS_DURATION = 15;
    this.REFILL_DURATION = 5;
  }

  start() {
    this._started = true;
    this.exploreMode = false;
    this.roundNumber = 1;
    this.rewardPool = this._calcRewardPool();
    this.rewardPoolRemaining = this.rewardPool;
    this.totalDistributed = 0;
    this._stateTimer = 0;
    this.roundTime = 0;
    this.countdownTime = this.COUNTDOWN_DURATION;
    this.results = null;
    this.waitingForPlayers = false;
    this.state = ROUND_STATES.WAITING;
  }

  /** Guest explore — skip lobby/wallet wait and roam the map freely */
  startGuestExplore() {
    this._started = true;
    this.exploreMode = true;
    this.roundNumber = 0;
    this.rewardPool = REWARD_POOLS[0];
    this.rewardPoolRemaining = this.rewardPool;
    this.totalDistributed = 0;
    this._stateTimer = 0;
    this.roundTime = 0;
    this.countdownTime = 0;
    this.results = null;
    this.waitingForPlayers = false;
    this.state = ROUND_STATES.LIVE;
  }

  isExploreMode() {
    return !!this.exploreMode;
  }

  update(deltaTime, boxManager) {
    if (!this._started || !this.state) return null;

    if (this.exploreMode) {
      if (this.state === ROUND_STATES.LIVE) {
        this.roundTime += deltaTime;
      }
      return null;
    }

    this._stateTimer += deltaTime;

    switch (this.state) {
      case ROUND_STATES.WAITING:
        if (!this.hasEnoughWalletPlayers()) {
          this.waitingForPlayers = true;
          this._stateTimer = 0;
          return null;
        }
        this.waitingForPlayers = false;
        if (this._stateTimer >= this.WAITING_DURATION) {
          return this._transition(ROUND_STATES.COUNTDOWN);
        }
        break;

      case ROUND_STATES.COUNTDOWN:
        this.countdownTime = Math.max(0, this.COUNTDOWN_DURATION - this._stateTimer);
        if (this._stateTimer >= this.COUNTDOWN_DURATION) {
          this.countdownTime = 0;
          return this._transition(ROUND_STATES.LIVE);
        }
        break;

      case ROUND_STATES.LIVE:
        this.roundTime += deltaTime;
        if (this.rewardPoolRemaining <= 0) {
          return this._transition(ROUND_STATES.ENDING);
        }
        if (boxManager && boxManager.getRewardChestsRemaining() <= 0) {
          return this._transition(ROUND_STATES.ENDING);
        }
        if (this.roundTime >= 300) {
          return this._transition(ROUND_STATES.ENDING);
        }
        break;

      case ROUND_STATES.ENDING:
        if (this._stateTimer >= this.ENDING_DURATION) {
          return this._transition(ROUND_STATES.RESULTS);
        }
        break;

      case ROUND_STATES.RESULTS:
        if (this._stateTimer >= this.RESULTS_DURATION) {
          return this._transition(ROUND_STATES.REFILLING);
        }
        break;

      case ROUND_STATES.REFILLING:
        if (this._stateTimer >= this.REFILL_DURATION) {
          this.roundNumber++;
          this.rewardPool = this._calcRewardPool();
          this.rewardPoolRemaining = this.rewardPool;
          this.totalDistributed = 0;
          this.roundTime = 0;
          this.results = null;
          return this._transition(ROUND_STATES.WAITING);
        }
        break;
    }
    return null;
  }

  getState() { return this.state; }
  getRoundNumber() { return this.roundNumber; }
  getRewardPool() { return this.rewardPool; }
  getRewardPoolRemaining() { return this.rewardPoolRemaining; }

  consumeFromPool(amount) {
    if (!amount || amount <= 0) return;
    this.rewardPoolRemaining = Math.max(0, this.rewardPoolRemaining - amount);
    this.totalDistributed = this.rewardPool - this.rewardPoolRemaining;
  }

  getTotalDistributed() { return this.totalDistributed; }
  getCountdown() { return Math.ceil(this.countdownTime); }
  getPhaseCountdown() {
    switch (this.state) {
      case ROUND_STATES.COUNTDOWN:
        return this.getCountdown();
      case ROUND_STATES.RESULTS:
        return Math.max(0, Math.ceil(this.RESULTS_DURATION - this._stateTimer));
      case ROUND_STATES.REFILLING:
        return Math.max(0, Math.ceil(this.REFILL_DURATION - this._stateTimer));
      default:
        return 0;
    }
  }
  getRoundTime() { return this.roundTime; }
  setResults(r) { this.results = r; }
  getResults() { return this.results; }

  setWalletPlayerCount(count) {
    this.walletPlayerCount = count;
  }

  hasEnoughWalletPlayers() {
    return this.walletPlayerCount >= ROUND_CONFIG.MIN_WALLET_PLAYERS;
  }

  getWalletPlayersNeeded() {
    return Math.max(0, ROUND_CONFIG.MIN_WALLET_PLAYERS - this.walletPlayerCount);
  }

  // Legacy compat
  setOnlinePlayerCount(count) { this.setWalletPlayerCount(count); }
  hasEnoughPlayers() { return this.hasEnoughWalletPlayers(); }
  getPlayersNeeded() { return this.getWalletPlayersNeeded(); }
  setTestingMode() {}
  isTestingMode() { return false; }

  _transition(newState) {
    const from = this.state;
    this.state = newState;
    this._stateTimer = 0;
    if (newState === ROUND_STATES.COUNTDOWN) {
      this.countdownTime = this.COUNTDOWN_DURATION;
    }
    return { type: 'stateChange', from, to: newState };
  }

  _calcRewardPool() {
    return REWARD_POOLS[Math.floor(Math.random() * REWARD_POOLS.length)];
  }
}

window.RoundManager = RoundManager;
