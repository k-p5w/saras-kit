import type { MaterialKey, DirectionKey, FacilityConfig, GearConfig, EnemyConfig, StoryState, MaterialConfig } from './types';

export const CONFIG = {
    completeBonus: 1000,
    harvestRate: 16,
    cardMax: 16,
    partyMax: 6,
    staminaMax: 3,
    regenDays: 2,
};

export const SAVE_KEY = 'xyz';
export const CONFIG_GEAR = { buybackRate: 0.5, heroPower: 10 };

export const GEAR: Record<string, GearConfig> = {
    wood_sword: { needs: null, name: '木剣', power: 3, cost: { wood: 10 } },
    stone_sword: { needs: null, name: '石剣', power: 6, cost: { stone: 15, wood: 5 } },
    copper_sword: { needs: 'copper_mine', name: '銅剣', power: 10, cost: { copper: 15, wood: 5 } },
    iron_sword: { needs: 'iron_mine', name: '鉄剣', power: 16, cost: { iron: 20, wood: 5 } },
};

export const HERO_TYPES: Record<string, { name: string; desc: string; cost: number; type: string; needs?: string }> = {
    single: { name: '新人勇者', desc: '外征1回', cost: 25, type: 'single' },
    permanent: { name: '勇者', desc: '永久雇用', cost: 100, type: 'permanent' },
    soldier: { name: '傭兵', desc: '酒場仲間', cost: 50, type: 'soldier', needs: 'tavern' },
    mage: { name: '魔法使い', desc: '酒場仲間', cost: 75, type: 'mage', needs: 'tavern' },
    priest: { name: '僧侶', desc: '酒場仲間', cost: 120, type: 'priest', needs: 'tavern' },
};

export const MATERIALS: Record<MaterialKey, MaterialConfig> = {
    wood: { name: '木材', sell: 2, cardBg: '#8d5524', cardBd: '#ffcc99', matBg: '#5c3a21', matFg: '#ffe0b2', matBd: '#ffb74d' },
    stone: { name: '石材', sell: 3, cardBg: '#708090', cardBd: '#dcdcdc', matBg: '#3b4c5c', matFg: '#e0f7fa', matBd: '#4dd0e1' },
    copper: { name: '銅', sell: 5, start: [2], cardBg: '#d4552b', cardBd: '#ffb199', matBg: '#8a2a14', matFg: '#ffd6c9', matBd: '#ff6b4a' },
    iron: { name: '鉄', sell: 8, start: [2], cardBg: '#3f3d9e', cardBd: '#b9b4ff', matBg: '#1e1b4b', matFg: '#e0deff', matBd: '#8b7cf6' },
};

export const BASE_SIDES: Record<DirectionKey, MaterialKey[]> = {
    up: ['wood'],
    down: ['wood'],
    left: ['stone'],
    right: ['stone'],
};

export const DIR_JP: Record<DirectionKey, string> = { up: '上', down: '下', left: '左', right: '右' };

export const FACILITIES: Record<string, FacilityConfig> = {
    tavern: { name: '酒場', cost: { wood: 100, stone: 60 }, unlocked: false, desc: '他の仲間を雇用できるようになる' },
    copper_mine: { name: '採掘所（銅）', cost: { wood: 120, stone: 80 }, unlocked: false, boardSize: 6, desc: '銅資源の解放', adds: { down: 'copper', up: 'copper' } },
    iron_mine: { name: '採掘所（鉄）', cost: { copper: 60, stone: 150 }, unlocked: false, desc: '鉄資源の解放', adds: { right: 'iron', left: 'iron' }, needs: 'copper_mine' },
    direction_altar: { name: '地脈調整炉', cost: { stone: 200, copper: 100 }, unlocked: false, desc: '方角ごとの資材をカスタマイズ', needs: 'copper_mine' },
};

export const gearOpen = (g: GearConfig): boolean => !g.needs || FACILITIES[g.needs].unlocked;
export const facAvailable = (f: FacilityConfig): boolean => !f.unlocked && (!f.needs || FACILITIES[f.needs].unlocked);

