/* ==========================================
 * システム補助・セーブ/ロード・ログ
 * ========================================== */
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
            facilities: Object.fromEntries(Object.entries(FACILITIES).map(([k, f]) => [k, f.unlocked]))
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
        for (const f of Object.values(FACILITIES)) f.unlocked = false;
        if (parsed.facilities) {
            for (const k in parsed.facilities) if (FACILITIES[k]) FACILITIES[k].unlocked = parsed.facilities[k];
        } else {   // 旧セーブ（時代方式）の引き継ぎ
            FACILITIES.tavern.unlocked = !!parsed.tavernUnlocked;
            if (parsed.eras && parsed.eras.copper && parsed.eras.copper.unlocked) FACILITIES.copper_mine.unlocked = true;
            if (parsed.eras && parsed.eras.iron && parsed.eras.iron.unlocked) FACILITIES.iron_mine.unlocked = true;
        }
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
