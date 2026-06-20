/* ============================================
   TREZO — BoxManager & Box
   Purple reward chests + Gold normal chests
   ============================================ */

class Box {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.config = BOX_TYPES[type];
    this.visibility = this.config.visibility;
    this.state = this.visibility === 'normal' ? 'revealed' : 'hidden';
    this.openProgress = 0;
    this.openedBy = null;
    this.tokenReward = 0;
    this.loot = null;
    this.skill = null;
    this.isRewardChest = type === 'REWARD_CHEST';
    this.isClaimable = this.isRewardChest;
    this.sparkleTimer = Math.random() * Math.PI * 2;
    this.fadeTimer = 3.0;
    this._generateLoot();
  }

  _generateLoot() {
    const type = this.type;
    if (type === 'REWARD_CHEST') return;

    if (type === 'NORMAL_SKILL') {
      this.skill = SPECIAL_SKILLS[Math.floor(Math.random() * SPECIAL_SKILLS.length)];
    }

    if (type === 'NORMAL_ITEM') {
      const items = [
        { type: 'compass', name: 'Treasure Compass', value: 1 },
        { type: 'potion', name: 'Energy Potion', value: 1 },
        { type: 'boots', name: 'Speed Boots', value: 1 }
      ];
      this.loot = items[Math.floor(Math.random() * items.length)];
    }
  }
}

class BoxManager {
  constructor() {
    this.boxes = [];
    this.totalChests = 0;
  }

  spawnBoxes(spawnPoints, roundNumber) {
    this.boxes = [];
    const rewardCount = ROUND_CONFIG.REWARD_CHEST_COUNT;
    const normalCount = ROUND_CONFIG.NORMAL_CHEST_COUNT;
    this.totalChests = rewardCount + normalCount;

    const shuffled = [...spawnPoints].sort(() => Math.random() - 0.5);
    const rewardPoints = shuffled.slice(0, rewardCount);
    const normalPoints = shuffled.slice(rewardCount, rewardCount + normalCount);

    for (const pt of rewardPoints) {
      this.boxes.push(new Box(pt.x, pt.y, 'REWARD_CHEST'));
    }

    const normalDist = Object.entries(NORMAL_BOX_DISTRIBUTION).map(([type, weight]) => ({ type, weight }));
    for (const pt of normalPoints) {
      this.boxes.push(new Box(pt.x, pt.y, this._pickType(normalDist)));
    }
  }

  allocateTokenPool(totalPool) {
    const rewardBoxes = this.boxes.filter(b => b.type === 'REWARD_CHEST');
    if (rewardBoxes.length === 0 || totalPool <= 0) return;

    const shuffled = [...rewardBoxes].sort(() => Math.random() - 0.5);
    let remaining = totalPool;
    const minPerBox = Math.max(100, Math.floor(totalPool / (shuffled.length * 4)));

    for (let i = 0; i < shuffled.length; i++) {
      const boxesLeft = shuffled.length - i;
      let amount;

      if (i === shuffled.length - 1) {
        amount = remaining;
      } else {
        const maxShare = Math.floor(remaining * (0.15 + Math.random() * 0.35));
        const minShare = Math.min(maxShare, Math.max(minPerBox, Math.floor(remaining / boxesLeft * 0.5)));
        amount = Math.max(minPerBox, Math.min(minShare, remaining - (boxesLeft - 1) * minPerBox));
      }

      shuffled[i].tokenReward = amount;
      shuffled[i].isClaimable = amount > 0;
      remaining -= amount;
    }
  }

  _pickType(distribution) {
    const rand = Math.random();
    let cumulative = 0;
    for (const item of distribution) {
      cumulative += item.weight;
      if (rand <= cumulative) return item.type;
    }
    return distribution[0].type;
  }

  getRevealRadius(player) {
    const tracking = player.getEffectiveTracking?.() ?? player.attributes?.tracking ?? 5;
    return 80 + tracking * 18;
  }

