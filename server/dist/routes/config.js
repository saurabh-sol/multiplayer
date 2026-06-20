"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
function getTokenConfig() {
    return {
        contractAddress: process.env.HUNT_CONTRACT_ADDRESS?.trim() || '',
        chainId: process.env.HUNT_CHAIN_ID?.trim() || 'solana',
        tokenName: process.env.HUNT_TOKEN_NAME?.trim() || '$HUNT',
        tokenSymbol: process.env.HUNT_TOKEN_SYMBOL?.trim() || 'HUNT',
        tokenTicker: process.env.HUNT_TOKEN_TICKER?.trim() || 'HUNT / SOL'
    };
}
function formatMcap(value) {
    if (value == null || Number.isNaN(value))
        return null;
    if (value >= 1_000_000_000)
        return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000)
        return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000)
        return `$${(value / 1_000).toFixed(1)}K`;
    return `$${Math.round(value)}`;
}
function pickBestPair(pairs) {
    if (!pairs.length)
        return null;
    return pairs.reduce((best, pair) => {
        const bestLiq = best?.liquidity?.usd ?? 0;
        const pairLiq = pair?.liquidity?.usd ?? 0;
        return pairLiq > bestLiq ? pair : best;
    });
}
async function fetchDexScreenerMarket(contractAddress, chainId) {
    const urls = [
        `https://api.dexscreener.com/token-pairs/v1/${chainId}/${contractAddress}`,
        `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`
    ];
    for (const url of urls) {
        const response = await fetch(url);
        if (!response.ok)
            continue;
        const data = await response.json();
        const pairs = Array.isArray(data) ? data : (data.pairs || []);
        const pair = pickBestPair(pairs);
        if (!pair)
            continue;
        const marketCap = pair.marketCap ?? pair.fdv ?? null;
        return {
            marketCap,
            marketCapFormatted: formatMcap(marketCap),
            priceUsd: pair.priceUsd ?? null,
            symbol: pair.baseToken?.symbol || null,
            pairAddress: pair.pairAddress || null,
            source: 'dexscreener'
        };
    }
    return null;
}
// GET /api/config — token contract + display info from .env
router.get('/', (_req, res) => {
    const config = getTokenConfig();
    res.json({
        ...config,
        dexscreenerUrl: config.contractAddress
            ? `https://dexscreener.com/${config.chainId}/${config.contractAddress}`
            : null
    });
});
// GET /api/config/market — live MCAP via DexScreener (uses contract from .env)
router.get('/market', async (_req, res) => {
    const config = getTokenConfig();
    if (!config.contractAddress) {
        return res.status(503).json({ error: 'HUNT_CONTRACT_ADDRESS is not configured in .env' });
    }
    try {
        const market = await fetchDexScreenerMarket(config.contractAddress, config.chainId);
        if (!market) {
            return res.status(404).json({
                error: 'No DexScreener market data found for this contract',
                contractAddress: config.contractAddress,
                chainId: config.chainId
            });
        }
        return res.json({
            ...config,
            ...market,
            updatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('DexScreener fetch error:', error);
        return res.status(502).json({ error: 'Failed to fetch market data from DexScreener' });
    }
});
exports.default = router;
//# sourceMappingURL=config.js.map