// --- 상수 및 상태 변수 ---
const MAZE_SIZE = 15;
const CELL_SIZE = 40;
const PLAYER_COLOR = "#2176ff";
const EXIT_COLOR = "#2ecc40";
const WALL_COLOR = "#222";
const PATH_COLOR = "#fff";
const VISITED_COLOR = "#e0e0e0";

let maze = [];
let player = { x: 0, y: 0 };
let exit = { x: MAZE_SIZE - 1, y: MAZE_SIZE - 1 };
let moves = 0;
let timer = 0;
let timerInterval = null;
let gameActive = false;
let visitedCells = [];

// --- DOM 요소 ---
const canvas = document.getElementById('maze-canvas');
const ctx = canvas.getContext('2d');
const timerSpan = document.getElementById('timer');
const movesSpan = document.getElementById('moves');
const messageDiv = document.getElementById('game-message');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// --- 유틸 함수 ---
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- 미로 생성 ---
function generateMaze(size) {
    let maze = [];
    for (let y = 0; y < size; y++) {
        maze[y] = [];
        for (let x = 0; x < size; x++) {
            maze[y][x] = {
                x, y,
                walls: [true, true, true, true], // top, right, bottom, left
                visited: false
            };
        }
    }
    function carve(x, y) {
        maze[y][x].visited = true;
        let dirs = shuffle([0, 1, 2, 3]);
        for (let dir of dirs) {
            let nx = x, ny = y;
            if (dir === 0) ny--;
            if (dir === 1) nx++;
            if (dir === 2) ny++;
            if (dir === 3) nx--;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size && !maze[ny][nx].visited) {
                maze[y][x].walls[dir] = false;
                maze[ny][nx].walls[(dir + 2) % 4] = false;
                carve(nx, ny);
            }
        }
    }
    carve(0, 0);
    // Remove visited flags
    for (let row of maze) for (let cell of row) cell.visited = false;
    return maze;
}

// --- 미로 그리기 ---
function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw visited path
    for (let cell of visitedCells) {
        ctx.fillStyle = VISITED_COLOR;
        ctx.fillRect(cell.x * CELL_SIZE + 10, cell.y * CELL_SIZE + 10, CELL_SIZE - 20, CELL_SIZE - 20);
    }
    for (let y = 0; y < MAZE_SIZE; y++) {
        for (let x = 0; x < MAZE_SIZE; x++) {
            let cell = maze[y][x];
            let px = x * CELL_SIZE, py = y * CELL_SIZE;
            ctx.fillStyle = PATH_COLOR;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

            ctx.strokeStyle = WALL_COLOR;
            ctx.lineWidth = 3;
            // Top
            if (cell.walls[0]) {
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + CELL_SIZE, py);
                ctx.stroke();
            }
            // Right
            if (cell.walls[1]) {
                ctx.beginPath();
                ctx.moveTo(px + CELL_SIZE, py);
                ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
                ctx.stroke();
            }
            // Bottom
            if (cell.walls[2]) {
                ctx.beginPath();
                ctx.moveTo(px, py + CELL_SIZE);
                ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
                ctx.stroke();
            }
            // Left
            if (cell.walls[3]) {
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px, py + CELL_SIZE);
                ctx.stroke();
            }
        }
    }
    // Draw exit
    ctx.fillStyle = EXIT_COLOR;
    ctx.fillRect(exit.x * CELL_SIZE + 8, exit.y * CELL_SIZE + 8, CELL_SIZE - 16, CELL_SIZE - 16);
    // Draw player
    ctx.fillStyle = PLAYER_COLOR;
    ctx.fillRect(player.x * CELL_SIZE + 8, player.y * CELL_SIZE + 8, CELL_SIZE - 16, CELL_SIZE - 16);
}

// --- 이동 가능 여부 ---
function canMove(dx, dy) {
    let nx = player.x + dx, ny = player.y + dy;
    if (nx < 0 || nx >= MAZE_SIZE || ny < 0 || ny >= MAZE_SIZE) return false;
    let cell = maze[player.y][player.x];
    if (dx === 0 && dy === -1 && !cell.walls[0]) return true; // up
    if (dx === 1 && dy === 0 && !cell.walls[1]) return true; // right
    if (dx === 0 && dy === 1 && !cell.walls[2]) return true; // down
    if (dx === -1 && dy === 0 && !cell.walls[3]) return true; // left
    return false;
}

// --- 플레이어 이동 ---
function movePlayer(dx, dy) {
    if (!gameActive) return;
    if (canMove(dx, dy)) {
        player.x += dx;
        player.y += dy;
        moves++;
        movesSpan.textContent = `Moves: ${moves}`;
        visitedCells.push({ x: player.x, y: player.y });
        drawMaze();
        checkWin();
    }
}

// --- 게임 승리 체크 ---
function checkWin() {
    if (player.x === exit.x && player.y === exit.y) {
        endGame(true);
    }
}

// --- 게임 시작 ---
function startGame() {
    maze = generateMaze(MAZE_SIZE);
    player = { x: 0, y: 0 };
    exit = { x: MAZE_SIZE - 1, y: MAZE_SIZE - 1 };
    moves = 0;
    timer = 0;
    visitedCells = [{ x: player.x, y: player.y }];
    gameActive = true;
    updateUI();
    drawMaze();
    showMessage("Game started! Escape the maze!", "hint");
    startTimer();
    canvas.focus();
}

// --- 게임 재시작 ---
function restartGame() {
    if (timerInterval) clearInterval(timerInterval);
    startGame();
}

// --- 게임 종료 ---
function endGame(win) {
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    if (win) {
        showMessage(
            `<b>Congratulations! You escaped the maze in ${timer} seconds and ${moves} moves.<br>Press <span style="color:#2176ff">Enter</span> or <span style="color:#2176ff">R</span> to play again!</b>`,
            "win"
        );
    } else {
        showMessage("Game Over!", "");
    }
}

// --- UI 업데이트 ---
function updateUI() {
    timerSpan.textContent = `Time: ${timer}s`;
    movesSpan.textContent = `Moves: ${moves}`;
}

// --- 메시지 표시 ---
function showMessage(msg, cls = "") {
    messageDiv.innerHTML = msg;
    messageDiv.className = cls;
}

// --- 타이머 ---
function startTimer() {
    updateUI();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameActive) return;
        timer++;
        timerSpan.textContent = `Time: ${timer}s`;
    }, 1000);
}

// --- 키보드 이벤트 ---
function handleKey(e) {
    // 방향키의 기본 동작(스크롤) 막기
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        return; // 방향키로는 이동 불가
    }
    if (!gameActive && (e.key === "Enter" || e.key.toLowerCase() === "r")) {
        restartGame();
        return;
    }
    if (!gameActive) return;
    switch (e.key.toLowerCase()) {
        case "w":
            movePlayer(0, -1);
            break;
        case "s":
            movePlayer(0, 1);
            break;
        case "a":
            movePlayer(-1, 0);
            break;
        case "d":
            movePlayer(1, 0);
            break;
        case "r":
            restartGame();
            break;
    }
}

// --- 버튼 이벤트 ---
startBtn.onclick = startGame;
restartBtn.onclick = restartGame;

// --- 초기화 ---
window.onload = () => {
    showMessage("Press <b>Start Game</b> to begin!", "hint");
    drawMaze();
    canvas.focus();
};

// --- 이벤트 리스너 등록 ---
document.addEventListener("keydown", handleKey);
canvas.addEventListener("click", () => canvas.focus());