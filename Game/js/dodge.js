(() => {
  const canvas = document.getElementById('dg-canvas');
  const ctx = canvas.getContext('2d');
  const timeEl = document.getElementById('dg-time');
  const scoreEl = document.getElementById('dg-score');
  const msgEl = document.getElementById('dg-msg');
  const startBtn = document.getElementById('dg-start');
  const resetBtn = document.getElementById('dg-reset');

  const W = canvas.width, H = canvas.height;
  const player = { w: 48, h: 12, x: W/2 - 24, y: H - 40, speed: 6 };
  let obstacles = []; // {x,y,w,h,vy}
  let left=false, right=false, mouseX=null;
  let score=0, elapsed=0, running=false, raf=null, spawnTimer=null;

  function spawnObstacle(){
    const w = 24 + Math.random()*36; const x = Math.random()*(W - w);
    const speed = 1.5 + Math.random()*2.5 + Math.min(3, elapsed/20);
    obstacles.push({x, y:-20, w, h:12, vy: speed});
    // next spawn
    spawnTimer = setTimeout(spawnObstacle, 600 - Math.min(350, elapsed*10));
  }

  function reset(){
    obstacles = []; score=0; elapsed=0; updateHUD(); player.x = W/2 - player.w/2; stopTimers(); msgEl.textContent='';
  }

  function updateHUD(){ scoreEl.textContent = score; timeEl.textContent = Math.floor(elapsed); }

  function draw(){
    ctx.clearRect(0,0,W,H);
    // player
    ctx.fillStyle = '#6fe3b4'; ctx.fillRect(player.x, player.y, player.w, player.h);
    // obstacles
    ctx.fillStyle = '#ff6b6b'; obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.w, o.h));
  }

  function step(dt){
    // input
    if(left) player.x -= player.speed;
    if(right) player.x += player.speed;
    if(mouseX !== null) player.x = Math.max(0, Math.min(W-player.w, mouseX - player.w/2));
    player.x = Math.max(0, Math.min(W-player.w, player.x));

    // move obstacles
    obstacles.forEach(o => o.y += o.vy);
    // remove offscreen
    obstacles = obstacles.filter(o => o.y < H + 50);

    // collisions
    for(let o of obstacles){
      if(o.x < player.x + player.w && o.x + o.w > player.x && o.y < player.y + player.h && o.y + o.h > player.y){
        stop('충돌! 게임 오버'); return;
      }
    }

    // scoring
    score += Math.floor(dt * 0.01);
    elapsed += dt/1000;
    updateHUD();

    draw();
    raf = requestAnimationFrame(loop);
  }

  let last = null;
  function loop(timestamp){
    if(!last) last = timestamp;
    const dt = timestamp - last; last = timestamp;
    step(dt);
  }

  function start(){ if(running) return; running=true; last=null; spawnObstacle(); raf = requestAnimationFrame(loop); msgEl.textContent=''; }
  function stop(text){ running=false; cancelAnimationFrame(raf); raf=null; clearTimeout(spawnTimer); spawnTimer=null; msgEl.textContent = text || 'Stopped'; }
  function stopTimers(){ cancelAnimationFrame(raf); raf=null; clearTimeout(spawnTimer); spawnTimer=null; }

  // input handlers
  window.addEventListener('keydown', e => { if(e.key==='ArrowLeft') left=true; if(e.key==='ArrowRight') right=true; if(e.code==='Space'){ if(running) stop('Paused'); else start(); } });
  window.addEventListener('keyup', e => { if(e.key==='ArrowLeft') left=false; if(e.key==='ArrowRight') right=false; });
  canvas.addEventListener('mousemove', e => { const r=canvas.getBoundingClientRect(); mouseX = e.clientX - r.left; });
  canvas.addEventListener('mouseleave', ()=> mouseX = null);

  startBtn.addEventListener('click', ()=> { if(!running) start(); });
  resetBtn.addEventListener('click', ()=> { stop(); reset(); draw(); });

  // init
  reset(); draw();
})();
