// 暖身結果頁的 3D 情境圖：p.10 一顆大鬧鐘；p.12 四格（咖啡、陽光、家人、寵物）
(() => {
  if (!window.THREE) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lin = (c) => new THREE.Color(c).convertSRGBToLinear();
  function grad(geo, top, bottom) {
    if (geo.index) geo = geo.toNonIndexed(); geo.computeBoundingBox();
    const { min, max } = geo.boundingBox, pos = geo.attributes.position, a = lin(top), b = lin(bottom), c = new THREE.Color(), out = [];
    for (let i = 0; i < pos.count; i++) { c.copy(b).lerp(a, (pos.getY(i) - min.y) / (max.y - min.y || 1)); out.push(c.r, c.g, c.b); }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(out, 3));
    return geo;
  }
  const solid = (opts = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.2, flatShading: true, ...opts });
  const flat = (c, opts = {}) => new THREE.MeshStandardMaterial({ color: lin(c), roughness: 0.6, flatShading: true, ...opts });
  const glow = (c, opacity = 1) => new THREE.MeshBasicMaterial({ color: lin(c), transparent: true, opacity });
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cy = (r1, r2, h, n = 16) => new THREE.CylinderGeometry(r1, r2, h, n);
  const cone = (r, h, n = 8) => new THREE.ConeGeometry(r, h, n);
  const outBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const clamp = (x) => Math.min(1, Math.max(0, x));
  const mesh = (geo, mat, [x, y, z] = [0, 0, 0], [rx, ry, rz] = [0, 0, 0], parent) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); if (parent) parent.add(m); return m;
  };
  function stage() {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xeef0ff, 0x6d4bd8, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 1.05); key.position.set(6, 10, 12); scene.add(key);
    const rim = new THREE.DirectionalLight(0xa855f7, 1.1); rim.position.set(-10, 4, -8); scene.add(rim);
    return scene;
  }
  function cloud(parent, [x, y, z], s) {
    const c = new THREE.Group(); c.position.set(x, y, z); c.scale.setScalar(s); parent.add(c);
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, transparent: true, opacity: 0.95 });
    [[0, 0, 0, 1], [0.95, -0.2, 0, 0.75], [-0.9, -0.25, 0.1, 0.7], [0.3, 0.45, -0.1, 0.6]].forEach(([px, py, pz, k]) => mesh(grad(new THREE.IcosahedronGeometry(0.8 * k), 0xffffff, 0xc7b8ff), m, [px, py, pz], undefined, c));
    return c;
  }
  // 鬧鐘：面朝 +z，底部在 y=0
  function alarmClock(r, colors, op = 1) {
    const g = new THREE.Group(), tr = op < 1 ? { transparent: true, opacity: op } : {};
    mesh(grad(cy(r, r, r * 0.55, 32).rotateX(Math.PI / 2), colors[0], colors[1]), solid(tr), [0, r * 1.25, 0], undefined, g);
    mesh(new THREE.CircleGeometry(r * 0.84, 40), glow(0xffffff, op), [0, r * 1.25, r * 0.28], undefined, g);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, l = i % 3 ? 0.08 : 0.16;
      mesh(box(r * 0.04, r * l, 0.01), flat(0x312e81, tr), [Math.sin(a) * r * 0.72, r * 1.25 + Math.cos(a) * r * 0.72, r * 0.29], [0, 0, -a], g);
    }
    const hand = (len, w, c, z) => { const p = new THREE.Group(); p.position.set(0, r * 1.25, z); g.add(p); mesh(box(w, len, 0.02), flat(c, tr), [0, len / 2 - r * 0.06, 0], undefined, p); return p; };
    const h = hand(r * 0.45, r * 0.07, 0x312e81, r * 0.3), m = hand(r * 0.66, r * 0.045, 0xef4444, r * 0.31);
    mesh(new THREE.SphereGeometry(r * 0.07, 10, 8), flat(0x312e81, tr), [0, r * 1.25, r * 0.32], undefined, g);
    const bells = [-1, 1].map((s) => mesh(grad(new THREE.SphereGeometry(r * 0.36, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xe0e7ff, 0xa5b4fc), solid(tr), [s * r * 0.55, r * 2.1, 0], [0, 0, -s * 0.6], g));
    mesh(box(r * 0.06, r * 0.3, r * 0.06), flat(0x312e81, tr), [0, r * 2.28, 0], undefined, g);
    mesh(box(r * 0.5, r * 0.06, r * 0.06), flat(0x312e81, tr), [0, r * 2.42, 0], undefined, g);
    [-1, 1].forEach((s) => mesh(cy(r * 0.05, r * 0.08, r * 0.45, 8), flat(0x312e81, tr), [s * r * 0.5, r * 0.2, 0], [0, 0, s * 0.45], g));
    g.userData = { h, m, bells };
    return g;
  }
  // 錶面：刻度＋時針分針，回傳 { h, m }
  function dial(g, r, y, z, tr, op, face = 0xffffff) {
    mesh(new THREE.CircleGeometry(r, 40), glow(face, op), [0, y, z], undefined, g);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, l = i % 3 ? 0.1 : 0.2;
      mesh(box(r * 0.05, r * l, 0.01), flat(0x312e81, tr), [Math.sin(a) * r * 0.86, y + Math.cos(a) * r * 0.86, z + 0.01], [0, 0, -a], g);
    }
    const hand = (len, w, c, dz) => { const p = new THREE.Group(); p.position.set(0, y, z + dz); g.add(p); mesh(box(w, len, 0.02), flat(c, tr), [0, len / 2 - r * 0.07, 0], undefined, p); return p; };
    const h = hand(r * 0.52, r * 0.08, 0x312e81, 0.02), m = hand(r * 0.78, r * 0.055, 0xef4444, 0.03);
    h.rotation.z = -1.2;
    mesh(new THREE.SphereGeometry(r * 0.08, 10, 8), flat(0x312e81, tr), [0, y, z + 0.04], undefined, g);
    return { h, m };
  }
  // 七段顯示數字
  const SEG = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 7: "abc" };
  function digits(g, str, [x0, y, z], s, color, op) {
    const mat = glow(color, op), out = [];
    let x = x0;
    for (const ch of str) {
      if (ch === ":") { const c = new THREE.Group(); c.position.set(x + s * 0.15, y, z); g.add(c); [0.35, -0.35].forEach((dy) => mesh(box(s * 0.14, s * 0.14, 0.02), mat, [0, dy * s, 0], undefined, c)); out.push(c); x += s * 0.5; continue; }
      const P = { a: [0, 1, 1], b: [0.5, 0.5, 0], c: [0.5, -0.5, 0], d: [0, -1, 1], e: [-0.5, -0.5, 0], f: [-0.5, 0.5, 0], g: [0, 0, 1] };
      for (const k of SEG[ch]) { const [dx, dy, hz] = P[k]; mesh(hz ? box(s * 0.8, s * 0.13, 0.02) : box(s * 0.13, s * 0.8, 0.02), mat, [x + s * 0.5 + dx * s, y + dy * s * 0.9, z], undefined, g); }
      x += s * 1.35;
    }
    return out;
  }
  // 各種造型的鬧鐘（面朝 +z，底部在 y=0）
  // 圓角方塊（面朝 +z，置中）
  function rbox(w, h, d, rad) {
    const sh = new THREE.Shape(), x = -w / 2, y = -h / 2;
    sh.moveTo(x + rad, y); sh.lineTo(x + w - rad, y); sh.quadraticCurveTo(x + w, y, x + w, y + rad); sh.lineTo(x + w, y + h - rad);
    sh.quadraticCurveTo(x + w, y + h, x + w - rad, y + h); sh.lineTo(x + rad, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - rad);
    sh.lineTo(x, y + rad); sh.quadraticCurveTo(x, y, x + rad, y);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: d * 0.12, bevelSize: rad * 0.25, bevelSegments: 3, curveSegments: 10 });
    geo.center(); return geo;
  }
  const navy = 0x312e81;
  // 市面上常見的鬧鐘（面朝 +z，底部在 y=0）
  const SHAPES = {
    // 傳統雙鈴鬧鐘
    twin: (r, c, op) => alarmClock(r, c, op),
    // 方形旅行鬧鐘：圓角方塊、方形白面板、頂上一條貪睡鍵、後面一支腳架
    square: (r, c, op) => {
      const g = new THREE.Group(), tr = op < 1 ? { transparent: true, opacity: op } : {}, b = new THREE.Group();
      b.position.y = r * 1.1; b.rotation.x = -0.12; g.add(b);
      mesh(grad(rbox(r * 2.1, r * 2.1, r * 0.55, r * 0.42), c[0], c[1]), solid(tr), [0, 0, 0], undefined, b);
      mesh(new THREE.ShapeGeometry(new THREE.Shape().absarc(0, 0, 1, 0, Math.PI * 2)).scale(r * 0.9, r * 0.9, 1), glow(0xffffff, op), [0, 0, r * 0.36], undefined, b);
      const d = dial(b, r * 0.86, 0, r * 0.37, tr, op);
      const snooze = mesh(grad(rbox(r * 1.1, r * 0.16, r * 0.3, r * 0.07), 0xffffff, c[0]), solid(tr), [0, r * 1.13, 0], undefined, b);
      mesh(box(r * 0.5, r * 0.08, r * 1.0), flat(navy, tr), [0, r * 0.04, -r * 0.35], [0, 0, 0], g);
      g.userData = { ...d, bells: [snooze] };
      return g;
    },
    // 圓形桌鐘：厚圓身＋金屬外框、頂上按鈕、底座
    round: (r, c, op) => {
      const g = new THREE.Group(), tr = op < 1 ? { transparent: true, opacity: op } : {};
      mesh(grad(cy(r, r, r * 0.6, 40).rotateX(Math.PI / 2), c[0], c[1]), solid({ ...tr, flatShading: false }), [0, r * 1.2, 0], undefined, g);
      mesh(new THREE.TorusGeometry(r * 0.93, r * 0.08, 10, 48), new THREE.MeshStandardMaterial({ color: lin(0xf1f5f9), metalness: 0.7, roughness: 0.25, ...tr }), [0, r * 1.2, r * 0.3], undefined, g);
      const d = dial(g, r * 0.86, r * 1.2, r * 0.31, tr, op, 0xfffbeb);
      const btn = mesh(grad(cy(r * 0.16, r * 0.2, r * 0.22, 16), 0xfde68a, 0xf59e0b), solid(tr), [0, r * 2.28, 0], undefined, g);
      mesh(grad(cy(r * 0.75, r * 0.85, r * 0.16, 32).scale(1, 1, 0.55), c[1], c[1]), solid(tr), [0, r * 0.08, 0], undefined, g);
      g.userData = { ...d, bells: [btn] };
      return g;
    },
    // 電子鬧鐘：圓角長方體、黑色螢幕發光數字、頂上貪睡鍵
    digital: (r, c, op) => {
      const g = new THREE.Group(), tr = op < 1 ? { transparent: true, opacity: op } : {}, b = new THREE.Group();
      b.position.y = r * 0.78; b.rotation.x = -0.1; g.add(b);
      mesh(grad(rbox(r * 3, r * 1.45, r * 1.0, r * 0.3), c[0], c[1]), solid(tr), [0, 0, 0], undefined, b);
      mesh(new THREE.PlaneGeometry(r * 2.5, r * 0.95), flat(0x1e1b4b, tr), [0, 0, r * 0.64], undefined, b);
      const colon = digits(b, "7:00", [-r * 1.1, 0, r * 0.66], r * 0.4, 0x22d3ee, op);
      mesh(new THREE.CircleGeometry(r * 0.05, 10), glow(0xf472b6, op), [-r * 1.08, r * 0.3, r * 0.66], undefined, b);
      const snooze = mesh(grad(rbox(r * 1.2, r * 0.14, r * 0.45, r * 0.06), 0xffffff, 0xf472b6), solid(tr), [0, r * 0.82, 0], undefined, b);
      g.userData = { colon, bells: [snooze] };
      return g;
    },
  };
  function villager(s, shirt) {
    const v = new THREE.Group(); v.scale.setScalar(s);
    [[cy(0.13, 0.19, 0.38, 8), flat(shirt), 0.19], [new THREE.IcosahedronGeometry(0.14, 1), flat(0xf3c9a5), 0.5],
      [cone(0.16, 0.62, 8), flat(0xef4444), 0.88], [new THREE.SphereGeometry(0.05, 8, 6), glow(0xfde68a), 1.2]]
      .forEach(([geo, m, y]) => mesh(geo, m, [0, y, 0], undefined, v));
    return v;
  }
  function heart(size, color) {
    const s = new THREE.Shape(); s.moveTo(0, -1);
    s.bezierCurveTo(-0.2, -0.7, -1.2, -0.3, -1.2, 0.35); s.bezierCurveTo(-1.2, 1, -0.4, 1.2, 0, 0.6);
    s.bezierCurveTo(0.4, 1.2, 1.2, 1, 1.2, 0.35); s.bezierCurveTo(1.2, -0.3, 0.2, -0.7, 0, -1);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 2 });
    geo.center(); geo.scale(size, size, size);
    return new THREE.Mesh(geo, flat(color, { roughness: 0.35 }));
  }
  function dust(parent, n, spread) {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * spread[0], (Math.random() - 0.5) * spread[1], (Math.random() - 0.5) * spread[2]], i * 3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: lin(0xa78bfa), size: 0.08, transparent: true, opacity: 0.7 }));
    parent.add(p); return p;
  }

  // 依投影片 active 狀態跑動畫
  function run(slide, canvas, setup) {
    const W = +canvas.width, H = +canvas.height;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setScissorTest(true);
    const draw = setup(W, H);
    let t0 = 0, raf = 0;
    function frame(now) {
      const t = reduce ? 30 : (now - t0) / 1000;
      renderer.setClearColor(0x000000, 0); renderer.setViewport(0, 0, W, H); renderer.setScissor(0, 0, W, H); renderer.clear();
      draw(renderer, t);
      raf = slide.classList.contains("active") && !reduce ? requestAnimationFrame(frame) : 0;
    }
    const play = () => { cancelAnimationFrame(raf); t0 = performance.now(); raf = requestAnimationFrame(frame); };
    new MutationObserver(() => { if (slide.classList.contains("active") && !raf) play(); }).observe(slide, { attributes: true, attributeFilter: ["class"] });
    if (slide.classList.contains("active")) play(); else { t0 = performance.now() - 30000; frame(performance.now()); }
  }

  // p.10：一顆大鬧鐘在響，後面飄著長得差不多的小鬧鐘
  const p10 = document.querySelector('#stage .slide[data-scene="clock"] canvas.scene3d');
  if (p10) run(p10.closest(".slide"), p10, (W, H) => {
    const scene = stage(), cam = new THREE.PerspectiveCamera(28, W / H, 0.1, 100);
    cam.position.set(0, 1.2, 22); cam.lookAt(0, 0.6, 0);
    const big = alarmClock(2.6, [0x8b5cf6, 0x2563eb]); big.position.set(4.6, -3.4, 0); big.rotation.y = -0.32; scene.add(big);
    const rings = [-1, 1].map((s) => { const m = mesh(new THREE.TorusGeometry(1.1, 0.07, 6, 24, Math.PI * 0.6), glow(0xfbbf24, 0), [s * 2.2, 2.6, 0.3], [0, 0, s > 0 ? -0.3 : Math.PI - 1.6], big); return m; });
    // 各種造型的鬧鐘散在四周
    const ghosts = [
      ["square", -6.6, 2.4, -6, 1.1, 0.45, [0x93c5fd, 0x4f46e5]],
      ["digital", -1.2, 4.4, -9, 0.95, 0.15, [0xf5f3ff, 0xc4b5fd]],
      ["round", -11.4, 1.8, -9, 1.0, 0.35, [0xf9a8d4, 0xa855f7]],
      ["twin", 10.4, 2.0, -8, 0.8, -0.5, [0xfecaca, 0xef4444]],
      ["round", 0.9, -3.2, -4, 0.65, -0.35, [0xa5f3fc, 0x3b82f6]],
      ["square", -2.6, -0.4, -12, 0.75, 0.4, [0xfde68a, 0xf59e0b]],
    ].map(([type, x, y, z, s, ry, col], i) => {
      const c = SHAPES[type](s * 1.6, col, 0.92); c.position.set(x, y, z); c.rotation.y = ry; c.userData.base = y; scene.add(c); return c;
    });
    [[-8, 5.4, -4, 0.9], [1.5, 6.2, -6, 0.7], [11.5, -4.5, -2, 1.1], [-11, -5, -3, 0.8]].map(([x, y, z, s]) => cloud(scene, [x, y, z], s));
    dust(scene, 120, [34, 16, 10]);
    return (r, t) => {
      const k = clamp((t - 0.2) / 0.9), ring = t > 1.2 && t % 4 < 1.6;
      big.scale.setScalar(outBack(k));
      big.position.y = -3.4 + Math.sin(t * 1.2) * 0.12;
      big.rotation.z = ring ? Math.sin(t * 45) * 0.04 : 0;
      big.userData.bells.forEach((b, i) => (b.rotation.x = ring ? Math.sin(t * 60 + i) * 0.25 : 0));
      rings.forEach((m, i) => { m.material.opacity = ring ? 0.5 + 0.5 * Math.sin(t * 20 + i) : 0; m.scale.setScalar(1 + ((t * 2) % 1) * 0.25); });
      big.userData.h.rotation.z = -t * 0.05 - 1.2; big.userData.m.rotation.z = -t * 0.6;
      ghosts.forEach((c, i) => {
        const u = c.userData;
        c.position.y = u.base + Math.sin(t * 0.8 + i) * 0.25; c.rotation.y += Math.sin(t * 0.4 + i) * 0.0015;
        if (u.m) u.m.rotation.z = -t * (0.4 + i * 0.1);
        if (u.colon) u.colon.forEach((d) => (d.visible = t % 1 < 0.6));
        u.bells.forEach((b) => (b.rotation.x = ring ? Math.sin(t * 50 + i) * 0.2 : 0));
        c.scale.setScalar(outBack(clamp((t - 0.6 - i * 0.15) / 0.6)));
      });
      r.render(scene, cam);
    };
  });

  // p.12：四格情境（咖啡香、陽光、家人、寵物）
  const p12 = document.querySelector('#stage .slide[data-scene="wake4"] canvas.scene3d');
  if (p12) run(p12.closest(".slide"), p12, (W, H) => {
    const GAP = 20, PW = (W - GAP * 3) / 4, cells = [];
    const cell = (i, build) => { const scene = stage(), cam = new THREE.PerspectiveCamera(30, PW / H, 0.1, 100); cam.position.set(0, 1.5, 15); cam.lookAt(0, 0.9, 0); const tick = build(scene); cells.push({ i, scene, cam, tick }); };
    // 咖啡香
    cell(0, (sc) => {
      const g = new THREE.Group(); g.position.y = 0.6; g.rotation.x = 0.12; g.scale.setScalar(0.85); sc.add(g);
      mesh(grad(cy(1.75, 1.6, 0.18, 32), 0xe0e7ff, 0xa5b4fc), solid({ flatShading: false }), [0, 0.09, 0], undefined, g);
      mesh(grad(cy(1.05, 0.78, 1.5, 32), 0xffffff, 0xc7d2fe), solid({ flatShading: false }), [0, 0.95, 0], undefined, g);
      mesh(new THREE.CircleGeometry(0.98, 32), flat(0x7c4a2d), [0, 1.66, 0], [-Math.PI / 2, 0, 0], g);
      mesh(new THREE.TorusGeometry(0.42, 0.1, 8, 20, Math.PI * 1.2), flat(0xf5f6ff), [1.05, 1, 0], [0, 0, -Math.PI * 0.6], g);
      const steam = [...Array(9)].map(() => mesh(new THREE.SphereGeometry(0.22, 10, 8), glow(0xffffff, 0), undefined, undefined, g));
      [[-1.6, 0.2, 1.3], [1.7, 0.15, 1.1], [-1.2, 0.15, 1.8]].forEach(([x, y, z]) => mesh(new THREE.SphereGeometry(0.16, 8, 6).scale(1, 0.6, 1.4), flat(0x6b3a1f), [x, y, z], [0, x, 0], g));
      dust(sc, 30, [6, 10, 4]);
      return (t) => {
        g.scale.setScalar(outBack(clamp((t - 0.2) / 0.8))); g.rotation.y = Math.sin(t * 0.5) * 0.25;
        steam.forEach((m, i) => { const k = (t * 0.32 + i / 9) % 1; m.position.set(Math.sin(k * 7 + i * 2) * 0.35, 1.9 + k * 1.8, Math.cos(i) * 0.2); m.scale.setScalar(0.5 + k * 1.3); m.material.opacity = t < 1 ? 0 : Math.sin(k * Math.PI) * 0.75; });
      };
    });
    // 陽光
    cell(1, (sc) => {
      const g = new THREE.Group(); g.position.y = 1.4; g.scale.setScalar(0.85); sc.add(g);
      const sun = new THREE.Group(); sun.position.set(0.4, 0, -3); g.add(sun);
      mesh(new THREE.IcosahedronGeometry(1.3, 2), glow(0xfde68a), undefined, undefined, sun);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; mesh(cone(0.18, 0.7, 4), glow(0xfbbf24), [Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0], [0, 0, a - Math.PI / 2], sun); }
      const fm = flat(0xf5f6ff), wf = new THREE.Group(); g.add(wf);
      [[0, 2.6, 4, 0.3], [0, -1.6, 4.4, 0.4], [-2, 0.5, 0.3, 4.4], [2, 0.5, 0.3, 4.4], [0, 0.5, 0.16, 4.2], [0, 0.6, 4, 0.14]].forEach(([x, y, w, h]) => mesh(box(w, h, 0.4), fm, [x, y, 0], undefined, wf));
      mesh(box(4.8, 0.25, 1.2), flat(0xc7d2fe), [0, -1.9, 0.4], undefined, wf);
      mesh(grad(cy(0.35, 0.28, 0.5, 10), 0x8b5cf6, 0x6366f1), solid(), [1.2, -1.5, 0.5], undefined, wf);
      const leaf = grad(new THREE.OctahedronGeometry(0.32), 0x86efac, 0x22c55e); leaf.scale(1, 1.7, 1);
      mesh(leaf, solid(), [1.2, -0.9, 0.5], undefined, wf);
      const beam = mesh(new THREE.PlaneGeometry(3.4, 6), glow(0xfde68a, 0), [0.2, -0.6, 0.6], [-0.9, 0, 0.2], g);
      [[-1.6, 3.6, -5, 0.55], [2.2, 3.2, -6, 0.45]].forEach(([x, y, z, s]) => cloud(g, [x, y, z], s));
      return (t) => {
        wf.scale.setScalar(outBack(clamp((t - 0.35) / 0.8)));
        sun.position.y = -2.2 + clamp((t - 0.8) / 2.5) * 2.6 + Math.sin(t) * 0.08; sun.rotation.z = t * 0.25;
        beam.material.opacity = clamp((t - 1.5) / 1.5) * (0.16 + 0.05 * Math.sin(t * 2));
      };
    });
    // 家人
    cell(2, (sc) => {
      const g = new THREE.Group(); g.position.y = -2.2; sc.add(g);
      mesh(grad(cy(2.2, 1.9, 0.4, 32), 0xeef0ff, 0xa5b4fc), solid({ flatShading: false }), [0, -0.2, 0], undefined, g);
      const mom = villager(2.9, 0x8b5cf6); mom.position.set(-0.7, 0, 0); mom.rotation.y = 0.5; g.add(mom);
      const kid = villager(2.2, 0x22d3ee); kid.position.set(0.75, 0, 0.3); kid.rotation.y = -0.5; g.add(kid);
      const h = heart(0.55, 0xf472b6); h.position.set(0, 4.9, 0); g.add(h);
      [[-1.8, 6.2, -3, 0.5], [1.9, 7, -4, 0.4]].forEach(([x, y, z, s]) => cloud(g, [x, y, z], s));
      return (t) => {
        mom.scale.setScalar(2.9 * outBack(clamp((t - 0.5) / 0.7))); kid.scale.setScalar(2.2 * outBack(clamp((t - 0.7) / 0.7)));
        kid.position.y = Math.abs(Math.sin(t * 3)) * 0.15; mom.rotation.z = Math.sin(t * 1.5) * 0.05;
        h.scale.setScalar(clamp((t - 1.3) / 0.6) * (1 + 0.08 * Math.sin(t * 6))); h.rotation.y = Math.sin(t) * 0.4; h.position.y = 4.9 + Math.sin(t * 1.4) * 0.15;
      };
    });
    // 寵物
    cell(3, (sc) => {
      const g = new THREE.Group(); g.position.set(-0.4, -1.2, 0); g.rotation.y = -0.9; sc.add(g);
      const fur = flat(0xf59e0b), cream = flat(0xfde68a), dark = flat(0x1e1b4b);
      mesh(box(2.4, 1.2, 1.15), fur, [0, 1.3, 0], undefined, g);
      mesh(box(1.3, 0.5, 1.0), cream, [0.25, 0.85, 0], undefined, g);
      const head = new THREE.Group(); head.position.set(1.45, 2.15, 0); g.add(head);
      mesh(box(1.15, 1.05, 1.05), fur, undefined, undefined, head);
      mesh(box(0.6, 0.45, 0.6), cream, [0.7, -0.2, 0], undefined, head);
      mesh(new THREE.SphereGeometry(0.12, 8, 6), dark, [1.02, -0.05, 0], undefined, head);
      [-0.28, 0.28].forEach((z) => mesh(new THREE.SphereGeometry(0.09, 8, 6), dark, [0.56, 0.18, z], undefined, head));
      [-0.5, 0.5].forEach((z) => mesh(box(0.35, 0.7, 0.18), flat(0x92400e), [-0.1, 0.25, z * 1.15], [z * 0.5, 0, 0.15], head));
      mesh(box(0.25, 0.08, 0.2), flat(0xf472b6), [0.8, -0.45, 0], [0, 0, -0.4], head);
      [[-0.8, -0.38], [-0.8, 0.38], [0.8, -0.38], [0.8, 0.38]].forEach(([x, z]) => mesh(box(0.32, 0.85, 0.32), fur, [x, 0.42, z], undefined, g));
      const tail = new THREE.Group(); tail.position.set(-1.2, 1.7, 0); g.add(tail);
      mesh(box(0.2, 0.8, 0.2), fur, [0, 0.35, 0], undefined, tail);
      const hearts = [0, 1].map(() => { const h = heart(0.22, 0xf472b6); g.add(h); return h; });
      mesh(grad(cy(2.4, 2.1, 0.3, 32), 0xeef0ff, 0xa5b4fc), solid({ flatShading: false }), [0, -0.15, 0], undefined, g);
      return (t) => {
        g.scale.setScalar(0.75 * outBack(clamp((t - 0.65) / 0.8)));
        tail.rotation.x = Math.sin(t * 16) * 0.5; tail.rotation.z = 0.5;
        head.rotation.z = Math.sin(t * 2) * 0.08; head.rotation.x = Math.sin(t * 1.3) * 0.1;
        hearts.forEach((h, i) => { const k = (t * 0.4 + i * 0.5) % 1; h.position.set(1.2 + i * 0.3, 3.2 + k * 1.8, 0.2); h.material.opacity = 1; h.scale.setScalar(t < 1.5 ? 0 : Math.sin(k * Math.PI)); h.rotation.y = 0.6; });
      };
    });
    return (r, t) => cells.forEach(({ i, scene, cam, tick }) => {
      tick(t);
      const x = i * (PW + GAP);
      r.setViewport(x, 0, PW, H); r.setScissor(x, 0, PW, H);
      r.render(scene, cam);
    });
  });
})();
