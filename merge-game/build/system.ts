import {
    SAVE_KEY, FACILITIES, customSideMats, board, inventory, gold, heroes, turn, story, newStory,
    syncBoardSize, sideMats, setBoard, setGold, setTurn, setAllResting, setGameOver,
} from './data';
import type { DirectionKey, MaterialKey } from './types';
import { updateDirectionGuides } from './ui';
import { renderShop } from './renderShop';

export function openGuideModal(): void {
    document.getElementById('guide-modal')?.classList.remove('hidden');
}

export function closeGuideModal(): void {
    document.getElementById('guide-modal')?.classList.add('hidden');
}

export function addLog(text: string, className: string = ''): void {
    const logSec = document.getElementById('log-section');
    if (!logSec) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${className}`;
    entry.innerText = `[Day ${turn}] ${text}`;
    logSec.prepend(entry);
}

export function switchTab(tab: 'puzzle' | 'shop'): void {
    const puzzleSec = document.getElementById('puzzle-section');
    const sideSec = document.getElementById('side-section');
    const btns = document.querySelectorAll('.tab-btn');

    if (tab === 'puzzle') {
        puzzleSec?.classList.remove('hidden');
        sideSec?.classList.remove('active');
        btns[0]?.classList.add('active');
        btns[1]?.classList.remove('active');
    } else {
        puzzleSec?.classList.add('hidden');
        sideSec?.classList.add('active');
        btns[0]?.classList.remove('active');
        btns[1]?.classList.add('active');
    }
}

export function saveGame(): void {
    try {
        const saveData = {
            board,
            inventory,
            gold,
            heroes,
            turn,
            story,
            facilities: Object.fromEntries(Object.entries(FACILITIES).map(([k, f]) => [k, f.unlocked])),
            customSideMats,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
        console.error('セーブ失敗', e);
    }
}

export function loadGame(): boolean {
    try {
        const data = localStorage.getItem(SAVE_KEY);
        if (!data) return false;
        const parsed = JSON.parse(data);

        for (const k in inventory) delete inventory[k as MaterialKey];
        Object.assign(inventory, parsed.inventory || {});

        setGold(parsed.gold ?? 100);
        heroes.length = 0;
        heroes.push(...(parsed.heroes || []));
        setTurn(parsed.turn || 0);
        setAllResting(false);
        setGameOver(false);

        Object.assign(story, newStory());
        if (parsed.story) {
            story.cleared = !!parsed.story.cleared;
            story.clearDay = parsed.story.clearDay ?? null;
            Object.assign(story.kills, parsed.story.kills || {});
        }

        Object.assign(customSideMats, { up: null, down: null, left: null, right: null }, parsed.customSideMats || {});

        for (const f of Object.values(FACILITIES)) f.unlocked = false;
        if (parsed.facilities) {
            for (const k in parsed.facilities) if (FACILITIES[k]) FACILITIES[k].unlocked = !!parsed.facilities[k];
        }

        // 盤面を差し替え、サイズは盤面の長さから決める。そのあと施設に合わせて調整
        setBoard(Array.isArray(parsed.board) ? parsed.board : []);
        syncBoardSize();
        return true;
    } catch (e) {
        console.error('ロード失敗', e);
        return false;
    }
}

export function showKingModal(): void {
    document.getElementById('king-modal')?.classList.remove('hidden');
}

export function closeKingModal(): void {
    document.getElementById('king-modal')?.classList.add('hidden');
    switchTab('shop');
    document.querySelector('#tavern-list button')?.classList.add('hire-highlight');
}

export function toggleSideMat(dir: DirectionKey, matKey: MaterialKey): void {
    let current = [...sideMats(dir)];
    if (current.includes(matKey)) {
        if (current.length <= 1) {
            addLog('⚠️ どの辺も少なくとも1種類の資材を含める必要があります。', 'danger');
            return;
        }
        current = current.filter(m => m !== matKey);
    } else {
        current.push(matKey);
    }
    customSideMats[dir] = current;
    updateDirectionGuides();
    renderShop();
    saveGame();
    addLog(`🧭 方角の排出資材を更新しました。`, 'event');
}
