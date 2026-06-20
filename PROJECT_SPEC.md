# PROJECT SPECIFICATION: Solana Treasure Hunt Game

This document serves as the absolute source of truth and technical reference for the Solana Treasure Hunt browser game. It contains the architectural details, class interfaces, state machines, rendering specs, and component descriptions.

---

## 1. Core Architecture

The game is designed as a single-page client-side web application with a simulated multiplayer environment. It utilizes a top-down tile-based map rendered via HTML5 Canvas (using crisp pixelated styling) and a modern DOM-based UI overlay system.

### Global Configuration & Constants

These constants are defined globally on the `window` object in `js/game.js` before any other module loads:

```javascript
const TILE_SIZE = 48;       // Dimension of a single tile in pixels
const MAP_COLS = 60;        // Total columns of the map
const MAP_ROWS = 45;        // Total rows of the map
const MAP_WIDTH = MAP_COLS * TILE_SIZE;   // 2880px
const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;  // 2160px
const CANVAS_WIDTH = 960;   // Viewport rendering width
const CANVAS_HEIGHT = 640;  // Viewport rendering height

const ROUND_STATES = {
  WAITING: 'WAITING',
  COUNTDOWN: 'COUNTDOWN',
  LIVE: 'LIVE',
  ENDING: 'ENDING',
  RESULTS: 'RESULTS',
  REFILLING: 'REFILLING'
};

const BOX_TYPES = {
  EMPTY: { name: 'Empty Box', color: '#8B7355', tokenReward: 0, rarity: 'common' },
  GOLD: { name: 'Gold Box', color: '#FFD700', tokenReward: 0, rarity: 'common' },
  ITEM: { name: 'Item Box', color: '#4FC3F7', tokenReward: 0, rarity: 'uncommon' },
  SKILL_BOOST: { name: 'Skill Boost', color: '#AB47BC', tokenReward: 0, rarity: 'uncommon' },
  SMALL_TOKEN: { name: 'Small Token Box', color: '#66BB6A', tokenReward: 100, rarity: 'rare' },
  MEDIUM_TOKEN: { name: 'Medium Token Box', color: '#FFA726', tokenReward: 500, rarity: 'rare' },
  RARE_TOKEN: { name: 'Rare Token Box', color: '#EF5350', tokenReward: 2000, rarity: 'epic' },
  JACKPOT: { name: 'Jackpot Box', color: '#FFD700', tokenReward: 10000, rarity: 'legendary' }
};

const BOX_DISTRIBUTION = {
  EMPTY: 0.35,
  GOLD: 0.20,
  ITEM: 0.15,
  SKILL_BOOST: 0.10,
  SMALL_TOKEN: 0.10,
  MEDIUM_TOKEN: 0.05,
  RARE_TOKEN: 0.03,
  JACKPOT: 0.02
};
```

---

## 2. File Structure & Script Loading Order

All scripts are loaded via standard `<script>` tags in `index.html`. They must execute in the following order to resolve dependencies properly:

1. `js/audio.js` — Audio manager (Web Audio API)
2. `js/particles.js` — Core particle system (Sparkles, coins, debris)
3. `js/map.js` — Procedural tile map generator and walkable logic
4. `js/player.js` — Main character movement, collision response, and attributes
5. `js/boxes.js` — Box managers, reward distribution, and state lifecycle
6. `js/compass.js` — Treasure compass item logic and rendering
7. `js/wallet.js` — Mock Solana/Privy wallet connector
8. `js/round.js` — Central state machine and game lobby loops
9. `js/fake-multiplayer.js` — Fake competitive AI player agents
10. `js/ui.js` — Overlay panels, HUD, notifications, and menu handlers
11. `js/game.js` — Primary game engine loop, canvas listener, and coordinator

---

## 3. Module Specifications & Interfaces

### 3.1. MapGenerator (`js/map.js`)
Generates tile layout using procedural algorithms (e.g., Perlin noise approximations or grid partitioning).
*   **Tile ID Map**: 
    *   `0`: Grass (Walkable, textured green with tiny specs)
    *   `1`: Tall Grass (Walkable, slows down player movement by 30%, textured darker green)
    *   `2`: Tree (Impassable; brown trunks with leafy crown)
    *   `3`: Water (Impassable; animated wave frame patterns)
    *   `4`: Path (Walkable, textured brown dirt)
    *   `5`: Rock (Impassable; gray stone boulders)
    *   `6`: Flower (Walkable; grass base with red/yellow pixel dots)
    *   `7`: Bush (Walkable; slows down player movement by 15%)
    *   `8`: Bridge (Walkable over water tiles)
    *   `9`: House (Impassable; town houses with wooden walls and red roofs)
    *   `10`: Fence (Impassable obstacle boundary)

