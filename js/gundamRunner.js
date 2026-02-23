/**
 * gundamRunner.js
 * 건담 러너 게임 엔진
 * 건담이 한 방향으로 달리며 자쿠를 빔사벨로 부수는 횡스크롤 게임
 * 스페이스바: 빔사벨 공격
 * 무한 모드 (Endless) - 1레인
 */

class GundamRunnerEngine {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.isGameActive = false;
        this.gameLoopId = null;

        this.onScoreChange = null;
        this.onGameEnd = null;

        this.canvasWidth = 800;
        this.canvasHeight = 600;

        // 건담 상태 (1레인 - 화면 중앙)
        this.gundam = {
            x: 60,
            y: 450, // 위치 조정
            width: 70, // 더 듬직하게 너비 증가 (기존 50)
            height: 90, // 키도 약간 더 늘림
            isAttacking: false,
            attackFrame: 0,
            attackDuration: 15
        };

        // 게임 오브젝트
        this.enemies = [];
        this.items = [];
        this.effects = [];
        this.particles = [];

        // 스폰 타이밍
        this.lastEnemySpawn = 0;
        this.lastItemSpawn = 0;
        this.enemySpawnInterval = 1800;
        this.itemSpawnInterval = 4000;
        this.scrollSpeed = 3;

        // 배경
        this.bgOffset = 0;
        this.groundOffset = 0;

        // 콤보
        this.combo = 0;
        this.maxCombo = 0;

        // 키보드 바인딩
        this._onKeyDown = this._handleKeyDown.bind(this);

        // 이미지 로드 (건담 & 자쿠)
        this.gundamIdleImg = new Image();
        this.gundamIdleImg.src = 'assets/images/gundam_idle.png';
        this.isGundamIdleImgLoaded = false;
        this.gundamIdleImg.onload = () => { this.isGundamIdleImgLoaded = true; };

        this.gundamAttackImg = new Image();
        this.gundamAttackImg.src = 'assets/images/gundam_attack.png';
        this.isGundamAttackImgLoaded = false;
        this.gundamAttackImg.onload = () => { this.isGundamAttackImgLoaded = true; };

