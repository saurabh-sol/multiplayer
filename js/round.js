/**
 * RoundManager — Manages the round lifecycle state machine.
 *
 * State flow:
 *   WAITING (2s) → COUNTDOWN (10s) → LIVE → ENDING (2s)
 *     → RESULTS (15s) → REFILLING (5s) → COUNTDOWN (next round)
 *
 * Emits state-change events from update() so the Game orchestrator
 * can react (spawn boxes, show UI, etc.).
 *
 * Defined on window scope for script-tag loading.
 */

class RoundManager {
  constructor() {
    /** Current state from ROUND_STATES */
    this.state = null;

    /** Current round number (starts at 1) */
    this.roundNumber = 1;

    /** Total token reward pool for this round */
    this.rewardPool = 0;

    /** Remaining $HUNT left to distribute this round */
    this.rewardPoolRemaining = 0;

    /** Seconds remaining in the countdown phase */
    this.countdownTime = 0;

    /** Seconds elapsed since the LIVE phase started */
    this.roundTime = 0;

    /** Aggregate results object set at round end */
    this.results = null;

    /** Minimum players required to start a round */
    this.MIN_PLAYERS_TO_START = 10;

    /** Current online player count */
    this.onlinePlayerCount = 0;

    /** Whether waiting for more players */
    this.waitingForPlayers = false;

    // ---- internal timers ----
    /** Accumulator for timed states (seconds) */
    this._stateTimer = 0;

    /** Whether start() has been called */
    this._started = false;

    // ---- timing constants (seconds) ----
    /** How long the initial WAITING state lasts */
    this.WAITING_DURATION = 2;

    /** How long the pre-round countdown lasts */
    this.COUNTDOWN_DURATION = 10;

    /** Brief pause between LIVE→RESULTS */
    this.ENDING_DURATION = 2;

    /** How long the results / leaderboard screen stays up */
    this.RESULTS_DURATION = 15;

    /** How long the "refilling boxes" interstitial lasts */
    this.REFILL_DURATION = 5;

    // Reward pool options (randomly selected each round)
    this.REWARD_POOLS = [25000, 50000, 75000, 100000, 150000, 200000];

    /** Testing mode bypasses minimum player check (for guests) */
    this._isTestingMode = false;
  }

  // -----------------------------------------------------------
  //  Public API
  // -----------------------------------------------------------

  /**
   * Enable testing mode (bypasses minimum player requirement).
   * Used for guest players.
   * @param {boolean} enabled
   */
  setTestingMode(enabled) {
    this._isTestingMode = enabled;
  }

  /**
   * @returns {boolean} Whether in testing mode
   */
  isTestingMode() {
    return this._isTestingMode;
  }

  /**
   * Kick off the round system.  Sets state to WAITING and
   * calculates the first reward pool.
   */
  start() {
    this._started = true;
    this.roundNumber = 1;
    this.rewardPool = this._calcRewardPool();
    this.rewardPoolRemaining = this.rewardPool;
    this._stateTimer = 0;
    this.roundTime = 0;
    this.countdownTime = this.COUNTDOWN_DURATION;
    this.results = null;
    this.waitingForPlayers = false;
    this.state = ROUND_STATES.WAITING;
  }

  /**
   * Main tick — called every frame by the Game loop.
   *
   * @param {number} deltaTime  Seconds since last frame.
   * @param {BoxManager} boxManager  Used during LIVE to detect
   *                                 when all claimable boxes are opened.
   * @returns {{ type: string, from: string, to: string } | null}
   *          A state-change event, or null if no transition happened.
   */
  update(deltaTime, boxManager) {
    if (!this._started || !this.state) return null;

    this._stateTimer += deltaTime;

    switch (this.state) {
      // ---- WAITING (waits for minimum players) ----
      case ROUND_STATES.WAITING:
        // Check if we have enough players (skip in guest/testing mode)
        if (!this.hasEnoughPlayers() && !this._isTestingMode) {
          this.waitingForPlayers = true;
          this._stateTimer = 0; // Reset timer while waiting
          return null;
        }
        this.waitingForPlayers = false;
        
        if (this._stateTimer >= this.WAITING_DURATION) {
          return this._transition(ROUND_STATES.COUNTDOWN);
        }
        break;

      // ---- COUNTDOWN (10 s) ----
      case ROUND_STATES.COUNTDOWN:
        this.countdownTime = Math.max(
          0,
          this.COUNTDOWN_DURATION - this._stateTimer
        );
        if (this._stateTimer >= this.COUNTDOWN_DURATION) {
          this.countdownTime = 0;
          return this._transition(ROUND_STATES.LIVE);
        }
        break;

      // ---- LIVE ----
      case ROUND_STATES.LIVE:
        this.roundTime += deltaTime;

        // End when reward pool fully distributed
        if (this.rewardPoolRemaining <= 0) {
          return this._transition(ROUND_STATES.ENDING);
        }

        // End when every claimable box has been opened
        if (boxManager && boxManager.getClaimableRemaining() <= 0) {
          return this._transition(ROUND_STATES.ENDING);
        }

        // Safety cap: end round after 5 minutes regardless
        if (this.roundTime >= 300) {
          return this._transition(ROUND_STATES.ENDING);
        }
        break;

      // ---- ENDING (2 s brief pause) ----
      case ROUND_STATES.ENDING:
        if (this._stateTimer >= this.ENDING_DURATION) {
          return this._transition(ROUND_STATES.RESULTS);
        }
        break;

      // ---- RESULTS (15 s) ----
      case ROUND_STATES.RESULTS:
        if (this._stateTimer >= this.RESULTS_DURATION) {
          return this._transition(ROUND_STATES.REFILLING);
        }
        break;

      // ---- REFILLING (5 s) ----
      case ROUND_STATES.REFILLING:
        if (this._stateTimer >= this.REFILL_DURATION) {
          // Advance to next round
          this.roundNumber++;
          this.rewardPool = this._calcRewardPool();
          this.rewardPoolRemaining = this.rewardPool;
          this.roundTime = 0;
          this.results = null;
          return this._transition(ROUND_STATES.COUNTDOWN);
        }
        break;
    }

    return null; // no transition this frame
  }

