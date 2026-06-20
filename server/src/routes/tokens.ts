import { Router } from 'express';
import { sql } from '../db/client';

const router = Router();

// GET /api/tokens/pending/:walletAddress
router.get('/pending/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const users = await sql`SELECT id FROM users WHERE wallet_address = ${walletAddress}`;
    if (users.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const pendingTokens = await sql`
      SELECT * FROM pending_tokens 
      WHERE user_id = ${users[0].id} AND claimed = false
      ORDER BY created_at DESC
    `;

    const totalPending = pendingTokens.reduce((sum, t) => sum + t.amount, 0);

    return res.json({ pendingTokens, totalPending });
  } catch (error) {
    console.error('Get pending tokens error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tokens/add
router.post('/add', async (req, res) => {
  try {
    const { walletAddress, amount, source } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const users = await sql`SELECT id FROM users WHERE wallet_address = ${walletAddress}`;
    if (users.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const result = await sql`
      INSERT INTO pending_tokens (user_id, amount, source)
      VALUES (${users[0].id}, ${amount}, ${source || 'box'})
      RETURNING *
    `;

    return res.json({ success: true, pendingToken: result[0] });
  } catch (error) {
    console.error('Add token error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tokens/claim
router.post('/claim', async (req, res) => {
  try {
    const { walletAddress, claimAddress } = req.body;

    if (!claimAddress) {
      return res.status(400).json({ error: 'Claim address required' });
    }

    const users = await sql`SELECT id FROM users WHERE wallet_address = ${walletAddress}`;
    if (users.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Check for storage building
    const storages = await sql`
      SELECT * FROM buildings WHERE user_id = ${users[0].id} AND building_type = 'storage'
    `;
    if (storages.length === 0) {
      return res.status(400).json({ error: 'Need Storage building to claim tokens' });
    }

    const pendingTokens = await sql`
      SELECT * FROM pending_tokens 
      WHERE user_id = ${users[0].id} AND claimed = false
    `;

    if (pendingTokens.length === 0) {
      return res.status(400).json({ error: 'No tokens to claim' });
    }

    const totalAmount = pendingTokens.reduce((sum, t) => sum + t.amount, 0);

    // Mark all as claimed
    await sql`
      UPDATE pending_tokens 
      SET claimed = true, claimed_at = NOW(), claim_address = ${claimAddress}
      WHERE user_id = ${users[0].id} AND claimed = false
    `;

    return res.json({
      success: true,
      claimedAmount: totalAmount,
      claimedCount: pendingTokens.length,
      claimAddress,
      message: `${totalAmount} $HUNT will be sent to ${claimAddress.slice(0, 4)}...${claimAddress.slice(-4)}`
    });
  } catch (error) {
    console.error('Claim error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
