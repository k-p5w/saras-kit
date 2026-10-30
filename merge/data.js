/* ==========================================
 * データ設定・定数定義
 * ========================================== */
const CONFIG = {
    completeBonus: 1000,   // 完走ボーナス（難しいぶん多め）
    harvestRate: 16,      // 漢数字を回収したとき、表示の値 × この数だけ資材がもらえる
    cardMax: 16,
    staminaMax: 3,   // 勇者の行動力の最大値（動くと1減る）
    regenDays: 2,    // 動かなかった日がこの回数たまると、行動力が1回復
};

const SAVE_KEY = 'xyz';

const CONFIG_GEAR = { buybackRate: 0.5, heroPower: 10 };

const GEAR = {
    wood_sword: { needs: null, name: '木剣', power: 3, cost: { wood: 10 } },
    stone_sword: { needs: null, name: '石剣', power: 6, cost: { stone: 15, wood: 5 } },
    copper_sword: { needs: 'copper_mine', name: '銅剣', power: 10, cost: { copper: 15, wood: 5 } },
    iron_sword: { needs: 'iron_mine', name: '鉄剣', power: 16, cost: { iron: 20, wood: 5 } },
};

/* ==========================================
 * 勇者・仲間の雇用データ
 * ========================================== */
const HERO_TYPES = {
    single: { name: '新人勇者', desc: '外征1回', cost: 25, type: 'single' },
    permanent: { name: '勇者', desc: '永久雇用', cost: 100, type: 'permanent' },
    soldier: { name: '傭兵', desc: '酒場仲間', cost: 50, type: 'soldier', needs: 'tavern' },
    mage: { name: '魔法使い', desc: '酒場仲間', cost: 75, type: 'mage', needs: 'tavern' },
    priest: { name: '僧侶', desc: '酒場仲間', cost: 120, type: 'priest', needs: 'tavern' }
};

const MATERIALS = {
    wood: { name: '木材', sell: 2, cardBg: '#8d5524', cardBd: '#ffcc99', matBg: '#5c3a21', matFg: '#ffe0b2', matBd: '#ffb74d' },
    stone: { name: '石材', sell: 3, cardBg: '#708090', cardBd: '#dcdcdc', matBg: '#3b4c5c', matFg: '#e0f7fa', matBd: '#4dd0e1' },
    copper: { name: '銅', sell: 5, start: [2], cardBg: '#d4552b', cardBd: '#ffb199', matBg: '#8a2a14', matFg: '#ffd6c9', matBd: '#ff6b4a' },
    iron: { name: '鉄', sell: 8, start: [2], cardBg: '#3f3d9e', cardBd: '#b9b4ff', matBg: '#1e1b4b', matFg: '#e0deff', matBd: '#8b7cf6' },
};


// 辺ごとの初期の素材（古い順）
const BASE_SIDES = { up: ['wood'], down: ['wood'], left: ['stone'], right: ['stone'] };
const DIR_JP = { up: '上', down: '下', left: '左', right: '右' };

// 拠点の施設：資材で建てる。adds があれば、建てたあと、その辺に素材が混ざる
const FACILITIES = {
    tavern: { name: '酒場', cost: { wood: 100, stone: 60 }, unlocked: false, desc: '他の仲間を雇用できるようになる' },
    copper_mine: { name: '採掘所（銅）', cost: { wood: 120, stone: 80 }, unlocked: false, boardSize: 6, desc: '銅資源の解放（パズルに銅が追加され、盤面が6×6に広がります）', adds: { down: 'copper',up: 'copper' } },
    iron_mine: { name: '採掘所（鉄）', cost: { copper: 60, stone: 150 }, unlocked: false, desc: '鉄資源の解放（パズルに鉄が追加されます）', adds: { right: 'iron',left: 'iron' }, needs: 'copper_mine' },
    direction_altar: { name: '地脈調整炉', cost: { stone: 200, copper: 100 }, unlocked: false, desc: '上下左右の各方角から出現する資材をカスタマイズできる', needs: 'copper_mine' }
};
const gearOpen = g => !g.needs || FACILITIES[g.needs].unlocked;
const facAvailable = f => !f.unlocked && (!f.needs || FACILITIES[f.needs].unlocked);

// 施設で決まる、盤面の大きさ（boardSize を持つ施設が建っていれば、その最大値）
function targetBoardSize() {
    let n = 5;
    for (const f of Object.values(FACILITIES)) if (f.unlocked && f.boardSize) n = Math.max(n, f.boardSize);
    return n;
}
// 盤面を目標の大きさに合わせる（左上を基準に、いまのタイルはそのまま残す）。変えたら true
function syncBoardSize() {
    const n = targetBoardSize();
    if (n === SIZE && board.length === n * n) return false;
    const old = SIZE, nb = Array(n * n).fill(null);
    for (let r = 0; r < Math.min(old, n); r++) for (let c = 0; c < Math.min(old, n); c++) nb[r * n + c] = board[r * old + c] || null;
    SIZE = n; board = nb;
    return true;
}


