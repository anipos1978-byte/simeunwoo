/**
 * mobileControls.js
 * 가상 조이스틱 및 모바일 버튼 로직
 */

class MobileControls {
    constructor() {
        this.joystick = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            dirX: 0,
            dirY: 0
        };

        this.inputs = {
            w: false, a: false, s: false, d: false,
            space: false, shift: false, e: false
        };

        this.init();
    }

    init() {
        const container = document.getElementById('joystick-container');
        const stick = document.getElementById('joystick');
        const overlay = document.getElementById('mobile-controls');

        // 모바일 접속 여부 체크
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || (window.innerWidth <= 900);

        if (isMobile) {
            overlay.style.display = 'flex';
        }

        // 조이스틱 로직
        container.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const rect = container.getBoundingClientRect();
            this.joystick.active = true;
            this.joystick.startX = rect.left + rect.width / 2;
            this.joystick.startY = rect.top + rect.height / 2;
            this.updateJoystick(touch.clientX, touch.clientY);
        });

        window.addEventListener('touchmove', (e) => {
            if (!this.joystick.active) return;
            const touch = e.touches[0];
            this.updateJoystick(touch.clientX, touch.clientY);
        }, { passive: false });

        window.addEventListener('touchend', () => {
            this.joystick.active = false;
            stick.style.transform = `translate(0px, 0px)`;
            this.resetMovement();
        });

        // 버튼 로직
        this.bindButton('btn-jump', 'space');
        this.bindButton('btn-crouch', 'shift');
        this.bindButton('btn-interact', 'e');
    }

    updateJoystick(x, y) {
        const stick = document.getElementById('joystick');
        let dx = x - this.joystick.startX;
        let dy = y - this.joystick.startY;

        const maxRadius = 45;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxRadius) {
            dx = (dx / dist) * maxRadius;
            dy = (dy / dist) * maxRadius;
        }

        stick.style.transform = `translate(${dx}px, ${dy}px)`;

        // WASD 매핑 (임계값 0.3)
        this.inputs.d = dx / maxRadius > 0.3;
        this.inputs.a = dx / maxRadius < -0.3;
        this.inputs.s = dy / maxRadius > 0.3;
        this.inputs.w = dy / maxRadius < -0.3;
    }

    resetMovement() {
        this.inputs.w = false;
        this.inputs.a = false;
        this.inputs.s = false;
        this.inputs.d = false;
    }

    bindButton(id, key) {
        const btn = document.getElementById(id);
        if (!btn) return;

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.inputs[key] = true;
        });

        btn.addEventListener('touchend', (e) => {
            this.inputs[key] = false;
        });
    }

    getInputs() {
        return this.inputs;
    }
}

// 글로벌 전역으로 관리 (main.js에서 참조 가능)
window.mobileControls = new MobileControls();
