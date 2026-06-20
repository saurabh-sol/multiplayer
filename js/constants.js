/* ============================================
   TREZO — Global Constants
   ============================================ */

const TILE_SIZE     = 48;
const MAP_COLS      = 60;
const MAP_ROWS      = 45;
const MAP_WIDTH     = MAP_COLS * TILE_SIZE;
const MAP_HEIGHT    = MAP_ROWS * TILE_SIZE;
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

// API Configuration
const API_BASE_URL = (() => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  return 'https://multiplayer-2-rwmg.onrender.com/api';
})();

// Round configuration
const ROUND_CONFIG = {
  MIN_WALLET_PLAYERS: 10,
  REWARD_CHEST_COUNT: 15,
  NORMAL_CHEST_COUNT: 50,
  TOTAL_CHESTS: 65,
  COUNTDOWN_SECONDS: 10
};

// Random reward pools per round ($HUNT)
const REWARD_POOLS = [25000, 50000, 75000];

// Token billboard on map (MCAP fetched live via DexScreener)
const TOKEN_BILLBOARD = {
  name: '$HUNT',
  ticker: 'HUNT / SOL',
  mcapFallback: '---',
  tagline: 'TREZO REWARD TOKEN'
};

// ─── Chest types ───────────────────────────────

const BOX_TYPES = {
  // Purple hidden reward chests — contain $HUNT from round pool
  REWARD_CHEST: {
    name: 'Reward Chest',
    color: '#9C27B0',
    trimColor: '#CE93D8',
    visibility: 'reward',
    tokenReward: 0,
    rarity: 'rare'
  },

  // Gold visible normal chests — NO $HUNT
  NORMAL_EMPTY: {
    name: 'Empty Chest',
    color: '#FFD700',
    trimColor: '#FFA000',
    visibility: 'normal',
    rarity: 'common'
  },
  NORMAL_ENERGY: {
    name: 'Energy Cache',
    color: '#FFD700',
    trimColor: '#FFA000',
    visibility: 'normal',
    rarity: 'common',
    energyRestore: 40
  },
  NORMAL_SPEED: {
    name: 'Speed Boost',
    color: '#FFD700',
    trimColor: '#FFA000',
    visibility: 'normal',
    rarity: 'uncommon',
    speedBoost: 15
  },
  NORMAL_TRACKING: {
    name: 'Tracking Boost',
    color: '#FFD700',
    trimColor: '#FFA000',
    visibility: 'normal',
    rarity: 'uncommon',
    trackingBoost: 3
  },
  NORMAL_LUCK: {
    name: 'Luck Boost',
    color: '#FFD700',
    trimColor: '#FFA000',
    visibility: 'normal',
    rarity: 'uncommon',
    luckBoost: 3
  },
  NORMAL_SKILL: {
    name: 'Skill Chest',
    color: '#FFD700',
    trimColor: '#FFA000',
    visibility: 'normal',
    rarity: 'rare',
    hasSkill: true
  },
  NORMAL_ITEM: {
    name: 'Item Chest',
    color: '#FFD700',
    trimColor: '#FFA000',
    visibility: 'normal',
    rarity: 'uncommon'
  }
};

const NORMAL_BOX_DISTRIBUTION = {
  NORMAL_EMPTY:    0.22,
  NORMAL_ENERGY:   0.20,
  NORMAL_SPEED:    0.15,
  NORMAL_TRACKING: 0.15,
  NORMAL_LUCK:     0.12,
  NORMAL_SKILL:    0.08,
  NORMAL_ITEM:     0.08
};

const SPECIAL_SKILLS = [
  { id: 'treasure_sense', name: 'Treasure Sense', description: '+50% detection radius for 60s' },
  { id: 'quick_hands', name: 'Quick Hands', description: 'Open chests 50% faster for 60s' },
  { id: 'lucky_streak', name: 'Lucky Streak', description: '+25% better rewards for 60s' },
  { id: 'phantom_step', name: 'Phantom Step', description: '+30% movement speed for 45s' },
  { id: 'gold_magnet', name: 'Gold Magnet', description: 'Auto-collect nearby points for 30s' }
];

const BUILDING_CONFIG = {
  storage: {
    name: 'Storage Room',
    baseCost: 500,
    capacityPerLevel: 1000,
    maxLevel: 10,
    description: 'Store points safely. Required to claim tokens.'
  },
  home: {
    name: "Hunter's Home",
    baseCost: 1000,
    capacityPerLevel: 0,
    maxLevel: 5,
    description: 'Your base of operations. Unlocks crafting.'
  }
};
