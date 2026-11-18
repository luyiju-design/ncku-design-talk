/* p.43 仿今日工作台：卡片自動分類動畫（範例資料，不含真實工作） */
(function () {
  var TASKS = [
    { tag: '研究', title: '整理使用者訪談筆記', dir: 'r' },
    { tag: '溝通', title: '回覆 SA 的元件問題', dir: 'r' },
    { tag: '文件', title: '更新 Design Kit 說明', dir: 'l' },
    { tag: '會議', title: '準備週會簡報', dir: 'r' },
    { tag: '研究', title: '看競品 App 改版', dir: 'l' }
  ];
  var STEP = 1700;

  function setup(root) {
    var stack = root.querySelector('.wb-stack');
    var left = root.querySelector('[data-left]');
    var remain = root.querySelector('[data-remain]');
    var cols = { r: root.querySelector('.wb-col.today'), l: root.querySelector('.wb-col.later') };
    var timers = [];
    var running = false;

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function clear() { timers.forEach(clearTimeout); timers = []; }

    function reset() {
      stack.innerHTML = '';
      root.classList.remove('done');
      TASKS.slice().reverse().forEach(function (t, i) {
        var c = document.createElement('div');
        c.className = 'wb-card';
        c.innerHTML = '<span class="wb-tag">' + t.tag + '</span><b>' + t.title + '</b>' +
          '<i class="wb-stamp r">今天做</i><i class="wb-stamp l">延後</i>';
        stack.appendChild(c);
      });
      ['r', 'l'].forEach(function (k) {
        cols[k].querySelector('ul').innerHTML = '';
        cols[k].querySelector('h4 b').textContent = '0';
        root.querySelector('[data-sum-' + k + ']').textContent = '0';
      });
      left.textContent = TASKS.length;
      remain.textContent = TASKS.length;
    }

    function play() {
      reset();
      TASKS.forEach(function (t, i) {
        var at = 900 + i * STEP;
        later(function () {
          var cards = stack.querySelectorAll('.wb-card:not(.out)');
          var card = cards[cards.length - 1];
          if (!card) return;
          card.classList.add('lean-' + t.dir);
          later(function () { card.classList.add('out'); }, 550);
          later(function () {
            card.remove();
            var li = document.createElement('li');
            li.textContent = t.title;
            cols[t.dir].querySelector('ul').appendChild(li);
            var n = cols[t.dir].querySelector('h4 b');
            n.textContent = +n.textContent + 1;
            left.textContent = TASKS.length - i - 1;
            remain.textContent = TASKS.length - i - 1;
            var sum = root.querySelector('[data-sum-' + t.dir + ']');
            sum.textContent = n.textContent;
          }, 950);
        }, at);
      });
      var end = 900 + TASKS.length * STEP;
      later(function () { root.classList.add('done'); }, end);
      later(play, end + 3200);
    }

    function sync() {
      var slide = root.closest('.slide');
      var on = slide && slide.classList.contains('active');
      if (on && !running) { running = true; clear(); play(); }
      else if (!on && running) { running = false; clear(); reset(); }
    }

    reset();
    var slide = root.closest('.slide');
    if (slide) new MutationObserver(sync).observe(slide, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  function init() { document.querySelectorAll('.wb-anim').forEach(setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
