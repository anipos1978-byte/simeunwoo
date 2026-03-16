/**
 * parrotSteal.js
 * 앵무새 주인 몰래 사료 먹기 게임 엔진
 * "무궁화 꽃이 피었습니다" 방식의 메커니즘
 */

class ParrotStealEngine {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.isGameActive = false;
        this.gameLoopId = null;

        // 콜백
        this.onScoreChange = null;
        this.onGameEnd = null;

        // 캔버스 크기
        this.canvasWidth = 800;
        this.canvasHeight = 600;

        // 게임 상태: 'LOOKING_AWAY', 'TURNING', 'WATCHING'
        this.states = {
            LOOKING_AWAY: 'LOOKING_AWAY',
            TURNING: 'TURNING',
            WATCHING: 'WATCHING'
        };
        this.currentState = this.states.LOOKING_AWAY;
        this.stateTimer = 0;

        // 캐릭터 상태
        this.parrot = {
            x: 400,
            y: 520,
            width: 50,
            height: 50,
            speed: 4,
            isMoving: false
        };

        this.bowl = {
            x: 400,
            y: 80,
            width: 60,
            height: 40
        };

        this.owner = {
            x: 400,
            y: 50,
            emoji: "👤",
            rotation: 0
        };

        // 입력 상태
        this.keys = { space: false };
        this.isMouseDown = false;

        // 이펙트
        this.particles = [];
        this.explosions = [];

