function renderShop() {
    const SHOW_ALL_LOCKED = false;              // true にすると、先の時代の武具も全部グレーで表示

    // 拠点の拡張（施設）
    const facContainer = document.getElementById('facility-list');
    const costStr = c => Object.entries(c).map(([k, n]) => `${MATERIALS[k].name}${n}`).join(' ');
    facContainer.innerHTML = Object.entries(FACILITIES).map(([k, f]) => {
        if (f.unlocked) return `<div style="font-size:0.75rem; color:#81c784; padding:2px;">✔ ${f.name}（稼働中）</div>`;
        const info = costStr(f.cost) + (f.adds ? '<br>' + Object.entries(f.adds).map(([d, m]) => `${DIR_JP[d]}辺に${MATERIALS[m].name}が混ざる`).join('、') : '');
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
}
