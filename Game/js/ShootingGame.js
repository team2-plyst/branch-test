// --- HTML 요소 가져오기 ---
// 'gameCanvas' ID를 가진 canvas 요소를 가져옵니다. 게임이 그려지는 공간입니다.
const canvas = document.getElementById('gameCanvas');
// 2D 렌더링 컨텍스트를 가져옵니다. 이 컨텍스트를 사용해 캔버스에 그림을 그립니다.
const ctx = canvas.getContext('2d');

// --- UI 요소 가져오기 ---
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const expEl = document.getElementById('exp');
const maxExpEl = document.getElementById('maxExp');
const timeEl = document.getElementById('time');
const hpEl = document.getElementById('hp');
const maxHpEl = document.getElementById('maxHp');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

// --- 게임 상태 변수 ---
let player; // 플레이어 객체
let bullets = []; // 발사된 총알들을 담는 배열
let enemies = []; // 생성된 적들을 담는 배열
let items = []; // 드랍된 아이템들을 담는 배열
let floatingTexts = []; // 아이템 획득 효과 텍스트 배열
let keys = {}; // 눌린 키의 상태를 저장하는 객체

let score = 0; // 현재 점수
let level = 1; // 현재 레벨
let exp = 0; // 현재 경험치
let maxExp = 100; // 레벨업에 필요한 최대 경험치
let gameTime = 0; // 게임 진행 시간
let gameTimer; // 게임 시간 타이머
let spawnTimer; // 적 생성 타이머
let gameRunning = false; // 게임 실행 상태 (true: 실행 중, false: 정지)
let pausedForChoice = false; // 레벨업 선택지로 일시정지 상태
// 다양한 적 타입 정의
const EnemyTypes = {
    CHASER: 'chaser', // 기본: 플레이어를 향해 직선 이동
    WANDER: 'wander', // 천천히 다가오며 약간의 진동 움직임
    SINE: 'sine',     // 사인 곡선으로 흔들리며 접근
    FAST: 'fast',     // 빠르게 직진(단, 속도에 캡이 있음)
    BOSS: 'boss'      // 보스
};

// 캔버스 크기 캐시 (스크립트 시작시 초기값)
let CANVAS_W = canvas.width;
let CANVAS_H = canvas.height;

// jQuery 기반 모달 래퍼: show/hide
function showModal(id) {
    pausedForChoice = true;
    $('#' + id).css('display','flex');
}
function hideModal(id) {
    pausedForChoice = false;
    $('#' + id).css('display','none');
}

// 발사 모드 열거형
const FIRE_MODE = {
    SINGLE: 'single',
    MULTI: 'multi',
    SPREAD: 'spread'
};

// 업그레이드 풀 (레벨업 선택지)
const UPGRADE_POOL = [
    { title: 'Max HP +20', desc: 'Increase max HP by 20', apply(p){ p.maxHp += 20; p.hp += 20; } },
    { title: 'Speed +0.5', desc: 'Increase movement speed', apply(p){ p.speed += 0.5; } },
    { title: 'Fire Rate', desc: 'Shoot faster (lower cooldown)', apply(p){ p.shootRate = Math.max(4, p.shootRate - 3); } },
    { title: 'Multi Shot', desc: 'Increase projectile count', apply(p){ p.projectileCount = Math.min(5, (p.projectileCount||1) + 1); p.fireMode = FIRE_MODE.MULTI; } },
    { title: 'Spread Shot', desc: 'Gain spread firing mode', apply(p){ p.projectileCount = Math.max(3, p.projectileCount||1); p.fireMode = FIRE_MODE.SPREAD; } },
    { title: 'Piercing', desc: 'Bullets pierce enemies', apply(p){ p.piercing = true; } },
    { title: 'Damage +5', desc: 'Increase bullet damage', apply(p){ p.bulletDamage += 5; } }
];