        // 이벤트 바인딩
        this._onKeyDown = this._handleKeyDown.bind(this);
        this._onKeyUp = this._handleKeyUp.bind(this);
        this._onMouseDown = this._handleMouseDown.bind(this);
        this._onMouseUp = this._handleMouseUp.bind(this);
    }

    start() {
        this.isGameActive = true;
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.resetRound();

        document.addEventListener("keydown", this._onKeyDown);
        document.addEventListener("keyup", this._onKeyUp);
        document.addEventListener("mousedown", this._onMouseDown);
        document.addEventListener("mouseup", this._onMouseUp);

        this.startGameLoop();
    }

    stop() {
        this.isGameActive = false;
        this.stopGameLoop();

        document.removeEventListener("keydown", this._onKeyDown);
        document.removeEventListener("keyup", this._onKeyUp);
        document.removeEventListener("mousedown", this._onMouseDown);
        document.removeEventListener("mouseup", this._onMouseUp);

        if (window.soundManager) window.soundManager.playGameOver();

        if (this.onGameEnd) {
            this.onGameEnd(this.score, this.level);
        }
    }

    resetRound() {
        this.parrot.x = this.canvasWidth / 2;
        this.parrot.y = 520;
        this.parrot.isMoving = false;
        this.currentState = this.states.LOOKING_AWAY;
        this.setNextStateTimer();
        this.owner.emoji = "👤";
    }

    setNextStateTimer() {
        if (this.currentState === this.states.LOOKING_AWAY) {
            // 주인이 뒤돌아 있는 시간: 레벨이 높을수록 짧아짐
            this.stateTimer = Math.max(1000, 3000 - (this.level * 200)) + Math.random() * 2000;
        } else if (this.currentState === this.states.TURNING) {
            // 주의를 주는 시간 (경고)
            this.stateTimer = 500 + Math.random() * 500;
        } else if (this.currentState === this.states.WATCHING) {
            // 주인이 감시하는 시간
            this.stateTimer = 1500 + Math.random() * 1500;
        }
    }

    _handleKeyDown(e) {
        if (e.code === "Space") {
            e.preventDefault();
            this.keys.space = true;
        }
    }

    _handleKeyUp(e) {
        if (e.code === "Space") {
            this.keys.space = false;
        }
    }

    _handleMouseDown(e) {
        this.isMouseDown = true;
    }

    _handleMouseUp(e) {
        this.isMouseDown = false;
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
        const deltaTime = 16.67; // Approx 60fps

        // 상태 타이머 관리
        this.stateTimer -= deltaTime;
        if (this.stateTimer <= 0) {
            this.switchState();
        }

        // 앵무새 이동 로직
        const wantToMove = this.keys.space || this.isMouseDown;
        if (wantToMove) {
            this.parrot.y -= this.parrot.speed;
            this.parrot.isMoving = true;

            // 걸릴 확률 체크 (WATCHING 상태에서 이동 시)
            if (this.currentState === this.states.WATCHING) {
                this.handleCaught();
            }
        } else {
            this.parrot.isMoving = false;
        }

        // 경계 제한
        this.parrot.y = Math.max(this.bowl.y, Math.min(520, this.parrot.y));

        // 목표 지점 도달 체크
        if (this.parrot.y <= this.bowl.y + 20) {
            this.handleReachFood();
        }

        // 파티클 업데이트
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    switchState() {
        if (this.currentState === this.states.LOOKING_AWAY) {
            this.currentState = this.states.TURNING;
            this.owner.emoji = "❓";
        } else if (this.currentState === this.states.TURNING) {
            this.currentState = this.states.WATCHING;
            this.owner.emoji = "👀";
            if (window.soundManager) window.soundManager.playShoot(); // 주의 환기용 짧은 소리
        } else {
            this.currentState = this.states.LOOKING_AWAY;
            this.owner.emoji = "👤";
        }
        this.setNextStateTimer();
    }

    handleCaught() {
        this.lives--;
        if (window.soundManager) window.soundManager.playExplosion();

        // 폭발 이펙트 추가
        this.explosions.push({
            x: this.parrot.x,
            y: this.parrot.y,
            duration: 30
        });

        if (this.lives <= 0) {
            this.stop();
        } else {
            this.resetRound();
        }
    }

    handleReachFood() {
        this.score += 100 * this.level;
        this.level++;
        if (window.soundManager) window.soundManager.playCatch();

        // 축하 파티클
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.bowl.x,
                y: this.bowl.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 40,
                color: `hsl(${Math.random() * 360}, 70%, 60%)`
            });
        }

        this.resetRound();
        if (this.onScoreChange) this.onScoreChange(this.score, this.level);
    }

    draw(ctx) {
        if (!this.isGameActive) return;

        // 배경
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // 방 바닥 (카펫 느낌)
        ctx.fillStyle = "#e0c0a0";
        ctx.fillRect(0, 100, this.canvasWidth, 500);

        // 주인 및 사료 통 위치 선
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, 120);
        ctx.lineTo(800, 120);
        ctx.stroke();
        ctx.setLineDash([]);

        // 주인 (Owner)
        ctx.font = "60px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.owner.emoji, this.owner.x, this.owner.y);

        // 사료 통 (Food Bowl)
        ctx.font = "50px Arial";
        ctx.fillText("🥣", this.bowl.x, this.bowl.y + 10);

        // 앵무새 (Parrot)
        ctx.font = "50px Arial";
        const parrotEmoji = this.parrot.isMoving ? "🕊️" : "🦜";
        ctx.fillText(parrotEmoji, this.parrot.x, this.parrot.y);

        // 상태 표시 (개발용 혹은 유저 안내)
        if (this.currentState === this.states.TURNING) {
            ctx.fillStyle = "orange";
            ctx.font = "bold 24px Arial";
            ctx.fillText("주인이 돌아봅니다!", 400, 200);
        } else if (this.currentState === this.states.WATCHING) {
            ctx.fillStyle = "red";
            ctx.font = "bold 24px Arial";
            ctx.fillText("멈추세요!!!", 400, 200);

            // 시각적 감시 효과 (붉은 필터 느낌)
            ctx.fillStyle = "rgba(255, 0, 0, 0.05)";
            ctx.fillRect(0, 0, 800, 600);
        }

        // 파티클
        for (const p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / 40;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // 폭발
        for (const exp of this.explosions) {
            ctx.font = "80px Arial";
            ctx.fillText("💥", exp.x, exp.y);
            exp.duration--;
        }
        this.explosions = this.explosions.filter(e => e.duration > 0);

        // UI
        ctx.save();
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;

        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "right";
        ctx.fillText(`SCORE: ${this.score}`, 780, 40);

        ctx.fillStyle = "cyan";
        ctx.textAlign = "left";
        ctx.fillText(`LEVEL: ${this.level}`, 20, 40);

        // 하트 (❤️)
        for (let i = 0; i < 3; i++) {
            ctx.fillText(i < this.lives ? "❤️" : "🖤", 20 + i * 35, 80);
        }
        ctx.restore();

        // 게임 시작 시 안내
        if (this.score === 0 && this.parrot.y > 450) {
            ctx.fillStyle = "#333";
            ctx.font = "18px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Space 키나 마우스를 눌러 앵무새를 이동시키세요!", 400, 450);
            ctx.fillText("주인이 👀하고 있을 때 움직이면 안 됩니다!", 400, 480);
        }
    }

    setScoreChangeCallback(callback) { this.onScoreChange = callback; }
    setGameEndCallback(callback) { this.onGameEnd = callback; }
}

window.ParrotStealEngine = ParrotStealEngine;
