/* ============================================
   SOLANA TREASURE HUNT — UIManager
   Handles UI panels, screen swaps, and HUD updates
   Pixel Fantasy Edition
   ============================================ */

class UIManager {
  constructor() {
    this.currentScreen = 'landing';
    this.notifContainer = document.getElementById('notification-container');
    this.gameContainer = document.getElementById('game-container');
  }

  showLanding() {
    this.hideAll();
    this.currentScreen = 'landing';
    document.getElementById('landing-screen').classList.remove('hidden');
  }

  showLoading(onComplete) {
    this.hideAll();
    this.currentScreen = 'loading';
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.classList.remove('hidden');
    
    const progressBar = document.getElementById('loading-progress-bar');
    const statusText = document.getElementById('loading-status');
    const tipText = document.getElementById('loading-tip');
    
    const tips = [
      "TIP: Hidden boxes contain special rewards and tokens!",
      "TIP: Build a Storage Room to safely store your points!",
      "TIP: The compass reveals the nearest treasure chest!",
      "TIP: Higher tracking skill helps detect hidden boxes!",
      "TIP: Jackpot boxes can contain 5000+ tokens!",
      "TIP: Use Speed Boots to move faster across the map!",
      "TIP: Energy Potions restore your stamina instantly!"
    ];
    
    const statuses = [
      "Connecting to server...",
      "Loading map data...",
      "Spawning treasures...",
      "Preparing your adventure...",
      "Almost ready..."
    ];
    
    let progress = 0;
    let statusIndex = 0;
    
    // Random tip
    tipText.textContent = tips[Math.floor(Math.random() * tips.length)];
    
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress > 100) progress = 100;
      
      progressBar.style.width = progress + '%';
      
