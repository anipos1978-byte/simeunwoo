/**
 * main.js
 * 포즈 인식과 게임 로직을 초기화하고 서로 연결하는 진입점
 */

// 전역 변수
let poseEngine;
let gameEngine;
let stabilizer;
let ctx;
let labelContainer;
let isInitialized = false;

/**
 * 애플리케이션 초기화 및 게임 시작
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const canvas = document.getElementById("canvas");
  const gameStatus = document.getElementById("game-status");

  startBtn.disabled = true;

  try {
    // 최초 실행 시에만 엔진 초기화
    if (!isInitialized) {
      // 1. PoseEngine 초기화
      // 내부 감지 해상도는 200으로 유지(성능), 캔버스 크기는 나중에 400으로 설정
      poseEngine = new PoseEngine("./my_model/");
      const { maxPredictions, webcam } = await poseEngine.init({
        size: 200, // 감지용 내부 해상도
        flip: true
      });

      // 2. Stabilizer 초기화
      stabilizer = new PredictionStabilizer({
        threshold: 0.7,
        smoothingFrames: 3
      });

      // 3. GameEngine 초기화
      gameEngine = new GameEngine();

      // 4. 캔버스 설정 (화면 표시용 해상도 400x400)
      // webcam.canvas는 200x200이지만, ctx.drawImage로 늘려서 그릴 예정
      canvas.width = 400;
      canvas.height = 400;
      ctx = canvas.getContext("2d");

      // 5. Label Container 설정
      labelContainer = document.getElementById("label-container");
      labelContainer.innerHTML = "";
      for (let i = 0; i < maxPredictions; i++) {
        const div = document.createElement("div");
        labelContainer.appendChild(div);
      }

      // 6. PoseEngine 콜백 설정
      poseEngine.setPredictionCallback(handlePrediction);
      poseEngine.setDrawCallback(drawPose);

      // 7. PoseEngine 시작
      poseEngine.start();

      isInitialized = true;
    }

    // 게임 시작 (Init 완료 후 또는 재시작 시)
    gameStatus.style.display = "none"; // 게임 오버 메시지 숨김
    startGameMode({
      timeLimit: 60
    });

    stopBtn.disabled = false;
  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
    alert("초기화에 실패했습니다. 콘솔을 확인하세요.");
    startBtn.disabled = false;
  }
}

/**
 * 애플리케이션 중지
 */
function stop() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  // 게임엔진만 멈추고, 웹캠은 계속 켜둘지 결정해야 함.
  // 여기서는 게임만 멈춤
  if (gameEngine && gameEngine.isGameActive) {
    gameEngine.stop();
  }

  // 전체 정지를 원하면 아래 주석 해제
  /*
  if (poseEngine) {
    poseEngine.stop();
  }
  */

  startBtn.disabled = false;
  stopBtn.disabled = true;
}

/**
 * 예측 결과 처리 콜백
 */
function handlePrediction(predictions, pose) {
  // 1. Stabilizer로 예측 안정화
  const stabilized = stabilizer.stabilize(predictions);

  // 2. Label Container 업데이트
  if (labelContainer && labelContainer.childNodes.length > 0) {
    for (let i = 0; i < predictions.length; i++) {
      const classPrediction =
        predictions[i].className + ": " + predictions[i].probability.toFixed(2);
      labelContainer.childNodes[i].innerHTML = classPrediction;
    }
  }

  // 3. 최고 확률 예측 표시
  const maxPredictionDiv = document.getElementById("max-prediction");
  if (maxPredictionDiv) {
    maxPredictionDiv.innerHTML = stabilized.className
      ? `${stabilized.className} (${(stabilized.probability * 100).toFixed(0)}%)`
      : "감지 중...";
  }

  // 4. GameEngine에 포즈 전달
  if (gameEngine && gameEngine.isGameActive && stabilized.className) {
    gameEngine.onPoseDetected(stabilized.className);
  }
}

/**
 * 포즈 그리기 콜백
 */
function drawPose(pose) {
  if (poseEngine.webcam && poseEngine.webcam.canvas) {
    // 200x200 웹캠 영상을 400x400 캔버스에 그림
    ctx.drawImage(poseEngine.webcam.canvas, 0, 0, 400, 400);

    // 키포인트와 스켈레톤 그리기 (스케일 조정 필요)
    if (pose) {
      const minPartConfidence = 0.5;
      // tmPose.drawKeypoints는 캔버스 컨텍스트에 그리지만, 
      // 좌표가 200 기준이므로 ctx.scale 처리가 필요함
      ctx.save();
      ctx.scale(2, 2); // 200 -> 400 (2배 확대)
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
      tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
      ctx.restore();
    }

    // 게임 요소 그리기 (바구니, 아이템 등)
    if (gameEngine && gameEngine.isGameActive) {
      gameEngine.draw(ctx);
    }
  }
}

// 게임 모드 설정
function startGameMode(config) {
  if (!gameEngine) return;

  // 점수 변경 콜백
  gameEngine.setScoreChangeCallback((score, level) => {
    /* 
       별도 UI 없이 캔버스에 점수 그림 
       필요 시 여기서 HTML 업데이트 가능
    */
  });

  // 게임 종료 콜백
  gameEngine.setGameEndCallback((finalScore, finalLevel) => {
    const gameStatus = document.getElementById("game-status");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    // 게임 오버 메시지 표시
    gameStatus.innerHTML = `
      GAME OVER<br>
      Score: ${finalScore}<br>
      <span style="font-size: 16px;">Click Start to Restart</span>
    `;
    gameStatus.style.display = "block";

    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  gameEngine.start(config);
}
