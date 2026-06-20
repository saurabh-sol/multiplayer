/* ============================================
   SOLANA TREASURE HUNT — BoxManager & Box
   Two-tier box system: Normal (visible) and Hidden (special)
   Pixel Fantasy Edition with enhanced visuals
   ============================================ */

class Box {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.config = BOX_TYPES[type];
    this.visibility = this.config.visibility; // 'normal' or 'hidden'
    
    // Normal boxes start revealed, hidden boxes start hidden
    this.state = this.visibility === 'normal' ? 'revealed' : 'hidden';
    
    this.openProgress = 0;
    this.openedBy = null;
    this.points = this.config.points || 0;
    this.tokenReward = this.config.tokenReward || 0;
    this.loot = null;
    this.skill = null; // Special skill from hidden boxes
    this.isClaimable = this.tokenReward > 0;
    this.sparkleTimer = Math.random() * Math.PI * 2;
    this.fadeTimer = 3.0;
    this.locked = true;
    
    // Generate loot based on type
    this._generateLoot();
  }
  
  _generateLoot() {
    const type = this.type;
    
    // Normal box loot
    if (type === 'NORMAL_ITEM') {
      const rand = Math.random();
      if (rand < 0.6) {
        this.loot = { type: 'compass', name: 'Treasure Compass', value: 1 };
      } else {
        this.loot = { type: 'potion', name: 'Energy Potion', value: 1 };
      }
    }
    
    // Hidden box special loot
    if (type === 'HIDDEN_SPECIAL' || type === 'HIDDEN_JACKPOT') {
      // Random special skill
      const skillIndex = Math.floor(Math.random() * SPECIAL_SKILLS.length);
      this.skill = SPECIAL_SKILLS[skillIndex];
    }
    
    if (type === 'HIDDEN_RARE_ITEM') {
      const rand = Math.random();
      if (rand < 0.4) {
        this.loot = { type: 'compass', name: 'Golden Compass', value: 3 };
      } else if (rand < 0.7) {
        this.loot = { type: 'boots', name: 'Swift Boots', value: 2 };
      } else {
        this.loot = { type: 'potion', name: 'Mega Potion', value: 3 };
      }
    }
    
    if (type === 'HIDDEN_TOKEN') {
      // Variable token amount
      this.tokenReward = 100 + Math.floor(Math.random() * 900); // 100-1000
    }
    
    if (type === 'HIDDEN_JACKPOT') {
      this.tokenReward = 2000 + Math.floor(Math.random() * 3000); // 2000-5000
    }
  }
}

class BoxManager {
  constructor() {
    this.boxes = [];
  }

  static CHEST_COLORS = {
    WOOD_DARK: '#3e2723',
    WOOD_MID: '#5d4037',
    WOOD_LIGHT: '#8d6e63',
    WOOD_VERY_LIGHT: '#a1887f',
    GOLD_DARK: '#b8860b',
    GOLD_MID: '#daa520',
    GOLD_LIGHT: '#ffd700',
    GOLD_GLOW: '#ffec8b',
    IRON_DARK: '#424242',
    IRON_MID: '#616161',
    IRON_LIGHT: '#9e9e9e',
    
    // Visibility-based colors
    NORMAL_GLOW: '#8d6e63',
    HIDDEN_GLOW: '#9c27b0',
    
    // Type glows
    EMPTY_GLOW: '#8d6e63',
    SMALL_GLOW: '#a1887f',
    MEDIUM_GLOW: '#c9a86c',
    ITEM_GLOW: '#4fc3f7',
    SPECIAL_GLOW: '#ba68c8',
    TOKEN_GLOW: '#81c784',
    RARE_ITEM_GLOW: '#ffb74d',
    JACKPOT_GLOW: '#ffd700'
  };

