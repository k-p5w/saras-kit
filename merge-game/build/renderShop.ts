import {
    CONFIG, FACILITIES, MATERIALS, HERO_TYPES, GEAR, ENEMIES, BOSS, DIR_JP,
    gearOpen, facAvailable, unlockedMaterials, sideMats,
    inventory, gold, heroes, story,
} from './data';
import { huntDone, winRate } from './story';
import { partyPower, gearTarget, buybackOf } from './party';

export function renderShop(): void {
    renderStory();
    const full = heroes.length >= CONFIG.partyMax;
    const SHOW_ALL_LOCKED = false;

    // 施設リスト
    const facContainer = document.getElementById('facility-list');
    if (facContainer) {
        const costStr = (c: any) => Object.entries(c).map(([k, n]) => `${MATERIALS[k as keyof typeof MATERIALS].name}${n}`).join(' ');
        facContainer.innerHTML = Object.entries(FACILITIES).map(([k, f]) => {
            if (f.unlocked) return `<div style="font-size:0.75rem; color:#81c784; padding:2px;">✔ ${f.name}（稼働中）</div>`;
            const info = costStr(f.cost)
                + (f.adds ? '<br>' + Object.entries(f.adds).map(([d, m]) => `${DIR_JP[d as keyof typeof DIR_JP]}辺に${MATERIALS[m as keyof typeof MATERIALS].name}が混ざる`).join('、') : '')
                + (f.boardSize ? '<br>盤面が' + f.boardSize + '×' + f.boardSize + 'に広がる' : '');

            if (f.needs && !FACILITIES[f.needs].unlocked) {
                return `<div class="shop-item locked"><div><b>🔒 ${f.name}</b><br><small>${FACILITIES[f.needs].name}が必要<br>${info}</small></div><button disabled>未解放</button></div>`;
            }

            const lack = Object.entries(f.cost).find(([matKey, reqNum]) => (inventory[matKey as keyof typeof inventory] || 0) < (reqNum as number));
            const isLacked = !!lack;

            return `<div class="shop-item facility-item" ${isLacked ? 'style="opacity: 0.6;"' : ''}>
                <div><b>${f.name}の建築</b><br><small>${info}</small></div>
                <button onclick="buildFacility('${k}')" ${isLacked ? 'disabled' : ''}>${isLacked ? '資材不足' : '建築'}</button>
            </div>`;
        }).join('');
    }

    // 仲間雇用
    const tavernContainer = document.getElementById('tavern-list');
    if (tavernContainer) {
        let tavernHtml = '';
        for (const hData of Object.values(HERO_TYPES)) {
            if (hData.needs && !FACILITIES[hData.needs].unlocked) continue;
            const canBuy = gold >= hData.cost;
            const isTavernJob = hData.needs === 'tavern';

            tavernHtml += `
                <div class="shop-item" style="${isTavernJob ? 'border-left: 3px solid #ffb74d;' : ''} ${canBuy ? '' : 'opacity: 0.6;'}">
                    <div><b>${hData.name} (${hData.desc})</b><br><small>費用: ${hData.cost}G</small></div>
                    <button onclick="hireHero('${hData.type}', ${hData.cost}, '${hData.name}')" ${!canBuy || full ? 'disabled' : ''}>${!canBuy ? 'G不足' : full ? '満員' : '雇う'}</button>
                </div>
            `;
        }
        if (!FACILITIES.tavern.unlocked) {
            tavernHtml += `<div style="font-size:0.70rem; color:#aaa; margin-top:4px;">💡 酒場を建築すると他の仲間が雇えるようになります。</div>`;
        }
        tavernContainer.innerHTML = tavernHtml;
    }

    // 売却リスト
    const sellList = document.getElementById('sell-list');
    if (sellList) {
        sellList.innerHTML = unlockedMaterials().map(k => {
            const m = MATERIALS[k];
            return `<div class="shop-item"><div><b>${m.name}売却</b> (1個)<br><small>➔ ${m.sell} GOLD</small></div><button onclick="sellMaterial('${k}', 1)">売却</button></div>`;
        }).join('');
    }

    // 武具
    const gearList = document.getElementById('gear-list');
    if (gearList) {
        gearList.innerHTML = Object.entries(GEAR)
            .filter(([, g]) => gearOpen(g) || SHOW_ALL_LOCKED || facAvailable(FACILITIES[g.needs!]))
            .map(([k, g]) => {
                const cost = Object.entries(g.cost).map(([m, n]) => `${MATERIALS[m as keyof typeof MATERIALS].name}${n}`).join(' ');
                if (!gearOpen(g)) {
                    return `<div class="shop-item locked"><div><b>🔒 ${g.name}</b> (戦力+${g.power})<br><small>${g.needs ? FACILITIES[g.needs].name : ''}で解放<br>${cost}</small></div><button disabled>未解放</button></div>`;
                }

                const lackGear = Object.entries(g.cost).find(([matKey, reqNum]) => (inventory[matKey as keyof typeof inventory] || 0) < (reqNum as number));
                const t = gearTarget(g);
                const isDisabled = !t || !!lackGear;

                const note = !t ? '渡せる勇者がいません' : lackGear ? '資材が足りません' : t.gear ? `${t.name}の${GEAR[t.gear].name}を買い取り(+${buybackOf(t.gear)}G)` : `${t.name}に装備`;

                return `<div class="shop-item" ${isDisabled ? 'style="opacity: 0.6;"' : ''}>` +
                    `<div><b>${g.name}</b> (戦力+${g.power})<br><small>${cost}<br>${note}</small></div>` +
                    `<button onclick="craftGear('${k}')" ${isDisabled ? 'disabled' : ''}>${lackGear ? '資材不足' : !t ? '対象なし' : '作る'}</button></div>`;
            }).join('');
    }

    // 地脈調整（地脈調整炉を建てたあとに出現）
    let customContainer = document.getElementById('direction-custom-section');
    if (!customContainer) {
        const sideSec = document.getElementById('side-section');
        if (sideSec) {
            customContainer = document.createElement('div');
            customContainer.id = 'direction-custom-section';
            sideSec.appendChild(customContainer);
        }
    }
    if (customContainer) {
        customContainer.innerHTML = renderDirectionCustomizer();
    }
}

