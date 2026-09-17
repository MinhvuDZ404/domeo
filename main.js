// === A. KHỞI TẠO CANVAS & TÀI NGUYÊN ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const images = {};
let loadedImagesCount = 0;
const assets = [
    ['grass', 'assets/environment/grass.png', '#48a048', 64, 64],
    ['tree', 'assets/environment/tree.png', '#2E8B57', 64, 96],
    ['player', 'assets/sprites/player_walk_new.png', '#00aaff', 1774, 887]
];

function loadImage(key, src, fallbackColor, width, height) {
    const img = new Image();
    img.src = src;
    img.onload = () => { images[key] = { img, loaded: true }; checkAllLoaded(); };
    img.onerror = () => {
        const fallback = document.createElement('canvas');
        fallback.width = width;
        fallback.height = height;
        const fallbackCtx = fallback.getContext('2d');
        fallbackCtx.fillStyle = fallbackColor;
        fallbackCtx.fillRect(0, 0, width, height);
        images[key] = { img: fallback, loaded: false };
        checkAllLoaded();
    };
}
assets.forEach(asset => loadImage(...asset));
function checkAllLoaded() {
    loadedImagesCount++;
    if (loadedImagesCount === assets.length) requestAnimationFrame(gameLoop);
}

// === B. ĐIỀU KHIỂN ===
const keys = {};
window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'e'].includes(key)) event.preventDefault();
    keys[key] = true;
});
window.addEventListener('keyup', event => { keys[event.key.toLowerCase()] = false; });

// === C. THẾ GIỚI, SINH TỒN & PLAYER ===
const PLAYER_SPEED = 180;
const FRAME_DURATION = 1000 / 8;
const TILE_SIZE = 64;
const CHUNK_SIZE = 512;
const TREE_MARGIN = 90;
const DAY_LENGTH = 120; // Một chu kỳ ngày/đêm dài 120 giây.
const HUNGER_LOSS_PER_SECOND = 1.5;
const STARVATION_DAMAGE_PER_SECOND = 4;
const BERRY_HUNGER = 25;
const BERRY_RESPAWN_TIME = 18;
const INTERACTION_DISTANCE = 58;
const generatedChunks = new Map();

// Tọa độ player_walk_new.png sau khi bỏ nhãn tiếng Việt.
const SPRITE = {
    frameWidth: 208,
    frameHeight: 219,
    columns: 8,
    rowY: { down: 1, left: 220, right: 439, up: 658 },
    frameX: [128, 294, 502, 710, 918, 1126, 1334, 1542],
    frameSourceWidth: [166, 208, 208, 208, 208, 208, 208, 208]
};

const player = {
    x: 368, y: 268, width: 64, height: 64,
    hitbox: { offsetX: 16, offsetY: 40, width: 32, height: 20 },
    direction: 'down', frameIndex: 0, animTimer: 0, isMoving: false,
    maxHealth: 100, health: 100,
    maxHunger: 100, hunger: 100,
    berries: 0
};
const camera = { x: 0, y: 0 };
let worldTime = DAY_LENGTH * 0.25; // Bắt đầu vào ban ngày.
let wasInteractPressed = false;
let gameOver = false;

