/* ==========================================
 * 画面更新：盤面・ガイド・ステータスバー
 * （ショップの描画は renderShop.js）
 * ========================================== */
function setTileVars(cell, type) {
    const m = MATERIALS[type];
    cell.style.setProperty('--card-bg', m.cardBg);
    cell.style.setProperty('--card-bd', m.cardBd);
    cell.style.setProperty('--mat-bg', m.matBg);
    cell.style.setProperty('--mat-fg', m.matFg);
    cell.style.setProperty('--mat-bd', m.matBd);
    cell.style.setProperty('--mat-glow', m.matBd + '4d');
}

function updateDirectionGuides() {
    const arrows = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' };
    for (const dir of ['up', 'down', 'left', 'right']) {
        const ms = sideMats(dir).map(k => MATERIALS[k]);
        const el = document.getElementById('guide-' + dir);
        if (!el) continue;
        const last = ms[ms.length - 1];
        el.textContent = `${arrows[dir]} ${ms.map(m => m.name).join('＋')}`;
        el.style.setProperty('--chip-bg', ms.length > 1 ? `linear-gradient(135deg, ${ms.map(m => m.cardBg).join(', ')})` : last.cardBg);
        el.style.setProperty('--chip-bd', last.cardBd);
        document.getElementById('grid').style.setProperty('--g-' + dir, last.cardBg);
    }
}

function updateView() {
    document.getElementById('era-name').innerText = '拠点Lv.' + (1 + Object.values(FACILITIES).filter(f => f.unlocked).length);

    const gridEl = document.getElementById('grid');
    gridEl.style.setProperty('--n', SIZE);
    gridEl.innerHTML = '';

    board.forEach((tile, idx) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (tile) {
            if (tile.tier === 1) {
                cell.classList.add('tile-card');
                setTileVars(cell, tile.type);
                cell.innerText = tile.val;
            } else {
                cell.classList.add('tile-mat');
                setTileVars(cell, tile.type);
                cell.innerText = kanjiMap[tile.val] || tile.val;
                cell.onclick = () => harvestTile(idx);
            }
        }
        gridEl.appendChild(cell);
    });

    document.getElementById('inv-bar').innerHTML = activeMaterials()
        .map(k => `<div class="status-item">${MATERIALS[k].name}: <span>${inventory[k] || 0}</span></div>`).join('');
    document.getElementById('gold').innerText = gold;
    document.getElementById('turn').innerText = turn;
    const allTired = heroes.length > 0 && heroes.every(h => h.stamina === 0);
    document.getElementById('hero-count').innerText = heroes.length + '人' + (allTired ? '（休息中）' : '');
}