// 유물 풀 (레벨업 시 별도 선택지)
const RELIC_POOL = [
    { title: 'Relic: Health Regen', desc: 'Slowly regenerate HP over time', apply(p){ p.relics = p.relics || {}; p.relics.regen = (p.relics.regen || 0) + 0.02; } },
    { title: 'Relic: Crit', desc: 'Small chance to deal extra damage', apply(p){ p.relics = p.relics || {}; p.relics.crit = (p.relics.crit || 0) + 0.05; } },
    { title: 'Relic: Lifesteal', desc: 'Bullets heal for a fraction', apply(p){ p.relics = p.relics || {}; p.relics.lifesteal = (p.relics.lifesteal || 0) + 0.05; } },
    { title: 'Relic: Bullet Speed', desc: 'Increase bullet speed', apply(p){ p.bulletSpeed += 1; } },
    { title: 'Relic: Pierce Boost', desc: 'Increase piercing chance', apply(p){ p.relics = p.relics || {}; p.relics.pierceBoost = (p.relics.pierceBoost || 0) + 0.1; } }
];

class Enemy {
    constructor(x, y, w, h, speed, hp, type = EnemyTypes.CHASER) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.speed = speed;
        this.hp = hp;
        this.maxHp = hp;
        this.type = type;
        this.angle = Math.random() * Math.PI * 2; // for movement patterns
        this.color = this.pickColorByType(type);
        this.birth = Date.now();
        this.offset = Math.random() * 1000; // phase offset
    }

    pickColorByType(type) {
        switch (type) {
            case EnemyTypes.WANDER: return 'orange';
            case EnemyTypes.SINE: return 'magenta';
            case EnemyTypes.FAST: return 'darkred';
            case EnemyTypes.BOSS: return 'gold';
            default: return 'red';
        }
    }

    update() {
        // 플레이어를 향한 기본 벡터
        const dx = (player.x + player.size/2) - (this.x + this.w/2);
        const dy = (player.y + player.size/2) - (this.y + this.h/2);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // 캡: 적 속도는 플레이어 속도보다 크지 않게 (너무 빠른 적 방지)
        const maxEnemySpeed = Math.max(this.speed, player.speed + 1.5);
        if (this.speed > player.speed + 2.5) {
            this.speed = player.speed + 2.5;
        }

        if (this.type === EnemyTypes.CHASER) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        } else if (this.type === EnemyTypes.WANDER) {
            // 진동 섞어서 천천히 접근
            const t = (Date.now() + this.offset) / 300;
            this.x += (dx / dist) * this.speed * 0.8 + Math.cos(t) * 0.6;
            this.y += (dy / dist) * this.speed * 0.8 + Math.sin(t) * 0.6;
        } else if (this.type === EnemyTypes.SINE) {
            // 전진하면서 수평/수직으로 흔들림
            const t = (Date.now() + this.offset) / 200;
            this.x += (dx / dist) * this.speed + Math.cos(t) * 1.2;
            this.y += (dy / dist) * this.speed + Math.sin(t) * 1.2;
        } else if (this.type === EnemyTypes.FAST) {
            // 빠르게 직선 접근
            this.x += (dx / dist) * this.speed * 1.35;
            this.y += (dy / dist) * this.speed * 1.35;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        // 모양: 타입에 따라 다르게 그리기
        if (this.type === EnemyTypes.BOSS) {
            // Boss: circular, larger, with stroke and label
            const cx = this.x + this.w/2;
            const cy = this.y + this.h/2;
            const r = Math.max(12, Math.min(this.w, this.h) / 2);
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#222';
            ctx.stroke();
            ctx.fillStyle = 'black';
            ctx.font = '12px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText('BOSS', cx, cy - r - 8);
        } else if (this.type === EnemyTypes.SINE) {
            // 원형 적
            const cx = this.x + this.w/2;
            const cy = this.y + this.h/2;
            const r = Math.max(6, Math.min(this.w, this.h) / 2);
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === EnemyTypes.WANDER) {
            // 삼각형
            ctx.beginPath();
            ctx.moveTo(this.x + this.w/2, this.y);
            ctx.lineTo(this.x + this.w, this.y + this.h);
            ctx.lineTo(this.x, this.y + this.h);
            ctx.closePath();
            ctx.fill();
        } else {
            // 기본 사각형
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }

    // 작은 체력바 (보스는 두껍게 표시)
    const barW = this.w;
    const barH = (this.type === EnemyTypes.BOSS) ? 6 : 3;
        const curW = Math.max(0, (this.hp / this.maxHp) * barW);
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x, this.y - barH - 2, barW, barH);
        ctx.fillStyle = 'lime';
        ctx.fillRect(this.x, this.y - barH - 2, curW, barH);
    }

    takeDamage(dmg) {
        this.hp -= dmg;
        if (this.hp <= 0) {
            this.onDeath();
            return true;
        }
        return false;
    }

    onDeath() {
        score += 10;
        // 경험치 지급
        if (this.expValue) addExp(this.expValue);

        // 보스는 빨간 아이템을 드롭, 일반 적은 초록 아이템
        if (this.type === EnemyTypes.BOSS) {
            items.push(new Item(this.x + this.w/2, this.y + this.h/2, 'red'));
        } else {
            if (Math.random() < 0.12) {
                items.push(new Item(this.x + this.w/2, this.y + this.h/2, 'hp'));
            }
        }
    }
}

