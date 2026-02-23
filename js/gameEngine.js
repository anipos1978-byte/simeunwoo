/**
 * gameEngine.js
 * 과일 받아먹기 (Fruit Catcher) 게임 로직
 */

class GameEngine {
  constructor() {
    this.score = 0;
    this.level = 1;
    this.timeLimit = 0;
    this.isGameActive = false;
    this.gameTimer = null;
    this.gameLoopId = null; // 게임 루프 ID

    // 콜백
    this.onScoreChange = null;
    this.onGameEnd = null;

    // 게임 상태
    this.basket = { x: 360, y: 540, width: 80, height: 30 };
    this.items = [];
    this.skeweredItems = []; // 창에 꽂힌 아이템들
    this.explosion = null; // 폭발 이펙트 상태
    this.invincibleEndTime = 0; // 무적 종료 시간
    this.gunEndTime = 0; // 슈팅 모드 종료 시간
    this.bullets = []; // 발사된 총알들
    this.lastShootTime = 0;
    this.lastSpawnTime = 0;
    this.spawnInterval = 1500; // 초기 생성 간격 느리게 (1.5초)
    this.itemSpeed = 1.5; // 초기 속도 느리게

    this.canvasWidth = 800;
    this.canvasHeight = 600;

    // 이미지 로드
    this.spearImage = new Image();
    this.spearImage.src = "./assets/spear.png";
    this.gunImage = new Image();
    this.gunImage.src = "./assets/gun.png";
  }

  start(config = {}) {
    this.isGameActive = true;
    this.score = 0;
    this.level = 1;
    // this.timeLimit = config.timeLimit || 60; // 시간 제한 제거
    this.items = [];
    this.skeweredItems = [];
    this.basket.x = this.canvasWidth / 2 - this.basket.width / 2;

    // this.startTimer(); // 타이머 시작 안 함
    this.startGameLoop();
  }

