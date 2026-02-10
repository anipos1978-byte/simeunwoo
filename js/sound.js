/**
 * sound.js
 * Web Audio API를 사용한 효과음 생성기
 * 별도의 오디오 파일 없이 코드로 소리를 만들어냅니다.
 */

class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.isMuted = false;
    }

    // 소리 재생을 위한 오실레이터 생성 헬퍼
    playTone(freq, duration, type = "sine", vol = 0.1) {
        if (this.isMuted) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // 사과/바나나 획득 소리 (딩동!)
    playCatch() {
        this.playTone(880, 0.1, "sine", 0.1); // A5
        setTimeout(() => this.playTone(1174, 0.2, "sine", 0.1), 100); // D6
    }

    // 폭탄 폭발 소리 (쿠광!)
    playExplosion() {
        if (this.isMuted) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.5);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    // 보너스 획득 소리 (짜잔~)
    playBonus() {
        const now = this.ctx.currentTime;
        [523, 659, 783, 1046].forEach((freq, i) => { // C E G C
            setTimeout(() => this.playTone(freq, 0.2, "triangle", 0.1), i * 100);
        });
    }

    // 게임 오버 소리 (띠로리...)
    playGameOver() {
        const now = this.ctx.currentTime;
        [880, 830, 783, 740].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.4, "sawtooth", 0.05), i * 200);
        });
    }

    // 무적 아이템 획득 소리 (파워업!)
    playInvincible() {
        if (this.isMuted) return;
        const now = this.ctx.currentTime;
        // 빠른 아르페지오
        [440, 554, 659, 880, 1108, 1318].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.1, "sine", 0.1), i * 50);
        });
    }

    // 총 발사 소리 (퓨, 퓨)
    playShoot() {
        if (this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.1);
    }

    // 아삭아삭 먹는 소리
    playEat() {
        if (this.isMuted) return;

        // 노이즈 버퍼 생성
        const bufferSize = this.ctx.sampleRate * 0.5; // 0.5초
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const now = this.ctx.currentTime;
        // 세 번 씹는 소리 (아삭아삭)
        [0, 0.15, 0.3].forEach(time => {
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(1200, now + time);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.3, now + time);
            gain.gain.exponentialRampToValueAtTime(0.01, now + time + 0.1);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now + time);
            noise.stop(now + time + 0.1);
        });
    }

    // 치킨 획득 소리 (팡파레!)
    playChicken() {
        if (this.isMuted) return;
        const now = this.ctx.currentTime;
        // 도-미-솔-도! (높은음)
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, now + i * 0.1);

            gain.gain.setValueAtTime(0.2, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.3);
        });
    }

    // 레벨업 소리 (라-시-도!)
    playLevelUp() {
        if (this.isMuted) return;
        const now = this.ctx.currentTime;
        [440, 493, 523].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.3, "sine", 0.1), i * 150);
        });
    }

    // 아이템 업그레이드/총 획득 소리
    playUpgrade() {
        if (this.isMuted) return;
        this.playTone(659, 0.1, "sine", 0.1); // E5
        setTimeout(() => this.playTone(880, 0.2, "sine", 0.1), 100); // A5
    }

    // 총 발사 소리 (레이저/총)
    playLaser() {
        this.playShoot();
    }
}

// 전역 인스턴스 생성
window.soundManager = new SoundManager();