/**
 * @class Bullet
 * @description 총알을 정의하는 클래스
 */
class Bullet {
    constructor(x, y, size, speed, angle, damage, piercing = false) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = speed;
        this.angle = angle; // 발사 각도
        this.damage = damage;
        this.piercing = piercing;
    }

    // 총알을 캔버스에 그리는 메소드
    draw() {
        ctx.fillStyle = 'black';
        ctx.beginPath(); // 새로운 경로 시작
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); // 원 그리기 API (x, y, 반지름, 시작각도, 끝각도)
        ctx.fill(); // 채우기
    }

    // 총알의 위치를 업데이트하는 메소드
    update() {
        // 삼각함수를 이용해 각도에 따라 x, y 좌표 이동
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }
}

/**
 * @class Player
 * @description 플레이어를 정의하는 클래스
 */
class Player {
    constructor(x, y, size, speed, hp) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = speed;
        this.hp = hp;
        this.maxHp = hp;

        // shooting
        this.shootCooldown = 0;
        this.shootRate = 20; // frames between shots
        this.fireMode = FIRE_MODE ? FIRE_MODE.SINGLE : {SINGLE:0}.SINGLE;
        this.projectileCount = 1;
        this.bulletSpeed = 6;
        this.bulletDamage = 10;
        this.piercing = false;
    }

    // 플레이어를 캔버스에 그리는 메소드 (파란 원, 조금 더 작게)
    draw() {
        const radius = Math.max(6, this.size * 0.6);
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(this.x + this.size/2, this.y + this.size/2, radius, 0, Math.PI*2);
        ctx.fill();

        // 체력 바 그리기 (원 위에 작게)
        const healthBarWidth = radius * 2;
        const healthBarHeight = 4;
        const currentHealthWidth = (this.hp / this.maxHp) * healthBarWidth;
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x + this.size/2 - radius, this.y + this.size/2 - radius - healthBarHeight - 4, healthBarWidth, healthBarHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x + this.size/2 - radius, this.y + this.size/2 - radius - healthBarHeight - 4, currentHealthWidth, healthBarHeight);
    }

    // 플레이어의 상태를 업데이트하는 메소드 (이동, 공격 등)
    update() {
        if (keys['w'] && this.y > 0) this.y -= this.speed;
        if (keys['s'] && this.y < CANVAS_H - this.size) this.y += this.speed;
        if (keys['a'] && this.x > 0) this.x -= this.speed;
        if (keys['d'] && this.x < CANVAS_W - this.size) this.x += this.speed;

        // relic passive: regen
        if (this.relics && this.relics.regen) {
            this.hp = Math.min(this.maxHp, this.hp + this.relics.regen);
        }

        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        } else {
            this.shoot();
            this.shootCooldown = this.shootRate;
        }
    }

    shoot() {
        let aimX = 0;
        let aimY = 0;
        if (keys['ArrowUp']) aimY = -1;
        if (keys['ArrowDown']) aimY = 1;
        if (keys['ArrowLeft']) aimX = -1;
        if (keys['ArrowRight']) aimX = 1;

        if (aimX !== 0 || aimY !== 0) {
            const baseAngle = Math.atan2(aimY, aimX);
            if (this.projectileCount <= 1) {
                bullets.push(new Bullet(this.x + this.size / 2, this.y + this.size / 2, 5, this.bulletSpeed, baseAngle, this.bulletDamage, this.piercing));
            } else {
                const spread = 0.4;
                const count = this.projectileCount;
                for (let i = 0; i < count; i++) {
                    const offset = (i / (count - 1) - 0.5) * spread;
                    bullets.push(new Bullet(this.x + this.size / 2, this.y + this.size / 2, 5, this.bulletSpeed, baseAngle + offset, this.bulletDamage, this.piercing));
                }
            }
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            gameOver();
        }
    }
}

