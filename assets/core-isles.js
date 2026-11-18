// 結尾頁背景：先是一座跟封面一樣的小島，主句出現後想法變多，沿著畫面下方長成錯落的群島，最後用光橋串起來
(() => {
  const slide = document.querySelector("#stage .slide.core");
  const canvas = slide && slide.querySelector("canvas.isles.main");
  if (!canvas || !window.THREE) return;
  const W = 1600, H = 900;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 三層畫布：far（遠、輕微模糊）、main（清楚）、near（前景大島、明顯模糊），模糊交給 CSS filter
  const layers = {};
  ["far", "main", "near"].forEach((name) => {
    const cv = slide.querySelector("canvas.isles." + name);
    if (!cv) return;
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    r.setSize(W, H, false);
    r.outputEncoding = THREE.sRGBEncoding;
    layers[name] = { r, s: new THREE.Scene() };
  });
  const scene = layers.main.s;
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 200);
  camera.position.set(0, 5, 40); camera.lookAt(0, 0, 0);
  Object.values(layers).forEach(({ s }) => {
    s.add(new THREE.HemisphereLight(0xeef0ff, 0x6d4bd8, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(8, 14, 12); s.add(key);
    const rim = new THREE.DirectionalLight(0xa855f7, 1.2); rim.position.set(-10, 4, -8); s.add(rim);
  });

  const lin = (c) => new THREE.Color(c).convertSRGBToLinear();
  function grad(geo, top, bottom) {
    geo = geo.toNonIndexed(); geo.computeBoundingBox();
    const { min, max } = geo.boundingBox, pos = geo.attributes.position, a = lin(top), b = lin(bottom), c = new THREE.Color(), out = [];
    for (let i = 0; i < pos.count; i++) { c.copy(b).lerp(a, (pos.getY(i) - min.y) / (max.y - min.y || 1)); out.push(c.r, c.g, c.b); }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(out, 3));
    return geo;
  }
  const solid = (opts = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15, flatShading: true, transparent: true, ...opts });
  const flat = (c) => new THREE.MeshStandardMaterial({ color: lin(c), roughness: 0.6, flatShading: true, transparent: true });
  const glow = (c, opacity = 1) => new THREE.MeshBasicMaterial({ color: lin(c), transparent: true, opacity });
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cone = (r, h, n = 7) => new THREE.ConeGeometry(r, h, n);
  const cy = (r1, r2, h, n = 9) => new THREE.CylinderGeometry(r1, r2, h, n);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true });
  const STEP = 0.05, DUR = 0.7;
  const outBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const clamp = (x) => Math.min(1, Math.max(0, x));

  // 每座島：在第 stage 步出現；道具用封面的尺寸做，再整組縮小
  const isles = [];
  function isle(stage, [x, y, z], k, delay, build, layer = "main") {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(k); g.rotation.y = Math.random() * 6; (layers[layer] || layers.main).s.add(g);
    const it = { g, stage, delay, parts: [], y0: y, start: null, spin: (Math.random() - 0.5) * 0.3 };
    const add = (geo, material, [px, py, pz], [rx, ry, rz] = [0, 0, 0], parent = g) => {
      const m = new THREE.Mesh(geo, material);
      m.position.set(px, py, pz); m.rotation.set(rx, ry, rz);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), edgeMat.clone()); m.add(e);
      parent.add(m); m.visible = false;
      it.parts.push({ m, e, base: material.opacity, to: m.position.clone(), from: m.position.clone().add(new THREE.Vector3(0, 9, 0)) });
      return m;
    };
    add(grad(cone(3.6, 4.4, 9), 0x3b3fc4, 0xa855f7), solid(), [0, -3.4, 0], [Math.PI, 0, 0]);
    add(grad(cy(4.3, 3.7, 1.1), 0x4f6bff, 0x3b3fc4), solid(), [0, -0.75, 0]);
    add(grad(cy(4.4, 4.3, 0.45), 0xeef0ff, 0xa5b4fc), solid(), [0, 0, 0]);
    add(new THREE.TorusGeometry(4.36, 0.05, 6, 9), glow(0x67e8f9), [0, 0.2, 0], [Math.PI / 2, 0, 0]);
    it.tick = build(add, g) || (() => {});
    isles.push(it);
    return it;
  }
  const crystal = (add, [x, z], k = 1) => {
    add(cy(0.07 * k, 0.1 * k, 0.6 * k, 6), flat(0x312e81), [x, 0.5 * k, z]);
    const c = grad(new THREE.OctahedronGeometry(0.6 * k), 0xc084fc, 0x60a5fa); c.scale(1, 1.9, 1);
    add(c, solid({ roughness: 0.25, metalness: 0.3 }), [x, 1.45 * k + 0.2, z]);
  };
  function villager(parent, path) {
    const v = new THREE.Group();
    [[cy(0.13, 0.19, 0.38, 8), flat(0xf5f6ff), 0.19], [new THREE.IcosahedronGeometry(0.14, 1), flat(0xf3c9a5), 0.5],
      [cone(0.16, 0.62, 8), flat(0xef4444), 0.88], [new THREE.SphereGeometry(0.05, 8, 6), glow(0xfde68a), 1.2]]
      .forEach(([geo, m, y]) => { const p = new THREE.Mesh(geo, m); p.position.y = y; v.add(p); });
    v.scale.setScalar(0); parent.add(v);
    return (w, k) => {
      const [x, z] = path(w), [nx, nz] = path(w + 0.05);
      v.scale.setScalar(1.6 * outBack(k));
      v.position.set(x, 0.22 + Math.abs(Math.sin(w * 9)) * 0.07, z);
      v.rotation.y = Math.atan2(nx - x, nz - z);
    };
  }

  // 第 0 步：封面那座小島（小屋、風車、水晶樹、紅帽居民）
  isle(0, [-0.6, -8.4, 3], 0.46, 0.4, (add, g) => {
    add(box(2.2, 1.5, 1.7), flat(0xf5f6ff), [-1.2, 1.0, -0.6]);
    add(grad(cone(1.75, 1.2, 4), 0xa855f7, 0x6366f1), solid(), [-1.2, 2.35, -0.6], [0, Math.PI / 4, 0]);
    add(box(0.45, 0.4, 0.06), glow(0x67e8f9), [-1.7, 1.15, 0.27]);
    add(cy(1.2, 1.2, 0.08, 12), glow(0x22d3ee, 0.85), [1.6, 0.25, 1.6]);
    add(cy(0.3, 0.5, 2.6, 8), flat(0xf5f6ff), [2.4, 1.5, -1.3]);
    const mill = add(box(0.12, 2.6, 0.22), flat(0xf5f6ff), [2.4, 2.9, -0.8]);
    mill.add(new THREE.Mesh(box(2.6, 0.22, 0.1), mill.material));
    crystal(add, [-3, -1.2], 0.9); crystal(add, [-0.4, 2.9], 0.7);
    const walk = villager(g, (w) => [Math.cos(w * 0.35) * 3.5, Math.sin(w * 0.35) * 3.5]);
    return (idle) => { mill.rotation.z = idle * 1.5; walk(idle * 1.2, clamp((idle - 0.3) / 0.5)); };
  });
  // 第 1 步：想法變多，長出更多不同的小島
  isle(1, [-8.2, -6.6, -1], 0.34, 0.15, (add, g) => { // 問號
    const q = new THREE.Group(); q.scale.setScalar(1.4); g.add(q);
    const m = () => solid({ roughness: 0.3, metalness: 0.25 });
    add(grad(new THREE.TorusGeometry(1.1, 0.32, 10, 28, Math.PI * 1.5), 0xc084fc, 0x6366f1), m(), [0, 3.7, 0], [0, 0, -Math.PI / 2], q);
    add(grad(cy(0.32, 0.32, 0.9, 12), 0x8b5cf6, 0x6366f1), m(), [0, 2.15, 0], undefined, q);
    add(grad(new THREE.IcosahedronGeometry(0.4, 1), 0xa855f7, 0x6366f1), m(), [0, 0.95, 0], undefined, q);
    crystal(add, [2.6, 1.2], 0.8);
  });
  isle(1, [-10.6, -4.9, 12], 0.78, 0.5, (add) => { // 燈泡（前景大島，模糊）
    const bulb = add(new THREE.SphereGeometry(0.9, 20, 14), glow(0xfde68a, 0.9), [0, 3.4, 0]);
    add(new THREE.SphereGeometry(0.38, 12, 8), glow(0xffffff), [0, 3.4, 0]);
    add(cy(0.42, 0.36, 0.55, 10), flat(0x94a3b8), [0, 2.35, 0]);
    add(cy(0.08, 0.08, 1.9, 6), flat(0x312e81), [0, 1.15, 0]);
    crystal(add, [-2.5, 1], 0.8); crystal(add, [2.4, -1.3], 0.6);
    return (idle) => { bulb.material.opacity = 0.6 + 0.35 * (0.5 + 0.5 * Math.sin(idle * 3)); };
  }, "near");
  isle(1, [10.6, -6.4, -3], 0.32, 0.3, (add) => { // 火箭
    add(cy(0.5, 0.5, 2, 14), flat(0xf5f6ff), [0, 2.1, 0]);
    add(grad(cone(0.5, 1.1, 14), 0xc084fc, 0x6366f1), solid(), [0, 3.65, 0]);
    add(new THREE.CircleGeometry(0.22, 14), glow(0x67e8f9), [0, 2.5, 0.51]);
    [0, 2.1, 4.2].forEach((a) => add(box(0.1, 0.7, 0.6), flat(0x8b5cf6), [Math.sin(a) * 0.55, 1.3, Math.cos(a) * 0.55], [0, a, 0]));
    add(cone(0.35, 0.9, 10), glow(0xfbbf24, 0.9), [0, 0.65, 0], [Math.PI, 0, 0]);
    crystal(add, [-2.6, 1.2], 0.7);
  });
  isle(1, [-19.6, -2.6, -12], 0.24, 0.95, (add, g) => { // 齒輪（遠景小島）
    const p = new THREE.Group(); p.position.set(0, 2.6, 0); g.add(p);
    const body = add(grad(cy(1.6, 1.6, 0.5, 28), 0xc084fc, 0x6366f1), solid({ roughness: 0.3, metalness: 0.35 }), [0, 0, 0], [Math.PI / 2, 0, 0], p);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, t = new THREE.Mesh(grad(box(0.4, 0.5, 0.45), 0xa78bfa, 0x7c6cf0), body.material);
      t.position.set(Math.cos(a) * 1.75, 0, Math.sin(a) * 1.75); t.rotation.y = -a; body.add(t);
    }
    body.add(new THREE.Mesh(cy(0.5, 0.5, 0.55, 16), glow(0x67e8f9)));
    return (idle) => { p.rotation.z = idle * 0.7; };
  }, "far");
  isle(1, [11, -5.2, 13], 0.86, 0.75, (add) => { // 水晶塔（前景大島，模糊）
    const c = grad(new THREE.OctahedronGeometry(1.1), 0xfde68a, 0xc084fc); c.scale(1, 1.6, 1);
    const star = add(c, solid({ roughness: 0.2, metalness: 0.3 }), [0, 3.2, 0]);
    add(new THREE.TorusGeometry(1.5, 0.05, 6, 32), glow(0xfde68a), [0, 3.2, 0], [Math.PI / 2, 0, 0]);
    crystal(add, [-2.4, 1], 0.8); crystal(add, [2.2, -1.4], 0.7);
    return (idle) => { star.rotation.y = idle * 0.9; };
  }, "near");

  // 遠近錯落的小島，只放一棵水晶樹
  [[6.2, -8.2, 0, 0.18, 1.1, "main"], [-12.4, -3.8, -16, 0.14, 0.7, "far"], [15.4, -3.4, -18, 0.12, 0.55, "far"], [21.6, -4.2, -10, 0.16, 1.25, "far"]]
    .forEach(([x, y, z, k, d, l]) => isle(1, [x, y, z], k, d, (add) => { crystal(add, [0.6, -0.4], 1.3); }, l));

  // 第 3 步：光橋沿著群島由左到右串起來，光點在島之間傳遞
  const hubs = isles.map((it) => it.g.position.clone().add(new THREE.Vector3(0, 0.3, 0)));
  const links = [[4, 2], [2, 7], [7, 1], [1, 6], [6, 0], [0, 3], [3, 8], [8, 5], [5, 9]].map(([a, b]) => {
    const p = hubs[a], q = hubs[b], mid = p.clone().lerp(q, 0.5); mid.y += 1; mid.z -= 1.5;
    const curve = new THREE.QuadraticBezierCurve3(p, mid, q);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.05, 6), glow(0x67e8f9, 0));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), glow(0xffffff, 0));
    scene.add(tube, dot);
    return { curve, tube, dot };
  });

  // 3D 思緒雲：散在畫面四周
  const clouds = [[-7.5, 8.2, -6, 0.9], [8, 8.6, -8, 0.7], [-17, -8, -2, 0.8], [9, -8.6, 0, 0.75], [-4, -9.4, -4, 0.55], [17, 9, -12, 0.6], [-20, 9.5, -14, 0.6]].map(([x, y, z, s], i) => {
    const c = new THREE.Group(); c.position.set(x, y, z);
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, transparent: true, opacity: 0.92 });
    [[0, 0, 0, 1], [0.95, -0.2, 0, 0.75], [-0.9, -0.25, 0.1, 0.7], [0.3, 0.45, -0.1, 0.6]].forEach(([px, py, pz, k]) => {
      const p = new THREE.Mesh(grad(new THREE.IcosahedronGeometry(0.8 * k), 0xffffff, 0xc7b8ff), m); p.position.set(px, py, pz); c.add(p);
    });
    c.scale.setScalar(0); c.userData = { s, x0: x, y0: y };
    scene.add(c);
    return c;
  });

  const stepsOn = () => slide.querySelectorAll(".step.on").length;
  let t0 = 0, raf = 0;
  function frame(now) {
    const t = reduce ? 99 : (now - t0) / 1000, st = reduce ? 9 : stepsOn();
    isles.forEach((it) => {
      if (st >= it.stage && it.start === null) it.start = t + it.delay;
      if (st < it.stage) it.start = null;
      const lt = it.start === null ? -1 : t - it.start;
      it.parts.forEach((p, i) => {
        const k = clamp((lt - i * STEP) / DUR);
        p.m.position.lerpVectors(p.from, p.to, outBack(k));
        p.m.scale.setScalar(0.3 + 0.7 * Math.min(1, k * 1.4));
        p.m.material.opacity = Math.min(1, k * 1.6) * (p.base ?? 1);
        p.e.material.opacity = k === 0 ? 0 : k < 1 ? 1 : Math.max(0.18, 1 - (lt - i * STEP - DUR) * 1.5);
        p.m.visible = k > 0;
      });
      const idle = Math.max(0, lt - it.parts.length * STEP - DUR);
      it.g.rotation.y += it.spin * 0.01;
      it.g.position.y = it.y0 + Math.sin(t * 1.1 + it.y0) * 0.2;
      if (lt > 0) it.tick(idle);
    });
    links.forEach((l, i) => {
      const on = st >= 3, o = l.tube.material.opacity;
      l.tube.material.opacity = on ? Math.min(0.7, o + 0.02) : Math.max(0, o - 0.05);
      l.dot.material.opacity = l.tube.material.opacity / 0.7;
      l.dot.position.copy(l.curve.getPoint((t * 0.3 + i / links.length) % 1));
    });
    clouds.forEach((c, i) => {
      c.scale.setScalar(c.userData.s * outBack(clamp((t - 0.2 - i * 0.15) / 0.9)));
      c.position.x = c.userData.x0 + Math.sin(t * 0.25 + i) * 0.6;
      c.position.y = c.userData.y0 + Math.sin(t * 0.6 + i) * 0.25;
    });
    Object.values(layers).forEach(({ r, s }) => r.render(s, camera));
    raf = slide.classList.contains("active") && !reduce ? requestAnimationFrame(frame) : 0;
  }
  function play() { cancelAnimationFrame(raf); t0 = performance.now(); isles.forEach((it) => (it.start = null)); raf = requestAnimationFrame(frame); }
  new MutationObserver(() => { if (slide.classList.contains("active") && !raf) play(); })
    .observe(slide, { attributes: true, attributeFilter: ["class"] });
  if (slide.classList.contains("active")) play();
})();
