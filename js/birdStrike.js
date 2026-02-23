/**
 * birdStrike.js
 * 버드스트라이크 피하기 게임 엔진
 * 키보드 ← → 방향키로 비행기를 3구역에서 조종하여 새를 피하고 아이템을 모으는 게임
 * 무한 모드 (Endless) - 게임 오버 없이 계속 즐기기
 */

class BirdStrikeEngine {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.isGameActive = false;
        this.gameLoopId = null;

        // 콜백
        this.onScoreChange = null;
        this.onGameEnd = null;

        // 캔버스 크기
        this.canvasWidth = 800;
        this.canvasHeight = 600;

        // 3레인 시스템 (과일 받아먹기와 동일)
        this.lanes = [132, 400, 668]; // 왼쪽, 중앙, 오른쪽 레인 중심 X
        this.currentLane = 1; // 시작 = 중앙 (인덱스 1)

        // 비행기 상태
        this.plane = {
            x: 400,
            y: 530,
            targetX: 400,
            width: 40,
            height: 40
        };

        // 키 입력 상태
        this.keys = { left: false, right: false };
        this.lastLaneChange = 0; // 레인 변경 딜레이

        // 게임 오브젝트
        this.obstacles = [];  // 새, 아이템 등
        this.clouds = [];     // 배경 구름
        this.particles = [];  // 파티클 이펙트

        // 스폰 타이밍
        this.lastSpawnTime = 0;
        this.spawnInterval = 1200;
        this.lastCloudTime = 0;
        this.obstacleSpeed = 2;

        // 무적 시간 (충돌 후 깜빡임)
        this.invincibleUntil = 0;

        // 배경 스크롤 오프셋
        this.bgOffset = 0;

        // 폭발 이펙트
        this.explosions = [];

        // 키보드 이벤트 바인딩
        this._onKeyDown = this._handleKeyDown.bind(this);
        this._onKeyUp = this._handleKeyUp.bind(this);

