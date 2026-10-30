/* ==========================================
 * システム補助・セーブ/ロード・ログ
 * ========================================== */
function addLog(text, className = '') {
    const logSec = document.getElementById('log-section');
    if (!logSec) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${className}`;
    entry.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
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
            currentEra,
            board,
            inventory,
            gold,
            heroes,
            tavernUnlocked: FACILITIES.tavern.unlocked,
            eras: ERAS
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
        currentEra = parsed.currentEra || 'primal';
        board = parsed.board || Array(SIZE * SIZE).fill(null);
        inventory = parsed.inventory || {};
        gold = parsed.gold ?? 50;
        heroes = parsed.heroes || [];
        if (parsed.tavernUnlocked !== undefined) {
            FACILITIES.tavern.unlocked = parsed.tavernUnlocked;
        }
        if (parsed.eras) {
            for (let k in parsed.eras) {
                if (ERAS[k]) ERAS[k].unlocked = parsed.eras[k].unlocked;
            }
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
