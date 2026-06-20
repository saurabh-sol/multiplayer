/* ============================================
   SOLANA TREASURE HUNT — ParticleSystem
   Visual rendering effects + ambient world particles
   ============================================ */

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.ambientParticles = [];

    // Spawn timers for ambient types
    this._fireflyTimer = 0;
    this._leafTimer = 0;
    this._dustMoteTimer = 0;
  }

  /* ─── Event particles ────────────────────── */

  emitSparkle(x, y, color = '#ffd700') {
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() * 20 - 10),
        y: y + (Math.random() * 20 - 10),
        vx: (Math.random() * 40 - 20),
        vy: -(20 + Math.random() * 30),
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        size: 2 + Math.floor(Math.random() * 3),
        color: color,
        type: 'sparkle',
        gravity: -10,
        alpha: 1.0
      });
    }
  }

  emitCoinBurst(x, y) {
    const count = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        size: 3 + Math.random() * 3,
        color: '#FFD700',
        type: 'coin',
        gravity: 300,
        alpha: 1.0
      });
    }
  }

  emitConfetti(x, y) {
    const count = 30 + Math.floor(Math.random() * 20);
    const colors = ['#FF2A6D', '#05D9E8', '#01012B', '#F5A623', '#7ED321', '#B8E986'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 180;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        life: 1.5 + Math.random() * 1.0,
        maxLife: 2.5,
        size: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'confetti',
        gravity: 180,
        alpha: 1.0
      });
    }
  }

  emitDust(x, y, direction) {
    let vx = 0, vy = 0;
    if (direction === 'up') vy = 15;
    else if (direction === 'down') vy = -15;
    else if (direction === 'left') vx = 15;
    else if (direction === 'right') vx = -15;
    vx += (Math.random() * 10 - 5);
    vy += (Math.random() * 10 - 5);

    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() * 8 - 4),
        y: y + 12,
        vx: vx + (Math.random() * 6 - 3),
        vy: vy + (Math.random() * 6 - 3),
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.55,
        size: 2 + Math.floor(Math.random() * 3),
        color: '#A0826D',
        type: 'dust',
        gravity: 0,
        alpha: 0.5
      });
    }
  }

  emitGlow(x, y, color = 'rgba(240, 192, 64, 0.4)', duration = 1.0) {
    this.particles.push({
      x, y, vx: 0, vy: 0,
      life: duration, maxLife: duration,
      size: 32, color, type: 'glow',
      gravity: 0, alpha: 1.0
    });
  }

  /* ─── Ambient world particles ────────────── */

  updateAmbient(camera, deltaTime) {
    // Fireflies / pollen — ~15 active
    this._fireflyTimer += deltaTime;
    if (this._fireflyTimer >= 0.35) {
      this._fireflyTimer = 0;
      const activeFireflies = this.ambientParticles.filter(p => p.type === 'firefly').length;
      if (activeFireflies < 15) {
        this.ambientParticles.push({
          x: camera.x + Math.random() * camera.width,
          y: camera.y + Math.random() * camera.height,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.5) * 8,
          life: 3 + Math.random() * 3,
          maxLife: 6,
          size: 2 + Math.random() * 2,
          phase: Math.random() * Math.PI * 2,
          type: 'firefly',
          alpha: 1.0
        });
      }
    }

    // Falling leaves — ~8 active, spawn near top
    this._leafTimer += deltaTime;
    if (this._leafTimer >= 0.55) {
      this._leafTimer = 0;
      const activeLeaves = this.ambientParticles.filter(p => p.type === 'leaf').length;
      if (activeLeaves < 8) {
        this.ambientParticles.push({
          x: camera.x + Math.random() * camera.width,
          y: camera.y - 10,
          vx: (Math.random() - 0.3) * 20,
          vy: 18 + Math.random() * 22,
          life: 4 + Math.random() * 3,
          maxLife: 7,
          size: 4 + Math.random() * 3,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 3,
          phase: Math.random() * Math.PI * 2,
          color: Math.random() > 0.5 ? '#8B6C42' : '#5a8030',
          type: 'leaf',
          alpha: 1.0
        });
      }
    }

    // Dust motes — ~10 active
    this._dustMoteTimer += deltaTime;
    if (this._dustMoteTimer >= 0.4) {
      this._dustMoteTimer = 0;
      const activeMotes = this.ambientParticles.filter(p => p.type === 'dustMote').length;
      if (activeMotes < 10) {
        this.ambientParticles.push({
          x: camera.x + Math.random() * camera.width,
          y: camera.y + Math.random() * camera.height,
          vx: 4 + Math.random() * 8,
          vy: (Math.random() - 0.5) * 4,
          life: 5 + Math.random() * 4,
          maxLife: 9,
          size: 1.5 + Math.random() * 1.5,
          type: 'dustMote',
          alpha: 0.15 + Math.random() * 0.15
        });
      }
    }

    // Update ambient particles
    for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
      const p = this.ambientParticles[i];
      p.life -= deltaTime;
      if (p.life <= 0) { this.ambientParticles.splice(i, 1); continue; }

      const lifeRatio = p.life / p.maxLife;

      if (p.type === 'firefly') {
        p.phase += deltaTime * 2.5;
        p.x += (p.vx + Math.sin(p.phase) * 15) * deltaTime;
        p.y += (p.vy + Math.cos(p.phase * 0.7) * 10) * deltaTime;
        // Pulsing glow
        p.alpha = (0.4 + Math.sin(p.phase * 1.8) * 0.4) * Math.min(1, lifeRatio * 3);
      } else if (p.type === 'leaf') {
        p.phase += deltaTime * 1.3;
        p.x += (p.vx + Math.sin(p.phase) * 12) * deltaTime;
        p.y += p.vy * deltaTime;
        p.rotation += p.rotSpeed * deltaTime;
        p.alpha = Math.min(1, lifeRatio * 2.5) * 0.7;
      } else if (p.type === 'dustMote') {
        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;
        p.alpha = (0.15 + Math.sin(Date.now() / 2000 + i) * 0.08) * Math.min(1, lifeRatio * 2);
      }
    }
  }

  renderAmbient(ctx, camera) {
    ctx.save();
    for (const p of this.ambientParticles) {
      const sx = p.x - camera.x;
      const sy = p.y - camera.y;
      if (sx < -30 || sx > camera.width + 30 || sy < -30 || sy > camera.height + 30) continue;

      ctx.globalAlpha = p.alpha;

      if (p.type === 'firefly') {
        // Glow halo
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.size * 3);
        grad.addColorStop(0, 'rgba(200, 255, 100, 0.6)');
        grad.addColorStop(0.5, 'rgba(180, 240, 60, 0.15)');
        grad.addColorStop(1, 'rgba(180, 240, 60, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
        // Core dot
        ctx.fillStyle = '#e8ffb0';
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (p.type === 'leaf') {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        // Leaf vein
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(-p.size / 4, 0, p.size / 2, 1);
        ctx.restore();
      }
      else if (p.type === 'dustMote') {
        ctx.fillStyle = 'rgba(240, 230, 210, 0.8)';
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ─── Event particle update & render ─────── */

  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += p.gravity * deltaTime;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  render(ctx, camera) {
    ctx.save();
    for (const p of this.particles) {
      const screenX = p.x - camera.x;
      const screenY = p.y - camera.y;
      if (screenX < -50 || screenX > camera.width + 50 || screenY < -50 || screenY > camera.height + 50) continue;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'sparkle') {
        ctx.fillRect(Math.floor(screenX - p.size / 2), Math.floor(screenY), p.size, 1);
        ctx.fillRect(Math.floor(screenX), Math.floor(screenY - p.size / 2), 1, p.size);
      }
      else if (p.type === 'coin') {
        ctx.beginPath();
        ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      else if (p.type === 'confetti') {
        ctx.translate(screenX, screenY);
        ctx.rotate(p.life * 10);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.rotate(-p.life * 10);
        ctx.translate(-screenX, -screenY);
      }
      else if (p.type === 'dust') {
        ctx.beginPath();
        ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (p.type === 'glow') {
        const radius = p.size * (1 + (1 - p.alpha) * 0.5);
        const grad = ctx.createRadialGradient(screenX, screenY, 2, screenX, screenY, radius);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
    this.ambientParticles = [];
  }
}

window.ParticleSystem = ParticleSystem;