  /**
   * 게임 중지
   */
  stop() {
    this.isGameActive = false;
    // this.clearTimer();
    this.stopGameLoop();

    if (window.soundManager) window.soundManager.playGameOver();

    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level);
    }
  }

  /**
   * 타이머 관련 함수 (사용 안 함)
   */
  startTimer() {
    // Endless Mode
  }

  clearTimer() {
    // Endless Mode
  }

  /**
   * 게임 루프 (60FPS 예정)
   * 아이템 낙하, 충돌 검사 등을 처리
   */
  startGameLoop() {
    const loop = (timestamp) => {
      if (!this.isGameActive) return;

      this.update(timestamp);
      this.gameLoopId = requestAnimationFrame(loop);
    };
    this.gameLoopId = requestAnimationFrame(loop);
  }

  stopGameLoop() {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
  }

  update(timestamp) {
    if (timestamp - this.lastSpawnTime > this.spawnInterval) {
      this.spawnItem();
      this.lastSpawnTime = timestamp;
    }

    // 슈팅 모드: 자동 발사
    if (Date.now() < this.gunEndTime) {
      if (timestamp - this.lastShootTime > 200) { // 0.2초마다 발사
        const bullet = {
          x: this.basket.x + this.basket.width / 2 - 5,
          y: this.basket.y,
          width: 10,
          height: 20
        };
        this.bullets.push(bullet);
        this.lastShootTime = timestamp;
        if (window.soundManager) window.soundManager.playShoot();
      }
    } else {
      this.bullets = []; // 모드 끝나면 총알 제거? (선택사항)
    }

    // 총알 이동 및 충돌 처리
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y -= 10; // 위로 이동

      // 화면 밖으로 나가면 제거
      if (b.y < -20) {
        this.bullets.splice(i, 1);
        continue;
      }

      // 아이템과 충돌 검사
      let hit = false;
      for (let j = this.items.length - 1; j >= 0; j--) {
        const item = this.items[j];
        // 간단한 사각형/원형 충돌
        // 총알(Rect) vs 아이템(Circle center)
        if (
          b.x < item.x + item.size &&
          b.x + b.width > item.x &&
          b.y < item.y + item.size &&
          b.y + b.height > item.y
        ) {
          // 명중!
          this.items.splice(j, 1);
          hit = true;

          // 점수 계산 & 이펙트
          if (item.type === "bomb") {
            this.score += 50; // 폭탄 제거 점수
          } else {
            this.score += 300; // 과일 저격 점수 (더 높음)
          }

          // 폭발 이펙트 (간단히)
          this.explosion = {
            x: item.x + item.size / 2,
            y: item.y + item.size / 2,
            duration: 10
          };
        }
      }
      if (hit) {
        this.bullets.splice(i, 1); // 총알 소멸
      }
    }

    // 떨어지는 아이템 업데이트
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += this.itemSpeed * (item.speedMult || 1.0);

      // 충돌 검사 (바구니/창 영역)
      // 창의 뾰족한 부분(중앙)에 닿았는지 판정
      const spearX = this.basket.x + this.basket.width / 2;

      // X축: 창 중심 근처에 왔는지 (관용구 30px)
      // Y축: 바구니 상단(360) 근처
      if (
        item.y + item.size >= this.basket.y - 40 && // 창 날 높이 고려
        item.y < this.basket.y + this.basket.height &&
        Math.abs((item.x + item.size / 2) - spearX) < 30
      ) {
        this.handleCollision(item);
        this.items.splice(i, 1);
        continue;
      }

      if (item.y > this.canvasHeight) {
        this.items.splice(i, 1);
      }
    }

    // 꽂힌 아이템 위치 동기화 (바구니 따라다니기)
    const centerX = this.basket.x + this.basket.width / 2;
    for (let i = 0; i < this.skeweredItems.length; i++) {
      // 창 위에 차곡차곡 쌓임
      // 바구니 Y(360) - (순서 * 30) - 40(창날 오프셋)
      this.skeweredItems[i].targetX = centerX - this.skeweredItems[i].size / 2;
      this.skeweredItems[i].targetY = this.basket.y - 40 - (i * 25);

      // 부드러운 위치 동기화 (Lerp)
      this.skeweredItems[i].x += (this.skeweredItems[i].targetX - this.skeweredItems[i].x) * 0.5;
      this.skeweredItems[i].y += (this.skeweredItems[i].targetY - this.skeweredItems[i].y) * 0.5;
    }
  }

  spawnItem() {
    const lanes = [92, 360, 626];
    const laneX = lanes[Math.floor(Math.random() * lanes.length)];

    let type;
    const rand = Math.random();

    // 10% 확률로 총(Gun) 아이템 (미니게임)
    if (rand < 0.1) {
      type = "gun";
    }
    // 5% 확률로 치킨 (대박 점수)
    else if (rand < 0.25) {
      type = "chicken";
    } else {
      const types = ["apple", "banana", "bomb", "grape"];
      type = types[Math.floor(Math.random() * (this.level >= 2 ? types.length : 2))];
    }

    // 아이템별 속도 배율
    let speedMult = 1.0;
    if (type === "grape") speedMult = 1.6; // 포도는 아주 빠름
    else if (type === "banana") speedMult = 1.2; // 바나나도 약간 빠름

    const item = {
      type: type,
      x: laneX,
      y: 0,
      size: 40,
      speedMult: speedMult
    };
    this.items.push(item);
  }

  handleCollision(item) {
    if (item.type === "event_box") {
      // 무적 30초 활성화
      this.invincibleEndTime = Date.now() + 30000;
      if (window.soundManager) window.soundManager.playInvincible();
      return;
    }

    if (item.type === "gun") {
      // 슈팅 모드 15초 활성화
      this.gunEndTime = Date.now() + 15000;
      if (window.soundManager) window.soundManager.playInvincible(); // 파워업 소리 동일하게 사용
      return;
    }

    if (item.type === "chicken") {
      this.score += 1000;
      if (window.soundManager) window.soundManager.playChicken();
      // 치킨도 스택에 쌓음 (음식이니까)
      this.skeweredItems.push(item);

      // 5개 체크 (중복 코드지만 일단 진행)
      if (this.skeweredItems.length >= 5) {
        this.score += 500;
        this.skeweredItems = [];
        if (window.soundManager) window.soundManager.playEat();
      }
      this.checkLevelUp();
      if (this.onScoreChange) this.onScoreChange(this.score, this.level);
      return;
    }

    if (item.type === "bomb") {
      // 무적 상태거나 슈팅모드면 폭탄 무시? 
      // 슈팅모드는 몸으로 받으면 터져야 함 (총알로만 제거 가능)
      if (Date.now() < this.invincibleEndTime) {
        return;
      }

      this.score = Math.max(0, this.score - 250);
      this.skeweredItems = []; // 폭탄 맞으면 다 날아감!

      // 폭발 이펙트 & 소리
      const spearX = this.basket.x + this.basket.width / 2;
      this.explosion = {
        x: spearX,
        y: this.basket.y,
        duration: 30
      };
      if (window.soundManager) window.soundManager.playExplosion();

    } else {
      if (item.type === "apple") {
        this.score += 100;
      } else if (item.type === "banana") {
        this.score += 200;
      } else if (item.type === "grape") {
        this.score += 300; // 포도 고득점
      }

      // 획득 소리
      if (window.soundManager) window.soundManager.playCatch();

      // 스택에 추가
      this.skeweredItems.push(item);

      // 5개 꽂히면 과일 없어짐 (보너스 점수)
      if (this.skeweredItems.length >= 5) {
        this.score += 500; // 보너스
        this.skeweredItems = [];
        // 아삭아삭 먹는 소리
        if (window.soundManager) window.soundManager.playEat();
      }
    }

    this.checkLevelUp();

    if (this.onScoreChange) {
      this.onScoreChange(this.score, this.level);
    }
  }

  checkLevelUp() {
    const newLevel = Math.floor(this.score / 500) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.itemSpeed += 0.5;
      this.spawnInterval = Math.max(200, this.spawnInterval - 100);
    }
  }

  /**
   * 포즈 인식 결과 처리 (바구니 이동)
   * @param {string} detectedPose - "왼쪽", "오른쪽", "정면" (한글 라벨 대응)
   */
  onPoseDetected(detectedPose) {
    if (!this.isGameActive) return;

    // 레인별 바구니 위치 (아이템 낙하 위치와 중심 맞춤)
    // Left: 26 (아이템 x=46, center=66)
    // Center: 160 (아이템 x=180, center=200)
    // Right: 293 (아이템 x=313, center=333)

    // 한글 라벨 매핑 및 위치 이동 (스냅 방식)
    if (detectedPose === "왼쪽" || detectedPose === "Left") {
      this.basket.x = 52;
    } else if (detectedPose === "오른쪽" || detectedPose === "Right") {
      this.basket.x = 586;
    } else if (detectedPose === "정면" || detectedPose === "Center") {
      this.basket.x = 320;
    }
  }

  /**
   * 캔버스에 게임 요소 그리기 (main.js에서 호출)
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    if (!this.isGameActive) return;

    // 바구니(창) 또는 총 그리기
    const centerX = this.basket.x + this.basket.width / 2;
    const bottomY = this.basket.y + this.basket.height;

    const isGunMode = Date.now() < this.gunEndTime;

    if (isGunMode) {
      if (this.gunImage && this.gunImage.complete) {
        // 총 그리기
        const gunWidth = 120; // 가로로 긴 총
        const gunHeight = 60;

        ctx.save();
        // 회전 중심: 바구니(캐릭터)의 중심
        ctx.translate(centerX, this.basket.y);
        // 반시계방향 90도 회전
        ctx.rotate(-Math.PI / 2);

        // 이미지 그리기 (회전된 좌표계 기준)
        // 이미지가 오른쪽을 보고 있다고 가정하면, -90도 회전 시 위를 보게 됨
        // 중심을 맞춰서 그림
        // 총구(오른쪽)가 위로 가야 함
        ctx.drawImage(
          this.gunImage,
          -gunWidth / 2,
          -gunHeight / 2,
          gunWidth,
          gunHeight
        );
        ctx.restore();
      } else {
        // 로딩 전 폴백
        ctx.fillStyle = "gray";
        ctx.fillRect(centerX - 20, this.basket.y, 40, 25);
      }

      /* 기존 총 그리기 코드 주석 처리
      // 기관총 (Machine Gun) 그리기
      // 1. 총열 (Barrel) - 길고 묵직하게
      ctx.fillStyle = "#555";
      ctx.fillRect(centerX - 6, this.basket.y - 30, 12, 30);

      // 2. 총신 (Body)
      ctx.fillStyle = "#333";
      ctx.fillRect(centerX - 20, this.basket.y, 40, 25);

      // 3. 탄창 (Drum Magazine) - 둥근 형태
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(centerX, this.basket.y + 30, 15, 0, 2 * Math.PI);
      ctx.fill();

      // 4. 총구와 장식
      ctx.fillStyle = "black"; // 총구
      ctx.fillRect(centerX - 3, this.basket.y - 30, 6, 5);

      // 5. 손잡이 (Sides)
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(centerX - 30, this.basket.y + 5, 10, 15); // 좌측 핸들
      ctx.fillRect(centerX + 20, this.basket.y + 5, 10, 15); // 우측 핸들
      */

      // 슈팅 모드 텍스트
      ctx.fillStyle = "red";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("MACHINE GUN!", centerX, this.basket.y - 60);

    } else {
      // 이미지 그리기 (창)
      if (this.spearImage && this.spearImage.complete) {
        // 기존 창의 크기와 위치를 고려하여 그리기
        // 창 날 끝부분: this.basket.y - 30
        // 창 자루 끝부분: bottomY + 20 => this.basket.y + 30 + 20 => this.basket.y + 50
        // 전체 높이: 약 80px ~ 100px

        const spearWidth = 60; // 이미지 비율에 맞춰 조정 필요 (일단 60으로 설정)
        const spearHeight = 150; // 길게 설정

        // 이미지의 중심을 centerX에 맞춤
        // 이미지의 위쪽 끝을 창 날 위치에 맞춤
        ctx.drawImage(
          this.spearImage,
          centerX - spearWidth / 2,
          this.basket.y - 60, // 조금 더 위로
          spearWidth,
          spearHeight
        );
      } else {
        // 로딩 실패 시 기존 코드 폴백 또는 로딩 중 처리 (일단 기존 코드 유지하지 않음)
        ctx.fillStyle = "red";
        ctx.fillText("Loading...", centerX, this.basket.y);
      }
      /* 기존 그리기 코드 주석 처리
      // 창 자루 (갈색)
      ctx.strokeStyle = "#8B4513";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(centerX, bottomY + 20); // 화면 아래쪽까지 이어지게
      ctx.lineTo(centerX, this.basket.y);
      ctx.stroke();

      // 창 날 (회색/은색)
      ctx.fillStyle = "silver";
      ctx.beginPath();
      ctx.moveTo(centerX - 10, this.basket.y);
      ctx.lineTo(centerX + 10, this.basket.y);
      ctx.lineTo(centerX, this.basket.y - 30); // 위로 뾰족하게
      ctx.closePath();
      ctx.fill();
      */
    }

    // 레인 구분선 그리기
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(266, 0);
    ctx.lineTo(266, 600);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(532, 0);
    ctx.lineTo(532, 600);
    ctx.stroke();

    // 무적 상태 이펙트 (실드)
    const isInvincible = Date.now() < this.invincibleEndTime;
    if (isInvincible) {
      const centerX = this.basket.x + this.basket.width / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, this.basket.y + 10, 60, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(0, 255, 255, 0.3)"; // Cyan Glow
      ctx.fill();
      ctx.strokeStyle = "cyan";
      ctx.lineWidth = 3;
      ctx.stroke();

      // 무적 텍스트 표시
      ctx.fillStyle = "cyan";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("SHIELD ON!", centerX, this.basket.y - 50);
      ctx.restore();
    }

    // 꽂힌 아이템 그리기 (폭발 중이 아닐 때만)
    if (!this.explosion || this.explosion.duration <= 0) {
      for (const item of this.skeweredItems) {
        if (item.type === "apple") ctx.fillStyle = "red";
        else if (item.type === "banana") ctx.fillStyle = "yellow";
        else if (item.type === "grape") ctx.fillStyle = "rebeccapurple";
        else if (item.type === "event_box") ctx.fillStyle = "violet"; // 색상 변경 (포도와 구별)
        else if (item.type === "chicken") ctx.fillStyle = "sienna";

        ctx.beginPath();
        ctx.arc(item.x + item.size / 2, item.y + item.size / 2, item.size / 2, 0, 2 * Math.PI);
        ctx.fill();

        ctx.font = "20px Arial";
        let emoji = "";
        if (item.type === "apple") emoji = "🍎";
        else if (item.type === "banana") emoji = "🍌";
        else if (item.type === "grape") emoji = "🍇";
        else if (item.type === "event_box") emoji = "🎁";
        else if (item.type === "chicken") emoji = "🍗";
        ctx.fillText(emoji, item.x + 5, item.y + 25);
      }
    }

    // 총알 그리기
    ctx.fillStyle = "orange";
    for (const b of this.bullets) {
      ctx.fillRect(b.x, b.y, b.width, b.height);
    }

    // 아이템 그리기
    for (const item of this.items) {
      if (item.type === "bomb") ctx.fillStyle = "black";
      else if (item.type === "apple") ctx.fillStyle = "red";
      else if (item.type === "banana") ctx.fillStyle = "yellow";
      else if (item.type === "grape") ctx.fillStyle = "rebeccapurple";
      else if (item.type === "event_box") ctx.fillStyle = "violet";
      else if (item.type === "gun") ctx.fillStyle = "gray";
      else if (item.type === "chicken") ctx.fillStyle = "sienna";

      ctx.beginPath();
      ctx.arc(item.x + item.size / 2, item.y + item.size / 2, item.size / 2, 0, 2 * Math.PI);
      ctx.fill();

      ctx.font = "16px Arial";
      let emoji = "";
      if (item.type === "bomb") emoji = "💣";
      else if (item.type === "apple") emoji = "🍎";
      else if (item.type === "banana") emoji = "🍌";
      else if (item.type === "grape") emoji = "🍇";
      else if (item.type === "event_box") emoji = "🎁";
      else if (item.type === "gun") emoji = "🔫";
      else if (item.type === "chicken") emoji = "🍗";

      ctx.fillText(emoji, item.x, item.y + 15);
    }

    // 폭발 이펙트 그리기
    if (this.explosion && this.explosion.duration > 0) {
      ctx.font = "100px Arial";
      ctx.fillText("💥", this.explosion.x - 30, this.explosion.y);
      this.explosion.duration--; // 프레임마다 감소
    }

    // UI 정보 표시 (Time & Score)
    ctx.save();
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Time 제거됨 (Endless)
    /*
    ctx.fillStyle = "white";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`TIME: ${this.timeLimit}`, 15, 35);
    */

    // Level (Center Top)
    ctx.fillStyle = "cyan";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Lv. ${this.level}`, 400, 35);

    // Score (Right Top)
    ctx.fillStyle = "#FFD700"; // Gold
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`SCORE: ${this.score}`, 785, 35);
    ctx.restore();
  }

  // 콜백 등록 함수들
  setScoreChangeCallback(callback) { this.onScoreChange = callback; }
  setGameEndCallback(callback) { this.onGameEnd = callback; }
}

window.GameEngine = GameEngine;
