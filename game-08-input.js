// DRAW LINE RUN [8/17] game-08-input.js — 線を描く入力処理
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
let drawing = false;
let lastPoint = null;
const currentLines = [];       // 確定済みの線（固定 or 落下中）
const drawingSegments = [];    // いま描いている途中の静的セグメント
let currentDrawLength = 0;
const maxDrawTime = 3000;
let drawStartTime = 0;

// インク（常時表示・再生）
let inkAmount = 1; // 0〜1
const INK_REGEN_PER_SEC = 0.45;
const INK_MIN_TO_DRAW = 0.08;
const MIN_STROKE_LEN = 18; // これ未満の線は破棄（連打で点が増えるのを防ぐ）

// タップで線消去用
let pointerDown = false;
let pointerStartClient = null;
let pointerMoved = false;
let pointerNearLine = null;
const TAP_MOVE_PX = 14;
const ERASE_RADIUS = 42;

// 落ちるインク能力（true のとき離すと落下＝旧仕様）
let fallingLineMode = false;

function getInkMaxLength() {
  return lineBoostFrames > 0
    ? LINE_BOOST_MAX_LEN * (1 + 0.2 * Math.min(LINE_EXTEND_MAX, lineExtendLevel || 0))
    : getEffectiveMaxDrawLength();
}

function updateInk(dtSec) {
  if (!gameStarted || gameOver || gameCleared) return;
  if (drawing) return;
  if (inkAmount >= 1) {
    inkAmount = 1;
    return;
  }
  const since = Date.now() - (lastReleaseTime || 0);
  if (since < cooldownDuration) return;
  const dt = Math.max(0, Math.min(0.05, Number(dtSec) || FIXED_DT_SEC || 1 / 60));
  inkAmount = Math.min(1, inkAmount + INK_REGEN_PER_SEC * dt);
}

function clearDrawingSegments() {
  for (let i = 0; i < drawingSegments.length; i++) {
    try { World.remove(world, drawingSegments[i]); } catch (e) {}
  }
  drawingSegments.length = 0;
}

function releaseLines() {
  if (!drawing) return;
  drawing = false;
  lastPoint = null;
  lastReleaseTime = Date.now();

  // 短すぎる線は破棄
  if (currentDrawLength < MIN_STROKE_LEN || drawingSegments.length === 0) {
    clearDrawingSegments();
    currentDrawLength = 0;
    pointerNearLine = null;
    pointerMoved = false;
    pointerDown = false;
    return;
  }

  const fall = !!fallingLineMode;
  const parts = drawingSegments.slice();
  const combinedLine = Body.create({
    parts: parts,
    isStatic: !fall,
    friction: 1.2,
    frictionStatic: 1.5,
    restitution: 0,
    density: 0.003,
    label: "line"
  });

  // セグメントは compound に取り込まれる前に World から外す
  clearDrawingSegments();

  if (lineBoostFrames > 0 || (typeof turboLineFrames === "number" && turboLineFrames > 0)) combinedLine._boosted = true;
  if (typeof bounceLineFrames === "number" && bounceLineFrames > 0) {
    combinedLine._bounce = true;
    combinedLine.restitution = 1.15;
  }
  combinedLine._erasable = true;
  currentLines.push(combinedLine);
  World.add(world, combinedLine);

  let life;
  if (fall) {
    life = (lineBoostFrames > 0) ? LINE_BOOST_LIFETIME : LINE_NORMAL_LIFETIME;
  } else {
    life = (lineBoostFrames > 0) ? LINE_FIXED_BOOST_LIFETIME : LINE_FIXED_LIFETIME;
  }
  if (typeof hasRelic === "function" && hasRelic("long_brush")) {
    life = Math.floor(life * 1.35);
  }

  const token = combinedLine.id;
  setTimeout(() => {
    try { World.remove(world, combinedLine); } catch (e) {}
    const index = currentLines.indexOf(combinedLine);
    if (index !== -1) currentLines.splice(index, 1);
  }, life);

  currentDrawLength = 0;
  pointerNearLine = null;
  pointerMoved = false;
  pointerDown = false;
}

function findLineNearWorld(wx, wy) {
  let best = null;
  let bestD = ERASE_RADIUS;
  for (let i = 0; i < currentLines.length; i++) {
    const body = currentLines[i];
    if (!body) continue;
    let minD = Math.hypot(wx - body.position.x, wy - body.position.y);
    if (body.parts && body.parts.length > 1) {
      for (let p = 1; p < body.parts.length; p++) {
        const part = body.parts[p];
        const pd = Math.hypot(wx - part.position.x, wy - part.position.y);
        if (pd < minD) minD = pd;
      }
    }
    const pad = (body.parts && body.parts.length > 1) ? 28 : 20;
    if (minD < bestD + pad) {
      bestD = minD;
      best = body;
    }
  }
  return best;
}