/**
 * @class Item
 * @description 아이템을 정의하는 클래스
 */
class Item {
    // supports new Item(x,y,type) or Item(x,y,size,type)
    constructor(x, y, a, b) {
        this.x = x;
        this.y = y;
        if (typeof a === 'string') {
            this.type = a;
            this.size = (typeof b === 'number') ? b : 8;
        } else {
            this.size = (typeof a === 'number') ? a : 8;
            this.type = b || 'hp';
        }
    }

    draw() {
    let color = 'green';
    if (this.type === 'hp') color = 'green';
    else if (this.type === 'speed') color = '#87CEEB';
    else if (this.type === 'firerate') color = 'orange';
    else if (this.type === 'red') color = 'red';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    }
}

/**
 * @class FloatingText
 * @description 화면에 떠다니는 텍스트를 정의하는 클래스 (아이템 획득 효과 등)
 */
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.alpha = 1; // 투명도
        this.duration = 60; // 텍스트가 보이는 시간 (프레임 단위)
    }

    // 텍스트를 캔버스에 그리는 메소드
    draw() {
        ctx.save(); // 현재 컨텍스트 상태 저장
        ctx.globalAlpha = this.alpha; // 투명도 설정
        ctx.fillStyle = this.color;
        ctx.font = '14px Segoe UI';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore(); // 이전 컨텍스트 상태 복원
    }

    // 텍스트의 상태를 업데이트하는 메소드
    update() {
        this.y -= 0.5; // 위로 약간 이동
        this.alpha -= 1 / this.duration; // 서서히 투명해짐
    }
}

// --- 게임 로직 함수 ---

/**
 * @function spawnEnemy
 * @description 적을 생성하는 함수
 */
function spawnEnemy() {
    // 게임 시간에 따라 적의 능력치 강화
    const baseSize = 16;
    const size = Math.round(baseSize + Math.floor(gameTime / 40));
    const baseSpeed = 1 + gameTime / 120; // 느리게 증가
    const hp = 10 + Math.floor(gameTime * 1.5);
    const expValue = 8 + Math.floor(gameTime / 12);

    // spawn multiple enemies as time goes on
    const groupSize = 1 + Math.floor(gameTime / 20); // 시간이 지날수록 한 번에 나오는 수 증가
    for (let n = 0; n < groupSize; n++) {
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? -size : canvas.width + size;
            y = Math.random() * canvas.height;
        } else {
            x = Math.random() * canvas.width;
            y = Math.random() < 0.5 ? -size : canvas.height + size;
        }

    // pick a random enemy type with weights
    // early game heavily favors CHASER; other types ramp in over ~30s
    const r = Math.random();
    let type = EnemyTypes.CHASER;
    const nonChaserFactor = Math.min(1, gameTime / 30); // 0..1
    if (r < 0.15 * nonChaserFactor) type = EnemyTypes.FAST;
    else if (r < 0.45 * nonChaserFactor) type = EnemyTypes.SINE;
    else if (r < 0.75 * nonChaserFactor) type = EnemyTypes.WANDER;

        // speed variance and cap relative to player
        let speed = baseSpeed * (0.8 + Math.random() * 1.2);
        const maxAllowed = (player ? player.speed + 2.5 : 4.5);
        speed = Math.min(speed, maxAllowed);

    const e = new Enemy(x, y, size, size, speed, hp, type);
    e.expValue = expValue; // ensure each spawned enemy grants exp on death
    enemies.push(e);
    }
}

