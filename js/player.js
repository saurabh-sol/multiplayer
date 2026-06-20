/**
 * Player module for Solana Treasure Hunt
 * Pixel-art adventurer with 4-directional walk animation,
 * collision detection, attribute system, and energy management.
 */

class Player {
  constructor(x, y) {
    // Position & size
    this.x = x || 0;
    this.y = y || 0;
    this.width = 32;
    this.height = 40;

    // Movement state
    this.direction = 'down';
    this.isMoving = false;
    this.frameIndex = 0;
    this.animTimer = 0;
    this.animSpeed = 0.18; // seconds per frame
    this.velX = 0;
    this.velY = 0;
    this.name = 'Hunter';
    this.speedBoostTime = 0;
    this.trackingBoostTime = 0;
    this.luckBoostTime = 0;
    this.activeSkills = [];
    this.pendingTokens = 0;

    // Attributes
    this.attributes = {
      hunting: 5,
      tracking: 5,
      speed: 5,
      luck: 5,
      energy: 100
    };

    // Inventory
    this.inventory = [];

    // Round stats
    this.boxesOpened = 0;
    this.tokensEarned = 0;
    this.goldEarned = 0;

    // Detection radius pulse
    this._radiusPulse = 0;
  }

  /* ── Movement & collision ──────────────────────────── */

  update(keys, deltaTime, map) {
    let inputX = 0, inputY = 0;

    if (keys.left)  inputX -= 1;
    if (keys.right) inputX += 1;
    if (keys.up)    inputY -= 1;
    if (keys.down)  inputY += 1;

    if (inputX !== 0 && inputY !== 0) {
      const inv = 1 / Math.SQRT2;
      inputX *= inv;
      inputY *= inv;
    }

    const maxSpeed = this.getMoveSpeed();
    const targetVelX = inputX * maxSpeed;
    const targetVelY = inputY * maxSpeed;
    const hasInput = inputX !== 0 || inputY !== 0;

    if (hasInput) {
      const blend = 1 - Math.pow(0.00001, deltaTime * 8);
      this.velX += (targetVelX - this.velX) * blend;
      this.velY += (targetVelY - this.velY) * blend;
    } else {
      const friction = Math.pow(0.00001, deltaTime * 6);
      this.velX *= friction;
      this.velY *= friction;
      if (Math.abs(this.velX) < 2) this.velX = 0;
      if (Math.abs(this.velY) < 2) this.velY = 0;
    }

    this.isMoving = Math.hypot(this.velX, this.velY) > 8;

    if (Math.abs(this.velY) > Math.abs(this.velX) * 0.6) {
      if (this.velY < -5) this.direction = 'up';
      else if (this.velY > 5) this.direction = 'down';
    }
    if (Math.abs(this.velX) > 5) {
      if (this.velX < 0) this.direction = 'left';
      else if (this.velX > 0) this.direction = 'right';
    }

    const nextX = this.x + this.velX * deltaTime;
    const nextY = this.y + this.velY * deltaTime;
    const dx = nextX - this.x;
    const dy = nextY - this.y;

    // Collision — check four corners of the sprite hitbox
    // Use a smaller hitbox (inner 20×16 around feet) for nicer feel
    const hbOx = 6;               // hitbox offset x from left
    const hbOy = this.height - 16; // hitbox offset y from top
    const hbW = 20;
    const hbH = 14;

    // Try X movement
    if (Math.abs(dx) > 0.01 && map) {
      const testX = nextX;
      const tl = map.isWalkable(testX + hbOx,         this.y + hbOy);
      const tr = map.isWalkable(testX + hbOx + hbW,   this.y + hbOy);
      const bl = map.isWalkable(testX + hbOx,         this.y + hbOy + hbH);
      const br = map.isWalkable(testX + hbOx + hbW,   this.y + hbOy + hbH);
      if (tl && tr && bl && br) this.x = testX;
      else this.velX = 0;
    } else if (Math.abs(dx) > 0.01) {
      this.x = nextX;
    }

    // Try Y movement
    if (Math.abs(dy) > 0.01 && map) {
      const testY = nextY;
      const tl = map.isWalkable(this.x + hbOx,        testY + hbOy);
      const tr = map.isWalkable(this.x + hbOx + hbW,  testY + hbOy);
      const bl = map.isWalkable(this.x + hbOx,        testY + hbOy + hbH);
      const br = map.isWalkable(this.x + hbOx + hbW,  testY + hbOy + hbH);
      if (tl && tr && bl && br) this.y = testY;
      else this.velY = 0;
    } else if (Math.abs(dy) > 0.01) {
      this.y = testY;
    }

    // Clamp to map bounds
    if (typeof MAP_WIDTH !== 'undefined') {
      this.x = Math.max(0, Math.min(this.x, MAP_WIDTH - this.width));
      this.y = Math.max(0, Math.min(this.y, MAP_HEIGHT - this.height));
    }

    // Walk animation
    if (this.isMoving) {
      this.animTimer += deltaTime;
      if (this.animTimer >= this.animSpeed) {
        this.animTimer -= this.animSpeed;
        this.frameIndex = (this.frameIndex + 1) % 2;
      }
    } else {
      this.frameIndex = 0;
      this.animTimer = 0;
    }

    // Passive energy regen while moving (very slow)
    if (this.isMoving && this.attributes.energy < 100) {
      this.attributes.energy = Math.min(100, this.attributes.energy + 0.3 * deltaTime);
    }

    // Detection radius pulse
    this._radiusPulse += deltaTime * 2;

    if (this.speedBoostTime > 0) this.speedBoostTime -= deltaTime;
    if (this.trackingBoostTime > 0) this.trackingBoostTime -= deltaTime;
    if (this.luckBoostTime > 0) this.luckBoostTime -= deltaTime;
  }

