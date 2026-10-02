(() => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const byId = Object.fromEntries(window.PHOTOS.map(p => [p.id, p]));
  const ar = id => byId[id].w / byId[id].h;
  const sumAr = ids => ids.reduce((s, id) => s + ar(id), 0);
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------- headline ----------
  const title = $('.title');
  title.innerHTML = [['shot', ''], ['by', 'by'], ['murr', '']].map(([word, cls]) =>
    `<span class="word ${cls}">${[...word].map(c => `<span class="ch">${c}</span>`).join('')}</span>`
  ).join(' ');
  $$('.ch', title).forEach((el, i) => el.style.setProperty('--i', i));
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('ready')));
  if (fine && !reduce) {
    // letters lift like a ripple passing under them
    const chars = $$('.ch', title);
    title.addEventListener('pointermove', e => {
      chars.forEach(el => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2));
        el.style.setProperty('--lift', `${(-Math.max(0, 1 - d / 140) * 0.16).toFixed(3)}em`);
      });
    });
    title.addEventListener('pointerleave', () => chars.forEach(el => el.style.setProperty('--lift', '0em')));
  }

  // ---------- collage ----------
  // Each block is a strip of columns that all end flush. A column is one photo, a "card"
  // (a photo with a colour block attached to some of its sides), or a stack of justified rows.
  // Card sides are fractions of the photo: l / r of its width, t / b of its height.
  const CARDS = {
    fuego: { l: .42, color: '#2F5240', ink: '#F3EBDD', shape: 'circle', at: 'l' },
    gallery: { r: .46, color: '#D9963A', ink: '#1C1B18', shape: 'line-v', at: 'r' },
    sunrise: { r: .07, b: .2, color: '#C9573C', ink: '#F3EBDD', shape: 'half', at: 'b' },
    'aloha-01': { b: .34, color: '#34454D', ink: '#F3EBDD', shape: 'line-h', at: 'b' },
    windows: { t: .26, color: '#D88A7A', ink: '#1C1B18', shape: 'dot', at: 't' },
  };
  const BLOCKS = [
    { cols: ['fuego', [['headlamp', 'summit'], ['red-wall', 'field-2705']], 'gallery', 'sunrise'] },
    { cols: [
      [['boats', 'tan'], ['dinero-mata-cultura', 'umbrellas', 'aloha-06']],
      'aloha-01',
      [['tuktuk'], ['aloha-08', 'field-1640']],
      [['field-2771'], ['field-2916', 'field-2975']],
    ], gap: 1.6 },
    { cols: [
      [['textiles', 'cliffside', 'aloha-09'], ['aloha-02', 'field-2642']],
      [['harbor', 'aloha-07'], ['pink-hour', 'fruit-cart', 'aloha-03']],
      [['center-stage'], ['concrete-canopy', 'field-2769']],
    ], w: .97, align: 'l', gap: 1.6 },
    { cols: [
      [['offstage-memories', 'aloha-05'], ['archives-and-amber-light', 'dock', 'field-5496']],
      'windows',
      [['intermission', 'a-silent-house'], ['pocket-art', 'somewhere-backstage'], ['call-again', 'aloha-04']],
    ], w: .97, align: 'r', gap: 1.6 },
  ];
  const isStack = c => Array.isArray(c);
  const order = BLOCKS.flatMap(b => b.cols.flatMap(c => (isStack(c) ? c.flat() : [c])));
  const side = (id, k) => (CARDS[id] && CARDS[id][k]) || 0;
  const unitAr = id => (ar(id) * (1 + side(id, 'l') + side(id, 'r'))) / (1 + side(id, 't') + side(id, 'b'));

  // phones: cards get their own row, everything else pairs up while rows stay a decent height
  const MOBILE = [];
  let pending = [];
  for (const id of order) {
    if (CARDS[id]) { MOBILE.push({ cols: [id] }); continue; }
    if (pending.length && sumAr([...pending, id]) > 2.4) { MOBILE.push({ cols: pending }); pending = []; }
    pending.push(id);
  }
  if (pending.length) MOBILE.push({ cols: pending });

  const collage = $('#collage');
  const tiles = {};
  collage.innerHTML = order.map((id, n) => {
    const p = byId[id];
    const c = CARDS[id];
    const card = c ? ` card s-${c.shape}" style="--c:${c.color};--ink:${c.ink}` : '';
    return `<div class="tile${card}" data-i="${id}">${c ? '<i class="shape"></i>' : ''}<div class="lift"><img src="img/s/${id}.jpg" srcset="img/s/${id}.jpg 900w, img/l/${id}.jpg 2200w" sizes="25vw" alt="${[p.title, p.place].filter(Boolean).join(' — ')}" loading="${n < 10 ? 'eager' : 'lazy'}" decoding="async"></div></div>`;
  }).join('');
  $$('.tile', collage).forEach(el => { tiles[el.dataset.i] = el; });

  const px = v => `${v.toFixed(1)}px`;
  const box = (el, x, y, w, h) => { el.style.left = px(x); el.style.top = px(y); el.style.width = px(w); el.style.height = px(h); };

  // place the photo inside its card and drop the shape into the chosen colour panel
  function dressCard(id, w, h) {
    const c = CARDS[id];
    const el = tiles[id];
    const pw = w / (1 + side(id, 'l') + side(id, 'r'));
    const ph = h / (1 + side(id, 't') + side(id, 'b'));
    const pxl = side(id, 'l') * pw;
    const pyt = side(id, 't') * ph;
    box(el.lastChild, pxl, pyt, pw, ph);
    const [rx, ry, rw, rh] = {
      l: [0, 0, pxl, h], r: [pxl + pw, 0, w - pxl - pw, h],
      t: [0, 0, w, pyt], b: [0, pyt + ph, w, h - pyt - ph],
    }[c.at];
    const shape = el.firstChild;
    if (c.shape === 'circle') { const d = Math.min(rw, rh) * 0.56; box(shape, rx + (rw - d) / 2, ry + rh * 0.72 - d / 2, d, d); }
    if (c.shape === 'line-v') box(shape, rx + rw * 0.5, ry + rh * 0.14, 1.5, rh * 0.5);
    if (c.shape === 'line-h') box(shape, rx + rw * 0.06, ry + rh * 0.5, rw * 0.42, 1.5);
    if (c.shape === 'half') { const d = Math.min(rh * 1.5, rw * 0.3); box(shape, rx + rw - d - rw * 0.04, ry + rh - d / 2, d, d / 2); }
    if (c.shape === 'dot') { const d = rh * 0.44; box(shape, rx + rh * 0.3, ry + (rh - d) / 2, d, d); }
    return pw;
  }

  let lastW = 0;
  function layout(again) {
    const W = collage.clientWidth;
    lastW = W;
    const g = Math.round(Math.min(12, Math.max(6, W * 0.009)));
    const place = (id, x, y, w, h) => {
      box(tiles[id], x, y, w, h);
      const pw = CARDS[id] ? dressCard(id, w, h) : w;
      tiles[id].querySelector('img').sizes = `${Math.ceil(pw)}px`;
    };
    const row = (ids, x0, y0, width) => {
      const h = (width - g * (ids.length - 1)) / sumAr(ids);
      let x = x0;
      ids.forEach(id => { const w = ar(id) * h; place(id, x, y0, w, h); x += w + g; });
      return h;
    };
    // a column's width is linear in the block height: w = a·H + b
    const colCoef = c => {
      if (!isStack(c)) return [unitAr(c), 0];
      const S = c.map(sumAr);
      const A = S.reduce((s, v) => s + 1 / v, 0);
      const B = c.reduce((s, r, i) => s + (r.length - 1) / S[i], 0);
      return [1 / A, (g * B - g * (c.length - 1)) / A];
    };
    let y = 0;
    const mobile = W < 700;
    (mobile ? MOBILE : BLOCKS).forEach((b, bi) => {
      if (bi) y += g * (mobile ? 1 : b.gap || 1);
      const bw = W * (mobile ? 1 : b.w || 1);
      const x0 = b.align === 'l' ? 0 : b.align === 'r' ? W - bw : (W - bw) / 2;
      const coefs = b.cols.map(colCoef);
      const H = (bw - g * (b.cols.length - 1) - coefs.reduce((s, c) => s + c[1], 0)) / coefs.reduce((s, c) => s + c[0], 0);
      let x = x0;
      b.cols.forEach((c, i) => {
        const w = coefs[i][0] * H + coefs[i][1];
        if (isStack(c)) { let cy = y; c.forEach(r => { cy += row(r, x, cy, w) + g; }); } else place(c, x, y, w, H);
        x += w + g;
      });
      y += H;
    });
    collage.style.height = `${y}px`;
    // setting the height can add a scrollbar and narrow the page; lay out once more if so
    if (!again && collage.clientWidth !== W) layout(true);
  }
  layout();
  new ResizeObserver(() => { if (collage.clientWidth !== lastW) layout(); }).observe(collage);
  addEventListener('resize', () => { if (collage.clientWidth !== lastW) layout(); });

  // ---------- reveal ----------
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -5% 0px', threshold: 0.05 });
  Object.values(tiles).forEach(el => io.observe(el));

  // ---------- hover: tilt toward the cursor, dim the rest, warm the paper ----------
  Object.values(tiles).forEach(el => {
    const lift = el.lastChild;
    el.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse' || reduce) return;
      collage.classList.add('hovering');
      el.classList.add('on');
      document.body.style.setProperty('--tint', byId[el.dataset.i].tone);
    });
    el.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || reduce) return;
      const r = lift.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      lift.style.setProperty('--ry', `${((x - 0.5) * 7).toFixed(2)}deg`);
      lift.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
      lift.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      lift.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    });
    el.addEventListener('pointerleave', () => {
      collage.classList.remove('hovering');
      el.classList.remove('on');
      lift.style.removeProperty('--rx');
      lift.style.removeProperty('--ry');
      document.body.style.removeProperty('--tint');
    });
  });

  // ---------- pond: sketched lily pads ----------
  const pond = $('.pond');
  const PADS = [[5, 34, 74, -20], [93, 16, 56, 40], [90, 84, 84, 120], [11, 90, 48, 200], [70, 7, 40, 290], [48, 96, 60, 80]];
  pond.insertAdjacentHTML('beforeend', PADS.map(([x, y, size, rot], i) => `
    <svg class="pad" viewBox="-40 -40 80 80" width="${size}" height="${size}" style="left:${x}%;top:${y}%;margin:${-size / 2}px 0 0 ${-size / 2}px;animation-delay:${-i * 5}s">
      <g filter="url(#sketch)" transform="rotate(${rot})" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M0,0 L33.8,-9.1 A35,35 0 1 0 34.5,6.1 Z" fill="#7E9A6E" fill-opacity=".18"/>
        <path d="M0,0 L-24,-22 M0,0 L-31,6 M0,0 L-10,31 M0,0 L19,27 M0,0 L6,-33" fill="none" opacity=".35"/>
      </g>
    </svg>`).join(''));

  if (reduce) return;

  // ---------- ripples ----------
  const ripple = (x, y, size, soft) => {
    pond.insertAdjacentHTML('beforeend', `<svg class="ripple${soft ? ' soft' : ''}" width="${size}" height="${size}" viewBox="-50 -50 100 100" style="left:${x - size / 2}px;top:${y - size / 2}px"><circle r="48"/><circle r="34"/></svg>`);
    const el = pond.lastElementChild;
    setTimeout(() => el.remove(), 6000);
  };
  (function drip() {
    ripple(Math.random() * innerWidth, Math.random() * innerHeight, 90 + Math.random() * 90);
    setTimeout(drip, 5000 + Math.random() * 6000);
  })();
  document.addEventListener('click', e => {
    if (!e.target.closest('.tile, a')) ripple(e.clientX, e.clientY, 130);
  });

  // ---------- cursor: a ring that trails ripples across the water ----------
  if (fine) {
    const cur = $('.cur');
    document.documentElement.classList.add('has-cur');
    let mx = -100, my = -100, cx = -100, cy = -100, lastRx = 0, lastRy = 0, lastRt = 0;
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      const overTile = e.target.closest('.tile');
      cur.classList.toggle('big', !!overTile);
      cur.classList.toggle('link', !overTile && !!e.target.closest('a, .title'));
      const now = performance.now();
      if (!overTile && !e.target.closest('a') && Math.hypot(mx - lastRx, my - lastRy) > 70 && now - lastRt > 110) {
        ripple(mx, my, 54, true);
        lastRx = mx; lastRy = my; lastRt = now;
      }
    }, { passive: true });
    (function follow() {
      cx += (mx - cx) * 0.22;
      cy += (my - cy) * 0.22;
      cur.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
      requestAnimationFrame(follow);
    })();
  }

  // ---------- koi ----------
  // top-down koi drawn as a loose pen sketch, facing +x, centred in a 150×70 box.
  // Each variety gets its own markings.
  const RED = '#D2553A', GOLD = '#D9963A', INK = '#2B2A27';
  const BODY = 'M58,0 C58,-8 52,-13 40,-15 C22,-17 6,-15 -10,-11 C-24,-8 -34,-5 -42,-3 L-42,3 C-34,5 -24,8 -10,11 C6,15 22,17 40,15 C52,13 58,8 58,0 Z';
  const MARKS = {
    kohaku: `<path fill="${RED}" d="M51,-5 C47,-11 37,-10 35,-4 C34,3 44,6 51,-5 Z"/><path fill="${RED}" d="M21,-12 C11,-15 2,-9 6,-2 C11,4 23,-1 21,-12 Z"/><path fill="${RED}" d="M-7,4 C-15,11 -28,8 -26,1 C-23,-3 -12,-2 -7,4 Z"/>`,
    tancho: `<circle fill="${RED}" cx="42" cy="0" r="6.5"/>`,
    showa: `<path fill="${INK}" fill-opacity=".8" d="M48,-8 C42,-13 30,-6 34,0 C38,5 50,2 48,-8 Z"/><path fill="${RED}" d="M22,-13 C12,-15 6,-8 10,-1 C14,4 24,0 22,-13 Z"/><path fill="${INK}" fill-opacity=".8" d="M4,6 C-4,12 -18,10 -16,3 C-14,-2 -2,-2 4,6 Z"/><path fill="${RED}" d="M-20,-6 C-24,-11 -32,-9 -31,-3 C-28,0 -23,-1 -20,-6 Z"/>`,
    yamabuki: `<path fill="${GOLD}" fill-opacity=".7" d="${BODY}"/>`,
  };
  const koiSVG = kind => `
    <svg class="koi" viewBox="-75 -35 150 70" width="150" height="70">
      <g filter="url(#sketch)" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <g stroke="none" fill-opacity=".55">${MARKS[kind]}</g>
        <g>
          <animateTransform attributeName="transform" type="rotate" values="-14 -42 0;14 -42 0;-14 -42 0" dur="1.8s" repeatCount="indefinite"/>
          <path d="M-42,-3 C-52,-6 -60,-14 -71,-17 C-66,-8 -64,-3 -67,0 C-64,3 -66,8 -71,17 C-60,14 -52,6 -42,3"/>
          <path d="M-47,-2 C-54,-5 -59,-9 -65,-12 M-47,2 C-54,5 -59,9 -65,12" opacity=".4"/>
        </g>
        <g>
          <animateTransform attributeName="transform" type="rotate" values="0 32 -14;-20 32 -14;0 32 -14" dur="2.4s" repeatCount="indefinite"/>
          <path d="M35,-14 C33,-24 25,-31 17,-31 C13,-28 17,-21 26,-15"/>
        </g>
        <g>
          <animateTransform attributeName="transform" type="rotate" values="0 32 14;20 32 14;0 32 14" dur="2.4s" repeatCount="indefinite"/>
          <path d="M35,14 C33,24 25,31 17,31 C13,28 17,21 26,15"/>
        </g>
        <path d="M3,-13 C0,-20 -6,-23 -10,-22 C-8,-18 -4,-15 -1,-12 M3,13 C0,20 -6,23 -10,22 C-8,18 -4,15 -1,12" opacity=".75"/>
        <path d="M58,0 C58,-8 52,-13 40,-15 C22,-17 6,-15 -10,-11 C-24,-8 -34,-5 -42,-3 M58,0 C58,8 52,13 40,15 C22,17 6,15 -10,11 C-24,8 -34,5 -42,3"/>
        <path d="M56,-3 C54,-9 48,-12 40,-13.5 M20,15.5 C6,15 -8,12 -20,8" opacity=".35"/>
        <path d="M30,0 C14,1 -6,-1 -30,0" opacity=".3"/>
        <circle cx="48" cy="-8" r="1.1" fill="currentColor" stroke="none"/>
        <circle cx="48" cy="8" r="1.1" fill="currentColor" stroke="none"/>
        <path d="M58,-2.5 l5,-4 M58,2.5 l5,4" opacity=".5"/>
      </g>
    </svg>`;

  // a lazy S-curve that enters from one edge and leaves by another
  function newRoute() {
    const W = innerWidth, H = innerHeight, m = 220;
    let p0, p3;
    if (Math.random() < 0.65) {
      const ltr = Math.random() < 0.5;
      p0 = [ltr ? -m : W + m, rand(0.1, 0.9) * H];
      p3 = [ltr ? W + m : -m, rand(0.1, 0.9) * H];
    } else {
      const down = Math.random() < 0.5;
      p0 = [rand(0.1, 0.9) * W, down ? -m : H + m];
      p3 = [rand(0.1, 0.9) * W, down ? H + m : -m];
    }
    const p1 = [rand(0.05, 0.95) * W, rand(0.05, 0.95) * H];
    const p2 = [rand(0.05, 0.95) * W, rand(0.05, 0.95) * H];
    return `M${p0} C${p1} ${p2} ${p3}`;
  }

  const defs = $('.defs');
  const head = $('.head');
  const headPond = document.createElement('div');
  headPond.className = 'head-pond';
  head.prepend(headPond);

  // pond koi cross the whole window: [variety, size, seconds before first appearance]
  const SCHOOL = [
    ['kohaku', 1.3, 0.5], ['tancho', 0.8, 3], ['showa', 1.05, 6],
    ['yamabuki', 0.62, 9], ['kohaku', 0.9, 12], ['showa', 0.72, 15],
  ];
  // header koi never leave the headline area; they just keep wandering around it
  const HEADERS = [['tancho', 0.72], ['kohaku', 0.58], ['yamabuki', 0.5]];

  const makeFish = (kind, size, layer) => {
    layer.insertAdjacentHTML('beforeend', koiSVG(kind));
    const el = layer.lastElementChild;
    el.style.transformOrigin = '75px 35px';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    defs.appendChild(path);
    return { el, path, size, active: false, s: 0, len: 0, speed: 0, scale: size, phase: rand(0, 6) };
  };
  const fish = SCHOOL.map(([kind, size, wait]) => Object.assign(makeFish(kind, size, pond), { wait }));
  const headFish = HEADERS.map(([kind, size]) => Object.assign(makeFish(kind, size, headPond), { at: null, from: null }));

  // a wandering curve inside the header that picks up smoothly where the last one ended
  function headRoute(f) {
    const W = headPond.clientWidth, H = headPond.clientHeight;
    const pt = () => [rand(-0.04, 1.04) * W, rand(0.05, 0.95) * H];
    const p0 = f.at || pt();
    const dir = f.from ? [p0[0] - f.from[0], p0[1] - f.from[1]] : [rand(-1, 1), rand(-0.3, 0.3)];
    const n = Math.hypot(dir[0], dir[1]) || 1;
    const reach = rand(0.18, 0.32) * W;
    const p1 = [p0[0] + (dir[0] / n) * reach, p0[1] + (dir[1] / n) * reach * 0.4];
    const p2 = pt();
    const p3 = pt();
    f.at = p3; f.from = p2;
    return `M${p0} C${p1} ${p2} ${p3}`;
  }

  const steer = (f, now) => {
    const p = f.path.getPointAtLength(f.s);
    const q = f.path.getPointAtLength(Math.min(f.len, f.s + 2));
    const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI + Math.sin(now / 1000 * 3.4 + f.phase) * 4;
    f.el.style.transform = `translate(${(p.x - 75).toFixed(1)}px,${(p.y - 35).toFixed(1)}px) rotate(${angle.toFixed(1)}deg) scale(${f.scale.toFixed(2)})`;
  };

  let last = performance.now();
  function swim(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    for (const f of fish) {
      if (!f.active) {
        f.wait -= dt;
        if (f.wait > 0) continue;
        f.path.setAttribute('d', newRoute());
        f.len = f.path.getTotalLength();
        f.s = 0;
        f.scale = f.size * (innerWidth < 700 ? 0.7 : 1);
        f.speed = rand(36, 56) * (0.7 + f.scale * 0.3);
        f.active = true;
        f.el.classList.add('swim');
      }
      f.s += f.speed * dt;
      if (f.s >= f.len) {
        f.active = false;
        f.el.classList.remove('swim');
        f.wait = rand(2, 6);
        continue;
      }
      steer(f, now);
    }
    for (const f of headFish) {
      if (!f.active || f.s >= f.len) {
        f.path.setAttribute('d', headRoute(f));
        f.len = f.path.getTotalLength();
        f.s = 0;
        f.scale = f.size * (innerWidth < 700 ? 0.75 : 1);
        f.speed = rand(26, 40);
        f.active = true;
        f.el.classList.add('swim');
      }
      f.s += f.speed * dt;
      steer(f, now);
    }
    requestAnimationFrame(swim);
  }
  requestAnimationFrame(swim);
})();
