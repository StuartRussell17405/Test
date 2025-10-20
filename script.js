// Simple Pong game (fast mode)
// Left paddle: player (mouse + arrow keys)
// Right paddle: basic AI
// Ball bounces, scoreboard, collision detection, pause (Space)

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // UI
  const playerScoreEl = document.getElementById('playerScore');
  const computerScoreEl = document.getElementById('computerScore');
  const messageEl = document.getElementById('message');

  // Virtual size (canvas element width/height define drawing area)
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // Game state
  let paused = false;
  let gameOver = false;
  const WIN_SCORE = 10; // first to 10 wins

  // Paddles
  const PADDLE_WIDTH = 12;
  const PADDLE_HEIGHT = 90;
  const PADDLE_SPEED = 12; // faster keyboard movement

  const leftPaddle = {
    x: 20,
    y: (HEIGHT - PADDLE_HEIGHT) / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    dy: 0
  };

  const rightPaddle = {
    x: WIDTH - PADDLE_WIDTH - 20,
    y: (HEIGHT - PADDLE_HEIGHT) / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    dy: 0,
    maxSpeed: 10.0 // faster AI paddle
  };

  // Ball
  const ball = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    radius: 9,
    speed: 0,
    vx: 0,
    vy: 0
  };

  let playerScore = 0;
  let computerScore = 0;

  // Input
  const keys = {
    ArrowUp: false,
    ArrowDown: false
  };

  // Utility - clamp
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  // Initialize / reset ball (direction: 1 = to right, -1 = to left, or 0 random)
  function resetBall(direction = 0) {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    // Significantly higher base speed, scales with combined score
    ball.speed = 9 + Math.min(playerScore + computerScore, 12) * 0.35;

    // random angle between -45 and 45 degrees
    const angleDeg = (Math.random() * 90 - 45);
    const angle = (angleDeg * Math.PI) / 180;

    const dir = direction === 0 ? (Math.random() < 0.5 ? -1 : 1) : direction;
    ball.vx = dir * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
  }

  // Start game
  function start() {
    resetBall();
    playerScore = 0;
    computerScore = 0;
    updateScoreboard();
    loop();
  }

  // Score update UI
  function updateScoreboard() {
    playerScoreEl.textContent = playerScore;
    computerScoreEl.textContent = computerScore;
  }

  // Draw everything
  function draw() {
    // clear
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // middle dashed line
    ctx.fillStyle = '#1e90ff';
    const segH = 12;
    const gap = 10;
    const midX = WIDTH / 2 - 1;
    for (let y = 10; y < HEIGHT - 10; y += segH + gap) {
      ctx.fillRect(midX, y, 2, segH);
    }

    // paddles
    ctx.fillStyle = '#e6f1ff';
    roundedRect(ctx, leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height, 4);
    roundedRect(ctx, rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height, 4);

    // ball
    ctx.beginPath();
    ctx.fillStyle = '#ffd166';
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }

  // Rounded rect helper
  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.fill();
  }

  // Collision detection between ball and paddle (rectangle)
  function paddleCollision(paddle) {
    // AABB-circle collision
    const closestX = clamp(ball.x, paddle.x, paddle.x + paddle.width);
    const closestY = clamp(ball.y, paddle.y, paddle.y + paddle.height);
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    return (dx * dx + dy * dy) <= (ball.radius * ball.radius);
  }

  // Game update step
  function update() {
    if (paused || gameOver) return;

    // Player paddle: keyboard
    if (keys.ArrowUp) {
      leftPaddle.y -= PADDLE_SPEED;
    }
    if (keys.ArrowDown) {
      leftPaddle.y += PADDLE_SPEED;
    }

    // Bound paddles to screen
    leftPaddle.y = clamp(leftPaddle.y, 0, HEIGHT - leftPaddle.height);

    // Computer AI: simple follow with max speed and slight prediction
    let targetY = ball.y - rightPaddle.height / 2;
    // Only react strongly when ball is moving towards AI
    if (ball.vx < 0) {
      // ball going away: move to center slowly
      targetY = HEIGHT / 2 - rightPaddle.height / 2;
    }

    const diff = targetY - rightPaddle.y;
    const maxMove = rightPaddle.maxSpeed;
    if (Math.abs(diff) > maxMove) {
      rightPaddle.y += Math.sign(diff) * maxMove;
    } else {
      rightPaddle.y += diff;
    }
    rightPaddle.y = clamp(rightPaddle.y, 0, HEIGHT - rightPaddle.height);

    // Ball movement
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall collision: top / bottom
    if ((ball.y - ball.radius) <= 0) {
      ball.y = ball.radius;
      ball.vy = -ball.vy;
    } else if ((ball.y + ball.radius) >= HEIGHT) {
      ball.y = HEIGHT - ball.radius;
      ball.vy = -ball.vy;
    }

    // Paddle collisions: add spin based on where it hits the paddle
    if (ball.vx < 0 && paddleCollision(leftPaddle)) {
      // reflect
      ball.x = leftPaddle.x + leftPaddle.width + ball.radius; // prevent sticking
      reflectFromPaddle(leftPaddle);
    } else if (ball.vx > 0 && paddleCollision(rightPaddle)) {
      ball.x = rightPaddle.x - ball.radius; // prevent sticking
      reflectFromPaddle(rightPaddle);
    }

    // Score check: ball leaves left or right bounds
    if (ball.x < -ball.radius) {
      // point to computer
      computerScore++;
      updateScoreboard();
      if (computerScore >= WIN_SCORE) {
        endGame(false);
      } else {
        resetBall(1);
      }
    } else if (ball.x > WIDTH + ball.radius) {
      // point to player
      playerScore++;
      updateScoreboard();
      if (playerScore >= WIN_SCORE) {
        endGame(true);
      } else {
        resetBall(-1);
      }
    }
  }

  // When ball hits a paddle, reflect with angle based on hit position
  function reflectFromPaddle(paddle) {
    // Calculate relative intersect: -1 (top) to 1 (bottom)
    const relativeY = (ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
    // Max bounce angle = 60 degrees
    const maxAngle = (60 * Math.PI) / 180;
    const angle = relativeY * maxAngle;

    const speedIncrease = 0.8; // larger increase for faster play
    const currentSpeed = Math.hypot(ball.vx, ball.vy) + speedIncrease;

    // Determine direction (ball should go away from paddle)
    const dir = paddle === leftPaddle ? 1 : -1;
    ball.vx = dir * currentSpeed * Math.cos(angle);
    ball.vy = currentSpeed * Math.sin(angle);

    // Enforce a higher minimum horizontal speed so the ball stays "fast"
    const minHorizontal = 2.5;
    if (Math.abs(ball.vx) < minHorizontal) {
      ball.vx = dir * minHorizontal;
    }
  }

  // Game loop
  function loop() {
    update();
    draw();
    if (!gameOver) requestAnimationFrame(loop);
  }

  // End game display
  function endGame(playerWon) {
    gameOver = true;
    paused = true;
    messageEl.classList.remove('hidden');
    messageEl.textContent = playerWon ? 'You win! Refresh the page to play again.' : 'Computer wins. Refresh to try again.';
  }

  // Input handlers
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      keys[e.code] = true;
      e.preventDefault();
    } else if (e.code === 'Space') {
      paused = !paused;
      if (!paused && !gameOver) {
        // resume loop
        requestAnimationFrame(loop);
      }
      messageEl.classList.toggle('hidden', !paused);
      messageEl.textContent = paused ? 'Paused' : '';
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      keys[e.code] = false;
      e.preventDefault();
    }
  });

  // Mouse control over canvas
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    // get y relative to canvas coordinate
    const scaleY = canvas.height / rect.height;
    const mouseY = (e.clientY - rect.top) * scaleY;
    leftPaddle.y = clamp(mouseY - leftPaddle.height / 2, 0, HEIGHT - leftPaddle.height);
  });

  // Touch control for mobile
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleY = canvas.height / rect.height;
    const touchY = (touch.clientY - rect.top) * scaleY;
    leftPaddle.y = clamp(touchY - leftPaddle.height / 2, 0, HEIGHT - leftPaddle.height);
  }, { passive: false });

  // Prevent text selection during fast keypresses / dragging
  canvas.addEventListener('mousedown', (e) => e.preventDefault());

  // Kick off game
  resetBall();
  updateScoreboard();
  requestAnimationFrame(loop);

  // Expose start/reset via console for quick testing (optional)
  window.__pong = {
    resetBall,
    start
  };
})();