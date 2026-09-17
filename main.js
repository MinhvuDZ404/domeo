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
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    keys[key] = true;
});
window.addEventListener('keyup', event => { keys[event.key.toLowerCase()] = false; });

// === C. THẾ GIỚI & PLAYER ===
const PLAYER_SPEED = 180;
const FRAME_DURATION = 1000 / 8;
const TILE_SIZE = 64;
const CHUNK_SIZE = 512;
const TREE_MARGIN = 90;
const generatedChunks = new Map();

// player_walk_new.png có nhãn ở bên trái frame đầu tiên.
// Không dùng startX=86 cho frame 0 vì vùng đó vẫn chứa nhãn "Phải/Trái/...".
const SPRITE = {
    frameWidth: 208,
    frameHeight: 219,
    columns: 8,
    rowY: { down: 1, left: 220, right: 439, up: 658 },
    // Frame đầu tiên bắt đầu sau nhãn; các frame còn lại theo lưới 208px.
    frameX: [128, 294, 502, 710, 918, 1126, 1334, 1542],
    frameSourceWidth: [166, 208, 208, 208, 208, 208, 208, 208]
};

const player = {
    x: 368, y: 268, width: 64, height: 64,
    hitbox: { offsetX: 16, offsetY: 40, width: 32, height: 20 },
    direction: 'down', frameIndex: 0, animTimer: 0, isMoving: false
};
const camera = { x: 0, y: 0 };

function seededRandom(seed) {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
}
function getChunkTrees(chunkX, chunkY) {
    const key = `${chunkX},${chunkY}`;
    if (generatedChunks.has(key)) return generatedChunks.get(key);
    const trees = [];
    const seed = Math.abs(chunkX * 73856093 ^ chunkY * 19349663);
    const count = 10 + Math.floor(seededRandom(seed + 1) * 9);
    for (let i = 0; i < count; i++) {
        const x = chunkX * CHUNK_SIZE + TREE_MARGIN + seededRandom(seed + i * 2 + 2) * (CHUNK_SIZE - TREE_MARGIN * 2 - 64);
        const y = chunkY * CHUNK_SIZE + TREE_MARGIN + seededRandom(seed + i * 2 + 3) * (CHUNK_SIZE - TREE_MARGIN * 2 - 96);
        if (Math.abs(x - player.x) < 180 && Math.abs(y - player.y) < 180) continue;
        trees.push({ x, y, width: 64, height: 96, hitbox: { offsetX: 16, offsetY: 70, width: 32, height: 20 } });
    }
    generatedChunks.set(key, trees);
    return trees;
}
function getVisibleTrees() {
    const minX = Math.floor((camera.x - CHUNK_SIZE) / CHUNK_SIZE);
    const maxX = Math.floor((camera.x + canvas.width + CHUNK_SIZE) / CHUNK_SIZE);
    const minY = Math.floor((camera.y - CHUNK_SIZE) / CHUNK_SIZE);
    const maxY = Math.floor((camera.y + canvas.height + CHUNK_SIZE) / CHUNK_SIZE);
    const trees = [];
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) trees.push(...getChunkTrees(x, y));
    return trees;
}
function getHitbox(obj) {
    return { x: obj.x + obj.hitbox.offsetX, y: obj.y + obj.hitbox.offsetY, width: obj.hitbox.width, height: obj.hitbox.height };
}
function checkAABB(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
function getFrameCoords(direction, index) {
    if (!(direction in SPRITE.rowY) || index < 0 || index >= SPRITE.columns) throw new Error('Invalid sprite frame');
    return { sx: SPRITE.frameX[index], sy: SPRITE.rowY[direction], sw: SPRITE.frameSourceWidth[index], sh: SPRITE.frameHeight };
}

// === D. GAME LOOP ===
let lastTime = performance.now();
function gameLoop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
}

// === E. CẬP NHẬT ===
function update(dt) {
    let dx = 0, dy = 0;
    if (keys['a'] || keys['arrowleft']) { dx--; player.direction = 'left'; }
    if (keys['d'] || keys['arrowright']) { dx++; player.direction = 'right'; }
    if (keys['w'] || keys['arrowup']) { dy--; player.direction = 'up'; }
    if (keys['s'] || keys['arrowdown']) { dy++; player.direction = 'down'; }
    player.isMoving = dx !== 0 || dy !== 0;
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
    const trees = getVisibleTrees();
    if (dx) { const move = dx * PLAYER_SPEED * dt; player.x += move; if (trees.some(t => checkAABB(getHitbox(player), getHitbox(t)))) player.x -= move; }
    if (dy) { const move = dy * PLAYER_SPEED * dt; player.y += move; if (trees.some(t => checkAABB(getHitbox(player), getHitbox(t)))) player.y -= move; }
    if (player.isMoving) {
        player.animTimer += dt * 1000;
        while (player.animTimer >= FRAME_DURATION) { player.frameIndex = (player.frameIndex + 1) % 8; player.animTimer -= FRAME_DURATION; }
    } else { player.frameIndex = 0; player.animTimer = 0; }
    camera.x = player.x + player.width / 2 - canvas.width / 2;
    camera.y = player.y + player.height / 2 - canvas.height / 2;
}

// === F. VẼ ===
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const firstX = Math.floor(camera.x / TILE_SIZE) * TILE_SIZE;
    const firstY = Math.floor(camera.y / TILE_SIZE) * TILE_SIZE;
    for (let x = firstX; x < camera.x + canvas.width + TILE_SIZE; x += TILE_SIZE) {
        for (let y = firstY; y < camera.y + canvas.height + TILE_SIZE; y += TILE_SIZE) {
            ctx.drawImage(images.grass.img, x - camera.x, y - camera.y, TILE_SIZE, TILE_SIZE);
        }
    }
    const list = [];
    getVisibleTrees().forEach(tree => list.push({
        ySort: tree.y + tree.hitbox.offsetY + tree.hitbox.height,
        draw: () => ctx.drawImage(images.tree.img, tree.x - camera.x, tree.y - camera.y, tree.width, tree.height)
    }));
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
}
