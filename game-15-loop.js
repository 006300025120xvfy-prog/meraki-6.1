// DRAW LINE RUN [15/17] game-15-loop.js — 固定ステップ更新・メインループ
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
function fixedUpdate() {
  if (gameOver || gameCleared) {
    try {
      Body.setVelocity(player, { x: 0, y: 0 });
      Body.setAngularVelocity(player, 0);
    } catch (e) {}
    // シェイクだけ減衰（画面が揺れ続けるのを防ぐ）
    try {
      if (shakeMag > 0.05) {
        shakeX = (Math.random() - 0.5) * shakeMag * 2;
        shakeY = (Math.random() - 0.5) * shakeMag * 2;
        shakeMag *= 0.75;
      } else {
        shakeX = shakeY = shakeMag = 0;
      }
    } catch (e) {}
    return;
  }
  if (abilityChoiceOpen || isReviving || isCountingDown) {
    try { Body.setVelocity(player, { x: 0, y: 0 }); } catch (e) {}
    return;
  }

  const baseGrav = normalGravityY;
  const cfg = currentConfig;
  if (!cfg) return;

  // 時間停止：プレイヤーはその場固定＋無敵、障害物・ギミックは動かす
  if (reviveInvulnFrames > 0) reviveInvulnFrames--;
  if (gimmickSuppressFrames > 0) gimmickSuppressFrames--;
  if (invulnActiveFrames > 0) invulnActiveFrames--;
  try { updateJuice(); } catch (e) {}
  try { updateInk(FIXED_DT_SEC); } catch (e) {}
  if (bounceLineFrames > 0) bounceLineFrames--;
  if (turboLineFrames > 0) turboLineFrames--;
  try { updateCoinPickups(); } catch (e) {}
  // 着地スクワッシュ
  try {
    if (isTouchingGroundOrLine && !wasGrounded) landSquash = 10;
    wasGrounded = !!isTouchingGroundOrLine;
    if (landSquash > 0) landSquash--;
  } catch (e) {}
  try { updateRunFx(); } catch (e) {}
  if (!gameOver && !gameCleared && !isReviving && !isCountingDown) {
    try { checkNearMissJuice(); } catch (e) {}
  }

  if (freezeFrames > 0) {
    freezeFrames--;
    try {
      Body.setPosition(player, { x: freezeHoldX, y: freezeHoldY });
      Body.setVelocity(player, { x: 0, y: 0 });
      Body.setAngle(player, 0);
    } catch (e) {}
    cameraX = freezeHoldX - canvas.width * 0.1;
    stoppedTime = 0;
    airborneFrames = 0;
    upperZoneFrames = 0;
    engine.world.gravity.y = normalGravityY;

    // ギミックは通常通り進行
    updateLaserGimmick();
    updateGravityReverseGimmick();
    updateSpikeGimmick();
    updateGroundSpikeGimmick();
    updateRings();
    updateWarpPickups();
    updateBlinkPlatforms();
    updateWindGimmick();

    Engine.update(engine, FIXED_DT_MS);

    // 物理後もプレイヤーを固定（無敵は triggerGameOver 側）
    try {
      Body.setPosition(player, { x: freezeHoldX, y: freezeHoldY });
      Body.setVelocity(player, { x: 0, y: 0 });
      Body.setAngle(player, 0);
    } catch (e) {}
    updateInvulnButtonUI();
    return;
  }

  let speedMul = 1;
  if (isTouchingBoostLine) { speedMul = 1.75; speedLines = 18; }
  else if (isTouchingLine) { speedMul = 1.28; speedLines = Math.max(speedLines, 8); if (__juiceTick % 2 === 0) spawnTrailSpark(player.position.x, player.position.y + 11); }
  const debugSpeed = (window.DRAW_RUN && window.DRAW_RUN.speedMul != null) ? window.DRAW_RUN.speedMul : 1;
  playerSpeed = cfg.baseSpeed * speedMul * debugSpeed;
  if (hasRelic("sprint")) playerSpeed *= 1.14;
  let vyOut = player.velocity.y;
  // 氷ステージ：接地中は横滑り（制御しにくい）
  if (cfg.iceSlip && isTouchingGroundOrLine && !isTouchingLine) {
    vyOut = player.velocity.y * 0.98;
  }
  Body.setVelocity(player, { x: playerSpeed, y: vyOut });
  {
    const camTarget = player.position.x - canvas.width * 0.22;
    if (!smoothCameraX) smoothCameraX = camTarget;
    smoothCameraX += (camTarget - smoothCameraX) * 0.14;
    cameraX = smoothCameraX;
  }

  // 通常重力中だけ上半分に長時間いる判定を行う。
  // 重力反転中は上側が通常の「床」になるため、この判定を無効化する。
  if (gravityReverseState !== "active" && gravityReverseState !== "warning") {
    if (player.position.y < canvas.height / 2) {
      upperZoneFrames++;
      if (upperZoneFrames >= 300) {
        triggerGameOver();
      }
    } else {
      upperZoneFrames = 0;
    }
  } else {
    upperZoneFrames = 0;
  }

  if (gravityReverseState !== "active" && gravityReverseState !== "warning") {
    if (isTouchingGroundOrLine) {
      airborneFrames = 0;
    } else {
      airborneFrames++;
    }

    if (airborneFrames > cfg.airborneGravityStart) {
      let gi = cfg.gravityIncrease;
      if (hasRelic("light_body")) gi *= 0.45;
      const extraWeight = Math.min(airborneFrames - cfg.airborneGravityStart, 100) * gi;
      engine.world.gravity.y = baseGrav + extraWeight;
    } else {
      engine.world.gravity.y = baseGrav;
    }
  }

  updateLaserGimmick();
  updateGravityReverseGimmick();
  updateSpikeGimmick();
  updateGroundSpikeGimmick();
  updateRings();
  updateWarpPickups();
  updateBlinkPlatforms();
  updateWindGimmick();

  Engine.update(engine, FIXED_DT_MS);

  Body.setAngle(player, 0);

  cameraX = player.position.x - canvas.width * 0.1;
  score = Math.max(0, Math.floor((player.position.x - 200) / 100));

  if (!cfg.isInfinite && score >= cfg.targetScore) {
    triggerGameClear();
  }

  checkAbilityChoiceTriggers();

  if (currentX < cameraX + canvas.width + 800) {
    generateSegment();
  }

  for (let i = grounds.length - 1; i >= 0; i--) {
    if (grounds[i].position.x < cameraX - 600) {
      World.remove(world, grounds[i]);
      grounds.splice(i, 1);
    }
  }
  for (let i = walls.length - 1; i >= 0; i--) {
    if (walls[i].position.x < cameraX - 600) {
      World.remove(world, walls[i]);
      walls.splice(i, 1);
    }
  }
  for (let i = spikes.length - 1; i >= 0; i--) {
    if (spikes[i].position.y > canvas.height + 300 || spikes[i].position.x < cameraX - 600) {
      World.remove(world, spikes[i]);
      spikes.splice(i, 1);
    }
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    if (rings[i].x < cameraX - 600) rings.splice(i, 1);
  }
  for (let i = warpPickups.length - 1; i >= 0; i--) {
    if (warpPickups[i].x < cameraX - 600 || warpPickups[i].taken) warpPickups.splice(i, 1);
  }
  for (let i = fakeFloors.length - 1; i >= 0; i--) {
    if (fakeFloors[i].x < cameraX - 600) fakeFloors.splice(i, 1);
  }

  // 画面外へ落ちたらアウト。重力反転中は「落下」の向きが上なので、上側の画面外も判定する
  if (player.position.y > canvas.height + 200 || (gravityWorldFlipped && player.position.y < -200)) {
    triggerGameOver();
  }

  if (freezeFrames > 0 || abilityChoiceOpen || isReviving) {
    stoppedTime = 0;
  } else if (Math.abs(player.velocity.x) < 0.5) {
    stoppedTime += FIXED_DT_SEC;
  } else {
    stoppedTime = 0;
  }
  if (stoppedTime >= 3) {
    triggerGameOver();
  }
}

