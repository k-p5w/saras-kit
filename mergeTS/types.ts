export type MaterialKey = 'wood' | 'stone' | 'copper' | 'iron';
export type DirectionKey = 'up' | 'down' | 'left' | 'right';

export interface MaterialConfig {
    name: string;
    sell: number;
    start?: number[];
    cardBg: string;
    cardBd: string;
    matBg: string;
    matFg: string;
    matBd: string;
}

export interface FacilityConfig {
    name: string;
    cost: Partial<Record<MaterialKey, number>>;
    unlocked: boolean;
    desc: string;
    boardSize?: number;
    adds?: Partial<Record<DirectionKey, MaterialKey>>;
    needs?: MaterialKey | string;
}

export interface Hero {
    type: string;
    name: string;
    stamina?: number;
    idle?: number;
    loot: Record<string, number>;
    gear?: string;
    lastBattle?: { win: boolean; text: string };
}

export interface Tile {
    type: MaterialKey;
    tier: number;
    val: number;
}

export interface GearConfig {
    needs: string | null;
    name: string;
    power: number;
    cost: Partial<Record<MaterialKey, number>>;
}

export interface EnemyConfig {
    name: string;
    power: number;
    need: number;
    reward: number;
    needs: string | null;
}

export interface StoryState {
    kills: Record<string, number>;
    cleared: boolean;
    clearDay: number | null;
}