function spawnBoss() {
    const size = 40 + Math.floor(gameTime / 30); // 보스는 더 큼
    const speed = Math.min(2 + gameTime / 120, (player ? player.speed + 2.5 : 4));
    const hp = 200 + Math.floor(gameTime * 5);
    const expValue = 200 + Math.floor(gameTime / 2);

    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -size : canvas.width + size;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? -size : canvas.height + size;
    }

    const boss = new Enemy(x, y, size, size, speed, hp, EnemyTypes.BOSS);
    boss.expValue = expValue;
    enemies.push(boss);
}

/**
 * @function updateGame
 * @description 게임의 메인 루프. 매 프레임마다 호출되어 게임 상태를 업데이트하고 화면을 다시 그립니다.
 */
function updateGame() {
    if (!gameRunning) return; // 게임이 실행 중이 아니면 중단
    if (pausedForChoice) return; // 레벨업 선택 창이 떠 있으면 일시정지

    // clearRect API: 캔버스의 특정 영역을 지웁니다. (0, 0, canvas.width, canvas.height)는 전체 영역을 의미.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 플레이어 업데이트 및 그리기
    player.update();
    player.draw();

    // 모든 총알 업데이트 및 그리기
    bullets.forEach((bullet, index) => {
        bullet.update();
        bullet.draw();
        // 캔버스 밖으로 나간 총알 제거
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(index, 1); // splice API: 배열에서 요소를 제거
        }
    });

    // 모든 적 업데이트 및 그리기
    enemies.forEach((enemy, enemyIndex) => {
        enemy.update();
        enemy.draw();

        // 플레이어와 적의 충돌 감지
        if (isColliding(player, enemy)) {
            player.takeDamage(10);
            enemies.splice(enemyIndex, 1); // 충돌한 적 제거
        }

        // 총알과 적의 충돌 감지
        bullets.forEach((bullet, bulletIndex) => {
                if (isColliding(enemy, bullet)) {
                        enemy.takeDamage(bullet.damage);
                        // 관통하지 않는 총알만 제거
                        if (!bullet.piercing) bullets.splice(bulletIndex, 1);
                        if (enemy.hp <= 0) {
                            enemies.splice(enemyIndex, 1); // 체력이 0이 된 적 제거
                        }
                    }
        });
    });

    // 모든 아이템 그리기 및 플레이어와 충돌 감지
    items.forEach((item, itemIndex) => {
        item.draw();
        if (isColliding(player, item)) {
            applyItem(item.type); // 아이템 효과 적용
            items.splice(itemIndex, 1); // 먹은 아이템 제거
        }
    });

    // 플로팅 텍스트 업데이트 및 그리기
    floatingTexts.forEach((text, index) => {
        text.update();
        text.draw();
        if (text.alpha <= 0) {
            floatingTexts.splice(index, 1);
        }
    });

    updateUI(); // UI 업데이트
    // requestAnimationFrame API: 다음 프레임을 그리기 전에 지정된 함수를 호출합니다. 부드러운 애니메이션을 구현하는 데 사용됩니다.
    requestAnimationFrame(updateGame);
}

/**
 * @function applyItem
 * @description 아이템의 효과를 적용하는 함수
 * @param {string} type - 아이템의 종류
 */
