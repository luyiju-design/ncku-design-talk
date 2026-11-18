// 封面右側：AI 一塊塊搭出來的未來感浮空小島（three.js），搭好後罩上水晶球；外圈是思緒雲，島上有戴高紅帽的小居民
(() => {
  const slide = document.querySelector("#stage .slide.cover");
  const canvas = slide && slide.querySelector("canvas.island");
  if (!canvas || !window.THREE) return;
  const status = slide.querySelector(".build-status");
  const W = 900, H = 900;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(W, H, false);
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 200);
  camera.position.set(21.5, 12.5, 31.5);
  camera.lookAt(-0.4, -0.6, 0);

  scene.add(new THREE.HemisphereLight(0xeef0ff, 0x6d4bd8, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(8, 14, 12); scene.add(key);
  const rim = new THREE.DirectionalLight(0xa855f7, 1.2); rim.position.set(-10, 4, -8); scene.add(rim);

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
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true });

  const island = new THREE.Group(); scene.add(island);
  const parts = [];
  function add(geo, material, [x, y, z], [rx, ry, rz] = [0, 0, 0], parent = island) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), edgeMat.clone()); m.add(e);
    parent.add(m);
    parts.push({ m, e, base: material.opacity, to: m.position.clone(), from: m.position.clone().add(new THREE.Vector3(0, 9, 0)) });
    return m;
  }

  // 由下往上搭：島體 → 光環 → 水 → 小屋 → 全息看板 → 風力塔 → 水晶樹 → 石頭 → 旁邊的小島
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cone = (r, h, n = 7) => new THREE.ConeGeometry(r, h, n);
  const cy = (r1, r2, h, n = 9) => new THREE.CylinderGeometry(r1, r2, h, n);
  add(grad(cone(3.6, 4.4, 9), 0x3b3fc4, 0xa855f7), solid(), [0, -3.4, 0], [Math.PI, 0, 0]);
  add(grad(cy(4.3, 3.7, 1.1), 0x4f6bff, 0x3b3fc4), solid(), [0, -0.75, 0]);
  add(grad(cy(4.4, 4.3, 0.45), 0xeef0ff, 0xa5b4fc), solid(), [0, 0, 0]);
  add(new THREE.TorusGeometry(4.36, 0.05, 6, 9), glow(0x67e8f9), [0, 0.2, 0], [Math.PI / 2, 0, 0]);
  add(cy(1.2, 1.2, 0.08, 12), glow(0x22d3ee, 0.85), [1.6, 0.25, 1.6]);
  add(grad(box(0.5, 3.4, 0.14), 0x22d3ee, 0xa855f7), solid({ opacity: 0.8 }), [2.45, -1.4, 3.25], [0, Math.PI / 4, 0]);
  add(box(2.2, 1.5, 1.7), flat(0xf5f6ff), [-1.2, 1.0, -0.6]);
  add(grad(cone(1.75, 1.2, 4), 0xa855f7, 0x6366f1), solid(), [-1.2, 2.35, -0.6], [0, Math.PI / 4, 0]);
  add(box(0.5, 0.8, 0.06), flat(0x312e81), [-0.8, 0.65, 0.27]);
  add(box(0.45, 0.4, 0.06), glow(0x67e8f9), [-1.7, 1.15, 0.27]);
  add(grad(box(1.2, 0.8, 0.04), 0x60a5fa, 0xc084fc), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75 }), [0.5, 1.75, -1.8], [0, -0.3, 0]);
  add(box(0.06, 1.4, 0.06), flat(0x312e81), [0.5, 0.75, -1.85]);
  add(cy(0.3, 0.5, 2.6, 8), flat(0xf5f6ff), [2.4, 1.5, -1.3]);
  add(new THREE.OctahedronGeometry(0.35), glow(0x8b5cf6), [2.4, 3.1, -1.3]);
  const mill = add(box(0.12, 2.6, 0.22), flat(0xf5f6ff), [2.4, 2.9, -0.8]);
  mill.add(new THREE.Mesh(box(2.6, 0.22, 0.1), mill.material));
  [[-3, -1.2, 0.9], [-2.4, 1.6, 1.1], [0.2, -3, 0.8], [-0.6, 2.9, 0.7]].forEach(([x, z, k]) => {
    add(cy(0.07 * k, 0.1 * k, 0.6 * k, 6), flat(0x312e81), [x, 0.5 * k, z]);
    const g = grad(new THREE.OctahedronGeometry(0.6 * k), 0xc084fc, 0x60a5fa); g.scale(1, 1.9, 1);
    add(g, solid({ roughness: 0.25, metalness: 0.3 }), [x, 1.45 * k + 0.2, z]);
  });
  [[0.6, 0.3, 2.6], [-1.2, 0.3, 2.3], [3.2, 0.3, 0.6]].forEach(([x, y, z]) => add(new THREE.DodecahedronGeometry(0.3), flat(0x818cf8), [x, y, z]));
  add(grad(cone(1.1, 1.6, 7), 0x3b3fc4, 0xa855f7), solid(), [-5.1, 0.9, 2.8], [Math.PI, 0, 0]);
  add(grad(cy(1.25, 1.1, 0.35), 0xeef0ff, 0xa5b4fc), solid(), [-5.1, 1.85, 2.8]);
  const g2 = grad(new THREE.OctahedronGeometry(0.45), 0xc084fc, 0x60a5fa); g2.scale(1, 1.9, 1);
  add(g2, solid({ roughness: 0.25, metalness: 0.3 }), [-5.1, 2.75, 2.8]);

  // 水晶球：玻璃殼（邊緣泛藍紫粉的光）＋高光，搭建完成後才罩上
  const R = 7.3;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uOpacity: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uOpacity; varying vec3 vN; varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(vN, vV)), 2.2);
        vec3 tint = mix(vec3(0.38, 0.55, 1.0), vec3(0.72, 0.45, 1.0), smoothstep(-0.6, 0.6, vN.y));
        tint = mix(tint, vec3(1.0, 0.62, 0.9), smoothstep(0.4, 1.0, vN.x) * 0.5);
        float hi = smoothstep(0.93, 0.985, dot(vN, normalize(vec3(-0.45, 0.6, 0.66))));
        float hi2 = smoothstep(0.975, 0.995, dot(vN, normalize(vec3(0.55, -0.45, 0.7)))) * 0.5;
        float spec = hi * 0.8 + hi2;
        gl_FragColor = vec4(mix(tint, vec3(1.0), spec), (0.04 + f * 0.85 + spec) * uOpacity);
      }`,
  }));
  ball.position.y = 0.3; ball.renderOrder = 5; scene.add(ball);
  // 底座：深靛色座台＋發光環
  const stand = new THREE.Group(); stand.position.y = 0.3 - R + 0.35; scene.add(stand);
  const s1 = new THREE.Mesh(grad(cy(2.6, 3.4, 0.9, 32), 0x4c3fb8, 0x1e1b4b), solid({ flatShading: false, roughness: 0.35, metalness: 0.5 }));
  s1.position.y = -0.55; stand.add(s1);
  const s2 = new THREE.Mesh(grad(cy(3.5, 3.9, 0.5, 32), 0x312e81, 0x1e1b4b), solid({ flatShading: false, roughness: 0.35, metalness: 0.5 }));
  s2.position.y = -1.2; stand.add(s2);
  const sRing = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.06, 8, 64), glow(0xc4b5fd));
  sRing.rotation.x = Math.PI / 2; sRing.position.y = -0.1; stand.add(sRing);
  stand.traverse((o) => { if (o.material) o.material.opacity = 0; });

  // 思緒雲：在水晶球外圈環繞，跟小島反方向慢慢轉
  const ring = new THREE.Group(); scene.add(ring);
  const clouds = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + (i % 3) * 0.2, r = 8.6 + (i % 3) * 0.6, s = 0.6 + ((i * 7) % 5) * 0.12;
    const c = new THREE.Group();
    c.position.set(Math.cos(a) * r, -3.8 + ((i * 5) % 9) * 1.1, Math.sin(a) * r);
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, transparent: true, opacity: 0.92 });
    [[0, 0, 0, 1], [0.95, -0.2, 0, 0.75], [-0.9, -0.25, 0.1, 0.7], [0.3, 0.45, -0.1, 0.6]].forEach(([x, y, z, k]) => {
      const p = new THREE.Mesh(grad(new THREE.IcosahedronGeometry(0.8 * k), 0xffffff, 0xc7b8ff), m); p.position.set(x, y, z); c.add(p);
    });
    c.scale.setScalar(0); c.userData = { s, y0: c.position.y };
    ring.add(c); clouds.push(c);
  }

  // 夢境光塵：球裡緩緩往上飄、會閃爍的粉彩光點
  const N = 140, dots = new Float32Array(N * 3), phase = new Float32Array(N), hue = new Float32Array(N * 3);
  const pastel = [0x60a5fa, 0xa78bfa, 0xf472b6, 0xffffff, 0x22d3ee].map((c) => new THREE.Color(c));
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 5;
    dots.set([Math.cos(a) * r, -5 + Math.random() * 10.5, Math.sin(a) * r], i * 3);
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
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC, a * vA * uOpacity); }`,
  });
  const sparks = new THREE.Points(dotGeo, dustMat); sparks.position.y = 0.3; scene.add(sparks);

  // 戴高紅帽的小居民
  const folk = [];
  function villager(shirt) {
    const v = new THREE.Group();
    [[cy(0.13, 0.19, 0.38, 8), flat(shirt), 0.19], [new THREE.IcosahedronGeometry(0.14, 1), flat(0xf3c9a5), 0.5],
      [cone(0.16, 0.62, 8), flat(0xef4444), 0.88], [new THREE.SphereGeometry(0.05, 8, 6), glow(0xfde68a), 1.2]]
      .forEach(([geo, m, y]) => { const p = new THREE.Mesh(geo, m); p.position.y = y; v.add(p); });
    v.scale.setScalar(0);
    island.add(v);
    return v;
  }
  [
    { shirt: 0x312e81, path: (t) => [Math.cos(t * 0.35) * 3.75, Math.sin(t * 0.35) * 3.75] },
    { shirt: 0xf5f6ff, path: (t) => [Math.cos(t * 0.35 + Math.PI) * 3.75, Math.sin(t * 0.35 + Math.PI) * 3.75] },
    { shirt: 0x22d3ee, path: (t) => [1.6 + Math.cos(-t * 0.6) * 1.5, 1.6 + Math.sin(-t * 0.6) * 1.5] },
    { shirt: 0x8b5cf6, path: (t) => [-1 + Math.sin(t * 0.5) * 1.2, 0.95] },
  ].forEach((f) => folk.push({ ...f, v: villager(f.shirt), last: null }));

  // 掃描環
  const scan = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.04, 8, 96), glow(0x67e8f9));
  scan.rotation.x = Math.PI / 2; scene.add(scan);

  const STEP = 0.06, DUR = 0.75, BUILD = parts.length * STEP + DUR;
  const outBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const clamp = (x) => Math.min(1, Math.max(0, x));
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
    scan.position.y = -7 + b * 10;
    scan.material.opacity = b < 1 ? 0.9 : Math.max(0, 0.9 - idle * 1.5);
    if (status) {
      status.innerHTML = b < 1 ? `AI 搭建中 <b>${Math.floor(b * 100)}%</b>` : "AI 搭建 <b>完成</b>";
      status.style.opacity = idle > 1.2 ? 0 : 1;
    }
    // 搭建完成後罩上水晶球
    const g = outBack(clamp((idle - 0.1) / 1.1));
    ball.material.uniforms.uOpacity.value = clamp((idle - 0.1) / 1.1);
    ball.scale.setScalar(0.92 + 0.08 * g);
    stand.traverse((o) => { if (o.material) o.material.opacity = clamp((idle - 0.1) / 0.8); });

    island.rotation.y = -0.5 + idle * 0.1;
    island.position.y = Math.sin(idle * 1.2) * 0.25;
    if (b >= 1) mill.rotation.z = idle * 1.5;

    ring.rotation.y = -t * 0.05;
    clouds.forEach((c, i) => {
      c.scale.setScalar(c.userData.s * outBack(clamp((t - i * 0.25) / 0.9)));
      c.position.y = c.userData.y0 + Math.sin(t * 0.6 + i) * 0.25;
    });

    dustMat.uniforms.uOpacity.value = b;
    dustMat.uniforms.uT.value = t;
    sparks.rotation.y = t * 0.03;
    for (let i = 0; i < N; i++) { let y = dots[i * 3 + 1] + 0.008; if (y > 5.5) y = -5; dots[i * 3 + 1] = y; }
    dotGeo.attributes.position.needsUpdate = true;

    folk.forEach((f, i) => {
      const k = clamp((idle - 0.3 - i * 0.35) / 0.5), w = idle * 1.2;
      const [x, z] = f.path(w), [nx, nz] = f.path(w + 0.05);
      f.v.scale.setScalar(1.2 * outBack(k));
      f.v.position.set(x, 0.22 + Math.abs(Math.sin(w * 9 + i)) * 0.07, z);
      f.v.rotation.set(0, Math.atan2(nx - x, nz - z), Math.sin(w * 9 + i) * 0.08);
    });
    renderer.render(scene, camera);
    raf = slide.classList.contains("active") && !reduce ? requestAnimationFrame(frame) : 0;
  }
  function play() { cancelAnimationFrame(raf); t0 = performance.now(); raf = requestAnimationFrame(frame); }

  new MutationObserver(() => { if (slide.classList.contains("active") && !raf) play(); })
    .observe(slide, { attributes: true, attributeFilter: ["class"] });
  if (slide.classList.contains("active")) play(); else { t0 = performance.now() - (BUILD + 3) * 1000; frame(performance.now()); }
})();
