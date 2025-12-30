(() => {
  const canvas = document.getElementById('bb-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('bb-score');
  const livesEl = document.getElementById('bb-lives');
  const msgEl = document.getElementById('bb-msg');
  const startBtn = document.getElementById('bb-start');
  const resetBtn = document.getElementById('bb-reset');

  const W = canvas.width; const H = canvas.height;

  // paddle
  const paddle = { w: 100, h: 14, x: (W-100)/2, y: H-30, speed: 8 };
  // ball
  let ball = { x: W/2, y: H/2, r: 8, vx: 4*(Math.random()>.5?1:-1), vy: -4 };
  // bricks
  const COLS = 10, ROWS = 5; const BR_W = Math.floor((W-40)/COLS); const BR_H = 18;
  let bricks = [];
  let left = false, right = false, mouseX = null;
  let score = 0, lives = 3;
  let running = false, raf = null;

  function makeBricks(){
    bricks = [];
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        bricks.push({x:20 + c*(BR_W+2), y:40 + r*(BR_H+6), w:BR_W, h:BR_H, alive:true});
      }
    }
  }

  function reset(){
    paddle.x = (W-paddle.w)/2;
    ball = { x: W/2, y: H/2, r:8, vx:4*(Math.random()>.5?1:-1), vy:-4 };
    score = 0; lives = 3; updateHUD(); makeBricks(); msgEl.textContent='';
  }

  function updateHUD(){ scoreEl.textContent = score; livesEl.textContent = lives; }

  function draw(){
    ctx.clearRect(0,0,W,H);
    // bricks
    bricks.forEach(b => { if(b.alive){ ctx.fillStyle='#ff7b50'; ctx.fillRect(b.x,b.y,b.w,b.h); ctx.strokeStyle='#512600'; ctx.strokeRect(b.x,b.y,b.w,b.h);} });
    // paddle
    ctx.fillStyle='#6fe3b4'; ctx.fillRect(paddle.x,paddle.y,paddle.w,paddle.h);
    // ball
    ctx.beginPath(); ctx.fillStyle='#ffd36b'; ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fill();
  }

  function step(){
    // move paddle by keys/mouse
    if(left) paddle.x -= paddle.speed;
    if(right) paddle.x += paddle.speed;
    if(mouseX !== null) paddle.x = Math.max(0, Math.min(W-paddle.w, mouseX - paddle.w/2));
    paddle.x = Math.max(0, Math.min(W-paddle.w, paddle.x));

    // ball move
    ball.x += ball.vx; ball.y += ball.vy;
    // wall collisions
    if(ball.x - ball.r < 0){ ball.x = ball.r; ball.vx *= -1; }
    if(ball.x + ball.r > W){ ball.x = W - ball.r; ball.vx *= -1; }
    if(ball.y - ball.r < 0){ ball.y = ball.r; ball.vy *= -1; }
    // paddle
    if(ball.y + ball.r >= paddle.y && ball.y + ball.r <= paddle.y + paddle.h && ball.x >= paddle.x && ball.x <= paddle.x + paddle.w){
      ball.vy *= -1; // reflect
      // tweak vx based on hit position
      const hitPos = (ball.x - (paddle.x + paddle.w/2)) / (paddle.w/2);
      ball.vx += hitPos * 1.5;
    }
    // bottom (lose life)
    if(ball.y - ball.r > H){ lives--; updateHUD(); if(lives<=0){ stop('Game Over'); return; } else { ball.x = W/2; ball.y = H/2; ball.vy = -4; ball.vx = 4*(Math.random()>.5?1:-1); running=false; msgEl.textContent='Press Start to continue'; return; } }

    // brick collisions
    for(let b of bricks){
      if(!b.alive) continue;
      if(ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w && ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h){
        b.alive = false; ball.vy *= -1; score += 10; updateHUD(); break;
      }
    }

    // win check
    if(bricks.every(b=>!b.alive)){ stop('You Win!'); return; }

    draw();
    raf = requestAnimationFrame(step);
  }

  function start(){ if(running) return; running=true; msgEl.textContent=''; raf = requestAnimationFrame(step); }
  function stop(text){ running=false; cancelAnimationFrame(raf); raf=null; msgEl.textContent = text || 'Stopped'; }

  // input
  window.addEventListener('keydown', (e)=>{ if(e.key==='ArrowLeft') left=true; if(e.key==='ArrowRight') right=true; if(e.code==='Space') { if(running) { stop('Paused'); } else { start(); } } });
  window.addEventListener('keyup', (e)=>{ if(e.key==='ArrowLeft') left=false; if(e.key==='ArrowRight') right=false; });
  canvas.addEventListener('mousemove', (e)=>{ const rect = canvas.getBoundingClientRect(); mouseX = e.clientX - rect.left; });
  canvas.addEventListener('mouseleave', ()=>{ mouseX = null; });

  startBtn.addEventListener('click', ()=>{ if(!running) start(); });
  resetBtn.addEventListener('click', ()=>{ stop(); reset(); draw(); });

  // init
  reset(); draw();
})();
