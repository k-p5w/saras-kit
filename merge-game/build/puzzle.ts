import { board, SIZE, CONFIG, rollSupply, inventory, MATERIALS, isGameOver, setGameOver } from './data';
import { updateView } from './ui';
import { saveGame, addLog } from './system';
import { adventureLoop } from './adventure';

export function spawnTile(dir: any): void {
    const emptyIndexes = board.map((v, i) => v === null ? i : null).filter((v): v is number => v !== null);
    if (emptyIndexes.length === 0) {
        checkGameOver();
        return;
    }
    const idx = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
    const sup = rollSupply(dir);
    board[idx] = { type: sup.type, tier: 1, val: sup.val };
}

export function harvestTile(idx: number): void {
    const tile = board[idx];
    if (tile && tile.tier === 2) {
        const gain = tile.val * CONFIG.harvestRate;
        inventory[tile.type as keyof typeof inventory] = (inventory[tile.type as keyof typeof inventory] || 0) + gain;
        addLog(`【手動回収】${MATERIALS[tile.type as keyof typeof MATERIALS].name}を${gain}個ストックしました。`, 'reward');
        board[idx] = null;

        if (isGameOver) {
            setGameOver(false);
            addLog(`✨ 盤面に空きができたため、ゲーム再開できます！`, 'event');
        }
        updateView();
        saveGame();
    }
}

export function checkGameOver(): void {
    const hasEmpty = board.some(v => v === null);
    if (hasEmpty) return;

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const current = board[r * SIZE + c];
            if (!current) continue;
            if (c < SIZE - 1) {
                const right = board[r * SIZE + (c + 1)];
                if (right && right.type === current.type && right.tier === current.tier && right.val === current.val) return;
            }
            if (r < SIZE - 1) {
                const down = board[(r + 1) * SIZE + c];
                if (down && down.type === current.type && down.tier === current.tier && down.val === current.val) return;
            }
        }
    }
    setGameOver(true);
    addLog(`⚠️ 【詰み】盤面が埋まりました！漢数字タイルを回収するかリセットしてください。`, 'gameover');
}

export function handleMove(dir: any): void {
    if (slide(dir)) {
        spawnTile(dir);
        adventureLoop();
        updateView();
        checkGameOver();
        saveGame();
    }
}

export function slide(direction: string): boolean {
    let rotCount = 0;
    if (direction === 'right') rotCount = 2;
    if (direction === 'up') rotCount = 3;
    if (direction === 'down') rotCount = 1;

    for (let i = 0; i < rotCount; i++) rotateBoard();

    let changed = false;
    for (let r = 0; r < SIZE; r++) {
        const row = [];
        for (let c = 0; c < SIZE; c++) row.push(board[r * SIZE + c]);
        const { newRow, moved } = processRow(row);
        if (moved) changed = true;
        for (let c = 0; c < SIZE; c++) board[r * SIZE + c] = newRow[c];
    }

    for (let i = 0; i < (4 - rotCount) % 4; i++) rotateBoard();
    return changed;
}

export function rotateBoard(): void {
    const newBoard = Array(SIZE * SIZE).fill(null);
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            newBoard[c * SIZE + (SIZE - 1 - r)] = board[r * SIZE + c];
        }
    }
    board.length = 0;
    board.push(...newBoard);
}

export function processRow(row: any[]): { newRow: any[]; moved: boolean } {
    const filtered = row.filter(t => t !== null);
    const newRow: any[] = [];
    let moved = false;

    for (let i = 0; i < filtered.length; i++) {
        const current = filtered[i];
        const next = filtered[i + 1];

        if (next && current.type === next.type && current.tier === next.tier && current.val === next.val) {
            let newVal = current.val * 2;
            let newTier = current.tier;
            const matName = MATERIALS[current.type as keyof typeof MATERIALS].name;
            inventory[current.type as keyof typeof inventory] = (inventory[current.type as keyof typeof inventory] || 0) + (current.val * current.tier);

            if (newTier === 1 && newVal >= CONFIG.cardMax) {
                newTier = 2;
                newVal = 1;
                moved = true;
            } else if (newTier === 2 && newVal >= CONFIG.cardMax) {
                // 完走ボーナス：タイルは消えるだけ（null を挟むと行に隙間ができるので push しない）
                inventory[current.type as keyof typeof inventory] = (inventory[current.type as keyof typeof inventory] || 0) + CONFIG.completeBonus;
                addLog(`🎉 【完走ボーナス】${matName}x${CONFIG.completeBonus}を獲得しました！`, 'reward');
                i++;
                moved = true;
                continue;
            } else {
                moved = true;
            }

            newRow.push({ type: current.type, tier: newTier, val: newVal });
            i++;
        } else {
            newRow.push(current);
        }
    }

    if (newRow.length !== filtered.length) moved = true;
    while (newRow.length < SIZE) newRow.push(null);

    for (let i = 0; i < SIZE; i++) {
        if ((row[i] === null) !== (newRow[i] === null) ||
            (row[i] && newRow[i] && (row[i].val !== newRow[i].val || row[i].tier !== newRow[i].tier))) {
            moved = true;
        }
    }

    return { newRow, moved };
}
