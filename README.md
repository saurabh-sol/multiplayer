# 🏴‍☠️ Solana Treasure Hunt - Pixel Fantasy Edition

A browser-based round-based treasure hunting game with Solana wallet integration. Built with pure HTML5 Canvas and JavaScript, featuring a cozy pixel art aesthetic inspired by [Cazwolf's Pixel Fantasy Tiles](https://cazwolf.itch.io/pixel-fantasy-tiles-basics).

![Game Preview](preview.png)

## 🎮 Game Concept

Players enter a lobby and wait for the next treasure hunt round to begin. When the round starts, hidden treasure boxes spawn across a vast pixel fantasy map. Players must explore, hunt, find, and open boxes as fast as possible. The round continues until every reward box is claimed.

**Key Features:**
- ⚡ Fast-paced round-based treasure hunting
- 🔍 Hidden boxes that require detection skills to find
- 🎭 Play as Guest or connect Solana wallet for real rewards
- 🤖 Competitive AI bots that hunt alongside you
- 📊 Skill-based progression system
- 🗺️ 60x45 tile pixel fantasy world

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/solana-treasure-hunt.git

# Navigate to project
cd solana-treasure-hunt

# Open in browser (or use a local server)
open index.html
# OR
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## 🎯 How to Play

### 1. Landing Screen
- **Connect Solana Wallet**: Login with Phantom or Solflare to earn real $HUNT tokens
- **Play as Guest**: Practice mode - find chests but forfeit token rewards

### 2. Lobby
- View round countdown timer
- Check your hunter attributes (Hunting, Tracking, Speed, Luck)
- See the reward pool and number of hidden chests
- View previous round leaderboard

### 3. Gameplay
- **Move**: WASD or Arrow Keys
- **Find Chests**: Walk near hidden boxes to detect them
- **Open Chests**: Click on revealed chests to start opening (costs 10 energy)
- **Use Items**: Click inventory slots or press 1/2/3
  - 🧭 **Compass**: Points to nearest hidden chest
  - 👢 **Speed Boots**: 50% movement boost for 15s
  - 🧪 **Potion**: Restores 50 energy

### 4. Round End
- View your collected loot
- Check final standings on the leaderboard
- Wait for next round countdown

## 💰 Box Types & Rewards

| Box Type | Color | Contents | Probability |
|----------|-------|----------|-------------|
| Empty | Brown | Nothing | 35% |
| Gold | Yellow | 50-150 Gold Coins | 20% |
| Item | Cyan | Compass/Potion/Boots | 15% |
| Skill Boost | Purple | +1 to any attribute | 10% |
| Small Token | Green | 100 $HUNT | 10% |
| Medium Token | Orange | 500 $HUNT | 5% |
| Rare Token | Red | 2,000 $HUNT | 3% |
| Jackpot | Gold/Rainbow | 10,000 $HUNT | 2% |

## 🎨 Player Attributes

Your hunter has 5 attributes that affect gameplay:

| Attribute | Effect |
|-----------|--------|
| **Hunting** | Faster chest opening time (max 500ms at level 20) |
| **Tracking** | Larger detection radius for finding hidden chests |
| **Speed** | Faster movement across the map |
| **Luck** | Slightly better chance for bonus loot |
| **Energy** | Required to open chests (regenerates between rounds) |

## 🗺️ World Map

The 60x45 tile map features:
- 🌿 **Grasslands**: Open areas with flowers and tall grass
- 🌲 **Forests**: Tree clusters that block movement
- 🏠 **Village**: Central area with houses and paths
- 🌊 **River**: Waterway with wooden bridges
- 🏔️ **Mountains**: Rocky border edges

## 🔄 Round System

Rounds progress through these states:

```
WAITING (2s) → COUNTDOWN (10s) → LIVE → ENDING (2s) → RESULTS (15s) → REFILLING (5s) → (repeat)
```

**Round Reward Pools:**
- Round 1: 100,000 $HUNT
- Round 2: 150,000 $HUNT
- Round 3: 250,000 $HUNT
- Each subsequent round: +50,000 $HUNT

## 🎵 Audio System

Procedurally generated 8-bit sound effects:
- Footsteps, discovery chimes, chest opening
- Countdown beeps and round start fanfare
- Reward sounds based on rarity

Toggle audio with the 🔊 button in the top-right HUD.

## 🏗️ Architecture

```
├── index.html           # Main entry point
├── style.css            # Pixel Fantasy themed styles
├── js/
│   ├── game.js          # Main game loop and orchestration
│   ├── map.js           # Procedural tile map generator
│   ├── player.js        # Player movement and attributes
│   ├── boxes.js         # Treasure chest lifecycle
│   ├── compass.js       # Treasure compass utility
│   ├── wallet.js        # Solana wallet mock integration
│   ├── round.js         # Round state machine
│   ├── fake-multiplayer.js  # AI bot players
│   ├── ui.js            # UI panels and HUD
│   ├── particles.js     # Visual effects
│   └── audio.js         # Procedural sound generation
└── PROJECT_SPEC.md      # Detailed technical specification
```

## 🔧 Development

### Constants

Key configuration values (defined in `game.js`):

```javascript
TILE_SIZE = 48;       // 48x48 pixel tiles
MAP_COLS = 60;        // Map width in tiles
MAP_ROWS = 45;        // Map height in tiles
CANVAS_WIDTH = 960;   // Viewport width
CANVAS_HEIGHT = 640;  // Viewport height
```

### Adding New Features

The game is built with a modular class-based architecture:

1. **Map Tiles**: Edit `MapGenerator.COLORS` in `js/map.js`
2. **Box Types**: Modify `BOX_TYPES` in `game.js`
3. **Player Sprites**: Update `_drawSprite()` in `js/player.js`
4. **UI Styles**: Edit CSS variables in `style.css`

## 🔮 Future Token Economy

Planned token utility features:
- ⭐ Buy Stars (premium currency)
- 🧭 Buy Treasure Compasses
- 🎫 Buy Round Passes
- ⚡ Buy Energy Refills
- 🗺️ Buy Legendary Maps
- 🏆 Enter Premium Hunt Rounds
- 👕 Buy cosmetic wearables
- 🛡️ Upgrade temporary boosts
- 🏰 Join guild hunts
- 🏪 Marketplace listing fees

## 📝 License

MIT License - Feel free to use this as a foundation for your own treasure hunting game!

## 🙏 Credits

- UI/Visual inspiration: [Cazwolf's Pixel Fantasy Tiles](https://cazwolf.itch.io/pixel-fantasy-tiles-basics)
- Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38
- Built with vanilla JavaScript and HTML5 Canvas

---

**Happy Hunting!** 🏴‍☠️✨
