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
    img.onload = () => {
        images[key] = { img, loaded: true };
        checkAllLoaded();
    };
    img.onerror = () => {
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = width;
        fallbackCanvas.height = height;
        const fallbackContext = fallbackCanvas.getContext('2d');
        fallbackContext.fillStyle = fallbackColor;
        fallbackContext.fillRect(0, 0, width, height);
        images[key] = { img: fallbackCanvas, loaded: false };
        checkAllLoaded();
    };
}

assets.forEach(asset => loadImage(...asset));

function checkAllLoaded() {
    loadedImagesCount++;
    if (loadedImagesCount === assets.length) requestAnimationFrame(gameLoop);
}

// === B. ĐIỀU KHIỂN BÀN PHÍM ===
const keys = {};
window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        event.preventDefault();
    }
    keys[key] = true;
});
window.addEventListener('keyup', event => {
    keys[event.key.toLowerCase()] = false;
});

// === C. THẾ GIỚI VÔ HẠN & PLAYER ===
const PLAYER_SPEED = 180;
const FRAME_DURATION = 1000 / 8;
const TILE_SIZE = 64;
const CHUNK_SIZE = 512;
const TREE_MARGIN = 90;
const generatedChunks = new Map();

// Tọa độ đo chính xác từ ảnh player_walk_new.png:
// full size = 1774 x 887
// bỏ 86px đầu tiên bên trái (vùng nhãn)
// frame = 208 x 219
const SPRITE = {
    startX: 86,
    frameWidth: 208,
    frameHeight: 219,
    columns: 8,
    rows: {
        down: 1,
        left: 220,
        right: 439,
        up: 658
    }
};

const player = {
    x: 368,
    y: 268,
    width: 64,
    height: 64,
    hitbox: { offsetX: 16, offsetY: 40, width: 32, height: 20 },
    direction: 'down',
    frameIndex: 0,
    animTimer: 0,
    isMoving: false
};

const camera = { x: 0, y: 0 };

function seededRandom(seed) {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
}

function getChunkTrees(chunkX, chunkY) {
    const chunkKey = `${chunkX},${chunkY}`;
    if (generatedChunks.has(chunkKey)) return generatedChunks.get(chunkKey);

    const trees = [];
    const seed = Math.abs(chunkX * 73856093 ^ chunkY * 19349663);
    const treeCount = 10 + Math.floor(seededRandom(seed + 1) * 9);

    for (let index = 0; index < treeCount; index++) {
        const randomX = seededRandom(seed + index * 2 + 2);
        const randomY = seededRandom(seed + index * 2 + 3);
        const x = chunkX * CHUNK_SIZE + TREE_MARGIN + randomX * (CHUNK_SIZE - TREE_MARGIN * 2 - 64);
        const y = chunkY * CHUNK_SIZE + TREE_MARGIN + randomY * (CHUNK_SIZE - TREE_MARGIN * 2 - 96);

        if (Math.abs(x - player.x) < 180 && Math.abs(y - player.y) < 180) continue;

        trees.push({
            x,
            y,
            width: 64,
            height: 96,
            hitbox: { offsetX: 16, offsetY: 70, width: 32, height: 20 }
        });
    }

    generatedChunks.set(chunkKey, trees);
    return trees;
}

function getVisibleTrees() {
    const minChunkX = Math.floor((camera.x - CHUNK_SIZE) / CHUNK_SIZE);
    const maxChunkX = Math.floor((camera.x + canvas.width + CHUNK_SIZE) / CHUNK_SIZE);
    const minChunkY = Math.floor((camera.y - CHUNK_SIZE) / CHUNK_SIZE);
    const maxChunkY = Math.floor((camera.y + canvas.height + CHUNK_SIZE) / CHUNK_SIZE);
    const trees = [];

    for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
        for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            trees.push(...getChunkTrees(chunkX, chunkY));
        }
    }
    return trees;
}

function getHitbox(obj) {
    return {
        x: obj.x + obj.hitbox.offsetX,
        y: obj.y + obj.hitbox.offsetY,
        width: obj.hitbox.width,
        height: obj.hitbox.height
    };
}

function checkAABB(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y;
}