  update(player, deltaTime) {
    const revealRadius = this.getRevealRadius(player);

    for (const b of this.boxes) {
      b.sparkleTimer += deltaTime * 5;
      if (b.state === 'opened') {
        if (b.fadeTimer > 0) b.fadeTimer -= deltaTime;
        continue;
      }

      const dist = Math.hypot(b.x - player.x, b.y - player.y);

      if (b.visibility === 'normal') {
        if (b.state === 'opening' && dist > 75) {
          b.state = 'revealed';
          b.openProgress = 0;
        }
        continue;
      }

      // Reward chests: hidden until player is close (tracking extends range)
      if (b.visibility === 'reward') {
        if (b.state === 'hidden' && dist <= revealRadius) {
          b.state = 'revealed';
          if (window.gameInstance?.audio) window.gameInstance.audio.playDiscovery();
        } else if (b.state === 'revealed' && dist > revealRadius + 50) {
          b.state = 'hidden';
        } else if (b.state === 'opening' && dist > 75) {
          b.state = 'revealed';
          b.openProgress = 0;
        }
      }
    }
  }

  render(ctx, camera) {
    ctx.save();
    for (const b of this.boxes) {
      if (b.visibility === 'normal') this._renderBox(ctx, camera, b);
    }
    for (const b of this.boxes) {
      if (b.visibility === 'reward') this._renderBox(ctx, camera, b);
    }
    ctx.restore();
  }

