function renderShop() {
    const SHOW_ALL_LOCKED = false;              // true にすると、先の時代の武具も全部グレーで表示

    // 拠点の拡張（施設）
    const facContainer = document.getElementById('facility-list');
    const costStr = c => Object.entries(c).map(([k, n]) => `${MATERIALS[k].name}${n}`).join(' ');
    facContainer.innerHTML = Object.entries(FACILITIES).map(([k, f]) => {
        if (f.unlocked) return `<div style="font-size:0.75rem; color:#81c784; padding:2px;">✔ ${f.name}（稼働中）</div>`;
        const info = costStr(f.cost) + (f.adds ? '<br>' + Object.entries(f.adds).map(([d, m]) => `${DIR_JP[d]}辺に${MATERIALS[m].name}が混ざる`).join('、') : '') + (f.boardSize ? '<br>盤面が' + f.boardSize + '×' + f.boardSize + 'に広がる' : '');
        if (f.needs && !FACILITIES[f.needs].unlocked) {
            return `<div class="shop-item locked"><div><b>🔒 ${f.name}</b><br><small>${FACILITIES[f.needs].name}が必要<br>${info}</small></div><button disabled>未解放</button></div>`;
        }
        return `<div class="shop-item facility-item"><div><b>${f.name}の建築</b><br><small>${info}</small></div><button onclick="buildFacility('${k}')">建築</button></div>`;
    }).join('');

    // 仲間雇用
    const tavernContainer = document.getElementById('tavern-list');
    let tavernHtml = `
    <div class="shop-item">
        <div><b>使い捨て勇者 (外征1回)</b><br><small>費用: 25G</small></div>
        <button onclick="hireHero('single', 25, '使い捨て勇者')">雇う</button>
    </div>
    <div class="shop-item">
        <div><b>王国の勇者（永久雇用）</b><br><small>費用: 100G</small></div>
        <button onclick="hireHero('permanent', 100, '王国の勇者')">雇う</button>
    </div>
`;
    if (FACILITIES.tavern.unlocked) {
        tavernHtml += `
            <div class="shop-item" style="border-left: 3px solid #ffb74d;">
                <div><b>魔法使い (酒場仲間)</b><br><small>費用: 75G</small></div>
                <button onclick="hireHero('mage', 75, '魔法使い')">雇う</button>
            </div>
            <div class="shop-item" style="border-left: 3px solid #ffb74d;">
                <div><b>僧侶 (酒場仲間)</b><br><small>費用: 120G</small></div>
                <button onclick="hireHero('priest', 120, '僧侶')">雇う</button>
            </div>
        `;
    } else {
        tavernHtml += `<div style="font-size:0.70rem; color:#aaa; margin-top:4px;">💡 酒場を建築すると「魔法使い」や「僧侶」などの他の仲間が雇えるようになります。</div>`;
    }
    tavernContainer.innerHTML = tavernHtml;

    // 売却リスト
    document.getElementById('sell-list').innerHTML = activeMaterials().map(k => {
        const m = MATERIALS[k];
        return `<div class="shop-item"><div><b>${m.name}売却</b> (1個)<br><small>➔ ${m.sell} GOLD</small></div>` +
            `<button onclick="sellMaterial('${k}', 1)">売却</button></div>`;
    }).join('');

    // 武具（未解放の次の時代の武具は、グレーで先に見せる）
    document.getElementById('gear-list').innerHTML = Object.entries(GEAR)
        .filter(([, g]) => gearOpen(g) || SHOW_ALL_LOCKED || facAvailable(FACILITIES[g.needs]))
        .map(([k, g]) => {
            const cost = Object.entries(g.cost).map(([m, n]) => `${MATERIALS[m].name}${n}`).join(' ');

            // 未解放：グレー表示＋ボタン無効
            if (!gearOpen(g)) {
                return `<div class="shop-item locked"><div><b>🔒 ${g.name}</b> (戦力+${g.power})<br>` +
                    `<small>${FACILITIES[g.needs].name}で解放<br>${cost}</small></div>` +
                    `<button disabled>未解放</button></div>`;
            }

            const t = gearTarget(g);
            const note = !t ? '渡せる勇者がいません'
                : t.gear ? `${t.name}の${GEAR[t.gear].name}を買い取り(+${buybackOf(t.gear)}G)`
                    : `${t.name}に装備`;
            return `<div class="shop-item"><div><b>${g.name}</b> (戦力+${g.power})<br><small>${cost}<br>${note}</small></div>` +
                `<button onclick="craftGear('${k}')">作る</button></div>`;
        }).join('');


        // ★ 最後に地脈調整カスタムUIを差し込む（専用のコンテナをHTMLに作るか、既存のside-sectionに追加する）
    let customContainer = document.getElementById('direction-custom-section');
    if (!customContainer) {
        // もしHTML側に専用枠がなければ自動生成してside-sectionの末尾に追加
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


function renderShop3() {
    const SHOW_ALL_LOCKED = false;              // true にすると、先の時代の武具も全部グレーで表示

    // -------------------------------------------------------------
    // ① 拠点の拡張（施設）の描画 ＆ コスト不足時の制御
    // -------------------------------------------------------------
    const facContainer = document.getElementById('facility-list');
    const costStr = c => Object.entries(c).map(([k, n]) => `${MATERIALS[k].name}${n}`).join(' ');

    facContainer.innerHTML = Object.entries(FACILITIES).map(([k, f]) => {
        if (f.unlocked) return `<div style="font-size:0.75rem; color:#81c784; padding:2px;">✔ ${f.name}（稼働中）</div>`;
        const info = costStr(f.cost) + (f.adds ? '<br>' + Object.entries(f.adds).map(([d, m]) => `${DIR_JP[d]}辺に${MATERIALS[m].name}が混ざる`).join('、') : '') + (f.boardSize ? '<br>盤面が' + f.boardSize + '×' + f.boardSize + 'に広がる' : '');

        // 前提施設が未解放の場合
        if (f.needs && !FACILITIES[f.needs].unlocked) {
            return `<div class="shop-item locked"><div><b>🔒 ${f.name}</b><br><small>${FACILITIES[f.needs].name}が必要<br>${info}</small></div><button disabled>未解放</button></div>`;
        }

        // ★ 資材不足の判定を追加
        const lack = Object.entries(f.cost).find(([matKey, reqNum]) => (inventory[matKey] || 0) < reqNum);
        const isLacked = !!lack;

        return `<div class="shop-item facility-item" ${isLacked ? 'style="opacity: 0.6;"' : ''}>
            <div><b>${f.name}の建築</b><br><small>${info}</small></div>
            <button onclick="buildFacility('${k}')" ${isLacked ? 'disabled' : ''}>${isLacked ? '資材不足' : '建築'}</button>
        </div>`;
    }).join('');

    // -------------------------------------------------------------
    // ② 仲間雇用ボタン ＆ ゴールド不足時の制御
    // -------------------------------------------------------------
    // 仲間雇用（data.js の HERO_TYPES から動的生成）
    const tavernContainer = document.getElementById('tavern-list');
    let tavernHtml = '';

    for (const [typeKey, hData] of Object.entries(HERO_TYPES)) {
        // 酒場が必要な仲間で、まだ酒場が未解放ならスキップ
        if (hData.needs && !FACILITIES[hData.needs].unlocked) continue;

        const canBuy = gold >= hData.cost;
        const isTavernJob = hData.needs === 'tavern';

        tavernHtml += `
            <div class="shop-item" style="${isTavernJob ? 'border-left: 3px solid #ffb74d;' : ''} ${canBuy ? '' : 'opacity: 0.6;'}">
                <div><b>${hData.name} (${hData.desc})</b><br><small>費用: ${hData.cost}G</small></div>
                <button onclick="hireHero('${hData.type}', ${hData.cost}, '${hData.name}')" ${canBuy ? '' : 'disabled'}>${canBuy ? '雇う' : 'G不足'}</button>
            </div>
        `;
    }

    // 酒場が未解放のときの説明書き
    if (!FACILITIES.tavern.unlocked) {
        tavernHtml += `<div style="font-size:0.70rem; color:#aaa; margin-top:4px;">💡 酒場を建築すると「魔法使い」や「僧侶」などの他の仲間が雇えるようになります。</div>`;
    }

    tavernContainer.innerHTML = tavernHtml;

    // 売却リスト
    document.getElementById('sell-list').innerHTML = activeMaterials().map(k => {
        const m = MATERIALS[k];
        return `<div class="shop-item"><div><b>${m.name}売却</b> (1個)<br><small>➔ ${m.sell} GOLD</small></div>` +
            `<button onclick="sellMaterial('${k}', 1)">売却</button></div>`;
    }).join('');

    // 武具（未解放の次の時代の武具は、グレーで先に見せる ＋ コスト/対象不足チェック）
    document.getElementById('gear-list').innerHTML = Object.entries(GEAR)
        .filter(([, g]) => gearOpen(g) || SHOW_ALL_LOCKED || facAvailable(FACILITIES[g.needs]))
        .map(([k, g]) => {
            const cost = Object.entries(g.cost).map(([m, n]) => `${MATERIALS[m].name}${n}`).join(' ');

            // 未解放：グレー表示＋ボタン無効
            if (!gearOpen(g)) {
                return `<div class="shop-item locked"><div><b>🔒 ${g.name}</b> (戦力+${g.power})<br>` +
                    `<small>${FACILITIES[g.needs].name}で解放<br>${cost}</small></div>` +
                    `<button disabled>未解放</button></div>`;
            }

            // ★ 武具作成の資材不足・対象不足チェック
            const lackGear = Object.entries(g.cost).find(([matKey, reqNum]) => (inventory[matKey] || 0) < reqNum);
            const t = gearTarget(g);
            const isDisabled = !t || !!lackGear;

            const note = !t ? '渡せる勇者がいません'
                : lackGear ? '資材が足りません'
                    : t.gear ? `${t.name}の${GEAR[t.gear].name}を買い取り(+${buybackOf(t.gear)}G)`
                        : `${t.name}に装備`;

            return `<div class="shop-item" ${isDisabled ? 'style="opacity: 0.6;"' : ''}>` +
                `<div><b>${g.name}</b> (戦力+${g.power})<br><small>${cost}<br>${note}</small></div>` +
                `<button onclick="craftGear('${k}')" ${isDisabled ? 'disabled' : ''}>${lackGear ? '資材不足' : !t ? '対象なし' : '作る'}</button></div>`;
        }).join('');
}

// renderShop.js の中、または末尾に追加
function renderDirectionCustomizer() {
    // 地脈調整炉が未解放なら非表示
    const altFacility = FACILITIES.direction_altar;
    if (!altFacility || !altFacility.unlocked) return '';

    // 現在解放されている全素材のリスト（木・石・銅・鉄など、開放済みのもの）
    const unlockedMats = activeMaterials();

    let html = `<div class="shop-title" style="margin-top: 10px;">🧭 地脈調整（方角別資材カスタマイズ）</div>`;
    
    const dirNames = { up: '上辺', down: '下辺', left: '左辺', right: '右辺' };

    for (const dir of ['up', 'down', 'left', 'right']) {
        const currentMats = sideMats(dir);
        
        html += `<div class="shop-item" style="flex-direction: column; align-items: flex-start; gap: 4px;">
            <div style="font-weight: bold;">${dirNames[dir]} の排出資材: <span style="color: #4dd0e1;">${currentMats.map(m => MATERIALS[m].name).join(', ')}</span></div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">`;
        
        // 解放されている全素材から、この方角に含めるかどうかを選ぶボタン群
        for (const matKey of unlockedMats) {
            const isIncluded = currentMats.includes(matKey);
            html += `<button onclick="toggleSideMat('${dir}', '${matKey}')" style="background: ${isIncluded ? '#4CAF50' : '#444'}; font-size: 0.65rem; padding: 2px 6px;">
                ${isIncluded ? '✔ ' : ''}${MATERIALS[matKey].name}
            </button>`;
        }

        html += `</div></div>`;
    }
    return html;
}