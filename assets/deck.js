/* 設計思考與 AI 講座 — deck runtime: navigation, builds, activity timers, pacing, presenter window, live poll */
(() => {
  const POLL_URL = "https://live-poll.luju.workers.dev";
  const START_CLOCK = { h: 14, m: 0 }; // planned start, used for the schedule labels
  const SECTIONS = [
    { id: "open", name: "開場", start: 0, dur: 5 },
    { id: "intro", name: "自我介紹", start: 5, dur: 3 },
    { id: "dt", name: "設計思考", start: 8, dur: 24 },
    { id: "case", name: "專案實戰", start: 32, dur: 10 },
    { id: "ai1", name: "AI 提升個人效率", start: 42, dur: 6 },
    { id: "ai2", name: "AI 串起團隊", start: 48, dur: 3 },
    { id: "break", name: "中場休息", start: 51, dur: 10 },
    { id: "mind", name: "AI 時代的設計師", start: 61, dur: 7 },
    { id: "bob", name: "SkillsBuild & Bob", start: 68, dur: 20 },
    { id: "qa", name: "Q&A", start: 88, dur: 32 },
  ];
  const SEC = Object.fromEntries(SECTIONS.map((s, i) => [s.id, { ...s, index: i }]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("deck." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("deck." + k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem("deck." + k); } catch {} },
  };

  const isPresenter = new URLSearchParams(location.search).has("presenter");
  // Two windows opened separately (no window.opener) still sync through this channel
  let chan = null; try { chan = new BroadcastChannel("deck-sync"); } catch {}
  // 每個簡報分頁有自己的編號（重新整理不變），主持人視窗只跟打開它的那個分頁同步，
  // 同網址開兩個分頁時才不會互相干擾、畫面閃跳
  let deckId = "";
  if (!isPresenter) {
    try { deckId = sessionStorage.getItem("deckId") || ""; } catch {}
    if (!deckId) { deckId = Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem("deckId", deckId); } catch {} }
  }
  const stage = document.getElementById("stage");
  const slides = [...stage.querySelectorAll(".slide")];
  const fmt = (sec) => { sec = Math.max(0, Math.round(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
  const clock = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const planClock = (min) => { const t = START_CLOCK.h * 60 + START_CLOCK.m + min; return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };

  // Stagger index for entrance animation
  slides.forEach((s) => s.querySelectorAll(".r").forEach((el, i) => el.style.setProperty("--i", i)));

  // QR codes for the live poll
  const qrSvg = (text) => { const q = qrcode(0, "M"); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 8, margin: 0, scalable: true, alt: "加入互動的 QR code" }); };
  document.querySelectorAll("[data-qr]").forEach((el) => { el.innerHTML = qrSvg(POLL_URL); });
  document.querySelectorAll("[data-poll-host]").forEach((el) => { el.textContent = POLL_URL.replace(/^https?:\/\//, ""); });

  // ---------- Activity timers (shown to the audience) ----------
  const timers = new Map(); // slide -> timer state
  slides.forEach((slide, si) => {
    const el = slide.querySelector(".timer");
    if (!el) return;
    const total = Number(el.dataset.timer);
    const R = 270, C = 2 * Math.PI * R;
    el.innerHTML = `<svg viewBox="0 0 600 600" aria-hidden="true"><defs><linearGradient id="tg${si}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b8ff0"/><stop offset="1" stop-color="#1f4fa8"/></linearGradient></defs><circle class="track" cx="300" cy="300" r="${R}"/><circle class="prog" cx="300" cy="300" r="${R}" stroke="url(#tg${si})" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><div class="face"></div><div class="read"><div class="digits">${fmt(total)}</div><div class="hint">按 → 開始倒數</div></div>`;
    const t = { el, total, orig: total, planned: total, remaining: total, started: false, running: false, endAt: 0, done: false, C, isBreak: el.hasAttribute("data-break"), slide };
    timers.set(slide, t);
    el.addEventListener("click", (e) => { e.stopPropagation(); toggleTimer(t); });
  });
  function paintTimer(t) {
    const rem = t.running ? (t.endAt - Date.now()) / 1000 : t.remaining;
    const shown = Math.max(0, Math.ceil(rem));
    t.el.querySelector(".digits").textContent = fmt(shown);
    t.el.querySelector(".prog").style.strokeDashoffset = String(t.C * (1 - Math.max(0, rem) / t.total));
    t.el.querySelector(".hint").textContent = t.done ? "時間到！· 0 重來" : t.running ? "倒數中 · Enter 暫停 · 0 重來" : t.started ? "已暫停 · Enter 繼續 · 0 重來" : "按 → 開始倒數";
    t.el.classList.toggle("running", t.running);
    t.el.classList.toggle("low", t.running && rem <= 30);
    t.el.classList.toggle("done", t.done);
    t.slide.classList.toggle("timer-started", t.started);
    // 分段提示：步驟清單依剩餘時間自動亮起目前該做的那一步
    const phased = [...t.slide.querySelectorAll("[data-phase]")];
    if (phased.length) {
      const live = t.started && !t.done;
      const left = Math.max(0, rem);
      const cur = live ? phased.filter((li) => Number(li.dataset.phase) >= left).sort((a, b) => a.dataset.phase - b.dataset.phase)[0] : null;
      phased[0].parentElement.classList.toggle("phased", !!cur);
      phased.forEach((li) => li.classList.toggle("cur", li === cur));
    }
    if (t.isBreak) {
      const back = t.slide.querySelector("[data-back]");
      const mins = Math.round(t.planned / 60);
      const endAt = t.running ? t.endAt : Date.now() + t.remaining * 1000;
      if (back) back.innerHTML = t.done ? "準備開始下半場" : `<small>休息 ${mins} 分鐘</small>${t.running ? "" : "預計 "}${clock(new Date(endAt))} 回來`;
    }
  }
  function startTimer(t) { if (t.done) resetTimer(t); t.slide.classList.remove("guide-open"); t.started = true; t.running = true; t.endAt = Date.now() + t.remaining * 1000; unlockAudio(); paintTimer(t); broadcast(); }
  function pauseTimer(t) { t.remaining = Math.max(0, (t.endAt - Date.now()) / 1000); t.running = false; paintTimer(t); broadcast(); }
  function toggleTimer(t) { t.running ? pauseTimer(t) : startTimer(t); }
  function resetTimer(t) { t.started = false; t.running = false; t.done = false; t.remaining = t.total = t.planned = t.orig; paintTimer(t); broadcast(); }
  function nudgeTimer(t, sec) {
    if (t.running) t.endAt += sec * 1000; else t.remaining = Math.max(0, t.remaining + sec);
    t.planned = Math.max(60, t.planned + sec);
    // 還沒開始：總長＝調整後的時間（圈是滿的）；倒數中：圈不倒退
    t.total = !t.started ? Math.max(1, t.remaining) : Math.max(t.total, t.running ? (t.endAt - Date.now()) / 1000 : t.remaining);
    t.done = false; paintTimer(t); broadcast();
  }
  timers.forEach(paintTimer);
  setInterval(() => {
    timers.forEach((t) => {
      if (!t.running) { if (t.isBreak) paintTimer(t); return; }
      if (Date.now() >= t.endAt) { t.running = false; t.remaining = 0; t.done = true; chime(); broadcast(); }
      paintTimer(t);
    });
  }, 250);

  let actx = null;
  function unlockAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch {} }
  function chime() {
    if (!actx) return;
    [0, .28, .56].forEach((d, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), at = actx.currentTime + d;
      o.type = "sine"; o.frequency.value = [880, 1108.7, 1318.5][i];
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.28, at + .02); g.gain.exponentialRampToValueAtTime(.001, at + 1.1);
      o.connect(g).connect(actx.destination); o.start(at); o.stop(at + 1.2);
    });
  }

  // Small static copies of slides (overview + presenter window)
  function stripVideos(root) { root.querySelectorAll("video").forEach((v) => { v.removeAttribute("src"); v.load(); }); }
  function miniStage(slide) {
    const st = document.createElement("div"); st.className = "stage";
    const c = slide.cloneNode(true); c.classList.add("active"); c.querySelectorAll(".step").forEach((el) => el.classList.add("on"));
    stripVideos(c); st.append(c); return st;
  }
  function fitMinis() { document.querySelectorAll(".mini").forEach((f) => f.style.setProperty("--k", f.clientWidth / 1600)); }

  // ---------- Presenter window ----------
  if (isPresenter) { initPresenter(); return; }

  // ---------- Navigation ----------
  let idx = Math.min(slides.length - 1, Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1));
  const shownSteps = slides.map(() => 0);
  const stepsOf = (s) => [...s.querySelectorAll(".step")];

  function render() {
    slides.forEach((s, i) => s.classList.toggle("active", i === idx));
    const s = slides[idx];
    stepsOf(s).forEach((el, i) => el.classList.toggle("on", i < shownSteps[idx]));
    slides.forEach((other, i) => { if (i !== idx) { const v = other.querySelector("video:not(.loop)"); if (v && !v.paused) v.pause(); } });
    slides.forEach((other, i) => other.querySelectorAll("video.loop").forEach((lv) => { if (i === idx) { if (lv.paused) lv.play().catch(() => {}); } else if (!lv.paused) lv.pause(); }));
    document.getElementById("pageNo").textContent = `${idx + 1} / ${slides.length}`;
    history.replaceState(null, "", "#" + (idx + 1));
    enterSection(s.dataset.section);
    paintPace();
    broadcast();
  }
  function next() {
    const s = slides[idx], steps = stepsOf(s);
    const t = timers.get(s);
    // 標 .pre 的步驟在開始倒數前先出現（例：p.28 便利貼擺法示意圖）
    const preCount = steps.filter((el) => el.classList.contains("pre")).length;
    if (t && shownSteps[idx] < preCount) { shownSteps[idx]++; s.classList.add("guide-open"); render(); return; }
    // 倒數已開始時重新打開了示意圖：→ 先收起示意圖，不換頁
    if (t && s.classList.contains("guide-open") && t.started) { s.classList.remove("guide-open"); return; }
    if (t && !t.started) { startTimer(t); return; }
    const v = s.querySelector("video:not(.loop)");
    if (v && v.paused && !v.ended && v.currentTime === 0) { playVideo(s); return; }
    if (shownSteps[idx] < steps.length) { shownSteps[idx]++; render(); return; }
    if (idx < slides.length - 1) {
      if (idx === 0 && !talkStart) startTalk();
      idx++; shownSteps[idx] = 0; render();
    }
  }
  function prev() {
    if (shownSteps[idx] > 0) { shownSteps[idx]--; if (!shownSteps[idx]) slides[idx].classList.remove("guide-open"); render(); return; }
    if (idx > 0) { idx--; shownSteps[idx] = stepsOf(slides[idx]).length; render(); }
  }
  function go(i) { idx = Math.min(slides.length - 1, Math.max(0, i)); shownSteps[idx] = 0; if (idx > 0 && !talkStart) startTalk(); render(); }

  // Video
  function playVideo(s) {
    const v = s.querySelector("video:not(.loop)");
    v.controls = true; v.play(); s.classList.add("playing");
  }
  slides.forEach((s) => {
    const v = s.querySelector("video:not(.loop)"); if (!v) return;
    s.querySelector("[data-play]").addEventListener("click", (e) => { e.stopPropagation(); playVideo(s); });
    v.addEventListener("click", (e) => e.stopPropagation());
    v.addEventListener("ended", () => { s.classList.remove("playing"); v.controls = false; });
  });

  // ---------- Pacing (for the speaker) ----------
  let talkStart = store.get("talkStart", null);
  let secEnter = store.get("secEnter", {});
  // A rehearsal from hours ago should not carry into the real talk
  if (talkStart && Date.now() - talkStart > 4 * 3600e3) { talkStart = null; secEnter = {}; store.del("talkStart"); store.del("secEnter"); }
  function startTalk() { talkStart = Date.now(); secEnter = {}; store.set("talkStart", talkStart); store.set("secEnter", secEnter); enterSection(slides[idx].dataset.section); }
  function enterSection(id) { if (!talkStart || secEnter[id]) return; secEnter[id] = Date.now(); store.set("secEnter", secEnter); }
  function pacing() {
    const sec = SEC[slides[idx].dataset.section];
    if (!talkStart) return { sec, started: false };
    const now = Date.now();
    const elapsed = (now - talkStart) / 1000;
    const inSec = secEnter[sec.id] ? (now - secEnter[sec.id]) / 1000 : 0;
    const planned = sec.start * 60 + Math.min(inSec, sec.dur * 60);
    return { sec, started: true, elapsed, inSec, budget: sec.dur * 60, delta: elapsed - planned };
  }
  const pace = document.getElementById("pace");
  let paceOn = store.get("paceOn", true);
  function paintPace() {
    const at = slides[idx].dataset.at;
    pace.hidden = !paceOn || !at;
    if (pace.hidden) return;
    document.getElementById("paceTime").textContent = at;
  }
  setInterval(() => { paintPace(); broadcast(); }, 1000);

  // ---------- Presenter link ----------
  let presenter = null;
  // P toggles: opens the presenter window, or closes it if it is already open
  function togglePresenter() {
    if (presenter && !presenter.closed) { presenter.close(); presenter = null; return; }
    const url = location.href.split("#")[0].split("?")[0] + "?presenter&deck=" + deckId;
    presenter = window.open(url, "deck-presenter", "width=1280,height=800");
    setTimeout(broadcast, 600);
  }
  function snapshot() {
    const s = slides[idx], t = timers.get(s);
    return {
      type: "state", from: deckId, idx, step: shownSteps[idx], steps: stepsOf(s).length, talkStart, secEnter,
      timer: t ? { running: t.running, done: t.done, remaining: t.running ? (t.endAt - Date.now()) / 1000 : t.remaining, total: t.total } : null,
    };
  }
  function broadcast() {
    const snap = snapshot();
    if (presenter && !presenter.closed) presenter.postMessage(snap, "*");
    if (chan) chan.postMessage(snap);
  }
  if (chan) chan.onmessage = (e) => {
    const m = e.data || {};
    // 只處理指名給這個分頁的指令；還沒綁定的主持人視窗送來的 hello 才大家都回
    if (m.to && m.to !== deckId) return;
    handle(m);
  };
  window.addEventListener("message", (e) => {
    // A presenter window that outlived a reload of this page reconnects with "hello"
    if (!presenter || presenter.closed || e.source !== presenter) {
      if (e.data && e.data.type === "hello" && e.source) presenter = e.source; else return;
    }
    if (e.data && e.data.type === "bye") { presenter = null; return; }
    handle(e.data || {});
  });
  function handle(m) {
    const t = timers.get(slides[idx]);
    if (m.type === "hello") broadcast();
    if (m.type === "next") next();
    if (m.type === "prev") prev();
    if (m.type === "go") go(m.idx);
    if (m.type === "timer" && t) ({ toggle: () => toggleTimer(t), reset: () => resetTimer(t), plus: () => nudgeTimer(t, 60), minus: () => nudgeTimer(t, -60) })[m.action]?.();
    if (m.type === "restart") { startTalk(); render(); }
    if (m.type === "guide") toggleGuide();
  }

  // ---------- Live poll results overlay ----------
  const results = document.getElementById("results"), frame = document.getElementById("resultsFrame"), setup = document.getElementById("resultsSetup");
  function openResults() {
    let host = store.get("pollHost", "");
    if (host && !host.startsWith(POLL_URL)) { host = ""; store.set("pollHost", ""); }
    results.hidden = false;
    setup.hidden = !!host; frame.hidden = !host;
    if (host && frame.src !== host) frame.src = host;
    if (!host) document.getElementById("hostUrl").focus();
  }
  function closeResults() { results.hidden = true; }
  setup.addEventListener("submit", (e) => { e.preventDefault(); const raw = document.getElementById("hostUrl").value.trim(); store.set("pollHost", /^https?:/.test(raw) ? raw : POLL_URL + "/host?key=" + encodeURIComponent(raw)); openResults(); });
  document.getElementById("resultsClose").addEventListener("click", closeResults);
  document.querySelectorAll("[data-open-results]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); openResults(); }));

  // ---------- Input ----------
  const help = document.getElementById("help");
  document.addEventListener("keydown", (e) => {
    if (e.target.closest?.("input")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const s = slides[idx], t = timers.get(s), v = s.querySelector("video:not(.loop)");
    const k = e.key;
    if (!results.hidden) { if (k === "Escape" || k === "v" || k === "V") closeResults(); return; }
    if (!overview.hidden) { overviewKey(e); return; }
    if (k === "g" || k === "G") { openOverview(); return; }
    if (!help.hidden && k !== "?") { help.hidden = true; }
    if (["ArrowRight", "PageDown", "ArrowDown", " "].includes(k)) { e.preventDefault(); if (k === " " && v && !v.paused) { v.pause(); return; } next(); }
    else if (["ArrowLeft", "PageUp", "ArrowUp", "Backspace"].includes(k)) { e.preventDefault(); prev(); }
    else if (k === "Enter") { if (t) toggleTimer(t); else if (v) { v.paused ? playVideo(s) : v.pause(); } }
    else if ((k === "+" || k === "=") && t) nudgeTimer(t, 60);
    else if ((k === "-" || k === "_") && t) nudgeTimer(t, -60);
    else if (k === "0" && t) resetTimer(t);
    else if (k === "b" || k === "B") toggleGuide();
    else if (k === "Home") go(0);
    else if (k === "End") go(slides.length - 1);
    else if (k === "f" || k === "F") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
    else if (k === "p" || k === "P") togglePresenter();
    else if (k === "t" || k === "T") { paceOn = !paceOn; store.set("paceOn", paceOn); paintPace(); }
    else if (k === "v" || k === "V") { if (s.hasAttribute("data-poll")) openResults(); }
    else if (k === "s" || k === "S") { startTalk(); render(); }
    else if (k === "?" || k === "h" || k === "H") help.hidden = !help.hidden;
  });
  // p.28 便利貼擺法：隨時打開／收起示意圖；倒數重來
  function toggleGuide() { const s = slides[idx]; if (!s.querySelector(".wall-guide")) return; s.classList.toggle("guide-open"); }
  stage.addEventListener("click", (e) => {
    if (e.target.closest("[data-guide], .wall-guide")) { toggleGuide(); return; }
    if (e.target.closest("[data-reset]")) { const t = timers.get(slides[idx]); if (t) resetTimer(t); return; }
    if (e.target.closest("button, a, video, .timer")) return; next();
  });

  // ---------- Overview: every slide at a glance, grouped by section ----------
  const overview = document.getElementById("overview"), ovBody = document.getElementById("ovBody");
  let ovItems = [], ovSel = 0;
  function buildOverview() {
    ovBody.innerHTML = SECTIONS.map((sec) => {
      const items = slides.map((s, i) => [s, i]).filter(([s]) => s.dataset.section === sec.id);
      return `<section class="ov-sec"><h3>${sec.name}<span>${planClock(sec.start)}–${planClock(sec.start + sec.dur)} · ${sec.dur} 分</span></h3><div class="ov-grid">${items.map(([s, i]) => `<button class="ov-item" data-i="${i}"><div class="ov-thumb mini"></div><span><b>${i + 1}</b>${s.dataset.title || ""}</span></button>`).join("")}</div></section>`;
    }).join("");
    ovItems = [...ovBody.querySelectorAll(".ov-item")];
    ovItems.forEach((btn) => btn.querySelector(".ov-thumb").append(miniStage(slides[Number(btn.dataset.i)])));
  }
  function openOverview() {
    if (!ovItems.length) buildOverview();
    overview.hidden = false;
    fitMinis();
    ovSel = idx; markOverview(true);
  }
  function closeOverview() { overview.hidden = true; }
  function markOverview(scroll) {
    ovItems.forEach((b) => { b.classList.toggle("cur", Number(b.dataset.i) === idx); b.classList.toggle("sel", Number(b.dataset.i) === ovSel); });
    if (scroll) ovItems[ovSel].scrollIntoView({ block: "center" });
  }
  function overviewKey(e) {
    const k = e.key, perRow = Math.max(1, Math.round(ovBody.querySelector(".ov-grid").clientWidth / ovItems[0].offsetWidth));
    if (k === "Escape" || k === "g" || k === "G") { closeOverview(); return; }
    if (k === "Enter" || k === " ") { e.preventDefault(); closeOverview(); go(ovSel); return; }
    const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: perRow, ArrowUp: -perRow }[k];
    if (d) { e.preventDefault(); ovSel = Math.min(slides.length - 1, Math.max(0, ovSel + d)); markOverview(true); }
  }
  ovBody.addEventListener("click", (e) => { const b = e.target.closest(".ov-item"); if (!b) return; closeOverview(); go(Number(b.dataset.i)); });
  document.getElementById("ovClose").addEventListener("click", closeOverview);
  addEventListener("resize", () => { if (!overview.hidden) fitMinis(); });

  // Scale + idle cursor
  function fit() { document.documentElement.style.setProperty("--scale", Math.min(innerWidth / 1600, innerHeight / 900)); }
  addEventListener("resize", fit); fit();
  let idleT; const wake = () => { document.body.classList.remove("idle"); clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.add("idle"), 2500); };
  addEventListener("mousemove", wake); wake();

  // ---------- Exit full screen: appears with the mouse, hides with the idle cursor ----------
  const exitFs = document.createElement("button");
  exitFs.type = "button"; exitFs.className = "exit-fs pill"; exitFs.hidden = true;
  exitFs.innerHTML = "✕ 離開全螢幕 <kbd>F</kbd>";
  document.body.appendChild(exitFs);
  exitFs.addEventListener("click", () => { exitFs.blur(); document.exitFullscreen(); });
  document.addEventListener("fullscreenchange", () => { exitFs.hidden = !document.fullscreenElement; });

  render();
  window.deck = { go, next, prev };

  // ============ Presenter view ============
  function initPresenter() {
    document.body.classList.add("presenter");
    document.title = "講者視窗 · 設計思考與 AI 講座";
    const opener = window.opener;
    const pv = document.createElement("div");
    pv.className = "pv";
    pv.innerHTML = `
      <div class="pv-top">
        <button class="pv-exit" id="pvExit" type="button">✕ 關閉講者視窗</button>
        <div class="pv-clock" id="pvClock"></div>
        <div class="pv-stat"><small>已講</small><b id="pvElapsed">—</b></div>
        <div class="pv-stat"><small>本段</small><b id="pvSec">—</b></div>
        <div class="pv-stat"><small>整體進度</small><b class="pv-delta" id="pvDelta">尚未開始</b></div>
        <div class="pv-stat"><small>頁數</small><b id="pvPage">—</b></div>
        <span class="sp"></span>
        <button class="pv-btn" data-cmd="prev">← 上一步</button>
        <button class="pv-btn" data-cmd="next">下一步 →</button>
        <button class="pv-btn" data-cmd="restart" title="從現在開始重新計時">計時歸零</button>
      </div>
      <div class="pv-main">
        <div class="pv-label" id="pvCurLabel">目前</div>
        <div class="pv-frame mini" id="pvCur"></div>
        <div class="pv-timer" id="pvTimer" hidden><span class="pv-label">活動倒數</span><b id="pvTimerVal"></b><span class="sp" style="flex:1"></span>
          <button class="pv-btn" data-timer="minus">−1 分</button><button class="pv-btn" data-timer="toggle" id="pvTimerBtn">開始</button><button class="pv-btn" data-timer="plus">+1 分</button><button class="pv-btn" data-timer="reset">重設</button><button class="pv-btn" data-pvguide>擺法</button></div>
      </div>
      <div class="pv-side">
        <div class="pv-label">下一頁</div>
        <div class="pv-frame mini pv-next" id="pvNext"></div>
        <div class="pv-notes" id="pvNotes"></div>
      </div>
      <div class="pv-sections" id="pvSections"></div>`;
    document.body.append(pv);

    const mk = (host) => { const st = stage.cloneNode(true); st.removeAttribute("id"); stripVideos(st); host.append(st); return st; };
    const cur = mk(document.getElementById("pvCur")), nxt = mk(document.getElementById("pvNext"));
    const curSlides = [...cur.querySelectorAll(".slide")], nxtSlides = [...nxt.querySelectorAll(".slide")];
    const fitFrames = fitMinis;
    addEventListener("resize", fitFrames); fitFrames();

    const secBox = document.getElementById("pvSections");
    secBox.innerHTML = SECTIONS.map((s) => `<button class="pv-sec" data-sec="${s.id}" style="--d:${s.dur}" title="跳到這一段的第一頁"><b>${s.name}</b><span>${planClock(s.start)}–${planClock(s.start + s.dur)}</span><i></i></button>`).join("");

    let st = null;
    // 綁定一個簡報分頁：按 P 開的會帶 deck 編號；自己開的就綁第一個回應的分頁
    let bound = new URLSearchParams(location.search).get("deck") || "";
    const send = (m) => { if (bound) m.to = bound; if (opener && !opener.closed) opener.postMessage(m, "*"); else if (chan) chan.postMessage(m); };
    pv.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.cmd) send({ type: b.dataset.cmd });
      if (b.dataset.timer) send({ type: "timer", action: b.dataset.timer });
      if (b.hasAttribute("data-pvguide")) send({ type: "guide" });
      if (b.dataset.sec) send({ type: "go", idx: slides.findIndex((s) => s.dataset.section === b.dataset.sec) });
    });
    document.addEventListener("keydown", (e) => {
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); send({ type: "next" }); }
      if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); send({ type: "prev" }); }
      if (e.key === "Enter") send({ type: "timer", action: "toggle" });
      if (e.key === "0") send({ type: "timer", action: "reset" });
      if (e.key === "b" || e.key === "B") send({ type: "guide" });
      // P again closes this window and hands control back to the slides
      if (e.key === "p" || e.key === "P") { send({ type: "bye" }); window.close(); }
    });
    const hasOpener = () => opener && !opener.closed;
    // 有打開它的簡報視窗：只聽那個視窗（新舊程式都相容）；沒有才用頻道並綁定一個分頁
    const onState = (d, viaOpener) => {
      if (!d || d.type !== "state") return;
      if (!viaOpener) { if (hasOpener()) return; if (!bound && d.from) bound = d.from; if (bound && d.from !== bound) return; }
      st = d; st.at = Date.now(); paint(); };
    window.addEventListener("message", (e) => { if (e.source === opener) onState(e.data, true); });
    if (chan) chan.onmessage = (e) => onState(e.data, false);
    document.getElementById("pvExit").addEventListener("click", (e) => { e.stopPropagation(); send({ type: "bye" }); window.close(); });
    addEventListener("beforeunload", () => send({ type: "bye" }));
    send({ type: "hello" });
    // Reconnect if the slides window was reloaded
    setInterval(() => { if (!st || Date.now() - st.at > 3000) send({ type: "hello" }); }, 2000);
    setInterval(paint, 500);

    function paint() {
      document.getElementById("pvClock").textContent = clock(new Date());
      if (!st) return;
      const i = st.idx, s = slides[i];
      curSlides.forEach((el, k) => { el.classList.toggle("active", k === i); el.style.display = k === i ? "" : "none"; });
      [...curSlides[i].querySelectorAll(".step")].forEach((el, k) => el.classList.toggle("off", k >= st.step));
      nxtSlides.forEach((el, k) => { el.classList.toggle("active", k === i + 1); el.style.display = k === i + 1 ? "" : "none"; });
      document.getElementById("pvCurLabel").textContent = `目前 · ${s.dataset.title || ""}${st.steps ? `（步驟 ${st.step}/${st.steps}）` : ""}`;
      document.getElementById("pvPage").textContent = `${i + 1} / ${slides.length}`;
      const notes = s.querySelector(".notes");
      const nextTitle = slides[i + 1] ? slides[i + 1].dataset.title : "（最後一頁）";
      document.getElementById("pvNotes").innerHTML = `<h4>${s.dataset.title || ""}</h4><div class="pv-cue">${notes ? notes.innerHTML : "（沒有備註）"}</div><p style="margin-top:14px;color:#8aa0b8">下一頁：${nextTitle}</p>`;
      fitFrames();

      // Pacing
      const sec = SEC[s.dataset.section], now = Date.now();
      secBox.querySelectorAll(".pv-sec").forEach((el) => {
        const k = SEC[el.dataset.sec].index;
        el.classList.toggle("done", k < sec.index); el.classList.toggle("cur", k === sec.index);
      });
      if (st.talkStart) {
        const elapsed = (now - st.talkStart) / 1000;
        const inSec = st.secEnter[sec.id] ? (now - st.secEnter[sec.id]) / 1000 : 0;
        const budget = sec.dur * 60, r = inSec / budget;
        const delta = elapsed - (sec.start * 60 + Math.min(inSec, budget));
        document.getElementById("pvElapsed").textContent = fmt(elapsed);
        document.getElementById("pvSec").textContent = `${fmt(inSec)} / ${fmt(budget)}　${inSec > budget ? `超時 ${fmt(inSec - budget)}` : `剩 ${fmt(budget - inSec)}`}`;
        const d = document.getElementById("pvDelta");
        d.textContent = Math.abs(delta) < 60 ? "準時" : delta > 0 ? `落後 ${fmt(delta)}` : `超前 ${fmt(-delta)}`;
        d.className = "pv-delta " + (delta >= 60 ? "behind" : delta <= -60 ? "ahead" : "");
        const curEl = secBox.querySelector(".pv-sec.cur");
        curEl.querySelector("i").style.width = Math.min(100, r * 100) + "%";
        curEl.classList.toggle("warn", r >= .85 && r < 1); curEl.classList.toggle("over", r >= 1);
      }

      // Activity timer
      const tBox = document.getElementById("pvTimer");
      tBox.hidden = !st.timer;
      if (st.timer) {
        const rem = st.timer.running ? st.timer.remaining - (now - st.at) / 1000 : st.timer.remaining;
        document.getElementById("pvTimerVal").textContent = st.timer.done ? "時間到" : fmt(Math.ceil(Math.max(0, rem)));
        document.getElementById("pvTimerBtn").textContent = st.timer.running ? "暫停" : "開始";
      }
    }
  }
})();