  _renderBox(ctx, camera, b) {
    if (b.state === 'hidden') return;

    const screenX = b.x - camera.x;
    const screenY = b.y - camera.y;
    if (screenX < -48 || screenX > camera.width + 48 || screenY < -48 || screenY > camera.height + 48) return;

    const chestW = 40;
    const chestH = 32;
    const ox = Math.floor(screenX - chestW / 2);
    const oy = Math.floor(screenY - chestH / 2);
    const isReward = b.visibility === 'reward';

    if (b.state === 'opened') ctx.globalAlpha = Math.max(0, b.fadeTimer / 3.0);

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 14, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (b.state === 'opened') {
      this._drawOpenChest(ctx, ox, oy, chestW, chestH, b, isReward);
    } else {
      this._drawClosedChest(ctx, ox, oy, chestW, chestH, b, isReward);
    }

    ctx.globalAlpha = 1.0;

    if (b.state === 'opening') {
      this._drawProgressBar(ctx, ox, oy, chestW, b.openProgress);
    }

    if (isReward && b.state === 'revealed') {
      const pulse = Math.sin(b.sparkleTimer) * 0.2 + 0.35;
      ctx.fillStyle = `rgba(156, 39, 176, ${pulse})`;
      ctx.beginPath();
      ctx.arc(screenX, oy - 10, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', screenX, oy - 7);
    }
  }

  _drawClosedChest(ctx, x, y, w, h, box, isReward) {
    const woodColor = isReward ? '#4a148c' : '#8B6914';
    const woodDark = isReward ? '#2d0a52' : '#5D4037';
    const trimColor = isReward ? '#AB47BC' : '#FFD700';
    const trimLight = isReward ? '#E1BEE7' : '#FFEC8B';

    ctx.fillStyle = woodColor;
    ctx.fillRect(x, y + 10, w, h - 10);
    ctx.fillStyle = woodDark;
    ctx.fillRect(x + 2, y + 12, w - 4, 2);
    ctx.fillRect(x + 2, y + 20, w - 4, 2);
    ctx.fillRect(x, y + 10, 4, h - 10);
    ctx.fillRect(x + w - 4, y + 10, 4, h - 10);

    ctx.fillStyle = trimColor;
    ctx.fillRect(x, y + 10, 6, h - 10);
    ctx.fillRect(x + w - 6, y + 10, 6, h - 10);
    ctx.fillRect(x + 4, y + h - 6, w - 8, 4);

    ctx.fillStyle = woodDark;
    ctx.fillRect(x - 2, y, w + 4, 12);
    ctx.fillStyle = woodColor;
    ctx.fillRect(x, y + 2, w, 8);
    ctx.fillStyle = trimColor;
    ctx.fillRect(x - 2, y, 6, 12);
    ctx.fillRect(x + w - 4, y, 6, 12);

    ctx.fillStyle = isReward ? '#7B1FA2' : '#B8860B';
    ctx.fillRect(x + w / 2 - 6, y + 8, 12, 10);
    ctx.fillStyle = trimLight;
    ctx.fillRect(x + w / 2 - 4, y + 9, 8, 6);

    if (isReward || box.tokenReward > 0) {
      const glow = Math.sin(box.sparkleTimer) * 0.15 + 0.25;
      ctx.fillStyle = isReward ? `rgba(206, 147, 216, ${glow})` : `rgba(255, 215, 0, ${glow})`;
      ctx.fillRect(x + 6, y + 14, w - 12, 12);
    }
  }

  _drawOpenChest(ctx, x, y, w, h, box, isReward) {
    const woodColor = isReward ? '#4a148c' : '#8B6914';
    const woodDark = isReward ? '#2d0a52' : '#5D4037';
    const trimColor = isReward ? '#AB47BC' : '#FFD700';
    const glowColor = isReward ? '#CE93D8' : '#FFD700';

    ctx.fillStyle = woodColor;
    ctx.fillRect(x, y + 10, w, h - 10);
    ctx.fillStyle = woodDark;
    ctx.fillRect(x + 6, y + 14, w - 12, 14);
    ctx.fillStyle = trimColor;
    ctx.fillRect(x, y + 10, 6, h - 10);
    ctx.fillRect(x + w - 6, y + 10, 6, h - 10);
    ctx.fillRect(x - 4, y - 8, w + 8, 10);

    const glow = Math.sin(box.sparkleTimer) * 0.2 + 0.5;
    ctx.fillStyle = glowColor + Math.floor(glow * 255).toString(16).padStart(2, '0');
    ctx.fillRect(x + 8, y + 16, w - 16, 10);

    if (box.tokenReward > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(x + 14, y + 22, 4, 0, Math.PI * 2);
      ctx.arc(x + 22, y + 24, 3, 0, Math.PI * 2);
      ctx.arc(x + 28, y + 22, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawProgressBar(ctx, x, y, w, progress) {
    const barY = y - 12;
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(x, barY, w, 6);
    const fillWidth = Math.floor(w * (progress / 100));
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(x, barY, fillWidth, 6);
    ctx.strokeStyle = '#3f4566';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, barY, w, 6);
  }

  getBoxAt(pixelX, pixelY) {
    for (const b of this.boxes) {
      if (b.state !== 'hidden' && b.state !== 'opened') {
        if (Math.hypot(b.x - pixelX, b.y - pixelY) <= 28) return b;
      }
    }
    return null;
  }

  getNearestRewardChest(pixelX, pixelY) {
    let nearest = null;
    let minDist = Infinity;
    for (const b of this.boxes) {
      if (b.type === 'REWARD_CHEST' && b.state !== 'opened') {
        const dist = Math.hypot(b.x - pixelX, b.y - pixelY);
        if (dist < minDist) { minDist = dist; nearest = b; }
      }
    }
    return nearest;
  }

  getNearestHidden(pixelX, pixelY) {
    return this.getNearestRewardChest(pixelX, pixelY);
  }

  startOpening(box, player) {
    if (box.state === 'opening' || box.state === 'opened') return false;
    if (box.isRewardChest && window.gameInstance?.wallet?.isGuest) {
      window.gameInstance.ui.showNotification('Connect wallet to participate in reward rounds!', 'warning', 3500);
      return false;
    }
    if (!player.hasEnergy(10)) {
      window.gameInstance?.ui?.showNotification('Not enough energy!', 'error');
      return false;
    }
    box.state = 'opening';
    box.openProgress = 0;
    return true;
  }

  getRemaining() {
    return this.boxes.filter(b => b.state !== 'opened').length;
  }

  getClaimableRemaining() {
    return this.boxes.filter(b => b.isRewardChest && b.state !== 'opened').length;
  }

  getTotal() {
    return this.totalChests || this.boxes.length;
  }

  getRewardChestsRemaining() {
    return this.boxes.filter(b => b.isRewardChest && b.state !== 'opened').length;
  }

  clear() {
    this.boxes = [];
    this.totalChests = 0;
  }
}

window.Box = Box;
window.BoxManager = BoxManager;
