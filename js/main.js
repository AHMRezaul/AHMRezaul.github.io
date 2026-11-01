(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var NEWS_VISIBLE = 5;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Escapes text, then supports [label](https://url), *italic* and **bold**.
  function inline(s) {
    return esc(s)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function fmtDate(d) {
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(d || '');
    if (!m) return d || '';
    var out = MONTHS[+m[2] - 1] + ' ' + m[1];
    return m[3] ? MONTHS[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1] : out;
  }

  // Splits a news date into a big top line and a small bottom line for the date badge.
  function dateParts(d) {
    var m = /^(\d{4})-(\d{2})/.exec(d || '');
    if (m) return { top: MONTHS[+m[2] - 1], bottom: m[1] };
    return { top: d || '', bottom: '' };
  }

  function linkIcon(label) {
    var l = (label || '').toLowerCase();
    if (/code|github|repo|data/.test(l)) return 'fa-brands fa-github';
    if (/book|chapter/.test(l)) return 'fa-solid fa-book';
    if (/pdf|paper|anthology|arxiv/.test(l)) return 'fa-solid fa-file-lines';
    if (/doi/.test(l)) return 'fa-solid fa-link';
    if (/demo|site|web/.test(l)) return 'fa-solid fa-globe';
    return 'fa-solid fa-arrow-up-right-from-square';
  }

  function load(name) {
    return fetch('data/' + name + '.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(name + ': ' + r.status);
      return r.json();
    });
  }

  function linkButtons(links, cls) {
    return (links || []).map(function (l) {
      return '<a class="' + cls + '" href="' + esc(l.url) + '" target="_blank" rel="noopener"><i class="' +
        linkIcon(l.label) + '"></i> ' + esc(l.label) + '</a>';
    }).join('');
  }

  /* ---------- renderers ---------- */

  function renderProfile(p) {
    $('p-name').textContent = p.name;
    $('p-affil').textContent = '// ' + p.affiliation;
    $('p-role').textContent = p.role;
    startTyping(p.tagline);
    $('p-photo').src = p.photo;
    $('footer-name').textContent = '© ' + p.name;
    $('footer-year').textContent = new Date().getFullYear();

    $('p-bio').innerHTML = String(p.bio || '').split(/\n\s*\n/).map(function (para) {
      return '<p>' + inline(para.trim()) + '</p>';
    }).join('');

    $('p-interests').innerHTML = (p.interests || []).map(function (t) {
      return '<span class="chip">' + esc(t) + '</span>';
    }).join('');

    var links = [];
    if (p.email) links.push(['mailto:' + p.email, 'fa-solid fa-envelope', 'Email', true]);
    if (p.linkedin) links.push([p.linkedin, 'fa-brands fa-linkedin', 'LinkedIn']);
    if (p.scholar) links.push([p.scholar, 'fa-brands fa-google-scholar', 'Google Scholar']);
    if (p.github) links.push([p.github, 'fa-brands fa-github', 'GitHub']);
    if (p.researchgate) links.push([p.researchgate, 'fa-brands fa-researchgate', 'ResearchGate']);
    $('p-links').innerHTML = links.map(function (l) {
      var ext = l[0].indexOf('mailto:') === 0 ? '' : ' target="_blank" rel="noopener"';
      return '<a class="btn' + (l[3] ? ' primary' : '') + '" href="' + esc(l[0]) + '"' + ext + '><i class="' + l[1] + '"></i> ' + l[2] + '</a>';
    }).join('');

    $('pub-scholar').href = p.scholar || '#';
    $('proj-github').href = p.github || '#';
    if (!p.scholar) $('pub-scholar').hidden = true;
    if (!p.github) $('proj-github').hidden = true;
  }

  function renderCerts(items) {
    $('cert-head').hidden = !items.length;
    $('cert-list').innerHTML = items.map(function (c, i) {
      return '<button class="cert reveal" data-i="' + i + '" aria-label="View certificate: ' + esc(c.title) + '">' +
        '<img src="' + esc(c.image) + '" alt="" loading="lazy">' +
        '<span class="cert-t">' + esc(c.title) + '</span>' +
        '<span class="cert-s">' + esc(c.issuer) + (c.date ? ' · ' + esc(fmtDate(c.date)) : '') + '</span>' +
        (c.note ? '<span class="cert-n">' + esc(c.note) + '</span>' : '') + '</button>';
    }).join('');
    var lb = $('lightbox');
    $('cert-list').onclick = function (e) {
      var b = e.target.closest('.cert');
      if (!b) return;
      var c = items[+b.dataset.i];
      $('lb-img').src = c.image;
      $('lb-img').alt = c.title;
      $('lb-cap').textContent = c.title + ' · ' + c.issuer;
      if (lb.showModal) lb.showModal(); else lb.setAttribute('open', '');
    };
    function close() { if (lb.close) lb.close(); else lb.removeAttribute('open'); }
    $('lb-close').onclick = close;
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  }

  function renderNews(items) {
    items = items.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    $('latest-list').innerHTML = items.slice(0, 3).map(function (n) {
      return '<li><time>' + esc(fmtDate(n.date)) + '</time><span>' + inline(n.text) + '</span></li>';
    }).join('');
    var list = $('news-list'), more = $('news-more'), expanded = false;
    function draw() {
      var shown = expanded ? items : items.slice(0, NEWS_VISIBLE);
      list.innerHTML = shown.map(function (n) {
        var d = dateParts(n.date);
        return '<li><time class="date"><b>' + esc(d.top) + '</b><span>' + esc(d.bottom) + '</span></time>' +
          '<p>' + inline(n.text) + '</p></li>';
      }).join('');
      more.hidden = items.length <= NEWS_VISIBLE;
      more.textContent = expanded ? 'Show fewer' : 'Show older news';
    }
    more.onclick = function () { expanded = !expanded; draw(); };
    draw();
  }

  function renderPubs(pubs, myName) {
    var types = ['All'];
    pubs.forEach(function (p) { if (p.type && types.indexOf(p.type) < 0) types.push(p.type); });
    var current = 'All';
    var nameRe = myName ? new RegExp(myName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : null;

    function draw() {
      var shown = pubs.filter(function (p) { return current === 'All' || p.type === current; });
      var years = [];
      shown.forEach(function (p) { if (years.indexOf(p.year) < 0) years.push(p.year); });
      years.sort(function (a, b) { return String(b).localeCompare(String(a)); });
      $('pub-list').innerHTML = years.map(function (y) {
        return '<div class="year-group"><div class="year-label"><span>' + esc(y) + '</span></div><div class="year-items">' + shown.filter(function (p) { return p.year === y; }).map(function (p) {
          var authors = esc(p.authors);
          if (nameRe) authors = authors.replace(nameRe, '<strong>' + esc(myName) + '</strong>');
          return '<article class="pub" data-type="' + esc(p.type || '') + '">' +
            '<h3>' + esc(p.title) + '</h3>' +
            '<p class="authors">' + authors + '</p>' +
            '<p class="venue">' + esc(p.venue) + '</p>' +
            '<div class="pub-foot">' +
            (p.type ? '<span class="tag">' + esc(p.type) + '</span>' : '') +
            (p.note ? '<span class="tag note">' + esc(p.note) + '</span>' : '') +
            linkButtons(p.links, 'pill-link') +
            '</div></article>';
        }).join('') + '</div></div>';
      }).join('');
      document.querySelectorAll('#pub-filters .filter').forEach(function (b) {
        b.classList.toggle('active', b.dataset.type === current);
      });
    }

    var f = $('pub-filters');
    f.hidden = types.length < 3;
    f.innerHTML = types.map(function (t) {
      return '<button class="filter" data-type="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('');
    f.onclick = function (e) {
      var b = e.target.closest('.filter');
      if (b) { current = b.dataset.type; draw(); }
    };
    draw();
  }

  function renderTimeline(el, items, mapFn) {
    el.innerHTML = items.map(function (it) {
      return '<div class="tl-item reveal"><div class="tl-card">' + mapFn(it) + '</div></div>';
    }).join('');
  }

  function periodPill(period) {
    var live = /present/i.test(period || '');
    return '<span class="period' + (live ? ' live' : '') + '"><i class="fa-regular fa-calendar"></i> ' + esc(period) + '</span>';
  }

  function renderEducation(items) {
    $('edu-list').innerHTML = items.map(function (e) {
      return '<article class="edu-card reveal"><i class="fa-solid fa-graduation-cap wm" aria-hidden="true"></i>' +
        periodPill(e.period) +
        '<h3>' + esc(e.degree) + '</h3><p class="tl-org">' + esc(e.school) + '</p>' +
        '<p class="loc"><i class="fa-solid fa-location-dot"></i> ' + esc(e.location) + '</p>' +
        (e.note ? '<p class="note">' + inline(e.note) + '</p>' : '') + '</article>';
    }).join('');
  }

  function renderExperience(items) {
    renderTimeline($('exp-list'), items, function (e) {
      return '<div class="tl-top"><div><h3>' + esc(e.role) + '</h3><p class="tl-org">' + esc(e.org) + '</p></div>' +
        '<div class="tl-meta">' + periodPill(e.period) + '<span class="loc"><i class="fa-solid fa-location-dot"></i> ' + esc(e.location) + '</span></div></div>' +
        '<ul class="points">' + (e.points || []).map(function (p) { return '<li>' + inline(p) + '</li>'; }).join('') + '</ul>';
    });
  }

  function renderProjects(items) {
    $('proj-list').innerHTML = items.map(function (p) {
      return '<article class="card reveal">' +
        '<div class="card-top"><i class="fa-solid ' + esc(p.icon || 'fa-flask') + '"></i>' + (p.status ? '<span class="tag' + (/ongoing/i.test(p.status) ? ' live' : '') + '">' + esc(p.status) + '</span>' : '') + '</div>' +
        '<h3>' + esc(p.title) + '</h3><p>' + inline(p.description) + '</p>' +
        '<div class="chips">' + (p.tags || []).map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>' +
        '<div class="card-links">' + linkButtons(p.links, 'pill-link') + '</div></article>';
    }).join('');
  }

  function renderSkills(items) {
    $('skill-list').innerHTML = items.map(function (s) {
      return '<div class="skill reveal"><i class="fa-solid ' + esc(s.icon || 'fa-code') + ' wm" aria-hidden="true"></i><h3><i class="fa-solid ' + esc(s.icon || 'fa-code') + '"></i>' + esc(s.category) + '</h3>' +
        '<div class="chips">' + (s.items || []).map(function (i) { return '<span class="chip">' + esc(i) + '</span>'; }).join('') + '</div></div>';
    }).join('');
  }

  function renderMisc(groups) {
    $('misc-list').innerHTML = groups.map(function (g) {
      return '<div class="misc-card reveal"><i class="fa-solid ' + esc(g.icon || 'fa-star') + ' wm" aria-hidden="true"></i><h3><i class="fa-solid ' + esc(g.icon || 'fa-star') + '"></i>' + esc(g.group) + '</h3>' +
        '<ul>' + (g.items || []).map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }

  /* ---------- UI behavior ---------- */

  function initUI() {
    prepareReveals();
    var nav = $('nav'), menu = $('menu'), toggle = $('menu-toggle'), themeBtn = $('theme-toggle');

    function setTheme(t) {
      document.documentElement.setAttribute('data-theme', t);
      themeBtn.firstElementChild.className = t === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = t === 'dark' ? '#0b0f1a' : '#f7f8fc';
      try { localStorage.setItem('theme', t); } catch (e) {}
    }
    setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    themeBtn.onclick = function () {
      setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    };

    toggle.onclick = function () {
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    };
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', false); }
    });
    window.addEventListener('scroll', function () { nav.classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });

    // Scroll-spy
    var links = {};
    menu.querySelectorAll('a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    if ('IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && links[en.target.id]) {
            Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
            links[en.target.id].classList.add('active');
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      document.querySelectorAll('main section[id]').forEach(function (s) { spy.observe(s); });

      var rev = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          el.classList.add('in');
          rev.unobserve(el);
          // hand the element back to its normal styles so hover/tilt transitions are not slowed down
          setTimeout(function () {
            el.classList.remove('reveal', 'in');
            el.style.transitionDelay = '';
          }, 1200);
        });
      }, { threshold: 0.08 });
      document.querySelectorAll('.reveal').forEach(function (el) { rev.observe(el); });
    } else {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* ---------- motion ---------- */

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Typing line cycles through the " · "-separated parts of the tagline.
  function startTyping(tagline) {
    var el = $('p-typing');
    var phrases = String(tagline || '').split('·').map(function (x) { return x.trim(); }).filter(Boolean);
    if (!phrases.length) return;
    if (REDUCED || phrases.length === 1) { el.textContent = phrases.join(' · '); return; }
    var i = 0, n = 0, deleting = false;
    (function tick() {
      var full = phrases[i];
      n += deleting ? -1 : 1;
      el.textContent = full.slice(0, n);
      var delay = deleting ? 28 : 60;
      if (!deleting && n === full.length) { deleting = true; delay = 1500; }
      else if (deleting && n === 0) { deleting = false; i = (i + 1) % phrases.length; delay = 350; }
      setTimeout(tick, delay);
    })();
  }

  // Mark things for scroll-reveal with a small stagger within each group.
  function prepareReveals() {
    var groups = ['.bento > .tile', '#news-list > li', '#pub-list > .pub', '.timeline > .tl-item', '.edu-grid > .edu-card', '.cards > .card',
      '.skill-grid > .skill', '.misc-grid > .misc-card', '.cert-grid > .cert', '.section h2'];
    groups.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el, i) {
        el.classList.add('reveal');
        el.style.transitionDelay = Math.min(i, 6) * 70 + 'ms';
      });
    });
  }

  function initMotion() {
    // Scroll progress bar
    var bar = $('progress');
    function onScroll() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    if (!REDUCED && window.matchMedia('(hover: hover)').matches) {
      // Cursor spotlight on every surface; 3D tilt on project cards and the photo.
      document.addEventListener('pointermove', function (e) {
        var t = e.target.closest && e.target.closest('.tile, .card, .skill, .misc-card, .pub, .tl-card, .edu-card, .cert');
        if (!t) return;
        var r = t.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        t.style.setProperty('--mx', x + 'px');
        t.style.setProperty('--my', y + 'px');
        if (t.classList.contains('tilt')) {
          t.style.setProperty('--ry', ((x / r.width - .5) * 8).toFixed(2) + 'deg');
          t.style.setProperty('--rx', ((.5 - y / r.height) * 8).toFixed(2) + 'deg');
        }
      }, { passive: true });
      document.addEventListener('pointerout', function (e) {
        var t = e.target.closest && e.target.closest('.tilt');
        if (t && !t.contains(e.relatedTarget)) { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); }
      });
      document.querySelectorAll('.card, .t-photo').forEach(function (el) { el.classList.add('tilt'); });
    }

    initNetwork();
  }

  // Slow-drifting node network behind the hero; nodes near the cursor light up.
  function initNetwork() {
    var canvas = $('net'), hero = $('about');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d'), nodes = [], w = 0, h = 0, dpr = 1;
    var mouse = { x: -999, y: -999 }, running = false, visible = true, c1 = [124, 156, 255], c2 = [79, 209, 197];

    function rgb(hex) {
      var m = /^#([0-9a-f]{6})$/i.exec((hex || '').trim());
      return m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : null;
    }
    function readColors() {
      var st = getComputedStyle(document.documentElement);
      c1 = rgb(st.getPropertyValue('--accent')) || c1;
      c2 = rgb(st.getPropertyValue('--accent-2')) || c2;
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.max(28, Math.min(80, Math.round(w * h / 15000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: 1.2 + Math.random() * 1.6 });
      }
      draw();
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      var link = 130, i, j, a, b, dx, dy, d, al;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j]; dx = a.x - b.x; dy = a.y - b.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < link) {
            al = (1 - d / link) * .5;
            ctx.strokeStyle = 'rgba(' + c1[0] + ',' + c1[1] + ',' + c1[2] + ',' + al + ')';
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        dx = a.x - mouse.x; dy = a.y - mouse.y; d = Math.sqrt(dx * dx + dy * dy);
        if (d < 170) {
          al = (1 - d / 170) * .8;
          ctx.strokeStyle = 'rgba(' + c2[0] + ',' + c2[1] + ',' + c2[2] + ',' + al + ')';
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(' + c2[0] + ',' + c2[1] + ',' + c2[2] + ',.85)';
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.2832); ctx.fill();
      }
    }
    function step() {
      if (!running) return;
      nodes.forEach(function (n) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      });
      draw();
      requestAnimationFrame(step);
    }
    function setRunning(on) {
      if (REDUCED) return;
      on = on && visible && !document.hidden;
      if (on && !running) { running = true; requestAnimationFrame(step); } else if (!on) { running = false; }
    }

    readColors();
    resize();
    window.addEventListener('resize', resize);
    document.getElementById('theme-toggle').addEventListener('click', function () { setTimeout(function () { readColors(); draw(); }, 0); });
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });
    document.addEventListener('visibilitychange', function () { setRunning(true); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; setRunning(true); }).observe(hero);
    }
    setRunning(true);
  }

  /* ---------- boot ---------- */

  Promise.all(['profile', 'news', 'publications', 'education', 'experience', 'projects', 'skills', 'misc', 'certificates'].map(load))
    .then(function (d) {
      renderProfile(d[0]);
      renderNews(d[1]);
      renderPubs(d[2], d[0].name);
      renderEducation(d[3]);
      renderExperience(d[4]);
      renderProjects(d[5]);
      renderSkills(d[6]);
      renderMisc(d[7]);
      renderCerts(d[8]);
      initUI();
      initMotion(d[0]);
    })
    .catch(function (err) {
      console.error(err);
      document.querySelector('main').insertAdjacentHTML('afterbegin',
        '<p style="padding:2rem;text-align:center;color:#f88">Could not load site data. If you opened this file directly, run a local server (see README).</p>');
      initUI();
    });
})();
