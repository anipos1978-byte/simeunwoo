/**
 * catGame3D.js
 * 우당탕탕 고양이 3D 게임 엔진
 */

class CatGame3DEngine {
    constructor() {
        this.isGameActive = false;
        this.score = 0;
        this.anger = 0; // Renamed from noise
        this.maxAnger = 100;
        this.onScoreChange = null;
        this.onGameEnd = null;

        this.objects = [];
        this.platforms = []; // New: track surfaces the cat can stand on
        this.lastTimestamp = 0;

        // Three.js 구성 요소
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cat = null;
        this.grandma = null;
        // depth를 20에서 40으로 확장 (두 칸의 방)
        this.roomSize = { width: 20, depth: 40, height: 10 };

        // 조작 상태
        this.keys = {
            w: false, a: false, s: false, d: false,
            space: false, shift: false
        };
        this.isCrouching = false;
        this.heldObject = null; // New: object being carried
        this.angerTriggered = false; // New: Flag to start chasing

        this.initThreeJS();
    }

    initThreeJS() {
        let canvas = document.getElementById('canvas');
        // Ensure we have a fresh canvas if it was recreated
        if (!canvas) {
            console.error("Canvas element not found!");
            return;
        }

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa0a0a0);
        this.scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        this.renderer.setSize(800, 600);
        this.renderer.shadowMap.enabled = true;

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7.5);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Floor
        const floorGeometry = new THREE.PlaneGeometry(this.roomSize.width, this.roomSize.depth);
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Walls (Boundary)
        this.createWall(0, 5, -this.roomSize.depth / 2, this.roomSize.width, 10, 0); // Back
        this.createWall(0, 5, this.roomSize.depth / 2, this.roomSize.width, 10, Math.PI); // Front
        this.createWall(-this.roomSize.width / 2, 5, 0, this.roomSize.depth, 10, Math.PI / 2); // Left
        this.createWall(this.roomSize.width / 2, 5, 0, this.roomSize.depth, 10, -Math.PI / 2); // Right

        // Partition Wall with Doorway (중앙 분리벽)
        // 왼쪽 벽
        this.createWall(-6.5, 5, 0, 7, 10, 0);
        // 오른쪽 벽
        this.createWall(6.5, 5, 0, 7, 10, 0);
        // 문 위쪽 벽
        const doorTopGeo = new THREE.PlaneGeometry(6, 4);
        const doorTopMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const doorTop = new THREE.Mesh(doorTopGeo, doorTopMat);
        doorTop.position.set(0, 8, 0);
        this.scene.add(doorTop);

        // Player Cat (간단한 상자 모델)
        this.createCat();

        // Grandma (단순한 실린더 모델)
        this.createGrandma();

        // Breakable Objects
        this.spawnObjects();

        // Event Listeners
        window.addEventListener('keydown', (e) => this.handleKey(e, true));
        window.addEventListener('keyup', (e) => this.handleKey(e, false));
    }

    createWall(x, y, z, w, h, rotationY) {
        const geo = new THREE.PlaneGeometry(w, h);
        const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const wall = new THREE.Mesh(geo, mat);
        wall.position.set(x, y, z);
        wall.rotation.y = rotationY;
        this.scene.add(wall);
    }

    createCat() {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.6, 0.4, 1);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffa500 }); // 오렌지색 치즈냥이
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.3;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.set(0, 0.6, 0.5);
        head.castShadow = true;
        group.add(head);

        // Tail
        const tailGeo = new THREE.BoxGeometry(0.1, 0.1, 0.5);
        const tail = new THREE.Mesh(tailGeo, bodyMat);
        tail.position.set(0, 0.4, -0.7);
        tail.rotation.x = 0.5;
        group.add(tail);

        this.cat = group;
        this.cat.position.set(0, 0, 10); // Start in Room 1
        this.scene.add(this.cat);

        this.cat.velocity = new THREE.Vector3();
    }

    createGrandma() {
        const group = new THREE.Group();

        // Body (Simplified Dress/Apron)
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.7, 1.4, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x800080 }); // Purple Dress
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.7;
        body.castShadow = true;
        group.add(body);

        // Apron (Front panel)
        const apronGeo = new THREE.PlaneGeometry(0.6, 1.0);
        const apronMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const apron = new THREE.Mesh(apronGeo, apronMat);
        apron.position.set(0, 0.7, 0.61);
        group.add(apron);

        // Head
        const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.6;
        head.castShadow = true;
        group.add(head);

        // Glowing Red Eyes
        const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Bright red for glowing effect
        const eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
        eyeLeft.position.set(-0.1, 1.65, 0.38); // Adjust position relative to head
        group.add(eyeLeft);

        const eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
        eyeRight.position.set(0.1, 1.65, 0.38); // Adjust position relative to head
        group.add(eyeRight);

        // Hair (Grandma Bun)
        const hairGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const hairMat = new THREE.MeshStandardMaterial({ color: 0xdddddd }); // Gray/White hair
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.set(0, 1.85, -0.1);
        group.add(hair);

        const bunGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const bun = new THREE.Mesh(bunGeo, hairMat);
        bun.position.set(0, 2.0, -0.25);
        group.add(bun);

        // Glasses (Simple black rings)
        const glassGeo = new THREE.TorusGeometry(0.08, 0.015, 8, 16);
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const glassLeft = new THREE.Mesh(glassGeo, glassMat);
        glassLeft.position.set(-0.12, 1.65, 0.32);
        group.add(glassLeft);

        const glassRight = new THREE.Mesh(glassGeo, glassMat);
        glassRight.position.set(0.12, 1.65, 0.32);
        group.add(glassRight);

        // Club (몽둥이)
        const clubGeo = new THREE.CylinderGeometry(0.05, 0.08, 1.2, 6);
        const clubMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
        const club = new THREE.Mesh(clubGeo, clubMat);
        club.position.set(0.6, 0.8, 0.4);
        club.rotation.x = Math.PI / 4;
        group.add(club);
        this.grandmaClub = club;

        this.grandma = group;
        this.grandma.scale.set(1.5, 1.5, 1.5); // 1.5배 커진 위압감
        this.grandma.position.set(5, 0, -5);
        this.scene.add(this.grandma);

        // Rage Aura (평소엔 투명)
        const auraGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0,
            side: THREE.BackSide
        });
        this.rageAura = new THREE.Mesh(auraGeo, auraMat);
        this.grandma.add(this.rageAura);

        this.grandma.state = 'PATROL';
        this.grandma.targetPos = new THREE.Vector3(-5, 0, -5);
        this.grandma.stumbleTimer = 0;
        this.grandma.stumbleCooldown = 0; // New: prevent immediate re-trip
    }

    spawnObjects() {
        // Room 1 (앞쪽 방: Z > 0)
        this.createTable(0, 0, 10);
        for (let i = 0; i < 3; i++) {
            this.createVase(Math.random() * 14 - 7, 0, Math.random() * 10 + 5);
        }

        // Room 2 (뒤쪽 방: Z < 0)
        this.createTable(5, 0, -10);

        // --- 2층 확장 부품들 (방 너비 20m, Z -20~0) ---
        // 2층 바닥: 중앙 부분만 설치하여 양측 계단/경사로 입구를 확보 (X: -7 ~ 7)
        this.createSecondFloor(0, 5, -10, 14, 20);

        // 책장: 2층 높이에 맞춰 5m 높이로 조정, 중앙(X=0)에 배치하여 벽 간섭 방지
        this.createBookshelf(0, 0, -18);

        // 계단: 오른쪽 공간 (X=6.5, 너비 3 -> X: 5~8 범위)
        this.createStairs(6.5, 0, -18, 'forward');

        // 경사로: 왼쪽 공간 (X=-6.5, 너비 3 -> X: -8~-5 범위)
        this.createRamp(-6.5, 0, -2, 3, 15, 5);

        // 냥냥이 집 (2층 중앙 뒤쪽)
        this.createCatHouse(0, 5.1, -15);

        // 책장 각 칸에 물건 배치 (X=0 위치에 맞춤)
        const levels = [1.2, 2.4, 3.6, 4.8];
        levels.forEach((h, idx) => {
            this.createBook(-0.3 + (idx % 2) * 0.4, h + 0.1, -18);
            this.createBook(0.3 - (idx % 2) * 0.4, h + 0.1, -18);
            if (idx % 2 === 0) {
                this.createVase(0, h, -18);
            }
        });

        // 2층에도 물건들
        this.createVase(0, 5, -12);
        this.createBook(2, 5.1, -10);
        this.createBook(2.5, 5.1, -10);

        for (let i = 0; i < 2; i++) {
            this.createVase(Math.random() * 10 - 5, 0, Math.random() * 10 - 15);
        }
    }

    createTable(x, y, z) {
        const topGeo = new THREE.BoxGeometry(5, 0.2, 5);
        const topMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.set(x, y + 1.6, z);
        top.castShadow = true;
        top.receiveShadow = true;
        this.scene.add(top);

        this.platforms.push({
            mesh: top,
            y: y + 1.7,
            halfWidth: 2.5,
            halfDepth: 2.5,
            type: 'table'
        });

        const legGeo = new THREE.BoxGeometry(0.2, 1.5, 0.2);
        const legOffsets = [[1.8, 0.8], [-1.8, 0.8], [1.8, -0.8], [-1.8, -0.8]];
        legOffsets.forEach(off => {
            const leg = new THREE.Mesh(legGeo, topMat);
            leg.position.set(x + off[0], y + 0.75, z + off[1]);
            this.scene.add(leg);
        });

        // 테이블 위의 물건
        this.createVase(x, y + 1.6, z);
    }

    createBookshelf(x, y, z) {
        const mat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
        const shelfHeight = 5; // 2층 높이에 맞춰 조정

        // Back panel
        const backGeo = new THREE.BoxGeometry(3, shelfHeight, 0.1);
        const back = new THREE.Mesh(backGeo, mat);
        back.position.set(x, y + shelfHeight / 2, z - 0.55);
        this.scene.add(back);

        // Sides
        const sideGeo = new THREE.BoxGeometry(0.1, shelfHeight, 1.2);
        const leftSide = new THREE.Mesh(sideGeo, mat);
        leftSide.position.set(x - 1.45, y + shelfHeight / 2, z);
        this.scene.add(leftSide);

        const rightSide = new THREE.Mesh(sideGeo, mat);
        rightSide.position.set(x + 1.45, y + shelfHeight / 2, z);
        this.scene.add(rightSide);

        // Shelves (1.2m 간격으로 배치하여 5m까지 점프 가능하게 함)
        const shelfGeo = new THREE.BoxGeometry(3.2, 0.1, 1.4); // 너비와 깊이를 조금 더 확장
        const shelfHeights = [1.2, 2.4, 3.6, 4.8];
        shelfHeights.forEach(h => {
            const shelf = new THREE.Mesh(shelfGeo, mat);
            shelf.position.set(x, y + h, z);
            shelf.receiveShadow = true;
            this.scene.add(shelf);

            // Add to platforms
            this.platforms.push({
                mesh: shelf, y: y + h + 0.05, halfWidth: 1.6, halfDepth: 0.7,
                type: 'shelf'
            });
        });
    }

    createSecondFloor(x, y, z, width, depth) {
        const geo = new THREE.BoxGeometry(width, 0.2, depth);
        const mat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 }); // Slightly different wood color
        const floor = new THREE.Mesh(geo, mat);
        floor.position.set(x, y, z);
        floor.receiveShadow = true;
        this.scene.add(floor);

        this.platforms.push({
            mesh: floor,
            y: y + 0.12,
            halfWidth: width / 2,
            halfDepth: depth / 2,
            type: 'floor2'
        });
    }

    createStairs(x, y, z, direction) {
        const stepWidth = 3;
        const stepDepth = 1;
        const stepHeight = 0.5;
        const numSteps = 10;
        const mat = new THREE.MeshStandardMaterial({ color: 0xa1887f });

        for (let i = 1; i <= numSteps; i++) {
            const geo = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
            const step = new THREE.Mesh(geo, mat);

            let curX = x;
            let curZ = z + (direction === 'forward' ? i * stepDepth : -i * stepDepth);
            let curY = y + i * stepHeight - (stepHeight / 2);

            step.position.set(curX, curY, curZ);
            step.receiveShadow = true;
            this.scene.add(step);

            this.platforms.push({
                mesh: step,
                y: curY + stepHeight / 2,
                halfWidth: stepWidth / 2,
                halfDepth: stepDepth / 2,
                type: 'stair'
            });
        }
    }

    createRamp(x, y, z, width, length, height) {
        const geo = new THREE.BoxGeometry(width, 0.2, length);
        const mat = new THREE.MeshStandardMaterial({ color: 0xa1887f });
        const ramp = new THREE.Mesh(geo, mat);

        const angle = Math.atan2(height, length);
        ramp.rotation.x = -angle;
        ramp.position.set(x, y + height / 2, z - length / 2);
        this.scene.add(ramp);

        const segments = 20; // 촘촘하게 증가
        const segmentLength = length / segments;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const segY = y + t * height;
            const segZ = z - t * length;

            this.platforms.push({
                mesh: { position: new THREE.Vector3(x, segY, segZ) },
                y: segY,
                halfWidth: width / 2,
                halfDepth: segmentLength * 0.8, // 겹치도록 넉넉하게
                type: 'ramp'
            });
        }
    }

    createCatHouse(x, y, z) {
        const mat = new THREE.MeshStandardMaterial({ color: 0xffcc80 });
        const houseGeo = new THREE.BoxGeometry(2, 2, 2);
        const house = new THREE.Mesh(houseGeo, mat);
        house.position.set(x, y + 1, z);
        this.scene.add(house);

        // Entrance hole (visual only)
        const holeGeo = new THREE.PlaneGeometry(1, 1.2);
        const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const hole = new THREE.Mesh(holeGeo, holeMat);
        hole.position.set(x, y + 0.7, z + 1.01);
        this.scene.add(hole);

        // Roof
        const roofGeo = new THREE.ConeGeometry(1.8, 1.5, 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xe57373 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(x, y + 2.7, z);
        roof.rotation.y = Math.PI / 4;
        this.scene.add(roof);

        this.platforms.push({
            mesh: house,
            y: y + 2.1,
            halfWidth: 1,
            halfDepth: 1
        });
    }

    createVase(x, y, z) {
        const geo = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);
        const mat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
        const vase = new THREE.Mesh(geo, mat);
        vase.position.set(x, y + 0.3, z);
        vase.castShadow = true;
        vase.isBroken = false;
        this.scene.add(vase);
        this.objects.push(vase);
    }

    createBook(x, y, z) {
        const geo = new THREE.BoxGeometry(0.4, 0.1, 0.6);
        const mat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
        const book = new THREE.Mesh(geo, mat);
        book.position.set(x, y + 0.05, z);
        book.castShadow = true;
        book.isBroken = false;
        // 책은 세워져 있거나 누워있을 수 있는데, 여기선 살짝 세워진 느낌으로 처리 가능
        // 하지만 일단 바닥에 놓인 형태로 구현 (고양이가 밀면 떨어짐)
        this.scene.add(book);
        this.objects.push(book);
    }

    handleKey(e, isPressed) {
        const key = e.key.toLowerCase();
        if (key === 'w' || e.key === 'ArrowUp') this.keys.w = isPressed;
        if (key === 's' || e.key === 'ArrowDown') this.keys.s = isPressed;
        if (key === 'a' || e.key === 'ArrowLeft') this.keys.a = isPressed;
        if (key === 'd' || e.key === 'ArrowRight') this.keys.d = isPressed;
        if (e.key === ' ') this.keys.space = isPressed;
        if (key === 'e') this.keys.e = isPressed;

        if (e.key === 'Shift') {
            const wasPressed = this.keys.shift;
            this.keys.shift = isPressed;

            if (isPressed && !wasPressed) {
                // Grab attempt
                this.tryGrabObject();
            } else if (!isPressed && wasPressed) {
                // Drop attempt
                this.tryDropObject();
            }
        }
    }

    // 모바일 입력과 키보드 합치기
    getMergedInputs() {
        const keyboard = this.keys;
        const mobile = window.mobileControls ? window.mobileControls.getInputs() : {};

        return {
            w: keyboard.w || mobile.w,
            a: keyboard.a || mobile.a,
            s: keyboard.s || mobile.s,
            d: keyboard.d || mobile.d,
            space: keyboard.space || mobile.space,
            shift: keyboard.shift || mobile.shift,
            e: keyboard.e || mobile.e
        };
    }

    tryGrabObject() {
        if (this.heldObject) return;

        let closest = null;
        let minDist = 1.5;

        this.objects.forEach(obj => {
            if (obj.isBroken) return;
            const dist = this.cat.position.distanceTo(obj.position);
            if (dist < minDist) {
                minDist = dist;
                closest = obj;
            }
        });

        if (closest) {
            this.heldObject = closest;
        }
    }

    tryDropObject() {
        if (!this.heldObject) return;

        this.breakObject(this.heldObject);
        this.heldObject = null;
    }

    start() {
        this.isGameActive = true;
        this.score = 0;
        this.anger = 0;
        this.angerTriggered = false;
        this.lastTimestamp = performance.now();
    }

    stop() {
        this.isGameActive = false;
    }

    update(timestamp) {
        if (!this.isGameActive) return;

        const deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;

        this.updatePlayer(deltaTime);
        this.updateGrandma(deltaTime);
        this.updateAnger(deltaTime); // New: handle anger decay
        this.checkCollisions();
        this.updateCamera();
    }

    updateAnger(dt) {
        if (!this.isGameActive) return;

        // 초당 2씩 감소 (수치는 요구사항에 따라 조절 가능)
        if (this.anger > 0) {
            this.anger = Math.max(0, this.anger - 2 * dt);
        }
    }

    updatePlayer(dt) {
        const moveSpeed = 5;
        const rotateSpeed = 3;
        const inputs = this.getMergedInputs();

        // 회전
        if (inputs.a) this.cat.rotation.y += rotateSpeed * dt;
        if (inputs.d) this.cat.rotation.y -= rotateSpeed * dt;

        // 전진/후진
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyQuaternion(this.cat.quaternion);

        if (inputs.w) {
            this.cat.position.addScaledVector(direction, moveSpeed * dt);
        }
        if (inputs.s) {
            this.cat.position.addScaledVector(direction, -moveSpeed * dt);
        }

        // Crouch (몸 굽히기)
        if (inputs.shift) {
            if (!this.isCrouching) {
                this.cat.scale.y = 0.5;
                this.cat.position.y -= 0.15;
                this.isCrouching = true;
            }
        } else {
            if (this.isCrouching) {
                // 상단 공간 체크 (식탁 밑에서 일어나기 방지)
                let canStand = true;
                this.platforms.forEach(p => {
                    const dx = Math.abs(this.cat.position.x - p.mesh.position.x);
                    const dz = Math.abs(this.cat.position.z - p.mesh.position.z);
                    if (dx < p.halfWidth && dz < p.halfDepth) {
                        // 식탁 아래에 있음 (여유 공간이 1.2 미만일 때만)
                        if (this.cat.position.y < p.y && (p.y - this.cat.position.y < 1.2)) canStand = false;
                    }
                });

                if (canStand) {
                    this.cat.scale.y = 1.0;
                    this.isCrouching = false;
                }
            }
        }

        // Held Object Update
        if (this.heldObject) {
            // Cat's mouth position (forward of head)
            const mouthPos = new THREE.Vector3(0, 0.6, 0.7);
            mouthPos.applyQuaternion(this.cat.quaternion);
            mouthPos.add(this.cat.position);

            this.heldObject.position.copy(mouthPos);
            this.heldObject.rotation.y = this.cat.rotation.y;
        }

        // 점프 및 물리
        const { groundY, underObject } = this.getGroundHeight(this.cat.position, this.cat.position.y);

        // 식탁 밑에서는 강제로 굽혀야 함 (통과 로직)
        if (underObject && !this.isCrouching) {
            // 끼임 방지: 속도 저하 또는 뒤로 밀기
            this.cat.position.addScaledVector(direction, -moveSpeed * dt * 1.5);
        }

        if (inputs.space && this.cat.position.y <= groundY + 0.01 && !this.isCrouching) {
            this.cat.velocity.y = 10;
        }

        if (this.cat.position.y > groundY || this.cat.velocity.y > 0) {
            this.cat.velocity.y -= 15 * dt; // 중력
            this.cat.position.y += this.cat.velocity.y * dt;

            if (this.cat.position.y < groundY) {
                this.cat.position.y = groundY;
                this.cat.velocity.y = 0;
            }
        } else {
            // 바닥에 붙어있는 경우 y좌표 보정 (플랫폼에서 내려올 때 등)
            this.cat.position.y = groundY;
            this.cat.velocity.y = 0;
        }

        // 경계 제한 (확장된 맵에 맞게 수정)
        this.cat.position.x = THREE.MathUtils.clamp(this.cat.position.x, -this.roomSize.width / 2 + 0.5, this.roomSize.width / 2 - 0.5);
        this.cat.position.z = THREE.MathUtils.clamp(this.cat.position.z, -this.roomSize.depth / 2 + 0.5, this.roomSize.depth / 2 - 0.5);

        // 중앙 벽 충돌 처리 (간단하게: 문 위치인 |x| < 3 이 아니면 z=0을 못 넘게 함)
        if (Math.abs(this.cat.position.x) > 2.8) {
            if (this.cat.position.z > -0.5 && this.cat.position.z < 0.5) {
                // 이전 위치로 튕겨내기 (단순화: 0에서 멀어지게)
                this.cat.position.z = this.cat.position.z > 0 ? 0.51 : -0.51;
            }
        }
    }

    getGroundHeight(pos, currentY) {
        let groundY = 0;
        let underObject = false;

        this.platforms.forEach(platform => {
            const dx = Math.abs(pos.x - platform.mesh.position.x);
            const dz = Math.abs(pos.z - platform.mesh.position.z);
            if (dx < platform.halfWidth && dz < platform.halfDepth) {
                // Stepping up: 0.6m 이내의 높이 차이는 인정
                if (currentY >= platform.y - 0.6) {
                    groundY = Math.max(groundY, platform.y);
                } else {
                    // 머리 위 여유 공간 체크
                    const overheadClearance = platform.y - currentY;
                    if (overheadClearance < 1.2 && overheadClearance > 0.6) {
                        underObject = true;
                    }
                }
            }
        });

        return { groundY, underObject };
    }

    updateGrandma(dt) {
        // 할머니 AI
        if (this.grandma.state === 'STUMBLE') {
            this.grandma.stumbleTimer -= dt;
            if (this.grandma.stumbleTimer <= 0) {
                this.grandma.rotation.x = 0; // 다시 일어남
                this.grandma.stumbleCooldown = 5.0; // 5초간 넘어짐 방지

                // 일어날 때 테이블 반대 방향으로 약간 밀어줌 (끼임 방지)
                const diff = this.grandma.position.clone().sub(this.grandma.targetPos);
                if (diff.length() > 0.01) {
                    const pushDir = diff.normalize();
                    pushDir.y = 0;
                    this.grandma.position.addScaledVector(pushDir, 0.5);
                }

                // 일어난 후 상태 초기화
                this.grandma.state = 'PATROL';
            }
            return;
        }

        if (this.grandma.stumbleCooldown > 0) {
            this.grandma.stumbleCooldown -= dt;
        }

        const baseSpeed = this.grandma.state === 'CHASE' ? 3.5 : 2; // 추격 시 더 빠름 (기존 5 -> 3.5 하향)
        const speed = baseSpeed + (this.anger / 25); // 분노에 따른 비례 속도 증가량 완화 (기본 /10 -> /25)

        // State Machine: PATROL or CHASE - 화가 나있을 때만 추격
        if (this.angerTriggered && this.anger > 0 && (this.anger > 30 || this.cat.position.distanceTo(this.grandma.position) < 10)) {
            this.grandma.state = 'CHASE';
            // 분노 효과: 눈 빨갛게 & 아우라
            this.grandma.traverse(child => {
                if (child.isEye) child.material.opacity = 1;
            });
            this.rageAura.material.opacity = 0.2 + Math.sin(Date.now() * 0.01) * 0.1;
        } else {
            this.grandma.state = 'PATROL';
            this.grandma.traverse(child => {
                if (child.isEye) child.material.opacity = 0.3; // 평소엔 흐릿함
            });
            this.rageAura.material.opacity = 0;
        }

        if (this.grandma.state === 'CHASE') {
            // 수직 이동 게이트웨이 정의
            const gateways = [
                { name: 'STAIR_BOT', pos: new THREE.Vector3(6.5, 0, -18), target: new THREE.Vector3(6.5, 5, -8), floor: 0 },
                { name: 'STAIR_TOP', pos: new THREE.Vector3(6.5, 5, -8), target: new THREE.Vector3(6.5, 0, -18), floor: 1 },
                { name: 'RAMP_BOT', pos: new THREE.Vector3(-6.5, 0, -2), target: new THREE.Vector3(-6.5, 5, -17), floor: 0 },
                { name: 'RAMP_TOP', pos: new THREE.Vector3(-6.5, 5, -17), target: new THREE.Vector3(-6.5, 0, -2), floor: 1 }
            ];

            const catFloor = this.cat.position.y > 2.5 ? 1 : 0;
            const grandmaFloor = this.grandma.position.y > 2.5 ? 1 : 0;

            if (catFloor !== grandmaFloor) {
                // 층이 다르면 현재 층의 가장 가까운 게이트웨이로 이동
                let bestGateway = null;
                let minDist = Infinity;
                gateways.forEach(gw => {
                    if (gw.floor === grandmaFloor) {
                        const d = this.grandma.position.distanceTo(gw.pos);
                        if (d < minDist) {
                            minDist = d;
                            bestGateway = gw;
                        }
                    }
                });

                if (bestGateway) {
                    if (minDist < 1.0) {
                        // 게이트웨이 도착 시 반대편 게이트웨이로 향함
                        this.grandma.targetPos.copy(bestGateway.target);
                    } else {
                        this.grandma.targetPos.copy(bestGateway.pos);
                    }
                }
            } else {
                // 같은 층이면 직접 추격
                this.grandma.targetPos.copy(this.cat.position);
                // 2층일 경우에도 플랫폼 위를 걷게 하기 위해 targetPos.y를 현재 층 높이로 맞춤
                this.grandma.targetPos.y = grandmaFloor === 1 ? 5 : 0;
            }

            // Swing club animation effect
            this.grandmaClub.rotation.z = Math.sin(Date.now() * 0.01) * 0.5;
        } else {
            const dist = this.grandma.position.distanceTo(this.grandma.targetPos);
            if (dist < 1.0) {
                // 순찰 지점 순환 (Room 1 -> Room 2 -> Room 1...)
                if (this.grandma.targetPos.z > 0) {
                    this.grandma.targetPos.set(0, 0, -10); // Room 2 중앙으로
                } else {
                    this.grandma.targetPos.set(0, 0, 10);  // Room 1 중앙으로
                }
            }
        }

        const diffToTarget = this.grandma.targetPos.clone().sub(this.grandma.position);
        if (diffToTarget.length() > 0.01) {
            const dir = diffToTarget.normalize();
            this.grandma.position.addScaledVector(dir, speed * dt);
            this.grandma.lookAt(this.grandma.targetPos.x, this.grandma.position.y, this.grandma.targetPos.z);
        }

        // 할머니 높이 업데이트 (바닥/계단/경사로 반영)
        const gGround = this.getGroundHeight(this.grandma.position, this.grandma.position.y);
        this.grandma.position.y = gGround.groundY;

        // 테이블 충돌 체크 (넘어짐) - 이미 넘어진 상태거나 쿨타임 중이면 체크하지 않음
        if (this.grandma.state !== 'STUMBLE' && this.grandma.stumbleCooldown <= 0) {
            this.platforms.forEach(p => {
                // 식탁이나 낮은 물체일 때만 넘어짐 (2층 바닥, 높은 선반, 계단, 경사로 제외)
                if (p.type !== 'table') return;

                const dx = Math.abs(this.grandma.position.x - p.mesh.position.x);
                const dz = Math.abs(this.grandma.position.z - p.mesh.position.z);
                if (dx < p.halfWidth + 0.3 && dz < p.halfDepth + 0.3) {
                    this.grandma.state = 'STUMBLE';
                    this.grandma.stumbleTimer = 2.5;
                    this.grandma.rotation.x = Math.PI / 2.5;
                }
            });
        }

        // 쿨타임 감소
        if (this.grandma.stumbleCooldown > 0) {
            this.grandma.stumbleCooldown -= dt;
        }

        const toPlayer = this.cat.position.clone().sub(this.grandma.position);
        const distToPlayer = toPlayer.length();

        // 근접 시 화면 흔들림 효과
        if (this.grandma.state === 'CHASE' && distToPlayer < 5) {
            const intensity = (5 - distToPlayer) * 0.02;
            this.camera.position.x += (Math.random() - 0.5) * intensity;
            this.camera.position.y += (Math.random() - 0.5) * intensity;
        }

        // 붙잡힘 판정 (거리뿐만 아니라 높이차이도 체크 - 바닥 근처에 있을 때만 붙잡힘)
        if (distToPlayer < 1.0 && Math.abs(this.cat.position.y - this.grandma.position.y) < 0.5) {
            this.gameOver();
        }
    }

    checkCollisions() {
        this.objects.forEach(obj => {
            if (obj.isBroken) return;

            const dist = this.cat.position.distanceTo(obj.position);
            if (dist < 0.8) {
                this.breakObject(obj);
            }
        });
    }

    breakObject(obj) {
        if (obj.isBroken) return;
        obj.isBroken = true;
        obj.rotation.x = Math.PI / 2; // 누운 상태로

        // 떨어진 위치가 바닥이면 y=0.1, 아니면 현재 y 유지 (또는 플랫폼 체크)
        let groundY = 0;
        this.platforms.forEach(p => {
            const dx = Math.abs(obj.position.x - p.mesh.position.x);
            const dz = Math.abs(obj.position.z - p.mesh.position.z);
            if (dx < p.halfWidth && dz < p.halfDepth) {
                groundY = Math.max(groundY, p.y);
            }
        });
        obj.position.y = groundY + 0.1;

        this.score += 100;
        this.anger = Math.min(this.maxAnger, this.anger + 20);
        this.angerTriggered = true; // 최초로 깨트리면 추격 시작

        if (this.onScoreChange) this.onScoreChange(this.score);

        if (this.anger >= this.maxAnger) {
            // 화남 수치가 최대면 즉시 추격 속도 증가 등 추가 효과 가능
        }
    }

    updateCamera() {
        // 3인칭 시점 따라가기
        const offset = new THREE.Vector3(0, 4, -6);
        offset.applyQuaternion(this.cat.quaternion);
        this.camera.position.set(
            this.cat.position.x + offset.x,
            this.cat.position.y + offset.y,
            this.cat.position.z + offset.z
        );
        this.camera.lookAt(this.cat.position);
    }

    draw() {
        this.renderer.render(this.scene, this.camera);
        this.drawUI();
    }

    drawUI() {
        // 더 확실한 컨테이너 선택 (canvas-wrapper가 없으면 body라도 사용)
        let container = document.querySelector('.canvas-wrapper') || document.body;
        if (!container) return;

        // Ensure anger meter exists
        let meter = document.getElementById('anger-meter-container');
        if (!meter) {
            meter = document.createElement('div');
            meter.id = 'anger-meter-container';
            meter.style.position = 'absolute';
            meter.style.bottom = '60px'; // 점수와 안 겹치도록 조정
            meter.style.left = '50%';
            meter.style.transform = 'translateX(-50%)';
            meter.style.width = '300px';
            meter.style.height = '25px';
            meter.style.backgroundColor = 'rgba(0,0,0,0.5)';
            meter.style.border = '2px solid white';
            meter.style.borderRadius = '15px';
            meter.style.overflow = 'hidden';
            meter.style.zIndex = '100';

            const bar = document.createElement('div');
            bar.id = 'anger-bar';
            bar.style.width = '0%';
            bar.style.height = '100%';
            bar.style.backgroundColor = 'red';
            bar.style.transition = 'width 0.3s';

            const label = document.createElement('div');
            label.innerText = '할머니 화남 수치';
            label.style.position = 'absolute';
            label.style.width = '100%';
            label.style.textAlign = 'center';
            label.style.color = 'white';
            label.style.fontWeight = 'bold';
            label.style.fontSize = '14px';
            label.style.lineHeight = '25px';

            meter.appendChild(bar);
            meter.appendChild(label);
            container.appendChild(meter); // Fixed from overlay to container
        }

        const bar = document.getElementById('anger-bar');
        if (bar) {
            bar.style.width = `${this.anger}%`;
        }
    }

    setScoreChangeCallback(callback) {
        this.onScoreChange = callback;
    }

    setGameEndCallback(callback) {
        this.onGameEnd = callback;
    }

    gameOver() {
        this.isGameActive = false;
        if (this.onGameEnd) this.onGameEnd(this.score);
    }

    // Pose 인식을 위한 인터페이스 (main.js에서 호출 가능)
    onPoseDetected(className) {
        if (!this.isGameActive) return;

        // 포즈에 따른 맵핑
        // "Left" -> this.keys.a
        // "Right" -> this.keys.d
        // "Center" -> this.keys.w
    }
}
