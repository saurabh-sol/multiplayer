# TREZO — Treasure Hunt MMO

**Complete Player & Feature Guide**

| | |
|---|---|
| **Website** | https://playtrezo.com |
| **Tagline** | Hunt Treasures. Earn Rewards. Rule the Map. |
| **Chain** | Solana |
| **Token** | $HUNT |
| **Genre** | Browser-based pixel treasure hunt MMO |

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Game Modes](#game-modes)
4. [Round System](#round-system)
5. [The Map](#the-map)
6. [Chest System](#chest-system)
7. [Hunter Attributes](#hunter-attributes)
8. [Items & Skills](#items--skills)
9. [Economy: Points & $HUNT](#economy-points--hunt)
10. [Buildings & Profile](#buildings--profile)
11. [Multiplayer](#multiplayer)
12. [HUD & Controls](#hud--controls)
13. [Wallet Integration](#wallet-integration)
14. [Tips & Strategy](#tips--strategy)
15. [FAQ](#faq)
16. [Social Media Snippets](#social-media-snippets)

---

## Overview

**TREZO** is a round-based multiplayer treasure hunting game built with HTML5 Canvas and Solana wallet integration. Players explore a large pixel-art fantasy map, open treasure chests, compete on leaderboards, and earn **Points** and **$HUNT tokens**.

Key features:

- Full-screen pixel art gameplay with dynamic atmosphere and lighting
- Two-tier chest system (visible normal chests + hidden special chests)
- Live multiplayer — see other hunters on the map in real time
- Solana wallet login (Phantom, Solflare, Backpack)
- Persistent progression: points, buildings, and token claiming
- Round-based $HUNT reward pools (25K – 200K per round)

---

## Getting Started

### Step 1 — Open the game

Go to **https://playtrezo.com** in a modern browser (Chrome, Firefox, Safari, Edge).

### Step 2 — Choose how to play

| Option | Button | What you get |
|--------|--------|--------------|
| **Wallet Hunter** | Connect Solana Wallet | Real rewards, saved progress, username, profile |
| **Guest Hunter** | Play as Guest | Free practice — no saved rewards |

### Step 3 — Wallet setup (recommended)

1. Click **Connect Solana Wallet**
2. Choose your wallet (Phantom, Solflare, or Backpack)
3. Approve the connection and sign the login message
4. If you are new, pick a **Hunter Name** (3–16 characters, letters/numbers/underscores only)
5. Wait for the loading screen — you enter the **Hunter's Lobby**

### Step 4 — Enter a round

- **Wallet players:** Wait until **10+ hunters** are online, then the countdown starts
- **Guest players:** Testing mode — rounds start without the 10-player minimum

### Step 5 — Hunt

When the round goes **LIVE**, explore the map, open chests, and collect loot before the reward pool runs out.

---

## Game Modes

### Wallet Mode (Mainnet Rewards)

- Connect a Solana wallet
- Register a unique username
- Points and $HUNT are saved to the backend database
- Build structures and claim tokens to your wallet
- Visible to all players on the map (green name tag + gold indicator)
- Required for real $HUNT rewards

### Guest Mode (Practice / Testing)

- No wallet needed
- Play immediately — no 10-player lobby wait
- Explore the map and open chests
- **Cannot save points or claim $HUNT**
- Tokens found are shown as forfeited — connect a wallet to earn for real
- Visible to other players as **Guest** (gray name tag)

---

## Round System

Each game session runs in **rounds**. A round has six phases:

```
WAITING → COUNTDOWN → LIVE → ENDING → RESULTS → REFILLING → (next round)
```

### Phase breakdown

| Phase | Duration | What happens |
|-------|----------|--------------|
| **WAITING** | Until 10+ players | Lobby waits for minimum hunters (wallet mode only) |
| **COUNTDOWN** | 10 seconds | Pre-round countdown — prepare your strategy |
| **LIVE** | Until pool depleted or all token chests opened | Active hunting on the map |
| **ENDING** | 2 seconds | Brief transition |
| **RESULTS** | 15 seconds | Your stats, leaderboard, round reward share |
| **REFILLING** | 5 seconds | Chests respawn, new reward pool selected |

### Reward pool

Each round has a random **$HUNT reward pool**:

| Possible pools |
|----------------|
| 25,000 $HUNT |
| 50,000 $HUNT |
| 75,000 $HUNT |
| 100,000 $HUNT |
| 150,000 $HUNT |
| 200,000 $HUNT |

**How the pool works:**

1. At round start, the full pool is **split across hidden Token and Jackpot chests**
2. The HUD shows **Pool Left** — remaining $HUNT in the round
3. When a hunter opens a token chest, that amount is deducted from the pool
4. When the pool hits **0**, the round **ends automatically**
5. Results screen shows your share based on chests opened vs. total opened

Higher round numbers have slightly better odds of larger pools.

### Round end conditions

A round ends when **any** of these happen:

- The **$HUNT pool reaches 0** (fully distributed)
- All **claimable token chests** are opened
- **5-minute** safety time limit (live phase cap)

---

## The Map

| Property | Value |
|----------|-------|
| Size | 60 × 45 tiles |
| Tile size | 48 px |
| Total area | 2,880 × 2,160 pixels |
| Style | Pixel fantasy (grass, trees, paths) |
| Atmosphere | Auto-cycles (day → dusk → night → dawn) |

- Full-screen camera follows your hunter
- Minimap in the corner shows your position and nearby chests
- Collision with trees and map edges
- Ambient particles (fireflies, leaves, dust)

---

## Chest System

Chests are split into two tiers: **Normal (60%)** and **Hidden (40%)**.

### Normal chests — always visible

| Type | Loot |
|------|------|
| **Empty Box** | Nothing (~30% of normal chests) |
| **Small Reward** | +25 Points |
| **Medium Reward** | +100 Points |
| **Item Box** | +50 Points + Compass or Energy Potion |

### Hidden chests — require detection

Hidden chests start invisible. You need **Tracking** attribute and proximity to detect them.

| Type | Points | $HUNT | Extra |
|------|--------|-------|-------|
| **Special Box** | 1,200 – 5,000 (random) | — | Random skill buff (60s) |
| **Token Box** | 1,200 – 5,000 (random) | From round pool | High value |
| **Rare Item Box** | 1,200 – 5,000 (random) | — | Golden Compass, Swift Boots, or Mega Potion |
| **Jackpot Box** | **20,000 – 30,000** | Largest pool share | Skill buff + confetti |

**Detection flow for hidden chests:**

1. **Hidden** — invisible on map
2. **Detected** — shimmer effect when you enter tracking range
3. **Revealed** — chest appears when you get close
4. **Opening** — progress bar while unlocking (costs 10 energy)
5. **Opened** — loot + coin animation

Hidden chests show a **★** marker when revealed.

### Opening a chest

- Walk within **~65 pixels** of a chest
- **Click** the chest to start opening
- Stay close — moving too far cancels opening
- Costs **10 energy** per open attempt
- Opening speed depends on **Hunting** attribute

---

## Hunter Attributes

Every hunter has four core attributes (default: 5 each):

| Attribute | Effect |
|-----------|--------|
| **Hunting** | Faster chest opening (lower open time) |
| **Tracking** | Larger detection radius for hidden chests |
| **Speed** | Faster movement across the map |
| **Luck** | Better loot chances |

### Formulas

| Stat | Formula |
|------|---------|
| Detection radius | 120 + (Tracking × 15) px |
| Open time | max(500ms, 3000 − Hunting × 100) |
| Move speed | 120 + (Speed × 12) px/sec |
| Energy | 100 max — refills between rounds |

Attributes are shown in the lobby before each round.

---

## Items & Skills

### Inventory items (keys 1 / 2 / 3)

| Key | Item | Effect |
|-----|------|--------|
| **1** | Treasure Compass | Points to nearest **hidden** chest |
| **2** | Speed Boots | +50% movement speed for 15 seconds |
| **3** | Energy Potion | Restores 50 energy |

Items are found in **Item Boxes** and **Rare Item Boxes**. You start with a small starter pack when you register.

### Special skills (from hidden chests)

Skills last **60 seconds** (Phantom Step: 45s):

| Skill | Effect |
|-------|--------|
| **Treasure Sense** | +50% detection radius |
| **Quick Hands** | Open chests 50% faster |
| **Lucky Streak** | +25% better rewards |
| **Phantom Step** | +30% movement speed |
| **Gold Magnet** | Auto-collect nearby points |

---

## Economy: Points & $HUNT

### Points

- Earned from **normal and hidden chests**
- Used to **build and upgrade** Storage Room and Hunter's Home
- Synced to backend when wallet is connected
- Can be deposited into Storage Room for safekeeping

### $HUNT Tokens

- Found in **hidden Token and Jackpot chests**
- Amount comes from the **round reward pool** (not fixed per chest)
- Stored as **pending tokens** until claimed
- **Guests:** see tokens but cannot keep them — connect wallet to earn

### Claiming $HUNT

1. Connect wallet and play
2. Open token chests during rounds
3. Build a **Storage Room** (500 points)
4. Open **Profile** → enter claim wallet address → **Claim**

Tokens are marked claimed in the database and associated with your claim address.

---

## Buildings & Profile

Open **Profile** from the HUD (wallet players only).

### Storage Room

| | |
|---|---|
| **Build cost** | 500 points |
| **Upgrade cost** | baseCost × (level + 1) |
| **Max level** | 10 |
| **Capacity** | 1,000 points per level |
| **Purpose** | Store points safely; **required to claim $HUNT** |

Actions: Build, Upgrade, Deposit points, Withdraw points, Claim tokens

### Hunter's Home

| | |
|---|---|
| **Build cost** | 1,000 points |
| **Max level** | 5 |
| **Purpose** | Your base of operations; unlocks crafting (future) |

### Profile shows

- Total points
- Pending $HUNT
- Building levels and stored points
- Build / upgrade buttons

---

## Multiplayer

TREZO uses a **live presence system** — all connected hunters appear on the same map.

### What you see

- **Left panel:** Scrollable list of all online players
- **On map:** Other hunters rendered as pixel characters with name tags
- **Wallet hunters:** Green name + gold dot above head
- **Guests:** Gray “(Guest)” label

### How it works

- Your position syncs to the server every **2 seconds**
- Other players' positions refresh every **1.5 seconds**
- Players inactive for **15 seconds** are removed from the map
- Leaderboard ranks hunters by chests opened each round

### Lobby rules

| Mode | Min players to start |
|------|---------------------|
| Wallet | **10 hunters** online |
| Guest | **No minimum** (testing mode) |

---

## HUD & Controls

### Controls

| Input | Action |
|-------|--------|
| **W / ↑** | Move up |
| **S / ↓** | Move down |
| **A / ←** | Move left |
| **D / →** | Move right |
| **Click chest** | Open when nearby |
| **1** | Use Compass |
| **2** | Use Speed Boots |
| **3** | Use Energy Potion |
| **Profile button** | Open hunter profile (wallet) |
| **Leave button** | Exit to main menu |
| **Audio button** | Toggle sound |
| **Help button** | Show control hints |

### In-game HUD (top bar)

| Stat | Description |
|------|-------------|
| **Chests Left** | Claimable token chests remaining |
| **Pool Left** | $HUNT still available this round |
| **Rank** | Your position on the leaderboard |
| **Wallet** | Connected address or Guest status |

### Left panel

- Online player count
- List of all hunters currently in the session

### Other UI

- Energy bar (bottom)
- Inventory slots (compass, boots, potion)
- Minimap
- Compass overlay when active
- Reward popups and notifications on chest open

---

## Wallet Integration

### Supported wallets

- **Phantom**
- **Solflare**
- **Backpack**
- Other injected Solana providers (auto-detected)

### Login flow

1. Select wallet → approve connection
2. Sign authentication message
3. New users: choose username → account created with starter inventory
4. Returning users: welcome back with saved data loaded

### Starter inventory (new accounts)

- 2× Treasure Compass
- 1× Energy Potion
- 1× Speed Boots

### Disconnect

Click your wallet stat in the HUD → **Disconnect** to sign out.

---

## Tips & Strategy

1. **Upgrade Tracking** — hidden chests hold the best loot and $HUNT
2. **Save Compass for hidden hunts** — normal chests are easy to spot
3. **Watch Pool Left** — round ends when the pool is empty; prioritize token chests
4. **Build Storage early** — you need it to claim $HUNT
5. **Stay near chests while opening** — moving away cancels progress
6. **Manage energy** — each open costs 10; use potions wisely
7. **Jackpot chests** — 20K–30K points + biggest $HUNT share; hunt them first
8. **Guest first, wallet later** — learn the map in guest mode, then connect to earn
9. **Watch other players** — follow wallet hunters to contested areas
10. **Use skills immediately** — Treasure Sense + Quick Hands = fast hidden clears

---

## FAQ

**Q: Is the game free?**  
A: Yes. Guest mode is completely free. Wallet mode is free to play; you only need a Solana wallet for rewards.

**Q: Can guests earn $HUNT?**  
A: No. Guests can find tokens but they are forfeited. Connect a wallet to save and claim rewards.

**Q: Why won't my round start?**  
A: Wallet mode needs **10+ online players**. Use Guest mode to play immediately, or wait for more hunters.

**Q: Why can't I claim tokens?**  
A: You need a **Storage Room** built and pending tokens from opened chests.

**Q: Where did my points go?**  
A: Points sync when your wallet is connected. Open Profile to see your balance. Check your internet if sync failed — the game retries automatically.

**Q: How is the reward pool split?**  
A: The round pool is divided across hidden Token and Jackpot chests at spawn. Opening them distributes $HUNT until the pool hits zero.

**Q: Can I play on mobile?**  
A: The game runs in mobile browsers but is optimized for desktop (keyboard + mouse).

**Q: Which wallets work?**  
A: Phantom, Solflare, and Backpack are fully supported.

---

## Social Media Snippets

### One-liner

> TREZO — Browser treasure hunt MMO on Solana. Hunt chests, beat players, earn $HUNT. Free to play at playtrezo.com

### Launch tweet

```
🎮 TREZO is LIVE

🗺 Pixel treasure hunt MMO on Solana
📦 Normal + hidden chests
💰 $HUNT pools up to 200K per round
👥 Real-time multiplayer

Play → https://playtrezo.com
Connect wallet to earn for real 🔥

#Solana #GameFi #TREZO
```

### Thread outline

1. **Hook** — What is TREZO + link  
2. **How to play** — Connect / Guest → Lobby → Hunt  
3. **Chests** — Normal vs Hidden, jackpot 20K–30K pts  
4. **Rewards** — Points, $HUNT pool, Storage Room claim flow  
5. **Multiplayer** — 10 players, live map, leaderboard  
6. **CTA** — playtrezo.com + hashtags  

### Hashtags

`#TREZO` `#Solana` `#GameFi` `#PlayToEarn` `#Web3Gaming` `#TreasureHunt` `#SolanaGaming`

---

## Technical Reference (Developers)

| Component | URL / path |
|-----------|------------|
| Frontend | https://playtrezo.com |
| Backend API | https://multiplayer-2-rwmg.onrender.com/api |
| Health check | `/api/health` |
| GitHub | saurabh-sol/multiplayer |

### API endpoints (summary)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Check / load user |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/check-username` | Username availability |
| GET | `/api/players/online` | Online count |
| POST | `/api/players/presence` | Sync position |
| GET | `/api/players/presence` | Get other players |
| POST | `/api/players/update-points` | Add/subtract points |
| POST | `/api/tokens/add` | Add pending $HUNT |
| POST | `/api/tokens/claim` | Claim tokens |
| GET | `/api/buildings/:wallet` | Get buildings |
| POST | `/api/buildings/build` | Build / upgrade |

---

*Last updated: June 2026 · TREZO Treasure Hunt MMO*