        this.zakuImg = new Image();
        this.zakuImg.src = 'assets/images/zaku.png';
        this.isZakuImgLoaded = false;
        this.zakuImg.onload = () => {
            this.processImageBackground(this.zakuImg, (img) => {
                this.zakuImg = img;
                this.isZakuImgLoaded = true;
                this.prepareBossImage(); // 자쿠 로드 후 보스(빨간색) 이미지 생성
            });
        };
    }

    start() {
        this.isGameActive = true;
        this.score = 0;
        this.level = 1;
        this.lives = 5;
        this.maxLives = 5;
        this.combo = 0;
        this.maxCombo = 0;
        this.enemies = [];
        this.items = [];
        this.effects = [];
        this.particles = [];
        this.scrollSpeed = 3;
        this.enemySpawnInterval = 1800;
        this.lastEnemySpawn = 0;
        this.lastItemSpawn = 0;
        this.bgOffset = 0;
        this.groundOffset = 0;
        this.gundam.isAttacking = false;
        this.gundam.attackFrame = 0;

        document.addEventListener("keydown", this._onKeyDown);
        this.startGameLoop();
    }

    stop() {
        this.isGameActive = false;
        this.stopGameLoop();
        document.removeEventListener("keydown", this._onKeyDown);

        if (window.soundManager) window.soundManager.playGameOver();
        if (this.onGameEnd) {
            this.onGameEnd(Math.floor(this.score), this.level);
        }
    }

    _handleKeyDown(e) {
        if (e.key === " ") {
            e.preventDefault();
            if (!this.gundam.isAttacking) {
                this.gundam.isAttacking = true;
                this.gundam.attackFrame = this.gundam.attackDuration;
                if (window.soundManager) window.soundManager.playShoot();
                this.performAttack();
            }
        }
    }

    performAttack() {
        const attackRange = {
            x: this.gundam.x + this.gundam.width,
            y: this.gundam.y - 40,
            width: 90,
            height: 80
        };

        // 슬래시 이펙트
        this.effects.push({
            x: attackRange.x,
            y: this.gundam.y,
            duration: 12,
            type: "slash"
        });

        let hitAny = false;

        // 적 충돌 체크
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (
                e.x < attackRange.x + attackRange.width &&
                e.x + e.width > attackRange.x &&
                e.y + e.height > attackRange.y &&
                e.y < attackRange.y + attackRange.height
            ) {
                hitAny = true;
                this.combo++;
                if (this.combo > this.maxCombo) this.maxCombo = this.combo;

                const basePoints = e.type === "boss" ? 500 : 100;
                const comboBonus = Math.min(this.combo * 10, 200);
                const points = basePoints + comboBonus;
                this.score += points;

                // 폭발 파티클 (녹색 = 자쿠, 빨간색 = 보스)
                for (let j = 0; j < 12; j++) {
                    this.particles.push({
                        x: e.x + e.width / 2,
                        y: e.y + e.height / 2,
                        vx: (Math.random() - 0.5) * 8,
                        vy: (Math.random() - 0.5) * 8,
                        life: 25,
                        color: e.type === "boss" ? "#FF4444" : "#44FF44"
                    });
                }

                // 점수 파티클
                this.particles.push({
                    x: e.x, y: e.y - 20,
                    vx: 0, vy: -1.5,
                    life: 40,
                    color: "#FFD700",
                    text: `+${points}`
                });

                if (window.soundManager) window.soundManager.playExplosion();
                this.enemies.splice(i, 1);

                if (this.onScoreChange) {
                    this.onScoreChange(Math.floor(this.score), this.level);
                }
            }
        }

        if (!hitAny) {
            this.combo = 0; // 빈 공격이면 콤보 리셋
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
        // 공격 프레임 감소
        if (this.gundam.attackFrame > 0) {
            this.gundam.attackFrame--;
            if (this.gundam.attackFrame <= 0) {
                this.gundam.isAttacking = false;
            }
        }

        // 배경 스크롤
        this.bgOffset = (this.bgOffset + this.scrollSpeed * 0.5) % this.canvasWidth;
        this.groundOffset = (this.groundOffset + this.scrollSpeed) % 40;

        // 적 스폰
        if (timestamp - this.lastEnemySpawn > this.enemySpawnInterval) {
            this.spawnEnemy();
            this.lastEnemySpawn = timestamp;
        }

        // 아이템 스폰
        if (timestamp - this.lastItemSpawn > this.itemSpawnInterval) {
            this.spawnItem();
            this.lastItemSpawn = timestamp;
        }

        // 적 이동
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.x -= this.scrollSpeed * (e.speedMult || 1);

            if (e.x + e.width < -20) {
                // 자쿠 놓침 → 생명 차감 & 콤보 리셋
                this.lives--;
                this.combo = 0;
                this.enemies.splice(i, 1);

                if (this.lives <= 0) {
                    this.stop();
                    return;
                }

                if (this.onScoreChange) {
                    this.onScoreChange(Math.floor(this.score), this.level);
                }
                continue;
            }

            // 건담과 충돌 (공격하지 않고 부딪힘)
            if (
                !this.gundam.isAttacking &&
                e.x < this.gundam.x + this.gundam.width + 5 &&
                e.x + e.width > this.gundam.x &&
                e.y + e.height > this.gundam.y - 20 &&
                e.y < this.gundam.y + this.gundam.height
            ) {
                this.lives--;
                this.combo = 0;
                this.enemies.splice(i, 1);

                if (this.lives <= 0) {
                    this.stop();
                    return;
                }

                this.effects.push({
                    x: this.gundam.x + this.gundam.width,
                    y: this.gundam.y,
                    duration: 15,
                    type: "hit"
                });
                if (window.soundManager) window.soundManager.playExplosion();
                if (this.onScoreChange) {
                    this.onScoreChange(Math.floor(this.score), this.level);
                }
            }
        }

        // 아이템 이동
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.x -= this.scrollSpeed;

            if (item.x < -30) {
                this.items.splice(i, 1);
                continue;
            }

            // 건담과 충돌 (자동 수집)
            if (
                item.x < this.gundam.x + this.gundam.width + 10 &&
                item.x + item.size > this.gundam.x
            ) {
                let pts = 0;
                if (item.type === "star") {
                    pts = 100;
                    if (window.soundManager) window.soundManager.playCatch();
                } else if (item.type === "diamond") {
                    pts = 300;
                    if (window.soundManager) window.soundManager.playBonus();
                } else if (item.type === "chicken") {
                    pts = 1000;
                    if (window.soundManager) window.soundManager.playChicken();
                } else if (item.type === "heart") {
                    if (this.lives < this.maxLives) {
                        this.lives++;
                        if (window.soundManager) window.soundManager.playCatch();
                    }
                    pts = 50; // 하트도 약간의 점수 제공
                }
                this.score += pts;

                this.particles.push({
                    x: item.x, y: item.y - 20,
                    vx: 0, vy: -1.5, life: 40,
                    color: item.type === "diamond" ? "#00BFFF" : "#FFD700",
                    text: `+${pts}${item.type === "chicken" ? "!" : ""}`
                });

                this.items.splice(i, 1);
                if (this.onScoreChange) {
                    this.onScoreChange(Math.floor(this.score), this.level);
                }
            }
        }

        // 이펙트 업데이트
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].duration--;
            if (this.effects[i].duration <= 0) this.effects.splice(i, 1);
        }

        // 파티클 업데이트
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // 레벨업
        this.checkLevelUp();

        // 시간 보너스
        this.score += 0.05;
    }

    spawnEnemy() {
        const rand = Math.random();

        let type, width, height, speedMult, yOffset;

        if (rand < 0.75) {
            // 일반 자쿠 (75%)
            type = "zaku";
            width = 45;
            height = 75; // 키 늘림 (기존 55)
            speedMult = 0.8 + Math.random() * 0.5;
            yOffset = 0;
        } else {
            // 보스 자쿠 - 샤아 전용기 (25%)
            type = "boss";
            width = 55;
            height = 90; // 키 늘림 (기존 65)
            speedMult = 0.5 + Math.random() * 0.3;
            yOffset = -15; // 키가 커진 만큼 위치 조정
        }

        this.enemies.push({
            type,
            x: this.canvasWidth + 20 + Math.random() * 60,
            y: this.gundam.y + yOffset,
            width,
            height,
            speedMult
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
        } else if (rand < 0.90) {
            type = "chicken";
            emoji = "🍗";
        } else {
            type = "heart";
            emoji = "❤️";
        }

        // 아이템은 공중에 떠있음 (건담 위에)
        this.items.push({
            type,
            emoji,
            x: this.canvasWidth + 20,
            y: this.gundam.y - 30 - Math.random() * 30,
            size: 25
        });
    }

    checkLevelUp() {
        const newLevel = Math.floor(this.score / 500) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.scrollSpeed = Math.min(7, 3 + this.level * 0.3);
            this.enemySpawnInterval = Math.max(600, 1800 - this.level * 100);
        }
    }

    draw(ctx) {
        if (!this.isGameActive) return;

        // === 배경 (우주/콜로니) ===
        const grad = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        grad.addColorStop(0, "#050520");
        grad.addColorStop(0.6, "#0a0a3e");
        grad.addColorStop(1, "#1a1520");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // 배경 별
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        for (let i = 0; i < 50; i++) {
            const sx = (i * 97 + this.canvasWidth - this.bgOffset) % this.canvasWidth;
            const sy = (i * 67) % (this.canvasHeight * 0.6);
            const sz = (i % 3 === 0) ? 2 : 1;
            ctx.fillRect(sx, sy, sz, sz);
        }

        // 바닥 (메탈 그라운드)
        const groundY = this.gundam.y + this.gundam.height - 5;
        ctx.fillStyle = "#333";
        ctx.fillRect(0, groundY, this.canvasWidth, this.canvasHeight - groundY);

        // 바닥 라인
        ctx.strokeStyle = "rgba(100, 150, 255, 0.3)";
        ctx.lineWidth = 1;
        for (let gx = -this.groundOffset; gx < this.canvasWidth; gx += 40) {
            ctx.beginPath();
            ctx.moveTo(gx, groundY);
            ctx.lineTo(gx + 20, groundY);
            ctx.stroke();
        }

        // 바닥 하이라이트
        ctx.fillStyle = "rgba(100, 150, 255, 0.05)";
        ctx.fillRect(0, groundY, this.canvasWidth, 3);

        // 배경 건물 실루엣 (스크롤)
        ctx.fillStyle = "rgba(30, 30, 60, 0.8)";
        for (let bx = -this.bgOffset * 0.5; bx < this.canvasWidth + 100; bx += 80) {
            const bh = 40 + ((bx * 7) % 60);
            ctx.fillRect(bx % (this.canvasWidth + 100), groundY - bh, 35, bh);
        }

        // === 아이템 그리기 ===
        for (const item of this.items) {
            // 글로우
            const glowColors = {
                star: "rgba(255,215,0,0.3)",
                diamond: "rgba(0,191,255,0.3)",
                chicken: "rgba(255,99,71,0.3)",
                heart: "rgba(255,100,100,0.4)"
            };
            ctx.fillStyle = glowColors[item.type] || "rgba(255,255,255,0.3)";
            ctx.beginPath();
            ctx.arc(item.x + item.size / 2, item.y, item.size / 2 + 5, 0, Math.PI * 2);
            ctx.fill();

            // 떠있는 효과
            const floatY = Math.sin(Date.now() * 0.005 + item.x) * 3;
            ctx.font = `${item.size}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(item.emoji, item.x + item.size / 2, item.y + floatY);
        }

        // === 적 (자쿠) 그리기 ===
        for (const e of this.enemies) {
            this.drawZaku(ctx, e);
        }

        // === 건담 그리기 ===
        this.drawGundam(ctx);

        // === 슬래시/히트 이펙트 ===
        for (const eff of this.effects) {
            if (eff.type === "slash") {
                const alpha = eff.duration / 12;
                // 빔사벨 슬래시 호
                ctx.strokeStyle = `rgba(255, 150, 255, ${alpha})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(eff.x + 25, eff.y, 35 + (12 - eff.duration) * 3, -0.8, 0.8);
                ctx.stroke();

                // 내부 밝은 호
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(eff.x + 25, eff.y, 30 + (12 - eff.duration) * 3, -0.6, 0.6);
                ctx.stroke();
            } else if (eff.type === "hit") {
                ctx.font = "50px Arial";
                ctx.textAlign = "center";
                ctx.globalAlpha = eff.duration / 15;
                ctx.fillText("💥", eff.x, eff.y);
                ctx.globalAlpha = 1;
            }
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
                ctx.globalAlpha = p.life / 25;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
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

        // 레벨
        ctx.fillStyle = "cyan";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`Lv. ${this.level}`, 15, 30);

        // 콤보
        if (this.combo >= 2) {
            ctx.fillStyle = "#FF69B4";
            ctx.font = "bold 18px Arial";
            ctx.textAlign = "center";
            ctx.fillText(`${this.combo} 콤보!`, 400, 30);
        }

        // 생명 (❤️ 아이콘)
        ctx.textAlign = "left";
        const heartY = 60;
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = i < this.lives ? "#FF0000" : "#555555";
            ctx.font = "20px Arial";
            ctx.fillText(i < this.lives ? "❤️" : "🖤", 15 + i * 25, heartY);
        }

        // 점수
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "right";
        ctx.fillText(`점수: ${Math.floor(this.score)}`, 790, 30);

        ctx.restore();

        // 조작 안내
        if (this.score < 30) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.font = "16px Arial";
            ctx.textAlign = "center";
            ctx.fillText("SPACE 빔사벨로 자쿠를 부수세요!", 400, 50);
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

    prepareBossImage() {
        // 자쿠 이미지를 빨간색으로 틴트(tint)하여 보스 이미지 생성
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.zakuImg.width;
        canvas.height = this.zakuImg.height;

        // 원본 그리기
        ctx.drawImage(this.zakuImg, 0, 0);

        // 빨간색 오버레이
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // 붉은 틴트
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';

        this.bossImg = new Image();
        this.bossImg.src = canvas.toDataURL();
    }

    drawGundam(ctx) {
        const gx = this.gundam.x;
        const gy = this.gundam.y;
        const gw = this.gundam.width;
        const gh = this.gundam.height;

        // 달리기 애니메이션 (위아래 바운스)
        const runCycle = this.gundam.isAttacking ? 0 : Math.sin(Date.now() * 0.012) * 2;
        const bounceY = gy + runCycle;

        // 그림자
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(gx + gw / 2, gy + gh - 3, 25, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.gundam.isAttacking) {
            if (this.isGundamAttackImgLoaded && this.gundamAttackImg.complete) {
                // 공격 모션: 가로세로 비율 유지하며 듬직하게 출력 (칼과 하체 보호)
                const img = this.gundamAttackImg;
                const aspect = img.width / img.height;
                const drawH = gh * 1.8; // 공격 시에는 좀 더 웅장하게
                const drawW = drawH * aspect;
                // 바닥(gy + gh)에 발이 닿도록 정렬
                ctx.drawImage(img, gx - 50, (gy + gh) - drawH, drawW, drawH);
            } else {
                ctx.fillStyle = "#FF69B4";
                ctx.fillRect(gx, bounceY, gw, gh);
            }
        } else {
            if (this.isGundamIdleImgLoaded && this.gundamIdleImg.complete) {
                // 평상시 모션: 고유 비율을 유지하여 "날씬함" 문제 해결
                const img = this.gundamIdleImg;
                const aspect = img.width / img.height;
                const drawH = gh * 1.25; // 약간 더 크게
                const drawW = drawH * aspect;
                // 중앙 정렬 및 바닥 정렬
                ctx.drawImage(img, gx - (drawW - gw) / 2, (gy + gh) - drawH + runCycle, drawW, drawH);
            } else {
                // 폴백 (이미지 로드 전)
                ctx.fillStyle = "#1565C0";
                ctx.fillRect(gx + 15, bounceY, gw - 30, gh - 20);
            }
        }

        // === 빔사벨 효과 (이미지에 포함되지 않은 추가 이펙트가 필요할 때만 사용) ===
        // 현재는 새 이미지에 칼이 잘 살아있으므로 기존 수동 그리기 코드는 생략/최소화
    }

    drawZaku(ctx, e) {
        const ex = e.x;
        const ey = e.y;
        const ew = e.width;
        const eh = e.height;

        // 그림자
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(ex + ew / 2, ey + eh - 3, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        if (e.type === "boss" && this.bossImg) {
            // 보스 (빨간색 틴트된 이미지)
            ctx.drawImage(this.bossImg, ex - 10, ey - 10, ew + 20, eh + 15);
        } else if (e.type !== "boss" && this.isZakuImgLoaded) {
            // 일반 자쿠 (초록색 원본 이미지)
            ctx.drawImage(this.zakuImg, ex - 10, ey - 10, ew + 20, eh + 15);
        } else {
            // 폴백 (기존 도트 자쿠)
            if (e.type === "boss") {
                // 몸체
                ctx.fillStyle = "#CC0000";
                ctx.fillRect(ex + 10, ey - 15, ew - 20, eh - 10);
                // 머리
                ctx.fillStyle = "#AA0000";
                ctx.beginPath();
                ctx.arc(ex + ew / 2, ey - 18, 14, 0, Math.PI * 2);
                ctx.fill();
                // 뿔
                ctx.strokeStyle = "#FF4444";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(ex + ew / 2, ey - 32);
                ctx.lineTo(ex + ew / 2 - 10, ey - 45);
                ctx.stroke();
            } else {
                // 몸체
                ctx.fillStyle = "#2E7D32";
                ctx.fillRect(ex + 8, ey - 13, ew - 16, eh - 12);
                // 머리
                ctx.fillStyle = "#1B5E20";
                ctx.beginPath();
                ctx.arc(ex + ew / 2, ey - 16, 12, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    setScoreChangeCallback(callback) { this.onScoreChange = callback; }
    setGameEndCallback(callback) { this.onGameEnd = callback; }
}

window.GundamRunnerEngine = GundamRunnerEngine;
