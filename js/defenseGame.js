class DefenseGameEngine {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.scoreForNextLevel = 150;
        this.isGameActive = false;
        this.gameLoopId = null;
        this.lastTime = 0;

        // Game Entities
        this.turret = { x: 50, y: 200, angle: 0, size: 40 };
        this.aiTurrets = []; // { x, y, angle, lastFireTime, fireInterval }
        this.projectiles = [];
        this.enemies = [];
        this.baseHP = 100;
        this.maxBaseHP = 100;

        // Missile System
        this.missileCount = 0;
        this.lastMissileAwardScore = 0;

        // Spawning
        this.spawnTimer = 0;
        this.spawnInterval = 2000; // 2 seconds

        // Assets
        this.bgImage = new Image();
        this.turretImage = new Image();
        this.turretImage.src = "./assets/bazooka_real.png";
        this.soldierImage = new Image();
        this.soldierImage.src = "./assets/enemy_soldier.png";
        this.tankImage = new Image();
        this.tankImage.src = "./assets/enemy_tank.png";

        // Mouse
        this.mouseX = 0;
        this.mouseY = 0;

        // Callbacks
        this.onScoreChange = null;
        this.onGameEnd = null;

        this.canvasWidth = 400;
        this.canvasHeight = 400;
    }

    start() {
        this.isGameActive = true;
        this.score = 0;
        this.level = 1;
        this.scoreForNextLevel = 150;
        this.baseHP = 100;
        this.projectiles = [];
        this.enemies = [];
        this.aiTurrets = [];
        this.missileCount = 0;
        this.lastMissileAwardScore = 0;
        this.spawnTimer = 0;
        this.lastTime = Date.now();

        // Event Listeners
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);

        // Canvas element lookup (need to attach to canvas)
        const canvas = document.getElementById("canvas");
        if (canvas) {
            canvas.addEventListener("mousemove", this.handleMouseMove);
            canvas.addEventListener("mousedown", this.handleMouseDown);
            window.addEventListener("keydown", this.handleKeyDown);
        }

        this.startGameLoop();
    }

    stop() {
        this.isGameActive = false;
        this.stopGameLoop();

        const canvas = document.getElementById("canvas");
        if (canvas) {
            canvas.removeEventListener("mousemove", this.handleMouseMove);
            canvas.removeEventListener("mousedown", this.handleMouseDown);
            window.removeEventListener("keydown", this.handleKeyDown);
        }

        if (this.onGameEnd) {
            this.onGameEnd(this.score, this.level);
        }
    }

    startGameLoop() {
        const loop = () => {
            if (!this.isGameActive) return;
            const now = Date.now();
            const deltaTime = (now - this.lastTime) / 1000;
            this.lastTime = now;

            this.update(deltaTime);
            this.draw(ctx);
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

    handleMouseMove(e) {
        const rect = e.target.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;

        // Calculate angle towards mouse
        const dx = this.mouseX - this.turret.x;
        const dy = this.mouseY - this.turret.y;
        this.turret.angle = Math.atan2(dy, dx);
    }

    handleKeyDown(e) {
        if (!this.isGameActive) return;
        if (e.code === "Space") {
            e.preventDefault();
            this.fireMissile();
        }
    }

    handleMouseDown(e) {
        if (!this.isGameActive) return;
        this.shoot(this.turret);
    }

    shoot(shooter) {
        const speed = 400;
        const vx = Math.cos(shooter.angle) * speed;
        const vy = Math.sin(shooter.angle) * speed;

        this.projectiles.push({
            x: shooter.x + Math.cos(shooter.angle) * 20,
            y: shooter.y + Math.sin(shooter.angle) * 20,
            vx: vx,
            vy: vy,
            size: 5,
            color: shooter === this.turret ? "yellow" : "cyan" // AI bullets look different
        });

        if (window.soundManager) window.soundManager.playShoot();
    }

    fireMissile() {
        if (this.missileCount <= 0) return;

        this.missileCount--;
        const speed = 600;
        const vx = Math.cos(this.turret.angle) * speed;
        const vy = Math.sin(this.turret.angle) * speed;

        this.projectiles.push({
            x: this.turret.x + Math.cos(this.turret.angle) * 30,
            y: this.turret.y + Math.sin(this.turret.angle) * 30,
            vx: vx,
            vy: vy,
            size: 10,
            color: "orange",
            isMissile: true
        });

        if (window.soundManager) window.soundManager.playShoot(); // Maybe a different sound later
    }

    update(deltaTime) {
        // Level Up Check
        if (this.score >= this.scoreForNextLevel) {
            this.levelUp();
        }

        // Missile Reward Check
        if (this.score >= this.lastMissileAwardScore + 400) {
            this.missileCount++;
            this.lastMissileAwardScore += 400;
            if (window.soundManager) window.soundManager.playUpgrade();
        }

        // Spawn Enemies
        this.spawnTimer += deltaTime * 1000;
        if (this.spawnTimer > this.spawnInterval) {
            this.spawnEnemy();
            this.spawnTimer = 0;
            this.spawnInterval = Math.max(500, 2000 - (this.level * 150)); // Faster spawn
        }

        // AI Turrets Logic
        this.updateAITurrets(deltaTime);

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;

            if (p.x > this.canvasWidth || p.x < 0 || p.y > this.canvasHeight || p.y < 0) {
                this.projectiles.splice(i, 1);
                continue;
            }
        }

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.x -= e.speed * deltaTime;

            if (e.x < 50) {
                this.baseHP -= e.damage;
                this.enemies.splice(i, 1);
                if (window.soundManager) window.soundManager.playExplosion();
                if (this.baseHP <= 0) {
                    this.baseHP = 0;
                    this.stop();
                }
                if (this.onScoreChange) this.onScoreChange(this.score, this.level);
                continue;
            }

            for (let j = this.projectiles.length - 1; j >= 0; j--) {
                const p = this.projectiles[j];
                const dist = Math.hypot(p.x - e.x, p.y - e.y);
                if (dist < e.size + p.size) {
                    if (p.isMissile) {
                        this.explodeMissile(p.x, p.y);
                    } else {
                        e.hp--;
                    }
                    this.projectiles.splice(j, 1);

                    if (e.hp <= 0) {
                        this.score += e.scoreValue;
                        this.enemies.splice(i, 1);
                        if (window.soundManager) window.soundManager.playExplosion();
                        if (this.onScoreChange) this.onScoreChange(this.score, this.level);
                    }
                    break;
                }
            }
        }
    }

    explodeMissile(x, y) {
        const explosionRadius = 80;
        if (window.soundManager) window.soundManager.playExplosion();

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const dist = Math.hypot(e.x - x, e.y - y);
            if (dist < explosionRadius) {
                // Massive damage to enemies within radius
                e.hp -= 10;
                if (e.hp <= 0) {
                    this.score += e.scoreValue;
                    this.enemies.splice(i, 1);
                    if (this.onScoreChange) this.onScoreChange(this.score, this.level);
                }
            }
        }
    }

    levelUp() {
        this.level++;
        this.scoreForNextLevel += 150;

        // Add a new AI turret
        const spacing = 320 / Math.max(1, this.level - 1);
        const y = 40 + (this.aiTurrets.length * spacing) % 320;

        this.aiTurrets.push({
            x: 50,
            y: y,
            angle: 0,
            lastFireTime: Date.now(),
            fireInterval: 1500 - (this.level * 50) // Faster fire rate for AI
        });

        if (window.soundManager) window.soundManager.playInvincible(); // Level up sound
    }

    updateAITurrets(deltaTime) {
        const now = Date.now();
        for (const ai of this.aiTurrets) {
            // Find nearest enemy
            let nearestEnemy = null;
            let minDist = Infinity;

            for (const e of this.enemies) {
                const d = Math.hypot(e.x - ai.x, e.y - ai.y);
                if (d < minDist) {
                    minDist = d;
                    nearestEnemy = e;
                }
            }

            if (nearestEnemy) {
                const dx = nearestEnemy.x - ai.x;
                const dy = nearestEnemy.y - ai.y;
                ai.angle = Math.atan2(dy, dx);

                if (now - ai.lastFireTime > ai.fireInterval) {
                    this.shoot(ai);
                    ai.lastFireTime = now;
                }
            }
        }
    }

    spawnEnemy() {
        const isTank = Math.random() < 0.2;
        const y = Math.random() * (this.canvasHeight - 60) + 30;
        const speedBoost = 1 + (this.level - 1) * 0.15; // 15% faster per level

        if (isTank) {
            this.enemies.push({
                type: "tank",
                x: this.canvasWidth + 50,
                y: y,
                speed: 30 * speedBoost,
                hp: 3,
                size: 20,
                damage: 20,
                scoreValue: 50,
                color: "darkgreen"
            });
        } else {
            this.enemies.push({
                type: "soldier",
                x: this.canvasWidth + 20,
                y: y,
                speed: 80 * speedBoost,
                hp: 1,
                size: 10,
                damage: 10,
                scoreValue: 10,
                color: "red"
            });
        }
    }

    draw(ctx) {
        if (!this.isGameActive) return;

        // Background
        ctx.fillStyle = "#e0c09e";
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw Base Line
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(50, 0);
        ctx.lineTo(50, this.canvasHeight);
        ctx.stroke();

        // Draw Player Turret
        this.drawTurret(ctx, this.turret, "gray", "darkgray");

        // Draw AI Turrets
        for (const ai of this.aiTurrets) {
            this.drawTurret(ctx, ai, "blue", "darkblue");
        }

        // Draw Enemies
        for (const e of this.enemies) {
            if (e.type === "tank" && this.tankImage.complete) {
                ctx.save();
                ctx.translate(e.x, e.y);
                ctx.rotate(Math.PI / 2);
                const drawSize = e.size * 2.5;
                ctx.drawImage(this.tankImage, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
                ctx.restore();
            } else if (e.type === "soldier" && this.soldierImage.complete) {
                const drawSize = e.size * 3;
                ctx.drawImage(this.soldierImage, e.x - drawSize / 2, e.y - drawSize / 2, drawSize, drawSize);
            } else {
                ctx.fillStyle = e.color;
                if (e.type === "tank") {
                    ctx.fillRect(e.x - e.size, e.y - e.size / 2, e.size * 2, e.size);
                } else {
                    ctx.beginPath();
                    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            if (e.type === "tank" && e.hp < 3) {
                ctx.fillStyle = "red";
                ctx.fillRect(e.x - 10, e.y - 30, 20, 3);
                ctx.fillStyle = "green";
                ctx.fillRect(e.x - 10, e.y - 30, 20 * (e.hp / 3), 3);
            }
        }

        // Draw Projectiles
        for (const p of this.projectiles) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // UI Overlay
        ctx.save();
        ctx.shadowBlur = 4;
        ctx.shadowColor = "rgba(0,0,0,0.5)";

        ctx.textAlign = "left";
        ctx.fillStyle = "black";
        ctx.font = "bold 18px Arial";
        ctx.fillText(`SCORE: ${this.score}`, 10, 30);
        ctx.fillText(`LVL: ${this.level}`, 10, 55);

        ctx.textAlign = "right";
        ctx.fillStyle = this.baseHP > 30 ? "green" : "red";
        ctx.fillText(`HP: ${this.baseHP}`, 390, 30);

        ctx.fillStyle = "orange";
        ctx.fillText(`🚀: ${this.missileCount}`, 390, 55);
        ctx.restore();
    }

    drawTurret(ctx, turret, color1, color2) {
        if (this.turretImage.complete) {
            ctx.save();
            ctx.translate(turret.x, turret.y);
            // The turret image points roughly right-up. 
            // We need to rotate it so the barrel points at the target.
            // If we assume the barrel is at -30 degrees in the image, offset by +30 deg.
            ctx.rotate(turret.angle + Math.PI / 6);

            const drawSize = 60;
            ctx.drawImage(this.turretImage, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            ctx.restore();
        } else {
            ctx.save();
            ctx.translate(turret.x, turret.y);
            ctx.rotate(turret.angle);
            ctx.fillStyle = color1;
            ctx.fillRect(0, -5, 30, 10); // Barrel
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2); // Body
            ctx.fillStyle = color2;
            ctx.fill();
            ctx.restore();
        }
    }

    setScoreChangeCallback(callback) { this.onScoreChange = callback; }
    setGameEndCallback(callback) { this.onGameEnd = callback; }
}

window.DefenseGameEngine = DefenseGameEngine;
