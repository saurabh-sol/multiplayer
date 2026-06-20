import { Router } from 'express';
import { sql } from '../db/client';

const router = Router();

const BUILDING_CONFIG: Record<string, { baseCost: number; capacityPerLevel: number; maxLevel: number }> = {
  storage: { baseCost: 500, capacityPerLevel: 1000, maxLevel: 10 },
  home: { baseCost: 1000, capacityPerLevel: 0, maxLevel: 5 }
};

// GET /api/buildings/:walletAddress
router.get('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const users = await sql`SELECT id FROM users WHERE wallet_address = ${walletAddress}`;
    if (users.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const buildings = await sql`
      SELECT * FROM buildings WHERE user_id = ${users[0].id}
    `;

    return res.json({ buildings });
  } catch (error) {
    console.error('Get buildings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/buildings/build
router.post('/build', async (req, res) => {
  try {
    const { walletAddress, buildingType } = req.body;

    const config = BUILDING_CONFIG[buildingType];
    if (!config) {
      return res.status(400).json({ error: 'Invalid building type' });
    }

    const users = await sql`SELECT * FROM users WHERE wallet_address = ${walletAddress}`;
    if (users.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    const user = users[0];

    const existingBuildings = await sql`
      SELECT * FROM buildings WHERE user_id = ${user.id} AND building_type = ${buildingType}
    `;
    
    const currentLevel = existingBuildings.length > 0 ? existingBuildings[0].level : 0;
    const cost = config.baseCost * (currentLevel + 1);

    if (currentLevel >= config.maxLevel) {
      return res.status(400).json({ error: 'Building at max level' });
    }

    if (user.points < cost) {
      return res.status(400).json({ error: `Need ${cost} points, have ${user.points}` });
    }

    // Deduct points
    await sql`UPDATE users SET points = points - ${cost} WHERE id = ${user.id}`;

    // Create or upgrade building
    let building;
    if (existingBuildings.length > 0) {
      const result = await sql`
        UPDATE buildings SET level = level + 1 
        WHERE id = ${existingBuildings[0].id}
        RETURNING *
      `;
      building = result[0];
    } else {
      const result = await sql`
        INSERT INTO buildings (user_id, building_type, level)
        VALUES (${user.id}, ${buildingType}, 1)
        RETURNING *
      `;
      building = result[0];
    }

    return res.json({
      success: true,
      building,
      pointsSpent: cost,
      newPointsBalance: user.points - cost
    });
  } catch (error) {
    console.error('Build error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/buildings/storage/deposit
router.post('/storage/deposit', async (req, res) => {
  try {
    const { walletAddress, amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const users = await sql`SELECT * FROM users WHERE wallet_address = ${walletAddress}`;
    if (users.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    const user = users[0];

    const storages = await sql`
      SELECT * FROM buildings WHERE user_id = ${user.id} AND building_type = 'storage'
    `;
    if (storages.length === 0) {
      return res.status(400).json({ error: 'No storage building' });
    }
    const storage = storages[0];

    const maxCapacity = BUILDING_CONFIG.storage.capacityPerLevel * storage.level;
    const available = maxCapacity - storage.stored_points;

    if (amount > available) {
      return res.status(400).json({ error: `Only ${available} space available` });
    }
    if (user.points < amount) {
      return res.status(400).json({ error: 'Not enough points' });
    }

    await sql`UPDATE users SET points = points - ${amount} WHERE id = ${user.id}`;
    await sql`UPDATE buildings SET stored_points = stored_points + ${amount} WHERE id = ${storage.id}`;

    return res.json({
      success: true,
      deposited: amount,
      newStoredPoints: storage.stored_points + amount,
      newUserPoints: user.points - amount
    });
  } catch (error) {
    console.error('Deposit error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/buildings/storage/withdraw
router.post('/storage/withdraw', async (req, res) => {
  try {
    const { walletAddress, amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const users = await sql`SELECT * FROM users WHERE wallet_address = ${walletAddress}`;
    if (users.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    const user = users[0];

    const storages = await sql`
      SELECT * FROM buildings WHERE user_id = ${user.id} AND building_type = 'storage'
    `;
    if (storages.length === 0) {
      return res.status(400).json({ error: 'No storage building' });
    }
    const storage = storages[0];

    if (storage.stored_points < amount) {
      return res.status(400).json({ error: `Only ${storage.stored_points} stored` });
    }

    await sql`UPDATE users SET points = points + ${amount} WHERE id = ${user.id}`;
    await sql`UPDATE buildings SET stored_points = stored_points - ${amount} WHERE id = ${storage.id}`;

    return res.json({
      success: true,
      withdrawn: amount,
      newStoredPoints: storage.stored_points - amount,
      newUserPoints: user.points + amount
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
