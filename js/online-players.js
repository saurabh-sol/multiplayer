/* ============================================
   SOLANA TREASURE HUNT — OnlinePlayersManager
   Tracks online player count via API heartbeat
   ============================================ */

class OnlinePlayersManager {
  constructor() {
    this.onlineCount = 1; // At least the current player
    this.lastHeartbeat = 0;
    this.heartbeatInterval = 60000; // 60 seconds
    this.pollInterval = 30000; // 30 seconds for online count
    this._heartbeatTimer = null;
    this._pollTimer = null;
  }

  start(wallet) {
    this.wallet = wallet;
    
    // Initial fetch
    this.fetchOnlineCount();
    
    // Send heartbeat immediately if logged in
    if (wallet && wallet.isConnected() && !wallet.isGuest) {
      this.sendHeartbeat();
    }
    
    // Start polling for online count
    this._pollTimer = setInterval(() => {
      this.fetchOnlineCount();
    }, this.pollInterval);
    
    // Start heartbeat timer
    this._heartbeatTimer = setInterval(() => {
      if (this.wallet && this.wallet.isConnected() && !this.wallet.isGuest) {
        this.sendHeartbeat();
      }
    }, this.heartbeatInterval);
  }

  stop() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  async fetchOnlineCount() {
    try {
      const response = await fetch(`${API_BASE_URL}/players/online`);
      if (response.ok) {
        const data = await response.json();
        this.onlineCount = Math.max(1, data.online || 1);
      }
    } catch (error) {
      console.warn('Failed to fetch online count:', error);
    }
  }

  async sendHeartbeat() {
    if (!this.wallet || !this.wallet.address) return;
    
    try {
      await this.wallet.apiHeartbeat();
      this.lastHeartbeat = Date.now();
    } catch (error) {
      console.warn('Heartbeat failed:', error);
    }
  }

  getOnlineCount() {
    return this.onlineCount;
  }

  // Stub methods for compatibility with old multiplayer code
  spawnPlayers() {}
  update() {}
  render() {}
  reset() {}
  
  getLeaderboard(player) {
    // Return just the current player for now
    return [{
      name: player.name || 'You',
      score: player.boxesOpened || 0,
      isPlayer: true
    }];
  }
}

window.OnlinePlayersManager = OnlinePlayersManager;