function __gameLoopFrame(now) {
  if (now == null) now = performance.now();
  let frameDelta = now - lastFrameTime;
  lastFrameTime = now;
  if (frameDelta > MAX_FRAME_MS) frameDelta = MAX_FRAME_MS;
  if (frameDelta < 0) frameDelta = 0;

  if (gameStarted) {
    if (!gameOver && !gameCleared) {
      if (gamePaused) {
        timeAccumulator = 0; // 一時停止中は物理・進行を止める
      } else {
        timeAccumulator += frameDelta * (typeof slowMoFactor === "number" ? slowMoFactor : 1);
        while (timeAccumulator >= FIXED_DT_MS) {
          fixedUpdate();
          timeAccumulator -= FIXED_DT_MS;
        }
      }
    } else {
      // 死亡・クリア後は物理・進行を止め、プレイヤーを固定
      timeAccumulator = 0;
      try {
        Body.setVelocity(player, { x: 0, y: 0 });
        Body.setAngularVelocity(player, 0);
        Body.setAngle(player, 0);
      } catch (e) {}
      try {
        if (shakeMag > 0.05) {
          shakeX = (Math.random() - 0.5) * shakeMag * 2;
          shakeY = (Math.random() - 0.5) * shakeMag * 2;
          shakeMag *= 0.75;
        } else {
          shakeX = shakeY = shakeMag = 0;
        }
      } catch (e) {}
    }
  }

  if (drawing) {
    const elapsedTime = Date.now() - drawStartTime;
    if (elapsedTime >= getEffectiveMaxDrawTime()) releaseLines();
  }

  // 能力選択中はワールド描画を続ける（真っ黒フリーズ防止）
  if (!gameStarted && !abilityChoiceOpen && !isCountingDown) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  // 開始前レリック選択：薄い背景だけ
  if (!gameStarted && abilityChoiceOpen) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#0a1a3a");
    g.addColorStop(1, "#123060");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(shakeX || 0, shakeY || 0);

  const activeBg = getActiveBackground();
  const __show = gameStarted || isCountingDown; // カウントダウン中も背景・地形を表示する
  if (__show && activeBg && activeBg.procedural === "volcano") {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#1a0508");
    g.addColorStop(0.45, "#4a1208");
    g.addColorStop(0.75, "#8B2500");
    g.addColorStop(1, "#2a0800");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.15 + 0.05 * Math.sin(Date.now() / 400);
    ctx.fillStyle = "#ff4400";
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
    ctx.globalAlpha = 1;
  } else if (__show && currentConfig && currentConfig.bgFixed === "ice") {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#d8f0ff");
    g.addColorStop(0.4, "#b8e0f8");
    g.addColorStop(0.75, "#e8f6ff");
    g.addColorStop(1, "#f5fcff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 73 + cameraX * 0.2) % canvas.width + canvas.width) % canvas.width;
      const sy = (i * 41 + Date.now() / 40) % canvas.height;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (__show && activeBg && activeBg.procedural === "void") {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#020208");
    g.addColorStop(0.5, "#0a1028");
    g.addColorStop(1, "#120818");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(200,220,255,0.7)";
    for (let i = 0; i < 24; i++) {
      const sx = ((i * 97 + cameraX * 0.05) % canvas.width + canvas.width) % canvas.width;
      const sy = (i * 53) % canvas.height;
      ctx.fillRect(sx, sy, 2, 2);
    }
  } else if (__show && activeBg && activeBg.complete && activeBg.width > 0) {
    const bgSpeed = 0.3;
    const bgHeight = canvas.height;
    const bgWidth = activeBg.width * (canvas.height / activeBg.height);
    let bgX = -((cameraX * bgSpeed) % bgWidth);
    if (bgX > 0) bgX -= bgWidth;

    ctx.drawImage(activeBg, bgX, 0, bgWidth, bgHeight);
    ctx.drawImage(activeBg, bgX + bgWidth - 1, 0, bgWidth, bgHeight);
    ctx.drawImage(activeBg, bgX + bgWidth * 2 - 2, 0, bgWidth, bgHeight);
  } else if (__show) {
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ===== ゲーム世界の描画 =====
  // 物理座標そのものを反転済みなので、ここでは通常の描画を行う。
  // 重力反転の瞬間は、世界（地形・障害物）だけを上下に回転させて切り替える。プレイヤーは回さない。
  const __flipS = getGravityFlipScaleY();
  const __flipping = __flipS !== 1;
  const __beginFlip = () => {
    ctx.save();
    ctx.translate(0, canvas.height / 2);
    ctx.scale(1, __flipS);
    ctx.translate(0, -canvas.height / 2);
  };
  if (__flipping) __beginFlip();
  grounds.forEach((ground) => { drawBody(ground, "black"); });
  walls.forEach((wall) => { drawBody(wall, "gray"); });

  world.bodies.forEach((body) => {
    if (body !== player && !grounds.includes(body) && !walls.includes(body) && body.label !== "spike") {
      let lc = (typeof getActiveLineColor === "function") ? getActiveLineColor(body) : "black";
      drawBody(body, lc);
      // ネオン外光
      try {
        if (body._boosted || body._bounce || body._turbo) {
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = lc;
          ctx.lineWidth = 8;
          // soft glow approx via juice already
          ctx.restore();
        }
      } catch (e) {}
    }
  });

  if (__flipping) ctx.restore();
  drawBody(player, "red");
  try { drawNearMissPopup(); } catch (e) {}
  if (__flipping) __beginFlip();

  if (!gameOver && !gameCleared) {
    drawGoal();
  }

  if (!gameOver && !gameCleared) {
    drawFakeFloors();
    drawBlinkPlatforms();
    drawWarpPickups();
    drawRings();
  try { drawCoinPickups(); } catch (e) {}
    drawSpikes();
    drawGroundSpikeWarning();
    drawWindGimmick();
  }
  if (__flipping) ctx.restore();

  if (!gameOver && !gameCleared) {
    drawLaserGimmick();
  }

  // 重力反転中の画面全体を薄く着色して状態を分かりやすくする
  drawGravityReverseOverlay();
  drawGravityFlipFx();
  drawGimmickBanners();
  drawSealFx();
  updateHudDomPlacement(getHudFlipFactor());

  updateWarpButtonUI();

  // 左上：距離パネルのみ（コンパクト）
  const panelX = 10;
  const panelY = 10;
  const panelW = 150;
  const panelH = 64;
  // 重力反転中は地面が上にくるので、距離表示は画面の下側へ移す（__hf: 0=上 / 1=下）
  const __hf = getHudFlipFactor();
  const __hudDy = __hf * (canvas.height - panelY * 2 - panelH);
  ctx.save();
  ctx.translate(0, __hudDy);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(panelX+2, panelY+3, panelW, panelH, 14); ctx.fill(); }
  const pg = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  pg.addColorStop(0, "rgba(255,255,255,0.95)");
  pg.addColorStop(1, "rgba(235,248,255,0.95)");
  ctx.fillStyle = pg;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 14); ctx.fill(); ctx.stroke(); }
  else { ctx.fillRect(panelX, panelY, panelW, panelH); }

  ctx.fillStyle = "#3b9eff";
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(panelX+8, panelY+8, 48, 18, 7); ctx.fill(); }
  ctx.fillStyle = "#fff";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DISTANCE", panelX+32, panelY+20);

  // ライフは右端に小さく
  // 「一度復活」の残り回数 + レリック「保険」(未使用なら+1)
  const lives = Math.max(0, Number(reviveCharges) || 0) + (insuranceAvailable ? 1 : 0);
  ctx.textAlign = "right";
  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = lives > 0 ? "#ff4d6d" : "rgba(255,120,140,0.5)";
  ctx.fillText(lives > 0 ? ("♥"+lives) : "♥0", panelX + panelW - 10, panelY + 21);

  ctx.textAlign = "left";
  ctx.fillStyle = "#1a3a6a";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(score + "m", panelX+12, panelY+48);
  // コインは右上（距離と被らない）
  try {
    const cx = canvas.width - 78;
    const cy = panelY;
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx+2, cy+2, 66, 36, 10); ctx.fill(); }
    ctx.fillStyle = "rgba(255,250,230,0.95)";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, 66, 36, 10); ctx.fill(); ctx.stroke(); }
    else { ctx.fillRect(cx, cy, 66, 36); }
    ctx.fillStyle = "#c98900";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("COIN", cx + 33, cy + 13);
    ctx.fillStyle = "#8a5a00";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(String(stageCoins || 0), cx + 33, cy + 30);
  } catch (e) {}


  if (currentConfig && !currentConfig.isInfinite && currentConfig.targetScore) {
    ctx.fillStyle = "#6a8aaa";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("/ " + currentConfig.targetScore + "m", panelX+78, panelY+46);
    const ratio = Math.max(0, Math.min(1, score / currentConfig.targetScore));
    ctx.fillStyle = "rgba(59,158,255,0.18)";
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(panelX+10, panelY+54, panelW-20, 5, 3); ctx.fill(); }
    ctx.fillStyle = "#3b9eff";
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(panelX+10, panelY+54, (panelW-20)*ratio, 5, 3); ctx.fill(); }
  }

  ctx.restore(); // 距離パネルの移動ここまで

  // レリック表示
  if (ROGUE_ENABLED && currentRelic && RELIC_DEFS[currentRelic]) {
    ctx.save();
    ctx.textAlign = "left";
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(RELIC_DEFS[currentRelic].name, 12, (canvas.height - 18) + __hf * (36 - canvas.height));
    ctx.restore();
  }

  // インク残量（常時表示）
  {
    const inkX = panelX;
    const inkY = panelY + panelH + 8;
    const inkW = panelW;
    const inkH = 18;
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(inkX+2, inkY+2, inkW, inkH, 9); ctx.fill(); }
    const ig = ctx.createLinearGradient(inkX, inkY, inkX, inkY + inkH);
    ig.addColorStop(0, "rgba(255,255,255,0.95)");
    ig.addColorStop(1, "rgba(220,240,255,0.95)");
    ctx.fillStyle = ig;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(inkX, inkY, inkW, inkH, 9); ctx.fill(); ctx.stroke(); }
    else { ctx.fillRect(inkX, inkY, inkW, inkH); }
    const ratio = Math.max(0, Math.min(1, typeof inkAmount === "number" ? inkAmount : 1));
    const barW = (inkW - 8) * ratio;
    const bg = ctx.createLinearGradient(inkX, 0, inkX + inkW, 0);
    if (ratio < 0.2) { bg.addColorStop(0, "#ff6b6b"); bg.addColorStop(1, "#ff8e53"); }
    else if (lineBoostFrames > 0) { bg.addColorStop(0, "#00e5ff"); bg.addColorStop(1, "#7af0ff"); }
    else { bg.addColorStop(0, "#4da3ff"); bg.addColorStop(1, "#7ec8ff"); }
    ctx.fillStyle = bg;
    if (barW > 1) {
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(inkX + 4, inkY + 4, barW, inkH - 8, 5); ctx.fill(); }
      else ctx.fillRect(inkX + 4, inkY + 4, barW, inkH - 8);
    }
    ctx.fillStyle = "#1a4a7a";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "left";
    const inkLabel = fallingLineMode ? "INK (FALL)" : "INK";
    ctx.fillText(inkLabel, inkX + 8, inkY + 13);
    ctx.textAlign = "right";
    ctx.fillText(Math.round(ratio * 100) + "%", inkX + inkW - 6, inkY + 13);
  }

  // スタイルコンボ
  if (styleCombo > 1) {
    ctx.save();
    ctx.textAlign = "right";
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = "#ffe566";
    ctx.shadowColor = "#ff9900";
    ctx.shadowBlur = 10;
    ctx.fillText("STYLE x" + styleCombo, canvas.width - 16, 38 + __hf * (canvas.height - 58 - 38));
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#fff0a8";
    ctx.fillText(stylePoints + " pts", canvas.width - 16, 56 + __hf * (canvas.height - 40 - 56));
    ctx.restore();
  }

  // 無敵リング
  if (invulnActiveFrames > 0 && player) {
    const pulse = 0.4 + 0.3 * Math.sin(Date.now() / 70);
    ctx.save();
    ctx.strokeStyle = "rgba(255,210,50," + pulse + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.position.x - cameraX, player.position.y, 26 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  try { drawJuice(); } catch (e) {}

  ctx.restore(); // shake

  if (gameOver || gameCleared) {
    ctx.save();
    // 画面揺れ・カメラ移動・反転などの変換を完全にリセットし、ビューポート全体に描画
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const W = canvas.width;
    const H = canvas.height;
    const now = Date.now();

    if (gameCleared) {
      // ===== STAGE CLEAR 演出 =====
      ctx.fillStyle = "rgba(4, 16, 12, 0.82)";
      ctx.fillRect(-40, -40, W + 80, H + 80);

      // エメラルドのビネット
      const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.85);
      vig.addColorStop(0, "rgba(0, 0, 0, 0)");
      vig.addColorStop(0.7, "rgba(0, 30, 18, 0.45)");
      vig.addColorStop(1, "rgba(0, 12, 6, 0.88)");
      ctx.fillStyle = vig;
      ctx.fillRect(-40, -40, W + 80, H + 80);

      // タイトル
      const pulse = 0.5 + 0.5 * Math.sin(now / 400);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // サブタイトル
      ctx.font = "bold 13px 'Helvetica Neue', Arial, sans-serif";
      ctx.fillStyle = "#80ffc0";
      ctx.shadowBlur = 0;
      ctx.fillText("— MISSION ACCOMPLISHED —", W / 2, H / 2 - 76);

      // メインロゴ
      ctx.font = "900 42px 'Helvetica Neue', Arial, sans-serif";
      ctx.shadowColor = "rgba(51, 255, 153, 0.85)";
      ctx.shadowBlur = 22 + 8 * pulse;
      const gradClear = ctx.createLinearGradient(W / 2, H / 2 - 68, W / 2, H / 2 - 18);
      gradClear.addColorStop(0, "#eafff5");
      gradClear.addColorStop(0.4, "#33ff99");
      gradClear.addColorStop(1, "#00a850");
      ctx.fillStyle = gradClear;
      ctx.fillText("STAGE CLEAR!", W / 2, H / 2 - 42);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1.2;
      ctx.strokeText("STAGE CLEAR!", W / 2, H / 2 - 42);

    } else {
      // ===== GAME OVER 演出 =====
      // ベース暗幕（画面外へ大きく塗って隙間ゼロを保証）
      ctx.fillStyle = "rgba(4, 6, 14, 0.84)";
      ctx.fillRect(-50, -50, W + 100, H + 100);

      // 深紅の周辺減光（ビネット効果で映画的な重厚感）
      const vignette = ctx.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, W * 0.88);
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(0.65, "rgba(28, 0, 8, 0.52)");
      vignette.addColorStop(1, "rgba(5, 0, 2, 0.94)");
      ctx.fillStyle = vignette;
      ctx.fillRect(-50, -50, W + 100, H + 100);

      // 危険を知らせる赤いパルスグロー
      const pulse = 0.5 + 0.5 * Math.sin(now / 450);
      const redGlow = ctx.createRadialGradient(W / 2, H * 0.4, W * 0.1, W / 2, H * 0.4, W * 0.75);
      redGlow.addColorStop(0, `rgba(255, 30, 60, ${0.12 + 0.08 * pulse})`);
      redGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = redGlow;
      ctx.fillRect(-50, -50, W + 100, H + 100);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // 上部サブタイトル
      ctx.font = "bold 12px 'Helvetica Neue', Arial, sans-serif";
      ctx.fillStyle = "rgba(255, 120, 140, 0.9)";
      ctx.shadowBlur = 0;
      ctx.fillText("— CHALLENGE FAILED —", W / 2, H / 2 - 76);

      // 「GAME OVER」メインタイトル
      ctx.font = "900 46px 'Helvetica Neue', Arial, sans-serif";
      ctx.shadowColor = "rgba(255, 20, 50, 0.95)";
      ctx.shadowBlur = 24 + 10 * pulse;

      // 立体グラデーション（白ハイライト → 鮮烈な赤 → 暗黒赤）
      const gradOver = ctx.createLinearGradient(W / 2, H / 2 - 68, W / 2, H / 2 - 18);
      gradOver.addColorStop(0, "#fff5f5");
      gradOver.addColorStop(0.3, "#ff3355");
      gradOver.addColorStop(0.7, "#d60028");
      gradOver.addColorStop(1, "#52000d");
      ctx.fillStyle = gradOver;
      ctx.fillText("GAME OVER", W / 2, H / 2 - 42);

      // 白くシャープなアウトライン
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1.4;
      ctx.strokeText("GAME OVER", W / 2, H / 2 - 42);

      // 飾りライン（両端フェードアウト＋中央ダイヤ◆）
      ctx.shadowBlur = 0;
      const lineG = ctx.createLinearGradient(W / 2 - 130, 0, W / 2 + 130, 0);
      lineG.addColorStop(0, "transparent");
      lineG.addColorStop(0.5, "#ff3355");
      lineG.addColorStop(1, "transparent");
      ctx.fillStyle = lineG;
      ctx.fillRect(W / 2 - 130, H / 2 - 14, 260, 2);

      // スコアカード（半透明のサイバープレート）
      const cardW = 240, cardH = 62;
      const cardX = W / 2 - cardW / 2, cardY = H / 2 + 0;
      ctx.fillStyle = "rgba(12, 16, 28, 0.82)";
      ctx.strokeStyle = "rgba(255, 60, 90, 0.45)";
      ctx.lineWidth = 1.5;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 12);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(cardX, cardY, cardW, cardH);
        ctx.strokeRect(cardX, cardY, cardW, cardH);
      }

      // カード内文字
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "#ff8fa3";
      ctx.fillText("DISTANCE", W / 2, cardY + 18);

      ctx.font = "900 25px 'Helvetica Neue', Arial, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${score} m`, W / 2, cardY + 43);
    }

    // ゲームオーバー中：舞い上がる火の粉（エンバー）を継続生成
    if (gameOver && Math.random() < 0.4 && typeof resultFx !== "undefined" && resultFx.length < 40) {
      resultFx.push({
        x: Math.random() * W,
        y: H + 10,
        vx: (Math.random() - 0.5) * 1.4,
        vy: -(1.0 + Math.random() * 2.0),
        life: 55 + Math.random() * 45,
        color: Math.random() < 0.6 ? "#ff3355" : (Math.random() < 0.8 ? "#ff8844" : "#ffe566"),
        size: 1.5 + Math.random() * 2.5
      });
    }

    // 舞い上がる火の粉・光粒パーティクル
    updateAndDrawResultFx();

    ctx.restore();
    ctx.textAlign = "left";
  } else if (resultFx.length) {
    updateAndDrawResultFx();
  }
}

