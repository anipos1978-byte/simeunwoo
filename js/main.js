/**
 * main.js
 * 게임 선택 및 포즈 인식/게임 로직 초기화 진입점
 */

// 전역 변수
let poseEngine;
let gameEngine;
let stabilizer;
let ctx;
let labelContainer;
let isInitialized = false;
let currentGameType = null; // "fruit", "bird", "gundam", "kirby", "mario", "math", "defense", "dino", "cat3d", "parrot"
let currentMathLevel = 1;

/**
 * 게임 선택
 */
function selectGame(type) {
  currentGameType = type;

  const selectScreen = document.getElementById("game-select");
  const gameContainer = document.getElementById("game-container");
  const controlsDiv = document.querySelector(".controls");
  const maxPredDiv = document.getElementById("max-prediction");
  const labelDiv = document.getElementById("label-container");

  selectScreen.style.display = "none";
  gameContainer.style.display = "flex";

  // 포즈 인식 불필요 게임은 UI 숨기기
  if (type === "bird") {
    maxPredDiv.style.display = "none";
    labelDiv.style.display = "none";
    document.querySelector("h1").textContent = "버드스트라이크 피하기 ✈️";
  } else if (type === "gundam") {
    maxPredDiv.style.display = "none";
    labelDiv.style.display = "none";
    document.querySelector("h1").textContent = "건담 러너 🤖⚔️";
  } else if (type === "kirby") {
    maxPredDiv.style.display = "none";
    labelDiv.style.display = "none";
    document.querySelector("h1").textContent = "커비 플라잉 러너 💛";
  } else if (type === "mario") {
    maxPredDiv.style.display = "none";
    labelDiv.style.display = "none";
    document.querySelector("h1").textContent = "마리오 탈출 🍄🏃";
  } else if (type === "math") {
    maxPredDiv.style.display = "none";
    labelDiv.style.display = "none";
    const levelName = currentMathLevel === 1 ? "초등" : currentMathLevel === 2 ? "중등" : "고등";
    document.querySelector("h1").textContent = `지루한 수학 퀴즈 (Lv.${currentMathLevel} ${levelName}) ✏️💯`;
  } else if (type === "defense") {
    maxPredDiv.style.display = "none";
    labelDiv.style.display = "none";
    document.querySelector("h1").textContent = "최후의 방어선 🛡️☠️";
  } else if (type === "dino") {
    maxPredDiv.style.display = "none";
    labelDiv.style.display = "none";
    document.querySelector("h1").textContent = "점프더 파이프 🍄🌀";
  } else if (type === "cat3d") {
    maxPredDiv.style.display = "none";
    labelDiv.style.display = "none";
    document.querySelector("h1").textContent = "우당탕탕 고양이 3D 🐈🏠";
  } else if (type === "parrot") {
    maxPredDiv.style.display = "none";
    labelDiv.style.display = "none";
    document.querySelector("h1").textContent = "앵무새의 비밀 미션 🦜🥣";
  } else {
    maxPredDiv.style.display = "block";
    labelDiv.style.display = "block";
    document.querySelector("h1").textContent = "과일 받아먹기 🍎🍌💣";
  }

  // 기존 게임 엔진 정리
  if (gameEngine && gameEngine.isGameActive) {
    gameEngine.stop();
  }
  gameEngine = null;
  isInitialized = false;
}

/**
 * 게임 선택 화면으로 돌아가기
 */
function backToSelect() {
  // 현재 게임 중지
  if (gameEngine && gameEngine.isGameActive) {
    gameEngine.stop();
  }
  gameEngine = null;
  isInitialized = false;

  // PoseEngine도 정지 (웹캠 해제)
  if (poseEngine) {
    poseEngine.stop();
    poseEngine = null;
  }

  const selectScreen = document.getElementById("game-select");
  const gameContainer = document.getElementById("game-container");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const gameStatus = document.getElementById("game-status");

  selectScreen.style.display = "block";
  gameContainer.style.display = "none";
  startBtn.disabled = false;
  stopBtn.disabled = true;
  gameStatus.style.display = "none";

  document.querySelector("h1").textContent = "eunwoo games 🎮";
  currentGameType = null;
}

/**
 * 수학 퀴즈 난이도 선택 모달 제어
 */
function openMathModal() {
  document.getElementById("math-modal").style.display = "flex";
}

