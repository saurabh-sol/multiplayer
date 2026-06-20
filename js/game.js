/* ============================================
   SOLANA TREASURE HUNT — Game Engine
   Primary loop, input, rendering, and logic
   With Unity-quality post-processing pipeline
   ============================================ */

class Game {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.camera = { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };

    // Smooth camera state
    this._camSmooth = { x: MAP_WIDTH / 2 - CANVAS_WIDTH / 2, y: MAP_HEIGHT / 2 - CANVAS_HEIGHT / 2 };
    this._camInitialized = false;

    // Screen-shake state
    this.screenShake = { x: 0, y: 0, intensity: 0 };

    // Footstep timer
    this._footstepTimer = 0;

    // Atmosphere cycle timer (cycles through day/dusk/night/dawn)
    this._atmosphereTime = 0;
    this._atmosphereCycle = 60; // full cycle in seconds

    // Key flags
    this.keys = {
      up: false, down: false, left: false, right: false,
      w: false, s: false, a: false, d: false
    };

    // Instantiate engine modules
    this.audio = new AudioManager();
    this.particles = new ParticleSystem();
    this.map = new MapGenerator(MAP_COLS, MAP_ROWS, TILE_SIZE);

    this.player = new Player(MAP_WIDTH / 2, MAP_HEIGHT / 2);
    this.player.inventory = [
      { type: 'compass', name: 'Treasure Compass', quantity: 2 },
      { type: 'potion', name: 'Energy Potion', quantity: 1 },
      { type: 'boots', name: 'Speed Boots', quantity: 1 }
    ];

    this.boxes = new BoxManager();
    this.compass = new Compass();
    this.wallet = new WalletManager();
    this.buildings = new BuildingsManager(this.wallet);
    this.round = new RoundManager();
    this.onlinePlayers = new OnlinePlayersManager();
    this.ui = new UIManager();

    this.lastTime = 0;
    this.isRunning = false;
    this.activeOpeningBox = null;