function seededRandom(seed) {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
}
function getChunkData(chunkX, chunkY) {
    const key = `${chunkX},${chunkY}`;
    if (generatedChunks.has(key)) return generatedChunks.get(key);

    const seed = Math.abs(chunkX * 73856093 ^ chunkY * 19349663);
    const trees = [];
    const bushes = [];
    const treeCount = 10 + Math.floor(seededRandom(seed + 1) * 9);
    const bushCount = 3 + Math.floor(seededRandom(seed + 91) * 5);

    for (let i = 0; i < treeCount; i++) {
        const x = chunkX * CHUNK_SIZE + TREE_MARGIN + seededRandom(seed + i * 2 + 2) * (CHUNK_SIZE - TREE_MARGIN * 2 - 64);
        const y = chunkY * CHUNK_SIZE + TREE_MARGIN + seededRandom(seed + i * 2 + 3) * (CHUNK_SIZE - TREE_MARGIN * 2 - 96);
        if (Math.abs(x - player.x) < 180 && Math.abs(y - player.y) < 180) continue;
        trees.push({ x, y, width: 64, height: 96, hitbox: { offsetX: 16, offsetY: 70, width: 32, height: 20 } });
    }

    for (let i = 0; i < bushCount; i++) {
        const x = chunkX * CHUNK_SIZE + 36 + seededRandom(seed + i * 5 + 101) * (CHUNK_SIZE - 92);
        const y = chunkY * CHUNK_SIZE + 36 + seededRandom(seed + i * 5 + 102) * (CHUNK_SIZE - 92);
        if (Math.abs(x - player.x) < 130 && Math.abs(y - player.y) < 130) continue;
        bushes.push({ x, y, width: 46, height: 38, berries: 3, respawnAt: 0 });
    }

    const data = { trees, bushes };
    generatedChunks.set(key, data);
    return data;
}
function getVisibleWorld() {
    const minX = Math.floor((camera.x - CHUNK_SIZE) / CHUNK_SIZE);
    const maxX = Math.floor((camera.x + canvas.width + CHUNK_SIZE) / CHUNK_SIZE);
    const minY = Math.floor((camera.y - CHUNK_SIZE) / CHUNK_SIZE);
    const maxY = Math.floor((camera.y + canvas.height + CHUNK_SIZE) / CHUNK_SIZE);
    const result = { trees: [], bushes: [] };
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const chunk = getChunkData(x, y);
            result.trees.push(...chunk.trees);
            result.bushes.push(...chunk.bushes);
        }
    }
    return result;
}
function getHitbox(obj) {
    return { x: obj.x + obj.hitbox.offsetX, y: obj.y + obj.hitbox.offsetY, width: obj.hitbox.width, height: obj.hitbox.height };
}
function checkAABB(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
function distanceTo(obj) {
    return Math.hypot((player.x + player.width / 2) - (obj.x + obj.width / 2), (player.y + player.height / 2) - (obj.y + obj.height / 2));
}
function getFrameCoords(direction, index) {
    if (!(direction in SPRITE.rowY) || index < 0 || index >= SPRITE.columns) throw new Error('Invalid sprite frame');
    return { sx: SPRITE.frameX[index], sy: SPRITE.rowY[direction], sw: SPRITE.frameSourceWidth[index], sh: SPRITE.frameHeight };
}

// === D. SINH TỒN & TƯƠNG TÁC ===
function updateNeeds(dt) {
    player.hunger = Math.max(0, player.hunger - HUNGER_LOSS_PER_SECOND * dt);
    if (player.hunger <= 0) player.health = Math.max(0, player.health - STARVATION_DAMAGE_PER_SECOND * dt);
    if (player.health <= 0) gameOver = true;
}
function tryGatherBerry() {
    const world = getVisibleWorld();
    let nearest = null;
    let nearestDistance = INTERACTION_DISTANCE;
    for (const bush of world.bushes) {
        const distance = distanceTo(bush);
        if (distance < nearestDistance && bush.berries > 0) {
            nearest = bush;
            nearestDistance = distance;
        }
    }
    if (!nearest) return false;
    nearest.berries--;
    player.berries++;
    player.hunger = Math.min(player.maxHunger, player.hunger + BERRY_HUNGER);
    if (nearest.berries === 0) nearest.respawnAt = worldTime + BERRY_RESPAWN_TIME;
    return true;
}
function updateBushes() {
    const world = getVisibleWorld();
    for (const bush of world.bushes) {
        if (bush.berries === 0 && worldTime >= bush.respawnAt) bush.berries = 3;
    }
}

// === E. GAME LOOP ===
let lastTime = performance.now();
function gameLoop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (!gameOver) update(dt);
    render();
    requestAnimationFrame(gameLoop);
}

// === F. CẬP NHẬT ===
function update(dt) {
    worldTime = (worldTime + dt) % DAY_LENGTH;
    updateNeeds(dt);
    updateBushes();

    const interactPressed = !!keys['e'];
    if (interactPressed && !wasInteractPressed) tryGatherBerry();
    wasInteractPressed = interactPressed;

    let dx = 0, dy = 0;
    if (keys['a'] || keys['arrowleft']) { dx--; player.direction = 'left'; }
    if (keys['d'] || keys['arrowright']) { dx++; player.direction = 'right'; }
    if (keys['w'] || keys['arrowup']) { dy--; player.direction = 'up'; }
    if (keys['s'] || keys['arrowdown']) { dy++; player.direction = 'down'; }
    player.isMoving = dx !== 0 || dy !== 0;
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }

    const world = getVisibleWorld();
    if (dx) {
        const move = dx * PLAYER_SPEED * dt;
        player.x += move;
        if (world.trees.some(tree => checkAABB(getHitbox(player), getHitbox(tree)))) player.x -= move;
    }
    if (dy) {
        const move = dy * PLAYER_SPEED * dt;
        player.y += move;
        if (world.trees.some(tree => checkAABB(getHitbox(player), getHitbox(tree)))) player.y -= move;
    }

    if (player.isMoving) {
        player.animTimer += dt * 1000;
        while (player.animTimer >= FRAME_DURATION) {
            player.frameIndex = (player.frameIndex + 1) % 8;
            player.animTimer -= FRAME_DURATION;
        }
    } else { player.frameIndex = 0; player.animTimer = 0; }

    camera.x = player.x + player.width / 2 - canvas.width / 2;
    camera.y = player.y + player.height / 2 - canvas.height / 2;
}

