(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const prefix = document.body.dataset.base || '';
  const read = (key, fallback) => {
    try { return localStorage.getItem('nightlog-' + key) ?? fallback; }
    catch { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem('nightlog-' + key, value); return true; }
    catch { return false; }
  };
  let timer;
  function notice(message) {
    clearTimeout(timer);
    $('#notice').textContent = message;
    timer = setTimeout(() => { $('#notice').textContent = ''; }, 2200);
  }
  function syncThemeLabel() {
    const next = document.documentElement.dataset.theme === 'light' ? '深色' : '浅色';
    $('.theme').setAttribute('aria-label', '切换到' + next + '主题');
  }
  syncThemeLabel();
  $('.theme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    write('theme', next);
    syncThemeLabel();
  });
  const dialog = $('#search-dialog');
  const input = $('#query');
  const searchIndex = window.NIGHTLOG_SEARCH || [];
  function search() {
    const terms = input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const matches = searchIndex.map(post => {
      const title = post.title.toLowerCase();
      const tags = [post.category, ...post.tags].join(' ').toLowerCase();
      const haystack = [title, tags, post.description, post.body].join(' ').toLowerCase();
      const score = terms.reduce((sum, term) => sum + (title.includes(term)?4:tags.includes(term)?2:0), 0);
      return { post, score, match: terms.every(term => haystack.includes(term)) };
    }).filter(row => row.match).sort((a,b) => b.score - a.score);
    const result = $('#search-results');
    result.replaceChildren();
    const hint = document.createElement('p');
    hint.className = 'search-hint';
    hint.textContent = terms.length ? (matches.length ? '找到 ' + matches.length + ' 篇文章' : '没有找到相关文章，试试其他关键词。') : '最近文章';
    result.append(hint);
    for (const {post} of matches) {
      const link = document.createElement('a');
      link.className = 'result';
      link.href = prefix + 'posts/' + post.slug + '.html';
      link.textContent = post.title;
      const detail = document.createElement('small');
      detail.textContent = [post.category, ...post.tags].join(' · ');
      link.append(detail);
      result.append(link);
    }
  }
  function openSearch() {
    if (!dialog.open) { dialog.showModal(); input.value = ''; search(); }
    input.focus();
  }
  if (/Mac|iPhone|iPad/.test(navigator.platform)) $('.search-open kbd').textContent = '⌘ K';
  $('.search-open').addEventListener('click', openSearch);
  input.addEventListener('input', search);
  $('.search-bar').addEventListener('submit', event => {
    if (!event.submitter || event.submitter.matches('input')) {
      event.preventDefault();
      $('.result')?.click();
    }
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {event.preventDefault(); $('.result')?.click();}
    if (event.key === 'ArrowDown') {event.preventDefault(); $('.result')?.focus();}
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) dialog.close(); else openSearch();
    }
  });
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  const cards = $('#cards');
  if (cards) {
    const views = $$('[data-view]');
    function setView(view) {
      cards.classList.toggle('list-mode', view === 'list');
      views.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    }
    setView(read('view','grid') === 'list' ? 'list' : 'grid');
    views.forEach(button => button.addEventListener('click', () => {
      setView(button.dataset.view); write('view', button.dataset.view);
    }));
    const filters = $$('[data-filter]');
    filters.forEach(button => button.addEventListener('click', () => {
      filters.forEach(el => el.setAttribute('aria-pressed', String(el === button)));
      $$('.card').forEach(card => {
        card.hidden = button.dataset.filter !== '全部' && card.dataset.category !== button.dataset.filter;
      });
    }));
  }
  function saved() {
    try {
      const stored = JSON.parse(read('saved','[]'));
      return new Set(Array.isArray(stored) ? stored : []);
    } catch { return new Set(); }
  }
  const post = $('[data-post]');
  if (post) {
    const slug = post.dataset.post;
    const button = $('#save-post');
    function syncBookmark() {
      const marked = saved().has(slug);
      button.setAttribute('aria-pressed', String(marked));
      button.querySelector('span').textContent = marked ? '已收藏' : '收藏';
    }
    syncBookmark();
    button.addEventListener('click', () => {
      const current = saved();
      if (current.has(slug)) current.delete(slug); else current.add(slug);
      if (!write('saved',JSON.stringify([...current]))) notice('当前浏览器无法保存收藏');
      syncBookmark();
    });
    $('#copy-url').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(location.href.split('#')[0]); notice('文章链接已复制'); }
      catch { window.prompt('复制文章链接', location.href.split('#')[0]); }
    });
    const progress = $('.reading-progress');
    function updateProgress() {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = (max > 0 ? Math.min(100, Math.max(0, scrollY / max * 100)) : 100) + '%';
    }
    updateProgress();
    addEventListener('scroll', updateProgress, {passive:true});
    addEventListener('resize',updateProgress);
    addEventListener('storage',syncBookmark);
  }
  const modes = $$('[data-archive]');
  if (modes.length) {
    let mode = 'all';
    function archive() {
      const bookmarks = saved();
      let count = 0;
      $$('[data-archive-slug]').forEach(row => {
        row.hidden = mode === 'saved' && !bookmarks.has(row.dataset.archiveSlug);
        if (!row.hidden) count++;
      });
      $$('.month').forEach(section => { section.hidden = !section.querySelector('[data-archive-slug]:not([hidden])'); });
      $('#empty-saved').hidden = count !== 0;
      modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.archive === mode)));
    }
    modes.forEach(button => button.addEventListener('click', () => { mode = button.dataset.archive; archive(); }));
    addEventListener('pageshow',archive);
    addEventListener('storage',archive);
  }
})();