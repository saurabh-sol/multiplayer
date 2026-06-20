import { Router } from 'express';
import { sql } from '../db/client';

const router = Router();

// GET /api/players/online - Get online count
router.get('/online', async (req, res) => {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM users 
      WHERE last_seen > NOW() - INTERVAL '5 minutes'
    `;
    return res.json({ online: parseInt(result[0].count) || 0 });
  } catch (error) {
    console.error('Online count error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/players/heartbeat
router.post('/heartbeat', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    await sql`
      UPDATE users SET last_seen = NOW() WHERE wallet_address = ${walletAddress}
    `;

    return res.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/players/update-points
router.post('/update-points', async (req, res) => {
  try {
    const { walletAddress, points, operation } = req.body;

    if (!walletAddress || points === undefined) {
      return res.status(400).json({ error: 'Wallet address and points required' });
    }

    let result;
    if (operation === 'add') {
      result = await sql`
        UPDATE users SET points = points + ${points} 
        WHERE wallet_address = ${walletAddress}
        RETURNING points
      `;
    } else if (operation === 'subtract') {
      result = await sql`
        UPDATE users SET points = points - ${points} 
        WHERE wallet_address = ${walletAddress}
        RETURNING points
      `;
    } else {
      result = await sql`
        UPDATE users SET points = ${points} 
        WHERE wallet_address = ${walletAddress}
        RETURNING points
      `;
    }

    return res.json({ success: true, points: result[0]?.points || 0 });
  } catch (error) {
    console.error('Update points error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
