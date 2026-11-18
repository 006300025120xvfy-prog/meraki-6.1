// DRAW LINE RUN [9/17] game-09-ui.js — ステージ移動・アンケート・リザルトメニュー・タッチ入力
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
function getStageDifficultyStars(modeKey) {
  const c = MODE_CONFIG[modeKey];
  if (!c) return 1;
  if (modeKey === "score") return 5;
  // 1〜5
  const v = (c.mainStage - 1) + Math.ceil(c.subStage * 0.7);
  return Math.max(1, Math.min(5, v));
}
function getNextStageKey(modeKey) {
  const idx = STAGE_ORDER.indexOf(modeKey);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}
function getPrevStageKey(modeKey) {
  const idx = STAGE_ORDER.indexOf(modeKey);
  if (idx <= 0) return null;
  return STAGE_ORDER[idx - 1];
}
function goToStageKey(modeKey) {
  // will call beginPlay below
  if (!modeKey || !MODE_CONFIG[modeKey]) return;
  if (typeof isStageUnlocked === "function" && !isStageUnlocked(modeKey)) return;
  currentMode = modeKey;
  currentConfig = MODE_CONFIG[modeKey];
  gameOver = false;
  gameCleared = false;
  isReviving = false;
  abilityChoiceOpen = false;
  freezeFrames = 0;
  gameStarted = false;
  hideCountdownUI();
  clearFadeOverlay();
  // 次のステージでも、通常のスタートと同じくレリック選択から始める（以前は選択が飛ばされていた）
  beginPlayWithRogue();
}



const SURVEY_URL = "https://docs.google.com/forms/d/e/1FAIpQLSesk-IyggxuCbUH_54STbgYozLTFdK__kJhHk88U_pZ952nPw/viewform?usp=publish-editor";
function showSurveyNudge() {
  let el = document.getElementById("survey-nudge");
  if (!el) {
    el = document.createElement("div");
    el.id = "survey-nudge";
    el.innerHTML =
      '<a class="survey-nudge-link" href="' + SURVEY_URL + '" target="_blank" rel="noopener noreferrer">' +
        '<img class="survey-nudge-img" alt="アンケート回答はこちら">' +
        '<span class="survey-nudge-text">📝 アンケート回答はこちら</span>' +
      '</a>';
    const container = document.getElementById("game-container") || document.body;
    container.appendChild(el);
    const img = el.querySelector(".survey-nudge-img");
    if (img) {
      const names = ["btn-survey.png", "survey.png", "btn_survey.png"];
      whenAssets(names, (url) => {
        if (url) {
          img.src = url;
          img.style.display = "block";
          el.classList.add("has-img");
        } else {
          img.style.display = "none";
        }
      });
    }
  }
  el.classList.add("visible");
}
function hideSurveyNudge() {
  const el = document.getElementById("survey-nudge");
  if (el) el.classList.remove("visible");
}