  spawnBoxes(spawnPoints, roundNumber) {
    this.boxes = [];
    
    const totalChests = Math.min(80, 30 + roundNumber * 5);
    const actualPoints = spawnPoints.slice(0, totalChests);
    
    // Split into normal and hidden
    const normalCount = Math.floor(totalChests * BOX_VISIBILITY_RATIO.normal);
    const hiddenCount = totalChests - normalCount;
    
    // Shuffle spawn points
    const shuffledPoints = [...actualPoints].sort(() => Math.random() - 0.5);
    const normalPoints = shuffledPoints.slice(0, normalCount);
    const hiddenPoints = shuffledPoints.slice(normalCount, normalCount + hiddenCount);
    
    // Build distribution arrays
    const normalDist = Object.entries(NORMAL_BOX_DISTRIBUTION).map(([type, weight]) => ({ type, weight }));
    const hiddenDist = Object.entries(HIDDEN_BOX_DISTRIBUTION).map(([type, weight]) => ({ type, weight }));
    
    // Spawn normal boxes
    for (const pt of normalPoints) {
      const selectedType = this._pickType(normalDist);
      const box = new Box(pt.x, pt.y, selectedType);
      this.boxes.push(box);
    }
    
    // Spawn hidden boxes
    for (const pt of hiddenPoints) {
      const selectedType = this._pickType(hiddenDist);
      const box = new Box(pt.x, pt.y, selectedType);
      this.boxes.push(box);
    }
  }
  
  _pickType(distribution) {
    const rand = Math.random();
    let cumulative = 0;
    for (const item of distribution) {
      cumulative += item.weight;
      if (rand <= cumulative) {
        return item.type;
      }
    }
    return distribution[0].type;
  }

  update(player, deltaTime) {
    const radius = player.getDetectionRadius();
    const trackingBonus = player.attributes?.tracking || 0;
    const effectiveRadius = radius + (trackingBonus * 5);

    for (const b of this.boxes) {
      b.sparkleTimer += deltaTime * 5;

      if (b.state === 'opened') {
        if (b.fadeTimer > 0) {
          b.fadeTimer -= deltaTime;
        }
        continue;
      }

      const dist = Math.sqrt((b.x - player.x) ** 2 + (b.y - player.y) ** 2);

      // Normal boxes are always visible - skip detection logic
      if (b.visibility === 'normal') {
        // Opening cancellation check
        if (b.state === 'opening' && dist > 75) {
          b.state = 'revealed';
          b.openProgress = 0;
          if (window.gameInstance?.ui) {
            window.gameInstance.ui.showNotification("Chest opening cancelled - too far!", "warning");
          }
        }
        continue;
      }

      // Hidden box detection logic
      if (b.state === 'hidden') {
        // Need higher tracking to detect hidden boxes
        const detectionThreshold = effectiveRadius * 0.7;
        if (dist <= detectionThreshold) {
          b.state = 'detected';
          if (window.gameInstance?.audio) {
            window.gameInstance.audio.playDiscovery();
          }
          if (window.gameInstance?.ui) {
            window.gameInstance.ui.showNotification("Hidden treasure detected nearby!", "info");
          }
        }
      } 
      else if (b.state === 'detected') {
        if (dist <= 60) {
          b.state = 'revealed';
        } else if (dist > effectiveRadius) {
          b.state = 'hidden';
        }
      } 
      else if (b.state === 'revealed') {
        if (dist > effectiveRadius + 40) {
          b.state = 'hidden';
        }
      }
      else if (b.state === 'opening') {
        if (dist > 75) {
          b.state = 'revealed';
          b.openProgress = 0;
          if (window.gameInstance?.ui) {
            window.gameInstance.ui.showNotification("Chest opening cancelled - too far!", "warning");
          }
        }
      }
    }
  }

  render(ctx, camera) {
    const C = BoxManager.CHEST_COLORS;
    ctx.save();

    // Render normal boxes first (lower layer)
    for (const b of this.boxes) {
      if (b.visibility !== 'normal') continue;
      this._renderBox(ctx, camera, b, C);
    }
    
    // Render hidden boxes on top (they glow more)
    for (const b of this.boxes) {
      if (b.visibility !== 'hidden') continue;
      this._renderBox(ctx, camera, b, C);
    }

    ctx.restore();
  }
  
