/* ==========================================
 * パーティ：雇用・武具・戦力・デスペナ
 * 画面の生成は ui.js / renderShop.js に任せる（ここでは document を直接触らない）
 * ========================================== */
const gearPower = h => (h.gear ? GEAR[h.gear].power : 0);
const canEquip = h => h.type !== 'single';   // 使い捨て勇者は装備なし
const partyPower = () => heroes.reduce((s, h) => s + CONFIG_GEAR.heroPower + gearPower(h), 0);

function hireHero(type, cost, heroName) {
    const isTavernJob = (type === 'mage' || type === 'priest');
    if (isTavernJob && !FACILITIES.tavern.unlocked) {
        addLog(`酒場を建築してから雇ってください。`);
        return;
    }

    if (gold >= cost) {
        gold -= cost;
        heroes.push({ type: type, name: heroName });
        addLog(`【雇用】${heroName}を迎え入れました！`, 'event');
        updateView();
        saveGame();
    } else {
        addLog(`ゴールドが足りません。`);
    }
}

// 持たせる相手：今の武器がこの武器より弱い人のうち、いちばん弱い人
function gearTarget(g) {
    return heroes.filter(canEquip).filter(h => gearPower(h) < g.power)
        .sort((a, b) => gearPower(a) - gearPower(b))[0];
}

// 買い取り額＝旧武具の素材費(売値換算)×率
function buybackOf(key) {
    const sum = Object.entries(GEAR[key].cost).reduce((s, [k, n]) => s + n * MATERIALS[k].sell, 0);
    return Math.floor(sum * CONFIG_GEAR.buybackRate);
}

function craftGear(key) {
    const g = GEAR[key];
    if (!gearOpen(g)) return;   // 未解放の武具は作れない
    const t = gearTarget(g);
    if (!t) { addLog('武器を持たせられる勇者がいません。', 'danger'); return; }
    for (const [k, n] of Object.entries(g.cost)) {
        if ((inventory[k] || 0) < n) { addLog(`素材が足りません（${MATERIALS[k].name}${n}個）。`, 'danger'); return; }
    }
    for (const [k, n] of Object.entries(g.cost)) inventory[k] -= n;
    let msg = `🔨 ${t.name}に${g.name}を作りました！`;
    if (t.gear) {
        const back = buybackOf(t.gear);
        gold += back;
        msg = `🔨 ${t.name}の${GEAR[t.gear].name}を買い取り（+${back}G）、${g.name}を作りました！`;
    }
    t.gear = key;
    addLog(msg, 'reward');
    renderShop(); updateView(); saveGame();
}

// デスペナ：永久雇用側が負けたら、持ち帰り中の戦利品を半分に
function applyDeathPenalty(h) {
    if (h.type === 'single') return;
    for (const k of Object.keys(h.loot)) h.loot[k] = Math.floor(h.loot[k] / 2);
}
