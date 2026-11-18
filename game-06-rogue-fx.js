// DRAW LINE RUN [6/17] game-06-rogue-fx.js — レリック・カード定義、演出（揺れ・火花）、ギミック用の状態
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
let warpCount = 0;
let reviveCharges = 0;      // 一度復活
let reviveInvulnFrames = 0; // 復活直後の無敵
let freezeItemCount = 0;    // 旧:時間停止（非使用）
let freezeFrames = 0;
let freezeHoldX = 0;
let freezeHoldY = 0;
let invulnCharges = 0;      // 数秒無敵アイテム
let invulnActiveFrames = 0; // 無敵の残りフレーム
let lineExtendLevel = 0;    // 線の長さ強化 (0〜3)
const LINE_EXTEND_MAX = 3;
const ABILITIES_ENABLED = false; // 旧能力システムはオフ
const ROGUE_ENABLED = false; // レリック・カード選択と効果は無効

// --- レリック（ラン開始時・パッシブ）速乾インクなし ---
const RELIC_DEFS = {
  long_brush:  { icon: "✏️", name: "長い筆", desc: "線が長くなり、少し長く残る" },
  light_body:  { icon: "🪶", name: "軽身", desc: "落下の加速がゆるやかになる" },
  omen_eye:    { icon: "👁️", name: "予兆の瞳", desc: "レーザー・トゲの警告が長い" },
  lucky_ring:  { icon: "💫", name: "幸運の輪", desc: "リングが出現しやすい" },
  iron_boots:  { icon: "🥾", name: "鉄の靴", desc: "穴がやや狭くなる" },
  sprint:      { icon: "🪽", name: "疾走", desc: "移動速度が少し上がる" },
  insurance:   { icon: "❤️", name: "保険", desc: "致命傷を1回だけ耐える" }
};

// --- カード（途中3択・即時効果） ---
const CARD_DEFS = {
  warp:           { icon: "🌀", name: "ワープ×2", desc: "ワープを2個入手" },
  revive:         { icon: "💖", name: "一度復活", desc: "死んでも1回復活できる" },
  invuln:         { icon: "✨", name: "数秒無敵", desc: "無敵を1回分入手（ボタンで使用）" },
  emergency_line: { icon: "🖌️", name: "緊急の線", desc: "しばらく強化線が描ける" },
  clear_near:     { icon: "💥", name: "整地", desc: "近くの壁を消す" },
  seal_gimmick:   { icon: "🚫", name: "ギミック封じ", desc: "8秒間、レーザー・トゲ・風が出ない（出ているものも消える）" },
  falling_ink:    { icon: "💧", name: "落ちるインク", desc: "このラン中、線は離すと落ちて消える" },
  fixed_ink:      { icon: "📌", name: "固定インク", desc: "このラン中、線は離してもその場に固定される" },
  ability_tome:   { icon: "📜", name: "能力の書", desc: "いつでも能力選択を開けるアイテムを1つ入手（最大2）" },
  bounce_ink:     { icon: "💗", name: "弾む線", desc: "しばらくピンクの弾む線が描ける" },
  turbo_ink:      { icon: "⚡", name: "加速線", desc: "しばらく黄色い加速線が描ける" }
};

let currentRelic = null;
let rogueSelectMode = null; // "relic" | "card"
let insuranceAvailable = false;
let cardMilestonesDone = {};
let freeSelectCharges = 0; // いつでも能力選択を開ける回数
const FREE_SELECT_MAX = 2;
let bounceLineFrames = 0;   // 弾む線モード残り
let turboLineFrames = 0;    // 加速線モード残り
const SPECIAL_LINE_DURATION = 480; // 約8秒
let nearMissPopup = null;   // { t, text }
let landSquash = 0;         // 着地スクワッシュ残フレーム
let wasGrounded = false;
let runDustTick = 0;
let stageCoins = 0;         // このランのコイン
let stageDamage = 0;        // 被弾・復活回数（★判定用）
let lastClearStars = 0;
const INVULN_DURATION_FRAMES = 180; // 約3秒