function closeMathModal() {
  document.getElementById("math-modal").style.display = "none";
}

function selectMathLevel(level) {
  currentMathLevel = level;
  closeMathModal();
  selectGame('math');
}

/**
 * 애플리케이션 초기화 및 게임 시작
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const oldCanvas = document.getElementById("canvas");
  const gameStatus = document.getElementById("game-status");

  startBtn.disabled = true;

  // === 캔버스 재성성 (컨텍스트 충돌 방지) ===
  const newCanvas = oldCanvas.cloneNode(true);
  oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);

  // 로컬 및 전역 참조 업데이트
  const canvas = newCanvas;

  try {
    if (currentGameType === "bird") {
      // === 버드스트라이크 게임 ===
      if (!isInitialized) {
        canvas.width = 800;
        canvas.height = 600;
        ctx = canvas.getContext("2d");
        isInitialized = true;
      }

      gameEngine = new BirdStrikeEngine();
      gameStatus.style.display = "none";
      startBirdStrikeMode();

    } else if (currentGameType === "gundam") {
      // === 건담 러너 게임 ===
      canvas.width = 800;
      canvas.height = 600;
      ctx = canvas.getContext("2d");

      gameEngine = new GundamRunnerEngine();
      gameStatus.style.display = "none";
      startGundamMode();

    } else if (currentGameType === "kirby") {
      // === 커비 플라잉 러너 ===
      canvas.width = 800;
      canvas.height = 600;
      ctx = canvas.getContext("2d");

      gameEngine = new KirbyRunnerEngine();
      gameStatus.style.display = "none";
      startKirbyMode();

    } else if (currentGameType === "mario") {
      // === 마리오 탈출 ===
      canvas.width = 800;
      canvas.height = 600;
      ctx = canvas.getContext("2d");

      gameEngine = new MarioEscapeEngine();
      gameStatus.style.display = "none";
      startMarioMode();

    } else if (currentGameType && currentGameType.startsWith("math")) {
      // === 지루한 수학 퀴즈 ===
      canvas.width = 800;
      canvas.height = 600;
      ctx = canvas.getContext("2d");

      gameEngine = new MathQuizEngine();
      gameStatus.style.display = "none";
      startMathMode();

    } else if (currentGameType === "defense") {
      // === 최후의 방어선 ===
      canvas.width = 800;
      canvas.height = 600;
      ctx = canvas.getContext("2d");

      gameEngine = new DefenseGameEngine();
      gameStatus.style.display = "none";
      startGameMode({ timeLimit: 0 }); // 시간 제한 없음 (HP 기반)

    } else if (currentGameType === "dino") {
      // === 점프더 파이프 (공룡) ===
      canvas.width = 800;
      canvas.height = 600;
      ctx = canvas.getContext("2d");

      gameEngine = new DinoRunEngine();
      gameStatus.style.display = "none";
      startGameMode({ timeLimit: 0 });

    } else if (currentGameType === "cat3d") {
      // === 우당탕탕 고양이 3D ===
      gameEngine = new CatGame3DEngine();
      gameStatus.style.display = "none";
      startCat3DMode();

    } else if (currentGameType === "parrot") {
      // === 앵무새의 비밀 미션 ===
      canvas.width = 800;
      canvas.height = 600;
      ctx = canvas.getContext("2d");

      gameEngine = new ParrotStealEngine();
      gameStatus.style.display = "none";
      startParrotMode();

    } else if (currentGameType === "fruit") {
      // === 과일 받아먹기 (포즈 인식) ===
      if (!isInitialized) {
        poseEngine = new PoseEngine("./my_model/");
        const { maxPredictions, webcam } = await poseEngine.init({
          size: 200,
          flip: true
        });

        stabilizer = new PredictionStabilizer({
          threshold: 0.7,
          smoothingFrames: 3
        });

        gameEngine = new GameEngine();

        canvas.width = 400;
        canvas.height = 400;
        ctx = canvas.getContext("2d");

        labelContainer = document.getElementById("label-container");
        labelContainer.innerHTML = "";
        for (let i = 0; i < maxPredictions; i++) {
          const div = document.createElement("div");
          labelContainer.appendChild(div);
        }

        poseEngine.setPredictionCallback(handlePrediction);
        poseEngine.setDrawCallback(drawPose);
        poseEngine.start();

        isInitialized = true;
      } else {
        canvas.width = 400;
        canvas.height = 400;
        ctx = canvas.getContext("2d");
      }

      gameStatus.style.display = "none";
      startGameMode({ timeLimit: 60 });
    }

    stopBtn.disabled = false;
  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
    alert("초기화에 실패했습니다. 콘솔을 확인하세요.");
    startBtn.disabled = false;
  }
}

/**
 * 게임 중지
 */