function getFrameCoords(direction, frameIndex) {
    const baseY = SPRITE.rows[direction];

    if (baseY === undefined) {
        throw new Error(`Invalid direction: ${direction}`);
    }
    if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= SPRITE.columns) {
        throw new Error(`Frame index ${frameIndex} out of range (0-7)`);
    }

    return {
        sx: SPRITE.startX + frameIndex * SPRITE.frameWidth,
        sy: baseY,
        sw: SPRITE.frameWidth,
        sh: SPRITE.frameHeight
    };
}

// === D. GAME LOOP ===
let lastTime = performance.now();

function gameLoop(currentTime) {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.05);
    lastTime = currentTime;
    update(deltaTime);
    render();
    requestAnimationFrame(gameLoop);
}

// === E. CẬP NHẬT LOGIC ===
function update(dt) {
    let dx = 0;
    let dy = 0;

    if (keys['a'] || keys['arrowleft']) { dx -= 1; player.direction = 'left'; }
    if (keys['d'] || keys['arrowright']) { dx += 1; player.direction = 'right'; }
    if (keys['w'] || keys['arrowup']) { dy -= 1; player.direction = 'up'; }
    if (keys['s'] || keys['arrowdown']) { dy += 1; player.direction = 'down'; }

    player.isMoving = dx !== 0 || dy !== 0;
    if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
    }

    const trees = getVisibleTrees();

    if (dx !== 0) {
        const movement = dx * PLAYER_SPEED * dt;
        player.x += movement;
        if (trees.some(tree => checkAABB(getHitbox(player), getHitbox(tree)))) {
            player.x -= movement;
        }
    }

    if (dy !== 0) {
        const movement = dy * PLAYER_SPEED * dt;
        player.y += movement;
        if (trees.some(tree => checkAABB(getHitbox(player), getHitbox(tree)))) {
            player.y -= movement;
        }
    }

    // 8 FPS: luôn chuyển frame đều 125ms/lần
    if (player.isMoving) {
        player.animTimer += dt * 1000;
        while (player.animTimer >= FRAME_DURATION) {
            player.frameIndex = (player.frameIndex + 1) % SPRITE.columns;
            player.animTimer -= FRAME_DURATION;
        }
    } else {
        player.frameIndex = 0;
        player.animTimer = 0;
    }

    camera.x = player.x + player.width / 2 - canvas.width / 2;
    camera.y = player.y + player.height / 2 - canvas.height / 2;
}

// === F. VẼ THẾ GIỚI ===
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const firstTileX = Math.floor(camera.x / TILE_SIZE) * TILE_SIZE;
    const firstTileY = Math.floor(camera.y / TILE_SIZE) * TILE_SIZE;

    for (let worldX = firstTileX; worldX < camera.x + canvas.width + TILE_SIZE; worldX += TILE_SIZE) {
        for (let worldY = firstTileY; worldY < camera.y + canvas.height + TILE_SIZE; worldY += TILE_SIZE) {
            ctx.drawImage(images.grass.img, worldX - camera.x, worldY - camera.y, TILE_SIZE, TILE_SIZE);
        }
    }

    const renderList = [];

    getVisibleTrees().forEach(tree => {
        renderList.push({
            ySort: tree.y + tree.hitbox.offsetY + tree.hitbox.height,
            draw: () => ctx.drawImage(images.tree.img, tree.x - camera.x, tree.y - camera.y, tree.width, tree.height)
        });
    });

    renderList.push({
        ySort: player.y + player.hitbox.offsetY + player.hitbox.height,
        draw: () => {
            const screenX = player.x - camera.x;
            const screenY = player.y - camera.y;

            if (images.player.loaded) {
                const frame = getFrameCoords(player.direction, player.frameIndex);
                ctx.drawImage(
                    images.player.img,
                    frame.sx, frame.sy, frame.sw, frame.sh,
                    screenX, screenY, player.width, player.height
                );
            } else {
                ctx.fillStyle = '#00aaff';
                ctx.fillRect(screenX, screenY, player.width, player.height);
            }
        }
    });

    renderList.sort((a, b) => a.ySort - b.ySort);
    renderList.forEach(item => item.draw());
}
