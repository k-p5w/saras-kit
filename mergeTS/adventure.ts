import { inventory, heroes, CONFIG, allResting, setAllResting, nextTurn, addGold } from './data';
import { ADVENTURE_EVENTS } from './events';
import { updateView } from './ui';
import { renderShop } from './renderShop';
import { saveGame, addLog } from './system';

export function startExpedition(h: any): void {
    h.stamina = CONFIG.staminaMax;
    h.loot = { gold: 0, wood: 0, stone: 0, copper: 0, iron: 0 };
    h.idle = 0;
}

export function adventureLoop(): void {
    nextTurn();
    if (heroes.length === 0) return;

    for (const x of heroes) {
        if (x.stamina === undefined) startExpedition(x);
        else if (x.stamina > CONFIG.staminaMax) x.stamina = CONFIG.staminaMax;
    }

    // 行動力に比例した重みで、今日動く勇者を1人選ぶ
    const ready = heroes.filter((x: any) => x.stamina > 0);
    let h: any = null;
    if (ready.length > 0) {
        let r = Math.random() * ready.reduce((sum: number, x: any) => sum + x.stamina, 0);
        h = ready.find((x: any) => (r -= x.stamina) < 0) || ready[ready.length - 1];
    }

    // 動かなかった勇者は休養して行動力が回復
    for (const x of heroes) {
        if (x === h || x.type === 'single' || x.stamina >= CONFIG.staminaMax) continue;
        x.idle = (x.idle || 0) + 1;
        if (x.idle >= CONFIG.regenDays) { x.stamina++; x.idle = 0; }
    }

    if (!h) {
        if (!allResting) { setAllResting(true); addLog('😴 勇者たちは休息中…'); }
        updateView();
        return;
    }
    setAllResting(false);
    h.idle = 0;
    const index = heroes.indexOf(h);

    h.stamina--;

    const pool = ADVENTURE_EVENTS.filter(e => !e.condition || e.condition());
    const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
    let rand = Math.floor(Math.random() * totalWeight);

    let selectedEvent = pool[0];
    for (const evt of pool) {
        if (rand < evt.weight) {
            selectedEvent = evt;
            break;
        }
        rand -= evt.weight;
    }

    if (selectedEvent) {
        selectedEvent.effect(h);
        const cls = typeof selectedEvent.type === 'function' ? selectedEvent.type(h) : selectedEvent.type;
        addLog(`${selectedEvent.text(h)} (残り行動: ${h.stamina})`, cls);
    }

    if (h.stamina <= 0) {
        addGold(h.loot.gold);
        for (const key in h.loot) {
            if (key !== 'gold' && h.loot[key] > 0) {
                inventory[key as keyof typeof inventory] = (inventory[key as keyof typeof inventory] || 0) + h.loot[key];
            }
        }

        const summary: string[] = [];
        if (h.loot.wood > 0) summary.push(`木材x${h.loot.wood}`);
        if (h.loot.stone > 0) summary.push(`石材x${h.loot.stone}`);
        if (h.loot.copper > 0) summary.push(`銅x${h.loot.copper}`);
        if (h.loot.iron > 0) summary.push(`鉄x${h.loot.iron}`);
        const lootStr = summary.length > 0 ? summary.join('、') : '戦利品なし';

        if (h.type === 'single') {
            addLog(`🏰 📦 【外征完了】${h.name}が無事帰還！ 獲得: [ ${lootStr} ] （任期満了）`, 'reward');
            heroes.splice(index, 1);
        } else {
            addLog(`🏰 📦 【外征完了】${h.name}が無事帰還！ 獲得: [ ${lootStr} ] （休養に入ります）`, 'reward');
            h.loot = { gold: 0, wood: 0, stone: 0, copper: 0, iron: 0 };
        }
        saveGame();
    }

    updateView();
    renderShop();
}