function applyItem(type) {
    if (type === 'hp') {
        const healAmount = 20;
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        floatingTexts.push(new FloatingText(player.x, player.y, `+${healAmount} HP`, 'green'));
    } else if (type === 'speed') {
        player.speed += 0.5;
        floatingTexts.push(new FloatingText(player.x, player.y, `Speed UP`, '#87CEEB'));
    } else if (type === 'firerate') {
        player.shootRate = Math.max(5, player.shootRate - 2);
        floatingTexts.push(new FloatingText(player.x, player.y, `Fire Rate UP`, 'orange'));
    } else if (type === 'red') {
        // 보스가 떨군 빨간 아이템: 즉시 레릭 선택을 트리거
        floatingTexts.push(new FloatingText(player.x, player.y, `Relic Found!`, 'red'));
        showRelicChoices();
    }
}

/**
 * @function isColliding
 * @description 두 사각형 객체의 충돌 여부를 확인하는 함수 (AABB 충돌 감지)
 * @returns {boolean} 충돌하면 true, 아니면 false
 */
function isColliding(rect1, rect2) {
    // normalize to x,y,w,h
    function norm(o) {
        if (o.w !== undefined && o.h !== undefined) return {x: o.x, y: o.y, w: o.w, h: o.h};
        if (o.size !== undefined) return {x: o.x, y: o.y, w: o.size, h: o.size};
        // fallback
        return {x: o.x || 0, y: o.y || 0, w: 8, h: 8};
    }
    const a = norm(rect1);
    const b = norm(rect2);
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// 점수를 추가하는 함수
function addScore(amount) {
    score += amount;
}

// 경험치를 추가하는 함수
function addExp(amount) {
    exp += amount;
    if (exp >= maxExp) {
        levelUp(); // 경험치가 최대치에 도달하면 레벨업
    }
}

// 레벨업 처리 함수
function levelUp() {
    level++;
    exp = 0;
    maxExp = Math.floor(maxExp * 1.5); // 다음 레벨업에 필요한 경험치 증가
    // 레벨업 시 플레이어 능력치 향상
    // 자동 적용 대신, 게임을 일시정지하고 플레이어가 선택하도록 함
    pausedForChoice = true;
    showLevelUpChoices();
}

// 레벨업 선택지 표시 함수
function showLevelUpChoices() {
    // pick 3 unique upgrades from pool
    const choices = [];
    const pool = [...UPGRADE_POOL];
    while (choices.length < 3 && pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        choices.push(pool.splice(idx,1)[0]);
    }

    const modal = document.getElementById('levelUpModal');
    const container = document.getElementById('levelUpChoices');
    container.innerHTML = '';
    choices.forEach((c, i) => {
        const btn = document.createElement('button');
        btn.style.minWidth = '220px';
        btn.style.padding = '8px';
        btn.innerHTML = `<strong>${c.title}</strong><br/><span style="font-size:12px; opacity:0.9">${c.desc}</span>`;
        btn.addEventListener('click', () => {
            applyUpgrade(c);
        });
        container.appendChild(btn);
    });
    showModal('levelUpModal');

    // keyboard shortcuts 1-3
    function onKey(e) {
        if (!pausedForChoice) return;
        if (['1','2','3'].includes(e.key)) {
            const idx = parseInt(e.key,10) - 1;
            if (choices[idx]) applyUpgrade(choices[idx]);
        }
    }
    window.addEventListener('keydown', onKey);
    // store to remove after selection
    modal._removeKey = () => window.removeEventListener('keydown', onKey);

    // store choices for relic modal trigger
    modal._upgradeChoices = choices;
}

// 선택 적용 및 재개
function applyUpgrade(choice) {
    if (!choice) return;
    // apply the upgrade function
    choice.apply(player);
    // hide modal and show relic choices
    const modal = document.getElementById('levelUpModal');
    if (modal._removeKey) modal._removeKey();
    hideModal('levelUpModal');
    showRelicChoices();
}

function showRelicChoices() {
    // pick 2 relics to choose from
    const choices = [];
    const pool = [...RELIC_POOL];
    while (choices.length < 2 && pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        choices.push(pool.splice(idx,1)[0]);
    }

    const modal = document.getElementById('relicModal');
    const container = document.getElementById('relicChoices');
    container.innerHTML = '';
    choices.forEach((c,i) => {
        const btn = document.createElement('button');
        btn.style.minWidth = '220px';
        btn.style.padding = '8px';
        btn.innerHTML = `<strong>${c.title}</strong><br/><span style="font-size:12px; opacity:0.9">${c.desc}</span>`;
        btn.addEventListener('click', () => {
            c.apply(player);
            hideModal('relicModal');
            // remove key handler if any
            if (modal._removeKey) modal._removeKey();
            pausedForChoice = false;
            updateGame();
        });
        container.appendChild(btn);
    });
    showModal('relicModal');
    // keyboard shortcuts '1' and '2' for relic choices
    function onKey(e) {
        if (!pausedForChoice) return;
        if (e.key === '1' || e.key === '2') {
            const idx = parseInt(e.key,10) - 1;
            if (choices[idx]) {
                choices[idx].apply(player);
                hideModal('relicModal');
                window.removeEventListener('keydown', onKey);
                pausedForChoice = false;
                updateGame();
            }
        }
    }
    window.addEventListener('keydown', onKey);
    modal._removeKey = () => window.removeEventListener('keydown', onKey);
}

// 화면의 UI 텍스트를 업데이트하는 함수
function updateUI() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    hpEl.textContent = player ? player.hp : 0;
    maxHpEl.textContent = player ? player.maxHp : 0;
    expEl.textContent = exp;
    maxExpEl.textContent = maxExp;
    timeEl.textContent = gameTime;
}

