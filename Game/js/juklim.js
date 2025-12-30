// 간단한 '죽림고수' 표적 클릭 게임
(() => {
  const grid = document.getElementById('grid');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const message = document.getElementById('message');

  const SIZE = 9; // 3x3
  let score = 0;
  let timeLeft = 30;
  let timerId = null;
  let spawnId = null;
  let activeIndex = -1;
  let running = false;

  function makeGrid() {
    grid.innerHTML = '';
    for (let i = 0; i < SIZE; i++) {
      const hole = document.createElement('div');
      hole.className = 'hole';
      hole.dataset.index = i;
      hole.addEventListener('click', onHit);
      grid.appendChild(hole);
    }
  }

  function onHit(e) {
    if (!running) return;
    const idx = Number(e.currentTarget.dataset.index);
    if (idx === activeIndex) {
      score += 1;
      scoreEl.textContent = score;
      // remove mole immediately
      clearActive();
    }
  }

  function clearActive() {
    if (activeIndex >= 0) {
      const prev = grid.children[activeIndex];
      if (prev) prev.innerHTML = '';
      activeIndex = -1;
    }
  }

  function spawn() {
    clearActive();
    const idx = Math.floor(Math.random() * SIZE);
    activeIndex = idx;
    const hole = grid.children[idx];
    if (!hole) return;
    const mole = document.createElement('div');
    mole.className = 'mole';
    mole.textContent = '표';
    hole.appendChild(mole);
    // next spawn time slightly random
    const next = 500 + Math.random() * 700;
    spawnId = setTimeout(spawn, next);
  }

  function startGame() {
    if (running) return;
    running = true;
    score = 0; scoreEl.textContent = score;
    timeLeft = 30; timeEl.textContent = timeLeft;
    message.textContent = '';

    spawn();
    timerId = setInterval(() => {
      timeLeft -= 1;
      timeEl.textContent = timeLeft;
      if (timeLeft <= 0) stopGame();
    }, 1000);
  }

  function stopGame() {
    running = false;
    clearInterval(timerId); timerId = null;
    clearTimeout(spawnId); spawnId = null;
    clearActive();
    message.textContent = `Game Over — Your score: ${score}`;
  }

  startBtn?.addEventListener('click', startGame);
  restartBtn?.addEventListener('click', () => {
    stopGame();
    startGame();
  });

  // init
  makeGrid();
})();
