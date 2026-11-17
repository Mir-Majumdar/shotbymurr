(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- cursor trail
  const hero = document.querySelector('.hero');
  const srcs = window.TRAIL || [];
  srcs.forEach(s => { const i = new Image(); i.src = s; });
  let n = 0, lx = -999, ly = -999; const live = [];
  function drop(x, y) {
    if (Math.hypot(x - lx, y - ly) < 95) return;
    lx = x; ly = y;
    const i = n++, w = 84 + (i * 37) % 44;
    const im = document.createElement('img');
    im.className = 'tr'; im.src = srcs[i % srcs.length]; im.alt = '';
    im.style.cssText = `left:${x - w / 2}px;top:${y - w / 3}px;width:${w}px;rotate:${(i * 53) % 9 - 4}deg`;
    hero.appendChild(im); live.push(im);
    while (live.length > 6) { const o = live.shift(); o.classList.add('out'); setTimeout(() => o.remove(), 650); }
  }
  hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); drop(e.clientX - r.left, e.clientY - r.top); });
  // idle demo so the hero isn't empty before the mouse moves (and on touch)
  let demo = 0, moved = false;
  hero.addEventListener('pointermove', () => moved = true, { once: true });
  const demoT = setInterval(() => {
    if (moved || reduce) return clearInterval(demoT);
    const r = hero.getBoundingClientRect(); demo += 1;
    drop(r.width * (0.12 + 0.05 * demo % 0.55) + Math.sin(demo) * 30, r.height * 0.3 + Math.cos(demo * 0.8) * 50);
    if (demo > 40) demo = 0;
  }, 260);

  // ---------- stills walk-in
  const walk = document.querySelector('.walk');
  const dolly = document.querySelector('.dolly');
  const figs = [...document.querySelectorAll('.d')];
  const pops = figs.filter(f => f.classList.contains('pop'));
  const pl = document.getElementById('pl'), cnt = document.getElementById('cnt');
  const scale = () => Math.min(1, innerWidth / 1440);
  function frame() {
    const r = walk.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
    const cam = -60 + p * 1450;
    const s = scale();
    let best = null, bd = 1e9;
    figs.forEach(f => {
      const z = +f.dataset.z + cam;
      const past = z > 520;
      f.style.opacity = past ? Math.max(0, 1 - (z - 520) / 160) : '';
      f.style.filter = Math.abs(z - 300) > 900 ? 'blur(3px)' : '';
      f.style.pointerEvents = past ? 'none' : '';
      const dz = Math.abs(z - 300); if (!f.classList.contains('pop') && dz < bd && !past) { bd = dz; best = f; }
    });
    pops.forEach(f => f.classList.toggle('on', p >= +f.dataset.at));
    dolly.style.transform = `translateZ(${cam}px) scale(${s})`;
    if (best) { const a = best.querySelector('img').getAttribute('src').split('/').pop().replace('.jpg', ''); pl.textContent = 'IMG_' + a.replace(/^\D+/, ''); }
    cnt.textContent = String(Math.round(p * 56) + 1).padStart(2, '0') + ' / 57';
  }
  figs.forEach(f => f.style.setProperty('--zz', f.dataset.z + 'px'));
  addEventListener('scroll', () => requestAnimationFrame(frame), { passive: true });
  addEventListener('resize', frame); frame();

  // ---------- gallery reveal
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.g').forEach(g => io.observe(g));

  // ---------- film loops: play only when visible
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
  }), { threshold: 0.2 });
  document.querySelectorAll('.film video').forEach(v => vio.observe(v));

  // ---------- lightbox
  const lb = document.getElementById('lb'), inner = lb.querySelector('.lbin');
  const imgs = [...document.querySelectorAll('img[data-full]')];
  let cur = -1;
  function show(i) {
    cur = (i + imgs.length) % imgs.length;
    inner.innerHTML = `<img src="${imgs[cur].dataset.full}" alt="${imgs[cur].alt}">`;
    lb.hidden = false; lb.querySelector('.lbp').hidden = lb.querySelector('.lbn').hidden = false;
  }
  function film(src) {
    inner.innerHTML = `<video src="${src}" controls autoplay playsinline></video>`;
    lb.hidden = false; cur = -1; lb.querySelector('.lbp').hidden = lb.querySelector('.lbn').hidden = true;
  }
  function close() {
    // stop the reel before removing it so its sound can't keep playing
    const v = inner.querySelector('video');
    if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
    lb.hidden = true; inner.innerHTML = '';
  }
  imgs.forEach((im, i) => im.addEventListener('click', () => show(i)));
  document.querySelectorAll('.film').forEach(b => b.addEventListener('click', () => film(b.dataset.full)));
  lb.querySelector('.lbx').onclick = close;
  lb.querySelector('.lbp').onclick = () => show(cur - 1);
  lb.querySelector('.lbn').onclick = () => show(cur + 1);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (cur >= 0 && e.key === 'ArrowRight') show(cur + 1);
    if (cur >= 0 && e.key === 'ArrowLeft') show(cur - 1);
  });
})();