  /** @returns {string} Current ROUND_STATES value */
  getState() {
    return this.state;
  }

  /** @returns {number} Current round number (1-based) */
  getRoundNumber() {
    return this.roundNumber;
  }

  /**
   * Reward pool formula: 100 000 + (roundNumber − 1) × 50 000
   * @returns {number}
   */
  getRewardPool() {
    return this.rewardPool;
  }

  getRewardPoolRemaining() {
    return this.rewardPoolRemaining;
  }

  consumeFromPool(amount) {
    if (!amount || amount <= 0) return;
    this.rewardPoolRemaining = Math.max(0, this.rewardPoolRemaining - amount);
  }

  /** @returns {number} Seconds remaining in the countdown */
  getCountdown() {
    return Math.ceil(this.countdownTime);
  }

  /** @returns {number} Seconds elapsed in the current LIVE round */
  getRoundTime() {
    return this.roundTime;
  }

  /**
   * Store aggregated round results (set by the Game orchestrator
   * at the ENDING→RESULTS boundary).
   * @param {object} results
   */
  setResults(results) {
    this.results = results;
  }

  /** @returns {object|null} */
  getResults() {
    return this.results;
  }

  /**
   * Force-set the state (e.g. for debugging or manual control).
   * Resets the internal state timer.
   * @param {string} newState  One of ROUND_STATES values.
   */
  setState(newState) {
    this._stateTimer = 0;
    this.state = newState;
    if (newState === ROUND_STATES.COUNTDOWN) {
      this.countdownTime = this.COUNTDOWN_DURATION;
    }
  }

  // -----------------------------------------------------------
  //  Internal helpers
  // -----------------------------------------------------------

  /**
   * Transition to a new state, reset the timer, and return
   * the event object the caller should handle.
   * @private
   */
  _transition(newState) {
    const from = this.state;
    this.state = newState;
    this._stateTimer = 0;

    // Initialise per-state bookkeeping
    if (newState === ROUND_STATES.COUNTDOWN) {
      this.countdownTime = this.COUNTDOWN_DURATION;
    }

    return { type: 'stateChange', from: from, to: newState };
  }

  /**
   * Calculate the reward pool for the current round.
   * Randomly selects from available pool sizes with weighted distribution.
   * Higher rounds have better chances of larger pools.
   * @private
   * @returns {number}
   */
  _calcRewardPool() {
    // Weight distribution based on round number (higher rounds = better chances for bigger pools)
    const roundBonus = Math.min(this.roundNumber - 1, 5); // Max bonus at round 6+
    
    // Build weighted pool selection
    const weights = this.REWARD_POOLS.map((pool, idx) => {
      // Lower pools have base weight, higher pools get bonus from round number
      const baseWeight = 6 - idx; // 6, 5, 4, 3, 2, 1
      const bonus = idx <= roundBonus ? roundBonus - idx + 1 : 0;
      return baseWeight + bonus;
    });
    
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < this.REWARD_POOLS.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return this.REWARD_POOLS[i];
      }
    }
    
    return this.REWARD_POOLS[0]; // Fallback
  }

  /**
   * Update online player count for minimum player check.
   * @param {number} count
   */
  setOnlinePlayerCount(count) {
    this.onlinePlayerCount = count;
  }

  /**
   * Check if there are enough players to start the round.
   * @returns {boolean}
   */
  hasEnoughPlayers() {
    return this.onlinePlayerCount >= this.MIN_PLAYERS_TO_START;
  }

  /**
   * Get players needed to start.
   * @returns {number}
   */
  getPlayersNeeded() {
    return Math.max(0, this.MIN_PLAYERS_TO_START - this.onlinePlayerCount);
  }
}

// Expose globally
window.RoundManager = RoundManager;