    // Offscreen canvas for lighting overlay (created once in init)
    this._lightCanvas = null;
    this._lightCtx = null;
  }

  /* ────────────────────────────────────────────
     INIT
     ──────────────────────────────────────────── */
  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.style.imageRendering = 'pixelated';
    this.ctx.imageSmoothingEnabled = false;

    // Pre-create offscreen canvas for lighting pass
    this._lightCanvas = document.createElement('canvas');
    this._lightCanvas.width = CANVAS_WIDTH;
    this._lightCanvas.height = CANVAS_HEIGHT;
    this._lightCtx = this._lightCanvas.getContext('2d');

    this.setupInput();
    this.map.generate();

    // --- Button bindings ---
    document.getElementById('btn-connect-wallet').addEventListener('click', async () => {
      this.audio.init();
      this.audio.playClick();
      const connected = await this.wallet.connect();
      if (connected) {
        this.player.name = this.wallet.getUsername();
        this.buildings.wallet = this.wallet;
        this.buildings.fetchBuildings();
        
        // Show loading screen with animation
        this.ui.showLoading(() => {
          this.enterLobby();
        });
      }
    });

    document.getElementById('btn-play-guest').addEventListener('click', () => {
      this.audio.init();
      this.audio.playClick();
      this.wallet.setGuest();
      this.player.name = 'Guest Hunter';
      
      // Enable testing mode for guests (bypasses minimum player requirement)
      this.round.setTestingMode(true);
      
      // Show loading screen with animation
      this.ui.showLoading(() => {
        this.ui.showGuestWarning();
        this.ui.showNotification('Testing Mode: No minimum player requirement', 'info', 3000);
        this.enterLobby();
      });
    });

    document.getElementById('hud-btn-leave').addEventListener('click', () => {
      this.audio.playClick();
      this.leaveGame();
    });

    document.getElementById('hud-btn-audio').addEventListener('click', () => {
      const active = this.audio.toggle();
      document.getElementById('hud-btn-audio').innerText = active ? '🔊' : '🔇';
    });

    document.getElementById('hud-btn-help').addEventListener('click', () => {
      this.ui.showNotification(
        "Controls: WASD/Arrows to move | Click chests to open | 1/2/3 for items | Find all token chests to win!",
        "info", 5000
      );
    });

    document.getElementById('hud-btn-profile').addEventListener('click', () => {
      this.audio.playClick();
      if (this.wallet.isConnected() && !this.wallet.isGuest) {
        this.buildings.showProfileModal();
      } else {
        this.ui.showNotification("Connect wallet to view profile & buildings", "warning");
      }
    });

    // Wallet HUD click — show disconnect modal
    document.getElementById('hud-wallet-stat').addEventListener('click', () => {
      this.audio.playClick();
      if (this.wallet.isConnected()) {
        this.wallet.showDisconnectModal();
      } else if (this.wallet.isGuest) {
        this.ui.showNotification("Playing as Guest. Connect wallet from the main menu to claim rewards.", "info", 3000);
      }
    });

    document.getElementById('inv-slot-compass').addEventListener('click', () => this.useCompassItem());
    document.getElementById('inv-slot-boots').addEventListener('click', () => this.useBootsItem());
    document.getElementById('inv-slot-potion').addEventListener('click', () => this.usePotionItem());
    this.canvas.addEventListener('mousedown', (e) => this.handleCanvasClick(e));

    // Retry pending syncs when coming back online
    window.addEventListener('online', () => {
      if (this.wallet.isConnected() && !this.wallet.isGuest) {
        this.ui.showNotification('Connection restored. Syncing data...', 'success', 2000);
        this._retryPendingSync();
      }
    });

    // Periodically retry pending syncs (every 30 seconds)
    setInterval(() => {
      if (this._pendingSyncQueue && this._pendingSyncQueue.length > 0 && navigator.onLine) {
        this._retryPendingSync();
      }
    }, 30000);

    window.gameInstance = this;
    this.ui.showLanding();
  }

  setupInput() {
    const setKey = (code, isPressed) => {
      switch (code) {
        case 'ArrowUp': case 'KeyW': this.keys.up = this.keys.w = isPressed; break;
        case 'ArrowDown': case 'KeyS': this.keys.down = this.keys.s = isPressed; break;
        case 'ArrowLeft': case 'KeyA': this.keys.left = this.keys.a = isPressed; break;
        case 'ArrowRight': case 'KeyD': this.keys.right = this.keys.d = isPressed; break;
        case 'Digit1': if (isPressed) this.useCompassItem(); break;
        case 'Digit2': if (isPressed) this.useBootsItem(); break;
        case 'Digit3': if (isPressed) this.usePotionItem(); break;
      }
    };
    window.addEventListener('keydown', (e) => setKey(e.code, true));
    window.addEventListener('keyup', (e) => setKey(e.code, false));
  }

  /* ────────────────────────────────────────────
     LOBBY / LEAVE
     ──────────────────────────────────────────── */
  enterLobby() {
    this.round.start();
    this.onlinePlayers.start(this.wallet);
    this.ui.showLobby(this.round, this.wallet, this.onlinePlayers, this.player);
    this.audio.startMusic();

    // Retry any pending sync operations
    if (this.wallet.isConnected() && !this.wallet.isGuest) {
      this._retryPendingSync();
    }

    if (!this.isRunning) {
      this.isRunning = true;
      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  leaveGame() {
    this.isRunning = false;
    this.wallet.disconnect();
    this.onlinePlayers.stop();
    this.particles.clear();
    this.boxes.clear();
    this.compass.deactivate();
    this.audio.stopMusic();
    this.ui.showLanding();
  }

  /* ────────────────────────────────────────────
     ITEMS
     ──────────────────────────────────────────── */
  useCompassItem() {
    const slot = this.player.inventory.find(i => i.type === 'compass');
    if (slot && slot.quantity > 0) {
      if (this.compass.isActive) { this.ui.showNotification("Compass is already active!", "warning"); return; }
      slot.quantity--;
      this.compass.activate(30);
      this.audio.playDiscovery();
      this.ui.showNotification("Treasure Compass activated! Points to nearest hidden box.", "success");
    } else {
      this.ui.showNotification("No Compass left! Find them in Item Boxes.", "error");
    }
  }

  useBootsItem() {
    const slot = this.player.inventory.find(i => i.type === 'boots');
    if (slot && slot.quantity > 0) {
      if (this.player.speedBoostTime > 0) { this.ui.showNotification("Speed Boost is already active!", "warning"); return; }
      slot.quantity--;
      this.player.speedBoostTime = 15;
      this.audio.playDiscovery();
      this.ui.showNotification("Speed Boots activated! +50% speed for 15s.", "success");
    } else {
      this.ui.showNotification("No Speed Boots left! Find them in Item Boxes.", "error");
    }
  }

  usePotionItem() {
    const slot = this.player.inventory.find(i => i.type === 'potion');
    if (slot && slot.quantity > 0) {
      if (this.player.attributes.energy >= 100) { this.ui.showNotification("Energy is already full!", "warning"); return; }
      slot.quantity--;
      this.player.attributes.energy = Math.min(100, this.player.attributes.energy + 50);
      this.audio.playReward('common');
      this.ui.showNotification("Energy Potion consumed! Restored 50 Energy.", "success");
    } else {
      this.ui.showNotification("No Energy Potions left! Find them in Item Boxes.", "error");
    }
  }

  /* ────────────────────────────────────────────
     CANVAS CLICK
     ──────────────────────────────────────────── */
  handleCanvasClick(event) {
    if (this.round.getState() !== ROUND_STATES.LIVE) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const clickX = (event.clientX - rect.left) * scaleX + this.camera.x;
    const clickY = (event.clientY - rect.top) * scaleY + this.camera.y;

    const box = this.boxes.getBoxAt(clickX, clickY);
    if (!box) return;

    const dist = Math.sqrt((box.x - this.player.x) ** 2 + (box.y - this.player.y) ** 2);
    if (dist > 65) { this.ui.showNotification("Step closer to open chest!", "warning"); return; }

    const started = this.boxes.startOpening(box, this.player);
    if (started) {
      this.activeOpeningBox = box;
      this.player.useEnergy(10);
    }
  }

  /* ────────────────────────────────────────────
     MAIN LOOP
     ──────────────────────────────────────────── */
  gameLoop(timestamp) {
    if (!this.isRunning) return;
    const deltaTime = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;
    this.update(deltaTime);
    this.render();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  /* ────────────────────────────────────────────
     UPDATE
     ──────────────────────────────────────────── */
  update(deltaTime) {
    // Update round manager with current online player count
    this.round.setOnlinePlayerCount(this.onlinePlayers.getOnlineCount());
    
    const event = this.round.update(deltaTime, this.boxes);
    if (event) this.onRoundStateChange(event);

    const state = this.round.getState();

    if (state === ROUND_STATES.LIVE) {
      this.player.update(this.keys, deltaTime, this.map);
      this.boxes.update(this.player, deltaTime);
      this.compass.update(this.player, this.boxes, deltaTime);
      this.particles.update(deltaTime);
      this.onlinePlayers.setRoundContext(this.round.getRoundNumber(), state);
      this.onlinePlayers.update();

      // --- Atmosphere cycle ---
      this._atmosphereTime += deltaTime;

      // --- Ambient particles ---
      this.particles.updateAmbient(this.camera, deltaTime);

      // --- Footstep dust + sound ---
      if (this.player.isMoving) {
        this._footstepTimer += deltaTime;
        if (this._footstepTimer >= 0.22) {
          this._footstepTimer = 0;
          this.particles.emitDust(this.player.x, this.player.y, this.player.direction);
          this.audio.playFootstep();
        }
      } else {
        this._footstepTimer = 0;
      }

      // --- Chest opening progress ---
      if (this.activeOpeningBox) {
        if (this.activeOpeningBox.state !== 'opening') {
          this.activeOpeningBox = null;
        } else {
          const rate = 100 / (this.player.getOpenTime() / 1000);
          this.activeOpeningBox.openProgress += rate * deltaTime;
          if (this.activeOpeningBox.openProgress >= 100) {
            this.unlockChest(this.activeOpeningBox);
            this.activeOpeningBox = null;
          }
        }
      }

      // --- Screen shake decay ---
      if (this.screenShake.intensity > 0) {
        this.screenShake.intensity *= Math.pow(0.001, deltaTime);
        if (this.screenShake.intensity < 0.3) this.screenShake.intensity = 0;
        this.screenShake.x = (Math.random() - 0.5) * 2 * this.screenShake.intensity;
        this.screenShake.y = (Math.random() - 0.5) * 2 * this.screenShake.intensity;
      }

      this.updateCamera(deltaTime);

      // --- HUD telemetry ---
      const leaderboard = this.onlinePlayers.getLeaderboard(this.player);
      const myRank = 1; // Single player for now
      const invMap = {};
      this.player.inventory.forEach(item => { invMap[item.type] = item.quantity; });

      this.ui.updateHUD({
        energy: this.player.attributes.energy,
        boxesRemaining: this.boxes.getClaimableRemaining(),
        totalBoxes: this.boxes.boxes.filter(b => b.isClaimable).length,
        roundTime: this.round.getRoundTime(),
        rank: myRank,
        tokensEarned: this.player.tokensEarned,
        inventory: invMap,
        walletAddress: this.wallet.getDisplayAddress(),
        isGuest: this.wallet.isGuest,
        rewardPool: this.round.getRewardPool(),
        rewardPoolRemaining: this.round.getRewardPoolRemaining(),
        onlinePlayers: this.onlinePlayers.getOnlineCount(),
        onlinePlayerList: this.onlinePlayers.getOnlinePlayerList(),
        playerName: this.player.name
      });
    }
    else if (state === ROUND_STATES.COUNTDOWN || state === ROUND_STATES.WAITING) {
      this.onlinePlayers.setRoundContext(this.round.getRoundNumber(), state);
      this.ui.updateLobby({
        roundNumber: this.round.getRoundNumber(),
        state: state,
        countdown: this.round.getCountdown(),
        totalBoxes: 30 + this.round.getRoundNumber() * 5,
        rewardPool: this.round.getRewardPool(),
        onlinePlayers: this.onlinePlayers.getOnlineCount(),
        leaderboard: this.onlinePlayers.getLeaderboard(this.player),
        isGuest: this.wallet.isGuest,
        playerAttributes: this.player.attributes,
        waitingForPlayers: this.round.waitingForPlayers,
        playersNeeded: this.round.getPlayersNeeded(),
        isTestingMode: this.round.isTestingMode()
      });
      const secs = this.round.getCountdown();
      if (state === ROUND_STATES.COUNTDOWN && this._prevCountdownSec !== secs) {
        this._prevCountdownSec = secs;
        if (secs > 0) this.audio.playCountdown();
      }
    }
    else if (state === ROUND_STATES.RESULTS) {
      this.ui.updateResults({ nextCountdown: this.round.getCountdown() });
    }
  }

  /* ────────────────────────────────────────────
     CHEST UNLOCK
     ──────────────────────────────────────────── */
  unlockChest(box) {
    box.state = 'opened';
    box.openedBy = 'You';
    this.player.boxesOpened++;

    this.audio.playChestOpen();
    this.particles.emitCoinBurst(box.x, box.y);

    const config = box.config;
    const rarity = config.rarity;
    const isHidden = box.visibility === 'hidden';

    // Screen shake based on rarity
    if (rarity === 'legendary') {
      this.screenShake.intensity = 14;
      this.particles.emitConfetti(box.x, box.y);
    } else if (rarity === 'epic') {
      this.screenShake.intensity = 10;
    } else if (rarity === 'rare') {
      this.screenShake.intensity = 7;
    } else {
      this.screenShake.intensity = 4;
    }

    const rewards = [];

    // 1. Points reward (all boxes can have points)
    if (box.points > 0) {
      this.player.pointsEarned = (this.player.pointsEarned || 0) + box.points;
      rewards.push(`+${box.points} Points`);
      
      // Sync points to backend
      if (this.wallet.isConnected() && !this.wallet.isGuest) {
        this._syncPointsToBackend(box.points);
      }
    }

    // 2. Token reward (hidden token/jackpot boxes)
    if (box.tokenReward > 0) {
      // Deduct from round pool — round ends when pool hits 0
      this.round.consumeFromPool(box.tokenReward);

      if (this.wallet.isGuest) {
        this._forfeitedTokensTotal = (this._forfeitedTokensTotal || 0) + box.tokenReward;
        this.ui.showNotification(
          `Found ${box.tokenReward.toLocaleString()} $HUNT! Connect wallet to claim.`, 
          "warning", 4000
        );
      } else {
        // Store as pending token for later claim via storage room
        this.player.pendingTokens = (this.player.pendingTokens || 0) + box.tokenReward;
        this.player.tokensEarned += box.tokenReward;
        rewards.push(`+${box.tokenReward.toLocaleString()} $HUNT`);
        this.audio.playReward(rarity);
        
        // Sync tokens to backend
        this._syncTokensToBackend(box.tokenReward, isHidden ? 'hidden_box' : 'normal_box');
      }
    }

    // 3. Special skill (hidden special/jackpot boxes)
    if (box.skill) {
      this.player.activeSkills = this.player.activeSkills || [];
      this.player.activeSkills.push({
        ...box.skill,
        expiresAt: Date.now() + 60000 // 60 seconds
      });
      rewards.push(`★ ${box.skill.name}`);
      this.ui.showNotification(
        `Special Skill: ${box.skill.name} - ${box.skill.description}`, 
        "success", 5000
      );
      this.audio.playReward('epic');
    }

    // 4. Item loot (item boxes)
    if (box.loot) {
      if (box.loot.type === 'compass' || box.loot.type === 'potion' || box.loot.type === 'boots') {
        const invSlot = this.player.inventory.find(i => i.type === box.loot.type);
        if (invSlot) invSlot.quantity += box.loot.value;
        rewards.push(box.loot.name);
        this.audio.playReward('uncommon');
      }
    }

    // 5. Empty box
    if (rewards.length === 0) {
      rewards.push('Empty...');
      this.audio.playEmpty();
    }

    // Show combined reward
    const rewardText = rewards.join(' | ');
    this.ui.showBoxReward(box.x, box.y, box.type, rewardText, this.camera);

    // Hidden box bonus notification
    if (isHidden && rewards.length > 1) {
      this.ui.showNotification('Hidden treasure found! Check your profile to claim tokens.', 'success', 3000);
    }
  }

  /* ────────────────────────────────────────────
     BACKEND SYNC METHODS (with retry queue)
     ──────────────────────────────────────────── */
  
  // Queue for failed sync operations
  _pendingSyncQueue = [];
  _isSyncing = false;

  async _syncPointsToBackend(points, retryCount = 0) {
    if (!this.wallet.address) return;
    
    const maxRetries = 3;
    
    try {
      const response = await fetch(`${API_BASE_URL}/players/update-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: this.wallet.address,
          points: points,
          operation: 'add'
        })
      });
      
      if (!response.ok) throw new Error('Server error');
      
      const data = await response.json();
      if (data.success && this.wallet.user) {
        this.wallet.user.points = data.points;
      }
    } catch (error) {
      console.warn(`Failed to sync points (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries) {
        // Retry after delay (exponential backoff)
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          this._syncPointsToBackend(points, retryCount + 1);
        }, delay);
      } else {
        // Add to pending queue for later sync
        this._pendingSyncQueue.push({ type: 'points', points, timestamp: Date.now() });
        this.ui.showNotification('Points saved locally. Will sync when online.', 'warning', 2000);
      }
    }
  }

  async _syncTokensToBackend(amount, source, retryCount = 0) {
    if (!this.wallet.address) return;
    
    const maxRetries = 3;
    
    try {
      const response = await fetch(`${API_BASE_URL}/tokens/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: this.wallet.address,
          amount: amount,
          source: source
        })
      });
      
      if (!response.ok) throw new Error('Server error');
    } catch (error) {
      console.warn(`Failed to sync tokens (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          this._syncTokensToBackend(amount, source, retryCount + 1);
        }, delay);
      } else {
        this._pendingSyncQueue.push({ type: 'tokens', amount, source, timestamp: Date.now() });
        this.ui.showNotification('Tokens saved locally. Will sync when online.', 'warning', 2000);
      }
    }
  }

  // Retry pending sync operations
  async _retryPendingSync() {
    if (this._isSyncing || this._pendingSyncQueue.length === 0) return;
    
    this._isSyncing = true;
    const queue = [...this._pendingSyncQueue];
    this._pendingSyncQueue = [];
    
    for (const item of queue) {
      try {
        if (item.type === 'points') {
          await this._syncPointsToBackend(item.points);
        } else if (item.type === 'tokens') {
          await this._syncTokensToBackend(item.amount, item.source);
        }
      } catch (e) {
        // Re-add to queue if still failing
        this._pendingSyncQueue.push(item);
      }
    }
    
    this._isSyncing = false;
    
    if (this._pendingSyncQueue.length === 0 && queue.length > 0) {
      this.ui.showNotification('All pending data synced!', 'success', 2000);
    }
  }

  /* ────────────────────────────────────────────
     SMOOTH LERP CAMERA
     ──────────────────────────────────────────── */
  updateCamera(deltaTime) {
    const targetX = this.player.x - CANVAS_WIDTH / 2;
    const targetY = this.player.y - CANVAS_HEIGHT / 2;

    if (!this._camInitialized) {
      this._camSmooth.x = targetX;
      this._camSmooth.y = targetY;
      this._camInitialized = true;
    }

    // Exponential lerp — approaches target smoothly over several frames
    const t = 1 - Math.pow(0.0015, deltaTime);
    this._camSmooth.x += (targetX - this._camSmooth.x) * t;
    this._camSmooth.y += (targetY - this._camSmooth.y) * t;

    // Clamp to map bounds
    this.camera.x = Math.max(0, Math.min(this._camSmooth.x, MAP_WIDTH - CANVAS_WIDTH));
    this.camera.y = Math.max(0, Math.min(this._camSmooth.y, MAP_HEIGHT - CANVAS_HEIGHT));
  }

  /* ────────────────────────────────────────────
     ROUND STATE TRANSITIONS
     ──────────────────────────────────────────── */
  onRoundStateChange(event) {
    const to = event.to;

    if (to === ROUND_STATES.LIVE) {
      const points = this.map.getSpawnPoints(80);
      this.boxes.spawnBoxes(points, this.round.getRoundNumber());
      this.boxes.allocateTokenPool(this.round.getRewardPool());
      this.round.rewardPoolRemaining = this.round.getRewardPool();
      this.onlinePlayers.setRoundContext(this.round.getRoundNumber(), to);
      this.onlinePlayers.reset();
      this.player.x = MAP_WIDTH / 2;
      this.player.y = MAP_HEIGHT / 2;
      this.player.resetRoundStats();
      this.player.regenEnergy();
      this.activeOpeningBox = null;
      this._forfeitedTokensTotal = 0;
      this._camInitialized = false;
      this.particles.clear();
      this.compass.deactivate();
      this.ui.showGame();
      this.audio.playRoundStart();
      this.showRoundStartBanner();
    }
    else if (to === ROUND_STATES.RESULTS) {
      const board = this.onlinePlayers.getLeaderboard(this.player);
      const rewardPool = this.round.getRewardPool();
      
      // Calculate reward distribution based on performance
      const totalBoxes = this.boxes.boxes.filter(b => b.state === 'opened').length || 1;
      const playerBoxes = this.player.boxesOpened || 0;
      
      // Player's share of the reward pool (proportional to boxes opened)
      const playerShare = Math.floor((playerBoxes / Math.max(totalBoxes, 1)) * rewardPool);
      
      // Add the round reward to player's pending tokens (if connected and not guest)
      if (playerShare > 0 && this.wallet.isConnected() && !this.wallet.isGuest) {
        this._syncTokensToBackend(playerShare, 'round_reward');
        this.player.pendingTokens = (this.player.pendingTokens || 0) + playerShare;
      }
      
      this.round.setResults({
        roundNumber: this.round.getRoundNumber(),
        playerChests: this.player.boxesOpened,
        playerTokens: this.player.tokensEarned,
        forfeitedTokens: this._forfeitedTokensTotal || 0,
        roundTime: this.round.getRoundTime(),
        leaderboard: board,
        rewardPool: rewardPool,
        playerReward: playerShare,
        totalBoxesOpened: totalBoxes
      });
      this.ui.showResults(this.round.getResults(), this.wallet);
    }
    else if (to === ROUND_STATES.COUNTDOWN) {
      this.ui.showLobby(this.round, this.wallet, this.onlinePlayers, this.player);
    }
  }

  showRoundStartBanner() {
    const overlay = document.createElement('div');
    overlay.className = 'round-start-overlay';
    overlay.innerHTML = `<h2 class="round-start-text">ROUND START! HUNT CHESTS</h2>`;
    document.body.appendChild(overlay);
    setTimeout(() => { if (overlay.parentNode) document.body.removeChild(overlay); }, 2000);
  }

  /* ────────────────────────────────────────────
     RENDER PIPELINE
     ──────────────────────────────────────────── */
  render() {
    const state = this.round.getState();
    if (state !== ROUND_STATES.LIVE) return;

    const ctx = this.ctx;

    // Clear
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Apply screen shake offset
    ctx.save();
    if (this.screenShake.intensity > 0) {
      ctx.translate(this.screenShake.x, this.screenShake.y);
    }

    // 1. Map tiles (with edge shadows + animated grass built-in)
    this.map.render(ctx, this.camera);

    // 2. Ambient behind-layer particles (fireflies, leaves, dust motes)
    this.particles.renderAmbient(ctx, this.camera);

    // 3. Boxes
    this.boxes.render(ctx, this.camera);

    // 4. Other online players (guests + wallet users)
    this.onlinePlayers.render(ctx, this.camera);

    // 5. Player
    this.player.render(ctx, this.camera);

    // 6. Event particles (coins, confetti, dust)
    this.particles.render(ctx, this.camera);

    ctx.restore(); // end screen-shake translate

    // 7. Post-processing: dynamic lighting overlay
    this.renderLighting();

    // 8. Post-processing: vignette + color grading
    this.renderVignette();

    // 9. Compass HUD (drawn on top of post-processing)
    this.compass.render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 10. Minimap
    const miniCanvas = document.getElementById('minimap-canvas');
    if (miniCanvas) {
      const mctx = miniCanvas.getContext('2d');
      mctx.imageSmoothingEnabled = false;
      this.map.renderMinimap(mctx, 0, 0, 140, 100, this.player.x, this.player.y, this.boxes.boxes);
    }
  }

  /* ────────────────────────────────────────────
     ATMOSPHERE — returns tint color + opacity
     based on a smooth day/dusk/night/dawn cycle
     ──────────────────────────────────────────── */
  getAtmosphere() {
    const t = (this._atmosphereTime % this._atmosphereCycle) / this._atmosphereCycle;

    // 0-0.35 day | 0.35-0.50 dusk | 0.50-0.80 night | 0.80-1.0 dawn
    if (t < 0.35) {
      return { r: 0, g: 0, b: 0, overlay: 0.0, tintR: 255, tintG: 245, tintB: 220, tintA: 0.01, label: 'day' };
    } else if (t < 0.50) {
      const p = (t - 0.35) / 0.15;
      return { r: 40, g: 15, b: 5, overlay: p * 0.18, tintR: 255, tintG: 160, tintB: 60, tintA: 0.04 * p, label: 'dusk' };
    } else if (t < 0.80) {
      const p = (t - 0.50) / 0.30;
      const o = 0.18 + p * 0.10;
      return { r: 8, g: 12, b: 30, overlay: o, tintR: 80, tintG: 120, tintB: 220, tintA: 0.03, label: 'night' };
    } else {
      const p = (t - 0.80) / 0.20;
      const o = 0.28 * (1 - p);
      return { r: 30, g: 15, b: 5, overlay: o, tintR: 255, tintG: 190, tintB: 100, tintA: 0.03 * (1 - p), label: 'dawn' };
    }
  }

  /* ────────────────────────────────────────────
     POST-PROCESSING: DYNAMIC LIGHTING
     ──────────────────────────────────────────── */
  renderLighting() {
    const lc = this._lightCtx;
    const atm = this.getAtmosphere();

    // CLEAR the offscreen canvas completely first
    lc.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Fill with atmosphere-tinted overlay
    lc.globalCompositeOperation = 'source-over';
    lc.fillStyle = `rgba(${atm.r}, ${atm.g}, ${atm.b}, ${atm.overlay})`;
    lc.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Only punch light holes when the overlay is actually visible
    if (atm.overlay > 0.02) {
      lc.globalCompositeOperation = 'destination-out';

      // Torch glow around player — large enough to fill most of the screen
      const px = this.player.x - this.camera.x + this.player.width / 2;
      const py = this.player.y - this.camera.y + this.player.height / 2;
      const playerRadius = 380;
      const playerGrad = lc.createRadialGradient(px, py, 0, px, py, playerRadius);
      playerGrad.addColorStop(0, 'rgba(0,0,0,1)');
      playerGrad.addColorStop(0.55, 'rgba(0,0,0,0.6)');
      playerGrad.addColorStop(0.85, 'rgba(0,0,0,0.15)');
      playerGrad.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = playerGrad;
      lc.beginPath();
      lc.arc(px, py, playerRadius, 0, Math.PI * 2);
      lc.fill();

      // Small glow cutouts around revealed/opening chests
      for (const b of this.boxes.boxes) {
        if (b.state === 'revealed' || b.state === 'opening') {
          const bx = b.x - this.camera.x;
          const by = b.y - this.camera.y;
          if (bx < -100 || bx > CANVAS_WIDTH + 100 || by < -100 || by > CANVAS_HEIGHT + 100) continue;
          const r = 60;
          const g = lc.createRadialGradient(bx, by, 0, bx, by, r);
          g.addColorStop(0, 'rgba(0,0,0,0.8)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          lc.fillStyle = g;
          lc.beginPath();
          lc.arc(bx, by, r, 0, Math.PI * 2);
          lc.fill();
        }
      }
    }

    // Composite the lighting layer onto the main canvas
    lc.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(this._lightCanvas, 0, 0);
  }

  /* ────────────────────────────────────────────
     POST-PROCESSING: VIGNETTE + COLOR GRADING
     ──────────────────────────────────────────── */
  renderVignette() {
    const ctx = this.ctx;
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    const outerR = Math.sqrt(cx * cx + cy * cy);
    const atm = this.getAtmosphere();

    // Subtle vignette — barely visible, just darkens corners
    const vig = ctx.createRadialGradient(cx, cy, CANVAS_WIDTH * 0.45, cx, cy, outerR);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.7, 'rgba(0,0,0,0.04)');
    vig.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Atmosphere color tint
    if (atm.tintA > 0.005) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = `rgba(${atm.tintR}, ${atm.tintG}, ${atm.tintB}, ${atm.tintA})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.restore();
    }
  }
}

// Instantiate engine when document parsing completes
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
});
