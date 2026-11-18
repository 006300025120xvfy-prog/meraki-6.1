// DRAW LINE RUN [10/17] game-10-collision.js — 衝突判定
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
// --- 衝突判定 ---
Matter.Events.on(engine, "collisionStart", (event) => {
  event.pairs.forEach((pair) => {
    const isLineA = pair.bodyA.label === "line";
    const isLineB = pair.bodyB.label === "line";
    const isStaticEnvA = pair.bodyA.label === "ground" || pair.bodyA.label === "wall";
    const isStaticEnvB = pair.bodyB.label === "ground" || pair.bodyB.label === "wall";

    if ((isLineA && isStaticEnvB) || (isLineB && isStaticEnvA)) {
      pair.isActive = false;
      return;
    }

    walls.forEach((wall) => {
      if ((pair.bodyA === player && pair.bodyB === wall) || (pair.bodyB === player && pair.bodyA === wall)) {
        if (!gameOver && !gameCleared) triggerGameOver();
      }
    });

    const labels = [pair.bodyA.label, pair.bodyB.label];
    if (labels.includes("spike")) {
      const spikeBody = pair.bodyA.label === "spike" ? pair.bodyA : pair.bodyB;
      const other = spikeBody === pair.bodyA ? pair.bodyB : pair.bodyA;
      // 線に当たったら消滅
      if (isLineBody(other)) {
        destroyFallingSpike(spikeBody);
        return;
      }
      if (other === player || other.label === "player") {
        if (!gameOver && !gameCleared) triggerGameOver();
      }
    }
  });
});

let isTouchingBoostLine = false;
let isTouchingLine = false;

Matter.Events.on(engine, "collisionActive", (event) => {
  let touchingSurface = false;
  let touchingBoost = false;
  let touchingLine = false;

  event.pairs.forEach((pair) => {
    if (pair.isActive) {
      const isPlayerA = pair.bodyA === player;
      const isPlayerB = pair.bodyB === player;

      if (isPlayerA || isPlayerB) {
        const other = isPlayerA ? pair.bodyB : pair.bodyA;
        const otherLabel = other.label;
        const otherParent = other.parent;
        const otherParentLabel = otherParent ? otherParent.label : "";

        // 壁・トゲに「触れ続けている間」も判定する。
        // collisionStart は接触した瞬間の1回だけなので、その瞬間に無敵（反転直後の猶予・復活直後・保険・無敵アイテムなど）
        // だと見逃され、無敵が切れたあとも壁に触れたまま死なない、という状態になっていた。
        // triggerGameOver 側で無敵中・復活中は無視されるので、ここで毎フレーム呼んでも二重には消費されない。
        if ((otherLabel === "wall" || otherLabel === "spike") && !gameOver && !gameCleared) {
          triggerGameOver();
        }

        if (
          otherLabel === "ground" || 
          otherLabel === "line" || 
          otherParentLabel === "line"
        ) {
          touchingSurface = true;
        }
        if (otherLabel === "line" || otherParentLabel === "line") {
          touchingLine = true;
          if (other._boosted || (otherParent && otherParent._boosted)) {
            touchingBoost = true;
          }
          if (other.parts) {
            for (let i = 0; i < other.parts.length; i++) {
              if (other.parts[i]._boosted) touchingBoost = true;
            }
          }
        }
      }
    }
  });

  isTouchingGroundOrLine = touchingSurface;
  isTouchingBoostLine = touchingBoost;
  isTouchingLine = touchingLine;
});



