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

    /** Seconds remaining in the countdown phase */
    this.countdownTime = 0;

    /** Seconds elapsed since the LIVE phase started */
    this.roundTime = 0;

    /** Aggregate results object set at round end */
    this.results = null;

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
  }

  // -----------------------------------------------------------
  //  Public API
  // -----------------------------------------------------------

  /**
   * Kick off the round system.  Sets state to WAITING and
   * calculates the first reward pool.
   */
  start() {
    this._started = true;
    this.roundNumber = 1;
    this.rewardPool = this._calcRewardPool();
    this._stateTimer = 0;
    this.roundTime = 0;
    this.countdownTime = this.COUNTDOWN_DURATION;
    this.results = null;
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
      // ---- WAITING (2 s) ----
      case ROUND_STATES.WAITING:
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
   * Calculate the reward pool for the current round number.
   * @private
   * @returns {number}
   */
  _calcRewardPool() {
    return 100000 + (this.roundNumber - 1) * 50000;
  }
}

// Expose globally
window.RoundManager = RoundManager;
