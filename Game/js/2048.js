// 2048.js
const boardSize = 4;
let board = [];
let score = 0;

function createBoard() {
    board = [];
    for (let i = 0; i < boardSize; i++) {
        board[i] = [];
        for (let j = 0; j < boardSize; j++) {
            board[i][j] = 0;
        }
    }
}

function addRandomTile() {
    let empty = [];
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
            if (board[i][j] === 0) empty.push({i, j});
        }
    }
    if (empty.length === 0) return;
    let {i, j} = empty[Math.floor(Math.random() * empty.length)];
    board[i][j] = Math.random() < 0.9 ? 2 : 4;
}

function updateBoard() {
    const boardDiv = document.getElementById('board');
    boardDiv.innerHTML = '';
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile' + (board[i][j] ? ' tile-' + board[i][j] : '');
            tile.textContent = board[i][j] ? board[i][j] : '';
            boardDiv.appendChild(tile);
        }
    }
    document.getElementById('score').textContent = '점수: ' + score;
}

function move(dir) {
    let moved = false;
    let merged = Array.from({length: boardSize}, () => Array(boardSize).fill(false));
    function slide(i, j, di, dj) {
        if (board[i][j] === 0) return false;
        let ni = i + di, nj = j + dj;
        while (ni >= 0 && ni < boardSize && nj >= 0 && nj < boardSize) {
            if (board[ni][nj] === 0) {
                board[ni][nj] = board[i][j];
                board[i][j] = 0;
                i = ni; j = nj;
                ni += di; nj += dj;
                moved = true;
            } else if (board[ni][nj] === board[i][j] && !merged[ni][nj]) {
                board[ni][nj] *= 2;
                score += board[ni][nj];
                board[i][j] = 0;
                merged[ni][nj] = true;
                moved = true;
                break;
            } else {
                break;
            }
        }
        return moved;
    }
    if (dir === 'left') {
        for (let i = 0; i < boardSize; i++)
            for (let j = 1; j < boardSize; j++)
                slide(i, j, 0, -1);
    } else if (dir === 'right') {
        for (let i = 0; i < boardSize; i++)
            for (let j = boardSize - 2; j >= 0; j--)
                slide(i, j, 0, 1);
    } else if (dir === 'up') {
        for (let j = 0; j < boardSize; j++)
            for (let i = 1; i < boardSize; i++)
                slide(i, j, -1, 0);
    } else if (dir === 'down') {
        for (let j = 0; j < boardSize; j++)
            for (let i = boardSize - 2; i >= 0; i--)
                slide(i, j, 1, 0);
    }
    if (moved) {
        addRandomTile();
        updateBoard();
        if (isGameOver()) {
            setTimeout(() => alert('게임 오버!'), 100);
        }
    }
}

function isGameOver() {
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
            if (board[i][j] === 0) return false;
            if (i < boardSize - 1 && board[i][j] === board[i+1][j]) return false;
            if (j < boardSize - 1 && board[i][j] === board[i][j+1]) return false;
        }
    }
    return true;
}

function restart() {
    score = 0;
    createBoard();
    addRandomTile();
    addRandomTile();
    updateBoard();
}

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') move('left');
    else if (e.key === 'ArrowRight') move('right');
    else if (e.key === 'ArrowUp') move('up');
    else if (e.key === 'ArrowDown') move('down');
});

document.getElementById('restart').onclick = restart;

window.onload = restart;
