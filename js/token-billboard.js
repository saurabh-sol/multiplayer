/* ============================================
   TREZO — TokenBillboardService
   Loads contract from server .env, MCAP from DexScreener
   ============================================ */

class TokenBillboardService {
  constructor() {
    this.contractAddress = '';
    this.chainId = 'solana';
    this.name = TOKEN_BILLBOARD.name;
    this.ticker = TOKEN_BILLBOARD.ticker;
    this.tagline = TOKEN_BILLBOARD.tagline;
    this.mcap = TOKEN_BILLBOARD.mcapFallback;
    this.priceUsd = null;
    this.lastUpdated = null;
    this._refreshTimer = null;
    this._ready = false;
  }

  async init() {
    await this.loadConfig();
    await this.refreshMarketCap();
    this._refreshTimer = setInterval(() => this.refreshMarketCap(), 60000);
    this._ready = true;
    return this;
  }

  destroy() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this._refreshTimer = null;
  }

  async loadConfig() {
    try {
      const response = await fetch(`${API_BASE_URL}/config`);
      if (!response.ok) throw new Error('Config request failed');

      const data = await response.json();
      this.contractAddress = data.contractAddress || '';
      this.chainId = data.chainId || 'solana';
      if (data.tokenName) this.name = data.tokenName;
      if (data.tokenTicker) this.ticker = data.tokenTicker;
    } catch (error) {
      console.warn('Failed to load token config from server:', error);
    }
  }

  async refreshMarketCap() {
    if (!this.contractAddress) {
      await this.loadConfig();
    }
    if (!this.contractAddress) return;

    const updated = await this._fetchFromDexScreenerDirect()
      || await this._fetchFromServerProxy();

    if (updated) {
      this.lastUpdated = Date.now();
    }
  }

  async _fetchFromDexScreenerDirect() {
    const urls = [
      `https://api.dexscreener.com/token-pairs/v1/${this.chainId}/${this.contractAddress}`,
      `https://api.dexscreener.com/latest/dex/tokens/${this.contractAddress}`
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const data = await response.json();
        const pairs = Array.isArray(data) ? data : (data.pairs || []);
        const pair = this._pickBestPair(pairs);
        if (!pair) continue;

        const marketCap = pair.marketCap ?? pair.fdv ?? null;
        if (marketCap != null) {
          this.mcap = this._formatMcap(marketCap);
          this.priceUsd = pair.priceUsd ?? null;
          if (pair.baseToken?.symbol) {
            this.ticker = `${pair.baseToken.symbol} / SOL`;
          }
          return true;
        }
      } catch (error) {
        console.warn('DexScreener direct fetch failed:', error);
      }
    }

    return false;
  }

  async _fetchFromServerProxy() {
    try {
      const response = await fetch(`${API_BASE_URL}/config/market`);
      if (!response.ok) return false;

      const data = await response.json();
      if (data.marketCapFormatted) {
        this.mcap = data.marketCapFormatted;
        this.priceUsd = data.priceUsd ?? null;
        if (data.tokenTicker) this.ticker = data.tokenTicker;
        else if (data.symbol) this.ticker = `${data.symbol} / SOL`;
        return true;
      }
    } catch (error) {
      console.warn('Server market proxy failed:', error);
    }

    return false;
  }

  _pickBestPair(pairs) {
    if (!pairs.length) return null;
    return pairs.reduce((best, pair) => {
      const bestLiq = best?.liquidity?.usd ?? 0;
      const pairLiq = pair?.liquidity?.usd ?? 0;
      return pairLiq > bestLiq ? pair : best;
    });
  }

  _formatMcap(value) {
    if (value == null || Number.isNaN(value)) return TOKEN_BILLBOARD.mcapFallback;
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${Math.round(value)}`;
  }

  getDisplay() {
    return {
      name: this.name,
      ticker: this.ticker,
      tagline: this.tagline,
      mcap: this.mcap,
      contractAddress: this.contractAddress
    };
  }

  isReady() {
    return this._ready;
  }
}

window.TokenBillboardService = TokenBillboardService;