      // Update status text
      const newStatusIndex = Math.min(Math.floor(progress / 25), statuses.length - 1);
      if (newStatusIndex !== statusIndex) {
        statusIndex = newStatusIndex;
        statusText.textContent = statuses[statusIndex];
      }
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 500);
      }
    }, 200);
  }

  showLobby(roundManager, walletManager, fakeMultiplayer, player) {
    this.hideAll();
    this.currentScreen = 'lobby';
    document.getElementById('lobby-screen').classList.remove('hidden');

    this.updateLobby({
      roundNumber: roundManager.getRoundNumber(),
      state: roundManager.getState(),
      countdown: roundManager.getCountdown(),
      totalBoxes: ROUND_CONFIG.TOTAL_CHESTS,
      rewardPool: roundManager.getRewardPool(),
      onlinePlayers: fakeMultiplayer.getOnlineCount(),
      walletPlayers: fakeMultiplayer.getWalletPlayerCount?.() ?? 0,
      leaderboard: fakeMultiplayer.getLeaderboard({ name: 'You', boxesOpened: 0, tokensEarned: 0 }),
      isGuest: walletManager.isGuest,
      playerAttributes: player ? player.attributes : null,
      waitingForPlayers: roundManager.waitingForPlayers,
      playersNeeded: roundManager.getWalletPlayersNeeded?.() ?? roundManager.getPlayersNeeded()
    });
  }

  showGame() {
    this.hideAll();
    this.currentScreen = 'game';
    document.getElementById('game-hud').classList.remove('hidden');
  }

  showResults(roundResults, walletManager) {
    this.hideAll();
    this.currentScreen = 'results';
    
    const resultsPanel = document.getElementById('results-screen');
    resultsPanel.classList.remove('hidden');

    // Stats
    document.getElementById('results-round-number').innerText = `ROUND #${roundResults.roundNumber} RESULTS`;
    document.getElementById('results-loot-chests').innerText = roundResults.playerChests;
    document.getElementById('results-loot-tokens').innerText = `${roundResults.playerTokens.toLocaleString()} $HUNT`;
    
    // Round reward pool distribution
    const rewardPool = roundResults.rewardPool || 0;
    const totalDistributed = roundResults.totalDistributed ?? roundResults.playerTokens ?? 0;
    const chestsOpened = roundResults.chestsOpened ?? roundResults.playerChests ?? 0;
    const totalChests = roundResults.totalChests ?? ROUND_CONFIG.TOTAL_CHESTS;
    const distPercent = rewardPool > 0 ? Math.round((totalDistributed / rewardPool) * 100) : 0;

    document.getElementById('results-pool-amount').innerText = `${rewardPool.toLocaleString()} $HUNT`;
    document.getElementById('results-your-share').innerText = `${totalDistributed.toLocaleString()} $HUNT`;
    document.getElementById('results-share-percent').innerText = `${distPercent}%`;
    document.getElementById('results-round-reward').innerText = `${roundResults.playerTokens.toLocaleString()} $HUNT`;
    document.getElementById('results-total-boxes').innerText = `${chestsOpened}/${totalChests}`;
    
    // Time formatting
    const mins = Math.floor(roundResults.roundTime / 60).toString().padStart(2, '0');
    const secs = Math.floor(roundResults.roundTime % 60).toString().padStart(2, '0');
    document.getElementById('results-time').innerText = `${mins}:${secs}`;

    // Leaderboard
    const list = document.getElementById('results-leaderboard-list');
    list.innerHTML = '';
    
    roundResults.leaderboard.slice(0, 5).forEach((item, index) => {
      const li = document.createElement('li');
      if (item.isPlayer) {
        li.className = 'is-player';
      }
      const rankColor = index === 0 ? 'var(--gold)' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'var(--text-secondary)';
      li.innerHTML = `
        <span class="rank" style="color: ${rankColor}">#${index + 1}</span>
        <span class="name">${item.name}</span>
        <span class="score">${item.boxesOpened} chests (${item.tokensEarned.toLocaleString()} $HUNT)</span>
      `;
      list.appendChild(li);
    });

    // Show warning if user had forfeited rewards (for guests)
    const warning = document.getElementById('results-forfeit-warning');
    if (walletManager.isGuest) {
      warning.classList.remove('hidden');
      const forfeitedAmount = roundResults.forfeitedTokens || 0;
      warning.querySelector('strong').innerText = `FORFEITED: ${forfeitedAmount.toLocaleString()} $HUNT`;
    } else {
      warning.classList.add('hidden');
    }
  }

  updateHUD(data) {
    if (this.currentScreen !== 'game') return;

    document.getElementById('hud-chests-left').innerText = `${data.boxesRemaining} / ${data.totalBoxes}`;

    const pool = data.rewardPool ?? 0;
    if (pool >= 1000) {
      document.getElementById('hud-reward-pool').innerText = `${(pool / 1000).toFixed(0)}K $HUNT`;
    } else {
      document.getElementById('hud-reward-pool').innerText = `${pool.toLocaleString()} $HUNT`;
    }

    const earnedEl = document.getElementById('hud-tokens-earned');
    if (earnedEl) {
      earnedEl.innerText = `${(data.tokensEarned || 0).toLocaleString()} $HUNT`;
    }

    // Rank
    document.getElementById('hud-hunter-rank').innerText = `#${data.rank}`;

    // Online players list
    const countEl = document.getElementById('online-count');
    const listEl = document.getElementById('online-players-list');
    if (countEl) countEl.innerText = data.onlinePlayers || 1;
    if (listEl && data.onlinePlayerList) {
      listEl.innerHTML = '';
      data.onlinePlayerList.forEach(p => {
        const li = document.createElement('li');
        li.className = `online-player-item ${p.isYou ? 'is-you' : (p.isGuest ? 'is-guest' : 'is-wallet')}`;
        li.textContent = p.isYou
          ? `${p.name} (You)`
          : (p.isGuest ? `${p.name} (Guest)` : p.name);
        listEl.appendChild(li);
      });
    }

    // Wallet display
    const addr = document.getElementById('hud-wallet-address');
    if (data.isGuest) {
      addr.innerText = 'Guest (No Rewards)';
      addr.className = 'hud-stat-value text-ruby';
    } else {
      addr.innerText = data.walletAddress;
      addr.className = 'hud-stat-value text-emerald';
    }

    // Energy Fill
    const fill = document.getElementById('hud-energy-fill');
    const text = document.getElementById('hud-energy-text');
    
    fill.style.width = `${data.energy}%`;
    text.innerText = `${Math.floor(data.energy)} / 100`;

    if (data.energy < 25) {
      fill.classList.add('low');
    } else {
      fill.classList.remove('low');
    }

    // Update Quick Items counts
    document.getElementById('inv-compass-count').innerText = data.inventory.compass || 0;
    document.getElementById('inv-boots-count').innerText = data.inventory.boots || 0;
    document.getElementById('inv-potion-count').innerText = data.inventory.potion || 0;
    
    // Update online count if element exists
    const onlineEl = document.getElementById('online-count');
    if (onlineEl && window.gameInstance?.onlinePlayers) {
      onlineEl.innerText = window.gameInstance.onlinePlayers.getOnlineCount();
    }
  }

  showNotification(message, type = 'info', duration = 3000) {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'error') icon = '🚨';

    notif.innerHTML = `
      <span class="notification-icon">${icon}</span>
      <span>${message}</span>
    `;

    this.notifContainer.appendChild(notif);

    // Fade out timer
    setTimeout(() => {
      notif.classList.add('hiding');
      setTimeout(() => {
        if (notif.parentNode === this.notifContainer) {
          this.notifContainer.removeChild(notif);
        }
      }, 300);
    }, duration);
  }

  showBoxReward(boxX, boxY, boxType, rewardValue, camera) {
    // Generate text banner overlay floating above game canvas relative to chest coordinates
    const popup = document.createElement('div');
    popup.className = 'box-reward-popup';

    // Canvas scaling values (offset placement inside container matching canvas size)
    const bounds = document.getElementById('game-canvas').getBoundingClientRect();
    const scaleX = bounds.width / 960;
    const scaleY = bounds.height / 640;

    const screenX = (boxX - camera.x) * scaleX + bounds.left;
    const screenY = (boxY - camera.y) * scaleY + bounds.top;

    popup.style.left = `${screenX}px`;
    popup.style.top = `${screenY}px`;

    const info = BOX_TYPES[boxType];
    const name = info.name;
    const color = info.color || '#fff';

    if (typeof rewardValue === 'number' && rewardValue > 0) {
      popup.innerHTML = `
        <span class="reward-type" style="color: ${color}; text-shadow: 0 0 10px ${color}80;">${name}</span>
        <span class="reward-value">+${rewardValue.toLocaleString()} $HUNT</span>
      `;
    } else {
      // In-game loot check
      popup.innerHTML = `
        <span class="reward-type" style="color: ${color}; text-shadow: 0 0 10px ${color}80;">${name}</span>
        <span class="reward-value" style="font-size: 10px;">${rewardValue}</span>
      `;
    }

    document.body.appendChild(popup);

    // Clean up
    setTimeout(() => {
      if (popup.parentNode) {
        document.body.removeChild(popup);
      }
    }, 2000);
  }

  showGuestWarning() {
    this.showNotification('Guest mode: explore freely, but connect wallet to earn $HUNT from reward chests.', 'warning', 4500);
  }

  updateLobby(data) {
    if (this.currentScreen !== 'lobby') return;

    document.getElementById('lobby-round-number').innerText = `ROUND #${data.roundNumber}`;
    document.getElementById('lobby-reward-pool').innerText = `${data.rewardPool.toLocaleString()} $HUNT`;
    document.getElementById('lobby-online-count').innerText = `${data.onlinePlayers} Hunters Online`;
    document.getElementById('lobby-countdown-timer').innerText = data.countdown;
    document.getElementById('lobby-chest-count').innerText = `${data.totalBoxes} (15 Reward + 50 Gold)`;

    const walletEl = document.getElementById('lobby-wallet-count');
    if (walletEl) {
      walletEl.innerText = `${data.walletPlayers ?? 0} / ${ROUND_CONFIG.MIN_WALLET_PLAYERS}`;
    }

    const badge = document.getElementById('lobby-status-badge');
    if (data.waitingForPlayers) {
      badge.innerHTML = `<span class="status-badge waiting-players"><span class="status-dot"></span>WAITING FOR WALLET HUNTERS</span>`;
      document.getElementById('lobby-countdown-timer').innerText = `${data.playersNeeded} more wallet hunters needed`;
    } else if (data.state === 'REFILLING') {
      badge.innerHTML = `<span class="status-badge waiting"><span class="status-dot"></span>PREPARING NEXT ROUND</span>`;
      document.getElementById('lobby-countdown-timer').innerText = `${data.countdown}s`;
    } else if (data.state === 'WAITING') {
      badge.innerHTML = `<span class="status-badge waiting"><span class="status-dot"></span>WAITING</span>`;
    } else if (data.state === 'COUNTDOWN') {
      badge.innerHTML = `<span class="status-badge countdown"><span class="status-dot"></span>COUNTDOWN</span>`;
    } else if (data.state === 'LIVE') {
      badge.innerHTML = `<span class="status-badge live"><span class="status-dot"></span>LIVE</span>`;
    }

    // Guest warnings banner visibility check
    const warning = document.getElementById('lobby-guest-warning');
    if (data.isGuest) {
      warning.classList.remove('hidden');
      warning.innerHTML = `
        <p>⚠️ <strong>Guest Mode</strong> — You can explore and open gold chests, but reward rounds require a connected wallet.</p>
        <p style="font-size: 12px; margin-top: 4px;">Purple reward chests are wallet-only. Connect wallet to earn $HUNT.</p>
      `;
    } else {
      warning.classList.add('hidden');
    }

    // Update player attributes if available
    if (data.playerAttributes) {
      this._updatePlayerAttributes(data.playerAttributes);
    }

    // Leaderboard list render
    const list = document.getElementById('lobby-leaderboard-list');
    list.innerHTML = '';
    
    data.leaderboard.slice(0, 5).forEach((item, index) => {
      const li = document.createElement('li');
      if (item.isPlayer) {
        li.className = 'is-player';
      }
      const rankColor = index === 0 ? 'var(--gold)' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'var(--text-secondary)';
      li.innerHTML = `
        <span class="rank" style="color: ${rankColor}">#${index + 1}</span>
        <span class="name">${item.name}</span>
        <span class="score">${item.boxesOpened} chests · ${item.tokensEarned.toLocaleString()} $HUNT</span>
      `;
      list.appendChild(li);
    });
  }

  _updatePlayerAttributes(attrs) {
    const maxAttr = 20; // Maximum attribute value
    
    // Update hunting
    const huntingEl = document.getElementById('attr-hunting');
    const huntingFill = huntingEl?.parentElement?.querySelector('.attr-bar-fill');
    if (huntingEl) huntingEl.innerText = attrs.hunting;
    if (huntingFill) huntingFill.style.width = `${(attrs.hunting / maxAttr) * 100}%`;
    
    // Update tracking
    const trackingEl = document.getElementById('attr-tracking');
    const trackingFill = trackingEl?.parentElement?.querySelector('.attr-bar-fill');
    if (trackingEl) trackingEl.innerText = attrs.tracking;
    if (trackingFill) trackingFill.style.width = `${(attrs.tracking / maxAttr) * 100}%`;
    
    // Update speed
    const speedEl = document.getElementById('attr-speed');
    const speedFill = speedEl?.parentElement?.querySelector('.attr-bar-fill');
    if (speedEl) speedEl.innerText = attrs.speed;
    if (speedFill) speedFill.style.width = `${(attrs.speed / maxAttr) * 100}%`;
    
    // Update luck
    const luckEl = document.getElementById('attr-luck');
    const luckFill = luckEl?.parentElement?.querySelector('.attr-bar-fill');
    if (luckEl) luckEl.innerText = attrs.luck;
    if (luckFill) luckFill.style.width = `${(attrs.luck / maxAttr) * 100}%`;
  }

  updateResults(data) {
    if (this.currentScreen !== 'results') return;
    document.getElementById('results-countdown-timer').innerText = data.nextCountdown;
  }

  hideAll() {
    document.getElementById('landing-screen').classList.add('hidden');
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-hud').classList.add('hidden');
    document.getElementById('results-screen').classList.add('hidden');
    document.getElementById('loading-screen')?.classList.add('hidden');
  }
}

// Expose globally
window.UIManager = UIManager;
