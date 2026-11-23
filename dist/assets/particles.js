(() => {
  const canvas = document.querySelector('#pointer-particles');
  const context = canvas.getContext('2d');
  if (!context) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const particles = [];
  const sides = [3, 4, 6];
  const palettes = {
    dark: ['195,172,251', '146,199,193', '189,194,239'],
    light: ['108,77,157', '54,118,112', '80,103,154']
  };
  const circle = Math.PI * 2;
  let frame = 0;
  let lastPoint = null;
  let lastEmission = -Infinity;

  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * ratio);
    canvas.height = Math.round(innerHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    particles.length = 0;
    lastPoint = null;
    lastEmission = -Infinity;
    context.clearRect(0, 0, innerWidth, innerHeight);
  }

  function draw(now) {
    context.clearRect(0, 0, innerWidth, innerHeight);
    const colors = palettes[document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'];
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const age = Math.max(0, (now - p.born) / p.life);
      if (age >= 1) { particles.splice(i, 1); continue; }
      const travel = 1 - (1 - age) ** 2;
      const x = p.x + Math.cos(p.angle) * p.distance * travel;
      const y = p.y + Math.sin(p.angle) * p.distance * travel - 8 * age;
      const radius = p.radius * (0.55 + 0.85 * travel);
      const rotation = p.phase + p.spin * age;
      const opacity = Math.min(1, age * 14) * (1 - age) ** 1.35;
      const rgb = colors[p.color];
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.scale(1, 0.82 + 0.16 * Math.cos(p.phase + age * 3));
      context.beginPath();
      for (let j = 0; j < p.sides; j++) {
        const a = circle * j / p.sides;
        const vx = radius * Math.cos(a), vy = radius * Math.sin(a);
        if (j === 0) context.moveTo(vx, vy); else context.lineTo(vx, vy);
      }
      context.closePath();
      context.fillStyle = 'rgba(' + rgb + ',' + 0.13 * opacity + ')';
      context.strokeStyle = 'rgba(' + rgb + ',' + 0.70 * opacity + ')';
      context.lineWidth = 1;
      context.fill();
      context.stroke();
      if (p.sides === 6) {
        context.beginPath();
        for (let j = 0; j < 3; j++) {
          const a = circle * j / 3;
          context.moveTo(0, 0);
          context.lineTo(radius * Math.cos(a), radius * Math.sin(a));
        }
        context.stroke();
      }
      context.restore();
    }
    frame = particles.length ? requestAnimationFrame(draw) : 0;
  }

  function emit(x, y, burst) {
    const count = burst ? 7 : 2;
    const phase = Math.random() * circle;
    const born = performance.now();
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y, born, angle: phase + circle * i / count + Math.random() * 0.25,
        sides: sides[Math.floor(Math.random() * sides.length)],
        radius: (burst ? 4 : 2.5) + Math.random() * 4,
        distance: (burst ? 26 : 12) + Math.random() * (burst ? 34 : 23),
        life: 500 + Math.random() * 380, phase: Math.random() * circle,
        spin: (Math.random() - 0.5) * 2.7, color: Math.floor(Math.random() * 3)
      });
    }
    if (particles.length > 64) particles.splice(0, particles.length - 64);
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function enabled(e) {
    return !motion.matches && !document.hidden && (e.pointerType === 'mouse' || e.pointerType === 'pen');
  }
  document.addEventListener('pointermove', e => {
    if (!enabled(e) || !hover.matches || e.buttons) return;
    const now = performance.now();
    if (now - lastEmission < 38) return;
    if (lastPoint && Math.hypot(e.clientX - lastPoint.x, e.clientY - lastPoint.y) < 8) return;
    lastPoint = {x:e.clientX, y:e.clientY};
    lastEmission = now;
    emit(e.clientX, e.clientY, false);
  }, {passive:true});
  document.addEventListener('pointerdown', e => {
    if (enabled(e) && e.button === 0) emit(e.clientX, e.clientY, true);
  }, {passive:true});
  motion.addEventListener('change', reset);
  document.addEventListener('visibilitychange', reset);
  addEventListener('pagehide', reset);
  addEventListener('resize', resize);
  resize();
})();
