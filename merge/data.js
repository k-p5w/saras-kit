/* ==========================================
 * データ設定・定数定義
 * ========================================== */
const CONFIG = {
    completeBonus: 30,
    adventureIntervalMs: 2500,
    cardMax: 16,
};

const SAVE_KEY = 'xyz';

const CONFIG_GEAR = { buybackRate: 0.5, heroPower: 10 };

const GEAR = {
    wood_sword: { era: 'primal', name: '木剣', power: 3, cost: { wood: 10 } },
    stone_sword: { era: 'primal', name: '石剣', power: 6, cost: { stone: 15, wood: 5 } },
    copper_sword: { era: 'copper', name: '銅剣', power: 10, cost: { copper: 15, wood: 5 } },
    iron_sword: { era: 'iron', name: '鉄剣', power: 16, cost: { iron: 20, wood: 5 } },
};
const gearPower = h => (h.gear ? GEAR[h.gear].power : 0);
const canEquip = h => h.type !== 'single';   // 使い捨て勇者は装備なし
const partyPower = () => heroes.reduce((s, h) => s + CONFIG_GEAR.heroPower + gearPower(h), 0);



const MATERIALS = {
    wood: { name: '木材', sell: 2, cardBg: '#8d5524', cardBd: '#ffcc99', matBg: '#5c3a21', matFg: '#ffe0b2', matBd: '#ffb74d' },
    stone: { name: '石材', sell: 3, cardBg: '#708090', cardBd: '#dcdcdc', matBg: '#3b4c5c', matFg: '#e0f7fa', matBd: '#4dd0e1' },
    copper: { name: '銅', sell: 5, cardBg: '#d4552b', cardBd: '#ffb199', matBg: '#8a2a14', matFg: '#ffd6c9', matBd: '#ff6b4a' },
    iron: { name: '鉄', sell: 8, cardBg: '#3f3d9e', cardBd: '#b9b4ff', matBg: '#1e1b4b', matFg: '#e0deff', matBd: '#8b7cf6' },
};

const ERAS = {
    primal: { name: '原初の時代', cost: 0, unlocked: true, sides: { up: 'wood', down: 'wood', left: 'stone', right: 'stone' }, next: 'copper' },
    copper: { name: '銅の時代', cost: 150, unlocked: false, sides: { up: 'wood', down: 'copper', left: 'stone', right: 'stone' }, next: 'iron' },
    iron: { name: '鉄の時代', cost: 500, unlocked: false, sides: { up: 'wood', down: 'copper', left: 'stone', right: 'iron' }, next: null },
};

const FACILITIES = {
    tavern: { name: '酒場', cost: 50, unlocked: false, desc: '他の仲間を雇用できるようになる' }
};

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
        text: h => `💎 ${h.name}が宝箱を発見して荷物に詰めました！ (+25G)`,
        effect: (h) => { h.loot.gold += 25; },
        type: 'reward'
    },
    {
        weight: 15,
        text: h => `⛰️ ${h.name}は慎重に周囲を探索中……`,
        effect: (h) => { },
        type: ''
    }
];

const SIZE = 5;
const kanjiMap = { 1: '一', 2: '二', 4: '四', 8: '八', 16: '十六' };

// グローバル状態変数
let currentEra = 'primal';
let board = Array(SIZE * SIZE).fill(null);
let inventory = {};
let gold = 5000;
let heroes = [];
let isGameOver = false;
let adventureTimer = null;

function activeMaterials() { return [...new Set(Object.values(ERAS[currentEra].sides))]; }