// 次のフレームを先に予約してから1フレーム分の処理を行う。
// 画像の読み込み失敗などで描画中に例外が出ても、ゲーム全体が固まらない（以前は1回の例外でループが止まっていた）。
let __loopErrorCount = 0;
function gameLoop(now) {
  requestAnimationFrame(gameLoop);
  try {
    __gameLoopFrame(now);
  } catch (e) {
    try { canvas.width = canvas.width; } catch (e2) {} // 描画状態（save/restoreの積み残し）を初期化
    if (__loopErrorCount++ < 5) console.error("[DRAW LINE RUN] gameLoop error:", e);
  }
}



function updateCoinPickups() {
  if (!player || typeof coinPickups === "undefined" || !coinPickups) return;
  for (let i = coinPickups.length - 1; i >= 0; i--) {
    const c = coinPickups[i];
    if (c.taken || c.x < cameraX - 400) {
      coinPickups.splice(i, 1);
      continue;
    }
    const dx = player.position.x - c.x;
    const dy = player.position.y - c.y;
    if (dx * dx + dy * dy < (c.r + 20) * (c.r + 20)) {
      c.taken = true;
      stageCoins = (stageCoins || 0) + 1;
      try { spawnJuice(c.x, c.y, "#ffd700", 10); addShake(1.5); } catch (e) {}
      coinPickups.splice(i, 1);
    }
  }
}