/**
 * @function startGame
 * @description 게임을 시작하고 모든 변수를 초기화하는 함수
 */
function startGame() {
    // 게임 상태 초기화
    // 플레이어 크기를 조금 줄임(요청)
    player = new Player(canvas.width / 2 - 12, canvas.height / 2 - 12, 24, 3, 100);
    bullets = [];
    enemies = [];
    items = [];
    score = 0;
    level = 1;
    exp = 0;
    maxExp = 100;
    gameTime = 0;
    gameRunning = true;

    // UI 상태 초기화
    startButton.style.display = 'none';
    gameOverScreen.style.display = 'none';

    // setInterval API: 지정된 시간 간격마다 함수를 반복적으로 호출
    // 1초마다 게임 시간 증가 및 점수 추가
    gameTimer = setInterval(() => {
        gameTime++;
        addScore(1);
    }, 1000);

    // 3초마다 적 생성 시작
    let spawnInterval = 3000;
    spawnTimer = setInterval(() => {
        spawnEnemy();
        // 시간이 지남에 따라 적 생성 간격 단축 (최소 0.5초)
        if (spawnInterval > 500) {
            spawnInterval *= 0.98; // 이전 간격의 98%로 점차 감소
            clearInterval(spawnTimer); // 기존 타이머 제거
            spawnTimer = setInterval(spawnEnemy, spawnInterval); // 새로운 간격으로 타이머 설정
        }
    }, spawnInterval);

    // 1분(60초)마다 보스 소환
    const bossInterval = 60000;
    setInterval(() => {
        spawnBoss();
    }, bossInterval);

    updateGame(); // 게임 루프 시작
}

/**
 * @function gameOver
 * @description 게임 오버를 처리하는 함수
 */
function gameOver() {
    gameRunning = false;
    // clearInterval API: setInterval로 설정된 타이머를 중지
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    finalScoreEl.textContent = score; // 최종 점수 표시
    gameOverScreen.style.display = 'flex'; // 게임 오버 화면 표시
}

// --- 이벤트 리스너 ---

// 'keydown' 이벤트: 키가 눌렸을 때 발생
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    // 방향키로 페이지가 스크롤되는 기본 동작 방지
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }
    // 단축키 처리
    if (e.key === 'Enter' && !gameRunning && startButton.style.display !== 'none') {
        startGame();
    }
    if (e.key.toLowerCase() === 'r' && !gameRunning && gameOverScreen.style.display !== 'none') {
        startGame(); // 재시작
    }
});

// 'keyup' 이벤트: 키에서 손을 뗐을 때 발생
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 버튼 클릭 이벤트
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);