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
export declare function upsertPresence(data: Omit<PlayerPresence, 'lastSeen'>): void;
export declare function removePresence(sessionId: string): void;
export declare function getActivePlayers(excludeSessionId?: string, maxAgeMs?: number): PlayerPresence[];
export declare function getOnlineCount(maxAgeMs?: number): number;
//# sourceMappingURL=presence.d.ts.map