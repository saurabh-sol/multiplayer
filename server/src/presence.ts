export interface PlayerPresence {
  sessionId: string;
  name: string;
  walletAddress: string | null;
  isGuest: boolean;
  x: number;
  y: number;
  direction: string;
  roundNumber: number;
  roundState: string;
  color: string;
  boxesOpened: number;
  lastSeen: number;
}

const store = new Map<string, PlayerPresence>();
const MAX_AGE_MS = 15000;

function cleanup(maxAgeMs = MAX_AGE_MS) {
  const now = Date.now();
  for (const [id, player] of store) {
    if (now - player.lastSeen > maxAgeMs) {
      store.delete(id);
    }
  }
}

export function upsertPresence(data: Omit<PlayerPresence, 'lastSeen'>) {
  store.set(data.sessionId, { ...data, lastSeen: Date.now() });
  cleanup();
}

export function removePresence(sessionId: string) {
  store.delete(sessionId);
}

export function getActivePlayers(excludeSessionId?: string, maxAgeMs = MAX_AGE_MS) {
  cleanup(maxAgeMs);
  const players: PlayerPresence[] = [];
  for (const [id, player] of store) {
    if (excludeSessionId && id === excludeSessionId) continue;
    players.push(player);
  }
  return players;
}

export function getOnlineCount(maxAgeMs = MAX_AGE_MS) {
  cleanup(maxAgeMs);
  return store.size;
}
