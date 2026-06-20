import { Router } from 'express';
import { sql } from '../db/client';
import { upsertPresence, removePresence, getActivePlayers, getOnlineCount } from '../presence';

const router = Router();

// GET /api/players/online - Get online count
router.get('/online', async (req, res) => {
  try {
    const dbCount = await sql`
      SELECT COUNT(*) as count FROM users 
      WHERE last_seen > NOW() - INTERVAL '5 minutes'
    `;
    const presenceCount = getOnlineCount();
    const count = Math.max(parseInt(dbCount[0].count) || 0, presenceCount);
    return res.json({ online: count });
  } catch (error) {
    console.error('Online count error:', error);
    return res.json({ online: getOnlineCount() });
  }
});

// POST /api/players/presence - Update player position/state
router.post('/presence', async (req, res) => {
  try {
    const {
      sessionId, name, walletAddress, isGuest,
      x, y, direction, roundNumber, roundState, color, boxesOpened
    } = req.body;

    if (!sessionId || !name) {
      return res.status(400).json({ error: 'sessionId and name required' });
    }

    upsertPresence({
      sessionId,
      name,
      walletAddress: walletAddress || null,
      isGuest: !!isGuest,
      x: x || 0,
      y: y || 0,
      direction: direction || 'down',
      roundNumber: roundNumber || 1,
      roundState: roundState || 'WAITING',
      color: color || '#3498db',
      boxesOpened: boxesOpened || 0
    });

    if (walletAddress && !isGuest) {
      await sql`
        UPDATE users SET last_seen = NOW() WHERE wallet_address = ${walletAddress}
      `.catch(() => {});
    }

    return res.json({ success: true, count: getOnlineCount() });
  } catch (error) {
    console.error('Presence update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/players/presence - Get active players
router.get('/presence', (req, res) => {
  try {
    const excludeSessionId = req.query.sessionId as string | undefined;
    const players = getActivePlayers(excludeSessionId);
    const allPlayers = getActivePlayers();

    return res.json({
      count: allPlayers.length,
      players,
      allPlayers
    });
  } catch (error) {
    console.error('Presence fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/players/presence/leave - Remove player from presence
router.post('/presence/leave', (req, res) => {
  try {
    const { sessionId } = req.body;
    if (sessionId) removePresence(sessionId);
    return res.json({ success: true });
  } catch (error) {
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