function stop() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (gameEngine && gameEngine.isGameActive) {
    gameEngine.stop();
  }

  // 렌더 루프 중지
  if (birdRenderLoopId) {
    cancelAnimationFrame(birdRenderLoopId);
    birdRenderLoopId = null;
  }
  if (gundamRenderLoopId) {
    cancelAnimationFrame(gundamRenderLoopId);
    gundamRenderLoopId = null;
  }
  if (kirbyRenderLoopId) {
    cancelAnimationFrame(kirbyRenderLoopId);
    kirbyRenderLoopId = null;
  }
  if (marioRenderLoopId) {
    cancelAnimationFrame(marioRenderLoopId);
    cancelAnimationFrame(marioRenderLoopId);
    marioRenderLoopId = null;
  }
  if (mathRenderLoopId) {
    cancelAnimationFrame(mathRenderLoopId);
    mathRenderLoopId = null;
  }
  if (cat3DRenderLoopId) {
    cancelAnimationFrame(cat3DRenderLoopId);
    cat3DRenderLoopId = null;
  }
  if (parrotRenderLoopId) {
    cancelAnimationFrame(parrotRenderLoopId);
    parrotRenderLoopId = null;
  }

  // 수학 퀴즈 컨트롤 숨기기
  const mathControls = document.getElementById("math-controls");
  if (mathControls) {
    mathControls.style.display = "none";
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
}

/**
 * 예측 결과 처리 콜백 (과일 받아먹기용)
 */
function handlePrediction(predictions, pose) {
  const stabilized = stabilizer.stabilize(predictions);

  if (labelContainer && labelContainer.childNodes.length > 0) {
    for (let i = 0; i < predictions.length; i++) {
      const classPrediction =
        predictions[i].className + ": " + predictions[i].probability.toFixed(2);
      labelContainer.childNodes[i].innerHTML = classPrediction;
    }
  }

  const maxPredictionDiv = document.getElementById("max-prediction");
  if (maxPredictionDiv) {
    maxPredictionDiv.innerHTML = stabilized.className
      ? `${stabilized.className} (${(stabilized.probability * 100).toFixed(0)}%)`
      : "감지 중...";
  }

  if (gameEngine && gameEngine.isGameActive && stabilized.className) {
    gameEngine.onPoseDetected(stabilized.className);
  }
}

/**
 * 포즈 그리기 콜백 (과일 받아먹기용)
 */
function drawPose(pose) {
  if (poseEngine.webcam && poseEngine.webcam.canvas) {
    ctx.drawImage(poseEngine.webcam.canvas, 0, 0, 800, 600);

    if (pose) {
      const minPartConfidence = 0.5;
      ctx.save();
      ctx.scale(4, 3); // 200x200 webcam -> 800x600 canvas
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
      tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
      ctx.restore();
    }

    if (gameEngine && gameEngine.isGameActive) {
      gameEngine.draw(ctx);
    }
  }
}

