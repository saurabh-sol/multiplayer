"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../db/client");
const router = (0, express_1.Router)();
// POST /api/auth/login - Check if user exists
router.post('/login', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }
        const users = await (0, client_1.sql) `
      SELECT * FROM users WHERE wallet_address = ${walletAddress}
    `;
        if (users.length === 0) {
            return res.json({ exists: false, user: null });
        }
        const user = users[0];
        // Update last_seen
        await (0, client_1.sql) `UPDATE users SET last_seen = NOW() WHERE id = ${user.id}`;
        // Get inventory
        const inventory = await (0, client_1.sql) `
      SELECT * FROM inventory_items WHERE user_id = ${user.id}
    `;
        // Get buildings
        const buildings = await (0, client_1.sql) `
      SELECT * FROM buildings WHERE user_id = ${user.id}
    `;
        // Get pending tokens
        const pendingTokens = await (0, client_1.sql) `
      SELECT * FROM pending_tokens WHERE user_id = ${user.id} AND claimed = false
    `;
        return res.json({
            exists: true,
            user: { ...user, inventory, buildings, pendingTokens }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/auth/register - Register new user
router.post('/register', async (req, res) => {
    try {
        const { walletAddress, username } = req.body;
        if (!walletAddress || !username) {
            return res.status(400).json({ error: 'Wallet address and username required' });
        }
        // Validate username
        if (username.length < 3 || username.length > 16) {
            return res.status(400).json({ error: 'Username must be 3-16 characters' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({ error: 'Only letters, numbers, underscores allowed' });
        }
        // Check if wallet exists
        const existingWallet = await (0, client_1.sql) `
      SELECT id FROM users WHERE wallet_address = ${walletAddress}
    `;
        if (existingWallet.length > 0) {
            return res.status(400).json({ error: 'Wallet already registered' });
        }
        // Check if username taken
        const existingUsername = await (0, client_1.sql) `
      SELECT id FROM users WHERE username = ${username}
    `;
        if (existingUsername.length > 0) {
            return res.status(400).json({ error: 'Username already taken' });
        }
        // Create user
        const newUsers = await (0, client_1.sql) `
      INSERT INTO users (wallet_address, username, points)
      VALUES (${walletAddress}, ${username}, 0)
      RETURNING *
    `;
        const user = newUsers[0];
        // Create starter inventory
        await (0, client_1.sql) `
      INSERT INTO inventory_items (user_id, item_type, quantity)
      VALUES 
        (${user.id}, 'compass', 2),
        (${user.id}, 'potion', 1),
        (${user.id}, 'boots', 1)
    `;
        const inventory = await (0, client_1.sql) `
      SELECT * FROM inventory_items WHERE user_id = ${user.id}
    `;
        return res.json({
            success: true,
            user: { ...user, inventory, buildings: [], pendingTokens: [] }
        });
    }
    catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/auth/check-username
router.post('/check-username', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username || username.length < 3 || username.length > 16) {
            return res.json({ available: false, error: 'Invalid username length' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.json({ available: false, error: 'Invalid characters' });
        }
        const existing = await (0, client_1.sql) `
      SELECT id FROM users WHERE username = ${username}
    `;
        return res.json({ available: existing.length === 0 });
    }
    catch (error) {
        console.error('Check username error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map