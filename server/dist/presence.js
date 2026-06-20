"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertPresence = upsertPresence;
exports.removePresence = removePresence;
exports.getActivePlayers = getActivePlayers;
exports.getOnlineCount = getOnlineCount;
const store = new Map();
const MAX_AGE_MS = 15000;
function cleanup(maxAgeMs = MAX_AGE_MS) {
    const now = Date.now();
    for (const [id, player] of store) {
        if (now - player.lastSeen > maxAgeMs) {
            store.delete(id);
        }
    }
}
function upsertPresence(data) {
    store.set(data.sessionId, { ...data, lastSeen: Date.now() });
    cleanup();
}
function removePresence(sessionId) {
    store.delete(sessionId);
}
function getActivePlayers(excludeSessionId, maxAgeMs = MAX_AGE_MS) {
    cleanup(maxAgeMs);
    const players = [];
    for (const [id, player] of store) {
        if (excludeSessionId && id === excludeSessionId)
            continue;
        players.push(player);
    }
    return players;
}
function getOnlineCount(maxAgeMs = MAX_AGE_MS) {
    cleanup(maxAgeMs);
    return store.size;
}
//# sourceMappingURL=presence.js.map