// 과일 받아먹기 게임 모드
function startGameMode(config) {
  if (!gameEngine) return;

  gameEngine.setScoreChangeCallback((score, level) => {
    // 캔버스에 직접 그림
  });

  gameEngine.setGameEndCallback((finalScore, finalLevel) => {
    const gameStatus = document.getElementById("game-status");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    gameStatus.innerHTML = `
      게임 오버<br>
      점수: ${finalScore}<br>
      <span style="font-size: 16px;">시작을 눌러 재도전!</span>
    `;
    gameStatus.style.display = "block";

    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  gameEngine.start(config);
}

// === 버드스트라이크 전용 ===
let birdRenderLoopId = null;

function startBirdStrikeMode() {
  if (!gameEngine) return;

  gameEngine.setScoreChangeCallback((score, level) => {
    // 캔버스에 직접 그림
  });

  gameEngine.setGameEndCallback((finalScore, finalLevel) => {
    const gameStatus = document.getElementById("game-status");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    // 렌더 루프 중지
    if (birdRenderLoopId) {
      cancelAnimationFrame(birdRenderLoopId);
      birdRenderLoopId = null;
    }

    gameStatus.innerHTML = `
      게임 오버<br>
      점수: ${Math.floor(finalScore)}<br>
      레벨: ${finalLevel}<br>
      <span style="font-size: 16px;">시작을 눌러 재도전!</span>
    `;
    gameStatus.style.display = "block";

    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  gameEngine.start();

  // 렌더 루프
  function renderLoop() {
    if (!gameEngine || !gameEngine.isGameActive) return;
    gameEngine.draw(ctx);
    birdRenderLoopId = requestAnimationFrame(renderLoop);
  }
  birdRenderLoopId = requestAnimationFrame(renderLoop);
}

// === 건담 러너 전용 ===
let gundamRenderLoopId = null;

function startGundamMode() {
  if (!gameEngine) return;

  gameEngine.setScoreChangeCallback((score, level) => {
    // 캔버스에 직접 그림
  });

  gameEngine.setGameEndCallback((finalScore, finalLevel) => {
    const gameStatus = document.getElementById("game-status");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    if (gundamRenderLoopId) {
      cancelAnimationFrame(gundamRenderLoopId);
      gundamRenderLoopId = null;
    }

    gameStatus.innerHTML = `
      게임 오버<br>
      점수: ${Math.floor(finalScore)}<br>
      레벨: ${finalLevel}<br>
      <span style="font-size: 16px;">시작을 눌러 재도전!</span>
    `;
    gameStatus.style.display = "block";

    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  gameEngine.start();

  function renderLoop() {
    if (!gameEngine || !gameEngine.isGameActive) return;
    gameEngine.draw(ctx);
    gundamRenderLoopId = requestAnimationFrame(renderLoop);
  }
  gundamRenderLoopId = requestAnimationFrame(renderLoop);
}

// === 커비 플라잉 러너 전용 ===
let kirbyRenderLoopId = null;

function startKirbyMode() {
  if (!gameEngine) return;

  gameEngine.setScoreChangeCallback((score, level) => {
    // 캔버스에 직접 그림
  });

  gameEngine.setGameEndCallback((finalScore, finalLevel) => {
    const gameStatus = document.getElementById("game-status");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    if (kirbyRenderLoopId) {
      cancelAnimationFrame(kirbyRenderLoopId);
      kirbyRenderLoopId = null;
    }

    gameStatus.innerHTML = `
      게임 오버<br>
      점수: ${Math.floor(finalScore)}<br>
      레벨: ${finalLevel}<br>
      <span style="font-size: 16px;">시작을 눌러 재도전!</span>
    `;
    gameStatus.style.display = "block";

    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  gameEngine.start();

  function renderLoop() {
    if (!gameEngine || !gameEngine.isGameActive) return;
    gameEngine.draw(ctx);
    kirbyRenderLoopId = requestAnimationFrame(renderLoop);
  }
  kirbyRenderLoopId = requestAnimationFrame(renderLoop);
}

// === 마리오 탈출 전용 ===
let marioRenderLoopId = null;

function startMarioMode() {
  if (!gameEngine) return;

  gameEngine.setScoreChangeCallback((score, level) => {
    // 캔버스에 직접 그림
  });

  gameEngine.setGameEndCallback((finalScore, finalLevel) => {
    const gameStatus = document.getElementById("game-status");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    if (marioRenderLoopId) {
      cancelAnimationFrame(marioRenderLoopId);
      marioRenderLoopId = null;
    }

    gameStatus.innerHTML = `
      게임 오버<br>
      점수: ${Math.floor(finalScore)}<br>
      레벨: ${finalLevel}<br>
      <span style="font-size: 16px;">시작을 눌러 재도전!</span>
    `;
    gameStatus.style.display = "block";

    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  gameEngine.start();

  function renderLoop(timestamp) {
    if (!gameEngine || !gameEngine.isGameActive) return;

    // 엔진 업데이트 명시적 호출 (main의 context를 사용하기 위해 렌더 루프 분리)
    gameEngine.update(timestamp);
    gameEngine.draw(ctx);

    marioRenderLoopId = requestAnimationFrame(renderLoop);
  }
  marioRenderLoopId = requestAnimationFrame(renderLoop);
}

// === 지루한 수학 퀴즈 전용 ===
let mathRenderLoopId = null;


// closeLevelModal, startMathGame 함수 제거됨 (직접 선택으로 변경)

function startMathMode() {
  if (!gameEngine) return;

  gameEngine.setScoreChangeCallback((score, level) => {
    // 캔버스에 직접 그림
  });

  gameEngine.setGameEndCallback((finalScore, finalLevel) => {
    const gameStatus = document.getElementById("game-status");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    if (mathRenderLoopId) {
      cancelAnimationFrame(mathRenderLoopId);
      mathRenderLoopId = null;
    }

    gameStatus.innerHTML = `
      게임 오버<br>
      점수: ${finalScore}<br>
      <span style="font-size: 16px;">당신의 수학 실력은 여기까지...</span><br>
      <span style="font-size: 16px;">시작을 눌러 재도전!</span>
    `;
    gameStatus.style.display = "block";

    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  gameEngine.start(currentMathLevel);

  function renderLoop(timestamp) {
    if (!gameEngine || !gameEngine.isGameActive) return;

    gameEngine.update(0); // update DeltaTime은 엔진 내부에서 계산하도록 수정 필요하지만 일단 0 전달 (엔진에서 Date.now 사용)
    gameEngine.draw(ctx);
    mathRenderLoopId = requestAnimationFrame(renderLoop);
  }
  mathRenderLoopId = requestAnimationFrame(renderLoop);

  // 입력창 보이기
  document.getElementById("math-controls").style.display = "flex";
  document.getElementById("math-answer").value = "";
  document.getElementById("math-answer").focus();
}

// Global functions for math controls
function submitMathAnswer() {
  if (gameEngine && gameEngine instanceof MathQuizEngine) {
    gameEngine.checkAnswer();
  }
}

function passMathProblem() {
  if (gameEngine && gameEngine instanceof MathQuizEngine) {
    gameEngine.passProblem();
  }
}

// === 우당탕탕 고양이 3D 전용 ===
let cat3DRenderLoopId = null;

function startCat3DMode() {
  if (!gameEngine) return;

  gameEngine.setScoreChangeCallback((score) => {
    // UI 업데이트 로직 (소음 게이지 등)
  });

  gameEngine.setGameEndCallback((finalScore) => {
    const gameStatus = document.getElementById("game-status");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    if (cat3DRenderLoopId) {
      cancelAnimationFrame(cat3DRenderLoopId);
      cat3DRenderLoopId = null;
    }

    gameStatus.innerHTML = `
      게임 오버<br>
      점수: ${finalScore}<br>
      <span style="font-size: 16px;">할머니에게 들켰습니다!</span><br>
      <span style="font-size: 16px;">시작을 눌러 재도전!</span>
    `;
    gameStatus.style.display = "block";

    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  gameEngine.start();

  function renderLoop(timestamp) {
    if (!gameEngine || !gameEngine.isGameActive) return;

    gameEngine.update(timestamp);
    gameEngine.draw(); // Three.js는 자체 renderer를 사용함

    cat3DRenderLoopId = requestAnimationFrame(renderLoop);
  }
  cat3DRenderLoopId = requestAnimationFrame(renderLoop);
}

// === 앵무새의 비밀 미션 전용 ===
let parrotRenderLoopId = null;

function startParrotMode() {
  if (!gameEngine) return;

  gameEngine.setScoreChangeCallback((score, level) => {
    // 캔버스에 직접 그림
  });

  gameEngine.setGameEndCallback((finalScore, finalLevel) => {
    const gameStatus = document.getElementById("game-status");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    if (parrotRenderLoopId) {
      cancelAnimationFrame(parrotRenderLoopId);
      parrotRenderLoopId = null;
    }

    gameStatus.innerHTML = `
      게임 오버<br>
      점수: ${finalScore}<br>
      레벨: ${finalLevel}<br>
      <span style="font-size: 16px;">주인에게 들켰습니다! 🦜💥</span><br>
      <span style="font-size: 16px;">시작을 눌러 재도전!</span>
    `;
    gameStatus.style.display = "block";

    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  gameEngine.start();

  function renderLoop(timestamp) {
    if (!gameEngine || !gameEngine.isGameActive) return;

    gameEngine.update(timestamp);
    gameEngine.draw(ctx);

    parrotRenderLoopId = requestAnimationFrame(renderLoop);
  }
  parrotRenderLoopId = requestAnimationFrame(renderLoop);
}