        // 이미지 로드
        this.planeImg = new Image();
        this.planeImg.src = 'assets/images/plane.png';
        this.isPlaneImgLoaded = false;
        this.planeImg.onload = () => {
            this.processImageBackground(this.planeImg, (img) => {
                this.planeImg = img;
                this.isPlaneImgLoaded = true;
            });
        };
    }

    start() {
        this.isGameActive = true;
        this.score = 0;
        this.level = 1;
        this.lives = 5;
        this.maxLives = 5;
        this.obstacles = [];
        this.clouds = [];
        this.particles = [];
        this.explosions = [];
        this.currentLane = 1; // 중앙 시작
        this.plane.x = this.lanes[1] - this.plane.width / 2;
        this.plane.targetX = this.plane.x;
        this.obstacleSpeed = 2;
        this.spawnInterval = 1200;
        this.lastSpawnTime = 0;
        this.lastCloudTime = 0;
        this.lastLaneChange = 0;
        this.invincibleUntil = 0;
        this.bgOffset = 0;

        // 키보드 리스너 등록
        document.addEventListener("keydown", this._onKeyDown);
        document.addEventListener("keyup", this._onKeyUp);

        // 초기 구름 생성
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 30 + Math.random() * 40,
                speed: 0.5 + Math.random() * 1
            });
        }

        this.startGameLoop();
    }

    stop() {
        this.isGameActive = false;
        this.stopGameLoop();

        // 키보드 리스너 제거
        document.removeEventListener("keydown", this._onKeyDown);
        document.removeEventListener("keyup", this._onKeyUp);
        this.keys = { left: false, right: false };

        if (window.soundManager) window.soundManager.playGameOver();

        if (this.onGameEnd) {
            this.onGameEnd(Math.floor(this.score), this.level);
        }
    }

    _handleKeyDown(e) {
        const now = Date.now();
        if (e.key === "ArrowLeft" || e.key === "a") {
            e.preventDefault();
            // 레인 이동 (디바운스 200ms)
            if (now - this.lastLaneChange > 200) {
                this.currentLane = Math.max(0, this.currentLane - 1);
                this.plane.targetX = this.lanes[this.currentLane] - this.plane.width / 2;
                this.lastLaneChange = now;
            }
        }
        if (e.key === "ArrowRight" || e.key === "d") {
            e.preventDefault();
            if (now - this.lastLaneChange > 200) {
                this.currentLane = Math.min(2, this.currentLane + 1);
                this.plane.targetX = this.lanes[this.currentLane] - this.plane.width / 2;
                this.lastLaneChange = now;
            }
        }
    }

    _handleKeyUp(e) {
        // 3레인 스냅 방식이므로 키 떼도 위치 유지
    }

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
        // 비행기 부드러운 레인 이동 (Lerp)
        this.plane.x += (this.plane.targetX - this.plane.x) * 0.2;

        // 배경 스크롤
        this.bgOffset = (this.bgOffset + 1) % this.canvasHeight;

        // 구름 이동
        for (let i = this.clouds.length - 1; i >= 0; i--) {
            this.clouds[i].y += this.clouds[i].speed;
            if (this.clouds[i].y > this.canvasHeight + 50) {
                this.clouds[i].y = -50;
                this.clouds[i].x = Math.random() * this.canvasWidth;
            }
        }

        // 구름 보충
        if (timestamp - this.lastCloudTime > 3000) {
            this.clouds.push({
                x: Math.random() * this.canvasWidth,
                y: -50,
                size: 30 + Math.random() * 40,
                speed: 0.5 + Math.random() * 1
            });
            this.lastCloudTime = timestamp;
        }

        // 장애물/아이템 스폰
        if (timestamp - this.lastSpawnTime > this.spawnInterval) {
            this.spawnObstacle();
            this.lastSpawnTime = timestamp;
        }

        // 장애물 이동 & 충돌 검사
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.y += this.obstacleSpeed * (obs.speedMult || 1.0);

            // 화면 밖으로 나감
            if (obs.y > this.canvasHeight + 50) {
                // 새를 피했으면 점수 추가
                if (obs.type === "bird" || obs.type === "bigbird") {
                    this.score += 10;
                    if (this.onScoreChange) this.onScoreChange(Math.floor(this.score), this.level);
                }
                this.obstacles.splice(i, 1);
                continue;
            }

            // 충돌 검사
            if (this.checkCollision(this.plane, obs)) {
                this.handleCollision(obs);
                this.obstacles.splice(i, 1);
            }
        }

        // 파티클 업데이트
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 폭발 업데이트
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].duration--;
            if (this.explosions[i].duration <= 0) {
                this.explosions.splice(i, 1);
            }
        }

        // 레벨업 체크
        this.checkLevelUp();

        // 점수 시간 보너스 (매 프레임)
        this.score += 0.05;
    }

    spawnObstacle() {
        const rand = Math.random();
        let type, emoji, size, speedMult;

        if (rand < 0.55) {
            // 새 (55%)
            type = "bird";
            const birdTypes = ["🐦", "🦅", "🦆"];
            emoji = birdTypes[Math.floor(Math.random() * birdTypes.length)];
            size = 35;
            speedMult = 0.8 + Math.random() * 0.6;
        } else if (rand < 0.65) {
            // 큰 새 (10%) - 더 위험
            type = "bigbird";
            emoji = "🦅";
            size = 55;
            speedMult = 0.6;
        } else if (rand < 0.80) {
            // 별 (15%)
            type = "star";
            emoji = "⭐";
            size = 25;
            speedMult = 1.0;
        } else if (rand < 0.90) {
            // 다이아 (10%)
            type = "diamond";
            emoji = "💎";
            size = 25;
            speedMult = 1.2;
        } else if (rand < 0.95) {
            // 치킨 (5%)
            type = "chicken";
            emoji = "🍗";
            size = 30;
            speedMult = 0.9;
        } else {
            // 하트 (5%) - 생명 회복!
            type = "heart";
            emoji = "❤️";
            size = 30;
            speedMult = 0.8;
        }

        // 3레인 중 하나에 스폰
        const lane = Math.floor(Math.random() * 3);
        const x = this.lanes[lane] - size / 2;

        this.obstacles.push({
            type,
            emoji,
            x,
            y: -size,
            size,
            speedMult,
            lane
        });
    }

    checkCollision(plane, obs) {
        // 무적 시간이면 충돌 무시
        if (Date.now() < this.invincibleUntil) return false;

        // 같은 레인에 있는지 체크 (레인 기반 판정)
        const planeCenterX = plane.x + plane.width / 2;
        const obsCenterX = obs.x + obs.size / 2;

        const margin = 8;
        return (
            Math.abs(planeCenterX - obsCenterX) < 35 &&
            plane.y + margin < obs.y + obs.size - margin &&
            plane.y + plane.height - margin > obs.y + margin
        );
    }

    handleCollision(obs) {
        if (obs.type === "bird" || obs.type === "bigbird") {
            // 새 충돌 - 생명 차감
            this.lives--;
            this.invincibleUntil = Date.now() + 1500; // 1.5초 무적

            if (this.lives <= 0) {
                // 비행기 폭파 (파티클 대량 생성)
                if (window.soundManager) window.soundManager.playExplosion();
                for (let i = 0; i < 20; i++) {
                    this.particles.push({
                        x: this.plane.x + this.plane.width / 2,
                        y: this.plane.y + this.plane.height / 2,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                        life: 50,
                        color: "#FF4400"
                    });
                }
                this.stop();
                return;
            }

            // 폭발 이펙트
            this.explosions.push({
                x: obs.x + obs.size / 2,
                y: obs.y + obs.size / 2,
                duration: 20
            });

            // 파티클 (깃털 날리기)
            for (let i = 0; i < 8; i++) {
                this.particles.push({
                    x: obs.x + obs.size / 2,
                    y: obs.y + obs.size / 2,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 30,
                    color: obs.type === "bigbird" ? "#8B0000" : "#FFD700"
                });
            }

            if (window.soundManager) window.soundManager.playExplosion();

        } else if (obs.type === "star") {
            this.score += 100;
            if (window.soundManager) window.soundManager.playCatch();
            this.spawnScoreParticles(obs.x, obs.y, "+100", "#FFD700");

        } else if (obs.type === "diamond") {
            this.score += 300;
            if (window.soundManager) window.soundManager.playBonus();
            this.spawnScoreParticles(obs.x, obs.y, "+300", "#00BFFF");

        } else if (obs.type === "chicken") {
            this.score += 1000;
            if (window.soundManager) window.soundManager.playChicken();
            this.spawnScoreParticles(obs.x, obs.y, "+1000!", "#FF6347");
        } else if (obs.type === "heart") {
            if (this.lives < this.maxLives) {
                this.lives++;
                if (window.soundManager) window.soundManager.playCatch();
                this.spawnScoreParticles(obs.x, obs.y, "LIFE UP!", "#FF1493");
            } else {
                this.score += 500; // 풀피일 땐 보너스 점수
                if (window.soundManager) window.soundManager.playBonus();
                this.spawnScoreParticles(obs.x, obs.y, "+500", "#FFC0CB");
            }
        }

        if (this.onScoreChange) {
            this.onScoreChange(Math.floor(this.score), this.level);
        }
    }

    spawnScoreParticles(x, y, text, color) {
        this.particles.push({
            x, y,
            vx: 0,
            vy: -2,
            life: 40,
            color,
            text
        });
    }

    checkLevelUp() {
        const newLevel = Math.floor(this.score / 500) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.obstacleSpeed = Math.min(6, 2 + this.level * 0.4);
            this.spawnInterval = Math.max(400, 1200 - this.level * 80);
        }
    }

    /**
     * 캔버스에 게임 요소 그리기
     */
    draw(ctx) {
        if (!this.isGameActive) return;

        // === 하늘 배경 ===
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        gradient.addColorStop(0, "#1a1a4e");
        gradient.addColorStop(0.5, "#2d5aa0");
        gradient.addColorStop(1, "#87CEEB");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // 배경 별 (작은 점들)
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        for (let i = 0; i < 30; i++) {
            const sx = (i * 137 + this.bgOffset * 0.3) % this.canvasWidth;
            const sy = (i * 97 + this.bgOffset * 0.5) % this.canvasHeight;
            ctx.fillRect(sx, sy, 2, 2);
        }

        // === 레인 구분선 ===
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        // 레인 1 | 레인 2 경계
        ctx.beginPath();
        ctx.moveTo(266, 0);
        ctx.lineTo(266, this.canvasHeight);
        ctx.stroke();
        // 레인 2 | 레인 3 경계
        ctx.beginPath();
        ctx.moveTo(532, 0);
        ctx.lineTo(532, this.canvasHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // === 구름 ===
        for (const cloud of this.clouds) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, cloud.size / 2, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.size * 0.3, cloud.y - cloud.size * 0.15, cloud.size / 2.5, 0, Math.PI * 2);
            ctx.arc(cloud.x - cloud.size * 0.3, cloud.y - cloud.size * 0.1, cloud.size / 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // === 장애물 & 아이템 ===
        for (const obs of this.obstacles) {
            // 배경 원 (그림자)
            if (obs.type === "bird" || obs.type === "bigbird") {
                ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
                ctx.beginPath();
                ctx.arc(obs.x + obs.size / 2, obs.y + obs.size / 2, obs.size / 2 + 3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // 아이템 글로우
                const glowColors = {
                    star: "rgba(255, 215, 0, 0.4)",
                    diamond: "rgba(0, 191, 255, 0.4)",
                    chicken: "rgba(255, 99, 71, 0.4)",
                    heart: "rgba(255, 20, 147, 0.5)"
                };
                ctx.fillStyle = glowColors[obs.type] || "rgba(255,255,255,0.3)";
                ctx.beginPath();
                ctx.arc(obs.x + obs.size / 2, obs.y + obs.size / 2, obs.size / 2 + 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // 이모지 그리기
            ctx.font = `${obs.size}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(obs.emoji, obs.x + obs.size / 2, obs.y + obs.size / 2);
        }

        // === 비행기 ===
        const isInvincible = Date.now() < this.invincibleUntil;
        const shouldDraw = !isInvincible || Math.floor(Date.now() / 100) % 2 === 0;

        if (shouldDraw) {
            const px = this.plane.x;
            const py = this.plane.y;
            const pw = this.plane.width;
            const ph = this.plane.height;

            // 엔진 화염
            ctx.fillStyle = "#FF6600";
            const flameHeight = 8 + Math.random() * 8;
            ctx.beginPath();
            ctx.moveTo(px + pw / 2 - 5, py + ph);
            ctx.lineTo(px + pw / 2 + 5, py + ph);
            ctx.lineTo(px + pw / 2, py + ph + flameHeight);
            ctx.closePath();
            ctx.fill();

            if (this.isPlaneImgLoaded) {
                // 이미지 뒤집기? 비행기 이미지가 위를 보고 있다면 그대로 그림
                // 만약 이미지가 너무 크다면 스케일 조정 필요할 수 있음. 
                // 일단 pw, ph에 맞춰 그림.
                // 이미지가 '전투기' 형태인지 '여객기' 형태인지에 따라 비율이 다를 수 있음.
                // 제공된 이미지를 최대한 박스 안에 맞춤.

                // 그림자 (이미지일 때)
                ctx.fillStyle = "rgba(0,0,0,0.2)";
                ctx.beginPath();
                ctx.ellipse(px + pw / 2, py + ph + 10, pw / 2, 5, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.drawImage(this.planeImg, px - 10, py - 10, pw + 20, ph + 20); // 약간 여유 있게
            } else {
                // 폴백 (기존 그리기 코드)
                // 비행기 몸체
                ctx.fillStyle = "#E0E0E0";
                ctx.beginPath();
                ctx.moveTo(px + pw / 2, py);            // 코
                ctx.lineTo(px + pw * 0.7, py + ph * 0.3);
                ctx.lineTo(px + pw * 0.7, py + ph);
                ctx.lineTo(px + pw * 0.3, py + ph);
                ctx.lineTo(px + pw * 0.3, py + ph * 0.3);
                ctx.closePath();
                ctx.fill();

                // 날개
                ctx.fillStyle = "#B0B0B0";
                // 왼쪽 날개
                ctx.beginPath();
                ctx.moveTo(px + pw * 0.3, py + ph * 0.4);
                ctx.lineTo(px - 10, py + ph * 0.7);
                ctx.lineTo(px + pw * 0.3, py + ph * 0.7);
                ctx.closePath();
                ctx.fill();
                // 오른쪽 날개
                ctx.beginPath();
                ctx.moveTo(px + pw * 0.7, py + ph * 0.4);
                ctx.lineTo(px + pw + 10, py + ph * 0.7);
                ctx.lineTo(px + pw * 0.7, py + ph * 0.7);
                ctx.closePath();
                ctx.fill();

                // 꼬리 날개
                ctx.fillStyle = "#C0C0C0";
                ctx.beginPath();
                ctx.moveTo(px + pw * 0.35, py + ph * 0.85);
                ctx.lineTo(px + pw * 0.15, py + ph);
                ctx.lineTo(px + pw * 0.35, py + ph);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(px + pw * 0.65, py + ph * 0.85);
                ctx.lineTo(px + pw * 0.85, py + ph);
                ctx.lineTo(px + pw * 0.65, py + ph);
                ctx.closePath();
                ctx.fill();

                // 조종석 (창문)
                ctx.fillStyle = "#4FC3F7";
                ctx.beginPath();
                ctx.arc(px + pw / 2, py + ph * 0.25, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 무적 실드 효과
        if (isInvincible) {
            ctx.save();
            ctx.strokeStyle = "rgba(255, 100, 100, 0.6)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
                this.plane.x + this.plane.width / 2,
                this.plane.y + this.plane.height / 2,
                30, 0, Math.PI * 2
            );
            ctx.stroke();
            ctx.restore();
        }

        // === 파티클 ===
        for (const p of this.particles) {
            if (p.text) {
                ctx.fillStyle = p.color;
                ctx.font = "bold 18px Arial";
                ctx.textAlign = "center";
                ctx.globalAlpha = p.life / 40;
                ctx.fillText(p.text, p.x, p.y);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / 30;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // === 폭발 ===
        for (const exp of this.explosions) {
            ctx.font = "60px Arial";
            ctx.textAlign = "center";
            ctx.globalAlpha = exp.duration / 20;
            ctx.fillText("💥", exp.x, exp.y);
            ctx.globalAlpha = 1;
        }

        // === UI (점수, 레벨) ===
        ctx.save();
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // 레벨 (왼쪽 상단)
        ctx.fillStyle = "cyan";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`Lv. ${this.level}`, 15, 30);

        // 생명 (❤️ 아이콘)
        const heartY = 60;
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = i < this.lives ? "#FF0000" : "#555555";
            ctx.font = "20px Arial";
            ctx.fillText(i < this.lives ? "❤️" : "🖤", 15 + i * 25, heartY);
        }

        // 점수 (오른쪽 상단)
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "right";
        ctx.fillText(`점수: ${Math.floor(this.score)}`, 790, 30);

        ctx.restore();

        // 조작 안내 (처음 5초간)
        if (this.score < 30) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.font = "16px Arial";
            ctx.textAlign = "center";
            ctx.fillText("← → 방향키로 레인을 이동하세요!", 400, 580);
        }
    }

    processImageBackground(imgObj, callback) {
        // 배경 제거 로직 (Mario Escape와 동일하게 강력한 버전 적용)
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = imgObj.width;
        tempCanvas.height = imgObj.height;
        tempCtx.drawImage(imgObj, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // 1. 아주 밝은 흰색 계열
            const isWhite = r > 235 && g > 235 && b > 235;
            // 2. 전형적인 회색 체크무늬 (무채색 & 밝음)
            const diff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(b - r));
            const isNeutral = diff < 10;
            const isLightColor = (r + g + b) / 3 > 180;
            // 3. 특정 회색톤
            const isCheckerboardGray = (r > 180 && r < 225) && (g > 180 && g < 225) && (b > 180 && b < 225);

            if (isWhite || (isNeutral && isLightColor) || isCheckerboardGray) {
                data[i + 3] = 0;
            }
        }

        tempCtx.putImageData(imageData, 0, 0);
        const processedImg = new Image();
        processedImg.src = tempCanvas.toDataURL();
        processedImg.onload = () => {
            callback(processedImg);
        };
    }

    // 콜백 등록
    setScoreChangeCallback(callback) { this.onScoreChange = callback; }
    setGameEndCallback(callback) { this.onGameEnd = callback; }
}

window.BirdStrikeEngine = BirdStrikeEngine;
