// DRAW LINE RUN [12/17] game-12-gameover.js — ゲームオーバー／クリア処理
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
function triggerGameOver() {
  if (gameOver || gameCleared) return;
  if (isReviving || isCountingDown) return; // 復活演出中の連続死亡を防ぐ
  if (freezeFrames > 0) return; // 時間停止中は無敵
  if (window.DRAW_RUN && window.DRAW_RUN.invincible) return;
  if (reviveInvulnFrames > 0) return;
  if (invulnActiveFrames > 0) return;
  // 一度復活
  if (reviveCharges > 0) {
    reviveCharges--;
    stageDamage = (stageDamage || 0) + 1;
    try { playDeathSfx(); } catch (e) {}
    startReviveSequence();
    return;
  }
  // レリック「保険」
  if (insuranceAvailable) {
    insuranceAvailable = false;
    stageDamage = (stageDamage || 0) + 1;
    currentRelic = currentRelic === "insurance" ? null : currentRelic;
    reviveInvulnFrames = 90;
    try {
      spawnJuice(player.position.x, player.position.y, "#88ffcc", 16);
      addShake(5);
    } catch (e) {}
    Body.setVelocity(player, { x: playerSpeed || 4, y: isGravityVisualFlipped() ? 6 : -6 });
    return;
  }
  gameOver = true;
  try {
    Body.setVelocity(player, { x: 0, y: 0 });
    Body.setAngularVelocity(player, 0);
  } catch (e) {}
  try { addShake(8); spawnJuice(player.position.x, player.position.y, "#ff4466", 22); } catch (e) {}
  // カメラ・進行を完全停止
  try {
    // カメラは今の位置のまま止める（以前は別のオフセットに瞬間移動して画面が跳ねていた）
    smoothCameraX = cameraX;
  } catch (e) {}
  drawing = false;
  saveScore(score);
  try {
    recordStat("death");
    spawnResultFx(false);
  } catch (e) {}
  try { showResultMenu(); } catch (e) {}

  playBGM.pause();
  playDeathSfx();
}

const STAR_COIN_NEED = 5;
function computeClearStars() {
  let stars = 1;
  const noHit = (stageDamage || 0) === 0;
  if (noHit) stars = 2;
  if (noHit && (stageCoins || 0) >= STAR_COIN_NEED) stars = 3;
  return stars;
}
// 星の獲得条件の表示（final=true: クリア画面 / false: 一時停止画面）
function getStarConditionHTML(final) {
  const dmg = (stageDamage || 0) > 0;
  const coins = stageCoins || 0;
  const colors = final
    ? { text: "#fff", muted: "rgba(230,241,255,.72)", row: "rgba(255,255,255,.08)", border: "rgba(255,255,255,.12)" }
    : { text: "#183b66", muted: "#6b829b", row: "#fff", border: "#dce9f6" };
  const badgeStyles = {
    done: "background:rgba(38,180,124,.18);color:#13845b;",
    pending: "background:rgba(245,174,42,.18);color:#a76c00;",
    failed: "background:rgba(231,76,80,.15);color:#bf3438;"
  };
  const rows = [
    {
      title: "ゴールに到達",
      detail: "最後まで走り切ると獲得",
      status: final ? "獲得" : "走行中",
      state: final ? "done" : "pending"
    },
    {
      title: "ノーダメージでクリア",
      detail: "復活・保険の使用もNG",
      status: final ? (dmg ? "未達" : "獲得") : (dmg ? "未達" : "継続中"),
      state: dmg ? "failed" : (final ? "done" : "pending")
    },
    {
      title: STAR_COIN_NEED + "枚以上コインを集める",
      detail: "ノーダメージ条件も必要（現在 " + coins + " / " + STAR_COIN_NEED + "枚）",
      status: final ? (!dmg && coins >= STAR_COIN_NEED ? "獲得" : "未達") : (dmg ? "未達" : (coins >= STAR_COIN_NEED ? "準備OK" : coins + " / " + STAR_COIN_NEED + "枚")),
      state: final
        ? (!dmg && coins >= STAR_COIN_NEED ? "done" : "failed")
        : (dmg ? "failed" : (coins >= STAR_COIN_NEED ? "done" : "pending"))
    }
  ];
  const rowHTML = rows.map((item, index) =>
    '<div style="display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:13px;background:' + colors.row + ';border:1px solid ' + colors.border + ';">' +
      '<span style="flex:none;min-width:34px;text-align:center;color:#ffd45e;font-size:14px;font-weight:1000;letter-spacing:-1px;">' + "★".repeat(index + 1) + '</span>' +
      '<span style="flex:1;min-width:0;">' +
        '<span style="display:block;color:' + colors.text + ';font-size:12px;font-weight:900;line-height:1.35;">' + item.title + '</span>' +
        '<span style="display:block;margin-top:2px;color:' + colors.muted + ';font-size:10px;line-height:1.35;">' + item.detail + '</span>' +
      '</span>' +
      '<span style="flex:none;padding:4px 7px;border-radius:999px;font-size:10px;font-weight:900;white-space:nowrap;' + badgeStyles[item.state] + '">' + item.status + '</span>' +
    '</div>'
  ).join("");
  return '<div style="display:flex;align-items:center;gap:9px;margin-bottom:10px;">' +
      '<span style="display:flex;flex:none;width:32px;height:32px;align-items:center;justify-content:center;border-radius:11px;background:linear-gradient(180deg,#ffe98a,#f3b92f);color:#704600;font-size:19px;box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 2px 5px rgba(0,0,0,.18);">★</span>' +
      '<span><span style="display:block;color:' + colors.text + ';font-size:14px;font-weight:1000;line-height:1.25;">星の獲得条件</span>' +
        '<span style="display:block;margin-top:2px;color:' + colors.muted + ';font-size:10px;">条件を達成すると星を獲得</span></span>' +
    '</div>' +
    '<div style="display:flex;flex-direction:column;gap:6px;">' + rowHTML + '</div>';
}

function triggerGameClear() {
  if (gameOver || gameCleared) return;
  gameCleared = true;
  try {
    Body.setVelocity(player, { x: 0, y: 0 });
    Body.setAngularVelocity(player, 0);
  } catch (e) {}
  try {
    // カメラは今の位置のまま止める（以前は別のオフセットに瞬間移動して画面が跳ねていた）
    smoothCameraX = cameraX;
  } catch (e) {}
  drawing = false;
  try { addShake(6); spawnJuice(player.position.x, player.position.y, "#33ff99", 26); } catch (e) {}

  lastClearStars = computeClearStars();
  if (currentMode && currentMode.startsWith("stage")) {
    saveStageClear(currentMode);
    try { saveStageStars(currentMode, lastClearStars); } catch (e) {}
  }
  try {
    addTotalCoins(stageCoins || 0);
    recordStat("clear");
    recordStat("distance", score);
    spawnResultFx(true);
  } catch (e) {}
  try { showResultMenu(); } catch (e) {}
  try { hideSurveyNudge(); } catch (e) {}

  playBGM.pause();
  playClearSfx();
}

