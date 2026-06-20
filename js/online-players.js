/* ============================================
   TREZO — OnlinePlayersManager
   Real-time presence sync + smooth remote rendering
   ============================================ */

class OnlinePlayersManager {
  constructor() {
    this.onlineCount = 1;
    this.remotePlayers = [];
    this.onlinePlayerList = [];
    this.lastSync = 0;
    this.syncInterval = 120;
    this.pollInterval = 1200;
    this._syncTimer = null;
    this._pollTimer = null;
    this.wallet = null;
    this.sessionId = this._getSessionId();
    this.playerColor = this._pickColor(this.sessionId);
    this.roundState = 'WAITING';
    this.roundNumber = 1;
  }

  _getSessionId() {
    let id = localStorage.getItem('trezo_session_id');
    if (!id) {
      id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem('trezo_session_id', id);
    }
    return id;
  }

  _pickColor(seed) {
    const colors = ['#e74c3c', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#e91e63', '#3498db', '#f1c40f'];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  start(wallet) {
    this.wallet = wallet;
    if (wallet?.address) {
      this.sessionId = wallet.address;
      this.playerColor = this._pickColor(wallet.address);
    }

    this.fetchPresence();
    this.sendPresence({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, direction: 'down' });

    this._pollTimer = setInterval(() => this.fetchPresence(), this.pollInterval);
    this._syncTimer = setInterval(() => {
      if (window.gameInstance?.player) {
        const p = window.gameInstance.player;
        this.sendPresence({ x: p.x, y: p.y, direction: p.direction });
      }
    }, this.syncInterval);

    if (wallet?.isConnected?.() && !wallet?.isGuest) {
      wallet.apiHeartbeat?.();
    }
  }

  stop() {
    if (this._pollTimer) clearInterval(this._pollTimer);
    if (this._syncTimer) clearInterval(this._syncTimer);
    this._pollTimer = null;
    this._syncTimer = null;

    fetch(`${API_BASE_URL}/players/presence/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId })
    }).catch(() => {});
  }

  setRoundContext(roundNumber, roundState) {
    this.roundNumber = roundNumber;
    this.roundState = roundState;
  }

  async sendPresence({ x, y, direction }) {
    const game = window.gameInstance;
    const name = this.wallet?.getUsername?.() || this.wallet?.username || game?.player?.name || 'Guest Hunter';
    const boxesOpened = game?.player?.boxesOpened || 0;
    const tokensEarned = game?.player?.tokensEarned || 0;

    try {
      await fetch(`${API_BASE_URL}/players/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          name,
          walletAddress: this.wallet?.address || null,
          isGuest: !!this.wallet?.isGuest,
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          direction,
          roundNumber: this.roundNumber,
          roundState: this.roundState,
          color: this.playerColor,
          boxesOpened,
          tokensEarned
        })
      });
    } catch (error) {
      console.warn('Presence sync failed:', error);
    }
  }

  async fetchPresence() {
    try {
      const response = await fetch(`${API_BASE_URL}/players/presence?sessionId=${encodeURIComponent(this.sessionId)}`);
      if (!response.ok) return;

      const data = await response.json();
      this.onlineCount = Math.max(1, data.count || 1);
      this.onlinePlayerList = data.allPlayers || data.players || [];

      const existing = new Map(this.remotePlayers.map(p => [p.sessionId, p]));
      this.remotePlayers = (data.players || []).map(p => {
        const prev = existing.get(p.sessionId);
        const targetX = p.x ?? prev?.targetX ?? 0;
        const targetY = p.y ?? prev?.targetY ?? 0;
        return {
          ...p,
          width: 32,
          height: 40,
          x: prev?.x ?? targetX,
          y: prev?.y ?? targetY,
          targetX,
          targetY,
          direction: p.direction || prev?.direction || 'down',
          isMoving: false,
          frameIndex: prev?.frameIndex || 0,
          animTimer: prev?.animTimer || 0
        };
      });
    } catch (error) {
      console.warn('Failed to fetch presence:', error);
    }
  }

  getOnlineCount() {
    return this.onlineCount;
  }

  getWalletPlayerCount() {
    const list = this.onlinePlayerList.length ? this.onlinePlayerList : [];
    if (list.length === 0) {
      return this.wallet?.isGuest ? 0 : 1;
    }
    return list.filter(p => !p.isGuest).length;
  }

  getOnlinePlayerList() {
    const game = window.gameInstance;
    const self = {
      sessionId: this.sessionId,
      name: this.wallet?.getUsername?.() || this.wallet?.username || game?.player?.name || 'You',
      isGuest: !!this.wallet?.isGuest,
      isYou: true
    };

    const others = this.remotePlayers.map(p => ({ ...p, isYou: false }));
    return [self, ...others];
  }

  update(deltaTime) {
    for (const bot of this.remotePlayers) {
      if (bot.targetX === undefined) bot.targetX = bot.x;
      if (bot.targetY === undefined) bot.targetY = bot.y;

      const dx = bot.targetX - bot.x;
      const dy = bot.targetY - bot.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 120) {
        bot.x = bot.targetX;
        bot.y = bot.targetY;
      } else if (dist > 0.5) {
        const lerp = 1 - Math.pow(0.00001, deltaTime * 10);
        bot.x += dx * lerp;
        bot.y += dy * lerp;
      }

      bot.isMoving = dist > 2;

      if (bot.isMoving) {
        if (Math.abs(dy) > Math.abs(dx) * 0.6) {
          bot.direction = dy < 0 ? 'up' : 'down';
        }
        if (Math.abs(dx) > 2) {
          bot.direction = dx < 0 ? 'left' : 'right';
        }
        bot.animTimer += deltaTime;
        if (bot.animTimer >= 0.18) {
          bot.animTimer -= 0.18;
          bot.frameIndex = (bot.frameIndex + 1) % 2;
        }
      } else {
        bot.frameIndex = 0;
        bot.animTimer = 0;
      }
    }
  }

  reset() {
    this.remotePlayers = [];
  }

  spawnPlayers() {}

  getLeaderboard(player) {
    const list = [{
      name: player.name || 'You',
      boxesOpened: player.boxesOpened || 0,
      tokensEarned: player.tokensEarned || 0,
      isPlayer: true
    }];

    for (const remote of this.remotePlayers) {
      list.push({
        name: remote.name,
        boxesOpened: remote.boxesOpened || 0,
        tokensEarned: remote.tokensEarned || 0,
        isPlayer: false
      });
    }

    return list.sort((a, b) => b.tokensEarned - a.tokensEarned || b.boxesOpened - a.boxesOpened);
  }

  render(ctx, camera) {
    ctx.save();
    const p = 2;

    for (const bot of this.remotePlayers) {
      const sx = Math.floor(bot.x - camera.x);
      const sy = Math.floor(bot.y - camera.y);

      if (sx < -48 || sx > camera.width + 48 || sy < -48 || sy > camera.height + 48) continue;

      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(sx + bot.width / 2, sy + bot.height - 2, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      let drawDir = bot.direction || 'down';
      if (drawDir === 'left') {
        ctx.translate(sx + bot.width, sy);
        ctx.scale(-1, 1);
        drawDir = 'right';
      } else {
        ctx.translate(sx, sy);
      }

      const px = (col, row, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(col * p, row * p, p, p);
      };

      const TUNIC = bot.color || '#3498db';
      const SKIN = '#F5CBA7';
      const HAIR = bot.isGuest ? '#555' : '#111';
      const EYE = '#222';
      const BELT = '#8D6E63';
      const BOOT = '#5D4037';
      const legOff = bot.isMoving ? (bot.frameIndex === 0 ? 1 : -1) : 0;

      if (drawDir === 'down' || drawDir === 'left' || drawDir === 'right') {
        px(6, 0, HAIR); px(7, 0, HAIR); px(8, 0, HAIR); px(9, 0, HAIR);
        px(5, 1, HAIR); px(6, 1, HAIR); px(7, 1, HAIR); px(8, 1, HAIR); px(9, 1, HAIR); px(10, 1, HAIR);
        px(5, 2, HAIR); px(6, 2, HAIR); px(7, 2, HAIR); px(8, 2, HAIR); px(9, 2, HAIR); px(10, 2, HAIR);
        px(5, 3, HAIR); px(6, 3, SKIN); px(7, 3, SKIN); px(8, 3, SKIN); px(9, 3, SKIN); px(10, 3, HAIR);
        px(5, 4, SKIN); px(6, 4, EYE); px(7, 4, SKIN); px(8, 4, SKIN); px(9, 4, EYE); px(10, 4, SKIN);
        px(5, 7, TUNIC); px(6, 7, TUNIC); px(7, 7, TUNIC); px(8, 7, TUNIC); px(9, 7, TUNIC); px(10, 7, TUNIC);
        px(4, 8, TUNIC); px(5, 8, TUNIC); px(6, 8, TUNIC); px(7, 8, TUNIC); px(8, 8, TUNIC); px(9, 8, TUNIC); px(10, 8, TUNIC); px(11, 8, TUNIC);
        px(5, 10, BELT); px(6, 10, BELT); px(7, 10, BELT); px(8, 10, BELT); px(9, 10, BELT); px(10, 10, BELT);
        px(5, 11, TUNIC); px(6, 11, TUNIC); px(7, 11, TUNIC); px(8, 11, TUNIC); px(9, 11, TUNIC); px(10, 11, TUNIC);
        px(6 + legOff, 13, BOOT); px(9 - legOff, 13, BOOT);
      }

      ctx.restore();

      const label = bot.isGuest ? `${bot.name} (Guest)` : bot.name;
      ctx.fillStyle = bot.isGuest ? '#9ca3af' : '#4ade80';
      ctx.font = '6px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(label, sx + bot.width / 2, sy - 8);

      if (!bot.isGuest) {
        ctx.fillStyle = '#f0c040';
        ctx.fillRect(sx + bot.width / 2 - 2, sy - 14, 4, 4);
      }
    }

    ctx.restore();
  }
}

window.OnlinePlayersManager = OnlinePlayersManager;