```javascript
class MapGenerator {
  constructor(cols, rows, tileSize) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.tiles = []; // 2D array of tile types
  }
  generate() {} // Generates tiles list
  getTile(col, row) {} // Returns tile index (0-10) or impassable default
  isWalkable(pixelX, pixelY) {} // Returns true if coordinates are walkable (accounting for bounding box)
  getSpawnPoints(count) {} // Returns array of {x, y} coordinates for chest placement (must be walkable & safe)
  render(ctx, camera) {} // Renders visible segment based on camera {x, y, width, height}
  renderMinimap(ctx, x, y, width, height, playerX, playerY, boxes) {} // Renders miniature radar/map
}
```

### 3.2. Player (`js/player.js`)
Stores attributes, performs collision checking against `MapGenerator`, uses energy, and draws player animations.
*   **Attributes**:
    *   `hunting`: Affects chest opening time (formula: `3000 - hunting * 100` milliseconds, minimum limit 500ms).
    *   `tracking`: Affects discovery circle radius (formula: `120 + tracking * 15` pixels).
    *   `speed`: Affects player movement velocity (formula: `120 + speed * 12` pixels per second).
    *   `luck`: Increases chance of spawning rare loot drops in place of empty/common boxes.
    *   `energy`: Max 100. Consumed when opening chests. Regenerates at lobby state.

```javascript
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 32;
    this.height = 40;
    this.direction = 'down'; // 'up', 'down', 'left', 'right'
    this.isMoving = false;
    this.frameIndex = 0;
    this.attributes = { hunting: 5, tracking: 5, speed: 5, luck: 5, energy: 100 };
    this.inventory = []; // array of {type, name, quantity}
    this.boxesOpened = 0;
    this.tokensEarned = 0;
    this.goldEarned = 0;
  }
  update(keys, deltaTime, map) {} // Handles direction checks, movement, and collision
  render(ctx, camera) {} // Draws pixel character animations and semi-transparent detection circle
  getDetectionRadius() {} // Returns radius size in pixels
  getOpenTime() {} // Returns box opening delay in ms
  getMoveSpeed() {} // Returns velocity in px/s
  useEnergy(amount) {} // Returns true if subtraction successful; false if insufficient energy
  hasEnergy(amount) {} // Check energy levels
  regenEnergy() {} // Restores player energy back to 100
  resetRoundStats() {} // Resets current session scores
}
```

### 3.3. BoxManager & Box (`js/boxes.js`)
Handles spawning of treasure chests, proximity detection to player, and chest animation frames.
*   **States**:
    *   `hidden`: Completely invisible to player.
    *   `detected`: Player tracking boundary overlaps box; box is rendered as a faint shimmer / dust cloud.
    *   `revealed`: Chest becomes fully visible as solid asset.
    *   `opening`: Progress bar active, countdown starts.
    *   `opened`: Chest open state, triggers coin/particle animations.

```javascript
class Box {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // Key in BOX_TYPES
    this.state = 'hidden'; // 'hidden', 'detected', 'revealed', 'opening', 'opened'
    this.openProgress = 0; // 0 to 100
    this.openedBy = null; // String matching player names or AI
    this.tokenReward = BOX_TYPES[type].tokenReward;
    this.loot = null; // Item contents (e.g. key, potion, gold coins)
    this.isClaimable = this.tokenReward > 0;
  }
}

class BoxManager {
  constructor() {
    this.boxes = [];
  }
  spawnBoxes(spawnPoints, roundNumber) {} // Distributes chests based on probability weights
  update(player, deltaTime) {} // Proximity calculations
  render(ctx, camera) {} // Render logic
  getBoxAt(pixelX, pixelY) {} // Click validation check
  getNearestHidden(pixelX, pixelY) {} // Finder check (for Compass module)
  startOpening(box, player) {} // Triggers progress bar & countdown
  getRemaining() {} // Count remaining unopened boxes
  getClaimableRemaining() {} // Count unopened token boxes
  getTotal() {} // Spawned count
  clear() {} // Resets database list
}
```