function eraseLineBody(body) {
  if (!body) return false;
  try { World.remove(world, body); } catch (e) {}
  const idx = currentLines.indexOf(body);
  if (idx >= 0) currentLines.splice(idx, 1);
  try {
    spawnJuice(body.position.x, body.position.y, "#88c8ff", 8);
    playButtonSfx();
  } catch (e) {}
  return true;
}

function getCanvasPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function startDrawing(clientX, clientY) {
  if (!gameStarted) return;
  if (gameOver || gameCleared) return;
  if (abilityChoiceOpen || isCountingDown || isReviving) return;

  const timeSinceLastRelease = Date.now() - lastReleaseTime;
  if (timeSinceLastRelease < cooldownDuration) return;
  if (inkAmount < INK_MIN_TO_DRAW) return;

  // 途中セグメントが残っていれば掃除
  clearDrawingSegments();

  const pt = getCanvasPoint(clientX, clientY);
  drawing = true;
  currentDrawLength = 0;
  drawStartTime = Date.now();
  lastPoint = { x: pt.x + cameraX, y: pt.y };
}

function moveDrawing(clientX, clientY) {
  if (!drawing) return;

  const elapsedTime = Date.now() - drawStartTime;
  if (elapsedTime >= getEffectiveMaxDrawTime()) {
    releaseLines();
    return;
  }

  const pt = getCanvasPoint(clientX, clientY);
  const currentPoint = { x: pt.x + cameraX, y: pt.y };
  const dx = currentPoint.x - lastPoint.x;
  const dy = currentPoint.y - lastPoint.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 1.5) return;

  const maxLen = getInkMaxLength();
  const remainLen = maxLen * Math.max(0, inkAmount);
  if (remainLen < 2) {
    releaseLines();
    return;
  }

  const isBounce = (typeof bounceLineFrames === "number" && bounceLineFrames > 0);
  const isTurbo = (typeof turboLineFrames === "number" && turboLineFrames > 0) || lineBoostFrames > 0;
  const thickness = isTurbo ? LINE_BOOST_THICKNESS : (isBounce ? 28 : LINE_NORMAL_THICKNESS);
  const boosted = isTurbo;
  const stepLen = 4;
  const steps = Math.max(1, Math.ceil(length / stepLen));
  let fromX = lastPoint.x;
  let fromY = lastPoint.y;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const toX = lastPoint.x + dx * t;
    const toY = lastPoint.y + dy * t;
    const segDx = toX - fromX;
    const segDy = toY - fromY;
    const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
    if (segLen < 1) continue;
    if (currentDrawLength + segLen > remainLen) {
      releaseLines();
      return;
    }
    currentDrawLength += segLen;
    inkAmount = Math.max(0, inkAmount - segLen / maxLen);

    const angle = Math.atan2(segDy, segDx);
    const line = Bodies.rectangle(
      (fromX + toX) / 2,
      (fromY + toY) / 2,
      segLen,
      thickness,
      { isStatic: true, angle: angle, friction: 1.5, density: 0.004, frictionStatic: 2.0, label: "line" }
    );
    if (boosted) line._boosted = true;
    if (isBounce) { line._bounce = true; line.restitution = 1.15; }
    if (isTurbo) line._turbo = true;
    drawingSegments.push(line);
    World.add(world, line);
    try {
      if (Math.random() < 0.35) {
        spawnJuice((fromX + toX) / 2, (fromY + toY) / 2,
          isBounce ? "#ff66aa" : (isTurbo ? "#ffe566" : "#7ec8ff"), 2);
      }
    } catch (e) {}
    fromX = toX;
    fromY = toY;
  }

  lastPoint = currentPoint;
}

function onPointerDown(clientX, clientY) {
  if (!gameStarted || gameOver || gameCleared) return;
  if (abilityChoiceOpen || isCountingDown || isReviving) return;

  pointerDown = true;
  pointerMoved = false;
  pointerStartClient = { x: clientX, y: clientY };
  const pt = getCanvasPoint(clientX, clientY);
  pointerNearLine = findLineNearWorld(pt.x + cameraX, pt.y);
}

function onPointerMove(clientX, clientY) {
  if (!pointerDown) {
    if (drawing) moveDrawing(clientX, clientY);
    return;
  }
  if (!pointerStartClient) return;
  const dx = clientX - pointerStartClient.x;
  const dy = clientY - pointerStartClient.y;
  if (!pointerMoved && (dx * dx + dy * dy) > TAP_MOVE_PX * TAP_MOVE_PX) {
    pointerMoved = true;
    if (!drawing) startDrawing(pointerStartClient.x, pointerStartClient.y);
  }
  if (drawing) moveDrawing(clientX, clientY);
}

function onPointerUp(clientX, clientY) {
  if (drawing) {
    releaseLines();
  } else if (pointerDown && !pointerMoved && pointerNearLine) {
    eraseLineBody(pointerNearLine);
  }
  pointerDown = false;
  pointerNearLine = null;
  pointerMoved = false;
  pointerStartClient = null;
}
