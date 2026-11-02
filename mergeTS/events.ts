import { FACILITIES, MATERIALS } from './data';
import type { MaterialKey } from './types';
import { fightEnemy, huntTargets } from './story';

// ※ アップロードされたファイルに ADVENTURE_EVENTS の実体がなかったため、代わりに作ったものです。
//   元の定義がある場合は、この配列を差し替えてください。

export interface AdventureEvent {
    weight: number;
    type: string | ((h: any) => string);
    condition?: () => boolean;
    effect: (h: any) => void;
    text: (h: any) => string;
}

const rand = (min: number, max: number): number => min + Math.floor(Math.random() * (max - min + 1));

function gather(key: MaterialKey, mark: string, verb: string, min: number, max: number, weight: number, condition?: () => boolean): AdventureEvent {
    return {
        weight,
        type: 'event',
        condition,
        effect: (h) => {
            const n = rand(min, max);
            h.loot[key] = (h.loot[key] || 0) + n;
            h.lastGain = n;
        },
        text: (h) => `${mark} ${h.name}が${verb}、${MATERIALS[key].name}x${h.lastGain}を入手`,
    };
}

export const ADVENTURE_EVENTS: AdventureEvent[] = [
    gather('wood', '🌲', '森で木を切り倒し', 3, 6, 25),
    gather('stone', '🪨', '採石場で石を砕き', 2, 5, 25),
    gather('copper', '⛏️', '鉱脈を掘り当て', 1, 3, 15, () => FACILITIES.copper_mine.unlocked),
    gather('iron', '⛏️', '深い坑道を進み', 1, 3, 10, () => FACILITIES.iron_mine.unlocked),
    {
        weight: 10,
        type: 'event',
        effect: (h) => {
            const n = rand(5, 15);
            h.loot.gold += n;
            h.lastGain = n;
        },
        text: (h) => `💰 ${h.name}は宝箱を見つけた！ (+${h.lastGain}G)`,
    },
    {
        weight: 30,
        type: (h) => (h.lastBattle?.win ? 'reward' : 'danger'),
        condition: () => huntTargets().length > 0,
        effect: (h) => { h.lastBattle = fightEnemy(h); },
        text: (h) => h.lastBattle.text,
    },
    {
        weight: 10,
        type: 'event',
        effect: () => {},
        text: (h) => `🍃 ${h.name}は穏やかな道のりを進んだ…`,
    },
];
