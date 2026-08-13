(function () {
  // Back to top
  var btn = document.createElement('button');
  btn.className = 'back-top';
  btn.innerHTML = '↑';
  btn.setAttribute('aria-label', '回到顶部');
  document.body.appendChild(btn);

  var show = function () {
    btn.classList.toggle('show', window.scrollY > 400);
  };
  window.addEventListener('scroll', show, { passive: true });
  show();

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

(function () {
  var list = document.getElementById('post-list');
  if (!list) return;
  var cards = Array.prototype.slice.call(list.querySelectorAll('.post-card'));
  if (!cards.length) return;

  var perPageSel = document.getElementById('per-page-select');
  var info = document.getElementById('pagination-info');
  var prevBtn = document.getElementById('page-prev');
  var nextBtn = document.getElementById('page-next');
  var numbers = document.getElementById('page-numbers');
  var jumpInput = document.getElementById('jump-input');
  var jumpBtn = document.getElementById('jump-btn');

  var perPage = 5;
  var current = 1;
  var KEY = 'blog-per-page';

  // 从 URL 或本地存储恢复设置
  var qs = new URLSearchParams(location.search);
  if (qs.has('per_page')) perPage = qs.get('per_page') === 'all' ? 0 : parseInt(qs.get('per_page'), 10) || 5;
  else if (localStorage.getItem(KEY)) perPage = parseInt(localStorage.getItem(KEY), 10) || 5;
  if (perPage < 0) perPage = 0;
  perPageSel.value = String(perPage);

  function totalPages() {
    return perPage === 0 ? 1 : Math.max(1, Math.ceil(cards.length / perPage));
  }

  function render() {
    var total = totalPages();
    if (current > total) current = total;
    if (current < 1) current = 1;

    var start = perPage === 0 ? 0 : (current - 1) * perPage;
    var end = perPage === 0 ? cards.length : start + perPage;

    cards.forEach(function (c, i) {
      c.style.display = (i >= start && i < end) ? '' : 'none';
    });

    info.textContent = '共 ' + cards.length + ' 篇 · 第 ' + current + ' / ' + total + ' 页';

    prevBtn.disabled = current <= 1;
    nextBtn.disabled = current >= total;

    numbers.innerHTML = '';
    for (var i = 1; i <= total; i++) {
      (function (n) {
        var b = document.createElement('button');
        b.className = 'page-btn page-num' + (n === current ? ' active' : '');
        b.textContent = n;
        b.addEventListener('click', function () { current = n; render(); });
        numbers.appendChild(b);
      })(i);
    }

    jumpInput.max = total;
    jumpInput.value = current;

    var nextUrl = location.pathname;
    var params = new URLSearchParams(location.search);
    if (perPage === 5) params.delete('per_page');
    else if (perPage === 0) params.set('per_page', 'all');
    else params.set('per_page', String(perPage));
    var q = params.toString();
    history.replaceState(null, '', nextUrl + (q ? '?' + q : ''));
  }

  perPageSel.addEventListener('change', function () {
    var v = perPageSel.value;
    perPage = v === '0' ? 0 : parseInt(v, 10);
    current = 1;
    localStorage.setItem(KEY, String(perPage));
    render();
  });

  prevBtn.addEventListener('click', function () { if (current > 1) { current--; render(); } });
  nextBtn.addEventListener('click', function () { if (current < totalPages()) { current++; render(); } });

  jumpBtn.addEventListener('click', function () {
    var n = parseInt(jumpInput.value, 10);
    if (!isNaN(n) && n >= 1) { current = Math.min(n, totalPages()); render(); }
  });
  jumpInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') jumpBtn.click();
  });

  render();
})();