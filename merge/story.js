/* ==========================================
 * 討伐とクリア：ザコ（梅・竹・松）→ 魔王 → クリア
 * 依存: data.js（ENEMIES / BOSS / story）, party.js（partyPower / applyDeathPenalty）
 * ========================================== */
const BEST_KEY = SAVE_KEY + '_best';   // 最短クリアDayの記録（初期化しても残る）

const winRate = (power, enemyPower) => power / (power + enemyPower);

// いま戦える敵の種類：施設で解放済みで、倒す数が残っているもの
function huntTargets() {
    return Object.keys(ENEMIES).filter(k => {
        const e = ENEMIES[k];
        return (!e.needs || FACILITIES[e.needs].unlocked) && story.kills[k] < e.need;
    });
}
const huntDone = () => Object.keys(ENEMIES).every(k => story.kills[k] >= ENEMIES[k].need);

// ザコとの遭遇（外征イベントから呼ぶ）。勝敗は、パーティ全員の戦力で決まる
function fightEnemy(h) {
    const targets = huntTargets();
    const key = targets[Math.floor(Math.random() * targets.length)];
    const e = ENEMIES[key], power = partyPower();
    if (Math.random() < winRate(power, e.power)) {
        story.kills[key]++;
        h.loot.gold += e.reward;
        return { win: true, text: `⚔️ ${h.name}たちが${e.name}を討伐！ (+${e.reward}G) 〔${story.kills[key]}/${e.need}〕` };
    }
    applyDeathPenalty(h);   // 使い捨て以外は、持ち帰り中の戦利品が半分
    const note = h.type === 'single' ? '' : `${h.name}の戦利品が半分に！`;
    return { win: false, text: `💥 ${e.name}に敗北… ${note}（戦力${power} vs ${e.power}）` };
}

// 魔王に挑む（ボタンから）
function bossChallenge() {
    if (story.cleared || !huntDone()) return;
    const power = partyPower();
    if (Math.random() < winRate(power, BOSS.power)) { clearGame(); return; }
    heroes = heroes.filter(x => x.type !== 'single');   // 使い捨ては力尽きる
    heroes.forEach(x => { x.stamina = 0; x.idle = 0; if (x.loot) applyDeathPenalty(x); });
    addLog(`💀 ${BOSS.name}に敗れた…（戦力${power} vs ${BOSS.power}）全員が傷つき、休息に入ります。`, 'gameover');
    updateView(); renderShop(); saveGame();
}

function clearGame() {
    story.cleared = true;
    story.clearDay = turn;
    let best = null;
    try {
        best = Number(localStorage.getItem(BEST_KEY)) || null;
        if (!best || turn < best) { localStorage.setItem(BEST_KEY, String(turn)); best = turn; }
    } catch (e) { /* 記録が保存できなくても、クリアは有効 */ }
    addLog(`🏆 【クリア】${BOSS.name}を討伐しました！ Day ${turn}`, 'goddess');
    const d = document.getElementById('clear-day'), b = document.getElementById('clear-best'), m = document.getElementById('clear-modal');
    if (d) d.innerText = turn;
    if (b) b.innerText = best ? `最短記録: Day ${best}` : '';
    if (m) m.classList.remove('hidden');
    updateView(); renderShop(); saveGame();
}

function closeClearModal() {
    const m = document.getElementById('clear-modal');
    if (m) m.classList.add('hidden');
}

// ショップ欄の「討伐」表示
function renderStory() {
    const box = document.getElementById('story-list');
    if (!box) return;
    const power = partyPower();
    let html = '<div style="font-size:0.75rem; padding:2px; line-height:1.6;">' + Object.keys(ENEMIES).map(k => {
        const e = ENEMIES[k], locked = e.needs && !FACILITIES[e.needs].unlocked, done = story.kills[k] >= e.need;
        const color = done ? '#81c784' : locked ? '#777' : '#eee';
        const mark = done ? '✔' : locked ? '🔒' : '⚔️';
        const hint = locked ? `　〔${FACILITIES[e.needs].name}で解放〕` : '';
        return `<div style="color:${color}">${mark} ${e.name}（戦力${e.power}）: ${story.kills[k]}/${e.need}${hint}</div>`;
    }).join('') + '</div>';
    if (story.cleared) {
        html += `<div style="font-size:0.75rem; color:#ffd700; padding:2px;">🏆 ${BOSS.name}討伐済み（Day ${story.clearDay}）</div>`;
    } else if (huntDone()) {
        const rate = Math.round(winRate(power, BOSS.power) * 100);
        html += `<div class="shop-item era-item"><div><b>👹 ${BOSS.name}に挑む</b><br><small>戦力${power} vs ${BOSS.power}　勝率${rate}%</small></div>` +
                `<button onclick="bossChallenge()">挑む</button></div>`;
    } else {
        html += `<div style="font-size:0.7rem; color:#aaa; padding:2px;">全員を倒すと「${BOSS.name}」に挑めます。（現在の戦力: ${power}）</div>`;
    }
    box.innerHTML = html;
}