  _renderBox(ctx, camera, b, C) {
    if (b.state === 'hidden') return;

    const screenX = b.x - camera.x;
    const screenY = b.y - camera.y;

    if (screenX < -48 || screenX > camera.width + 48 || screenY < -48 || screenY > camera.height + 48) {
      return;
    }

    const chestW = 40;
    const chestH = 32;
    const ox = Math.floor(screenX - chestW / 2);
    const oy = Math.floor(screenY - chestH / 2);

    if (b.state === 'detected') {
      // Hidden box shimmer effect - more magical
      const pulse = Math.sin(b.sparkleTimer) * 8 + 12;
      const glowColor = this._getGlowColor(b.type);
      
      // Outer glow
      ctx.fillStyle = glowColor + '30';
      ctx.beginPath();
      ctx.arc(screenX, screenY, pulse + 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner shimmer
      ctx.fillStyle = glowColor + '60';
      ctx.fillRect(ox + chestW/2 - pulse/2, oy + chestH/2 - pulse/2, pulse, pulse);
      
      // Sparkle cross
      ctx.fillStyle = '#ffffff80';
      ctx.fillRect(ox + chestW/2 - 1, oy + chestH/2 - pulse, 2, pulse * 2);
      ctx.fillRect(ox + chestW/2 - pulse, oy + chestH/2 - 1, pulse * 2, 2);
      
      // Mystery icon
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', screenX, screenY + 4);
    } 
    else {
      if (b.state === 'opened') {
        ctx.globalAlpha = Math.max(0, b.fadeTimer / 3.0);
      }

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(screenX, screenY + 14, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      if (b.state === 'opened') {
        this._drawOpenChest(ctx, ox, oy, chestW, chestH, b);
      } else {
        this._drawClosedChest(ctx, ox, oy, chestW, chestH, b);
      }

      ctx.globalAlpha = 1.0;

      if (b.state === 'opening') {
        this._drawProgressBar(ctx, ox, oy, chestW, b.openProgress);
      }
      
      // Hidden box indicator (small icon above chest)
      if (b.visibility === 'hidden' && b.state === 'revealed') {
        ctx.fillStyle = '#9c27b0';
        ctx.beginPath();
        ctx.arc(screenX, oy - 8, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', screenX, oy - 5);
      }
    }
  }

  _getGlowColor(type) {
    const C = BoxManager.CHEST_COLORS;
    if (type.startsWith('HIDDEN_')) {
      switch(type) {
        case 'HIDDEN_JACKPOT': return C.JACKPOT_GLOW;
        case 'HIDDEN_TOKEN': return C.TOKEN_GLOW;
        case 'HIDDEN_RARE_ITEM': return C.RARE_ITEM_GLOW;
        case 'HIDDEN_SPECIAL': return C.SPECIAL_GLOW;
        default: return C.HIDDEN_GLOW;
      }
    }
    switch(type) {
      case 'NORMAL_ITEM': return C.ITEM_GLOW;
      case 'NORMAL_MEDIUM': return C.MEDIUM_GLOW;
      case 'NORMAL_SMALL': return C.SMALL_GLOW;
      default: return C.NORMAL_GLOW;
    }
  }

  _drawClosedChest(ctx, x, y, w, h, box) {
    const C = BoxManager.CHEST_COLORS;
    const typeColor = box.config.color;
    const isHidden = box.visibility === 'hidden';
    
    // Different chest style for hidden boxes
    const woodColor = isHidden ? '#4a2c6a' : C.WOOD_MID;
    const woodDark = isHidden ? '#2d1a42' : C.WOOD_DARK;
    const trimColor = isHidden ? '#9c27b0' : C.GOLD_MID;
    const trimLight = isHidden ? '#ce93d8' : C.GOLD_LIGHT;
    
    // Chest base
    ctx.fillStyle = woodColor;
    ctx.fillRect(x, y + 10, w, h - 10);
    
    // Wood grain
    ctx.fillStyle = woodDark;
    ctx.fillRect(x + 2, y + 12, w - 4, 2);
    ctx.fillRect(x + 2, y + 20, w - 4, 2);
    ctx.fillRect(x + 2, y + 28, w - 4, 2);
    
    // Side panels
    ctx.fillStyle = woodDark;
    ctx.fillRect(x, y + 10, 4, h - 10);
    ctx.fillRect(x + w - 4, y + 10, 4, h - 10);
    
    // Type color overlay
    ctx.fillStyle = typeColor + '30';
    ctx.fillRect(x + 4, y + 12, w - 8, h - 14);
    
    // Trim
    ctx.fillStyle = trimColor;
    ctx.fillRect(x, y + 10, 6, h - 10);
    ctx.fillRect(x + w - 6, y + 10, 6, h - 10);
    ctx.fillRect(x + 4, y + h - 6, w - 8, 4);
    
    // Trim highlights
    ctx.fillStyle = trimLight;
    ctx.fillRect(x + 1, y + 11, 2, h - 12);
    ctx.fillRect(x + w - 3, y + 11, 2, h - 12);
    
    // Lid
    ctx.fillStyle = woodDark;
    ctx.fillRect(x - 2, y, w + 4, 12);
    ctx.fillStyle = woodColor;
    ctx.fillRect(x, y + 2, w, 8);
    ctx.fillStyle = woodDark;
    ctx.fillRect(x + 4, y + 4, w - 8, 2);
    
    // Lid trim
    ctx.fillStyle = trimColor;
    ctx.fillRect(x - 2, y, 6, 12);
    ctx.fillRect(x + w - 4, y, 6, 12);
    ctx.fillRect(x + 2, y, w - 4, 3);
    
    // Lock
    ctx.fillStyle = isHidden ? '#7b1fa2' : C.GOLD_DARK;
    ctx.fillRect(x + w/2 - 6, y + 8, 12, 10);
    ctx.fillStyle = trimLight;
    ctx.fillRect(x + w/2 - 4, y + 9, 8, 6);
    
    // Keyhole
    ctx.fillStyle = woodDark;
    ctx.fillRect(x + w/2 - 1, y + 11, 2, 3);
    ctx.beginPath();
    ctx.arc(x + w/2, y + 14, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Glow for valuable chests
    if (box.tokenReward > 0 || box.config.hasSkill) {
      const glowIntensity = Math.sin(box.sparkleTimer) * 0.15 + 0.25;
      ctx.fillStyle = typeColor + Math.floor(glowIntensity * 255).toString(16).padStart(2, '0');
      ctx.fillRect(x + 6, y + 14, w - 12, 12);
    }
    
    // Rainbow shimmer for Jackpot
    if (box.type === 'HIDDEN_JACKPOT') {
      const shimmer = Math.sin(box.sparkleTimer * 2) * 0.3 + 0.4;
      const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
      gradient.addColorStop(0, `rgba(255, 42, 109, ${shimmer})`);
      gradient.addColorStop(0.5, `rgba(255, 215, 0, ${shimmer})`);
      gradient.addColorStop(1, `rgba(156, 39, 176, ${shimmer})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 4, y + 14, w - 8, 12);
    }
  }

  _drawOpenChest(ctx, x, y, w, h, box) {
    const C = BoxManager.CHEST_COLORS;
    const typeColor = box.config.color;
    const isHidden = box.visibility === 'hidden';
    
    const woodColor = isHidden ? '#4a2c6a' : C.WOOD_MID;
    const woodDark = isHidden ? '#2d1a42' : C.WOOD_DARK;
    const trimColor = isHidden ? '#9c27b0' : C.GOLD_MID;
    
    // Chest body
    ctx.fillStyle = woodColor;
    ctx.fillRect(x, y + 10, w, h - 10);
    
    ctx.fillStyle = woodDark;
    ctx.fillRect(x + 2, y + 12, w - 4, 2);
    ctx.fillRect(x + 2, y + 20, w - 4, 2);
    ctx.fillRect(x + 2, y + 28, w - 4, 2);
    
    ctx.fillStyle = woodDark;
    ctx.fillRect(x, y + 10, 4, h - 10);
    ctx.fillRect(x + w - 4, y + 10, 4, h - 10);
    
    ctx.fillStyle = trimColor;
    ctx.fillRect(x, y + 10, 6, h - 10);
    ctx.fillRect(x + w - 6, y + 10, 6, h - 10);
    ctx.fillRect(x + 4, y + h - 6, w - 8, 4);
    
    // Open lid
    ctx.fillStyle = woodDark;
    ctx.fillRect(x - 4, y - 8, w + 8, 10);
    ctx.fillStyle = C.WOOD_VERY_LIGHT;
    ctx.fillRect(x - 2, y - 6, w + 4, 6);
    ctx.fillStyle = trimColor;
    ctx.fillRect(x - 4, y - 8, 6, 10);
    ctx.fillRect(x + w - 2, y - 8, 6, 10);
    
    // Inside
    ctx.fillStyle = woodDark;
    ctx.fillRect(x + 6, y + 14, w - 12, 14);
    
    // Glowing contents
    const glowIntensity = Math.sin(box.sparkleTimer) * 0.2 + 0.5;
    ctx.fillStyle = typeColor + Math.floor(glowIntensity * 255).toString(16).padStart(2, '0');
    ctx.fillRect(x + 8, y + 16, w - 16, 10);
    
    // Highlights
    ctx.fillStyle = C.GOLD_LIGHT;
    ctx.fillRect(x + 12, y + 18, 4, 3);
    ctx.fillRect(x + 24, y + 20, 3, 3);
    
    // Coins/tokens inside
    if (box.tokenReward > 0 || box.points > 0) {
      ctx.fillStyle = C.GOLD_MID;
      ctx.beginPath();
      ctx.arc(x + 14, y + 22, 4, 0, Math.PI * 2);
      ctx.arc(x + 20, y + 24, 3, 0, Math.PI * 2);
      ctx.arc(x + 26, y + 22, 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = C.GOLD_LIGHT;
      ctx.beginPath();
      ctx.arc(x + 14, y + 21, 2, 0, Math.PI * 2);
      ctx.arc(x + 20, y + 23, 1.5, 0, Math.PI * 2);
      ctx.arc(x + 26, y + 21, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawProgressBar(ctx, x, y, w, progress) {
    const barW = w;
    const barH = 6;
    const barX = x;
    const barY = y - 12;

    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(barX, barY, barW, barH);
    
    const fillWidth = Math.floor(barW * (progress / 100));
    const gradient = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    gradient.addColorStop(0, '#22c55e');
    gradient.addColorStop(1, '#4ade80');
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, fillWidth, barH);
    
    ctx.strokeStyle = '#3f4566';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);
    
    ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
    ctx.fillRect(barX, barY - 2, fillWidth, 2);
  }

  getBoxAt(pixelX, pixelY) {
    const range = 28;
    for (const b of this.boxes) {
      if (b.state !== 'hidden' && b.state !== 'opened') {
        const dist = Math.sqrt((b.x - pixelX) ** 2 + (b.y - pixelY) ** 2);
        if (dist <= range) {
          return b;
        }
      }
    }
    return null;
  }

  getNearestHidden(pixelX, pixelY) {
    let nearest = null;
    let minDist = Infinity;

    for (const b of this.boxes) {
      if (b.visibility === 'hidden' && (b.state === 'hidden' || b.state === 'detected')) {
        const dist = Math.sqrt((b.x - pixelX) ** 2 + (b.y - pixelY) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = b;
        }
      }
    }
    return nearest;
  }

  startOpening(box, player) {
    if (box.state === 'opening' || box.state === 'opened') return false;
    
    const cost = 10;
    if (!player.hasEnergy(cost)) {
      if (window.gameInstance?.ui) {
        window.gameInstance.ui.showNotification("Not enough energy! Energy refills between rounds.", "error");
      }
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
    return this.boxes.filter(b => b.isClaimable && b.state !== 'opened').length;
  }
  
  getHiddenRemaining() {
    return this.boxes.filter(b => b.visibility === 'hidden' && b.state !== 'opened').length;
  }
  
  getNormalRemaining() {
    return this.boxes.filter(b => b.visibility === 'normal' && b.state !== 'opened').length;
  }

  getTotal() {
    return this.boxes.length;
  }

  clear() {
    this.boxes = [];
  }
}

window.Box = Box;
window.BoxManager = BoxManager;
