/* ==========================================
 * パズル＆操作ロジック
 * ========================================== */
function spawnTile(type) {
    let emptyIndexes = board.map((v, i) => v === null ? i : null).filter(v => v !== null);
    if (emptyIndexes.length === 0) {
        checkGameOver();
        return;
    }
    let idx = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
    board[idx] = { type: type, tier: 1, val: 1 };
}

function harvestTile(idx) {
    let tile = board[idx];
    if (tile && tile.tier === 2) {
        inventory[tile.type] = (inventory[tile.type] || 0) + tile.val;
        addLog(`【手動回収】${MATERIALS[tile.type].name}を${tile.val}個ストックしました。`, 'reward');
        board[idx] = null;
        
        if (isGameOver) {
            isGameOver = false;
            addLog(`✨ 盤面に空きができたため、ゲーム再開できます！`, 'event');
        }
        updateView();
        saveGame();
    }
}

function checkGameOver() {
    let hasEmpty = board.some(v => v === null);
    if (hasEmpty) return;

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            let current = board[r * SIZE + c];
            if (!current) continue;
            if (c < SIZE - 1) {
                let right = board[r * SIZE + (c + 1)];
                if (right && right.type === current.type && right.tier === current.tier && right.val === current.val) return;
            }
            if (r < SIZE - 1) {
                let down = board[(r + 1) * SIZE + c];
                if (down && down.type === current.type && down.tier === current.tier && down.val === current.val) return;
            }
        }
    }

    if (heroes.length > 0 && Math.random() < 0.8) {
        let maxVal = -1;
        let maxIdx = -1;

        board.forEach((t, i) => {
            if (t) {
                let score = t.tier * 100 + t.val;
                if (score > maxVal) {
                    maxVal = score;
                    maxIdx = i;
                }
            }
        });

        if (maxIdx !== -1) {
            let removedTile = board[maxIdx];
            board[maxIdx] = null;
            gold += 20;
            
            let matName = MATERIALS[removedTile.type].name;
            addLog(`✨ 【女神の慈悲発動！】最大のマス（${matName}）が消滅し、20Gの恵みを授かりました！`, 'goddess');
            updateView();
            saveGame();
            return;
        }
    }

    isGameOver = true;
    addLog(`⚠️ 【詰み】盤面が埋まりました！漢数字タイルを回収するかリセットしてください。`, 'gameover');
}

function handleMove(dir) {
    if (slide(dir)) {
        let supplyType = ERAS[currentEra].sides[dir];
        spawnTile(supplyType);
        updateView();
        checkGameOver();
        saveGame();
    }
}

function slide(direction) {
    let rotCount = 0;
    if (direction === 'right') rotCount = 2;
    if (direction === 'up') rotCount = 3;
    if (direction === 'down') rotCount = 1;

    for (let i = 0; i < rotCount; i++) rotateBoard();

    let changed = false;
    for (let r = 0; r < SIZE; r++) {
        let row = [];
        for (let c = 0; c < SIZE; c++) row.push(board[r * SIZE + c]);
        let { newRow, moved } = processRow(row);
        if (moved) changed = true;
        for (let c = 0; c < SIZE; c++) board[r * SIZE + c] = newRow[c];
    }

    for (let i = 0; i < (4 - rotCount) % 4; i++) rotateBoard();
    return changed;
}

function rotateBoard() {
    let newBoard = Array(SIZE * SIZE).fill(null);
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            newBoard[c * SIZE + (SIZE - 1 - r)] = board[r * SIZE + c];
        }
    }
    board = newBoard;
}

function processRow(row) {
    let filtered = row.filter(t => t !== null);
    let newRow = [];
    let moved = false;

    for (let i = 0; i < filtered.length; i++) {
        let current = filtered[i];
        let next = filtered[i + 1];

        if (next && current.type === next.type && current.tier === next.tier && current.val === next.val) {
            let newVal = current.val * 2;
            let newTier = current.tier;
            let matName = MATERIALS[current.type].name;

            if (newTier === 1 && newVal >= CONFIG.cardMax) {
                newTier = 2;
                newVal = 1;
                moved = true;
            } else if (newTier === 2 && newVal >= CONFIG.cardMax) {
                inventory[current.type] = (inventory[current.type] || 0) + CONFIG.completeBonus;
                addLog(`🎉 【完走ボーナス】${matName}x${CONFIG.completeBonus}を獲得しました！`, 'reward');
                newRow.push(null);
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

    if (newRow.length !== row.filter(t => t !== null).length) moved = true;
    while (newRow.length < SIZE) newRow.push(null);

    for (let i = 0; i < SIZE; i++) {
        if ((row[i] === null) !== (newRow[i] === null) || 
            (row[i] && newRow[i] && (row[i].val !== newRow[i].val || row[i].tier !== newRow[i].tier))) {
            moved = true;
        }
    }

    return { newRow, moved };
}

// イベントリスナー（キー操作・スワイプ）
let touchStartX = 0, touchStartY = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
    if (isGameOver) return;
    let dx = e.changedTouches[0].clientX - touchStartX;
    let dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

    let dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    handleMove(dir);
}, { passive: true });

document.addEventListener('keydown', e => {
    if (isGameOver) return;
    const dirs = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    if (dirs[e.key]) handleMove(dirs[e.key]);
});