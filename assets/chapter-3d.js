// 章節頁右側的 3D 插畫：延續封面的浮空小島風格（藍紫漸層、思緒雲、紅帽小居民），每章一個主題場景
(() => {
  if (!window.THREE) return;
  const S = 760;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lin = (c) => new THREE.Color(c).convertSRGBToLinear();
  // 依高度上漸層色（上 → 下）
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
  const STEP = 0.06, DUR = 0.75;
  const outBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const clamp = (x) => Math.min(1, Math.max(0, x));

  function mount(slide, make) {
    const canvas = slide.querySelector("canvas.ch3d");
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.setSize(S, S, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    camera.position.set(17, 10.5, 25); camera.lookAt(0, 0.8, 0);
    scene.add(new THREE.HemisphereLight(0xeef0ff, 0x6d4bd8, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(8, 14, 12); scene.add(key);
    const rim = new THREE.DirectionalLight(0xa855f7, 1.2); rim.position.set(-10, 4, -8); scene.add(rim);

    const root = new THREE.Group(); scene.add(root);
    const parts = [], folk = [];
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true });
    function add(geo, material, [x, y, z], [rx, ry, rz] = [0, 0, 0], parent = root) {
      const m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), edgeMat.clone()); m.add(e);
      parent.add(m);
      parts.push({ m, e, base: material.opacity, to: m.position.clone(), from: m.position.clone().add(new THREE.Vector3(0, 9, 0)) });
      return m;
    }
    // 浮空小島：頂面在 y + 0.225k
    function isle([x, y, z], k = 1, parent = root) {
      add(grad(cone(3.6 * k, 4.4 * k, 9), 0x3b3fc4, 0xa855f7), solid(), [x, y - 3.4 * k, z], [Math.PI, 0, 0], parent);
      add(grad(cy(4.3 * k, 3.7 * k, 1.1 * k), 0x4f6bff, 0x3b3fc4), solid(), [x, y - 0.75 * k, z], undefined, parent);
      add(grad(cy(4.4 * k, 4.3 * k, 0.45 * k), 0xeef0ff, 0xa5b4fc), solid(), [x, y, z], undefined, parent);
      add(new THREE.TorusGeometry(4.36 * k, 0.05, 6, 9), glow(0x67e8f9), [x, y + 0.2 * k, z], [Math.PI / 2, 0, 0], parent);
    }
    function tree([x, y, z], k = 1, parent = root) {
      add(cy(0.07 * k, 0.1 * k, 0.6 * k, 6), flat(0x312e81), [x, y + 0.3 * k, z], undefined, parent);
      const g = grad(new THREE.OctahedronGeometry(0.6 * k), 0xc084fc, 0x60a5fa); g.scale(1, 1.9, 1);
      add(g, solid({ roughness: 0.25, metalness: 0.3 }), [x, y + 1.25 * k, z], undefined, parent);
    }
    // 戴高紅帽的小居民；path(w) 回傳 [x, z, y]
    function villager(shirt, path, parent = root) {
      const v = new THREE.Group();
      [[cy(0.13, 0.19, 0.38, 8), flat(shirt), 0.19], [new THREE.IcosahedronGeometry(0.14, 1), flat(0xf3c9a5), 0.5],
        [cone(0.16, 0.62, 8), flat(0xef4444), 0.88], [new THREE.SphereGeometry(0.05, 8, 6), glow(0xfde68a), 1.2]]
        .forEach(([geo, m, y]) => { const p = new THREE.Mesh(geo, m); p.position.y = y; v.add(p); });
      v.scale.setScalar(0);
      parent.add(v);
      folk.push({ v, path });
    }

    const tick = make({ add, isle, tree, villager, root, glow, flat, solid, grad, box, cone, cy }) || (() => {});

    // 思緒雲：外圈環繞
    const ring = new THREE.Group(); scene.add(ring);
    const clouds = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + (i % 3) * 0.25, r = 6.9 + (i % 2) * 0.6, s = 0.5 + ((i * 7) % 5) * 0.1;
      const c = new THREE.Group();
      c.position.set(Math.cos(a) * r, -3 + ((i * 5) % 7) * 1.25, Math.sin(a) * r);
      const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, transparent: true, opacity: 0.92 });
      [[0, 0, 0, 1], [0.95, -0.2, 0, 0.75], [-0.9, -0.25, 0.1, 0.7], [0.3, 0.45, -0.1, 0.6]].forEach(([x, y, z, k]) => {
        const p = new THREE.Mesh(grad(new THREE.IcosahedronGeometry(0.8 * k), 0xffffff, 0xc7b8ff), m); p.position.set(x, y, z); c.add(p);
      });
      c.scale.setScalar(0); c.userData = { s, y0: c.position.y };
      ring.add(c); clouds.push(c);
    }

    // 粉彩光塵
    const N = 60, dots = new Float32Array(N * 3), phase = new Float32Array(N), hue = new Float32Array(N * 3);
    const pastel = [0x60a5fa, 0xa78bfa, 0xf472b6, 0xffffff, 0x22d3ee].map((c) => new THREE.Color(c));
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 5.5;
      dots.set([Math.cos(a) * r, -5 + Math.random() * 11, Math.sin(a) * r], i * 3);
      phase[i] = Math.random() * 6.28; const c = pastel[i % pastel.length]; hue.set([c.r, c.g, c.b], i * 3);
    }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(dots, 3));
    dotGeo.setAttribute("phase", new THREE.BufferAttribute(phase, 1));
    dotGeo.setAttribute("hue", new THREE.BufferAttribute(hue, 3));
    const dustMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uT: { value: 0 }, uOpacity: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
      vertexShader: `attribute float phase; attribute vec3 hue; uniform float uT; uniform float uPx; varying vec3 vC; varying float vA;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); float tw = 0.5 + 0.5 * sin(uT * 2.2 + phase * 3.0);
          vC = hue; vA = 0.25 + 0.75 * tw; gl_PointSize = (3.0 + 6.0 * tw) * uPx * (32.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uOpacity; varying vec3 vC; varying float vA;
        void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vC, smoothstep(0.5, 0.0, d) * vA * uOpacity); }`,
    });
    scene.add(new THREE.Points(dotGeo, dustMat));

    const BUILD = parts.length * STEP + DUR;
    let t0 = 0, raf = 0;
    function frame(now) {
      const t = reduce ? BUILD + 3 : (now - t0) / 1000;
      parts.forEach((p, i) => {
        const k = clamp((t - i * STEP) / DUR);
        p.m.position.lerpVectors(p.from, p.to, outBack(k));
        p.m.scale.setScalar(0.3 + 0.7 * Math.min(1, k * 1.4));
        p.m.material.opacity = Math.min(1, k * 1.6) * (p.base ?? 1);
        p.e.material.opacity = k === 0 ? 0 : k < 1 ? 1 : Math.max(0.18, 1 - (t - i * STEP - DUR) * 1.5);
        p.m.visible = k > 0;
      });
      const b = Math.min(1, t / BUILD), idle = Math.max(0, t - BUILD);
      root.rotation.y = -0.5 + idle * 0.1;
      root.position.y = Math.sin(idle * 1.2) * 0.25;
      ring.rotation.y = -t * 0.05;
      clouds.forEach((c, i) => {
        c.scale.setScalar(c.userData.s * outBack(clamp((t - i * 0.25) / 0.9)));
        c.position.y = c.userData.y0 + Math.sin(t * 0.6 + i) * 0.25;
      });
      dustMat.uniforms.uOpacity.value = b;
      dustMat.uniforms.uT.value = t;
      for (let i = 0; i < N; i++) { let y = dots[i * 3 + 1] + 0.008; if (y > 6) y = -5; dots[i * 3 + 1] = y; }
      dotGeo.attributes.position.needsUpdate = true;
      folk.forEach((f, i) => {
        const k = clamp((idle - 0.3 - i * 0.35) / 0.5), w = idle * 1.2;
        const [x, z, y = 0.22] = f.path(w), [nx, nz] = f.path(w + 0.05);
        f.v.scale.setScalar(1.2 * outBack(k));
        f.v.position.set(x, y + Math.abs(Math.sin(w * 9 + i)) * 0.07, z);
        f.v.rotation.set(0, Math.atan2(nx - x, nz - z), Math.sin(w * 9 + i) * 0.08);
      });
      tick(t, idle, b);
      renderer.render(scene, camera);
      raf = slide.classList.contains("active") && !reduce ? requestAnimationFrame(frame) : 0;
    }
    function play() { cancelAnimationFrame(raf); t0 = performance.now(); raf = requestAnimationFrame(frame); }
    new MutationObserver(() => { if (slide.classList.contains("active") && !raf) play(); })
      .observe(slide, { attributes: true, attributeFilter: ["class"] });
    if (slide.classList.contains("active")) play(); else { t0 = performance.now() - (BUILD + 3) * 1000; frame(performance.now()); }
  }

  const SCENES = {
    // 01 設計思考：島上一個大問號，旁邊亮起一顆燈泡
    dt({ add, isle, tree, villager, root, glow, flat, solid, grad, cy }) {
      isle([0, 0, 0]);
      const qm = new THREE.Group(); qm.position.set(-0.7, 0, -0.6); qm.scale.setScalar(1.35); root.add(qm);
      const mat = () => solid({ roughness: 0.3, metalness: 0.25 });
      add(grad(new THREE.TorusGeometry(1.1, 0.32, 10, 28, Math.PI * 1.5), 0xc084fc, 0x6366f1), mat(), [0, 3.7, 0], [0, 0, -Math.PI / 2], qm);
      add(grad(cy(0.32, 0.32, 0.9, 12), 0x8b5cf6, 0x6366f1), mat(), [0, 2.15, 0], undefined, qm);
      add(grad(new THREE.IcosahedronGeometry(0.4, 1), 0xa855f7, 0x6366f1), mat(), [0, 0.95, 0], undefined, qm);
      const bulb = new THREE.Group(); bulb.position.set(2.3, 4.2, 0.9); root.add(bulb);
      const glass = add(new THREE.SphereGeometry(0.75, 20, 14), glow(0xfde68a, 0.9), [0, 0, 0], undefined, bulb);
      add(new THREE.SphereGeometry(0.32, 12, 8), glow(0xffffff), [0, 0, 0], undefined, bulb);
      add(cy(0.36, 0.3, 0.45, 10), flat(0x94a3b8), [0, -0.85, 0], undefined, bulb);
      tree([-3, 0.2, 1.2]); tree([2.6, 0.2, -1.8], 0.8); tree([-2.6, 0.2, -2], 0.7);
      villager(0xf5f6ff, (w) => [-0.7 + Math.cos(w * 0.4) * 2.1, -0.6 + Math.sin(w * 0.4) * 2.1]);
      return (t, idle, b) => {
        qm.rotation.y = Math.sin(idle * 0.8) * 0.25;
        bulb.position.y = 4.2 + Math.sin(idle * 1.6) * 0.2;
        glass.material.opacity = b < 1 ? glass.material.opacity : 0.65 + 0.3 * (0.5 + 0.5 * Math.sin(idle * 3));
      };
    },
    // 02 專案實戰：一個上線的產品畫面，旁邊火箭準備升空
    case({ add, isle, tree, villager, root, glow, flat, solid, grad, box, cone, cy }) {
      isle([0, 0, 0]);
      add(box(2.5, 3.7, 0.3), flat(0xf5f6ff), [-1, 2.1, -0.8], [0, 0.25, 0]);
      add(grad(box(2.1, 3.1, 0.05), 0x60a5fa, 0xc084fc), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92 }), [-0.96, 2.15, -0.63], [0, 0.25, 0]);
      [[2.85, 1.4], [2.45, 1], [1.75, 1.4], [1.35, 0.9]].forEach(([y, w]) => add(box(w, 0.18, 0.04), glow(0xffffff, 0.85), [-1.35 + (1.4 - w) / 2 * 0.97, y, -0.5], [0, 0.25, 0]));
      add(cy(0.9, 1.05, 0.22, 12), flat(0x312e81), [2.1, 0.33, 0.9]);
      const rocket = new THREE.Group(); rocket.position.set(2.1, 1.75, 0.9); root.add(rocket);
      add(cy(0.42, 0.42, 1.7, 14), flat(0xf5f6ff), [0, 0, 0], undefined, rocket);
      add(grad(cone(0.42, 0.9, 14), 0xc084fc, 0x6366f1), solid(), [0, 1.3, 0], undefined, rocket);
      add(new THREE.CircleGeometry(0.2, 14), glow(0x67e8f9), [0, 0.3, 0.43], undefined, rocket);
      [0, 2.1, 4.2].forEach((a) => add(box(0.08, 0.6, 0.5), flat(0x8b5cf6), [Math.sin(a) * 0.45, -0.6, Math.cos(a) * 0.45], [0, a, 0], rocket));
      const flame = add(cone(0.3, 0.8, 10), glow(0xfbbf24, 0.9), [0, -1.25, 0], [Math.PI, 0, 0], rocket);
      tree([-3.1, 0.2, 1.2]); tree([2.9, 0.2, -1.8], 0.8);
      villager(0x312e81, (w) => [Math.cos(w * 0.35) * 3.6, Math.sin(w * 0.35) * 3.6]);
      villager(0x22d3ee, (w) => [0.6 + Math.sin(w * 0.5) * 0.9, 1.9]);
      return (t, idle, b) => {
        if (b < 1) return;
        rocket.position.y = 1.95 + Math.sin(idle * 1.5) * 0.25;
        flame.scale.set(1, 0.8 + 0.3 * Math.abs(Math.sin(idle * 14)), 1);
      };
    },
    // 03 AI 提升個人效率：兩個咬合的齒輪，旁邊一道閃電
    ai1({ add, isle, tree, villager, root, glow, flat, solid, grad, box, cy }) {
      isle([0, 0, 0]);
      function gear(r, teeth, [x, y, z]) {
        const pivot = new THREE.Group(); pivot.position.set(x, y, z); root.add(pivot);
        const body = add(grad(cy(r, r, 0.45, 28), 0xc084fc, 0x6366f1), solid({ roughness: 0.3, metalness: 0.35 }), [0, 0, 0], [Math.PI / 2, 0, 0], pivot);
        for (let i = 0; i < teeth; i++) {
          const a = (i / teeth) * Math.PI * 2, tooth = new THREE.Mesh(grad(box(0.36, 0.45, 0.4), 0xa78bfa, 0x7c6cf0), body.material);
          tooth.position.set(Math.cos(a) * (r + 0.14), 0, Math.sin(a) * (r + 0.14)); tooth.rotation.y = -a; body.add(tooth);
        }
        const hub = new THREE.Mesh(cy(r * 0.3, r * 0.3, 0.5, 16), glow(0x67e8f9)); body.add(hub);
        return pivot;
      }
      const gA = gear(1.4, 12, [-0.8, 3.0, -0.5]), gB = gear(0.9, 8, [1.4, 1.8, -0.5]);
      const shape = new THREE.Shape([[0, 1], [-0.55, -0.05], [-0.1, -0.05], [-0.4, -1], [0.55, 0.2], [0.1, 0.2], [0.4, 1]].map(([x, y]) => new THREE.Vector2(x, y)));
      const bolt = add(new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false }), glow(0xfbbf24), [2.6, 4.1, 0.6]);
      tree([-3, 0.2, 1.3]); tree([2.8, 0.2, -2], 0.8); tree([-2.4, 0.2, -2.3], 0.7);
      villager(0xf5f6ff, (w) => [Math.cos(w * 0.35) * 3.6, Math.sin(w * 0.35) * 3.6]);
      villager(0x8b5cf6, (w) => [-0.2 + Math.sin(w * 0.5) * 1.3, 1.6]);
      return (t, idle, b) => {
        if (b < 1) return;
        gA.rotation.z = idle * 0.8; gB.rotation.z = -idle * 0.8 * (1.4 / 0.9) + 0.2;
        bolt.material.opacity = 0.6 + 0.4 * Math.abs(Math.sin(idle * 2.5));
        bolt.position.y = 4.1 + Math.sin(idle * 1.4) * 0.2;
      };
    },
    // 04 串起團隊：三座小島用光橋連起來，光點在島之間傳遞
    ai2({ add, isle, tree, villager, root, glow }) {
      const spots = [[-3.1, 0.2, 1.4], [3.0, 1.0, 0.8], [-0.2, 2.2, -3.2]];
      spots.forEach((p, i) => isle(p, 0.42));
      spots.forEach(([x, y, z], i) => tree([x + 0.6, y + 0.1, z - 0.4], 0.55));
      const curves = spots.map((p, i) => {
        const a = new THREE.Vector3(...p), c = new THREE.Vector3(...spots[(i + 1) % 3]);
        a.y += 0.2; c.y += 0.2;
        const mid = a.clone().lerp(c, 0.5); mid.y += 1.6;
        return new THREE.QuadraticBezierCurve3(a, mid, c);
      });
      curves.forEach((c) => add(new THREE.TubeGeometry(c, 40, 0.06, 6), glow(0x67e8f9, 0.75), [0, 0, 0]));
      const pulses = curves.map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), glow(0xffffff)); m.visible = false; root.add(m); return m; });
      spots.forEach(([x, y, z], i) => villager([0x312e81, 0xf5f6ff, 0x22d3ee][i], (w) => [x + Math.cos(w * 0.6 + i) * 0.85, z + Math.sin(w * 0.6 + i) * 0.85, y + 0.1]));
      return (t, idle, b) => {
        pulses.forEach((p, i) => {
          p.visible = b >= 1;
          p.position.copy(curves[i].getPoint((idle * 0.35 + i / 3) % 1));
        });
      };
    },
    // 05 心態轉變：繞著光柱往上的階梯，頂端是一顆發光水晶
    mind({ add, isle, villager, root, glow, flat, solid, grad, box, cy }) {
      isle([0, 0, 0]);
      add(grad(cy(0.35, 0.5, 4.4, 10), 0xeef0ff, 0xa5b4fc), solid(), [0, 2.4, 0]);
      const n = 12, step = (i) => [Math.cos(i * 0.55) * 1.55, 0.45 + i * 0.36, Math.sin(i * 0.55) * 1.55];
      for (let i = 0; i < n; i++) { const [x, y, z] = step(i); add(grad(box(1.1, 0.22, 0.65), 0xc4b5fd, 0x6366f1), solid(), [x, y, z], [0, -i * 0.55, 0]); }
      const g = grad(new THREE.OctahedronGeometry(0.8), 0xfde68a, 0xc084fc); g.scale(1, 1.5, 1);
      const star = add(g, solid({ roughness: 0.2, metalness: 0.3, emissive: lin(0x8b5cf6), emissiveIntensity: 0.4 }), [0, 5.7, 0]);
      add(new THREE.TorusGeometry(1.1, 0.04, 6, 32), glow(0xfde68a), [0, 5.7, 0], [Math.PI / 2, 0, 0]);
      villager(0x22d3ee, (w) => {
        const s = (n - 1) * (0.5 - 0.5 * Math.cos(w * 0.25)), [x, y, z] = step(s);
        return [x, z, y + 0.1];
      });
      villager(0x312e81, (w) => [Math.cos(w * 0.35) * 3.6, Math.sin(w * 0.35) * 3.6]);
      return (t, idle) => { star.rotation.y = idle * 0.9; };
    },
    // 暖身一的結果：島上擺滿長得差不多的鬧鐘
    clocks({ add, isle, tree, villager, root, glow, flat, solid, grad, box, cy }) {
      isle([0, 0, 0]);
      const hands = [];
      [[-1.6, -1.6, 1.15], [0.7, -1.9, 1], [2.6, -0.6, 0.9], [-2.9, 0.4, 0.9], [-0.6, 0.2, 1.1], [1.7, 1.3, 1], [-1.6, 2.4, 0.85], [0.6, 3.1, 0.8]].forEach(([x, z, s], i) => {
        const g = new THREE.Group(); g.position.set(x, 0.22, z); g.rotation.y = 0.35 + (i % 3) * 0.12; g.scale.setScalar(s); root.add(g);
        add(grad(cy(0.62, 0.62, 0.42, 18), i % 2 ? 0x8b5cf6 : 0x60a5fa, 0x4338ca), solid(), [0, 0.95, 0], [Math.PI / 2, 0, 0], g);
        add(new THREE.CircleGeometry(0.5, 20), glow(0xffffff), [0, 0.95, 0.22], undefined, g);
        [-0.42, 0.42].forEach((bx) => add(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), flat(0xc7d2fe), [bx, 1.55, 0], [0, 0, -bx * 0.9], g));
        [-0.32, 0.32].forEach((lx) => add(cy(0.05, 0.07, 0.4, 6), flat(0x312e81), [lx, 0.2, 0], [0, 0, lx * 0.5], g));
        const h = new THREE.Mesh(box(0.05, 0.36, 0.02), flat(0x312e81)); h.position.set(0, 0.95, 0.24); g.add(h);
        const m = new THREE.Mesh(box(0.04, 0.26, 0.02), flat(0xef4444)); m.position.set(0, 0.95, 0.25); g.add(m);
        hands.push([h, m, i]);
      });
      tree([3.3, 0.2, -2.4], 0.7);
      villager(0xf5f6ff, (w) => [Math.cos(w * 0.3) * 3.8, Math.sin(w * 0.3) * 3.8]);
      return (t) => hands.forEach(([h, m, i]) => {
        h.rotation.z = -(t * 0.4 + i); m.rotation.z = -(t * 2.4 + i * 2);
        h.position.set(Math.sin(h.rotation.z * -1) * 0.13, 0.95 + Math.cos(h.rotation.z) * 0.13, 0.24);
        m.position.set(Math.sin(m.rotation.z * -1) * 0.1, 0.95 + Math.cos(m.rotation.z) * 0.1, 0.25);
      });
    },
    // 暖身二的結果：咖啡香、陽光、家人、寵物
    wakeup({ add, isle, tree, villager, root, glow, flat, solid, grad, box, cone, cy }) {
      isle([0, 0, 0]);
      // 咖啡
      add(cy(0.55, 0.42, 0.8, 16), flat(0xf5f6ff), [-2, 0.62, 1.1]);
      add(new THREE.CircleGeometry(0.48, 16), flat(0x7c4a2d), [-2, 1.03, 1.1], [-Math.PI / 2, 0, 0]);
      add(new THREE.TorusGeometry(0.22, 0.06, 6, 12), flat(0xf5f6ff), [-1.42, 0.65, 1.1]);
      add(cy(0.85, 0.85, 0.06, 18), flat(0xc7d2fe), [-2, 0.25, 1.1]);
      const steam = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), glow(0xffffff, 0)); root.add(m); return m; });
      // 太陽
      const sun = new THREE.Group(); sun.position.set(2.2, 4.4, -1.6); root.add(sun);
      add(new THREE.IcosahedronGeometry(0.85, 1), glow(0xfde68a), [0, 0, 0], undefined, sun);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; add(box(0.14, 0.5, 0.14), glow(0xfbbf24), [Math.cos(a) * 1.35, Math.sin(a) * 1.35, 0], [0, 0, a - Math.PI / 2], sun); }
      // 小屋（家）
      add(box(1.8, 1.3, 1.4), flat(0xf5f6ff), [0.4, 0.9, -2.2]);
      add(grad(cone(1.45, 1, 4), 0xa855f7, 0x6366f1), solid(), [0.4, 2.05, -2.2], [0, Math.PI / 4, 0]);
      add(box(0.4, 0.35, 0.06), glow(0xfde68a), [0, 1, -1.47]);
      // 小狗
      const dog = new THREE.Group(); dog.position.set(2.2, 0.22, 1.4); dog.rotation.y = -0.6; root.add(dog);
      const fur = flat(0xf59e0b);
      add(box(0.9, 0.42, 0.42), fur, [0, 0.5, 0], undefined, dog);
      add(box(0.42, 0.4, 0.4), fur, [0.58, 0.8, 0], undefined, dog);
      add(box(0.2, 0.16, 0.24), flat(0xfde68a), [0.86, 0.72, 0], undefined, dog);
      [-0.12, 0.12].forEach((ez) => add(cone(0.1, 0.24, 4), flat(0x92400e), [0.55, 1.08, ez], undefined, dog));
      [[-0.3, -0.13], [-0.3, 0.13], [0.3, -0.13], [0.3, 0.13]].forEach(([lx, lz]) => add(box(0.12, 0.32, 0.12), fur, [lx, 0.16, lz], undefined, dog));
      const tail = add(box(0.08, 0.36, 0.08), fur, [-0.5, 0.78, 0], [0, 0, 0.6], dog);
      tree([-3.2, 0.2, -1.4], 0.8); tree([3.4, 0.2, -1.2], 0.6);
      // 一家人：兩個大人、一個小孩，在小屋前
      villager(0x312e81, (w) => [-0.4 + Math.sin(w * 0.5) * 0.25, -0.6]);
      villager(0x8b5cf6, (w) => [0.4 + Math.sin(w * 0.5 + 1) * 0.25, -0.5]);
      villager(0x22d3ee, (w) => [Math.cos(w * 0.8) * 0.7, 0.3 + Math.sin(w * 0.8) * 0.5]);
      return (t, idle, b) => {
        sun.rotation.z = t * 0.3;
        tail.rotation.z = 0.6 + Math.sin(t * 12) * 0.35;
        steam.forEach((m, i) => {
          const k = (t * 0.45 + i / 3) % 1;
          m.position.set(-2 + Math.sin(k * 6 + i) * 0.15, 1.2 + k * 1.6, 1.1);
          m.scale.setScalar(0.6 + k * 0.8);
          m.material.opacity = b < 1 ? 0 : Math.sin(k * Math.PI) * 0.7;
        });
      };
    },
  };

  document.querySelectorAll("#stage .slide canvas.ch3d").forEach((c) => {
    const s = c.closest(".slide"), f = SCENES[s.dataset.scene || s.dataset.section];
    if (f) mount(s, f);
  });
})();
