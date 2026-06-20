/* ============================================
   SOLANA TREASURE HUNT — BuildingsManager
   Handles storage, crafting, and token claiming
   ============================================ */

class BuildingsManager {
  constructor(wallet) {
    this.wallet = wallet;
    this.buildings = [];
    this.isModalOpen = false;
  }

  async fetchBuildings() {
    if (!this.wallet || !this.wallet.address) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/buildings/${this.wallet.address}`);
      if (response.ok) {
        const data = await response.json();
        this.buildings = data.buildings || [];
      }
    } catch (error) {
      console.warn('Failed to fetch buildings:', error);
    }
  }

  getBuilding(type) {
    return this.buildings.find(b => b.buildingType === type);
  }

  hasStorage() {
    return this.buildings.some(b => b.buildingType === 'storage');
  }

  getStorageCapacity() {
    const storage = this.getBuilding('storage');
    if (!storage) return 0;
    return (BUILDING_CONFIG?.storage?.capacityPerLevel || 1000) * storage.level;
  }

  getStoredPoints() {
    const storage = this.getBuilding('storage');
    return storage?.storedPoints || 0;
  }

  async buildOrUpgrade(buildingType) {
    if (!this.wallet || !this.wallet.address) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/buildings/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: this.wallet.address,
          buildingType
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await this.fetchBuildings();
        if (this.wallet.user) {
          this.wallet.user.points = data.newPointsBalance;
        }
      }
      
      return data;
    } catch (error) {
      console.error('Build error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async depositPoints(amount) {
    if (!this.wallet || !this.wallet.address) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/buildings/storage/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: this.wallet.address,
          amount
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await this.fetchBuildings();
        if (this.wallet.user) {
          this.wallet.user.points = data.newUserPoints;
        }
      }
      
      return data;
    } catch (error) {
      console.error('Deposit error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async withdrawPoints(amount) {
    if (!this.wallet || !this.wallet.address) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/buildings/storage/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: this.wallet.address,
          amount
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await this.fetchBuildings();
        if (this.wallet.user) {
          this.wallet.user.points = data.newUserPoints;
        }
      }
      
      return data;
    } catch (error) {
      console.error('Withdraw error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async claimTokens(claimAddress) {
    if (!this.wallet || !this.wallet.address) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tokens/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: this.wallet.address,
          claimAddress: claimAddress || this.wallet.address
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Claim error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async getPendingTokens() {
    if (!this.wallet || !this.wallet.address) return { pendingTokens: [], totalPending: 0 };

    try {
      const response = await fetch(`${API_BASE_URL}/tokens/pending/${this.wallet.address}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to fetch pending tokens:', error);
    }
    return { pendingTokens: [], totalPending: 0 };
  }

  async _refreshUserData() {
    if (!this.wallet || !this.wallet.address) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: this.wallet.address })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.exists && data.user) {
          this.wallet.user = data.user;
        }
      }
    } catch (error) {
      console.warn('Failed to refresh user data:', error);
    }
  }

  async showProfileModal() {
    if (this.isModalOpen) return;
    this.isModalOpen = true;

    // Refresh data from backend
    await this.fetchBuildings();
    await this._refreshUserData();

    const overlay = document.createElement('div');
    overlay.className = 'wallet-modal-overlay';
    overlay.id = 'profile-modal-overlay';

    const storage = this.getBuilding('storage');
    const home = this.getBuilding('home');
    const userPoints = this.wallet.user?.points || 0;
    
    // Get pending tokens from backend
    const tokenData = await this.getPendingTokens();
    const pendingTokens = tokenData.totalPending || 0;

    overlay.innerHTML = `
      <div class="wallet-modal profile-modal">
        <div class="wallet-modal-header">
          <h3>${this.wallet.username || 'Hunter Profile'}</h3>
          <p class="wallet-modal-subtitle">${this.wallet.getDisplayAddress()}</p>
        </div>
        
        <div class="profile-stats">
          <div class="profile-stat">
            <span class="profile-stat-value text-emerald">${userPoints.toLocaleString()}</span>
            <span class="profile-stat-label">Points</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat-value text-gold">${pendingTokens.toLocaleString()}</span>
            <span class="profile-stat-label">Pending $HUNT</span>
          </div>
        </div>

        <div class="profile-section">
          <h4>🏠 Buildings</h4>
          
          <div class="building-card ${storage ? 'built' : ''}">
            <div class="building-icon">🏪</div>
            <div class="building-info">
              <h5>Storage Room ${storage ? `(Lvl ${storage.level})` : ''}</h5>
              <p>${storage 
                ? `${storage.storedPoints.toLocaleString()} / ${this.getStorageCapacity().toLocaleString()} points stored`
                : 'Store points safely. Required to claim tokens.'
              }</p>
            </div>
            <button class="btn btn-small ${storage ? 'btn-secondary' : 'btn-primary'}" id="btn-storage">
              ${storage ? (storage.level < 10 ? `Upgrade (${500 * (storage.level + 1)} pts)` : 'Max Level') : 'Build (500 pts)'}
            </button>
          </div>

          ${storage ? `
          <div class="storage-actions">
            <div class="storage-action-row">
              <input type="number" id="storage-amount" placeholder="Amount" min="1" max="${Math.max(userPoints, storage.storedPoints)}"/>
              <button class="btn btn-small btn-secondary" id="btn-deposit">Deposit</button>
              <button class="btn btn-small btn-secondary" id="btn-withdraw">Withdraw</button>
            </div>
          </div>
          ` : ''}

          <div class="building-card ${home ? 'built' : ''}">
            <div class="building-icon">🏠</div>
            <div class="building-info">
              <h5>Hunter's Home ${home ? `(Lvl ${home.level})` : ''}</h5>
              <p>${home ? 'Your base of operations.' : 'Unlock crafting and upgrades.'}</p>
            </div>
            <button class="btn btn-small ${home ? 'btn-secondary' : 'btn-primary'}" id="btn-home">
              ${home ? (home.level < 5 ? `Upgrade (${1000 * (home.level + 1)} pts)` : 'Max Level') : 'Build (1000 pts)'}
            </button>
          </div>
        </div>

        ${pendingTokens > 0 && storage ? `
        <div class="profile-section">
          <h4>💰 Claim Tokens</h4>
          <p class="claim-info">You have <strong>${pendingTokens.toLocaleString()} $HUNT</strong> ready to claim.</p>
          <div class="claim-row">
            <input type="text" id="claim-address" placeholder="Destination wallet (leave empty for current)" value="${this.wallet.address}"/>
            <button class="btn btn-primary" id="btn-claim">Claim All</button>
          </div>
        </div>
        ` : ''}

        ${pendingTokens > 0 && !storage ? `
        <div class="profile-section claim-warning">
          <p>⚠️ Build a Storage Room to claim your pending tokens!</p>
        </div>
        ` : ''}

        <button class="wallet-modal-close" id="profile-close-btn">Close</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => {
      const el = document.getElementById('profile-modal-overlay');
      if (el) document.body.removeChild(el);
      this.isModalOpen = false;
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    document.getElementById('profile-close-btn').addEventListener('click', () => {
      if (window.gameInstance?.audio) window.gameInstance.audio.playClick();
      closeModal();
    });

    // Storage button
    document.getElementById('btn-storage')?.addEventListener('click', async () => {
      if (window.gameInstance?.audio) window.gameInstance.audio.playClick();
      const result = await this.buildOrUpgrade('storage');
      if (result.success) {
        if (window.gameInstance?.ui) {
          window.gameInstance.ui.showNotification('Storage upgraded!', 'success');
        }
        closeModal();
        this.showProfileModal();
      } else {
        if (window.gameInstance?.ui) {
          window.gameInstance.ui.showNotification(result.error || 'Build failed', 'error');
        }
      }
    });

    // Home button
    document.getElementById('btn-home')?.addEventListener('click', async () => {
      if (window.gameInstance?.audio) window.gameInstance.audio.playClick();
      const result = await this.buildOrUpgrade('home');
      if (result.success) {
        if (window.gameInstance?.ui) {
          window.gameInstance.ui.showNotification('Home upgraded!', 'success');
        }
        closeModal();
        this.showProfileModal();
      } else {
        if (window.gameInstance?.ui) {
          window.gameInstance.ui.showNotification(result.error || 'Build failed', 'error');
        }
      }
    });

    // Deposit button
    document.getElementById('btn-deposit')?.addEventListener('click', async () => {
      const amount = parseInt(document.getElementById('storage-amount')?.value || '0');
      if (amount <= 0) {
        if (window.gameInstance?.ui) window.gameInstance.ui.showNotification('Enter a valid amount', 'warning');
        return;
      }
      if (window.gameInstance?.audio) window.gameInstance.audio.playClick();
      const result = await this.depositPoints(amount);
      if (result.success) {
        if (window.gameInstance?.ui) window.gameInstance.ui.showNotification(`Deposited ${amount} points`, 'success');
        closeModal();
        this.showProfileModal();
      } else {
        if (window.gameInstance?.ui) window.gameInstance.ui.showNotification(result.error || 'Deposit failed', 'error');
      }
    });

    // Withdraw button
    document.getElementById('btn-withdraw')?.addEventListener('click', async () => {
      const amount = parseInt(document.getElementById('storage-amount')?.value || '0');
      if (amount <= 0) {
        if (window.gameInstance?.ui) window.gameInstance.ui.showNotification('Enter a valid amount', 'warning');
        return;
      }
      if (window.gameInstance?.audio) window.gameInstance.audio.playClick();
      const result = await this.withdrawPoints(amount);
      if (result.success) {
        if (window.gameInstance?.ui) window.gameInstance.ui.showNotification(`Withdrew ${amount} points`, 'success');
        closeModal();
        this.showProfileModal();
      } else {
        if (window.gameInstance?.ui) window.gameInstance.ui.showNotification(result.error || 'Withdraw failed', 'error');
      }
    });

    // Claim button
    document.getElementById('btn-claim')?.addEventListener('click', async () => {
      const address = document.getElementById('claim-address')?.value || this.wallet.address;
      if (window.gameInstance?.audio) window.gameInstance.audio.playClick();
      const result = await this.claimTokens(address);
      if (result.success) {
        if (window.gameInstance?.ui) {
          window.gameInstance.ui.showNotification(result.message || 'Tokens claimed!', 'success', 5000);
        }
        closeModal();
      } else {
        if (window.gameInstance?.ui) window.gameInstance.ui.showNotification(result.error || 'Claim failed', 'error');
      }
    });
  }
}

window.BuildingsManager = BuildingsManager;
