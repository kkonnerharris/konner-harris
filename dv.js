(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PINK = '#f06aa5';

  $$('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));

  // header clock in Central time, plus current temperature from Open-Meteo (no key, no cookies)
  const clock = $('[data-clock]');
  let temp = '';
  const tick = () => {
    const t = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Chicago', timeZoneName: 'short' }).format(new Date());
    clock.textContent = t + (temp ? ` · ${temp}` : '');
  };
  tick(); setInterval(tick, 20000);
  fetch('https://api.open-meteo.com/v1/forecast?latitude=38.01&longitude=-89.24&current=temperature_2m&temperature_unit=fahrenheit')
    .then(r => r.ok ? r.json() : null)
    .then(d => { const v = d?.current?.temperature_2m; if (typeof v === 'number') { temp = `${Math.round(v)}ºF`; tick(); } })
    .catch(() => {});

  // header rule + back-to-top ring
  const top = $('[data-top]'), up = $('[data-up]'), prog = $('[data-prog]');
  const C = 2 * Math.PI * 26;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    top.classList.toggle('is-stuck', y > 20);
    up.classList.toggle('is-on', y > innerHeight * 0.6);
    prog.style.strokeDashoffset = C * (1 - Math.min(1, y / Math.max(1, max)));
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // blur-in reveal
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('[data-in]').forEach(el => io.observe(el));

  // open source: public PRs to Microsoft, Google and Netflix repos, straight from GitHub search.
  // Stays hidden until the first one exists.
  const oss = $('[data-oss]');
  if (oss) {
    // open = in review, merged = merged, closed without merging is skipped
    const q = encodeURIComponent('is:pr author:kkonnerharris org:microsoft org:google org:netflix');
    fetch(`https://api.github.com/search/issues?q=${q}&sort=created&order=desc&per_page=8`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        const prs = (d?.items || []).filter(i => i.state === 'open' || i.pull_request?.merged_at);
        if (!prs.length) return;
        oss.innerHTML = prs.map(i => {
          const repo = i.repository_url.split('/repos/')[1], merged = !!i.pull_request?.merged_at;
          return `<li><span class="oss__st${merged ? ' oss__st--merged' : ''}">${merged ? '✓ merged' : 'in review'}</span><a href="${i.html_url}" target="_blank" rel="noopener">${esc(repo)}: ${esc(i.title)}</a></li>`;
        }).join('');
        oss.hidden = false;
      })
      .catch(() => {});
  }

  // seamless loop for the places strip: a second copy for the eye, hidden from screen readers
  const drift = $('[data-drift]');
  if (drift) { const copy = drift.innerHTML.replace(/<li>/g, '<li aria-hidden="true">'); drift.innerHTML += copy; }

  // seamless loop for the stats stack
  const track = $('[data-stack] .stack__track');
  track.innerHTML += track.innerHTML;

  // Hero pong. The royal-blue ball is always bouncing around the hero; click anywhere in
  // the hero (or the pink name tag) and the tag becomes your paddle, following the
  // pointer. While playing, the ball bounces off the top and sides and the bottom is a
  // miss. Esc, or scrolling the hero out of view, ends the game.
  const tag = $('[data-tag]'), hero = $('#home');
  if (tag) {
    const label = tag.querySelector('[data-tag-label]'), hint = tag.querySelector('.tag-hint');
    const ball = $('[data-ball]'), board = $('[data-pong-score]');
    let x = 0, y = 0, tx = 0, ty = 0, playing = false, visible = true;
    let bx = 0, by = 0, vx = 0, vy = 0, live = false, score = 0, best = 0, last = 0;
    try { best = +localStorage.getItem('pong-best') || 0; } catch {}
    const R = 9, TOP = 90 + R; // keep the ball under the header
    const pick = () => {
      if (playing) return;
      const w = hero.clientWidth, h = hero.clientHeight;
      tx = w * (0.55 + Math.random() * 0.3); ty = h * (0.14 + Math.random() * 0.3);
    };
    pick(); x = tx; y = ty;
    if (!reduce) setInterval(pick, 2600);

    const show = msg => { board.textContent = msg ?? `pong · ${score}${best ? ` · best ${best}` : ''}`; };
    const serve = speed => {
      const w = hero.clientWidth;
      bx = w * (0.3 + Math.random() * 0.4); by = hero.clientHeight * 0.24;
      const a = (Math.random() * 0.8 + 0.6) * (Math.random() < 0.5 ? -1 : 1);
      vx = Math.sin(a) * speed; vy = Math.abs(Math.cos(a)) * speed + 1.2;
      live = true; ball.hidden = false;
    };
    const start = () => {
      if (playing) return;
      playing = true; score = 0; hero.classList.add('is-pong');
      label.textContent = 'Konner Harris'; hint.textContent = 'esc to stop';
      board.hidden = false; show(); serve(5);
    };
    const stop = () => {
      if (!playing) return;
      playing = false; board.hidden = true; hero.classList.remove('is-pong');
      label.textContent = 'Konner'; hint.textContent = '▸ click to play pong';
      pick();
      if (reduce) { live = false; ball.hidden = true; } else serve(2.6); // back to the idle drift
    };
    tag.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } });
    // any click in the hero starts a game, except on real links and buttons
    hero.addEventListener('click', e => { if (!e.target.closest('a, button')) start(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') stop(); });
    // the paddle follows the pointer (mouse or finger) while playing
    hero.addEventListener('pointermove', e => {
      if (!playing) return;
      const r = hero.getBoundingClientRect();
      tx = e.clientX - r.left - 18; ty = e.clientY - r.top - 24;
    });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (!visible) stop(); }, { threshold: 0.35 }).observe(hero);
    if (!reduce) serve(2.6); else ball.hidden = true; // idle: drift and bounce off every wall

    (function frame(now) {
      const dt = Math.min(2, last ? (now - last) / 16.67 : 1); last = now;
      if (visible) {
        const k = playing ? 0.35 : 0.025;
        x += (tx - x) * k; y += (ty - y) * k;
        tag.style.transform = `translate(${x}px,${y}px)`;
      }
      if (live && visible) {
        const w = hero.clientWidth, h = hero.clientHeight;
        bx += vx * dt; by += vy * dt;
        if (bx < R) { bx = R; vx = Math.abs(vx); }
        if (bx > w - R) { bx = w - R; vx = -Math.abs(vx); }
        if (by < TOP) { by = TOP; vy = Math.abs(vy); }
        if (playing) {
          // paddle = the pink label box
          const hr = hero.getBoundingClientRect(), pr = label.getBoundingClientRect();
          const px = pr.left - hr.left, py = pr.top - hr.top, pw = pr.width, ph = pr.height;
          if (bx + R > px && bx - R < px + pw && by + R > py && by - R < py + ph) {
            const fromTop = by < py + ph / 2;
            vy = (fromTop ? -1 : 1) * Math.min(Math.abs(vy) * 1.05, 14);
            vx = Math.max(-12, Math.min(12, vx * 1.03 + ((bx - (px + pw / 2)) / (pw / 2)) * 2.2)); // where you hit it steers it
            by = fromTop ? py - R : py + ph + R;
            score++; if (score > best) { best = score; try { localStorage.setItem('pong-best', best); } catch {} }
            show();
          }
          if (by > h + R * 2) {
            live = false; ball.hidden = true;
            show(`missed · ${score}${best ? ` · best ${best}` : ''}`); score = 0;
            setTimeout(() => { if (playing) { show(); serve(5); } }, 1100);
          }
        } else if (by > h - R - 60) { by = h - R - 60; vy = -Math.abs(vy); } // idle: stay above the places strip
        ball.style.transform = `translate(${bx - R}px,${by - R}px)`;
      }
      requestAnimationFrame(frame);
    })(0);
  }

  // drawing pad
  const pad = $('[data-draw]');
  if (pad) {
    const g = pad.getContext('2d');
    const fit = () => { const r = pad.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2); pad.width = r.width * d; pad.height = r.height * d; g.setTransform(d, 0, 0, d, 0, 0); g.lineCap = g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = PINK; };
    fit(); addEventListener('resize', fit);
    let down = false, lx = 0, ly = 0;
    const pos = e => { const r = pad.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    pad.addEventListener('pointerdown', e => { down = true; [lx, ly] = pos(e); pad.setPointerCapture(e.pointerId); });
    pad.addEventListener('pointermove', e => { if (!down) return; const [x, y] = pos(e); g.beginPath(); g.moveTo(lx, ly); g.lineTo(x, y); g.stroke(); lx = x; ly = y; });
    addEventListener('pointerup', () => (down = false));
    $('[data-clear]').addEventListener('click', () => g.clearRect(0, 0, pad.width, pad.height));
  }

  // terminal
  const term = $('[data-term]');
  if (term) {
    const lines = ['> konner --init', '', '✓ Verified 2,000+ switch ports.', '✓ Trained a federated CNN.', '✓ Wired LLMs into a robot dog.', '✓ Decoded EEG into arm moves.', '', 'Success! Engineer deployed.'];
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const render = (n, c) => {
      const done = lines.slice(0, n).map((l, i) => (i === 0 || i === 7 ? `<b>${esc(l)}</b>` : esc(l)));
      const cur = n < lines.length ? lines[n].slice(0, c) : '';
      term.innerHTML = done.join('\n') + (n < lines.length ? (n ? '\n' : '') + esc(cur) : '') + '<span class="caret"></span>';
    };
    if (reduce) render(lines.length, 0);
    else {
      let n = 0, c = 0;
      const step = () => {
        if (n >= lines.length) { render(n, 0); setTimeout(() => { n = 0; c = 0; step(); }, 4200); return; }
        if (c <= lines[n].length) { render(n, c); c++; setTimeout(step, n === 0 ? 70 : 22); }
        else { n++; c = 0; setTimeout(step, 260); }
      };
      new IntersectionObserver(([e], o) => { if (e.isIntersecting) { step(); o.disconnect(); } }).observe(term);
    }
  }

  // Space Apps countdown (event starts Nov 14, 2026)
  const count = $('[data-count]');
  if (count) {
    const start = new Date('2026-11-14T00:00:00-06:00'), end = new Date('2026-11-16T00:00:00-06:00');
    const upd = () => {
      const now = new Date(), d = start - now;
      if (now >= end) count.textContent = 'mission complete';
      else if (d <= 0) count.textContent = 'live now';
      else { const days = Math.floor(d / 864e5), hrs = Math.floor(d / 36e5) % 24; count.textContent = `T-minus ${days}d ${String(hrs).padStart(2, '0')}h`; }
    };
    upd(); setInterval(upd, 60000);
  }

  // dot map of where I've been: contiguous US from a coarse outline, arcs out from home.
  // solid pins = in person, hollow = virtual / online
  const map = $('[data-map]');
  if (map) {
    const US = [[-124.7,48.4],[-123,46],[-124,42],[-122,37.5],[-117.1,32.5],[-111,31.3],[-108.2,31.3],[-106.5,31.8],[-104.5,29.6],[-103,29],[-101.4,29.8],[-99.5,27.5],[-97.4,25.9],[-97.2,27.8],[-94,29.6],[-90,29.1],[-89,30.2],[-85.5,30],[-84,30.1],[-82.7,27.5],[-81.1,25.1],[-80.1,26.8],[-81.4,30.7],[-79,33.5],[-75.6,35.3],[-76,37],[-74,40.5],[-70,41.5],[-70.7,43],[-67,44.8],[-67.8,47.1],[-69.2,47.4],[-71.5,45],[-75,45],[-79,43.3],[-83,42],[-82.5,45.3],[-84.6,46.5],[-88,48.2],[-95.2,49],[-123,49]];
    const inside = (x, y) => { let c = false; for (let i = 0, j = US.length - 1; i < US.length; j = i++) { const [xi, yi] = US[i], [xj, yj] = US[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const HOME = { key: 'carbondale', ll: [-89.22, 37.73], name: 'Carbondale, IL', sub: 'home · SIU', dx: -12, dy: 16, align: 'right' };
    const PLACES = [
      { key: 'carterville', ll: [-88.72, 37.8] /* nudged east of its true spot (-89.08) so the pin clears Carbondale's */, name: 'Carterville, IL', sub: '', dx: 12, dy: 10, align: 'left' },
      { key: 'stl', ll: [-90.2, 38.63], name: '', sub: '' },
      { key: 'chicago', ll: [-87.63, 41.88], name: 'Chicago', sub: 'Google · ACC labs', dx: 10, dy: -8, align: 'left' },
      { key: 'phoenix', ll: [-112.07, 33.45], name: 'Phoenix', sub: 'Game jam · Hacks for Humanity', dx: 0, dy: 16, align: 'center' },
      { key: 'kc', ll: [-94.58, 39.1], name: 'Kansas City', sub: 'Tech for good meetup', dx: -10, dy: -14, align: 'right' },
      { key: 'chapelhill', ll: [-79.06, 35.91], name: 'Chapel Hill', sub: 'AI for small business', v: true, dx: 10, dy: -6, align: 'left' },
      { key: 'atlanta', ll: [-84.39, 33.75], name: 'Atlanta', sub: 'Georgia Tech · online', v: true, dx: -10, dy: 18, align: 'right' },
      { key: 'broward', ll: [-80.25, 26.12], name: 'Broward County', sub: 'Agents with Google', v: true, dx: -12, dy: -4, align: 'right' },
    ];
    // hovering an event row lights up its pin
    let hot = null;
    $$('[data-pin]').forEach(row => {
      const on = () => (hot = row.dataset.pin), off = () => (hot = null);
      row.addEventListener('mouseenter', on); row.addEventListener('mouseleave', off);
      row.addEventListener('focusin', on); row.addEventListener('focusout', off);
    });
    const g = map.getContext('2d');
    let W, H, dots = [];
    const proj = ([lo, la]) => { const s = Math.min(W / 59, (H - 30) / (25 * 1.18)); return [W / 2 + (lo + 96.3) * s, H / 2 - 4 - (la - 37.1) * s * 1.18]; };
    const fit = () => {
      const r = map.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2); W = r.width; H = r.height; map.width = W * d; map.height = H * d; g.setTransform(d, 0, 0, d, 0, 0);
      dots = [];
      const step = W < 500 ? 1.5 : 0.95;
      for (let lo = -125; lo <= -66; lo += step) for (let la = 24.6; la <= 49.5; la += step * 0.85) if (inside(lo, la)) dots.push(proj([lo, la]));
    };
    const small = () => W < 520;
    let t0 = performance.now(), inView = false;
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !inView) { inView = true; t0 = performance.now(); } }).observe(map);
    const label = (p, x, y) => {
      if (!p.name) return;
      const fs = small() ? 9.5 : 12;
      g.textAlign = p.align; g.textBaseline = 'middle';
      g.font = `500 ${fs}px "Inter Tight", sans-serif`; g.fillStyle = '#e8e8e8';
      g.fillText(p.name, x + p.dx, y + p.dy);
      if (p.sub && !small()) { g.font = `400 ${fs - 2}px "JetBrains Mono", monospace`; g.fillStyle = '#7d7d7d'; g.fillText(p.sub, x + p.dx, y + p.dy + fs + 1); }
    };
    const draw = now => {
      g.clearRect(0, 0, W, H);
      const ds = small() ? 1.4 : 1.8;
      g.fillStyle = '#3d3d3d';
      for (const [x, y] of dots) g.fillRect(x - ds / 2, y - ds / 2, ds, ds);
      const [hx, hy] = proj(HOME.ll);
      const el = inView ? (reduce ? 1e9 : now - t0) : 0;
      PLACES.forEach((p, i) => {
        const [x, y] = proj(p.ll);
        const k = Math.max(0, Math.min(1, (el - i * 260) / 900));
        if (k <= 0) return;
        const mx = (hx + x) / 2, my = Math.min(hy, y) - Math.hypot(x - hx, y - hy) * 0.28;
        g.strokeStyle = p.v ? '#f06aa566' : '#f06aa5aa'; g.lineWidth = 1.2; g.setLineDash(p.v ? [2, 4] : [4, 4]);
        g.beginPath();
        for (let j = 0; j <= 48 * k; j++) { const t = j / 48, bx = (1 - t) ** 2 * hx + 2 * (1 - t) * t * mx + t * t * x, by = (1 - t) ** 2 * hy + 2 * (1 - t) * t * my + t * t * y; j ? g.lineTo(bx, by) : g.moveTo(bx, by); }
        g.stroke(); g.setLineDash([]);
        if (k < 1) return;
        const s = small() ? 4 : 5;
        if (p.v) { g.strokeStyle = PINK; g.lineWidth = 1.5; g.strokeRect(x - s, y - s, s * 2, s * 2); }
        else { g.fillStyle = PINK; g.fillRect(x - s, y - s, s * 2, s * 2); }
        if (hot === p.key) { const r = s + 6 + Math.sin(now / 160) * 2; g.strokeStyle = PINK; g.lineWidth = 1.5; g.strokeRect(x - r, y - r, r * 2, r * 2); }
        label(p, x, y);
      });
      // home: pulsing pink square
      const pulse = reduce ? 0 : (now / 1400) % 1;
      g.strokeStyle = `rgba(240,106,165,${0.5 * (1 - pulse)})`; g.lineWidth = 1.2;
      const ps = 7 + pulse * 12; g.strokeRect(hx - ps, hy - ps, ps * 2, ps * 2);
      g.fillStyle = PINK; g.fillRect(hx - 6, hy - 6, 12, 12);
      if (hot === HOME.key) { const r = 12 + Math.sin(now / 160) * 2; g.strokeStyle = PINK; g.lineWidth = 1.5; g.strokeRect(hx - r, hy - r, r * 2, r * 2); }
      label(HOME, hx, hy);
      requestAnimationFrame(draw);
    };
    fit(); addEventListener('resize', fit); requestAnimationFrame(draw);
    document.fonts?.ready.then(fit);
  }

  // faint drifting stars behind the page
  const sky = $('[data-sky]');
  if (sky) {
    const g = sky.getContext('2d');
    let W, H, stars = [];
    const fit = () => {
      const d = Math.min(devicePixelRatio, 2); W = innerWidth; H = innerHeight; sky.width = W * d; sky.height = H * d; g.setTransform(d, 0, 0, d, 0, 0);
      stars = Array.from({ length: Math.round(W * H / 9000) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 0.9 + 0.2, a: Math.random() * 0.5 + 0.1, v: Math.random() * 0.12 + 0.02 }));
    };
    const draw = () => {
      g.clearRect(0, 0, W, H);
      for (const s of stars) { s.y -= s.v; if (s.y < -2) { s.y = H + 2; s.x = Math.random() * W; } g.globalAlpha = s.a; g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill(); }
      g.globalAlpha = 1;
      if (!reduce) requestAnimationFrame(draw);
    };
    fit(); addEventListener('resize', fit); draw();
  }
})();