function hideResultMenu() {
  const menu = document.getElementById("result-menu");
  if (menu) menu.classList.remove("visible");
  const starEl = document.getElementById("result-stars");
  const hintEl = document.getElementById("result-star-hint");
  const infoEl = document.getElementById("result-star-info");
  if (starEl) starEl.style.display = "none";
  if (hintEl) hintEl.style.display = "none";
  if (infoEl) infoEl.style.display = "none";
}
function showResultMenu() {
  const menu = document.getElementById("result-menu");
  if (!menu) return;
  const nextBtn = menu.querySelector('[data-action="next"]');
  const isStage = currentMode && currentMode.startsWith("stage");
  if (nextBtn) {
    const nextKey = isStage ? getNextStageKey(currentMode) : null;
    const show = !!(nextKey && isStageUnlocked(nextKey));
    nextBtn.classList.toggle("hidden", !show);
  }
  const prevBtn = menu.querySelector('[data-action="prev"]');
  if (prevBtn) prevBtn.classList.add("hidden");
  menu.classList.add("visible");
  // スター表示
  try {
    let starEl = document.getElementById("result-stars");
    if (!starEl) {
      starEl = document.createElement("button");
      starEl.type = "button";
      starEl.id = "result-stars";
      starEl.setAttribute("aria-label", "星の獲得条件を表示");
      starEl.title = "タップして星の獲得条件を確認";
      starEl.style.cssText = "display:none;position:absolute;top:calc(50% - 14px);left:50%;transform:translateX(-50%);z-index:45;text-align:center;font-size:28px;letter-spacing:4px;margin:0;padding:0;border:0;background:transparent;color:#ffe566;cursor:pointer;text-shadow:0 2px 8px rgba(0,0,0,0.35);filter:drop-shadow(0 2px 5px rgba(0,0,0,.4));transition:filter .15s,transform .15s;";
    }
    const starHost = document.getElementById("game-container") || menu;
    if (starEl.parentElement !== starHost) starHost.appendChild(starEl);
    let hintEl = document.getElementById("result-star-hint");
    if (!hintEl) {
      hintEl = document.createElement("div");
      hintEl.id = "result-star-hint";
      hintEl.textContent = "タップで条件表示";
      hintEl.style.cssText = "display:none;position:absolute;top:calc(50% + 21px);left:50%;transform:translateX(-50%);z-index:45;padding:3px 9px;border:1px solid rgba(255,255,255,.24);border-radius:999px;background:rgba(8,19,39,.78);color:#fff;font-size:10px;font-weight:900;line-height:1.35;white-space:nowrap;letter-spacing:.03em;text-shadow:0 1px 3px rgba(0,0,0,.5);pointer-events:none;";
    }
    if (hintEl.parentElement !== starHost) starHost.appendChild(hintEl);
    if (starEl.dataset.boundToggle !== "1") {
      starEl.dataset.boundToggle = "1";
      starEl.addEventListener("click", () => {
        const infoEl = document.getElementById("result-star-info");
        if (!infoEl || starEl.style.display === "none") return;
        const open = infoEl.style.display === "none";
        infoEl.style.display = open ? "block" : "none";
        const hintEl = document.getElementById("result-star-hint");
        if (hintEl) hintEl.style.display = open ? "none" : "block";
        starEl.setAttribute("aria-expanded", String(open));
      });
    }
    if (gameCleared && lastClearStars > 0) {
      starEl.style.display = "block";
      starEl.textContent = "★".repeat(lastClearStars) + "☆".repeat(3 - lastClearStars);
      starEl.setAttribute("aria-expanded", "false");
      hintEl.style.display = "block";
    } else {
      starEl.style.display = "none";
      hintEl.style.display = "none";
    }
  } catch (e) {}
  // 星の獲得条件（クリア時のみ）
  try {
    let infoEl = document.getElementById("result-star-info");
    if (!infoEl) {
      infoEl = document.createElement("div");
      infoEl.id = "result-star-info";
      infoEl.style.cssText = "display:none;position:absolute;top:calc(50% + 22px);left:50%;transform:translateX(-50%);z-index:44;width:calc(100% - 24px);max-width:320px;margin:0 auto;padding:12px;border:1px solid rgba(255,255,255,.2);border-radius:18px;background:linear-gradient(180deg,rgba(23,43,70,.97),rgba(8,19,39,.97));color:#fff;font-size:11px;line-height:1.5;text-align:left;text-shadow:0 1px 2px rgba(0,0,0,.35);box-shadow:0 14px 34px rgba(0,0,0,.45);backdrop-filter:blur(8px);box-sizing:border-box;";
    }
    const infoHost = document.getElementById("game-container") || menu;
    if (infoEl.parentElement !== infoHost) infoHost.appendChild(infoEl);
    if (gameCleared && currentMode && currentMode.startsWith("stage")) {
      infoEl.style.display = "none";
      infoEl.innerHTML = getStarConditionHTML(true);
      const starEl = document.getElementById("result-stars");
      if (starEl) starEl.setAttribute("aria-expanded", "false");
    } else {
      infoEl.style.display = "none";
    }
  } catch (e) {}
  // 結果ボタン画像
  try {
    menu.querySelectorAll(".result-btn img[data-asset]").forEach((img) => {
      const name = img.getAttribute("data-asset");
      if (!name || img.dataset.boundAsset) return;
      img.dataset.boundAsset = "1";
      whenAssets([name], (url) => {
        if (!url) return;
        img.src = url;
        if (img.parentElement) img.parentElement.classList.add("has-img");
      });
    });
  } catch (e) {}
}
function initResultMenuUI() {
  const menu = document.getElementById("result-menu");
  if (!menu || menu.dataset.bound) return;
  menu.dataset.bound = "1";
  menu.addEventListener("click", (e) => {
    const btn = e.target.closest(".result-btn");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    try { playButtonSfx(); } catch (err) {}
    if (action === "retry") {
      hideResultMenu();
      restartSameStage();
    } else if (action === "next") {
      const nextKey = getNextStageKey(currentMode);
      if (nextKey) {
        hideResultMenu();
        goToStageKey(nextKey);
      }
    } else if (action === "title") {
      try { playBGM.pause(); } catch (err) {}
      location.reload();
    }
  });
}

