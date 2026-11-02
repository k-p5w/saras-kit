import { MATERIALS, FACILITIES, sideMats, board, SIZE, inventory, gold, turn, heroes } from './data';
import { harvestTile } from './puzzle';

export function setTileVars(cell: HTMLElement, type: string): void {
    const m = MATERIALS[type as keyof typeof MATERIALS];
    cell.style.setProperty('--card-bg', m.cardBg);
    cell.style.setProperty('--card-bd', m.cardBd);
    cell.style.setProperty('--mat-bg', m.matBg);
    cell.style.setProperty('--mat-fg', m.matFg);
    cell.style.setProperty('--mat-bd', m.matBd);
    cell.style.setProperty('--mat-glow', m.matBd + '4d');
}

export function updateDirectionGuides(): void {
    const arrows: Record<string, string> = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' };
    for (const dir of ['up', 'down', 'left', 'right'] as const) {
        const ms = sideMats(dir).map(k => MATERIALS[k]);
        const el = document.getElementById('guide-' + dir);
        if (!el) continue;
        const last = ms[ms.length - 1];
        el.textContent = `${arrows[dir]} ${ms.map(m => m.name).join('＋')}`;
        el.style.setProperty('--chip-bg', ms.length > 1 ? `linear-gradient(135deg, ${ms.map(m => m.cardBg).join(', ')})` : last.cardBg);
        el.style.setProperty('--chip-bd', last.cardBd);
        document.getElementById('grid')?.style.setProperty('--g-' + dir, last.cardBg);
    }
}

export const kanjiMap: Record<number, string> = { 1: '一', 2: '二', 4: '四', 8: '八', 16: '十六' };

export function updateView(): void {
    const eraNameEl = document.getElementById('era-name');
    if (eraNameEl) eraNameEl.innerText = '拠点Lv.' + (1 + Object.values(FACILITIES).filter(f => f.unlocked).length);

    const gridEl = document.getElementById('grid');
    if (!gridEl) return;
    gridEl.style.setProperty('--n', String(SIZE));
    gridEl.innerHTML = '';

    board.forEach((tile, idx) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (tile) {
            if (tile.tier === 1) {
                cell.classList.add('tile-card');
                setTileVars(cell, tile.type);
                cell.innerText = String(tile.val);
            } else {
                cell.classList.add('tile-mat');
                setTileVars(cell, tile.type);
                cell.innerText = kanjiMap[tile.val] || String(tile.val);
                cell.onclick = () => harvestTile(idx);
            }
        }
        gridEl.appendChild(cell);
    });

    const invBar = document.getElementById('inv-bar');
    if (invBar) {
        invBar.innerHTML = Object.keys(MATERIALS)
            .map(k => `<div class="status-item">${MATERIALS[k as keyof typeof MATERIALS].name}: <span>${inventory[k as keyof typeof inventory] || 0}</span></div>`).join('');
    }

    const goldEl = document.getElementById('gold');
    if (goldEl) goldEl.innerText = String(gold);

    const turnEl = document.getElementById('turn');
    if (turnEl) turnEl.innerText = String(turn);

    const allTired = heroes.length > 0 && heroes.every((h: any) => h.stamina === 0);
    const heroCountEl = document.getElementById('hero-count');
    if (heroCountEl) heroCountEl.innerText = heroes.length + '人' + (allTired ? '（休息中）' : '');
}
