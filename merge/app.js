
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
    if (!ERAS[g.era].unlocked) return;   // 未解放の武具は作れない
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


/* ==========================================
 * 画面更新・ショップ・進行制御
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
    const sides = ERAS[currentEra].sides;
    const arrows = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' };
    for (const dir of ['up', 'down', 'left', 'right']) {
        const m = MATERIALS[sides[dir]];
        const el = document.getElementById('guide-' + dir);
        if (!el) continue;
        el.textContent = `${arrows[dir]} ${m.name}`;
        el.style.setProperty('--chip-bg', m.cardBg);
        el.style.setProperty('--chip-bd', m.cardBd);
        document.getElementById('grid').style.setProperty('--g-' + dir, m.cardBg);
    }
}
function renderGuide() {
    const sides = ERAS[currentEra].sides;
    const arrows = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' };
    for (const dir of ['up', 'down', 'left', 'right']) {
        const m = MATERIALS[sides[dir]];
        const el = document.getElementById('guide-' + dir);
        el.textContent = `${arrows[dir]} ${m.name}`;
        el.style.setProperty('--chip-bg', m.cardBg);
        el.style.setProperty('--chip-bd', m.cardBd);
        document.getElementById('grid').style.setProperty('--g-' + dir, m.cardBg);
    }
}

function updateView() {
    document.getElementById('era-name').innerText = ERAS[currentEra].name;

    const gridEl = document.getElementById('grid');
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
    document.getElementById('hero-count').innerText = heroes.length;
}


function buildFacility(facKey) {
    const fac = FACILITIES[facKey];
    if (gold >= fac.cost) {
        gold -= fac.cost;
        fac.unlocked = true;
        addLog(`🏗️ 【施設建築】${fac.name}を建築しました！他の仲間が雇用可能です。`, 'event');
        renderShop();
        updateView();
        saveGame();
    } else {
        addLog(`ゴールドが足りません！（必要: ${fac.cost}G）`);
    }
}

function unlockNextEra(nextEraId) {
    const eraDef = ERAS[nextEraId];
    if (gold >= eraDef.cost) {
        gold -= eraDef.cost;
        eraDef.unlocked = true;
        currentEra = nextEraId;

        addLog(`🎉 【時代の解放】${eraDef.name} に進化しました！`, 'event');
        renderShop();
        updateDirectionGuides();
        updateView();
        saveGame();
    } else {
        addLog(`ゴールドが足りません！`);
    }
}

function sellMaterial(type, amount) {
    let price = MATERIALS[type].sell * amount;
    if ((inventory[type] || 0) >= amount) {
        inventory[type] -= amount;
        gold += price;
        addLog(`【売却】${MATERIALS[type].name}x${amount} を売却 (+${price}G)`);
        updateView();
        saveGame();
    } else {
        addLog(`資材が足りません。`);
    }
}

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

function craftWeapon(weaponName, matType, cost) {
    if ((inventory[matType] || 0) >= cost) {
        inventory[matType] -= cost;
        addLog(`【クラフト】${weaponName} を作成・支給しました！`, 'event');
        updateView();
        saveGame();
    } else {
        addLog(`クラフト素材が足りません。`);
    }
}

/* ==========================================
 * 冒険（外征）ループ＆帰還一括精算
 * ========================================== */
function adventureLoop() {
    if (heroes.length === 0) return;

    let index = Math.floor(Math.random() * heroes.length);
    let h = heroes[index];

    // 初回初期化：スタミナと戦利品トランク（loot）を用意
    if (h.stamina === undefined) {
        h.stamina = (h.type === 'single') ? 3 : 10;
        h.loot = { gold: 0, wood: 0, stone: 0, copper: 0, iron: 0 };
    }

    // 行動消費
    h.stamina--;

    // イベント選定＆実行
    let totalWeight = ADVENTURE_EVENTS.reduce((sum, e) => sum + e.weight, 0);
    let rand = Math.floor(Math.random() * totalWeight);

    let selectedEvent = ADVENTURE_EVENTS[0];
    for (let evt of ADVENTURE_EVENTS) {
        if (rand < evt.weight) {
            selectedEvent = evt;
            break;
        }
        rand -= evt.weight;
    }

    selectedEvent.effect(h);
    addLog(`${selectedEvent.text(h)} (残り行動: ${h.stamina})`, selectedEvent.type);

    // ★ 帰還判定と一括受け取り処理
    if (h.stamina <= 0) {
        // トランクの中身を王国（プレイヤー）の資産に加算
        gold += h.loot.gold;
        for (let key in h.loot) {
            if (key !== 'gold' && h.loot[key] > 0) {
                inventory[key] = (inventory[key] || 0) + h.loot[key];
            }
        }

        // 帰還ログのテキスト生成
        let summary = [];
        if (h.loot.gold > 0) summary.push(`${h.loot.gold}G`);
        if (h.loot.wood > 0) summary.push(`木材x${h.loot.wood}`);
        if (h.loot.stone > 0) summary.push(`石材x${h.loot.stone}`);
        let lootStr = summary.length > 0 ? summary.join('、') : '戦利品なし';

        if (h.type === 'single') {
            addLog(`🏰 📦 【外征完了】${h.name}が無事帰還！ 獲得: [ ${lootStr} ] （任期満了により退役）`, 'reward');
        } else {
            addLog(`🏰 📦 【外征完了】${h.name}が無事帰還！ 獲得: [ ${lootStr} ] （王都で休養に入ります）`, 'reward');
        }

        // パーティから一時除外（使い捨て・永久ともに帰還完了）
        heroes.splice(index, 1);
        saveGame();
    }

    updateView();
    renderShop();
}

function initGame(isReset = false) {

    if (isReset) {
        localStorage.removeItem(SAVE_KEY);
        currentEra = 'primal';   // 最初の時代のキーに合わせてください
        inventory = {};          // constで宣言している場合は for (const k in inventory) delete inventory[k];


    }

    if (!isReset && loadGame()) {
        updateDirectionGuides();
        renderShop();
        updateView();
        if (adventureTimer) clearInterval(adventureTimer);
        adventureTimer = setInterval(adventureLoop, CONFIG.adventureIntervalMs);
        addLog('前回のセーブデータからゲームを再開しました。', 'event');
        return;
    }

    board = Array(SIZE * SIZE).fill(null);
    for (const k of Object.keys(MATERIALS)) inventory[k] = 0;   // 所持数も毎回0に戻す
    gold = 99999;
    heroes = [];
    isGameOver = false;

    // 時代・施設を最初の状態に戻す
    const firstEra = Object.keys(ERAS)[0];
    currentEra = firstEra;
    for (const [k, e] of Object.entries(ERAS)) e.unlocked = (k === firstEra);
    FACILITIES.tavern.unlocked = false;

    renderShop();
    updateDirectionGuides();

    const sides = ERAS[currentEra].sides;
    spawnTile(sides.up);
    spawnTile(sides.left);
    updateView();

    if (adventureTimer) clearInterval(adventureTimer);
    adventureTimer = setInterval(adventureLoop, CONFIG.adventureIntervalMs);

    // ログ書き込み
    addLog('👑 王様：「あなたは王様です。まず、勇者を雇い、冒険に出てもらいましょう！」', 'event');

    // リセットor初回時に表示
    showKingModal();

    saveGame();
}

function resetGame() {
    initGame(true);
    addLog('【リセット】盤面とステータスを初期化しました。', 'event');
}

// ゲーム起動
initGame();