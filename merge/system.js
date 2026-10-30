/* ==========================================
 * システム補助・セーブ/ロード・ログ
 * ========================================== */

/* --- 手引きモーダル制御 --- */
function openGuideModal() {
    const modal = document.getElementById('guide-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeGuideModal() {
    const modal = document.getElementById('guide-modal');
    if (modal) modal.classList.add('hidden');
}

function addLog(text, className = '') {
    const logSec = document.getElementById('log-section');
    if (!logSec) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${className}`;
    entry.innerText = `[Day ${turn}] ${text}`;
    logSec.prepend(entry);
}

function switchTab(tab) {
    const puzzleSec = document.getElementById('puzzle-section');
    const sideSec = document.getElementById('side-section');
    const btns = document.querySelectorAll('.tab-btn');

    if (tab === 'puzzle') {
        puzzleSec.classList.remove('hidden');
        sideSec.classList.remove('active');
        btns[0].classList.add('active');
        btns[1].classList.remove('active');
    } else {
        puzzleSec.classList.add('hidden');
        sideSec.classList.add('active');
        btns[0].classList.remove('active');
        btns[1].classList.add('active');
    }
}

function saveGame() {
    try {
        const saveData = {
            board,
            inventory,
            gold,
            heroes,
            turn,
            facilities: Object.fromEntries(Object.entries(FACILITIES).map(([k, f]) => [k, f.unlocked])),
            customSideMats // ★ 追加
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
        console.error('セーブ失敗', e);
    }
}

function loadGame() {
    try {
        const data = localStorage.getItem(SAVE_KEY);
        if (!data) return false;
        const parsed = JSON.parse(data);
        board = parsed.board || Array(SIZE * SIZE).fill(null);
        inventory = parsed.inventory || {};
        gold = parsed.gold ?? 50;
        heroes = parsed.heroes || [];
        turn = parsed.turn || 0;
        customSideMats = parsed.customSideMats || { up: null, down: null, left: null, right: null };
        for (const f of Object.values(FACILITIES)) f.unlocked = false;
        if (parsed.facilities) {
            for (const k in parsed.facilities) if (FACILITIES[k]) FACILITIES[k].unlocked = parsed.facilities[k];
        } else {   // 旧セーブ（時代方式）の引き継ぎ
            FACILITIES.tavern.unlocked = !!parsed.tavernUnlocked;
            if (parsed.eras && parsed.eras.copper && parsed.eras.copper.unlocked) FACILITIES.copper_mine.unlocked = true;
            if (parsed.eras && parsed.eras.iron && parsed.eras.iron.unlocked) FACILITIES.iron_mine.unlocked = true;
        }
        SIZE = Math.round(Math.sqrt(board.length)) || 5;   // セーブされた盤面の大きさに合わせる
        syncBoardSize();                                    // 施設に合わせて広げる（古いセーブも対応）
        return true;
    } catch (e) {
        console.error('ロード失敗', e);
        return false;
    }
}

/* --- ポップアップ制御 --- */
function showKingModal() {
    const modal = document.getElementById('king-modal');
    if (modal) modal.classList.remove('hidden');
}


function closeKingModal() {
    const modal = document.getElementById('king-modal');
    if (modal) modal.classList.add('hidden');

    // スマホではショップタブを表示
    switchTab('shop');

    // 最初の「勇者を雇う」ボタンを光らせる
    const hireButton = document.querySelector('#tavern-list button');

    if (hireButton) {
        hireButton.classList.add('hire-highlight');
    }
}

// 方角の資材をトグル（入っていれば外し、入っていなければ追加する。ただし最低1つは残す）
function toggleSideMat(dir, matKey) {
    // 現在のリストをコピー（デフォルト状態のものも含めて配列化）
    let current = [...sideMats(dir)];

    if (current.includes(matKey)) {
        // すでに含まれている場合：要素が1つだけなら消せないようにする
        if (current.length <= 1) {
            addLog('⚠️ どの辺も少なくとも1種類の資材を含める必要があります。', 'danger');
            return;
        }
        current = current.filter(m => m !== matKey);
    } else {
        // 含まれていない場合：追加する
        current.push(matKey);
    }

    // カスタム設定に保存
    customSideMats[dir] = current;

    // 画面・ガイドを更新してセーブ
    updateDirectionGuides();
    renderShop();
    saveGame();
    addLog(`🧭 ${DIR_JP[dir]}辺の排出資材を更新しました。`, 'event');
}