export const ENEMIES: Record<string, EnemyConfig> = {
    ume: { name: '梅の魔物', power: 15, need: 5, reward: 10, needs: null },
    take: { name: '竹の魔物', power: 40, need: 3, reward: 30, needs: 'copper_mine' },
    matsu: { name: '松の魔物', power: 90, need: 1, reward: 80, needs: 'iron_mine' },
};

export const BOSS = { name: '魔王', power: 150 };

export const newStory = (): StoryState => ({ kills: { ume: 0, take: 0, matsu: 0 }, cleared: false, clearDay: null });

// ===== ゲーム状態 =====
// 他のファイルからは代入できない（import は読み取り専用）ので、
// 数値・真偽値・board の差し替えは下のセッター関数を使うこと。
export const story: StoryState = newStory();
export const inventory: Partial<Record<MaterialKey, number>> = {};
export const heroes: any[] = [];
export const customSideMats: Record<DirectionKey, MaterialKey[] | null> = {
    up: null, down: null, left: null, right: null,
};

export let SIZE = 5;
export let board: any[] = Array(SIZE * SIZE).fill(null);
export let gold = 100;
export let turn = 0;
export let isGameOver = false;
export let allResting = false;

export function setGold(val: number): void { gold = val; }
export function addGold(amount: number): void { gold += amount; }
export function setTurn(val: number): void { turn = val; }
export function nextTurn(): void { turn++; }
export function setGameOver(val: boolean): void { isGameOver = val; }
export function setAllResting(val: boolean): void { allResting = val; }

/** 盤面を丸ごと差し替える。サイズは配列の長さから決める（正方形でなければ5×5で作り直し） */
export function setBoard(cells: any[]): void {
    const n = Math.round(Math.sqrt(cells.length));
    if (!n || n * n !== cells.length) {
        SIZE = 5;
        board = Array(25).fill(null);
        return;
    }
    SIZE = n;
    board = cells;
}

export function resetBoardTo(n: number): void {
    setBoard(Array(n * n).fill(null));
}

export function targetBoardSize(): number {
    let n = 5;
    for (const f of Object.values(FACILITIES)) if (f.unlocked && f.boardSize) n = Math.max(n, f.boardSize);
    return n;
}

export function syncBoardSize(): boolean {
    const n = targetBoardSize();
    if (n === SIZE && board.length === n * n) return false;
    const old = SIZE;
    const nb: any[] = Array(n * n).fill(null);
    for (let r = 0; r < Math.min(old, n); r++) {
        for (let c = 0; c < Math.min(old, n); c++) {
            nb[r * n + c] = board[r * old + c] || null;
        }
    }
    SIZE = n;
    board = nb;
    return true;
}

export function sideMats(dir: DirectionKey): MaterialKey[] {
    const custom = customSideMats[dir];
    if (FACILITIES.direction_altar.unlocked && custom && custom.length > 0) {
        return custom;
    }
    const list = [...BASE_SIDES[dir]];
    for (const f of Object.values(FACILITIES)) {
        if (f.unlocked && f.adds && f.adds[dir]) list.push(f.adds[dir]!);
    }
    return [...new Set(list)];
}

/** いま盤面に出ている資材 */
export function activeMaterials(): MaterialKey[] {
    return [...new Set((['up', 'down', 'left', 'right'] as DirectionKey[]).flatMap(sideMats))];
}

/** 施設で解放済みの資材（地脈調整で外しても消えない） */
export function unlockedMaterials(): MaterialKey[] {
    const set = new Set<MaterialKey>();
    for (const list of Object.values(BASE_SIDES)) for (const m of list) set.add(m);
    for (const f of Object.values(FACILITIES)) {
        if (f.unlocked && f.adds) for (const m of Object.values(f.adds)) set.add(m as MaterialKey);
    }
    return [...set];
}

export function rollSupply(dir: DirectionKey): { type: MaterialKey; val: number } {
    const mats = sideMats(dir);
    const type = mats[Math.floor(Math.random() * mats.length)];
    const vals = MATERIALS[type].start || (mats.length === 1 ? [1, 2] : (type === mats[0] ? [2] : [1]));
    return { type, val: vals[Math.floor(Math.random() * vals.length)] };
}