### 3.4. Compass (`js/compass.js`)
Consumable premium item logic. When active, it displays a radar overlay drawing an arrow pointing in the direction of the nearest hidden chest.
*   **Wobble Offset**: The accuracy of the needle depends on the Player's `tracking` level. (Lower tracking introduces random angle shifts/needle wobble).

```javascript
class Compass {
  constructor() {
    this.isActive = false;
    this.timeRemaining = 0;
    this.direction = 0; // Radian angle
    this.accuracy = 1.0; // 0-1 scale
  }
  activate(duration) {} // Triggers utility
  update(player, boxManager, deltaTime) {} // Recalculates direction with wobble adjustments
  render(ctx, canvasWidth, canvasHeight) {} // Renders golden circular frame and moving needle
  deactivate() {}
}
```

### 3.5. WalletManager (`js/wallet.js`)
Handles wallet connectivity emulation. Prevents guest claims, displays addresses in compact format, and tracks claimed transactions to prevent replay/duplicate server requests.

```javascript
class WalletManager {
  constructor() {
    this.connected = false;
    this.address = null;
    this.isGuest = false;
    this.claimedRewards = new Map(); // boxId -> {amount, status}
    this.totalClaimed = 0;
  }
  connect() {} // Emulates Privy modal trigger returning Promise
  disconnect() {}
  isConnected() {}
  getDisplayAddress() {} // E.g. "4xKp...7eNs"
  canClaimRewards() {} // False if Guest or Disconnected
  claimReward(boxId, amount) {} // Emulates server payload verify & signature
  getTotalClaimed() {}
  setGuest() {}
}
```

### 3.6. RoundManager (`js/round.js`)
Drives state machine loops of the lobby and gameplay phases.
*   **Round Lifecycle & Timers**:
    1.  `WAITING`: System cooldown validation (2s)
    2.  `COUNTDOWN`: Countdown lobby overlay (10s)
    3.  `LIVE`: Active map exploration (Active until `getClaimableRemaining() === 0`)
    4.  `ENDING`: Post-run scorecard parsing (2s)
    5.  `RESULTS`: Leaderboard showcase screen (15s)
    6.  `REFILLING`: Wiping entities and rebuilding assets (5s)

```javascript
class RoundManager {
  constructor() {
    this.state = ROUND_STATES.WAITING;
    this.roundNumber = 1;
    this.rewardPool = 100000; // Total tokens
    this.countdownTime = 10;
    this.roundTime = 0;
    this.results = null;
  }
  start() {} // Kicks off loop
  update(deltaTime, boxManager) {} // Steps timers, returns state change events { type: 'stateChange', from, to }
  getState() {}
  getRoundNumber() {}
  getRewardPool() {} // Returns pool: 100000 + (roundNumber - 1) * 50000
  getCountdown() {}
  getRoundTime() {}
  setResults(results) {}
  getResults() {}
  setState(newState) {}
}
```

### 3.7. FakeMultiplayer (`js/fake-multiplayer.js`)
Maintains competitive gameplay by placing AI agents on the board who walk around randomly, search, and claim chests concurrently with the player.

```javascript
class FakeMultiplayer {
  constructor() {
    this.players = [];
    this.onlineCount = 1;
  }
  spawnPlayers(count, map) {} // Generates random bots (names, tuning speeds, colors)
  update(deltaTime, map, boxManager) {} // Wander AI algorithm and chest opening chances
  render(ctx, camera) {} // Draws animated sprites
  getOnlineCount() {} // Count of active lobby players
  getLeaderboard(realPlayer) {} // Array sorted by score
  reset(map) {} // Resets AI coords
  clear() {}
}
```

### 3.8. AudioManager (`js/audio.js`)
Synthesizes retro 8-bit Sound Effects dynamically using Web Audio API Oscillators, eliminating external binary asset loads.
*   **Sounds**:
    *   *Footstep*: Crisp low frequency white-noise pop (50ms).
    *   *Discovery*: Double-note ascending chime.
    *   *Chest open*: Dark wood-creak swell + high pitch coin shine wave.
    *   *Countdown*: Brief high-pitched synthesizer beep (100ms).
    *   *Round start*: Triumphant major scale synthesizer fanfare.

