import {
    SAVE_KEY, SIZE, FACILITIES, MATERIALS, inventory, heroes, story, newStory, customSideMats,
    isGameOver, gold, setGold, addGold, setTurn, setAllResting, setGameOver,
    resetBoardTo, syncBoardSize,
} from './data';
import { spawnTile, handleMove } from './puzzle';
import { updateView, updateDirectionGuides } from './ui';
import { renderShop } from './renderShop';
import {
    saveGame, loadGame, addLog, showKingModal,
    openGuideModal, closeGuideModal, switchTab, closeKingModal, toggleSideMat,
} from './system';
import { bossChallenge, closeClearModal } from './story';
import { hireHero, craftGear } from './party';

export function resetBoardWithPenalty(): void {
    for (const k in inventory) {
        const key = k as keyof typeof inventory;
        inventory[key] = Math.floor((inventory[key] || 0) / 2);
        if (inventory[key]! <= 0) delete inventory[key];
    }
    resetBoardTo(SIZE);
    setGameOver(false);
    spawnTile('up');
    spawnTile('left');
    updateView();
    saveGame();
    addLog('⚠️ 代償として資材が半分になりましたが、盤面がリセットされ冒険を継続します！', 'warning');
}

export function buildFacility(facKey: string): void {
    const fac = FACILITIES[facKey];
    if (!fac) return;
    const lack = Object.entries(fac.cost).find(([k, n]) => (inventory[k as keyof typeof inventory] || 0) < (n as number));
    if (lack) { addLog(`資材が足りません！`, 'danger'); return; }
    for (const [k, n] of Object.entries(fac.cost)) {
        inventory[k as keyof typeof inventory]! -= (n as number);
    }
    fac.unlocked = true;
    if (syncBoardSize()) addLog(`🗺️ 盤面が${SIZE}×${SIZE}に広がりました！`, 'event');
    addLog(`🏗️ 【施設建築】${fac.name}を建築しました！`, 'event');
    renderShop();
    updateDirectionGuides();
    updateView();
    saveGame();
}

export function sellMaterial(type: string, amount: number): void {
    const mat = MATERIALS[type as keyof typeof MATERIALS];
    const price = mat.sell * amount;
    if ((inventory[type as keyof typeof inventory] || 0) >= amount) {
        inventory[type as keyof typeof inventory]! -= amount;
        addGold(price);
        addLog(`【売却】${mat.name}x${amount} を売却 (+${price}G)`);
        updateView();
        renderShop();
        saveGame();
    } else {
        addLog(`資材が足りません。`);
    }
}

export function initGame(isReset: boolean = false): void {
    if (isReset) {
        localStorage.removeItem(SAVE_KEY);
    }

    if (!isReset && loadGame()) {
        updateDirectionGuides();
        renderShop();
        updateView();
        addLog('前回のセーブデータからゲームを再開しました。', 'event');
        return;
    }

    // 新規開始
    resetBoardTo(5);
    for (const k in inventory) delete inventory[k as keyof typeof inventory];
    for (const k of Object.keys(MATERIALS)) inventory[k as keyof typeof inventory] = 0;
    setGold(100);
    heroes.length = 0;
    setTurn(0);
    setAllResting(false);
    setGameOver(false);
    Object.assign(story, newStory());
    Object.assign(customSideMats, { up: null, down: null, left: null, right: null });
    for (const f of Object.values(FACILITIES)) f.unlocked = false;

    renderShop();
    updateDirectionGuides();

    spawnTile('up');
    spawnTile('left');
    updateView();

    addLog('👑 王様：「あなたは王様です。まず、勇者を雇い、冒険に出てもらいましょう！」', 'event');
    showKingModal();
    saveGame();
}

export function resetGame(): void {
    initGame(true);
    addLog('【リセット】盤面とステータスを初期化しました。', 'event');
}

// ===== イベントリスナー =====
let touchStartX = 0, touchStartY = 0;
document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
    if (isGameOver) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    handleMove(dir);
}, { passive: true });

document.addEventListener('keydown', e => {
    if (isGameOver) return;
    const dirs: Record<string, string> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    if (dirs[e.key]) handleMove(dirs[e.key]);
});

// ===== index.html の onclick="..." から呼べるように window へ登録 =====
Object.assign(window as any, {
    resetBoardWithPenalty,
    buildFacility,
    sellMaterial,
    resetGame,
    openGuideModal,
    closeGuideModal,
    switchTab,
    closeKingModal,
    closeClearModal,
    bossChallenge,
    hireHero,
    craftGear,
    toggleSideMat,
});

initGame();