// ===== 線の色（ショップ解放） =====
const LINE_COLOR_DEFS = [
  { id: "default", name: "くろいんく", color: "#1a1a1a", price: 0 },
  { id: "sky", name: "そらいろ", color: "#3ba7ff", price: 15 },
  { id: "mint", name: "ミント", color: "#3ddc97", price: 20 },
  { id: "sunset", name: "ゆうやけ", color: "#ff8a3d", price: 25 },
  { id: "pink", name: "いちご", color: "#ff5fa2", price: 30 },
  { id: "gold", name: "きんいろ", color: "#ffc933", price: 40 },
  { id: "ice", name: "こおり", color: "#a8f0ff", price: 45 },
  { id: "fire", name: "ほのお", color: "#ff4d2a", price: 55 },
  { id: "rainbow", name: "にじいろ", color: "rainbow", price: 80 }
];
function loadUnlockedLineColors() {
  try {
    const a = JSON.parse(localStorage.getItem("drawRunLineColors") || "[]");
    return Array.isArray(a) ? a : [];
  } catch (e) { return []; }
}
function saveUnlockedLineColors(arr) {
  try { localStorage.setItem("drawRunLineColors", JSON.stringify(arr)); } catch (e) {}
}
function isLineColorUnlocked(id) {
  if (id === "default") return true;
  return loadUnlockedLineColors().indexOf(id) >= 0;
}
function getSelectedLineColorId() {
  try {
    const id = localStorage.getItem("drawRunLineColor") || "default";
    return isLineColorUnlocked(id) ? id : "default";
  } catch (e) { return "default"; }
}
function setSelectedLineColorId(id) {
  try { localStorage.setItem("drawRunLineColor", id); } catch (e) {}
}
function getActiveLineColor(body) {
  if (body && body._bounce) return "#ff66aa";
  if (body && body._turbo) return "#ffe566";
  if (body && body._boosted) return "#00e5ff";
  const id = getSelectedLineColorId();
  const def = LINE_COLOR_DEFS.find((d) => d.id === id) || LINE_COLOR_DEFS[0];
  if (def.color === "rainbow") {
    const h = (Date.now() / 20 + (body ? body.position.x : 0)) % 360;
    return "hsl(" + h + ",90%,55%)";
  }
  return def.color;
}

// ===== 演出強化 =====
let shakeX = 0, shakeY = 0, shakeMag = 0;
let stylePoints = 0, styleCombo = 0, styleComboTimer = 0, nearMissCooldown = 0;
let juiceParticles = [];
let smoothCameraX = 0;
let speedLines = 0;

