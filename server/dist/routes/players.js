"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../db/client");
const router = (0, express_1.Router)();
// GET /api/players/online - Get online count
router.get('/online', async (req, res) => {
    try {
        const result = await (0, client_1.sql) `
      SELECT COUNT(*) as count FROM users 
      WHERE last_seen > NOW() - INTERVAL '5 minutes'
    `;
        return res.json({ online: parseInt(result[0].count) || 0 });
    }
    catch (error) {
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
        await (0, client_1.sql) `
      UPDATE users SET last_seen = NOW() WHERE wallet_address = ${walletAddress}
    `;
        return res.json({ success: true });
    }
    catch (error) {
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
            result = await (0, client_1.sql) `
        UPDATE users SET points = points + ${points} 
        WHERE wallet_address = ${walletAddress}
        RETURNING points
      `;
        }
        else if (operation === 'subtract') {
            result = await (0, client_1.sql) `
        UPDATE users SET points = points - ${points} 
        WHERE wallet_address = ${walletAddress}
        RETURNING points
      `;
        }
        else {
            result = await (0, client_1.sql) `
        UPDATE users SET points = ${points} 
        WHERE wallet_address = ${walletAddress}
        RETURNING points
      `;
        }
        return res.json({ success: true, points: result[0]?.points || 0 });
    }
    catch (error) {
        console.error('Update points error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=players.js.map