function drawCoinPickups() {
  if (!coinPickups) return;
  const now = Date.now();
  for (const c of coinPickups) {
    if (c.taken) continue;
    const sx = c.x - cameraX;
    if (sx < -40 || sx > canvas.width + 40) continue;
    const bob = Math.sin(now / 180 + c.x) * 3;
    ctx.save();
    ctx.translate(sx, c.y + bob);
    ctx.fillStyle = "#ffd24d";
    ctx.strokeStyle = "#fff0a0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, c.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff8d0";
    ctx.beginPath();
    ctx.arc(-3, -3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayerInkOrb() {
  if (!player || !gameStarted || gameOver || gameCleared) return;
  if (!drawing) return; // 描いているときだけ表示
  const px = player.position.x - cameraX;
  const py = player.position.y - 36;
  const r = 12;
  const ratio = Math.max(0, Math.min(1, inkAmount || 0));
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = bounceLineFrames > 0 ? "#ff66aa" : (turboLineFrames > 0 || lineBoostFrames > 0 ? "#ffe566" : "#5ec8ff");
  ctx.lineWidth = 3;
  ctx.arc(px, py, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
  ctx.stroke();
  ctx.restore();
}

function drawNearMissPopup() {
  if (!nearMissPopup) return;
  nearMissPopup.t++;
  if (nearMissPopup.t > 50) { nearMissPopup = null; return; }
  const t = nearMissPopup.t;
  const a = t < 8 ? t / 8 : (t > 35 ? 1 - (t - 35) / 15 : 1);
  ctx.save();
  ctx.globalAlpha = Math.max(0, a);
  ctx.translate(canvas.width / 2, canvas.height * 0.28 - t * 0.4);
  ctx.textAlign = "center";
  ctx.font = "900 22px 'Helvetica Neue', Arial, sans-serif";
  ctx.strokeStyle = "#1a3a6a";
  ctx.lineWidth = 5;
  ctx.strokeText(nearMissPopup.text, 0, 0);
  ctx.fillStyle = "#ffe566";
  ctx.fillText(nearMissPopup.text, 0, 0);
  ctx.restore();
}
