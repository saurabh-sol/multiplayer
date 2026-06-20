/* ============================================
   SOLANA TREASURE HUNT — Global Constants
   Loaded first so every module can reference them.
   ============================================ */

const TILE_SIZE     = 48;
const MAP_COLS      = 60;
const MAP_ROWS      = 45;
const MAP_WIDTH     = MAP_COLS * TILE_SIZE;   // 2880
const MAP_HEIGHT    = MAP_ROWS * TILE_SIZE;   // 2160
const CANVAS_WIDTH  = 960;
const CANVAS_HEIGHT = 640;

const ROUND_STATES = {
  WAITING:   'WAITING',
  COUNTDOWN: 'COUNTDOWN',
  LIVE:      'LIVE',
  ENDING:    'ENDING',
  RESULTS:   'RESULTS',
  REFILLING: 'REFILLING'
};

// API Configuration — use local backend on localhost, production URL otherwise
const API_BASE_URL = (() => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  return 'https://multiplayer-1-j2bs.onrender.com/api';
})();

// Two-tier box system: Normal (visible) and Hidden (require detection)
const BOX_TYPES = {
  // === NORMAL BOXES (always visible on ground) ===
  NORMAL_EMPTY: { 
    name: 'Empty Box', 
    color: '#8B7355', 
    points: 0, 
    tokenReward: 0, 
    rarity: 'common',
    visibility: 'normal'
  },
  NORMAL_SMALL: { 
    name: 'Small Reward', 
    color: '#A0826D', 
    points: 25, 
    tokenReward: 0, 
    rarity: 'common',
    visibility: 'normal'
  },
  NORMAL_MEDIUM: { 
    name: 'Medium Reward', 
    color: '#C9A86C', 
    points: 100, 
    tokenReward: 0, 
    rarity: 'uncommon',
    visibility: 'normal'
  },
  NORMAL_ITEM: { 
    name: 'Item Box', 
    color: '#4FC3F7', 
    points: 50, 
    tokenReward: 0, 
    rarity: 'uncommon',
    visibility: 'normal'
  },

  // === HIDDEN BOXES (require detection to reveal) ===
  HIDDEN_SPECIAL: { 
    name: 'Special Box', 
    color: '#AB47BC', 
    points: 350, 
    tokenReward: 0, 
    rarity: 'rare',
    visibility: 'hidden',
    hasSkill: true
  },
  HIDDEN_TOKEN: { 
    name: 'Token Box', 
    color: '#66BB6A', 
    points: 100, 
    tokenReward: 500, 
    rarity: 'rare',
    visibility: 'hidden'
  },
  HIDDEN_RARE_ITEM: { 
    name: 'Rare Item Box', 
    color: '#FFA726', 
    points: 200, 
    tokenReward: 0, 
    rarity: 'epic',
    visibility: 'hidden',
    hasRareItem: true
  },
  HIDDEN_JACKPOT: { 
    name: 'Jackpot Box', 
    color: '#FFD700', 
    points: 1000, 
    tokenReward: 5000, 
    rarity: 'legendary',
    visibility: 'hidden',
    hasSkill: true
  }
};

// Distribution for Normal boxes (60% of total boxes)
const NORMAL_BOX_DISTRIBUTION = {
  NORMAL_EMPTY:   0.30,
  NORMAL_SMALL:   0.40,
  NORMAL_MEDIUM:  0.25,
  NORMAL_ITEM:    0.05
};

// Distribution for Hidden boxes (40% of total boxes)
const HIDDEN_BOX_DISTRIBUTION = {
  HIDDEN_SPECIAL:    0.40,
  HIDDEN_TOKEN:      0.35,
  HIDDEN_RARE_ITEM:  0.20,
  HIDDEN_JACKPOT:    0.05
};

// Ratio of normal to hidden boxes
const BOX_VISIBILITY_RATIO = {
  normal: 0.60,
  hidden: 0.40
};

// Special skills that can be found in hidden boxes
const SPECIAL_SKILLS = [
  { id: 'treasure_sense', name: 'Treasure Sense', description: '+50% detection radius for 60s' },
  { id: 'quick_hands', name: 'Quick Hands', description: 'Open boxes 50% faster for 60s' },
  { id: 'lucky_streak', name: 'Lucky Streak', description: '+25% better rewards for 60s' },
  { id: 'phantom_step', name: 'Phantom Step', description: '+30% movement speed for 45s' },
  { id: 'gold_magnet', name: 'Gold Magnet', description: 'Auto-collect nearby points for 30s' }
];

// Building configurations
const BUILDING_CONFIG = {
  storage: { 
    name: 'Storage Room',
    baseCost: 500, 
    capacityPerLevel: 1000, 
    maxLevel: 10,
    description: 'Store points safely. Required to claim tokens.'
  },
  home: { 
    name: 'Hunter\'s Home',
    baseCost: 1000, 
    capacityPerLevel: 0, 
    maxLevel: 5,
    description: 'Your base of operations. Unlocks crafting.'
  }
};