// --- 2. カスタマイズ用の状態変数 ---
// デフォルトの辺ごとの資材構成を上書きできるカスタム設定
let customSideMats = {
    up: null,     // nullならデフォルト（sideMats基準）
    down: null,
    left: null,
    right: null
};

// 変更前：
// function sideMats(dir) { ... }

// 変更後：カスタム設定があればそれを返し、なければデフォルトを返す
function sideMats(dir) {
    // 地脈調整炉が解放されていて、かつプレイヤーがカスタム設定していればそれを返す
    if (FACILITIES.direction_altar.unlocked && customSideMats[dir] && customSideMats[dir].length > 0) {
        return customSideMats[dir];
    }

    // デフォルトの挙動
    const list = [...BASE_SIDES[dir]];
    for (const f of Object.values(FACILITIES)) {
        if (f.unlocked && f.adds && f.adds[dir]) list.push(f.adds[dir]);
    }
    return [...new Set(list)]; // 重複排除
}

// その辺から出る素材（古い順）
function sideMatsOld(dir) {
    const list = [...BASE_SIDES[dir]];
    for (const f of Object.values(FACILITIES)) if (f.unlocked && f.adds && f.adds[dir]) list.push(f.adds[dir]);
    return list;
}
function activeMaterials() { return [...new Set(['up', 'down', 'left', 'right'].flatMap(sideMats))]; }

// その辺から出る札を1枚決める。start がある素材（銅・鉄）はその値から。
// それ以外は、1辺に1種類なら値は1か2、2種類以上なら、古い素材は2・追加分は1
function rollSupply(dir) {
    const mats = sideMats(dir);
    const type = mats[Math.floor(Math.random() * mats.length)];
    const vals = MATERIALS[type].start || (mats.length === 1 ? [1, 2] : (type === mats[0] ? [2] : [1]));
    return { type, val: vals[Math.floor(Math.random() * vals.length)] };
}

/* ==========================================
 * 外征イベント（戦利品を一時保持する形式）
 * ========================================== */
const ADVENTURE_EVENTS = [
    { 
        weight: 25, 
        text: h => `⚔️ ${h.name}が魔物を撃破し、戦利品を獲得！ (+10G)`, 
        effect: (h) => { h.loot.gold += 10; }, 
        type: 'event' 
    },
    { 
        weight: 25, 
        text: h => `🌲 ${h.name}が森林で伐採を行いました！ (+3木材)`, 
        effect: (h) => { h.loot.wood += 3; }, 
        type: 'reward' 
    },
    { 
        weight: 20, 
        text: h => `⛏️ ${h.name}が岩山で採掘を行いました！ (+3石材)`, 
        effect: (h) => { h.loot.stone += 3; }, 
        type: 'reward' 
    },
    { 
        weight: 15, 
        condition: () => FACILITIES.copper_mine && FACILITIES.copper_mine.unlocked,
        text: h => `⛏️ ${h.name}が鉱山で銅を採掘しました！ (+2銅)`, 
        effect: (h) => { h.loot.copper = (h.loot.copper || 0) + 2; }, 
        type: 'reward' 
    },
    // ★ 追加：採掘所（鉄）が解放されているときだけ抽選に出る鉄採掘イベント
    { 
        weight: 10, 
        condition: () => FACILITIES.iron_mine && FACILITIES.iron_mine.unlocked,
        text: h => `⚒️ ${h.name}が深部で鉄を採掘しました！ (+1鉄)`, 
        effect: (h) => { h.loot.iron = (h.loot.iron || 0) + 1; }, 
        type: 'reward' 
    },
    { 
        weight: 15, 
        text: h => `💎 ${h.name}が宝箱を発見して荷物に詰めました！ (+25G)`, 
        effect: (h) => { h.loot.gold += 25; }, 
        type: 'reward' 
    },
    { 
        weight: 15, 
        text: h => `⛰️ ${h.name}は慎重に周囲を探索中……`, 
        effect: (h) => {}, 
        type: '' 
    }
];
let SIZE = 5;   // 盤面の大きさ（銅の採掘所で6×6に広がる）
const kanjiMap = { 1: '一', 2: '二', 4: '四', 8: '八', 16: '十六' };

// グローバル状態変数
let board = Array(SIZE * SIZE).fill(null);
let inventory = {};
let gold = 5000;
let heroes = [];
let isGameOver = false;
let turn = 0;               // 経過日数（1スワイプ＝1日）
let allResting = false;     // 全員が休息中のとき、ログを1回だけ出すための目印

