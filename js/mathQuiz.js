class MathQuizEngine {
    constructor() {
        this.score = 0;
        this.isGameActive = false;
        this.timeLeft = 60;
        this.gameLoopId = null;
        this.currentProblem = null;
        this.level = 1;
        this.explanationCallback = null;
        this.waitingForNext = false;

        // 콜백
        this.onScoreChange = null;
        this.onGameEnd = null;

        this.canvasWidth = 400;
        this.canvasHeight = 400;
    }

    start(level = 1) {
        this.score = 0;
        this.timeLeft = 60;
        this.isGameActive = true;
        this.level = level;
        this.waitingForNext = false;
        this.generateProblem();

        // UI 초기화
        const explanationDiv = document.getElementById("math-explanation");
        if (explanationDiv) explanationDiv.style.display = "none";

        this.startGameLoop();

        // 키보드 이벤트 리스너 등록
        this.handleKeyDown = this.handleKeyDown.bind(this);
        window.addEventListener("keydown", this.handleKeyDown);
    }

    stop() {
        this.isGameActive = false;
        this.stopGameLoop();
        window.removeEventListener("keydown", this.handleKeyDown);

        const explanationDiv = document.getElementById("math-explanation");
        if (explanationDiv) explanationDiv.style.display = "none";

        if (this.onGameEnd) {
            this.onGameEnd(this.score, this.level);
        }
    }

    startGameLoop() {
        let lastTime = Date.now();
        const loop = () => {
            if (!this.isGameActive) return;

            const now = Date.now();
            const deltaTime = (now - lastTime) / 1000;
            lastTime = now;

            this.update(deltaTime);
            this.draw(ctx); // main.js의 전역 ctx 사용

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

    update(deltaTime) {
        if (this.timeLeft > 0) {
            this.timeLeft -= deltaTime;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.stop();
            }
        }
    }

    generateProblem() {
        let a, b, op, answer, explanation, display;

        // 레벨별 로직
        if (this.level === 1) {
            // 1단계: 초등 (사칙연산)
            const ops = ["+", "-", "*", "/"];
            op = ops[Math.floor(Math.random() * ops.length)];

            if (op === "+") {
                a = Math.floor(Math.random() * 50) + 1;
                b = Math.floor(Math.random() * 50) + 1;
                answer = a + b;
                explanation = `${a} + ${b} = ${answer}`;
            } else if (op === "-") {
                a = Math.floor(Math.random() * 50) + 10;
                b = Math.floor(Math.random() * a) + 1; // 음수 방지
                answer = a - b;
                explanation = `${a} - ${b} = ${answer}`;
            } else if (op === "*") {
                a = Math.floor(Math.random() * 19) + 2; // 2~20단
                b = Math.floor(Math.random() * 9) + 1;
                answer = a * b;
                explanation = `${a} × ${b} = ${answer}`;
            } else { // "/"
                b = Math.floor(Math.random() * 9) + 2;
                answer = Math.floor(Math.random() * 10) + 1;
                a = b * answer; // 나누어 떨어지게
                explanation = `${a} ÷ ${b} = ${answer}`;
            }
            display = `${a} ${op === '*' ? '×' : op === '/' ? '÷' : op} ${b} = ?`;

        } else if (this.level === 2) {
            // 2단계: 중등 (방정식, 거듭제곱)
            const types = ["eqn", "pow", "neg"];
            const type = types[Math.floor(Math.random() * types.length)];

            if (type === "eqn") {
                // ax + b = c
                const x = Math.floor(Math.random() * 10) + 1;
                a = Math.floor(Math.random() * 5) + 2; // 2~6
                b = Math.floor(Math.random() * 10) + 1;
                const c = a * x + b;
                answer = x;
                display = `${a}x + ${b} = ${c}, x = ?`;
                explanation = `${a}x = ${c - b}, 따라서 x = ${x}`;
            } else if (type === "pow") {
                // a^b
                const bases = [2, 3, 4, 5, 10];
                a = bases[Math.floor(Math.random() * bases.length)];
                b = Math.floor(Math.random() * 3) + 2; // 2~4승
                if (a === 2) b = Math.floor(Math.random() * 5) + 2; // 2의 6승까지
                answer = Math.pow(a, b);
                display = `${a}^${b} = ?`;
                explanation = `${a}를 ${b}번 곱하면 ${answer}`;
            } else {
                // 음수 계산
                a = Math.floor(Math.random() * 20) + 1;
                b = Math.floor(Math.random() * 30) + 20;
                answer = a - b;
                display = `${a} - ${b} = ?`;
                explanation = `작은 수에서 큰 수를 빼면 음수: ${answer}`;
            }

        } else {
            // 3단계: 고등 (로그, 미분 등) - 정수 답만 나오게
            const types = ["log", "diff", "seq"];
            const type = types[Math.floor(Math.random() * types.length)];

            if (type === "log") {
                // log_a(b) = x
                const base = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
                answer = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
                const val = Math.pow(base, answer);
                display = `log${base}(${val}) = ?`;
                explanation = `${base}의 ${answer}승이 ${val}이므로 정답은 ${answer}`;
            } else if (type === "diff") {
                // f(x) = x^n. f'(1)? f'(a)?
                // 간단하게 f(x) = x^2, f'(3) = ? -> 2*3 = 6
                const n = Math.floor(Math.random() * 3) + 2; // 2, 3, 4차
                const x_val = Math.floor(Math.random() * 5) + 1;
                answer = n * Math.pow(x_val, n - 1);
                display = `f(x)=x^${n}, f'(${x_val})=?`;
                explanation = `f'(x)=${n}x^${n - 1} 이므로, ${n}×${Math.pow(x_val, n - 1)} = ${answer}`;
            } else {
                // 등차수열 an = a + (n-1)d. a3?
                const a1 = Math.floor(Math.random() * 5) + 1;
                const d = Math.floor(Math.random() * 5) + 1;
                const n = Math.floor(Math.random() * 4) + 3; // 3~6번째 항
                answer = a1 + (n - 1) * d;
                display = `첫항 ${a1}, 공차 ${d}인 등차수열의 ${n}번째 항?`;
                explanation = `${a1} + (${n}-1)×${d} = ${answer}`;
            }
        }

        this.currentProblem = { a, b, op, answer, explanation, display };
        this.waitingForNext = false;

        // 해설 숨기기
        const explanationDiv = document.getElementById("math-explanation");
        if (explanationDiv) explanationDiv.style.display = "none";
    }

    handleKeyDown(e) {
        if (!this.isGameActive || this.waitingForNext) return;

        if (e.key === "Enter") {
            const input = document.getElementById("math-answer");
            if (input && input.value !== "") {
                this.checkAnswer();
            }
        }
    }

    checkAnswer() {
        if (this.waitingForNext) return;

        const input = document.getElementById("math-answer");
        const val = parseInt(input.value);

        if (isNaN(val)) return;

        const isCorrect = val === this.currentProblem.answer;

        if (isCorrect) {
            this.score += 10;
            if (window.soundManager) window.soundManager.playCatch();
        } else {
            this.score = Math.max(0, this.score - 5);
            if (window.soundManager) window.soundManager.playExplosion();
        }

        if (this.onScoreChange) {
            this.onScoreChange(this.score, this.level);
        }

        this.showExplanation(isCorrect, isCorrect ? "정답!" : `오답입니다. 정답: ${this.currentProblem.answer}`);
    }

    passProblem() {
        if (!this.isGameActive || this.waitingForNext) return;

        this.score = Math.max(0, this.score - 2);
        if (window.soundManager) window.soundManager.playExplosion();

        if (this.onScoreChange) {
            this.onScoreChange(this.score, this.level);
        }

        this.showExplanation(false, `패스했습니다. 정답: ${this.currentProblem.answer}`);
    }

    showExplanation(isCorrect, title) {
        this.waitingForNext = true;

        const explanationDiv = document.getElementById("math-explanation");
        if (explanationDiv) {
            explanationDiv.style.display = "block";
            explanationDiv.style.backgroundColor = isCorrect ? "rgba(76, 175, 80, 0.2)" : "rgba(244, 67, 54, 0.2)";
            explanationDiv.style.color = "#ffffff";
            explanationDiv.innerHTML = `${title}<br><span style="font-weight:normal; font-size: 0.9em;">(${this.currentProblem.explanation})</span>`;
        }

        setTimeout(() => {
            const input = document.getElementById("math-answer");
            if (input) {
                input.value = "";
                input.focus();
            }
            if (this.isGameActive) {
                this.generateProblem();
            }
        }, 1500); // 1.5초 후 다음 문제
    }

    draw(ctx) {
        if (!this.isGameActive) return;

        // 칠판 배경
        ctx.fillStyle = "#2F4F4F";
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // 테두리
        ctx.lineWidth = 20;
        ctx.strokeStyle = "#8B4513";
        ctx.strokeRect(0, 0, this.canvasWidth, this.canvasHeight);

        // 문제 표시
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (this.currentProblem) {
            // 폰트 크기 조절 (긴 문제는 작게)
            const fontSize = this.currentProblem.display.length > 15 ? 30 : 50;
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillText(this.currentProblem.display, this.canvasWidth / 2, this.canvasHeight / 2 - 20);
        }

        // 점수 및 시간
        ctx.font = "20px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(`SCORE: ${this.score}`, 30, 40);

        ctx.textAlign = "right";
        ctx.fillText(`TIME: ${Math.ceil(this.timeLeft)}`, 370, 40);

        // 레벨 표시
        ctx.textAlign = "center";
        ctx.font = "16px Arial";
        ctx.fillStyle = "#f1c40f";
        const levelText = this.level === 1 ? "Level 1 (초등)" : this.level === 2 ? "Level 2 (중등)" : "Level 3 (고등)";
        ctx.fillText(levelText, this.canvasWidth / 2, 40);
    }

    setScoreChangeCallback(callback) { this.onScoreChange = callback; }
    setGameEndCallback(callback) { this.onGameEnd = callback; }
}

window.MathQuizEngine = MathQuizEngine;