function restartSameStage() {
  hideResultMenu();
  hideSurveyNudge();
  try { playBGM.pause(); } catch (e) {}
  if (countdownTimerId) {
    clearInterval(countdownTimerId);
    countdownTimerId = null;
  }
  gameOver = false;
  gameCleared = false;
  isReviving = false;
  abilityChoiceOpen = false;
  isCountingDown = false;
  gamePaused = false;
  hidePauseOverlay();
  freezeFrames = 0;
  gameStarted = false;
  gravityWorldFlipped = false;
  try { engine.world.gravity.y = normalGravityY; } catch (e) {}
  hideCountdownUI();
  clearFadeOverlay();
  try {
    const ov = document.getElementById("ability-choice-overlay");
    if (ov) {
      ov.classList.remove("visible");
      ov.style.display = "none";
    }
  } catch (e) {}
  // currentMode / currentConfig はそのまま
  if (!currentConfig && currentMode && MODE_CONFIG[currentMode]) {
    currentConfig = MODE_CONFIG[currentMode];
  }
  if (!currentConfig) {
    location.reload();
    return;
  }
  beginPlayWithRogue();
}

function handleScreenClick(clientX, clientY) {
  // 結果メニューは HTML ボタンで処理
  if (gameOver || gameCleared) return true;
  return false;
}

canvas.addEventListener("mousedown", (e) => {
  if (handleScreenClick(e.clientX, e.clientY)) return;
  if (gameOver || gameCleared) return;
  onPointerDown(e.clientX, e.clientY);
});
canvas.addEventListener("mousemove", (e) => onPointerMove(e.clientX, e.clientY));
canvas.addEventListener("mouseup", (e) => onPointerUp(e.clientX, e.clientY));
window.addEventListener("mouseup", (e) => onPointerUp(e.clientX, e.clientY));
canvas.addEventListener("mouseleave", () => { if (drawing) releaseLines(); });
canvas.addEventListener("touchcancel", () => { if (drawing) releaseLines(); else onPointerUp(0, 0); });

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  if (!touch) return;
  if (handleScreenClick(touch.clientX, touch.clientY)) return;
  if (gameOver || gameCleared) return;
  onPointerDown(touch.clientX, touch.clientY);
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  if (!touch) return;
  onPointerMove(touch.clientX, touch.clientY);
}, { passive: false });
canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  if (touch) onPointerUp(touch.clientX, touch.clientY);
  else onPointerUp(0, 0);
});



