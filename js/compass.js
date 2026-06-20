/* ============================================
   SOLANA TREASURE HUNT — Compass Class
   Treasure compass item utility & HUD drawing
   ============================================ */

class Compass {
  constructor() {
    this.isActive = false;
    this.timeRemaining = 0;
    this.direction = 0; // Radian angle
    this.accuracy = 1.0; // 0 to 1 based on tracking skill
    this.pulseTimer = 0;
    this.wobbleOffset = 0;
  }

  activate(duration = 30) {
    this.isActive = true;
    this.timeRemaining = duration;
    this.pulseTimer = 0;
    this.wobbleOffset = 0;
  }

  update(player, boxManager, deltaTime) {
    if (!this.isActive) return;

    this.timeRemaining -= deltaTime;
    this.pulseTimer += deltaTime * 4;

    if (this.timeRemaining <= 0) {
      this.deactivate();
      if (window.gameInstance && window.gameInstance.ui) {
        window.gameInstance.ui.showNotification("Compass power expired!", "warning");
      }
      return;
    }

    // Get nearest hidden/detected chest
    const nearest = boxManager.getNearestHidden(player.x, player.y);
    if (!nearest) {
      this.direction = 0;
      return;
    }

    // Calculate angle towards chest
    const dx = nearest.x - player.x;
    const dy = nearest.y - player.y;
    let targetAngle = Math.atan2(dy, dx);

    // Apply needle wobble based on Tracking Skill
    // Max tracking (20) gives 1.0 accuracy (no wobble)
    // Min tracking (1) gives 0.0 accuracy (heavy wobble)
    const tracking = player.attributes.tracking;
    this.accuracy = Math.min(1.0, tracking / 20);

    const maxWobble = (1.0 - this.accuracy) * 0.8; // max wobble radians (~45 degrees)
    this.wobbleOffset += (Math.random() * 2 - 1) * deltaTime * 10;
    // clamp wobble
    this.wobbleOffset = Math.max(-maxWobble, Math.min(maxWobble, this.wobbleOffset));

    this.direction = targetAngle + this.wobbleOffset;
  }

  render(ctx, canvasWidth, canvasHeight) {
    if (!this.isActive) return;

    ctx.save();

    // Position in bottom-right area of canvas, offset from minimap
    const cx = canvasWidth - 210;
    const cy = canvasHeight - 70;
    const radius = 32;

    // Pulse glow ring
    const pulse = Math.sin(this.pulseTimer) * 4 + 4;
    ctx.fillStyle = 'rgba(240, 192, 64, 0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Draw Golden Outer Rim
    ctx.fillStyle = '#DAA520';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Dark dial face
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
    ctx.fill();

    // Inner dial markings (North, South, East, West ticks)
    ctx.fillStyle = '#4B5563';
    ctx.fillRect(cx - 1, cy - radius + 5, 2, 4); // N
    ctx.fillRect(cx - 1, cy + radius - 9, 2, 4); // S
    ctx.fillRect(cx - radius + 5, cy - 1, 4, 2); // W
    ctx.fillRect(cx + radius - 9, cy - 1, 4, 2); // E

    // Label markings text
    ctx.fillStyle = '#8B95A5';
    ctx.font = '7px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, cy - radius + 13);

    // Render Red compass needle pointing towards closest chest
    ctx.translate(cx, cy);
    ctx.rotate(this.direction);

    // Drawing diamond shape needle
    ctx.fillStyle = '#EF5350'; // Red pointer tip
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(radius - 10, 0);
    ctx.lineTo(0, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#BCAAA4'; // Silver backend tail
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(-(radius - 14), 0);
    ctx.lineTo(0, 2);
    ctx.closePath();
    ctx.fill();

    // center peg pivot pin
    ctx.fillStyle = '#DAA520';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw remaining duration overlay text
    ctx.save();
    ctx.fillStyle = '#f0c040';
    ctx.font = '7px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(`RADAR: ${Math.ceil(this.timeRemaining)}s`, cx, cy + radius + 15);
    ctx.restore();
  }

  deactivate() {
    this.isActive = false;
    this.timeRemaining = 0;
  }
}

// Expose globally
window.Compass = Compass;