export function renderDirectionCustomizer(): string {
    const altFacility = FACILITIES.direction_altar;
    if (!altFacility || !altFacility.unlocked) return '';
    const mats = unlockedMaterials();
    let html = `<div class="shop-title" style="margin-top: 10px;">🧭 地脈調整</div>`;
    const dirNames: Record<string, string> = { up: '上辺', down: '下辺', left: '左辺', right: '右辺' };

    for (const dir of ['up', 'down', 'left', 'right'] as const) {
        const currentMats = sideMats(dir);
        html += `<div class="shop-item" style="flex-direction: column; align-items: flex-start; gap: 4px;">
            <div style="font-weight: bold;">${dirNames[dir]} の排出資材: <span style="color: #4dd0e1;">${currentMats.map(m => MATERIALS[m].name).join(', ')}</span></div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">`;
        for (const matKey of mats) {
            const isIncluded = currentMats.includes(matKey);
            html += `<button onclick="toggleSideMat('${dir}', '${matKey}')" style="background: ${isIncluded ? '#4CAF50' : '#444'}; font-size: 0.65rem; padding: 2px 6px;">${isIncluded ? '✔ ' : ''}${MATERIALS[matKey].name}</button>`;
        }
        html += `</div></div>`;
    }
    return html;
}

export function renderStory(): void {
    const box = document.getElementById('story-list');
    if (!box) return;
    const power = partyPower();
    let html = '<div style="font-size:0.75rem; padding:2px; line-height:1.6;">' + Object.keys(ENEMIES).map(k => {
        const e = ENEMIES[k];
        const locked = !!e.needs && !FACILITIES[e.needs].unlocked;
        const kills = story.kills[k] || 0;
        const done = kills >= e.need;
        const color = done ? '#81c784' : locked ? '#777' : '#eee';
        const mark = done ? '✔' : locked ? '🔒' : '⚔️';
        const hint = locked ? ` 〔${e.needs ? FACILITIES[e.needs].name : ''}で解放〕` : '';
        return `<div style="color:${color}">${mark} ${e.name}（戦力${e.power}）: ${kills}/${e.need}${hint}</div>`;
    }).join('') + '</div>';

    if (story.cleared) {
        html += `<div style="font-size:0.75rem; color:#ffd700; padding:2px;">🏆 ${BOSS.name}討伐済み（Day ${story.clearDay}）</div>`;
    } else if (huntDone()) {
        const rate = Math.round(winRate(power, BOSS.power) * 100);
        html += `<div class="shop-item era-item"><div><b>👹 ${BOSS.name}に挑む</b><br><small>戦力${power} vs ${BOSS.power} 勝率${rate}%</small></div><button onclick="bossChallenge()">挑む</button></div>`;
    } else {
        html += `<div style="font-size:0.7rem; color:#aaa; padding:2px;">全員を倒すと「${BOSS.name}」に挑めます。（現在の戦力: ${power}）</div>`;
    }
    box.innerHTML = html;
}
