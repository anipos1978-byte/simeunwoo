/**
 * kirbyRunner.js
 * 커비 플라잉 러너 게임 엔진
 * 커비가 달리면서 장애물을 날아서 피하는 횡스크롤 게임
 * 스페이스바: 날기 (누르고 있으면 떠오르고, 떼면 내려옴)
 * 무한 모드 (Endless)
 */

class KirbyRunnerEngine {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.isGameActive = false;
        this.gameLoopId = null;

        this.onScoreChange = null;
        this.onGameEnd = null;

        this.canvasWidth = 400;
        this.canvasHeight = 400;

        // 바닥 Y좌표
        this.groundY = 320;

        // 커비 상태
        this.kirby = {
            x: 80,
            y: this.groundY,
            width: 35,
            height: 35,
            vy: 0,           // 수직 속도
            isFlying: false,  // 날기 상태
            puffCheeks: false // 볼 부풀리기
        };

        // 물리
        this.gravity = 0.35;
        this.flyPower = -0.8; // 날기 힘 (위로)
        this.maxFlySpeed = -4;

        // 게임 오브젝트
        this.obstacles = [];
        this.items = [];
        this.particles = [];
        this.clouds = [];
        this.stars = []; // 배경 별

        // 스폰 타이밍
        this.lastObstacleSpawn = 0;
        this.lastItemSpawn = 0;
        this.obstacleSpawnInterval = 2000;
        this.itemSpawnInterval = 3500;
        this.scrollSpeed = 3;

        // 무적
        this.invincibleUntil = 0;

        // 배경
        this.bgOffset = 0;

        // 키보드 바인딩
        this._onKeyDown = this._handleKeyDown.bind(this);
        this._onKeyUp = this._handleKeyUp.bind(this);