function addShake(mag) { shakeMag = Math.max(shakeMag, mag); }
function spawnJuice(x, y, color, n) {
  for (let i = 0; i < (n || 8); i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.5 + Math.random() * 4;
    juiceParticles.push({ x:x, y:y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:20+Math.random()*14, max:34, size:2+Math.random()*3, color:color||"#fff" });
  }
}
function updateJuice() {
  if (shakeMag > 0.05) {
    shakeX = (Math.random()-0.5)*shakeMag*2;
    shakeY = (Math.random()-0.5)*shakeMag*2;
    shakeMag *= 0.82;
  } else { shakeX = shakeY = shakeMag = 0; }
  if (styleComboTimer > 0) styleComboTimer--; else styleCombo = 0;
  if (nearMissCooldown > 0) nearMissCooldown--;
  if (speedLines > 0) speedLines--;
  for (let i = juiceParticles.length-1; i >= 0; i--) {
    const p = juiceParticles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--;
    if (p.life <= 0) juiceParticles.splice(i, 1);
  }
}
function drawJuice() {
  try { drawRunFx(); } catch (e) {}
  for (const p of juiceParticles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - cameraX + (shakeX||0), p.y + (shakeY||0), p.size, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (speedLines > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255," + (0.07 + 0.1 * (speedLines/20)) + ")";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const yy = (i * 90 + (Date.now()/8) % 90) % canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(50 + (i%3)*18, yy+5);
      ctx.stroke();
    }
    ctx.restore();
  }
}
// ===== プレイ画面の追加演出（軌跡・火花・マイルストーン・環境光） =====
let __juiceTick = 0, milestoneNext = 50, milestoneFx = null;
function spawnTrailSpark(x, y) {
  juiceParticles.push({ x: x, y: y, vx: -1 - Math.random(), vy: -0.6 - Math.random() * 1.2, life: 14, max: 14, size: 2 + Math.random() * 2, color: "#ffe566" });
}
function updateRunFx() {
  if (!player) return;
  __juiceTick++;
  if (__juiceTick % 3 === 0) {
    juiceParticles.push({ x: player.position.x - 8, y: player.position.y + 4 + (Math.random() - 0.5) * 8, vx: -0.7, vy: (Math.random() - 0.5) * 0.4, life: 16, max: 16, size: 3.5, color: "rgba(255,255,255,0.85)" });
  }
  if (score >= milestoneNext) {
    milestoneFx = { text: milestoneNext + "m", t: 0 };
    spawnJuice(player.position.x, player.position.y, "#ffe566", 16);
    addShake(2);
    milestoneNext += 50;
  }
  if (milestoneFx && ++milestoneFx.t > 70) milestoneFx = null;
}
function drawRunFx() {
  const W = canvas.width, H = canvas.height, now = Date.now();
  ctx.save();
  // 周辺を少し暗くして中央に視線を集める（加速中は強める）
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  vg.addColorStop(0, "rgba(20,40,90,0)");
  vg.addColorStop(1, "rgba(20,40,90," + (0.16 + Math.min(speedLines, 20) * 0.006) + ")");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // ふわふわ漂う光の粒
  for (let i = 0; i < 16; i++) {
    const x = (((i * 97 - cameraX * (0.12 + (i % 3) * 0.08)) % W) + W) % W;
    const y = (i * 53 + Math.sin(now / 900 + i) * 14 + H) % H;
    ctx.globalAlpha = 0.12 + 0.2 * (0.5 + 0.5 * Math.sin(now / 500 + i * 2));
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // マイルストーン表示
  if (milestoneFx) {
    const t = milestoneFx.t, pop = t < 12 ? 0.4 + 0.8 * (t / 12) : 1.2 - 0.2 * Math.min(1, (t - 12) / 8);
    ctx.globalAlpha = t > 50 ? Math.max(0, 1 - (t - 50) / 20) : 1;
    ctx.translate(W / 2, 170 - Math.min(t, 40) * 0.3); ctx.scale(pop, pop);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "900 46px 'Helvetica Neue', Arial, sans-serif";
    ctx.lineJoin = "round"; ctx.lineWidth = 8; ctx.strokeStyle = "#1a4a8a";
    ctx.strokeText(milestoneFx.text, 0, 0);
    ctx.fillStyle = "#ffe566"; ctx.fillText(milestoneFx.text, 0, 0);
  }
  ctx.restore();
}
function checkNearMissJuice() {
  if (nearMissCooldown > 0 || !player) return;
  const px = player.position.x, py = player.position.y;
  let hit = false;
  for (const w of walls) {
    const dx = px - w.position.x, dy = py - w.position.y;
    const d = Math.sqrt(dx*dx+dy*dy);
    if (d > 30 && d < 58) { hit = true; break; }
  }
  if (!hit) {
    for (const s of spikes) {
      const dx = px - s.position.x, dy = py - s.position.y;
      const d = Math.sqrt(dx*dx+dy*dy);
      if (d > 22 && d < 50) { hit = true; break; }
    }
  }
  if (hit) {
    nearMissCooldown = 45;
    styleCombo = Math.min(20, styleCombo + 1);
    styleComboTimer = 120;
    stylePoints += 10 + styleCombo * 2;
    spawnJuice(px, py, "#ffe566", 10);
    addShake(2.8);
    nearMissPopup = { t: 0, text: "NEAR MISS!" };
    // 一瞬のスロー
    if (typeof slowMoFactor !== "undefined" && slowMoFactor >= 0.99) {
      slowMoFactor = 0.45;
      setTimeout(() => { try { if (slowMoFactor < 0.99) slowMoFactor = 1; } catch (e) {} }, 180);
    }
  }
}
const FREEZE_DURATION_FRAMES = 120; // 約2秒
let abilityChoiceOpen = false;
let abilityChoiceTriggeredStart = false;
let abilityMilestonesDone = {};
let isReviving = false;
let reviveHoldX = 200;
let isCountingDown = false;
let countdownTimerId = null;

let windState = "idle"; 
let windTimer = 0;
let windDir = -1; 
const WIND_WARNING_FRAMES = 70;
const WIND_ACTIVE_FRAMES = 100;
const WIND_COOLDOWN_MIN = 260;
const WIND_COOLDOWN_MAX = 400;
let windCooldownTarget = 300;
const WARP_MAX = 3;
const WARP_DISTANCE = 450; 

let lineBoostFrames = 0;
const LINE_BOOST_DURATION = 300; 
const LINE_BOOST_MAX_LEN = baseHoleSize * 2.2;
const LINE_BOOST_THICKNESS = 32;
const LINE_NORMAL_THICKNESS = 26;
const LINE_BOOST_LIFETIME = 2200; // 落下モード時の強化線寿命
const LINE_NORMAL_LIFETIME = 1100;  // 落下モード時の通常線寿命
const LINE_FIXED_LIFETIME = 9000;   // 固定線の寿命
const LINE_FIXED_BOOST_LIFETIME = 12000; // 固定・強化線の寿命

let spikeState = "idle"; 
let spikeTimer = 0;
let pendingSpikeX = 0; 

let groundSpikeState = "idle"; 
let groundSpikeTimer = 0;
let groundSpikeX = 0;
let groundSpikeHeight = 0; 
const GS_WARNING_FRAMES = 50;  
const GS_POP_FRAMES = 40;
const GS_COOLDOWN_MIN = 280;
const GS_COOLDOWN_MAX = 420;
let gsCooldownTarget = 320;
let groundSpikeBody = null;

let slowMoFactor = 1;
const SPIKE_WARNING_FRAMES = 60;  
const SPIKE_FALL_FRAMES = 90;
const SPIKE_COOLDOWN_MIN = 240;
const SPIKE_COOLDOWN_MAX = 420;
let spikeCooldownTarget = 300;

let currentX = 0;
const segmentWidth = 400; 
let lastObstacleX = 0;

