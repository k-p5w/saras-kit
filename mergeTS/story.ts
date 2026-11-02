import { ENEMIES, BOSS, story, FACILITIES, heroes, turn } from './data';
import { partyPower, applyDeathPenalty } from './party';
import { updateView } from './ui';
import { renderShop } from './renderShop';
import { saveGame, addLog } from './system';

export const BEST_KEY = 'xyz_best';
export const winRate = (power: number, enemyPower: number): number => power / (power + enemyPower);

export function huntTargets(): string[] {
    return Object.keys(ENEMIES).filter(k => {
        const e = ENEMIES[k];
        return (!e.needs || FACILITIES[e.needs].unlocked) && story.kills[k] < e.need;
    });
}

export const huntDone = (): boolean => Object.keys(ENEMIES).every(k => story.kills[k] >= ENEMIES[k].need);

export function fightEnemy(h: any): { win: boolean; text: string } {
    const targets = huntTargets();
    const key = targets[Math.floor(Math.random() * targets.length)];
    const e = ENEMIES[key], power = partyPower();
    if (Math.random() < winRate(power, e.power)) {
        story.kills[key]++;
        h.loot.gold += e.reward;
        return { win: true, text: `⚔️ ${h.name}たちが${e.name}を討伐！ (+${e.reward}G) 〔${story.kills[key]}/${e.need}〕` };
    }
    applyDeathPenalty(h);
    const note = h.type === 'single' ? '' : `${h.name}の戦利品が半分に！`;
    return { win: false, text: `💥 ${e.name}に敗北… ${note}（戦力${power} vs ${e.power}）` };
}

export function bossChallenge(): void {
    if (story.cleared || !huntDone()) return;
    const power = partyPower();
    if (Math.random() < winRate(power, BOSS.power)) { clearGame(); return; }

    // 使い捨て勇者は全員退場（配列は in-place で操作する）
    for (let i = heroes.length - 1; i >= 0; i--) {
        if (heroes[i].type === 'single') heroes.splice(i, 1);
    }
    heroes.forEach((x: any) => {
        x.stamina = 0;
        x.idle = 0;
        if (x.loot) applyDeathPenalty(x);
    });
    addLog(`💀 ${BOSS.name}に敗れた…（戦力${power} vs ${BOSS.power}）全員が傷つき、休息に入ります。`, 'gameover');
    updateView(); renderShop(); saveGame();
}

export function clearGame(): void {
    story.cleared = true;
    story.clearDay = turn;
    let best: number | null = null;
    try {
        best = Number(localStorage.getItem(BEST_KEY)) || null;
        if (!best || turn < best) {
            localStorage.setItem(BEST_KEY, String(turn));
            best = turn;
        }
    } catch (e) { /* localStorage が使えない環境では記録なし */ }
    addLog(`🏆 【クリア】${BOSS.name}を討伐しました！ Day ${turn}`, 'goddess');
    const d = document.getElementById('clear-day'), b = document.getElementById('clear-best'), m = document.getElementById('clear-modal');
    if (d) d.innerText = String(turn);
    if (b) b.innerText = best ? `最短記録: Day ${best}` : '';
    if (m) m.classList.remove('hidden');
    updateView(); renderShop(); saveGame();
}

export function closeClearModal(): void {
    document.getElementById('clear-modal')?.classList.add('hidden');
}