```javascript
class AudioManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.3;
    this.ctx = null;
  }
  init() {} // Must be called directly inside user event click to bypass WebAudio policy
  playFootstep() {}
  playDiscovery() {}
  playChestOpen() {}
  playReward(rarity) {} // Modulates tune complexity depending on box rank
  playCountdown() {}
  playRoundStart() {}
  playEmpty() {}
  playClick() {}
  toggle() {}
  setVolume(v) {}
}
```

### 3.9. ParticleSystem (`js/particles.js`)
Visual effect engine handling drawing and decay calculations for graphical elements on the Canvas.

```javascript
class ParticleSystem {
  constructor() {
    this.particles = [];
  }
  emitSparkle(x, y, color) {} // Fading stars near hidden chests
  emitCoinBurst(x, y) {} // Gravity-affected physical coin elements
  emitConfetti(x, y) {} // Flurry shapes for Jackpot claims
  emitDust(x, y, direction) {} // Character footstep trail puffs
  emitGlow(x, y, color, duration) {} // Circular aura expansions
  update(deltaTime) {} // Physical position step & life duration subtraction
  render(ctx, camera) {} // Render logic
  clear() {}
}
```

### 3.10. UIManager (`js/ui.js`)
Synchronizes state variables with HTML markup elements, swapping active views and printing message popups.

```javascript
class UIManager {
  constructor() {
    this.currentScreen = 'landing';
  }
  showLanding() {}
  showLobby(roundManager, walletManager, fakeMultiplayer) {}
  showGame() {}
  showResults(roundResults, walletManager) {}
  updateHUD(data) {} // Re-renders stats bar values
  showNotification(message, type, duration) {} // Injects system notifications
  showBoxReward(boxType, reward) {} // Floats text above canvas relative to chest coordinates
  showGuestWarning() {}
  updateLobby(data) {}
  updateResults(data) {}
  hideAll() {}
}
```

### 3.11. Game (`js/game.js`)
The central hub coordinates the main execution loops, parses keyboard bindings, tracks rendering viewport (camera boundaries), and feeds animation step events back into UI components.

```javascript
class Game {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.camera = { x: 0, y: 0, width: 960, height: 640 };
    this.keys = { up: false, down: false, left: false, right: false };
    this.isRunning = false;
  }
  init() {} // Resolves DOM lookups, setups listeners, binds instances
  start() {} // Launches animation frame request handler
  gameLoop(timestamp) {} // Frame coordinator running at stable 60Hz
  update(deltaTime) {} // Dispatches updates to subclasses
  render() {} // Controls clear and rendering stack order
  handleBoxInteraction() {} // Translates clicks into search actions
}
```

---

## 4. CSS Design System Specifications

Styles are configured in `style.css` using pixel-art styling mixed with modern Glassmorphism parameters:
*   **Base Styling**: Dark violet palette with `#0a0e17` backing and glowing gold primary badges (`#f0c040`).
*   **Fonts**: The header display utilizes `'Press Start 2P'` loaded from Google Fonts for authentic retro styling. Body copy uses readable sans-serif `'Inter'`.
*   **Pixel Art Rendering**: Canvas nodes must specify the following styles to force the browser layout engine to render pixel structures crisp rather than blurred:
    ```css
    canvas {
      image-rendering: -moz-crisp-edges;
      image-rendering: -webkit-crisp-edges;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    ```
*   **Buttons**: Stylized pixel panels featuring inset shadows, gradient fills, and hover translations that scale elements slightly on cursor focus.

---

## 5. Implementation Workflow Guide (For Future Agents)

1.  **CSS Structure validation**: Ensure all classes matching buttons, panels, custom alerts, progress trackers, and modals exist within `style.css`.
2.  **HTML Setup**: Build the base viewport elements (`#game-container`), screen wrappers (`#landing-screen`, `#lobby-screen`, `#results-screen`), inventory list containers, and script includes inside `index.html`.
3.  **Module Creation**: Write each component file sequentially into `js/`. Start with simple systems (`audio.js`, `particles.js`), continue to gameplay assets (`map.js`, `player.js`, `boxes.js`, `compass.js`), and finish with session layers (`wallet.js`, `round.js`, `fake-multiplayer.js`, `ui.js`).
4.  **Integration**: Assemble logic inside `game.js`, configuring the base game loop (`requestAnimationFrame`), viewport-scrolling adjustments, and keybindings.
5.  **Manual Testing**: Open page context and assert clean flow transitions between Guest connections and Active game rounds. Validate chest visibility triggers and collision maps.
