// DRAW LINE RUN [11/17] game-11-rogue.js — クリア／失敗演出・レリック／カード選択
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
// ===== クリア／失敗演出 =====
let resultFx = [];
function spawnResultFx(isClear) {
  resultFx = [];
  const colors = isClear
    ? ["#33ff99", "#ffe566", "#7ee0ff", "#ffffff", "#ff9fd0"]
    : ["#ff5555", "#ff8844", "#aaaaaa", "#ff3333"];
  for (let i = 0; i < 48; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 6;
    resultFx.push({
      x: canvas.width / 2,
      y: canvas.height / 2 - 20,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - 2,
      life: 50 + Math.floor(Math.random() * 30),
      color: colors[i % colors.length],
      size: 3 + Math.random() * 5
    });
  }
}
function updateAndDrawResultFx() {
  if (!resultFx.length) return;
  for (let i = resultFx.length - 1; i >= 0; i--) {
    const p = resultFx[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.life--;
    if (p.life <= 0) {
      resultFx.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = Math.min(1, p.life / 30);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function isNightSkyStage() {
  return currentConfig && currentConfig.mainStage === 3;
}
function canUseAbilityChoice() {
  // 旧システム
  if (ABILITIES_ENABLED) {
    if (!currentConfig) return false;
    if (currentMode === "score") return true;
    return currentConfig.mainStage >= 3;
  }
  return false;
}
function canUseRogueCards() {
  return ROGUE_ENABLED && !!currentConfig;
}

function updateInvulnButtonUI() {
  const btn = document.getElementById("invuln-button");
  const countEl = document.getElementById("invuln-count");
  if (countEl) countEl.textContent = String(invulnCharges);
  if (btn) {
    btn.classList.toggle("disabled", invulnCharges <= 0 && invulnActiveFrames <= 0);
    const show = gameStarted && !gameOver && !gameCleared && !abilityChoiceOpen;
    btn.style.display = ((ROGUE_ENABLED || ABILITIES_ENABLED) && show && (invulnCharges > 0 || invulnActiveFrames > 0)) ? "flex" : "none";
    if (invulnActiveFrames > 0) {
      btn.style.borderColor = "rgba(255, 220, 80, 0.95)";
      btn.style.boxShadow = "0 0 16px rgba(255, 200, 60, 0.55)";
    } else {
      btn.style.borderColor = "rgba(255, 180, 60, 0.85)";
      btn.style.boxShadow = "0 0 12px rgba(255, 160, 40, 0.35)";
    }
  }
  try { updateFreeSelectButtonUI(); } catch (e) {}
  try { updatePauseButtonUI(); } catch (e) {}
}

// ===== 能力の書：いつでもカード選択を開ける（以前はボタン処理が無く、取っても使えなかった） =====
function updateFreeSelectButtonUI() {
  const btn = document.getElementById("free-select-button");
  if (!btn) return;
  const cnt = document.getElementById("free-select-count");
  if (cnt) cnt.textContent = String(freeSelectCharges || 0);
  const show = gameStarted && !gameOver && !gameCleared && !abilityChoiceOpen && !isReviving && !isCountingDown && (freeSelectCharges || 0) > 0;
  btn.style.display = show ? "flex" : "none";
  if (!show) return;
  const inv = document.getElementById("invuln-button");
  if (inv && inv.style.top) btn.style.top = inv.style.top; // 重力反転時の上下移動に合わせる
  // ワープ・無敵ボタンと重ならない位置へ（表示中のボタンの右側の空きに置く）
  const others = ["warp-button", "invuln-button"].map((id) => document.getElementById(id)).filter((e) => e && e.offsetWidth > 0);
  const w = btn.offsetWidth || 56;
  for (let left = 12; left <= 330; left += 64) {
    const hit = others.some((o) => left < o.offsetLeft + o.offsetWidth + 6 && left + w + 6 > o.offsetLeft);
    if (!hit) { btn.style.left = left + "px"; break; }
  }
}
function useFreeSelect() {
  if (gamePaused) return;
  if (!gameStarted || gameOver || gameCleared || abilityChoiceOpen || isReviving || isCountingDown) return;
  if ((freeSelectCharges || 0) <= 0) return;
  freeSelectCharges--;
  updateFreeSelectButtonUI();
  try { playButtonSfx(); } catch (e) {}
  openRogueSelect("card");
}
function initFreeSelectButton() {
  if (document.getElementById("free-select-button")) return;
  const host = document.getElementById("game-container") || document.body;
  const btn = document.createElement("button");
  btn.id = "free-select-button";
  btn.type = "button";
  btn.setAttribute("aria-label", "能力の書");
  btn.style.cssText = "position:absolute;left:136px;top:96px;width:56px;height:56px;border:3px solid #fff;border-radius:16px;background:linear-gradient(180deg,#d8b8ff,#9b6dff 55%,#7a4ae0);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:40;cursor:pointer;padding:4px;color:#fff;font-size:11px;font-weight:900;font-family:inherit;box-shadow:0 3px 0 #4a2a9a,0 0 12px rgba(150,100,255,.35);-webkit-tap-highlight-color:transparent;user-select:none;";
  btn.innerHTML = '<span style="font-size:18px;line-height:1">📜</span><span id="free-select-count">0</span>';
  const h = (e) => { e.preventDefault(); e.stopPropagation(); useFreeSelect(); };
  btn.addEventListener("click", h);
  btn.addEventListener("touchstart", h, { passive: false });
  host.appendChild(btn);
}

function useInvulnItem() {
  if (!ROGUE_ENABLED && !ABILITIES_ENABLED) return;
  if (!gameStarted || gameOver || gameCleared || abilityChoiceOpen || isReviving) return;
  if (invulnActiveFrames > 0) return;
  if (invulnCharges <= 0) return;
  invulnCharges--;
  invulnActiveFrames = INVULN_DURATION_FRAMES;
  updateInvulnButtonUI();
  try { addShake(3); spawnJuice(player.position.x, player.position.y, "#ffd24d", 14); } catch (e) {}
  try { playButtonSfx(); } catch (e) {}
}


// ギミック封じ：一定時間、新しいギミックが出なくなり、出ている警告・攻撃も消える
function activateGimmickSeal() {
  gimmickSuppressFrames = SEAL_DURATION_FRAMES;
  // いま出ているギミックを止める（activeGimmick も解放する）
  try {
    laserState = "idle"; laserTimer = 0; endGimmick("laser");
    if (spikeState === "warning") { spikeState = "idle"; spikeTimer = 0; endGimmick("spike"); }
    if (groundSpikeState === "warning") {
      groundSpikeState = "idle"; groundSpikeTimer = 0; groundSpikeHeight = 0;
      slowMoFactor = 1; // 警告中は時間が遅くなっているので必ず戻す
      endGimmick("groundSpike");
    }
    if (windState === "warning" || windState === "active") { windState = "idle"; windTimer = 0; endGimmick("wind"); }
  } catch (e) {}
  sealFxPending = true; // 次の描画フレームから発動演出を開始
  try {
    spawnJuice(player.position.x, player.position.y, "#66e0ff", 24);
    addShake(3);
  } catch (e) {}
}

function applyAbilityChoice(kind) {
  if (!ABILITIES_ENABLED) return;
  if (kind === "warp") {
    warpCount = Math.min(WARP_MAX, warpCount + 2);
    updateWarpButtonUI();
  } else if (kind === "revive") {
    reviveCharges += 1;
  } else if (kind === "invuln") {
    invulnCharges += 1;
    updateInvulnButtonUI();
  } else if (kind === "line_extend") {
    lineExtendLevel = Math.min(LINE_EXTEND_MAX, (lineExtendLevel || 0) + 1);
  }
  try { recordStat("ability", kind); } catch (e) {}
}

function applyRelic(kind) {
  if (!RELIC_DEFS[kind]) return;
  currentRelic = kind;
  insuranceAvailable = (kind === "insurance");
  try { recordStat("ability", "relic_" + kind); } catch (e) {}
}

function applyCard(kind) {
  if (!CARD_DEFS[kind]) return;
  if (kind === "warp") {
    warpCount = Math.min(WARP_MAX, warpCount + 2);
    updateWarpButtonUI();
  } else if (kind === "revive") {
    reviveCharges += 1;
  } else if (kind === "invuln") {
    invulnCharges += 1;
    updateInvulnButtonUI();
  } else if (kind === "emergency_line") {
    lineBoostFrames = LINE_BOOST_DURATION * 2;
  } else if (kind === "clear_near") {
    const px = player ? player.position.x : 0;
    for (let i = walls.length - 1; i >= 0; i--) {
      if (Math.abs(walls[i].position.x - px) < 420) {
        try { World.remove(world, walls[i]); } catch (e) {}
        walls.splice(i, 1);
      }
    }
    try { spawnJuice(px, player.position.y, "#ffcc66", 14); } catch (e) {}
  } else if (kind === "seal_gimmick") {
    activateGimmickSeal();
  } else if (kind === "falling_ink") {
    fallingLineMode = true;
    try { spawnJuice(player.position.x, player.position.y, "#66aaff", 12); } catch (e) {}
  } else if (kind === "fixed_ink") {
    fallingLineMode = false;
    try { spawnJuice(player.position.x, player.position.y, "#88ffcc", 12); } catch (e) {}
  } else if (kind === "ability_tome") {
    freeSelectCharges = Math.min(FREE_SELECT_MAX, (freeSelectCharges || 0) + 1);
    try { updateFreeSelectButtonUI(); } catch (e) {}
    try { spawnJuice(player.position.x, player.position.y, "#ffd700", 14); } catch (e) {}
  } else if (kind === "bounce_ink") {
    bounceLineFrames = SPECIAL_LINE_DURATION;
    turboLineFrames = 0;
    try { spawnJuice(player.position.x, player.position.y, "#ff66aa", 12); } catch (e) {}
  } else if (kind === "turbo_ink") {
    turboLineFrames = SPECIAL_LINE_DURATION;
    bounceLineFrames = 0;
    lineBoostFrames = Math.max(lineBoostFrames, LINE_BOOST_DURATION);
    try { spawnJuice(player.position.x, player.position.y, "#ffe566", 12); } catch (e) {}
  }
  try { recordStat("ability", "card_" + kind); } catch (e) {}
}

function closeAbilityChoice() {
  abilityChoiceOpen = false;
  rogueSelectMode = null;
  const overlay = document.getElementById("ability-choice-overlay");
  if (overlay) {
    overlay.classList.remove("visible");
    overlay.style.display = "none";
  }
  updateWarpButtonUI();
  updateInvulnButtonUI();
  try { updateFreeSelectButtonUI(); } catch (e) {}
}

const ABILITY_META = {
  warp: { name: "🚀 ワープアイテム ×2", desc: "ワープを2個入手（最大3まで）" },
  revive: { name: "💖 一度復活", desc: "次に死んだとき、1回だけその場で復活" },
  invuln: { name: "🛡 数秒間無敵", desc: "使ったとき、数秒間ダメージを受けない" },
  line_extend: { name: "✏️ 線が長くなる", desc: "描ける線の長さがアップ（最大3回まで）" }
};

function pickAbilityOffer() {
  const pool = ["warp", "revive", "invuln"];
  if ((lineExtendLevel || 0) < LINE_EXTEND_MAX) pool.push("line_extend");
  // shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  return pool.slice(0, 3);
}

function pickRandomKeys(poolObj, n, exclude) {
  const keys = Object.keys(poolObj).filter((k) => !(exclude || []).includes(k));
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = keys[i]; keys[i] = keys[j]; keys[j] = t;
  }
  return keys.slice(0, Math.min(n, keys.length));
}

function openAbilityChoice(reason) {
  if (ABILITIES_ENABLED) {
    // legacy path unused
  }
}

function openRogueSelect(mode) {
  if (!ROGUE_ENABLED) return;
  if (gameOver || gameCleared) return;
  if (abilityChoiceOpen) return;
  rogueSelectMode = mode; // "relic" | "card"
  abilityChoiceOpen = true;
  // 途中のカード選択では gameStarted を落とさない（落とすとキャンバスが真っ黒になる）
  // 開始前レリック選択だけ、まだ開始していないので false のまま
  if (mode === "card") {
    // 物理は abilityChoiceOpen で停止。描画は続ける
  } else {
    gameStarted = false;
  }

  const overlay = document.getElementById("ability-choice-overlay");
  // 先にオーバーレイを出して「真っ暗で操作不能」を防ぐ
  if (overlay) {
    overlay.style.display = "flex";
    overlay.style.pointerEvents = "auto";
    overlay.style.opacity = "1";
    overlay.style.visibility = "visible";
    overlay.style.zIndex = "120";
    overlay.classList.add("visible");
    overlay.dataset.mode = mode;
    overlay.dataset.picking = "";
  } else {
    console.error("[openRogueSelect] ability-choice-overlay not found");
  }

  try {
    const title = overlay ? overlay.querySelector(".ability-title") : null;
    const sub = document.getElementById("ability-choice-sub");
    const opts = overlay ? overlay.querySelector(".ability-options") : null;
    if (title) title.textContent = mode === "relic" ? "RELIC SELECT" : "CARD SELECT";
    if (sub) sub.textContent = mode === "relic"
      ? "このランのレリックを1つ選んでください"
      : Math.floor(score) + "m 到達！カードを1つ選ぼう";

    let pool = mode === "relic" ? RELIC_DEFS : CARD_DEFS;
    if (mode === "card") {
      pool = Object.assign({}, CARD_DEFS);
      try {
        if (fallingLineMode) delete pool.falling_ink;
        else delete pool.fixed_ink;
        if ((freeSelectCharges || 0) >= FREE_SELECT_MAX) delete pool.ability_tome; // 上限なら出さない
      } catch (e) {}
    }
    const picks = pickRandomKeys(pool, 3, mode === "relic" && currentRelic ? [currentRelic] : []);
    if (opts) {
      opts.innerHTML = "";
      opts.classList.remove("locked");
      (picks.length ? picks : Object.keys(pool).slice(0, 3)).forEach((key, idx) => {
        const meta = pool[key] || { icon: "⭐", name: key, desc: "" };
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ability-opt";
        btn.setAttribute("data-ability", key);
        btn.style.setProperty("--i", idx);
        btn.innerHTML =
          '<span class="ability-opt-icon" aria-hidden="true">' + (meta.icon || "⭐") + '</span>' +
          '<span class="ability-opt-text">' +
            '<span class="ability-opt-tag">' + (mode === "relic" ? "パッシブ" : "即時効果") + '</span>' +
            '<span class="ability-opt-name">' + (meta.name || key) + '</span>' +
            '<span class="ability-opt-desc">' + (meta.desc || "") + '</span>' +
          '</span>';
        opts.appendChild(btn);
        try {
          whenAssets(["ability_" + key + ".png"], (url) => {
            const ic = btn.querySelector(".ability-opt-icon");
            if (url && ic) ic.innerHTML = '<img alt="" src="' + url + '">';
          });
        } catch (e) {}
      });
    }
  } catch (err) {
    console.error("[openRogueSelect]", err);
  }
}

function checkAbilityChoiceTriggers() {
  if (!ROGUE_ENABLED) return;
  if (gameOver || gameCleared || abilityChoiceOpen) return;
  if (!gameStarted || isCountingDown || isReviving) return;
  if (!canUseRogueCards()) return;
  // ステージのゴール地点に着いたら、カード選択は出さない（50mステージでクリアと同時に開いていた）
  if (currentConfig && !currentConfig.isInfinite && currentConfig.targetScore != null && score >= currentConfig.targetScore) return;

  // カード：50m と 100m ごと
  const marks = [];
  if (score >= 50) marks.push(50);
  if (score >= 100) {
    const mile = Math.floor(score / 100) * 100;
    marks.push(mile);
  }
  for (const m of marks) {
    if (!cardMilestonesDone[m]) {
      cardMilestonesDone[m] = true;
      openRogueSelect("card");
      return;
    }
  }
}


function initAbilityChoiceUI() {
  try { initFreeSelectButton(); } catch (e) {}
  const overlay = document.getElementById("ability-choice-overlay");
  if (!ROGUE_ENABLED && !ABILITIES_ENABLED) {
    if (overlay) { overlay.classList.remove("visible"); overlay.style.display = "none"; }
    const inv = document.getElementById("invuln-button");
    if (inv) inv.style.display = "none";
    return;
  }
  if (overlay && !overlay.dataset.bound) {
    overlay.dataset.bound = "1";
    overlay.addEventListener("click", (e) => {
      const btn = e.target.closest(".ability-opt");
      if (!btn || !abilityChoiceOpen) return;
      const kind = btn.getAttribute("data-ability");
      if (!kind) return;
      try { playButtonSfx(); } catch (err) {}
      if (overlay.dataset.picking === "1") return;
      overlay.dataset.picking = "1";
      btn.classList.add("picked");
      const optsEl = overlay.querySelector(".ability-options");
      if (optsEl) optsEl.classList.add("locked");
      setTimeout(() => {
      overlay.dataset.picking = "";
      if (ROGUE_ENABLED && rogueSelectMode === "relic") {
        applyRelic(kind);
        closeAbilityChoice();
        if (!gameStarted && !isCountingDown) {
          startCountdownAfterSetup();
        }
      } else if (ROGUE_ENABLED && rogueSelectMode === "card") {
        applyCard(kind);
        closeAbilityChoice();
        gameStarted = true;
      } else {
        applyAbilityChoice(kind);
        closeAbilityChoice();
      }
      }, 260);
    });
  }
  const invulnBtn = document.getElementById("invuln-button");
  if (invulnBtn && !invulnBtn.dataset.bound) {
    invulnBtn.dataset.bound = "1";
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      useInvulnItem();
    };
    invulnBtn.addEventListener("click", handler);
    invulnBtn.addEventListener("touchstart", handler, { passive: false });
  }
}

