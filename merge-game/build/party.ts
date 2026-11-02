import {
    CONFIG, CONFIG_GEAR, GEAR, FACILITIES, HERO_TYPES, MATERIALS,
    gearOpen, inventory, gold, heroes, setGold, addGold,
} from './data';
import { addLog, saveGame } from './system';
import { updateView } from './ui';
import { renderShop } from './renderShop';

export const gearPower = (h: any): number => (h.gear ? GEAR[h.gear].power : 0);
export const canEquip = (h: any): boolean => h.type !== 'single';
export const partyPower = (): number => heroes.reduce((s: number, h: any) => s + CONFIG_GEAR.heroPower + gearPower(h), 0);

export function hireHero(type: string, cost: number, heroName: string): void {
    const needs = HERO_TYPES[type]?.needs;
    if (needs && !FACILITIES[needs].unlocked) {
        addLog(`${FACILITIES[needs].name}を建築してから雇ってください。`);
        return;
    }
    if (heroes.length >= CONFIG.partyMax) {
        addLog('パーティが満員です。', 'danger');
        return;
    }

    if (gold >= cost) {
        setGold(gold - cost);
        heroes.push({ type, name: heroName, loot: { gold: 0, wood: 0, stone: 0, copper: 0, iron: 0 } });
        addLog(`【雇用】${heroName}を迎え入れました！`, 'event');
        updateView();
        saveGame();
        renderShop();
    } else {
        addLog(`ゴールドが足りません。`);
    }
}

export function gearTarget(g: any): any {
    return heroes.filter(canEquip).filter((h: any) => gearPower(h) < g.power)
        .sort((a: any, b: any) => gearPower(a) - gearPower(b))[0];
}

export function buybackOf(key: string): number {
    const sum = Object.entries(GEAR[key].cost).reduce((s: number, [k, n]) => s + (n as number) * MATERIALS[k as keyof typeof MATERIALS].sell, 0);
    return Math.floor(sum * CONFIG_GEAR.buybackRate);
}

export function craftGear(key: string): void {
    const g = GEAR[key];
    if (!gearOpen(g)) return;
    const t = gearTarget(g);
    if (!t) { addLog('武器を持たせられる勇者がいません。', 'danger'); return; }
    for (const [k, n] of Object.entries(g.cost)) {
        if ((inventory[k as keyof typeof inventory] || 0) < (n as number)) {
            addLog(`素材が足りません（${MATERIALS[k as keyof typeof MATERIALS].name}${n}個）。`, 'danger');
            return;
        }
    }
    for (const [k, n] of Object.entries(g.cost)) {
        inventory[k as keyof typeof inventory]! -= (n as number);
    }
    let msg = `🔨 ${t.name}に${g.name}を作りました！`;
    if (t.gear) {
        const back = buybackOf(t.gear);
        addGold(back);
        msg = `🔨 ${t.name}の${GEAR[t.gear].name}を買い取り（+${back}G）、${g.name}を作りました！`;
    }
    t.gear = key;
    addLog(msg, 'reward');
    renderShop(); updateView(); saveGame();
}

export function applyDeathPenalty(h: any): void {
    if (h.type === 'single') return;
    for (const k of Object.keys(h.loot)) h.loot[k] = Math.floor(h.loot[k] / 2);
}
