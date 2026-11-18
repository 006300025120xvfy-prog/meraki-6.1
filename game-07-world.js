// DRAW LINE RUN [7/17] game-07-world.js — ワールド初期化・地形生成
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
// coinPickups は game-05-save.js で定義済み（ここで var 再宣言すると SyntaxError になるため削除）

function resetWorldForMode() {
  // 重力を通常に戻す
  try {
    gravityWorldFlipped = false;
    engine.world.gravity.y = normalGravityY;
    gravityReverseState = "idle";
    gravityFlipStart = 0;
    gravityFlipLast = 0;
  } catch (e) {}

  // 配列上の物体を除去
  try {
    grounds.forEach((g) => { try { World.remove(world, g); } catch (e) {} });
    walls.forEach((w) => { try { World.remove(world, w); } catch (e) {} });
    spikes.forEach((s) => { try { World.remove(world, s); } catch (e) {} });
    currentLines.forEach((l) => { try { World.remove(world, l); } catch (e) {} });
    blinkPlatforms.forEach((bp) => { if (bp.body) try { World.remove(world, bp.body); } catch (e) {} });
  } catch (e) {}
  // プレイヤー以外が残っていたら掃除（プレイヤーは絶対に消さない）
  try {
    const leftovers = world.bodies.slice().filter((b) => b !== player);
    leftovers.forEach((b) => { try { World.remove(world, b); } catch (e) {} });
  } catch (e) {}
  // プレイヤーがワールドから外れていたら戻す
  try {
    if (world.bodies.indexOf(player) < 0) World.add(world, player);
  } catch (e) {
    try { World.add(world, player); } catch (e2) {}
  }
  grounds.length = 0;
  walls.length = 0;
  spikes.length = 0;
  rings.length = 0;
  warpPickups.length = 0;
  fakeFloors.length = 0;
  try { if (typeof coinPickups !== "undefined") coinPickups.length = 0; } catch (e) {}
  blinkPlatforms.length = 0;
  currentLines.length = 0;
  try {
    if (typeof drawingSegments !== "undefined") drawingSegments.length = 0;
  } catch (e) {}

  if (groundSpikeBody) {
    try { World.remove(world, groundSpikeBody); } catch (e) {}
    groundSpikeBody = null;
  }

  warpCount = 0;
  reviveCharges = 0;
  reviveInvulnFrames = 0;
  freezeItemCount = 0;
  freezeFrames = 0;
  invulnCharges = 0;
  invulnActiveFrames = 0;
  lineExtendLevel = 0;
  stylePoints = 0; styleCombo = 0; styleComboTimer = 0;
  juiceParticles = []; shakeMag = 0; speedLines = 0; smoothCameraX = 0; milestoneNext = 50; milestoneFx = null;
  abilityChoiceOpen = false;
  abilityChoiceTriggeredStart = false;
  abilityMilestonesDone = {};
  currentRelic = null;
  rogueSelectMode = null;
  insuranceAvailable = false;
  cardMilestonesDone = {};
  isReviving = false;
  isCountingDown = false;
  windState = "idle";
  windTimer = 0;
  lineBoostFrames = 0;
  fallingLineMode = false;
  inkAmount = 1;
  freeSelectCharges = 0;
  bounceLineFrames = 0;
  turboLineFrames = 0;
  stageCoins = 0;
  stageDamage = 0;
  lastClearStars = 0;
  nearMissPopup = null;
  landSquash = 0;
  wasGrounded = false;
  spikeState = "idle";
  spikeTimer = 0;
  pendingSpikeX = 0;
  groundSpikeState = "idle";
  groundSpikeTimer = 0;
  groundSpikeHeight = 0;
  slowMoFactor = 1;
  laserState = "idle";
  laserTimer = 0;
  laserSafeLane = 1;
  activeGimmick = null;
  gimmickSuppressFrames = 0;
  sealFxStart = 0; sealFxPending = false;
  gravityHud = null;
  timeAccumulator = 0;
  lastFrameTime = performance.now();

  const warnEl = document.getElementById("gravity-warning");
  if (warnEl) warnEl.classList.add("hidden");

  // ===== 必ず地面を敷く（再プレイ落下対策）=====
  // 以前は上面が y=600、通常の地形は y=620 で、最初の床の切れ目に20pxの段差ができていた。
  // 通常の地形（generateSegment）と同じ「中心 height-40・高さ80」に統一する。
  const gy = canvas.height - 40;
  const gH = 80;
  // 巨大な1枚床（隙間ゼロ）＋補助床
  const mainFloor = Bodies.rectangle(2000, gy, 5000, gH, {
    isStatic: true,
    label: "ground",
    friction: 1,
    frictionStatic: 1,
    restitution: 0,
    density: 1
  });
  grounds.push(mainFloor);
  World.add(world, mainFloor);
  for (let i = 0; i < 10; i++) {
    const gx = i * 450 + 200;
    const g = Bodies.rectangle(gx, gy, 460, gH, {
      isStatic: true,
      label: "ground",
      friction: 1,
      frictionStatic: 1,
      restitution: 0
    });
    grounds.push(g);
    World.add(world, g);
  }
  currentX = 4500;
  lastObstacleX = 0;

  // プレイヤーを床の上へ（半径20なので中心は床上面より少し上）
  const groundTop = gy - gH / 2;
  try {
    player.isSensor = false;
    player.collisionFilter = { category: 0x0001, mask: 0xFFFFFFFF, group: 0 };
    Body.setPosition(player, { x: 200, y: groundTop - 22 });
    Body.setVelocity(player, { x: 0, y: 0 });
    Body.setAngularVelocity(player, 0);
    Body.setAngle(player, 0);
    Body.setStatic(player, false);
  } catch (e) {}

  // ゲーム開始時と同じカメラ位置（プレイヤーが画面左寄り）。以前は0で、カウントダウン中だけ中央に見えていた
  try { gamePaused = false; hidePauseOverlay(); } catch (e) {}
  cameraX = 200 - canvas.width * 0.1;
  smoothCameraX = cameraX;
  score = 0;
  stoppedTime = 0;
  airborneFrames = 0;
  upperZoneFrames = 0;
  isTouchingGroundOrLine = false;
  gameOver = false;
  gameCleared = false;
  drawing = false;
  lastPoint = null;
  currentDrawLength = 0;
  lastReleaseTime = 0;

  // 追加の地形・ギミック生成
  for (let i = 0; i < 16; i++) {
    try { generateSegment(); } catch (e) { console.error("[generateSegment]", e); break; }
  }

  // 最終安全確認：床が0なら強制生成
  if (grounds.length === 0) {
    console.warn("[resetWorld] no grounds — force create");
    const fy = canvas.height - 40;
    for (let i = 0; i < 8; i++) {
      const g = Bodies.rectangle(i * 500 + 250, fy, 520, 80, { isStatic: true, label: "ground", friction: 1 });
      grounds.push(g);
      World.add(world, g);
    }
    Body.setPosition(player, { x: 200, y: fy - 40 - 22 });
  }

  // ===== コインをスタート付近に必ず配置 =====
  try {
    const coinY = groundTop - 70;
    for (let x = 300; x < 2500; x += 200) {
      coinPickups.push({
        x: x,
        y: coinY - (x % 80),
        r: 20,
        taken: false
      });
    }
  } catch (e) {}
}