        // 이미지 로드
        this.kirbyImg = new Image();
        this.kirbyImg.src = 'assets/images/kirby.png';
        this.isKirbyImgLoaded = false;
        this.kirbyImg.onload = () => {
            this.processImageBackground(this.kirbyImg, (img) => {
                this.kirbyImg = img;
                this.isKirbyImgLoaded = true;
            });
        };
    }

    start() {
        this.isGameActive = true;
        this.score = 0;
        this.level = 1;
        this.kirby.y = this.groundY;
        this.kirby.vy = 0;
        this.kirby.isFlying = false;
        this.kirby.puffCheeks = false;
        this.obstacles = [];
        this.items = [];
        this.particles = [];
        this.clouds = [];
        this.stars = [];
        this.scrollSpeed = 3;
        this.obstacleSpawnInterval = 2000;
        this.lastObstacleSpawn = 0;
        this.lastItemSpawn = 0;
        this.invincibleUntil = 0;
        this.bgOffset = 0;

        // 배경 별 초기화
        for (let i = 0; i < 30; i++) {
            this.stars.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.7,
                size: 1 + Math.random() * 2,
                twinkle: Math.random() * Math.PI * 2
            });
        }

        // 초기 구름
        for (let i = 0; i < 4; i++) {
            this.clouds.push({
                x: Math.random() * this.canvasWidth,
                y: 30 + Math.random() * 100,
                size: 30 + Math.random() * 40,
                speed: 0.3 + Math.random() * 0.5
            });
        }

        document.addEventListener("keydown", this._onKeyDown);
        document.addEventListener("keyup", this._onKeyUp);
        this.startGameLoop();
    }

    stop() {
        this.isGameActive = false;
        this.stopGameLoop();
        document.removeEventListener("keydown", this._onKeyDown);
        document.removeEventListener("keyup", this._onKeyUp);

        if (window.soundManager) window.soundManager.playGameOver();
        if (this.onGameEnd) {
            this.onGameEnd(Math.floor(this.score), this.level);
        }
    }

    _handleKeyDown(e) {
        if (e.key === " ") {
            e.preventDefault();
            this.kirby.isFlying = true;
            this.kirby.puffCheeks = true;
        }
    }

    _handleKeyUp(e) {
        if (e.key === " ") {
            this.kirby.isFlying = false;
        }
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
        // === 커비 물리 ===
        if (this.kirby.isFlying) {
            // 날기: 위로 올라감
            this.kirby.vy += this.flyPower;
            this.kirby.vy = Math.max(this.kirby.vy, this.maxFlySpeed);

            // 날기 파티클 (공기 퍼프)
            if (Math.random() < 0.3) {
                this.particles.push({
                    x: this.kirby.x + this.kirby.width / 2,
                    y: this.kirby.y + this.kirby.height,
                    vx: (Math.random() - 0.5) * 2,
                    vy: 1 + Math.random(),
                    life: 15,
                    color: "rgba(255, 255, 255, 0.6)",
                    size: 3 + Math.random() * 4
                });
            }
        } else {
            // 중력
            this.kirby.vy += this.gravity;
        }

        this.kirby.y += this.kirby.vy;

        // 바닥 충돌
        if (this.kirby.y >= this.groundY) {
            this.kirby.y = this.groundY;
            this.kirby.vy = 0;
            this.kirby.puffCheeks = false;
        }

        // 천장 제한
        if (this.kirby.y < 20) {
            this.kirby.y = 20;
            this.kirby.vy = 0;
        }

        // 배경 스크롤
        this.bgOffset = (this.bgOffset + this.scrollSpeed * 0.5) % this.canvasWidth;

        // 구름 이동
        for (const c of this.clouds) {
            c.x -= c.speed;
            if (c.x < -c.size) {
                c.x = this.canvasWidth + c.size;
                c.y = 30 + Math.random() * 100;
            }
        }

        // === 장애물 스폰 ===
        if (timestamp - this.lastObstacleSpawn > this.obstacleSpawnInterval) {
            this.spawnObstacle();
            this.lastObstacleSpawn = timestamp;
        }

        // === 아이템 스폰 ===
        if (timestamp - this.lastItemSpawn > this.itemSpawnInterval) {
            this.spawnItem();
            this.lastItemSpawn = timestamp;
        }

        // === 장애물 이동 & 충돌 ===
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.scrollSpeed * (obs.speedMult || 1);

            if (obs.x + obs.width < -20) {
                // 피함! +10점
                this.score += 10;
                this.obstacles.splice(i, 1);
                continue;
            }

            // 충돌 검사
            if (Date.now() > this.invincibleUntil && this.checkCollision(this.kirby, obs)) {
                this.score = Math.max(0, this.score - 200);
                this.invincibleUntil = Date.now() + 1500;
                this.obstacles.splice(i, 1);

                // 충격 파티클
                for (let j = 0; j < 6; j++) {
                    this.particles.push({
                        x: this.kirby.x + this.kirby.width / 2,
                        y: this.kirby.y + this.kirby.height / 2,
                        vx: (Math.random() - 0.5) * 5,
                        vy: (Math.random() - 0.5) * 5,
                        life: 20,
                        color: "#FF6666",
                        size: 3
                    });
                }

                if (window.soundManager) window.soundManager.playExplosion();
                if (this.onScoreChange) this.onScoreChange(Math.floor(this.score), this.level);
            }
        }

        // === 아이템 이동 & 수집 ===
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.x -= this.scrollSpeed;

            if (item.x < -30) {
                this.items.splice(i, 1);
                continue;
            }

            if (this.checkCollision(this.kirby, item)) {
                let pts = 0;
                if (item.type === "star") { pts = 100; if (window.soundManager) window.soundManager.playCatch(); }
                else if (item.type === "diamond") { pts = 300; if (window.soundManager) window.soundManager.playBonus(); }
                else if (item.type === "cake") { pts = 1000; if (window.soundManager) window.soundManager.playChicken(); }
                this.score += pts;

                this.particles.push({
                    x: item.x, y: item.y - 15,
                    vx: 0, vy: -1.5, life: 40,
                    color: "#FFD700",
                    text: `+${pts}${item.type === "cake" ? "!" : ""}`
                });

                this.items.splice(i, 1);
                if (this.onScoreChange) this.onScoreChange(Math.floor(this.score), this.level);
            }
        }

        // 파티클 업데이트
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx || 0;
            p.y += p.vy || 0;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // 레벨업
        this.checkLevelUp();
        this.score += 0.05;
    }

    spawnObstacle() {
        const rand = Math.random();
        let type, width, height, y, emoji;

        if (rand < 0.40) {
            // 바닥 장애물 (나무/바위)
            type = "ground";
            width = 30 + Math.random() * 20;
            height = 30 + Math.random() * 25;
            y = this.groundY + this.kirby.height - height;
            emoji = Math.random() < 0.5 ? "🌵" : "🪨";
        } else if (rand < 0.70) {
            // 공중 장애물 (Waddle Dee 느낌)
            type = "air";
            width = 30;
            height = 30;
            y = this.groundY - 60 - Math.random() * 80;
            emoji = "👾";
        } else if (rand < 0.85) {
            // 높은 벽 (날아서 넘어야 함)
            type = "wall";
            width = 25;
            height = 80 + Math.random() * 40;
            y = this.groundY + this.kirby.height - height;
            emoji = "🧱";
        } else {
            // 움직이는 적
            type = "waddle";
            width = 35;
            height = 35;
            y = this.groundY;
            emoji = "🍄";
        }

        this.obstacles.push({
            type, x: this.canvasWidth + 20,
            y, width, height, emoji,
            speedMult: 0.8 + Math.random() * 0.4
        });
    }

    spawnItem() {
        const rand = Math.random();
        let type, emoji;

        if (rand < 0.50) {
            type = "star";
            emoji = "⭐";
        } else if (rand < 0.80) {
            type = "diamond";
            emoji = "💎";
        } else {
            type = "cake";
            emoji = "🍰";
        }

        // 공중 또는 바닥 랜덤 배치
        const y = this.groundY - 30 - Math.random() * 150;

        this.items.push({
            type, emoji,
            x: this.canvasWidth + 20,
            y, width: 25, height: 25
        });
    }

    checkCollision(a, b) {
        const margin = 6;
        return (
            a.x + margin < b.x + b.width - margin &&
            a.x + a.width - margin > b.x + margin &&
            a.y + margin < b.y + b.height - margin &&
            a.y + a.height - margin > b.y + margin
        );
    }

    checkLevelUp() {
        const newLevel = Math.floor(this.score / 500) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.scrollSpeed = Math.min(7, 3 + this.level * 0.3);
            this.obstacleSpawnInterval = Math.max(600, 2000 - this.level * 100);
        }
    }

    draw(ctx) {
        if (!this.isGameActive) return;

        // === 배경 (드림랜드 느낌) ===
        const grad = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        grad.addColorStop(0, "#1a0a3e");
        grad.addColorStop(0.3, "#3a1a6e");
        grad.addColorStop(0.6, "#FF9AA2");
        grad.addColorStop(1, "#FFB7B2");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // 배경 별 반짝임
        for (const s of this.stars) {
            s.twinkle += 0.05;
            const alpha = 0.3 + Math.sin(s.twinkle) * 0.3;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 구름
        for (const c of this.clouds) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.size / 2, 0, Math.PI * 2);
            ctx.arc(c.x + c.size * 0.3, c.y - c.size * 0.12, c.size / 2.5, 0, Math.PI * 2);
            ctx.arc(c.x - c.size * 0.25, c.y - c.size * 0.08, c.size / 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // 바닥
        ctx.fillStyle = "#5CBF5C";
        ctx.fillRect(0, this.groundY + this.kirby.height, this.canvasWidth, this.canvasHeight - this.groundY);

        // 잔디 패턴
        ctx.fillStyle = "#4CAF50";
        for (let gx = -this.bgOffset % 20; gx < this.canvasWidth; gx += 20) {
            ctx.beginPath();
            ctx.moveTo(gx, this.groundY + this.kirby.height);
            ctx.lineTo(gx + 5, this.groundY + this.kirby.height - 8);
            ctx.lineTo(gx + 10, this.groundY + this.kirby.height);
            ctx.fill();
        }

        // === 아이템 ===
        for (const item of this.items) {
            const floatY = Math.sin(Date.now() * 0.005 + item.x) * 3;

            // 글로우
            const glowColors = { star: "rgba(255,215,0,0.3)", diamond: "rgba(0,191,255,0.3)", cake: "rgba(255,182,193,0.4)" };
            ctx.fillStyle = glowColors[item.type] || "rgba(255,255,255,0.3)";
            ctx.beginPath();
            ctx.arc(item.x + item.width / 2, item.y + item.height / 2 + floatY, 18, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = "22px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(item.emoji, item.x + item.width / 2, item.y + item.height / 2 + floatY);
        }

        // === 장애물 ===
        for (const obs of this.obstacles) {
            if (obs.type === "wall") {
                // 벽돌 벽
                ctx.fillStyle = "#8B4513";
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
                // 벽돌 라인
                ctx.strokeStyle = "rgba(0,0,0,0.3)";
                ctx.lineWidth = 1;
                for (let by = obs.y; by < obs.y + obs.height; by += 12) {
                    ctx.beginPath();
                    ctx.moveTo(obs.x, by);
                    ctx.lineTo(obs.x + obs.width, by);
                    ctx.stroke();
                }
            } else if (obs.type === "ground") {
                ctx.font = `${Math.min(obs.width, obs.height)}px Arial`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(obs.emoji, obs.x + obs.width / 2, obs.y + obs.height / 2);
            } else {
                // 적들
                ctx.font = `${obs.width}px Arial`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(obs.emoji, obs.x + obs.width / 2, obs.y + obs.height / 2);
            }
        }

        // === 커비 ===
        const isInvincible = Date.now() < this.invincibleUntil;
        const shouldDraw = !isInvincible || Math.floor(Date.now() / 100) % 2 === 0;

        if (shouldDraw) {
            this.drawKirby(ctx);
        }

        // === 파티클 ===
        for (const p of this.particles) {
            if (p.text) {
                ctx.fillStyle = p.color;
                ctx.font = "bold 16px Arial";
                ctx.textAlign = "center";
                ctx.globalAlpha = p.life / 40;
                ctx.fillText(p.text, p.x, p.y);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / 20;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // === UI ===
        ctx.save();
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = "cyan";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`Lv. ${this.level}`, 15, 30);

        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "right";
        ctx.fillText(`점수: ${Math.floor(this.score)}`, 390, 30);

        ctx.restore();

        // 조작 안내
        if (this.score < 30) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.font = "16px Arial";
            ctx.textAlign = "center";
            ctx.fillText("SPACE 꾹 누르면 커비가 날아요!", 200, 50);
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

    drawKirby(ctx) {
        const kx = this.kirby.x;
        const ky = this.kirby.y;
        const kw = this.kirby.width;
        const kh = this.kirby.height;
        const cx = kx + kw / 2;
        const cy = ky + kh / 2;
        const isFlying = this.kirby.isFlying || this.kirby.y < this.groundY - 5;

        // === 그림자 ===
        if (this.kirby.y < this.groundY) {
            const shadowScale = 1 - (this.groundY - this.kirby.y) / 300;
            ctx.fillStyle = "rgba(0,0,0,0.15)";
            ctx.beginPath();
            ctx.ellipse(cx, this.groundY + kh, 18 * Math.max(0.3, shadowScale), 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.isKirbyImgLoaded) {
            ctx.save();
            ctx.translate(cx, cy);

            if (isFlying) {
                // 날 때는 약간 뒤로 젖혀짐 + 펄럭임
                const flapAngle = Math.sin(Date.now() * 0.025) * 0.1;
                ctx.rotate(-0.2 + flapAngle);
                // 볼 부풀리기 효과 (살짝 커짐)
                if (this.kirby.puffCheeks) {
                    ctx.scale(1.1, 1.1);
                }
            } else {
                // 달릴 때는 통통 튐
                const bounce = Math.sin(Date.now() * 0.02) * 0.05;
                ctx.scale(1 + bounce, 1 - bounce);
            }

            ctx.drawImage(this.kirbyImg, -kw / 2, -kh / 2, kw, kh);
            ctx.restore();
        } else {
            // 폴백 (기존 그리기 코드)
            // === 몸체 (진짜 커비 핑크) ===
            ctx.fillStyle = "#FFB7C5";
            ctx.beginPath();
            if (isFlying && this.kirby.puffCheeks) {
                // 볼 부풀리기: 옆으로 조금 더 넓고 둥글게
                ctx.ellipse(cx, cy, kw / 2 + 5, kh / 2 + 6, 0, 0, Math.PI * 2);
            } else {
                // 일반: 아주 살짝 세로로 통통하게
                ctx.ellipse(cx, cy, kw / 2, kh / 2 + 1, 0, 0, Math.PI * 2);
            }
            ctx.fill();

            // ... (나머지 그리기 코드 생략 - 너무 길어서 폴백은 몸체만 남김)
            // 눈 (대략적으로)
            ctx.fillStyle = "black";
            ctx.beginPath(); ctx.ellipse(cx - 6, cy - 3, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(cx + 6, cy - 3, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
        }
    }

    setScoreChangeCallback(callback) { this.onScoreChange = callback; }
    setGameEndCallback(callback) { this.onGameEnd = callback; }
}

window.KirbyRunnerEngine = KirbyRunnerEngine;
