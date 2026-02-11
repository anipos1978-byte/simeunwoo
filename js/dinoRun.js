class DinoRunEngine {
    constructor() {
        this.score = 0;
        this.isGameActive = false;
        this.gameLoopId = null;
        this.lastTime = 0;

        // Player (Mario)
        this.dino = {
            x: 50,
            y: 350,
            width: 40,
            height: 40,
            vy: 0,
            jumpForce: -12,
            gravity: 0.6,
            isJumping: false,
            isCrouching: false,
            groundY: 350,
            rotation: 0,
            scale: 1
        };

        // Entities
        this.obstacles = [];
        this.clouds = [];
        this.baseSpeed = 200; // Pixels per second
        this.spawnTimer = 0;
        this.minSpawnInterval = 1000;
        this.maxSpawnInterval = 3000;
        this.nextSpawnTime = 1500;

        // Assets
        this.dinoImage = new Image();
        this.dinoImage.src = "./assets/dino_player_mario.png";
        this.pipeImage = new Image();
        this.pipeImage.src = "./assets/obstacle_pipe.png";
        this.bulletImage = new Image();
        this.bulletImage.src = "./assets/obstacle_bullet_classic.png";

        // Game State
        this.gameState = "playing"; // "playing", "dying", "ended"
        this.deathTimer = 0;
        this.collidedObstacle = null;

        // Callbacks
        this.onScoreChange = null;
        this.onGameEnd = null;

        this.canvasWidth = 400;
        this.canvasHeight = 400;

        // High Score
        this.highScore = localStorage.getItem("dinoHighScore") || 0;
    }

    start() {
        this.isGameActive = true;
        this.gameState = "playing";
        this.deathTimer = 0;
        this.collidedObstacle = null;
        this.score = 0;
        this.obstacles = [];
        this.clouds = [];
        this.baseSpeed = 250;
        this.spawnTimer = 0;
        this.dino.y = this.dino.groundY;
        this.dino.vy = 0;
        this.dino.isJumping = false;
        this.dino.rotation = 0;
        this.dino.scale = 1;
        this.lastTime = Date.now();

        // Event Listeners
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);

        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
        const canvas = document.getElementById("canvas");
        if (canvas) canvas.addEventListener("mousedown", this.handleMouseDown);

        this.startGameLoop();
    }

    stop() {
        this.isGameActive = false;
        this.gameState = "ended";
        this.stopGameLoop();

        // Save High Score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem("dinoHighScore", this.highScore);
        }

        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
        const canvas = document.getElementById("canvas");
        if (canvas) canvas.removeEventListener("mousedown", this.handleMouseDown);

        if (this.onGameEnd) {
            this.onGameEnd(this.score);
        }
    }

    startGameLoop() {
        const loop = () => {
            if (this.gameState === "ended") return;
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

    handleKeyDown(e) {
        if (this.gameState !== "playing") return;
        if (e.code === "Space") {
            e.preventDefault();
            this.jump();
        }
        if (e.code === "ArrowDown") {
            e.preventDefault();
            this.dino.isCrouching = true;
        }
    }

    handleKeyUp(e) {
        if (e.code === "ArrowDown") {
            this.dino.isCrouching = false;
        }
    }

    handleMouseDown(e) {
        if (this.gameState !== "playing") return;
        this.jump();
    }

    jump() {
        if (!this.dino.isJumping) {
            this.dino.vy = this.dino.jumpForce;
            this.dino.isJumping = true;
            if (window.soundManager) window.soundManager.playUpgrade(); // Jump sound
        }
    }

    update(deltaTime) {
        if (this.gameState === "dying") {
            this.updateDeathAnimation(deltaTime);
            return;
        }

        // Difficulty scaling
        this.baseSpeed += 5 * deltaTime;

        // Update Dino
        this.dino.y += this.dino.vy;

        // Fast fall if crouching in air
        if (this.dino.isJumping && this.dino.isCrouching) {
            this.dino.vy += this.dino.gravity * 3;
        } else {
            this.dino.vy += this.dino.gravity;
        }

        if (this.dino.y >= this.dino.groundY) {
            this.dino.y = this.dino.groundY;
            this.dino.vy = 0;
            this.dino.isJumping = false;
        }

        // Update Score (Distance-based / Step-based)
        this.distCounter = (this.distCounter || 0) + this.baseSpeed * deltaTime;
        if (this.distCounter >= 40) { // Every 40 pixels is a 'step'
            this.score += 1;
            this.distCounter -= 40;
            if (this.onScoreChange) this.onScoreChange(this.score);
        }

        // Spawn Obstacles
        this.spawnTimer += deltaTime * 1000;
        if (this.spawnTimer > this.nextSpawnTime) {
            this.spawnObstacle();
            this.spawnTimer = 0;
            this.nextSpawnTime = Math.random() * (this.maxSpawnInterval - this.minSpawnInterval) + this.minSpawnInterval;
            this.nextSpawnTime /= (this.baseSpeed / 250);
        }

        // Update Obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.baseSpeed * deltaTime;

            // Collision Detection
            if (this.checkCollision(this.dino, obs)) {
                this.gameState = "dying";
                this.collidedObstacle = obs;
                if (window.soundManager) window.soundManager.playExplosion();
                return;
            }

            if (obs.x + obs.width < 0) {
                this.obstacles.splice(i, 1);
            }
        }

        // Spawn/Update Clouds
        if (Math.random() < 0.01) this.spawnCloud();
        for (let i = this.clouds.length - 1; i >= 0; i--) {
            const cloud = this.clouds[i];
            cloud.x -= (this.baseSpeed * 0.5) * deltaTime;
            if (cloud.x + 50 < 0) this.clouds.splice(i, 1);
        }
    }

    updateDeathAnimation(deltaTime) {
        this.deathTimer += deltaTime;

        if (this.collidedObstacle && this.collidedObstacle.type === "bullet") {
            // Fly away left effect for Bullet Bill
            this.dino.x -= 600 * deltaTime;
            this.dino.y -= 200 * deltaTime; // Arcing up and out
            this.dino.rotation -= 15 * deltaTime;
            this.dino.scale = Math.max(0, 1 - this.deathTimer * 0.5);
        } else {
            // Sucked into pipe effect
            this.dino.rotation += 10 * deltaTime;
            this.dino.scale = Math.max(0, 1 - this.deathTimer);

            if (this.collidedObstacle) {
                const targetX = this.collidedObstacle.x + this.collidedObstacle.width / 2;
                const targetY = this.collidedObstacle.y;

                this.dino.x += (targetX - (this.dino.x + this.dino.width / 2)) * 0.1;
                this.dino.y += (targetY - (this.dino.y + this.dino.height / 2)) * 0.1;
            }
        }

        if (this.deathTimer > 1.0) {
            this.stop();
        }
    }

    checkCollision(dino, obs) {
        const padding = 5;
        let dHeight = dino.height;
        let dY = dino.y;

        if (dino.isCrouching) {
            dHeight = dino.height / 2;
            dY = dino.y + dino.height / 2;
        }

        return (
            dino.x + padding < obs.x + obs.width - padding &&
            dino.x + dino.width - padding > obs.x + padding &&
            dY + padding < obs.y + obs.height - padding &&
            dY + dHeight - padding > obs.y + padding
        );
    }

    spawnObstacle() {
        const type = Math.random() < 0.2 ? "bullet" : "pipe";
        if (type === "pipe") {
            this.obstacles.push({
                x: this.canvasWidth,
                y: 340, // Height of ground - pipe height
                width: 40,
                height: 50,
                type: "pipe",
                color: "green"
            });
        } else {
            // Bullet height specifically for crouching (hits head while walking, clears while crouching)
            const bulletY = 315 + Math.random() * 10;
            this.obstacles.push({
                x: this.canvasWidth,
                y: bulletY,
                width: 65,
                height: 45,
                type: "bullet",
                color: "red"
            });
        }
    }

    spawnCloud() {
        this.clouds.push({
            x: this.canvasWidth,
            y: 50 + Math.random() * 150,
            width: 50,
            height: 20
        });
    }

    draw(ctx) {
        if (!this.isGameActive) return;

        // Sky and Desert Ground
        ctx.fillStyle = "#f7f7f7";
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Ground Line
        ctx.strokeStyle = "#535353";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 390);
        ctx.lineTo(this.canvasWidth, 390);
        ctx.stroke();

        // Draw Clouds
        ctx.fillStyle = "#d3d3d3";
        for (const cloud of this.clouds) {
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, 20, 0, Math.PI * 2);
            ctx.arc(cloud.x + 20, cloud.y, 20, 0, Math.PI * 2);
            ctx.arc(cloud.x + 10, cloud.y - 10, 20, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Dino (Mario)
        ctx.save();
        ctx.translate(this.dino.x + this.dino.width / 2, this.dino.y + this.dino.height / 2);
        ctx.rotate(this.dino.rotation);

        // Crouch visual squash
        let scaleX = this.dino.scale;
        let scaleY = this.dino.scale;
        if (this.dino.isCrouching && this.gameState === "playing") {
            scaleY *= 0.6;
            ctx.translate(0, this.dino.height * 0.2);
        }
        ctx.scale(scaleX, scaleY);

        if (this.dinoImage.complete) {
            ctx.drawImage(this.dinoImage, -this.dino.width / 2, -this.dino.height / 2, this.dino.width, this.dino.height);
        } else {
            ctx.fillStyle = "#535353";
            ctx.fillRect(-this.dino.width / 2, -this.dino.height / 2, this.dino.width, this.dino.height);
        }
        ctx.restore();

        // Draw Obstacles
        for (const obs of this.obstacles) {
            if (obs.type === "pipe" && this.pipeImage.complete) {
                ctx.drawImage(this.pipeImage, obs.x, obs.y, obs.width, obs.height);
            } else if (obs.type === "bullet" && this.bulletImage.complete) {
                ctx.drawImage(this.bulletImage, obs.x, obs.y, obs.width, obs.height);
            } else {
                ctx.fillStyle = obs.color;
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            }
        }

        // UI Overlay
        ctx.fillStyle = "#535353";
        ctx.font = "bold 18px Courier New";
        ctx.textAlign = "right";
        const scoreStr = this.score.toString().padStart(5, '0');
        const hiStr = Math.max(this.score, this.highScore).toString().padStart(5, '0');
        ctx.fillText(`HI ${hiStr} ${scoreStr}`, 390, 30);
    }

    setScoreChangeCallback(callback) { this.onScoreChange = callback; }
    setGameEndCallback(callback) { this.onGameEnd = callback; }
}

window.DinoRunEngine = DinoRunEngine;