// ===== 一時停止 =====
function updatePauseButtonUI() {
  const btn = document.getElementById("pause-button");
  if (!btn) return;
  const show = gameStarted && !gamePaused && !gameOver && !gameCleared && !abilityChoiceOpen && !isReviving && !isCountingDown;
  btn.style.display = show ? "flex" : "none";
}
function hidePauseOverlay() {
  const ov = document.getElementById("pause-overlay");
  if (ov) ov.style.display = "none";
}
function showPauseOverlay() {
  let ov = document.getElementById("pause-overlay");
  if (!ov) return;
  const isStage = currentMode && currentMode.startsWith("stage");
  const btnStyle = "font:inherit;font-size:18px;font-weight:900;color:#1a2a4a;border:3px solid #fff;border-radius:999px;padding:8px 0;width:100%;min-height:54px;box-sizing:border-box;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;";
  const imgStyle = "display:none;width:100%;max-width:250px;max-height:50px;height:auto;object-fit:contain;pointer-events:none;";
  ov.innerHTML =
    '<div style="width:300px;max-width:88%;background:linear-gradient(180deg,#f2fbff,#e0f2ff);border:5px solid #fff;border-radius:26px;padding:16px 18px 18px;box-shadow:0 12px 32px rgba(20,60,120,0.4);font-family:inherit;text-align:center;">' +
      '<div style="font-size:26px;font-weight:900;color:#1a4a8a;letter-spacing:3px;margin-bottom:6px;">PAUSE</div>' +
      '<div style="font-size:12px;font-weight:bold;color:#4a7aa0;margin-bottom:8px;">' + ((currentConfig && currentConfig.name) || "") + ' ・ ' + score + 'm</div>' +
      (isStage ? '<div style="margin-bottom:12px;">' +
        '<button type="button" data-pause="star-conditions" aria-label="星の獲得条件を表示" aria-expanded="false" style="display:inline-flex;align-items:center;gap:8px;font:inherit;color:#173b67;background:linear-gradient(180deg,#fff,#edf5ff);border:1px solid #d5e5f5;border-radius:999px;padding:6px 12px;margin-bottom:8px;cursor:pointer;box-shadow:0 3px 8px rgba(22,67,115,.12);">' +
          '<span style="color:#e5ad27;font-size:18px;letter-spacing:1px;text-shadow:0 1px 0 #fff;">★★★</span>' +
          '<span class="pause-star-toggle-label" style="font-size:11px;font-weight:900;">タップで条件表示</span>' +
          '<span class="pause-star-toggle-arrow" style="color:#7690aa;font-size:12px;">⌄</span>' +
        '</button>' +
        '<div id="pause-star-conditions" style="display:none;box-sizing:border-box;text-align:left;font-size:11px;font-weight:bold;color:#1a3a6a;line-height:1.6;background:linear-gradient(180deg,#fff,#f3f8ff);border:1px solid #dce9f6;border-radius:18px;padding:12px;box-shadow:0 8px 20px rgba(22,67,115,.12);">' + getStarConditionHTML(false) + '</div>' +
      '</div>' : '') +
      '<div style="display:flex;flex-direction:column;gap:10px;">' +
        '<button type="button" class="pause-action-button" data-pause="resume" aria-label="つづける" style="' + btnStyle + 'background:linear-gradient(180deg,#ffe566,#ffb800);"><img data-asset="btn-resume.png" alt="" style="' + imgStyle + '"><span class="pause-action-fallback">▶ つづける</span></button>' +
        '<button type="button" class="pause-action-button" data-pause="retry" aria-label="はじめからやり直す" style="' + btnStyle + 'background:linear-gradient(180deg,#b8ecff,#5bc0f0);"><img data-asset="btn-retry.png" alt="" style="' + imgStyle + '"><span class="pause-action-fallback">↻ はじめからやり直す</span></button>' +
        '<button type="button" class="pause-action-button" data-pause="title" aria-label="タイトルへ" style="' + btnStyle + 'background:linear-gradient(180deg,#ffd0e8,#f070b0);"><img data-asset="btn-title.png" alt="" style="' + imgStyle + '"><span class="pause-action-fallback">⌂ タイトルへ</span></button>' +
      '</div>' +
    '</div>';
  ov.querySelectorAll(".pause-action-button img[data-asset]").forEach((img) => {
    const name = img.getAttribute("data-asset");
    const button = img.closest(".pause-action-button");
    whenAssets([name], (url) => {
      if (!url) return;
      img.src = url;
      img.style.display = "block";
      const fallback = button && button.querySelector(".pause-action-fallback");
      if (fallback) fallback.style.display = "none";
      if (button) {
        button.style.background = "transparent";
        button.style.border = "0";
        button.style.boxShadow = "none";
        button.style.padding = "0";
      }
    });
  });
  ov.style.display = "flex";
}
function pauseGame() {
  if (gamePaused || !gameStarted || gameOver || gameCleared || abilityChoiceOpen || isReviving || isCountingDown) return;
  gamePaused = true;
  try { releaseLines(); } catch (e) {}
  pointerDown = false; pointerMoved = false;
  try { playBGM.pause(); } catch (e) {}
  showPauseOverlay();
  updatePauseButtonUI();
}
function resumeGame() {
  if (!gamePaused) return;
  gamePaused = false;
  hidePauseOverlay();
  timeAccumulator = 0;
  lastFrameTime = performance.now();
  try { playBGM.play().catch(() => {}); } catch (e) {}
}
function initPauseUI() {
  const host = document.getElementById("game-container") || document.body;
  if (!document.getElementById("pause-button")) {
    const btn = document.createElement("button");
    btn.id = "pause-button";
    btn.type = "button";
    btn.setAttribute("aria-label", "一時停止");
    btn.textContent = "⏸";
    btn.style.cssText = "position:absolute;right:10px;bottom:10px;width:40px;height:40px;border:3px solid #fff;border-radius:12px;background:linear-gradient(180deg,#7ec8ff,#2a8fd8);color:#fff;font-size:18px;font-weight:900;display:none;align-items:center;justify-content:center;z-index:41;cursor:pointer;padding:0;box-shadow:0 3px 0 #1a5a9a;-webkit-tap-highlight-color:transparent;user-select:none;";
    btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); try { playButtonSfx(); } catch (err) {} pauseGame(); });
    host.appendChild(btn);
  }
  if (!document.getElementById("pause-overlay")) {
    const ov = document.createElement("div");
    ov.id = "pause-overlay";
    ov.style.cssText = "position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:130;background:rgba(10,30,70,0.6);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);";
    ov.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pause]");
      if (!b) return;
      try { playButtonSfx(); } catch (err) {}
      const act = b.getAttribute("data-pause");
      if (act === "resume") resumeGame();
      else if (act === "retry") { gamePaused = false; hidePauseOverlay(); restartSameStage(); }
      else if (act === "title") { try { playBGM.pause(); } catch (err) {} location.reload(); }
      else if (act === "star-conditions") {
        const conditions = ov.querySelector("#pause-star-conditions");
        if (!conditions) return;
        const open = conditions.style.display === "none";
        conditions.style.display = open ? "block" : "none";
        b.setAttribute("aria-expanded", String(open));
        const label = b.querySelector(".pause-star-toggle-label");
        const arrow = b.querySelector(".pause-star-toggle-arrow");
        if (label) label.textContent = open ? "タップで閉じる" : "タップで条件表示";
        if (arrow) arrow.textContent = open ? "⌃" : "⌄";
      }
    });
    host.appendChild(ov);
  }
  // タブを切り替えたら自動で一時停止／Escキーでも切り替え
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseGame(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (gamePaused) resumeGame(); else pauseGame(); }
  });
}
