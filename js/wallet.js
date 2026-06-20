/* ============================================
   SOLANA TREASURE HUNT — WalletManager
   Real Solana wallet integration with backend auth
   ============================================ */

class WalletManager {
  constructor() {
    this.connected = false;
    this.address = null;
    this.publicKey = null;
    this.isGuest = false;
    this.walletName = null;
    this.provider = null;
    this.claimedRewards = new Map();
    this.totalClaimed = 0;
    
    // User data from backend
    this.user = null;
    this.username = null;
  }

  /* ─── API Client ─────────────────────────── */

  async api(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return { error: 'Network error' };
    }
  }

  async apiLogin(walletAddress) {
    return this.api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ walletAddress })
    });
  }

  async apiRegister(walletAddress, username) {
    return this.api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, username })
    });
  }

  async apiCheckUsername(username) {
    return this.api('/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
  }

  async apiHeartbeat() {
    if (!this.address) return;
    return this.api('/players/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ walletAddress: this.address })
    });
  }

  async apiGetOnlineCount() {
    return this.api('/players/online');
  }

  /* ─── Wallet Detection ─────────────────────── */

  getAvailableWallets() {
    const wallets = [];

    if (window.phantom?.solana?.isPhantom) {
      wallets.push({
        name: 'Phantom',
        icon: '👻',
        provider: window.phantom.solana,
        installed: true
      });
    } else {
      wallets.push({
        name: 'Phantom',
        icon: '👻',
        provider: null,
        installed: false,
        downloadUrl: 'https://phantom.app/'
      });
    }

    if (window.solflare?.isSolflare) {
      wallets.push({
        name: 'Solflare',
        icon: '☀️',
        provider: window.solflare,
        installed: true
      });
    } else {
      wallets.push({
        name: 'Solflare',
        icon: '☀️',
        provider: null,
        installed: false,
        downloadUrl: 'https://solflare.com/'
      });
    }

    if (window.solana && !window.solana.isPhantom) {
      wallets.push({
        name: 'Solana Wallet',
        icon: '💎',
        provider: window.solana,
        installed: true
      });
    }

    return wallets;
  }

  /* ─── Connect Flow ─────────────────────────── */

  connect() {
    return new Promise((resolve) => {
      const wallets = this.getAvailableWallets();

      const overlay = document.createElement('div');
      overlay.className = 'wallet-modal-overlay';
      overlay.id = 'wallet-connect-overlay';

      const walletOptionsHTML = wallets.map((w, idx) => `
        <div class="wallet-option ${w.installed ? '' : 'wallet-not-installed'}" data-wallet-idx="${idx}">
          <div class="wallet-option-icon">${w.icon}</div>
          <div class="wallet-option-info">
            <h4>${w.name}</h4>
            <p>${w.installed ? 'Click to connect' : 'Not installed'}</p>
          </div>
          ${w.installed ? '<span class="wallet-status-dot connected"></span>' : '<span class="wallet-install-link">Install →</span>'}
        </div>
      `).join('');

      overlay.innerHTML = `
        <div class="wallet-modal">
          <div class="wallet-modal-header">
            <h3>Connect Solana Wallet</h3>
            <p class="wallet-modal-subtitle">Sign in to claim $HUNT rewards</p>
          </div>
          <div class="wallet-options">
            ${walletOptionsHTML}
          </div>
          <div class="wallet-modal-footer">
            <p class="wallet-security-note">🔒 You'll be asked to sign a message to verify ownership</p>
          </div>
          <button class="wallet-modal-close" id="wallet-modal-close-btn">Cancel</button>
        </div>
      `;

      document.body.appendChild(overlay);

      const closeModal = () => {
        const el = document.getElementById('wallet-connect-overlay');
        if (el) document.body.removeChild(el);
        resolve(false);
      };

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });

      document.getElementById('wallet-modal-close-btn').addEventListener('click', closeModal);

      overlay.querySelectorAll('.wallet-option').forEach((el) => {
        el.addEventListener('click', async () => {
          const idx = parseInt(el.dataset.walletIdx);
          const wallet = wallets[idx];

          if (window.gameInstance?.audio) window.gameInstance.audio.playClick();

          if (!wallet.installed) {
            window.open(wallet.downloadUrl, '_blank');
            return;
          }

          try {
            el.classList.add('wallet-connecting');
            el.querySelector('.wallet-option-info p').textContent = 'Connecting...';

            const result = await this._connectToWallet(wallet);

            if (result.success) {
              const modalEl = document.getElementById('wallet-connect-overlay');
              if (modalEl) document.body.removeChild(modalEl);

              // Check if user exists in backend
              const loginResult = await this.apiLogin(this.address);
              
              if (loginResult.exists && loginResult.user) {
                // Existing user - load their data
                this.user = loginResult.user;
                this.username = loginResult.user.username;
                if (window.gameInstance?.ui) {
                  window.gameInstance.ui.showNotification(`Welcome back, ${this.username}!`, "success");
                }
                resolve(true);
              } else {
                // New user - show username modal
                const usernameResult = await this._showUsernameModal();
                if (usernameResult.success) {
                  resolve(true);
                } else {
                  // User cancelled - disconnect
                  await this.disconnect();
                  resolve(false);
                }
              }
            } else {
              el.classList.remove('wallet-connecting');
              el.querySelector('.wallet-option-info p').textContent = result.error || 'Connection failed';
              setTimeout(() => {
                el.querySelector('.wallet-option-info p').textContent = 'Click to connect';
              }, 2000);
            }
          } catch (err) {
            console.error('Wallet connection error:', err);
            el.classList.remove('wallet-connecting');
            el.querySelector('.wallet-option-info p').textContent = 'Error - try again';
            setTimeout(() => {
              el.querySelector('.wallet-option-info p').textContent = 'Click to connect';
            }, 2000);
          }
        });
      });
    });
  }

  _showUsernameModal() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'wallet-modal-overlay';
      overlay.id = 'username-modal-overlay';

      overlay.innerHTML = `
        <div class="wallet-modal">
          <div class="wallet-modal-header">
            <h3>Choose Your Hunter Name</h3>
            <p class="wallet-modal-subtitle">This name will be visible to other players</p>
          </div>
          <div class="username-input-container">
            <input 
              type="text" 
              id="username-input" 
              placeholder="Enter username (3-16 characters)" 
              maxlength="16"
              autocomplete="off"
            />
            <p id="username-error" class="username-error"></p>
            <p id="username-hint" class="username-hint">Letters, numbers, and underscores only</p>
          </div>
          <div class="wallet-modal-actions">
            <button class="btn btn-secondary" id="username-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="username-submit-btn" disabled>Start Hunting</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = document.getElementById('username-input');
      const errorEl = document.getElementById('username-error');
      const submitBtn = document.getElementById('username-submit-btn');
      const cancelBtn = document.getElementById('username-cancel-btn');

      let checkTimeout = null;

      const validateUsername = async (username) => {
        errorEl.textContent = '';
        submitBtn.disabled = true;

        if (!username || username.length < 3) {
          errorEl.textContent = 'Username must be at least 3 characters';
          return false;
        }

        if (username.length > 16) {
          errorEl.textContent = 'Username must be 16 characters or less';
          return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          errorEl.textContent = 'Only letters, numbers, and underscores allowed';
          return false;
        }

        // Check availability via API
        errorEl.textContent = 'Checking availability...';
        const result = await this.apiCheckUsername(username);
        
        if (result.error) {
          errorEl.textContent = 'Could not verify username';
          return false;
        }

        if (!result.available) {
          errorEl.textContent = result.error || 'Username already taken';
          return false;
        }

        errorEl.textContent = '';
        errorEl.style.color = '#4ade80';
        errorEl.textContent = '✓ Username available';
        submitBtn.disabled = false;
        return true;
      };

      input.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        errorEl.style.color = '';
        
        if (checkTimeout) clearTimeout(checkTimeout);
        
        if (value.length >= 3) {
          checkTimeout = setTimeout(() => validateUsername(value), 500);
        } else {
          submitBtn.disabled = true;
          if (value.length > 0) {
            errorEl.textContent = 'Username must be at least 3 characters';
          }
        }
      });

      const closeModal = () => {
        const el = document.getElementById('username-modal-overlay');
        if (el) document.body.removeChild(el);
      };

      cancelBtn.addEventListener('click', () => {
        if (window.gameInstance?.audio) window.gameInstance.audio.playClick();
        closeModal();
        resolve({ success: false });
      });

      submitBtn.addEventListener('click', async () => {
        if (window.gameInstance?.audio) window.gameInstance.audio.playClick();
        
        const username = input.value.trim();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';

        const result = await this.apiRegister(this.address, username);

        if (result.error) {
          errorEl.style.color = '';
          errorEl.textContent = result.error;
          submitBtn.disabled = false;
          submitBtn.textContent = 'Start Hunting';
          return;
        }

        if (result.success && result.user) {
          this.user = result.user;
          this.username = result.user.username;
          
          if (window.gameInstance?.ui) {
            window.gameInstance.ui.showNotification(`Welcome, ${this.username}! Let the hunt begin!`, "success");
          }
          
          closeModal();
          resolve({ success: true });
        } else {
          errorEl.textContent = 'Registration failed. Please try again.';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Start Hunting';
        }
      });

      // Focus input
      setTimeout(() => input.focus(), 100);
    });
  }

  async _connectToWallet(wallet) {
    try {
      const provider = wallet.provider;
      const resp = await provider.connect();
      const publicKey = resp.publicKey || provider.publicKey;

      if (!publicKey) {
        return { success: false, error: 'No public key returned' };
      }

      const signResult = await this._requestSignature(provider, publicKey);

      if (!signResult.success) {
        try { await provider.disconnect(); } catch (_) {}
        return { success: false, error: signResult.error };
      }

      this.connected = true;
      this.publicKey = publicKey;
      this.address = publicKey.toString();
      this.walletName = wallet.name;
      this.provider = provider;
      this.isGuest = false;

      provider.on?.('disconnect', () => this._handleDisconnect());
      provider.on?.('accountChanged', (newPublicKey) => {
        if (newPublicKey) {
          this.publicKey = newPublicKey;
          this.address = newPublicKey.toString();
          if (window.gameInstance?.ui) {
            window.gameInstance.ui.showNotification('Wallet account changed', 'info');
          }
        } else {
          this._handleDisconnect();
        }
      });

      return { success: true };

    } catch (err) {
      console.error('Wallet connect error:', err);
      if (err.code === 4001 || err.message?.includes('rejected')) {
        return { success: false, error: 'Connection rejected' };
      }
      return { success: false, error: err.message || 'Connection failed' };
    }
  }

  async _requestSignature(provider, publicKey) {
    try {
      const message = this._createSignInMessage(publicKey.toString());
      const encodedMessage = new TextEncoder().encode(message);
      const { signature } = await provider.signMessage(encodedMessage, 'utf8');

      if (signature) {
        return { success: true, signature };
      }
      return { success: false, error: 'No signature returned' };

    } catch (err) {
      console.error('Signature error:', err);
      if (err.code === 4001 || err.message?.includes('rejected') || err.message?.includes('cancelled')) {
        return { success: false, error: 'Signature rejected' };
      }
      return { success: false, error: 'Signature failed' };
    }
  }

  _createSignInMessage(address) {
    const timestamp = new Date().toISOString();
    const nonce = Math.random().toString(36).substring(2, 10);

    return `Solana Treasure Hunt Sign-In

