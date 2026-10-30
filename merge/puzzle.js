/* ==========================================
 * パズル＆操作ロジック
 * ========================================== */
function spawnTile(dir) {
    let emptyIndexes = board.map((v, i) => v === null ? i : null).filter(v => v !== null);
    if (emptyIndexes.length === 0) {
        checkGameOver();
        return;
    }
    let idx = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
    const sup = rollSupply(dir);
    board[idx] = { type: sup.type, tier: 1, val: sup.val };
}

function harvestTile(idx) {
    let tile = board[idx];
    if (tile && tile.tier === 2) {
        const gain = tile.val * CONFIG.harvestRate;
        inventory[tile.type] = (inventory[tile.type] || 0) + gain;
        addLog(`【手動回収】${MATERIALS[tile.type].name}を${gain}個ストックしました。`, 'reward');
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

    // とりあえずスキルをオフにしておく
    let IsHealerSkill = false;
    if (IsHealerSkill) {

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
    }

    isGameOver = true;
    addLog(`⚠️ 【詰み】盤面が埋まりました！漢数字タイルを回収するかリセットしてください。`, 'gameover');
}

function handleMove(dir) {
    if (slide(dir)) {
        spawnTile(dir);
        adventureLoop();   // 1スワイプ＝1日
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
    // null（空きマス）を除外した要素のリストを作成
    let filtered = row.filter(t => t !== null);
    let newRow = [];
    let moved = false;

    // 隣り合う要素を比較しながらマージ処理を行う
    for (let i = 0; i < filtered.length; i++) {
        let current = filtered[i];
        let next = filtered[i + 1];

        // 種類(type)、ティア(tier)、値(val)がすべて同じ場合はマージする
        if (next && current.type === next.type && current.tier === next.tier && current.val === next.val) {
            let newVal = current.val * 2;
            let newTier = current.tier;
            let matName = MATERIALS[current.type].name;
            inventory[current.type] = (inventory[current.type] || 0) + (current.val * current.tier);

            // ティア1で値が上限値に達した場合、ティア2に昇格させる
            if (newTier === 1 && newVal >= CONFIG.cardMax) {
                newTier = 2;
                newVal = 1;
                moved = true;
                // ティア2で値が上限値に達した場合、完走ボーナスを付与して消去する
            } else if (newTier === 2 && newVal >= CONFIG.cardMax) {
                inventory[current.type] = (inventory[current.type] || 0) + CONFIG.completeBonus;
                addLog(`🎉 【完走ボーナス】${matName}x${CONFIG.completeBonus}を獲得しました！`, 'reward');
                newRow.push(null);
                i++; // 次の要素も消費済みなのでスキップ
                moved = true;
                continue;
            } else {
                moved = true;
            }

            // マージ後の新しい要素を追加し、次の要素をスキップ
            newRow.push({ type: current.type, tier: newTier, val: newVal });
            i++;
        } else {
            // マージしない場合はそのまま追加
            newRow.push(current);
        }
    }

    // 要素数が変わった場合は移動・変化があったとみなす
    if (newRow.length !== row.filter(t => t !== null).length) moved = true;

    // 行のサイズ(SIZE)に満たない分をnullで埋める
    while (newRow.length < SIZE) newRow.push(null);

    // 処理前後の配列を比較し、変化（移動や値の変更）があったかを厳密に判定する
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