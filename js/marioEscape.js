/**
 * marioEscape.js
 * 마리오 탈출 게임 엔진
 * 마리오가 정사각형 공터에서 무작위로 움직이는 버섯(Goomba)들을 피하는 서바이벌 게임
 * 방향키: 상하좌우 이동
 */

class MarioEscapeEngine {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.isGameActive = false;
        this.gameLoopId = null;

        this.onScoreChange = null;
        this.onGameEnd = null;

        this.canvasWidth = 400;
        this.canvasHeight = 400;

        // 마리오 상태
        this.mario = {
            x: 200,
            y: 200,
            width: 30,
            height: 30,
            speed: 4,
            facing: 'right',
            hasGun: false,
            ammo: 0
        };

        // 적 (버섯/굼바)
        this.enemies = [];
        this.lastEnemySpawn = 0;
        this.enemySpawnInterval = 4000;

        // 투사체 (총알)
        this.bullets = [];

        // 아이템
        this.items = [];
        this.lastItemSpawn = 0;
        this.itemSpawnInterval = 5000;

        // 파티클
        this.particles = [];

        // 입력 상태
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            " ": false
        };

        // 키보드 바인딩
        this._onKeyDown = (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                e.preventDefault();
                // 스페이스바는 처음 눌렀을 때만 발사
                if (e.key === " " && !this.keys[" "]) {
                    this.fireBullet();
                }
                this.keys[e.key] = true;
            }
        };
        this._onKeyUp = (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = false;
            }
        };
    }

    start() {
        this.isGameActive = true;
        this.score = 0;
        this.level = 1;
        this.mario.facing = 'right';
        this.mario.hasGun = false;
        this.mario.ammo = 0;
        this.enemies = [];
        this.items = [];
        this.bullets = [];
        this.particles = [];
        this.enemySpawnInterval = 4000;
        this.lastEnemySpawn = performance.now();
        this.lastItemSpawn = performance.now();

        // 초기 적 1마리
        this.spawnEnemy();

        document.addEventListener("keydown", this._onKeyDown);
        document.addEventListener("keyup", this._onKeyUp);
    }

    stop() {
        this.isGameActive = false;
        document.removeEventListener("keydown", this._onKeyDown);
        document.removeEventListener("keyup", this._onKeyUp);

        if (window.soundManager) window.soundManager.playGameOver();
        if (this.onGameEnd) {
            this.onGameEnd(Math.floor(this.score), this.level);
        }
    }

    spawnEnemy() {
        // 벽 가장자리에서 생성
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = Math.random() * this.canvasWidth; y = -20; } // 위
        else if (side === 1) { x = this.canvasWidth + 20; y = Math.random() * this.canvasHeight; } // 오른쪽
        else if (side === 2) { x = Math.random() * this.canvasWidth; y = this.canvasHeight + 20; } // 아래
        else { x = -20; y = Math.random() * this.canvasHeight; } // 왼쪽

        // 마리오를 향한 벡터에 랜덤성 추가
        const angle = Math.atan2(this.mario.y - y, this.mario.x - x) + (Math.random() - 0.5) * 0.5;
        const speed = 0.8 + Math.random() * 1.0 + (this.level * 0.15); // 더 느리게 시작 (기존 1.5 + 1.5 + 0.2)

        this.enemies.push({
            x, y,
            width: 25, height: 25,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: '#8B4513' // 굼바 갈색
        });
    }

    spawnItem() {
        const rand = Math.random();
        let type;
        if (rand < 0.15) type = 'gun';
        else if (rand < 0.35) type = 'star';
        else type = 'coin';

        this.items.push({
            x: 30 + Math.random() * (this.canvasWidth - 60),
            y: 30 + Math.random() * (this.canvasHeight - 60),
            width: 20, height: 20,
            type: type
        });
    }

    update(timestamp) {
        if (!this.isGameActive) return;

        // === 마리오 이동 ===
        if (this.keys.ArrowUp) this.mario.y -= this.mario.speed;
        if (this.keys.ArrowDown) this.mario.y += this.mario.speed;
        if (this.keys.ArrowLeft) { this.mario.x -= this.mario.speed; this.mario.facing = 'left'; }
        if (this.keys.ArrowRight) { this.mario.x += this.mario.speed; this.mario.facing = 'right'; }

        // 경계 제한
        this.mario.x = Math.max(0, Math.min(this.canvasWidth - this.mario.width, this.mario.x));
        this.mario.y = Math.max(0, Math.min(this.canvasHeight - this.mario.height, this.mario.y));

        // === 적 업데이트 ===
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;

            // 벽 반사
            if (enemy.x < 0 || enemy.x + enemy.width > this.canvasWidth) {
                enemy.vx *= -1;
                enemy.x = enemy.x < 0 ? 0 : this.canvasWidth - enemy.width;
            }
            if (enemy.y < 0 || enemy.y + enemy.height > this.canvasHeight) {
                enemy.vy *= -1;
                enemy.y = enemy.y < 0 ? 0 : this.canvasHeight - enemy.height;
            }

            // 충돌 검사
            if (this.checkCollision(this.mario, enemy)) {
                this.stop();
                return;
            }
        }

        // === 총알 업데이트 ===
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx;

            // 화면 밖으로 나가면 제거
            if (b.x < -10 || b.x > this.canvasWidth + 10) {
                this.bullets.splice(i, 1);
                continue;
            }

            // 적과 충돌 검사
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (this.checkCollision(b, enemy)) {
                    this.enemies.splice(j, 1);
                    this.bullets.splice(i, 1);
                    this.spawnParticles(enemy.x, enemy.y, '#8B4513');
                    this.score += 50;
                    if (window.soundManager) window.soundManager.playExplosion();
                    if (this.onScoreChange) this.onScoreChange(Math.floor(this.score), this.level);
                    break;
                }
            }
        }

        // === 아이템 업데이트 ===
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (this.checkCollision(this.mario, item)) {
                if (item.type === 'star') {
                    this.score += 500;
                    if (window.soundManager) window.soundManager.playBonus();
                    // 주변 적 제거
                    this.enemies = this.enemies.filter(e => {
                        const dx = e.x - item.x;
                        const dy = e.y - item.y;
                        if (Math.sqrt(dx * dx + dy * dy) < 150) {
                            this.spawnParticles(e.x, e.y, '#FFD700');
                            return false;
                        }
                        return true;
                    });
                } else if (item.type === 'gun') {
                    this.mario.hasGun = true;
                    this.mario.ammo = Math.min(30, this.mario.ammo + 10);
                    if (window.soundManager) window.soundManager.playUpgrade();
                } else {
                    this.score += 100;
                    if (window.soundManager) window.soundManager.playCatch();
                }
                this.items.splice(i, 1);
                if (this.onScoreChange) this.onScoreChange(this.score, this.level);
            }
        }

        // === 파티클 업데이트 ===
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // === 스폰 로직 ===
        if (timestamp - this.lastEnemySpawn > this.enemySpawnInterval) {
            this.spawnEnemy();
            this.lastEnemySpawn = timestamp;
            // 서서히 스폰 빨라짐
            this.enemySpawnInterval = Math.max(800, 4000 - this.level * 300);
        }

        if (timestamp - this.lastItemSpawn > this.itemSpawnInterval) {
            this.spawnItem();
            this.lastItemSpawn = timestamp;
        }

        // 레벨업 (1000점마다)
        const newLevel = Math.floor(this.score / 1000) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            if (window.soundManager) window.soundManager.playLevelUp();
        }

        this.score += 0.1; // 생존 점수
    }

    fireBullet() {
        if (!this.mario.hasGun || this.mario.ammo <= 0) return;

        const bx = this.mario.x + (this.mario.facing === 'right' ? this.mario.width : 0);
        const by = this.mario.y + this.mario.height / 2;
        const speed = 7;
        const vx = this.mario.facing === 'right' ? speed : -speed;

        this.bullets.push({
            x: bx,
            y: by,
            width: 8,
            height: 4,
            vx: vx
        });

        this.mario.ammo--;
        if (this.mario.ammo <= 0) {
            this.mario.hasGun = false;
        }

        if (window.soundManager) window.soundManager.playLaser();
    }

    checkCollision(a, b) {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    spawnParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 20,
                color
            });
        }
    }

    draw(ctx) {
        if (!this.isGameActive) return;

        // === 배경 (녹색 광장) ===
        ctx.fillStyle = '#5CB85C';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // 격자 무늬 배경
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.canvasWidth; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvasHeight); ctx.stroke();
        }
        for (let y = 0; y < this.canvasHeight; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvasWidth, y); ctx.stroke();
        }

        // === 아이템 그리기 ===
        for (const item of this.items) {
            ctx.save();
            const bounce = Math.sin(Date.now() * 0.01) * 3;
            if (item.type === 'star') {
                this.drawStar(ctx, item.x + 10, item.y + 10 + bounce, 12, 5, 5);
            } else if (item.type === 'gun') {
                ctx.fillStyle = '#555';
                ctx.fillRect(item.x, item.y + 10 + bounce, 15, 6);
                ctx.fillRect(item.x + 10, item.y + 14 + bounce, 4, 8);
                ctx.fillStyle = '#FFD700'; // 장식 포인트
                ctx.fillRect(item.x + 12, item.y + 11 + bounce, 2, 2);
            } else {
                ctx.fillStyle = '#FFD700'; // 코인 금색
                ctx.beginPath();
                ctx.ellipse(item.x + 10, item.y + 10 + bounce, 8, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#B8860B';
                ctx.stroke();
            }
            ctx.restore();
        }

        // === 적(굼바) 그리기 ===
        for (const enemy of this.enemies) {
            this.drawGoomba(ctx, enemy);
        }

        // === 마리오 그리기 ===
        this.drawMario(ctx, this.mario);

        // === 총알 그리기 ===
        for (const b of this.bullets) {
            ctx.fillStyle = '#FFEE00';
            ctx.fillRect(b.x, b.y - 2, b.width, b.height);
        }

        // === 파티클 ---
        for (const p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / 20;
            ctx.fillRect(p.x, p.y, 4, 4);
            ctx.globalAlpha = 1;
        }

        // === UI ===
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Lv. ${this.level}`, 15, 30);
        ctx.textAlign = 'right';
        ctx.fillText(`Score: ${Math.floor(this.score)}`, 385, 30);

        if (this.mario.hasGun) {
            ctx.fillStyle = '#FFD700';
            ctx.font = '16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`Ammo: ${this.mario.ammo}`, 15, 55);
        }
        ctx.restore();
    }

    drawMario(ctx, m) {
        ctx.save();
        ctx.translate(m.x + m.width / 2, m.y + m.height / 2);
        if (m.facing === 'left') ctx.scale(-1, 1);

        // 모자
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(-10, -15, 20, 8);
        ctx.fillRect(-15, -10, 25, 3); // 챙

        // 얼굴
        ctx.fillStyle = '#FFCC99';
        ctx.fillRect(-10, -7, 18, 12);

        // 눈
        ctx.fillStyle = 'black';
        ctx.fillRect(2, -4, 3, 4);

        // 수염
        ctx.fillStyle = '#663300';
        ctx.fillRect(1, 2, 8, 3);

        // 옷/몸체
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(-10, 5, 20, 10);
        // 멜빵바지
        ctx.fillStyle = '#0000FF';
        ctx.fillRect(-10, 8, 20, 12);
        ctx.fillRect(-10, 5, 4, 10);
        ctx.fillRect(6, 5, 4, 10);

        // 총 (가지고 있을 때)
        if (m.hasGun) {
            ctx.fillStyle = '#333';
            ctx.fillRect(8, 4, 12, 5); // 총구
            ctx.fillRect(8, 7, 3, 6);  // 손잡이
        }


        // 신발
        ctx.fillStyle = '#663300';
        ctx.fillRect(-12, 16, 10, 5);
        ctx.fillRect(2, 16, 10, 5);

        ctx.restore();
    }

    drawGoomba(ctx, e) {
        ctx.save();
        const float = Math.sin(Date.now() * 0.015 + e.x) * 2;

        // 머리
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.moveTo(e.x, e.y + 15);
        ctx.quadraticCurveTo(e.x + 12, e.y - 5, e.x + 25, e.y + 15);
        ctx.lineTo(e.x + 25, e.y + e.height - 5);
        ctx.lineTo(e.x, e.y + e.height - 5);
        ctx.fill();

        // 눈
        ctx.fillStyle = 'white';
        ctx.fillRect(e.x + 5, e.y + 5, 6, 8);
        ctx.fillRect(e.x + 14, e.y + 5, 6, 8);
        ctx.fillStyle = 'black';
        ctx.fillRect(e.x + 7, e.y + 7, 2, 4);
        ctx.fillRect(e.x + 16, e.y + 7, 2, 4);

        // 발
        ctx.fillStyle = 'black';
        ctx.fillRect(e.x + 2, e.y + e.height - 5, 8, 6);
        ctx.fillRect(e.x + 15, e.y + e.height - 5, 8, 6);

        ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.strokeStyle = '#DAA520';
        ctx.stroke();
    }

    setScoreChangeCallback(callback) { this.onScoreChange = callback; }
    setGameEndCallback(callback) { this.onGameEnd = callback; }
}

window.MarioEscapeEngine = MarioEscapeEngine;
