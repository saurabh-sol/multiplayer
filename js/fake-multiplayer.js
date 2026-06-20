/* ============================================
   SOLANA TREASURE HUNT — FakeMultiplayer
   Competitive AI players movement & leaderboards
   ============================================ */

class FakeMultiplayer {
  constructor() {
    this.players = [];
    this.onlineCount = 1;
    this.botNames = [
      'ShadowHunter', 'CrystalFox', 'EmberKnight', 'SolanaGold', 
      'DegenSeeker', 'PixelWizard', 'TreasureLord', 'PhantomCatcher', 
      'RunicChaser', 'ApexExplorer', 'QuantumHunts', 'CrypticGlade'
    ];
  }

  spawnPlayers(count, map) {
    this.players = [];
    this.onlineCount = count + 1; // bots + real player

    const tunics = ['#e74c3c', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#e91e63', '#f1c40f', '#ecf0f1'];

    for (let i = 0; i < count; i++) {
      const spawnPoints = map.getSpawnPoints(1);
      const spawn = spawnPoints.length > 0 ? spawnPoints[0] : { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };

      // Set random movement speed
      const speedAttr = 4 + Math.floor(Math.random() * 8); // speed level 4 to 12
      const speedValue = 120 + speedAttr * 12;

      this.players.push({
        name: this.botNames[i % this.botNames.length],
        x: spawn.x,
        y: spawn.y,
        width: 32,
        height: 40,
        direction: 'down',
        isMoving: false,
        frameIndex: 0,
        animTimer: 0,
        color: tunics[i % tunics.length],
        boxesOpened: 0,
        tokensEarned: 0,
        targetX: spawn.x,
        targetY: spawn.y,
        speed: speedValue,
        searchTimer: 1.0 + Math.random() * 3.0,
        openingBox: null,
        openProgress: 0,
        openDurationNeeded: 2.0 + Math.random() * 2.0 // time to open
      });
    }
  }

  update(deltaTime, map, boxManager) {
    for (const bot of this.players) {
      // 1. If currently opening a chest, progress opening progress
      if (bot.openingBox) {
        bot.isMoving = false;
        bot.openProgress += (100 / bot.openDurationNeeded) * deltaTime;
        
        // Check if box was claimed by someone else first
        if (bot.openingBox.state === 'opened') {
          bot.openingBox = null;
          bot.openProgress = 0;
          continue;
        }

        if (bot.openProgress >= 100) {
          const box = bot.openingBox;
          box.state = 'opened';
          box.openedBy = bot.name;
          
          bot.boxesOpened++;
          bot.tokensEarned += box.tokenReward;
          bot.openingBox = null;
          bot.openProgress = 0;

          // Emit visual explosion on opened coordinate
          if (window.gameInstance && window.gameInstance.particles) {
            window.gameInstance.particles.emitCoinBurst(box.x, box.y);
            if (box.type === 'JACKPOT') {
              window.gameInstance.particles.emitConfetti(box.x, box.y);
            }
          }

          // Trigger audio chime if close to player
          if (window.gameInstance && window.gameInstance.audio) {
            const dist = Math.sqrt((box.x - window.gameInstance.player.x)**2 + (box.y - window.gameInstance.player.y)**2);
            if (dist < 300) {
              window.gameInstance.audio.playChestOpen();
            }
          }

          // UI notification trigger
          if (window.gameInstance && window.gameInstance.ui) {
            window.gameInstance.ui.showNotification(`${bot.name} opened a ${BOX_TYPES[box.type].name}!`, "info");
          }
        }
        continue;
      }

      // 2. Scan for closest revealed/detected chest to hunt down
      let targetBox = null;
      let minChestDist = 200; // Only target chests within 200px radius

      for (const box of boxManager.boxes) {
        if (box.state !== 'opened' && box.state !== 'opening' && box.state !== 'hidden') {
          const dist = Math.sqrt((box.x - bot.x) * (box.x - bot.x) + (box.y - bot.y) * (box.y - bot.y));
          if (dist < minChestDist) {
            minChestDist = dist;
            targetBox = box;
          }
        }
      }

      if (targetBox) {
        bot.targetX = targetBox.x;
        bot.targetY = targetBox.y;

        // If sitting directly next to chest, begin opening
        if (minChestDist <= 20) {
          bot.openingBox = targetBox;
          targetBox.state = 'opening';
          bot.openProgress = 0;
          bot.openDurationNeeded = 2.0 + Math.random() * 2.0;
          continue;
        }
      } 
      else {
        // AI wandering behavior - Pick a new spot to walk to
        bot.searchTimer -= deltaTime;
        if (bot.searchTimer <= 0) {
          bot.searchTimer = 2.0 + Math.random() * 4.0;
          const spawnPoints = map.getSpawnPoints(1);
          if (spawnPoints.length > 0) {
            bot.targetX = spawnPoints[0].x;
            bot.targetY = spawnPoints[0].y;
          }
        }
      }

      // 3. Move bot towards target coordinates
      const dx = bot.targetX - bot.x;
      const dy = bot.targetY - bot.y;
      const distToTarget = Math.sqrt(dx * dx + dy * dy);

      if (distToTarget > 5) {
        bot.isMoving = true;
        
        // Determine direction vector
        let moveX = dx / distToTarget;
        let moveY = dy / distToTarget;

        if (Math.abs(moveX) > Math.abs(moveY)) {
          bot.direction = moveX > 0 ? 'right' : 'left';
        } else {
          bot.direction = moveY > 0 ? 'down' : 'up';
        }

        const stepX = bot.x + moveX * bot.speed * deltaTime;
        const stepY = bot.y + moveY * bot.speed * deltaTime;

        // Apply slide check physics
        if (map.isWalkable(stepX, bot.y)) {
          bot.x = stepX;
        }
        if (map.isWalkable(bot.x, stepY)) {
          bot.y = stepY;
        }

        // Stepping animations
        bot.animTimer += deltaTime;
        if (bot.animTimer > 0.18) {
          bot.frameIndex = (bot.frameIndex + 1) % 2;
          bot.animTimer = 0;
        }
      } else {
        bot.isMoving = false;
        bot.frameIndex = 0;
      }
    }
  }

  render(ctx, camera) {
    ctx.save();
    const p = 2; // sprite scale

    for (const bot of this.players) {
      const sx = Math.round(bot.x - camera.x);
      const sy = Math.round(bot.y - camera.y);

      // Bounds clip
      if (sx < -32 || sx > camera.width + 32 || sy < -40 || sy > camera.height + 40) {
        continue;
      }

      // Draw shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(sx + bot.width / 2, sy + bot.height - 2, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bot rendering (Mirrored left checks)
      ctx.save();
      let drawDir = bot.direction;
      if (bot.direction === 'left') {
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

      const legOff = bot.isMoving ? (bot.frameIndex === 0 ? 1 : -1) : 0;
      const TUNIC = bot.color;
      const SKIN = '#F5CBA7';
      const HAIR = '#111';
      const EYE = '#222';
      const BELT = '#8D6E63';
      const BOOT = '#5D4037';

      if (drawDir === 'down') {
        // Hair
        px(6, 0, HAIR); px(7, 0, HAIR); px(8, 0, HAIR); px(9, 0, HAIR);
        px(5, 1, HAIR); px(6, 1, HAIR); px(7, 1, HAIR); px(8, 1, HAIR); px(9, 1, HAIR); px(10, 1, HAIR);
        px(5, 2, HAIR); px(6, 2, HAIR); px(7, 2, HAIR); px(8, 2, HAIR); px(9, 2, HAIR); px(10, 2, HAIR);

        // Face
        px(5, 3, HAIR); px(6, 3, SKIN); px(7, 3, SKIN); px(8, 3, SKIN); px(9, 3, SKIN); px(10, 3, HAIR);
        px(5, 4, SKIN); px(6, 4, EYE); px(7, 4, SKIN); px(8, 4, SKIN); px(9, 4, EYE); px(10, 4, SKIN);
        px(7, 5, SKIN); px(8, 5, SKIN);

        // Tunic
        px(5, 7, TUNIC); px(6, 7, TUNIC); px(7, 7, TUNIC); px(8, 7, TUNIC); px(9, 7, TUNIC); px(10, 7, TUNIC);
        px(4, 8, TUNIC); px(5, 8, TUNIC); px(6, 8, TUNIC); px(7, 8, TUNIC); px(8, 8, TUNIC); px(9, 8, TUNIC); px(10, 8, TUNIC); px(11, 8, TUNIC);
        px(3, 8, SKIN); px(12, 8, SKIN);
        px(3, 9, SKIN); px(12, 9, SKIN);

        // Belt
        px(5, 10, BELT); px(6, 10, BELT); px(7, 10, BELT); px(8, 10, BELT); px(9, 10, BELT); px(10, 10, BELT);
        px(7, 10, '#FFD700'); // clasp

        // Skirt
        px(5, 11, TUNIC); px(6, 11, TUNIC); px(7, 11, TUNIC); px(8, 11, TUNIC); px(9, 11, TUNIC); px(10, 11, TUNIC);
        
        // Feet
        px(6 + legOff, 13, BOOT); px(9 - legOff, 13, BOOT);
        px(5 + legOff, 14, BOOT); px(6 + legOff, 14, BOOT);
        px(8 - legOff, 14, BOOT); px(9 - legOff, 14, BOOT);
      } 
      else if (drawDir === 'up') {
        // Hair back
        px(6, 0, HAIR); px(7, 0, HAIR); px(8, 0, HAIR); px(9, 0, HAIR);
        px(5, 1, HAIR); px(6, 1, HAIR); px(7, 1, HAIR); px(8, 1, HAIR); px(9, 1, HAIR); px(10, 1, HAIR);
        px(5, 2, HAIR); px(6, 2, HAIR); px(7, 2, HAIR); px(8, 2, HAIR); px(9, 2, HAIR); px(10, 2, HAIR);
        px(5, 3, HAIR); px(6, 3, HAIR); px(7, 3, HAIR); px(8, 3, HAIR); px(9, 3, HAIR); px(10, 3, HAIR);

        // Back Tunic
        px(5, 7, TUNIC); px(6, 7, TUNIC); px(7, 7, TUNIC); px(8, 7, TUNIC); px(9, 7, TUNIC); px(10, 7, TUNIC);
        px(4, 8, TUNIC); px(5, 8, TUNIC); px(6, 8, TUNIC); px(7, 8, TUNIC); px(8, 8, TUNIC); px(9, 8, TUNIC); px(10, 8, TUNIC); px(11, 8, TUNIC);
        px(5, 10, BELT); px(6, 10, BELT); px(7, 10, BELT); px(8, 10, BELT); px(9, 10, BELT); px(10, 10, BELT);
        px(5, 11, TUNIC); px(6, 11, TUNIC); px(7, 11, TUNIC); px(8, 11, TUNIC); px(9, 11, TUNIC); px(10, 11, TUNIC);

        // Legs
        px(6 + legOff, 13, BOOT); px(9 - legOff, 13, BOOT);
        px(5 + legOff, 14, BOOT); px(6 + legOff, 14, BOOT);
        px(8 - legOff, 14, BOOT); px(9 - legOff, 14, BOOT);
      } 
      else if (drawDir === 'right') {
        // Hair
        px(7, 0, HAIR); px(8, 0, HAIR); px(9, 0, HAIR);
        px(6, 1, HAIR); px(7, 1, HAIR); px(8, 1, HAIR); px(9, 1, HAIR); px(10, 1, HAIR);
        px(6, 2, HAIR); px(7, 2, HAIR); px(8, 2, HAIR); px(9, 2, HAIR); px(10, 2, HAIR);

        // Face
        px(6, 3, HAIR); px(7, 3, SKIN); px(8, 3, SKIN); px(9, 3, SKIN); px(10, 3, SKIN);
        px(6, 4, SKIN); px(7, 4, SKIN); px(8, 4, SKIN); px(9, 4, EYE); px(10, 4, SKIN);

        // Tunic
        px(5, 7, TUNIC); px(6, 7, TUNIC); px(7, 7, TUNIC); px(8, 7, TUNIC); px(9, 7, TUNIC);
        px(5, 8, TUNIC); px(6, 8, TUNIC); px(7, 8, TUNIC); px(8, 8, TUNIC); px(9, 8, TUNIC);
        px(10, 8, SKIN); px(10, 9, SKIN);

        // Belt
        px(5, 10, BELT); px(6, 10, BELT); px(7, 10, BELT); px(8, 10, BELT); px(9, 10, BELT);
        px(7, 10, '#FFD700');

        // Skirt
        px(5, 11, TUNIC); px(6, 11, TUNIC); px(7, 11, TUNIC); px(8, 11, TUNIC); px(9, 11, TUNIC);

        // Legs
        px(6 + legOff, 13, BOOT); px(8 - legOff, 13, BOOT);
        px(5 + legOff, 14, BOOT); px(6 + legOff, 14, BOOT);
        px(7 - legOff, 14, BOOT); px(8 - legOff, 14, BOOT);
      }

      ctx.restore();

      // Bot Name text above avatar
      ctx.fillStyle = '#8b95a5';
      ctx.font = '6px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(bot.name, sx + bot.width / 2, sy - 8);

      // AI opening progress bar popup
      if (bot.openingBox) {
        ctx.fillStyle = '#111827';
        ctx.fillRect(sx, sy - 18, bot.width, 3);
        ctx.fillStyle = '#3498db';
        ctx.fillRect(sx, sy - 18, Math.floor(bot.width * (bot.openProgress / 100)), 3);
      }
    }
    ctx.restore();
  }

  getOnlineCount() {
    return this.onlineCount;
  }

  getLeaderboard(realPlayer) {
    const list = [];
    
    // Add real player statistics
    list.push({
      name: realPlayer.name || (window.gameInstance && window.gameInstance.wallet && window.gameInstance.wallet.connected ? window.gameInstance.wallet.getDisplayAddress() : 'Guest Hunter'),
      boxesOpened: realPlayer.boxesOpened,
      tokensEarned: realPlayer.tokensEarned,
      isPlayer: true
    });

    // Add bots
    for (const b of this.players) {
      list.push({
        name: b.name,
        boxesOpened: b.boxesOpened,
        tokensEarned: b.tokensEarned,
        isPlayer: false
      });
    }

    // Sort by count desc
    return list.sort((a, b) => b.boxesOpened - a.boxesOpened);
  }

  reset(map) {
    for (const b of this.players) {
      const spawnPoints = map.getSpawnPoints(1);
      const spawn = spawnPoints.length > 0 ? spawnPoints[0] : { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
      b.x = spawn.x;
      b.y = spawn.y;
      b.targetX = spawn.x;
      b.targetY = spawn.y;
      b.boxesOpened = 0;
      b.tokensEarned = 0;
      b.openingBox = null;
      b.openProgress = 0;
      b.searchTimer = 1.0 + Math.random() * 3.0;
    }
  }

  clear() {
    this.players = [];
  }
}

// Expose globally
window.FakeMultiplayer = FakeMultiplayer;