Welcome, Hunter!

This signature verifies you own this wallet and authorizes your session to claim $HUNT token rewards.

Wallet: ${address.slice(0, 8)}...${address.slice(-8)}
Timestamp: ${timestamp}
Nonce: ${nonce}

This request will not trigger any blockchain transaction or cost any SOL.`;
  }

  /* ─── Disconnect ───────────────────────────── */

  async disconnect() {
    if (this.provider) {
      try { await this.provider.disconnect(); } catch (_) {}
    }
    this._handleDisconnect();
  }

  _handleDisconnect() {
    this.connected = false;
    this.address = null;
    this.publicKey = null;
    this.walletName = null;
    this.provider = null;
    this.isGuest = false;
    this.totalClaimed = 0;
    this.claimedRewards.clear();
    this.user = null;
    this.username = null;

    if (window.gameInstance?.ui) {
      window.gameInstance.ui.showNotification('Wallet disconnected', 'info');
    }
  }

  showDisconnectModal() {
    if (!this.connected) return;

    const overlay = document.createElement('div');
    overlay.className = 'wallet-modal-overlay';
    overlay.id = 'wallet-disconnect-overlay';

    overlay.innerHTML = `
      <div class="wallet-modal wallet-modal-small">
        <div class="wallet-modal-header">
          <h3>${this.username || 'Wallet Connected'}</h3>
        </div>
        <div class="wallet-connected-info">
          <div class="wallet-connected-icon">${this.walletName === 'Phantom' ? '👻' : this.walletName === 'Solflare' ? '☀️' : '💎'}</div>
          <div class="wallet-connected-details">
            <p class="wallet-connected-name">${this.walletName}</p>
            <p class="wallet-connected-address">${this.getDisplayAddress()}</p>
          </div>
        </div>
        <div class="wallet-stats">
          <div class="wallet-stat-row">
            <span>Points</span>
            <span class="text-emerald">${(this.user?.points || 0).toLocaleString()}</span>
          </div>
          <div class="wallet-stat-row">
            <span>Pending Tokens</span>
            <span class="text-gold">${(this.user?.pendingTokens?.reduce((a, t) => a + (t.claimed ? 0 : t.amount), 0) || 0).toLocaleString()} $HUNT</span>
          </div>
        </div>
        <div class="wallet-modal-actions">
          <button class="btn btn-secondary" id="wallet-disconnect-btn">Disconnect</button>
          <button class="btn btn-primary" id="wallet-close-btn">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => {
      const el = document.getElementById('wallet-disconnect-overlay');
      if (el) document.body.removeChild(el);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    document.getElementById('wallet-close-btn').addEventListener('click', () => {
      if (window.gameInstance?.audio) window.gameInstance.audio.playClick();
      closeModal();
    });

    document.getElementById('wallet-disconnect-btn').addEventListener('click', async () => {
      if (window.gameInstance?.audio) window.gameInstance.audio.playClick();
      await this.disconnect();
      closeModal();
      if (window.gameInstance) window.gameInstance.leaveGame();
    });
  }

  /* ─── Status & Helpers ─────────────────────── */

  isConnected() { return this.connected; }
  
  getDisplayAddress() {
    if (!this.connected || !this.address) return 'Not Connected';
    return `${this.address.slice(0, 4)}...${this.address.slice(-4)}`;
  }
  
  getFullAddress() { return this.address; }
  getUsername() { return this.username || this.getDisplayAddress(); }
  
  canClaimRewards() { return this.connected && !this.isGuest; }

  claimReward(boxId, amount) {
    if (!this.canClaimRewards()) {
      return { success: false, message: 'Must connect Solana wallet' };
    }
    if (this.claimedRewards.has(boxId)) {
      return { success: false, message: 'Reward already claimed' };
    }
    this.claimedRewards.set(boxId, { amount, status: 'claimed', timestamp: Date.now() });
    this.totalClaimed += amount;
    return { success: true, message: 'Reward claimed successfully!' };
  }

  getTotalClaimed() { return this.totalClaimed; }

  setGuest() {
    this.connected = false;
    this.address = null;
    this.publicKey = null;
    this.walletName = null;
    this.provider = null;
    this.isGuest = true;
    this.totalClaimed = 0;
    this.claimedRewards.clear();
    this.user = null;
    this.username = 'Guest';
  }
}

window.WalletManager = WalletManager;