  /* ── Rendering ────────────────────────────────────── */

  render(ctx, camera) {
    const sx = Math.round(this.x - camera.x);
    const sy = Math.round(this.y - camera.y);

    // Detection radius
    this._renderDetectionRadius(ctx, sx, sy);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(sx + this.width / 2, sy + this.height - 2, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw the character sprite
    this._drawSprite(ctx, sx, sy, this.direction, this.frameIndex, this.isMoving);
  }

  _renderDetectionRadius(ctx, sx, sy) {
    const radius = this.getDetectionRadius();
    const pulse = Math.sin(this._radiusPulse) * 0.03 + 0.08;
    const cx = sx + this.width / 2;
    const cy = sy + this.height / 2;

    // Outer glow
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius);
    grad.addColorStop(0, `rgba(100, 200, 255, ${pulse * 0.4})`);
    grad.addColorStop(0.7, `rgba(80, 160, 255, ${pulse * 0.25})`);
    grad.addColorStop(1, 'rgba(60, 120, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Thin ring
    ctx.strokeStyle = `rgba(120, 200, 255, ${pulse + 0.08})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * Draw the pixel-art adventurer.
   * Uses canvas rects to paint each pixel-block (2×2 CSS pixels = 1 "sprite pixel").
   */
  _drawSprite(ctx, x, y, dir, frame, moving) {
    const p = 2; // pixel scale

    // ── Colour palette ──
    const SKIN   = '#F5CBA7';
    const SKIN_S = '#D4A574'; // skin shadow
    const HAIR   = '#3E2723';
    const HAIR_H = '#5D4037'; // hair highlight
    const TUNIC  = '#2979FF';
    const TUNIC_S = '#1565C0'; // tunic shadow
    const TUNIC_H = '#64B5F6'; // tunic highlight
    const BELT   = '#8D6E63';
    const BOOT   = '#5D4037';
    const BOOT_S = '#3E2723';
    const EYE    = '#212121';
    const WHITE  = '#FFFFFF';

    ctx.save();

    // Mirror for left direction
    if (dir === 'left') {
      ctx.translate(x + this.width, y);
      ctx.scale(-1, 1);
      dir = 'right'; // draw as right, mirrored
    } else {
      ctx.translate(x, y);
    }

    const px = (col, row, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(col * p, row * p, p, p);
    };

    // Leg offset for walk animation
    const legOff = moving ? (frame === 0 ? 1 : -1) : 0;

    if (dir === 'down') {
      // ── HAIR (top of head) ──
      px(6, 0, HAIR); px(7, 0, HAIR); px(8, 0, HAIR); px(9, 0, HAIR);
      px(5, 1, HAIR); px(6, 1, HAIR); px(7, 1, HAIR); px(8, 1, HAIR); px(9, 1, HAIR); px(10, 1, HAIR);
      px(5, 2, HAIR); px(6, 2, HAIR_H); px(7, 2, HAIR_H); px(8, 2, HAIR_H); px(9, 2, HAIR_H); px(10, 2, HAIR);

      // ── FACE ──
      px(5, 3, HAIR); px(6, 3, SKIN); px(7, 3, SKIN); px(8, 3, SKIN); px(9, 3, SKIN); px(10, 3, HAIR);
      px(5, 4, SKIN_S); px(6, 4, SKIN); px(7, 4, SKIN); px(8, 4, SKIN); px(9, 4, SKIN); px(10, 4, SKIN_S);
      // Eyes
      px(6, 4, EYE); px(9, 4, EYE);
      // Eye whites
      px(6, 3, WHITE); px(9, 3, WHITE);
      // Mouth area
      px(7, 5, SKIN); px(8, 5, SKIN);
      px(6, 5, SKIN_S); px(9, 5, SKIN_S);
      px(5, 5, SKIN_S);  px(10, 5, SKIN_S);

      // ── NECK ──
      px(7, 6, SKIN_S); px(8, 6, SKIN_S);

      // ── TUNIC ──
      px(5, 7, TUNIC_S); px(6, 7, TUNIC); px(7, 7, TUNIC); px(8, 7, TUNIC); px(9, 7, TUNIC); px(10, 7, TUNIC_S);
      px(4, 8, TUNIC_S); px(5, 8, TUNIC); px(6, 8, TUNIC); px(7, 8, TUNIC_H); px(8, 8, TUNIC_H); px(9, 8, TUNIC); px(10, 8, TUNIC); px(11, 8, TUNIC_S);
      px(4, 9, TUNIC_S); px(5, 9, TUNIC); px(6, 9, TUNIC); px(7, 9, TUNIC); px(8, 9, TUNIC); px(9, 9, TUNIC); px(10, 9, TUNIC); px(11, 9, TUNIC_S);
      // Arms
      px(3, 8, SKIN); px(12, 8, SKIN);
      px(3, 9, SKIN_S); px(12, 9, SKIN_S);
      px(3, 10, SKIN); px(12, 10, SKIN);

      // ── BELT ──
      px(5, 10, BELT); px(6, 10, BELT); px(7, 10, BELT); px(8, 10, BELT); px(9, 10, BELT); px(10, 10, BELT);
      // Belt buckle
      px(7, 10, '#FFD700'); px(8, 10, '#FFD700');

      // ── TUNIC SKIRT ──
      px(5, 11, TUNIC); px(6, 11, TUNIC); px(7, 11, TUNIC_S); px(8, 11, TUNIC_S); px(9, 11, TUNIC); px(10, 11, TUNIC);
      px(5, 12, TUNIC_S); px(6, 12, TUNIC); px(7, 12, TUNIC_S); px(8, 12, TUNIC_S); px(9, 12, TUNIC); px(10, 12, TUNIC_S);

      // ── LEGS ──
      px(6, 13, SKIN_S); px(9, 13, SKIN_S);
      px(6 + legOff, 14, SKIN); px(9 - legOff, 14, SKIN);

      // ── BOOTS ──
      px(5 + legOff, 15, BOOT); px(6 + legOff, 15, BOOT); px(7 + legOff, 15, BOOT);
      px(8 - legOff, 15, BOOT); px(9 - legOff, 15, BOOT); px(10 - legOff, 15, BOOT);
      px(5 + legOff, 16, BOOT_S); px(6 + legOff, 16, BOOT_S); px(7 + legOff, 16, BOOT_S);
      px(8 - legOff, 16, BOOT_S); px(9 - legOff, 16, BOOT_S); px(10 - legOff, 16, BOOT_S);

    } else if (dir === 'up') {
      // ── HAIR (back of head) ──
      px(6, 0, HAIR); px(7, 0, HAIR); px(8, 0, HAIR); px(9, 0, HAIR);
      px(5, 1, HAIR); px(6, 1, HAIR); px(7, 1, HAIR_H); px(8, 1, HAIR_H); px(9, 1, HAIR); px(10, 1, HAIR);
      px(5, 2, HAIR); px(6, 2, HAIR); px(7, 2, HAIR); px(8, 2, HAIR); px(9, 2, HAIR); px(10, 2, HAIR);
      px(5, 3, HAIR); px(6, 3, HAIR); px(7, 3, HAIR); px(8, 3, HAIR); px(9, 3, HAIR); px(10, 3, HAIR);
      px(5, 4, HAIR); px(6, 4, HAIR_H); px(7, 4, HAIR); px(8, 4, HAIR); px(9, 4, HAIR_H); px(10, 4, HAIR);
      px(6, 5, SKIN_S); px(7, 5, SKIN_S); px(8, 5, SKIN_S); px(9, 5, SKIN_S);

      // ── NECK ──
      px(7, 6, SKIN_S); px(8, 6, SKIN_S);

      // ── TUNIC BACK ──
      px(5, 7, TUNIC_S); px(6, 7, TUNIC_S); px(7, 7, TUNIC_S); px(8, 7, TUNIC_S); px(9, 7, TUNIC_S); px(10, 7, TUNIC_S);
      px(4, 8, TUNIC_S); px(5, 8, TUNIC_S); px(6, 8, TUNIC); px(7, 8, TUNIC); px(8, 8, TUNIC); px(9, 8, TUNIC); px(10, 8, TUNIC_S); px(11, 8, TUNIC_S);
      px(4, 9, TUNIC_S); px(5, 9, TUNIC_S); px(6, 9, TUNIC); px(7, 9, TUNIC); px(8, 9, TUNIC); px(9, 9, TUNIC); px(10, 9, TUNIC_S); px(11, 9, TUNIC_S);
      // Arms
      px(3, 8, SKIN); px(12, 8, SKIN);
      px(3, 9, SKIN_S); px(12, 9, SKIN_S);
      px(3, 10, SKIN); px(12, 10, SKIN);

      // Belt
      px(5, 10, BELT); px(6, 10, BELT); px(7, 10, BELT); px(8, 10, BELT); px(9, 10, BELT); px(10, 10, BELT);

      // Tunic skirt
      px(5, 11, TUNIC_S); px(6, 11, TUNIC_S); px(7, 11, TUNIC); px(8, 11, TUNIC); px(9, 11, TUNIC_S); px(10, 11, TUNIC_S);
      px(5, 12, TUNIC_S); px(6, 12, TUNIC_S); px(7, 12, TUNIC_S); px(8, 12, TUNIC_S); px(9, 12, TUNIC_S); px(10, 12, TUNIC_S);

      // Legs
      px(6, 13, SKIN_S); px(9, 13, SKIN_S);
      px(6 + legOff, 14, SKIN); px(9 - legOff, 14, SKIN);

      // Boots
      px(5 + legOff, 15, BOOT); px(6 + legOff, 15, BOOT); px(7 + legOff, 15, BOOT);
      px(8 - legOff, 15, BOOT); px(9 - legOff, 15, BOOT); px(10 - legOff, 15, BOOT);
      px(5 + legOff, 16, BOOT_S); px(6 + legOff, 16, BOOT_S); px(7 + legOff, 16, BOOT_S);
      px(8 - legOff, 16, BOOT_S); px(9 - legOff, 16, BOOT_S); px(10 - legOff, 16, BOOT_S);

    } else if (dir === 'right') {
      // Side view (also used for 'left' via mirror)
      // Hair
      px(7, 0, HAIR); px(8, 0, HAIR); px(9, 0, HAIR);
      px(6, 1, HAIR); px(7, 1, HAIR); px(8, 1, HAIR_H); px(9, 1, HAIR); px(10, 1, HAIR);
      px(6, 2, HAIR); px(7, 2, HAIR_H); px(8, 2, HAIR_H); px(9, 2, HAIR); px(10, 2, HAIR);

      // Face (side)
      px(6, 3, HAIR); px(7, 3, SKIN); px(8, 3, SKIN); px(9, 3, SKIN); px(10, 3, SKIN);
      px(6, 4, SKIN_S); px(7, 4, SKIN); px(8, 4, SKIN); px(9, 4, SKIN); px(10, 4, SKIN);
      // Eye
      px(9, 4, EYE);
      px(9, 3, WHITE);
      // Nose
      px(10, 4, SKIN_S);
      // Mouth
      px(7, 5, SKIN_S); px(8, 5, SKIN); px(9, 5, SKIN);
      px(6, 5, SKIN_S); px(10, 5, SKIN_S);

      // Neck
      px(7, 6, SKIN_S); px(8, 6, SKIN_S);

      // Tunic
      px(5, 7, TUNIC_S); px(6, 7, TUNIC); px(7, 7, TUNIC); px(8, 7, TUNIC); px(9, 7, TUNIC); px(10, 7, TUNIC_S);
      px(5, 8, TUNIC_S); px(6, 8, TUNIC); px(7, 8, TUNIC_H); px(8, 8, TUNIC); px(9, 8, TUNIC); px(10, 8, TUNIC_S);
      px(5, 9, TUNIC_S); px(6, 9, TUNIC); px(7, 9, TUNIC); px(8, 9, TUNIC); px(9, 9, TUNIC); px(10, 9, TUNIC_S);
      // Front arm (side view = one arm visible)
      px(10, 8, SKIN); px(11, 8, SKIN);
      px(10, 9, SKIN_S); px(11, 9, SKIN_S);
      px(10, 10, SKIN);

      // Belt
      px(5, 10, BELT); px(6, 10, BELT); px(7, 10, BELT); px(8, 10, BELT); px(9, 10, BELT);
      px(7, 10, '#FFD700'); // buckle

      // Tunic skirt
      px(5, 11, TUNIC_S); px(6, 11, TUNIC); px(7, 11, TUNIC_S); px(8, 11, TUNIC); px(9, 11, TUNIC_S);
      px(5, 12, TUNIC_S); px(6, 12, TUNIC_S); px(7, 12, TUNIC_S); px(8, 12, TUNIC_S); px(9, 12, TUNIC_S);

      // Legs (side stride)
      px(6 + legOff, 13, SKIN_S); px(8 - legOff, 13, SKIN_S);
      px(6 + legOff, 14, SKIN); px(8 - legOff, 14, SKIN);

      // Boots
      px(5 + legOff, 15, BOOT); px(6 + legOff, 15, BOOT); px(7 + legOff, 15, BOOT);
      px(7 - legOff, 15, BOOT); px(8 - legOff, 15, BOOT); px(9 - legOff, 15, BOOT);
      px(5 + legOff, 16, BOOT_S); px(6 + legOff, 16, BOOT_S); px(7 + legOff, 16, BOOT_S);
      px(7 - legOff, 16, BOOT_S); px(8 - legOff, 16, BOOT_S); px(9 - legOff, 16, BOOT_S);
    }

    ctx.restore();
  }

  /* ── Attribute-derived getters ────────────────────── */

  /** Detection radius in pixels (tracking determines range) */
  getEffectiveTracking() {
    const boost = this.trackingBoostTime > 0 ? 3 : 0;
    return this.attributes.tracking + boost;
  }

  getEffectiveLuck() {
    const boost = this.luckBoostTime > 0 ? 3 : 0;
    return this.attributes.luck + boost;
  }

  getDetectionRadius() {
    return 120 + this.getEffectiveTracking() * 15;
  }

  /** Time to open a box in milliseconds (hunting reduces it) */
  getOpenTime() {
    return Math.max(500, 3000 - this.attributes.hunting * 100);
  }

  /** Movement speed in pixels/second */
  getMoveSpeed() {
    let speed = 120 + this.attributes.speed * 12;
    if (this.speedBoostTime > 0) speed *= 1.5;
    const phantom = this.activeSkills?.find(s => s.id === 'phantom_step' && s.expiresAt > Date.now());
    if (phantom) speed *= 1.3;
    return speed;
  }

  /* ── Energy management ────────────────────────────── */

  useEnergy(amount) {
    if (this.attributes.energy < amount) return false;
    this.attributes.energy -= amount;
    return true;
  }

  hasEnergy(amount) {
    return this.attributes.energy >= amount;
  }

  /** Full energy regen (called between rounds) */
  regenEnergy() {
    this.attributes.energy = 100;
  }

  /* ── Round stats ──────────────────────────────────── */

  resetRoundStats() {
    this.boxesOpened = 0;
    this.tokensEarned = 0;
    this.goldEarned = 0;
  }
}

// Expose on global scope
window.Player = Player;
