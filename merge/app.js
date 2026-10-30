/* app.js：施設・時代・売却・冒険ループ・初期化（最後に読み込む）
 * 依存: data.js / system.js / puzzle.js / party.js / ui.js / renderShop.js */


// 資材を半分にして盤面をリセットする（コンティニュー）関数
function resetBoardWithPenalty() {
    // 1. 所持している全資材を半分にする（小数切り捨て）
    for (const k in inventory) {
        inventory[k] = Math.floor(inventory[k] / 2);
        // 0になったら消す、またはそのままでもOK
        if (inventory[k] <= 0) delete inventory[k];
    }

    // 2. 盤面（board）を初期化する
    board = Array(SIZE * SIZE).fill(null);
    
    // 3. ゲームオーバーフラグを解除して、新しいタイルを配る
    isGameOver = false;
    spawnTile('up');
    spawnTile('left');

    // 4. 画面を更新してセーブ
    updateView();
    saveGame();

    addLog('⚠️ 代償として資材が半分になりましたが、盤面がリセットされ冒険を継続します！', 'warning');
}

/* ==========================================
 * 施設・時代・売却
 * ========================================== */

function buildFacility(facKey) {
    const fac = FACILITIES[facKey];
    if (!facAvailable(fac)) return;
    const lack = Object.entries(fac.cost).find(([k, n]) => (inventory[k] || 0) < n);
    if (lack) { addLog(`資材が足りません！（${MATERIALS[lack[0]].name}${lack[1]}個が必要）`, 'danger'); return; }
    for (const [k, n] of Object.entries(fac.cost)) inventory[k] -= n;
    fac.unlocked = true;
    if (syncBoardSize()) addLog(`🗺️ 盤面が${SIZE}×${SIZE}に広がりました！`, 'event');
    addLog(`🏗️ 【施設建築】${fac.name}を建築しました！${fac.adds ? '盤面に新しい素材が混ざります。' : '他の仲間が雇用可能です。'}`, 'event');
    renderShop();
    updateDirectionGuides();
    updateView();
    saveGame();
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

/* ==========================================
 * 冒険（外征）ループ＆帰還一括精算
 * ========================================== */
// 外征の準備：行動力と戦利品トランク（loot）を用意する
function startExpedition(h) {
    h.stamina = CONFIG.staminaMax;
    h.loot = { gold: 0, wood: 0, stone: 0, copper: 0, iron: 0 };
    h.idle = 0;
}

// 1スワイプ＝1日。行動力がある勇者の中から、行動力が高い人ほど選ばれやすく、1人だけ動く
function adventureLoop() {
    turn++;
    if (heroes.length === 0) return;

    for (const x of heroes) {
        if (x.stamina === undefined) startExpedition(x);
        else if (x.stamina > CONFIG.staminaMax) x.stamina = CONFIG.staminaMax;
    }
    const ready = heroes.filter(x => x.stamina > 0);
    let h = null;
    if (ready.length > 0) {
        let r = Math.random() * ready.reduce((sum, x) => sum + x.stamina, 0);
        h = ready.find(x => (r -= x.stamina) < 0) || ready[ready.length - 1];
    }

    // 動かなかった勇者は、一定日数ごとに行動力が1回復（使い捨ては回復しない）
    for (const x of heroes) {
        if (x === h || x.type === 'single' || x.stamina >= CONFIG.staminaMax) continue;
        x.idle = (x.idle || 0) + 1;
        if (x.idle >= CONFIG.regenDays) { x.stamina++; x.idle = 0; }
    }

    // 全員の行動力が0なら、その日は休息
    if (!h) {
        if (!allResting) { allResting = true; addLog('😴 勇者たちは休息中…（行動力が回復するまで待機）'); }
        updateView();
        return;
    }
    allResting = false;
    h.idle = 0;
    let index = heroes.indexOf(h);

    // 行動消費
    h.stamina--;

    // イベント選定＆実行（condition があるイベントは、条件を満たすときだけ抽選に入る）
    const pool = ADVENTURE_EVENTS.filter(e => !e.condition || e.condition());
    let totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
    let rand = Math.floor(Math.random() * totalWeight);

    let selectedEvent = pool[0];
    for (let evt of pool) {
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
if (h.loot.wood > 0) summary.push(`木材x${h.loot.wood}`);
        if (h.loot.stone > 0) summary.push(`石材x${h.loot.stone}`);
        if (h.loot.copper > 0) summary.push(`銅x${h.loot.copper}`);
        if (h.loot.iron > 0) summary.push(`鉄x${h.loot.iron}`); // ★ 鉄の表示を追加
        let lootStr = summary.length > 0 ? summary.join('、') : '戦利品なし';

        if (h.type === 'single') {
            addLog(`🏰 📦 【外征完了】${h.name}が無事帰還！ 獲得: [ ${lootStr} ] （任期満了により退役）`, 'reward');
        } else {
            addLog(`🏰 📦 【外征完了】${h.name}が無事帰還！ 獲得: [ ${lootStr} ] （王都で休養に入ります）`, 'reward');
        }

        if (h.type === 'single') {
            heroes.splice(index, 1);        // 使い捨ては退役
        } else {
            h.loot = { gold: 0, wood: 0, stone: 0, copper: 0, iron: 0 };   // 永久雇用は戦利品を渡し、行動力の回復を待つ（武具は持ったまま）
        }
        saveGame();
    }

    updateView();
    renderShop();
}

function initGame(isReset = false) {

    if (isReset) {
        localStorage.removeItem(SAVE_KEY);
        inventory = {};          // constで宣言している場合は for (const k in inventory) delete inventory[k];

    }

    if (!isReset && loadGame()) {
        updateDirectionGuides();
        renderShop();
        updateView();
        addLog('前回のセーブデータからゲームを再開しました。', 'event');
        return;
    }

    SIZE = 5;   // 新しいゲームは5×5から
    board = Array(SIZE * SIZE).fill(null);
    for (const k of Object.keys(MATERIALS)) inventory[k] = 0;   // 所持数も毎回0に戻す
    gold = 100;
    heroes = [];
    turn = 0;
    allResting = false;
    isGameOver = false;

    // 施設を最初の状態に戻す
    for (const f of Object.values(FACILITIES)) f.unlocked = false;

    renderShop();
    updateDirectionGuides();

    spawnTile('up');
    spawnTile('left');
    updateView();

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