function spawnCoinNear(x, groundYFlipped) {
  try {
    if (typeof coinPickups === "undefined") return;
    const cy = groundYFlipped
      ? 120 + Math.random() * 140
      : 260 + Math.random() * 200;
    coinPickups.push({
      x: x,
      y: cy,
      r: 18,
      taken: false
    });
  } catch (e) {}
}

function generateSegment() {
  if (!currentConfig) return;

  // 通常時は下、重力反転中は上を新しい地面として使う。
  const currentGroundY = gravityWorldFlipped ? 40 : canvas.height - 40;
  const groundHeight = 80;
  const cfg = currentConfig;

  if (!cfg.isInfinite) {
    const targetX = (cfg.targetScore * 100) + 200 + 1200; 
    if (currentX > targetX) {
      const ground = Bodies.rectangle(
        currentX + segmentWidth / 2,
        currentGroundY,
        segmentWidth,
        groundHeight,
        { isStatic: true, label: "ground" }
      );
      grounds.push(ground);
      World.add(world, ground);
      currentX += segmentWidth;
      return;
    }
  }

  if (currentX <= 1200) {
    const ground = Bodies.rectangle(
      currentX + segmentWidth / 2,
      currentGroundY,
      segmentWidth,
      groundHeight,
      { isStatic: true, label: "ground" }
    );
    grounds.push(ground);
    World.add(world, ground);
    if (Math.random() < 0.6) spawnCoinNear(currentX + segmentWidth * 0.5, gravityWorldFlipped);
    currentX += segmentWidth;
    return;
  }

  const distanceSinceLastObstacle = currentX - lastObstacleX;
  const isSafeZoneOver = distanceSinceLastObstacle >= cfg.minSafeDistance;

  if (!isSafeZoneOver) {
    const ground = Bodies.rectangle(currentX + segmentWidth / 2, currentGroundY, segmentWidth, groundHeight, { isStatic: true, label: "ground" });
    grounds.push(ground);
    World.add(world, ground);
    if (Math.random() < 0.35) spawnCoinNear(currentX + segmentWidth * 0.5, gravityWorldFlipped);
    currentX += segmentWidth;
    return;
  }

  const rand = Math.random();
  let boostRingChance = (cfg.ringEnabled && cfg.ringChance) ? cfg.ringChance : 0;
  let normalRingChance = (cfg.ringEnabled && cfg.normalRingChance) ? cfg.normalRingChance : 0;
  if (hasRelic("lucky_ring")) {
    boostRingChance = Math.min(0.55, boostRingChance * 1.7 + 0.06);
    normalRingChance = Math.min(0.4, normalRingChance * 1.7 + 0.04);
  }
  const fakeChance = (cfg.fakeFloorEnabled && cfg.fakeFloorChance) ? cfg.fakeFloorChance : 0;
  const groundEdgeY = gravityWorldFlipped
    ? currentGroundY + groundHeight / 2
    : currentGroundY - groundHeight / 2;

  function placeWarpItem(gx) {
    if (!cfg.warpItemEnabled) return;
    if (Math.random() > (cfg.warpItemChance || 0.35)) return;
    warpPickups.push({
      x: gx,
      y: gravityWorldFlipped
        ? 180 + Math.random() * 100
        : 420 + Math.random() * 100,
      r: 28,
      taken: false
    });
  }

  if (fakeChance > 0 && rand < fakeChance) {
    const fw = segmentWidth;
    fakeFloors.push({
      x: currentX + fw / 2,
      y: currentGroundY,
      w: fw,
      h: groundHeight
    });
    currentX += segmentWidth;
    lastObstacleX = currentX;

  } else if (boostRingChance > 0 && rand < fakeChance + boostRingChance) {
    const ground = Bodies.rectangle(currentX + segmentWidth / 2, currentGroundY, segmentWidth, groundHeight, { isStatic: true, label: "ground" });
    grounds.push(ground);
    World.add(world, ground);
    const ringX = currentX + segmentWidth / 2;
    const ringY = gravityWorldFlipped
      ? 180 + Math.random() * 120
      : 400 + Math.random() * 120;
    rings.push({ x: ringX, y: ringY, r: 48, used: false, type: "boost" });
    placeWarpItem(ringX);
    currentX += segmentWidth;
    lastObstacleX = currentX;

  } else if (normalRingChance > 0 && lineBoostFrames > 0 && rand < fakeChance + boostRingChance + normalRingChance) {
    const ground = Bodies.rectangle(currentX + segmentWidth / 2, currentGroundY, segmentWidth, groundHeight, { isStatic: true, label: "ground" });
    grounds.push(ground);
    World.add(world, ground);
    const ringX = currentX + segmentWidth / 2;
    const ringY = gravityWorldFlipped
      ? 180 + Math.random() * 120
      : 400 + Math.random() * 120;
    rings.push({ x: ringX, y: ringY, r: 48, used: false, type: "normal" });
    placeWarpItem(ringX);
    currentX += segmentWidth;
    lastObstacleX = currentX;

  } else if (rand < fakeChance + cfg.holeChance + boostRingChance + (lineBoostFrames > 0 ? normalRingChance : 0)) {
    let maxSafeHoleSize = maxDrawLength * cfg.maxHoleWidthFactor;
    let holeWidth = cfg.minHoleWidth + Math.random() * (maxSafeHoleSize - cfg.minHoleWidth);
    if (hasRelic("iron_boots")) holeWidth *= 0.72;
    const leftWidth = 100;
    const leftGround = Bodies.rectangle(currentX + leftWidth / 2, currentGroundY, leftWidth, groundHeight, { isStatic: true, label: "ground" });
    grounds.push(leftGround);
    World.add(world, leftGround);
    currentX += leftWidth + holeWidth;
    const rightWidth = 150;
    const rightCenter = currentX + rightWidth / 2;
    const rightGround = Bodies.rectangle(rightCenter, currentGroundY, rightWidth, groundHeight, { isStatic: true, label: "ground" });
    grounds.push(rightGround);
    World.add(world, rightGround);
    placeWarpItem(rightCenter);
    currentX += rightWidth;
    lastObstacleX = currentX;

  } else {
    const ground = Bodies.rectangle(currentX + segmentWidth / 2, currentGroundY, segmentWidth, groundHeight, { isStatic: true, label: "ground" });
    grounds.push(ground);
    World.add(world, ground);
    const targetX = currentX + segmentWidth / 2;
    const maxWallH = Math.min(cfg.wallHeightMax, Math.floor(canvas.height * 0.25));
    const minWallH = Math.min(Math.max(cfg.wallHeightMin, 40), maxWallH);
    const randomWallHeight = minWallH + Math.random() * (maxWallH - minWallH);
    const currentWallY = gravityWorldFlipped
      ? groundEdgeY + randomWallHeight / 2
      : groundEdgeY - randomWallHeight / 2;
    const wall = Bodies.rectangle(targetX, currentWallY, 40, randomWallHeight, { isStatic: true, label: "wall" });
    walls.push(wall);
    World.add(world, wall);
    placeWarpItem(targetX + 70);
    currentX += segmentWidth;
    lastObstacleX = currentX;
  }

  // コイン（障害物区間では高確率）
  if (Math.random() < 0.55) {
    spawnCoinNear(currentX - segmentWidth * 0.5 + Math.random() * 120, gravityWorldFlipped);
  }
  if (Math.random() < 0.25) {
    spawnCoinNear(currentX - 40 + Math.random() * 80, gravityWorldFlipped);
  }

  if (cfg.blinkPlatformEnabled && Math.random() < (cfg.blinkPlatformChance || 0.25)) {
    const bx = currentX + 80;
    const by = gravityWorldFlipped
      ? currentGroundY + 120 + Math.random() * 100
      : currentGroundY - 120 - Math.random() * 100;
    const bw = 120 + Math.random() * 60;
    const bh = 22;
    const body = Bodies.rectangle(bx, by, bw, bh, { isStatic: true, label: "ground" });
    World.add(world, body);
    blinkPlatforms.push({
      body: body,
      x: bx, y: by, w: bw, h: bh,
      state: "solid", 
      timer: 0,
      solidFrames: 120 + Math.floor(Math.random() * 90),
      warningFrames: 50
    });
  }

  // 反転中の新しい地形は currentGroundY が上側になるため、
  // ここで既存オブジェクトを移動する必要はない。
}