// === G. VẼ ===
function drawBush(bush) {
    const x = bush.x - camera.x;
    const y = bush.y - camera.y;
    ctx.fillStyle = '#174f29';
    ctx.beginPath(); ctx.arc(x + 13, y + 24, 14, 0, Math.PI * 2); ctx.arc(x + 27, y + 15, 17, 0, Math.PI * 2); ctx.arc(x + 38, y + 25, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#25833d';
    ctx.beginPath(); ctx.arc(x + 13, y + 18, 12, 0, Math.PI * 2); ctx.arc(x + 27, y + 10, 14, 0, Math.PI * 2); ctx.arc(x + 39, y + 19, 11, 0, Math.PI * 2); ctx.fill();
    if (bush.berries > 0) {
        ctx.fillStyle = '#e83f64';
        [[14, 15], [25, 5], [35, 17], [21, 24], [37, 27]].slice(0, bush.berries + 2).forEach(([bx, by]) => { ctx.beginPath(); ctx.arc(x + bx, y + by, 3, 0, Math.PI * 2); ctx.fill(); });
    }
}
function drawHud() {
    const bar = (x, y, width, value, color, label) => {
        ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x, y, width, 18);
        ctx.fillStyle = color; ctx.fillRect(x + 2, y + 2, (width - 4) * Math.max(0, value), 14);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.fillText(label, x + 7, y + 13);
    };
    bar(18, 18, 190, player.health / player.maxHealth, '#d93645', `Máu ${Math.ceil(player.health)}/${player.maxHealth}`);
    bar(18, 42, 190, player.hunger / player.maxHunger, '#e2a928', `Đói ${Math.ceil(player.hunger)}/${player.maxHunger}`);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.fillText(`Quả: ${player.berries}`, 18, 82);
    const phase = Math.sin((worldTime / DAY_LENGTH) * Math.PI * 2 - Math.PI / 2);
    ctx.fillText(phase > 0 ? '☀ Ban ngày' : '☾ Ban đêm', canvas.width - 115, 25);
    if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 32px Arial'; ctx.textAlign = 'center'; ctx.fillText('Bạn đã kiệt sức', canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = '16px Arial'; ctx.fillText('Tải lại trang để chơi lại', canvas.width / 2, canvas.height / 2 + 25); ctx.textAlign = 'left';
    }
}
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const firstX = Math.floor(camera.x / TILE_SIZE) * TILE_SIZE;
    const firstY = Math.floor(camera.y / TILE_SIZE) * TILE_SIZE;
    for (let x = firstX; x < camera.x + canvas.width + TILE_SIZE; x += TILE_SIZE) {
        for (let y = firstY; y < camera.y + canvas.height + TILE_SIZE; y += TILE_SIZE) ctx.drawImage(images.grass.img, x - camera.x, y - camera.y, TILE_SIZE, TILE_SIZE);
    }

    const world = getVisibleWorld();
    const list = [];
    world.bushes.forEach(bush => list.push({ ySort: bush.y + bush.height, draw: () => drawBush(bush) }));
    world.trees.forEach(tree => list.push({ ySort: tree.y + tree.hitbox.offsetY + tree.hitbox.height, draw: () => ctx.drawImage(images.tree.img, tree.x - camera.x, tree.y - camera.y, tree.width, tree.height) }));
    list.push({
        ySort: player.y + player.hitbox.offsetY + player.hitbox.height,
        draw: () => {
            const x = player.x - camera.x, y = player.y - camera.y;
            if (!images.player.loaded) { ctx.fillStyle = '#00aaff'; ctx.fillRect(x, y, player.width, player.height); return; }
            const frame = getFrameCoords(player.direction, player.frameIndex);
            ctx.drawImage(images.player.img, frame.sx, frame.sy, frame.sw, frame.sh, x, y, player.width, player.height);
        }
    });
    list.sort((a, b) => a.ySort - b.ySort);
    list.forEach(item => item.draw());

    // Ánh sáng ban ngày/ban đêm phủ trên toàn thế giới sau khi vẽ vật thể.
    const daylight = Math.max(0, Math.sin((worldTime / DAY_LENGTH) * Math.PI * 2));
    const nightAlpha = 0.62 * (1 - daylight);
    if (nightAlpha > 0.01) { ctx.fillStyle = `rgba(8, 17, 58, ${nightAlpha})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    drawHud();
    const nearbyBush = world.bushes.find(bush => distanceTo(bush) < INTERACTION_DISTANCE && bush.berries > 0);
    if (nearbyBush && !gameOver) { ctx.fillStyle = '#fff'; ctx.font = '14px Arial'; ctx.fillText('Nhấn E để hái quả', canvas.width / 2 - 75, canvas.height - 22); }
}
