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

        this.canvasWidth = 400;
        this.canvasHeight = 400;

        // 건담 상태 (1레인 - 화면 중앙)
        this.gundam = {
            x: 60,
            y: 280,
            width: 50,
            height: 60,
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
    }

    start() {
        this.isGameActive = true;
        this.score = 0;
        this.level = 1;
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
                // 자쿠 놓침 → 점수 차감 & 콤보 리셋
                this.score = Math.max(0, this.score - 200);
                this.combo = 0;
                this.enemies.splice(i, 1);
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
                this.score = Math.max(0, this.score - 150);
                this.combo = 0;
                this.enemies.splice(i, 1);

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
            height = 55;
            speedMult = 0.8 + Math.random() * 0.5;
            yOffset = 0;
        } else {
            // 보스 자쿠 - 샤아 전용기 (25%)
            type = "boss";
            width = 55;
            height = 65;
            speedMult = 0.5 + Math.random() * 0.3;
            yOffset = -5;
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
        } else {
            type = "chicken";
            emoji = "🍗";
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
            const glowColors = { star: "rgba(255,215,0,0.3)", diamond: "rgba(0,191,255,0.3)", chicken: "rgba(255,99,71,0.3)" };
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
            ctx.fillText(`${this.combo} 콤보!`, 200, 30);
        }

        // 점수
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "right";
        ctx.fillText(`점수: ${Math.floor(this.score)}`, 390, 30);

        ctx.restore();

        // 조작 안내
        if (this.score < 30) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.font = "16px Arial";
            ctx.textAlign = "center";
            ctx.fillText("SPACE 빔사벨로 자쿠를 부수세요!", 200, 50);
        }
    }

    drawGundam(ctx) {
        const gx = this.gundam.x;
        const gy = this.gundam.y;
        const gw = this.gundam.width;
        const gh = this.gundam.height;

        // 달리기 애니메이션
        const runCycle = Math.sin(Date.now() * 0.012) * 2;

        // 그림자
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(gx + gw / 2, gy + gh - 3, 25, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 건담 몸체 (흰색)
        ctx.fillStyle = "#F5F5F5";
        ctx.fillRect(gx + 12, gy - 22 + runCycle, gw - 24, gh - 12);

        // 가슴 (파란색)
        ctx.fillStyle = "#1565C0";
        ctx.beginPath();
        ctx.moveTo(gx + 14, gy - 10 + runCycle);
        ctx.lineTo(gx + gw - 14, gy - 10 + runCycle);
        ctx.lineTo(gx + gw / 2, gy + 5 + runCycle);
        ctx.closePath();
        ctx.fill();

        // 콕핏 (빨간색)
        ctx.fillStyle = "#D32F2F";
        ctx.beginPath();
        ctx.arc(gx + gw / 2, gy - 2 + runCycle, 4, 0, Math.PI * 2);
        ctx.fill();

        // 머리
        ctx.fillStyle = "#E0E0E0";
        ctx.beginPath();
        ctx.arc(gx + gw / 2, gy - 26 + runCycle, 11, 0, Math.PI * 2);
        ctx.fill();

        // V자 앙테나 (노랑)
        ctx.strokeStyle = "#FFD600";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(gx + gw / 2 - 13, gy - 43 + runCycle);
        ctx.lineTo(gx + gw / 2, gy - 30 + runCycle);
        ctx.lineTo(gx + gw / 2 + 13, gy - 43 + runCycle);
        ctx.stroke();

        // 눈 (노랑)
        ctx.fillStyle = "#FFEB3B";
        ctx.fillRect(gx + gw / 2 - 7, gy - 28 + runCycle, 14, 4);

        // 마스크
        ctx.fillStyle = "#BDBDBD";
        ctx.fillRect(gx + gw / 2 - 5, gy - 22 + runCycle, 10, 3);

        // 다리
        ctx.fillStyle = "#F5F5F5";
        ctx.fillRect(gx + 14, gy + gh - 38 + runCycle, 9, 18);
        ctx.fillRect(gx + gw - 23, gy + gh - 38 + runCycle, 9, 18);
        // 빨간 발
        ctx.fillStyle = "#D32F2F";
        ctx.fillRect(gx + 12, gy + gh - 22 + runCycle, 12, 5);
        ctx.fillRect(gx + gw - 24, gy + gh - 22 + runCycle, 12, 5);

        // === 빔사벨 ===
        if (this.gundam.isAttacking) {
            const progress = 1 - (this.gundam.attackFrame / this.gundam.attackDuration);
            const saberAngle = -Math.PI / 3 + progress * Math.PI * 0.6;

            ctx.save();
            ctx.translate(gx + gw - 5, gy - 10 + runCycle);
            ctx.rotate(saberAngle);

            // 빔 그라디언트
            const saberGrad = ctx.createLinearGradient(0, 0, 80, 0);
            saberGrad.addColorStop(0, "rgba(255, 100, 200, 1)");
            saberGrad.addColorStop(0.5, "rgba(255, 180, 255, 0.8)");
            saberGrad.addColorStop(1, "rgba(255, 220, 255, 0)");
            ctx.fillStyle = saberGrad;
            ctx.fillRect(0, -5, 80, 10);

            // 코어 빛
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.fillRect(0, -2, 75, 4);

            // 손잡이
            ctx.fillStyle = "#888";
            ctx.fillRect(-8, -4, 10, 8);

            ctx.restore();

            // 글로우
            ctx.fillStyle = "rgba(255, 100, 200, 0.12)";
            ctx.beginPath();
            ctx.arc(gx + gw + 30, gy + runCycle, 50, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 대기 - 실드 들고 있기
            ctx.fillStyle = "#1565C0";
            ctx.fillRect(gx - 8, gy - 15 + runCycle, 10, 30);
            // 실드 십자
            ctx.fillStyle = "#FDD835";
            ctx.fillRect(gx - 5, gy - 5 + runCycle, 4, 10);
            ctx.fillRect(gx - 7, gy - 1 + runCycle, 8, 3);
        }
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

        if (e.type === "boss") {
            // === 샤아 전용 자쿠 (빨간색) ===
            // 몸체
            ctx.fillStyle = "#CC0000";
            ctx.fillRect(ex + 10, ey - 15, ew - 20, eh - 10);
            // 머리
            ctx.fillStyle = "#AA0000";
            ctx.beginPath();
            ctx.arc(ex + ew / 2, ey - 18, 14, 0, Math.PI * 2);
            ctx.fill();
            // 모노아이
            ctx.fillStyle = "#FF69B4";
            ctx.beginPath();
            ctx.arc(ex + ew / 2 + 3, ey - 18, 4, 0, Math.PI * 2);
            ctx.fill();
            // 모노아이 글로우
            ctx.fillStyle = "rgba(255, 105, 180, 0.3)";
            ctx.beginPath();
            ctx.arc(ex + ew / 2 + 3, ey - 18, 8, 0, Math.PI * 2);
            ctx.fill();
            // 뿔
            ctx.strokeStyle = "#FF4444";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(ex + ew / 2, ey - 32);
            ctx.lineTo(ex + ew / 2 - 10, ey - 45);
            ctx.stroke();
            // 다리
            ctx.fillStyle = "#990000";
            ctx.fillRect(ex + 12, ey + eh - 30, 10, 15);
            ctx.fillRect(ex + ew - 22, ey + eh - 30, 10, 15);
            // 왼쪽 실드
            ctx.fillStyle = "#880000";
            ctx.fillRect(ex - 2, ey - 5, 10, 25);
        } else {
            // === 일반 자쿠 (초록색) ===
            // 몸체
            ctx.fillStyle = "#2E7D32";
            ctx.fillRect(ex + 8, ey - 13, ew - 16, eh - 12);
            // 머리
            ctx.fillStyle = "#1B5E20";
            ctx.beginPath();
            ctx.arc(ex + ew / 2, ey - 16, 12, 0, Math.PI * 2);
            ctx.fill();
            // 모노아이 (빨간색)
            ctx.fillStyle = "#FF0000";
            ctx.beginPath();
            ctx.arc(ex + ew / 2 + 2, ey - 16, 3, 0, Math.PI * 2);
            ctx.fill();
            // 모노아이 글로우
            ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
            ctx.beginPath();
            ctx.arc(ex + ew / 2 + 2, ey - 16, 7, 0, Math.PI * 2);
            ctx.fill();
            // 파이프
            ctx.fillStyle = "#388E3C";
            ctx.beginPath();
            ctx.arc(ex + ew / 2 - 10, ey - 12, 4, 0, Math.PI * 2);
            ctx.fill();
            // 다리
            ctx.fillStyle = "#1B5E20";
            ctx.fillRect(ex + 10, ey + eh - 28, 8, 14);
            ctx.fillRect(ex + ew - 18, ey + eh - 28, 8, 14);
            // 무기 (머신건)
            ctx.fillStyle = "#555";
            ctx.fillRect(ex - 8, ey, 15, 5);
        }
    }

    setScoreChangeCallback(callback) { this.onScoreChange = callback; }
    setGameEndCallback(callback) { this.onGameEnd = callback; }
}

window.GundamRunnerEngine = GundamRunnerEngine;
