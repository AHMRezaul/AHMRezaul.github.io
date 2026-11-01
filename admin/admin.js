(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var API = 'https://api.github.com';
  var STORE_KEY = 'portfolio-admin';

  /* Field types: text | textarea | tall | csv | lines | links | select
     csv   -> array of strings, edited comma separated
     lines -> array of strings, edited one per line
     links -> array of {label,url}, edited as "Label | url" per line */
  var SCHEMAS = {
    profile: {
      label: 'Profile', icon: 'fa-user', type: 'object',
      hint: 'Name, bio and links shown in the About section. Separate bio paragraphs with a blank line.',
      fields: [
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'affiliation', label: 'Affiliation' },
        { key: 'tagline', label: 'Tagline' },
        { key: 'photo', label: 'Photo path', hint: 'Path inside the repo, e.g. assets/photo.jpg' },
        { key: 'bio', label: 'Bio', type: 'tall', hint: 'Supports [text](https://link), *italic* and **bold**.' },
        { key: 'interests', label: 'Research interests', type: 'csv', hint: 'Comma separated.' },
        { key: 'email', label: 'Email' },
        { key: 'linkedin', label: 'LinkedIn URL' },
        { key: 'scholar', label: 'Google Scholar URL' },
        { key: 'github', label: 'GitHub URL' },
        { key: 'researchgate', label: 'ResearchGate URL', hint: 'Leave empty to hide the button.' }
      ]
    },
    news: {
      label: 'News', icon: 'fa-bullhorn', type: 'list', titleKey: 'text', subKey: 'date', addTop: true,
      hint: 'Recent updates. The site sorts by date, newest first.',
      fields: [
        { key: 'date', label: 'Date', hint: 'YYYY-MM-DD, YYYY-MM or YYYY.' },
        { key: 'text', label: 'Text', type: 'textarea', hint: 'Supports [text](https://link), *italic* and **bold**.' }
      ]
    },
    publications: {
      label: 'Publications', icon: 'fa-book-open', type: 'list', titleKey: 'title', subKey: 'venue', addTop: true,
      hint: 'Grouped by year on the site. Use the arrows to reorder within a year.',
      fields: [
        { key: 'title', label: 'Title', type: 'textarea' },
        { key: 'authors', label: 'Authors', type: 'textarea', hint: 'Comma separated. Your name is bolded automatically.' },
        { key: 'venue', label: 'Venue', type: 'textarea' },
        { key: 'year', label: 'Year' },
        { key: 'type', label: 'Type', type: 'select', options: ['Conference', 'Workshop', 'Journal', 'Book Chapter', 'Preprint', 'Other'] },
        { key: 'note', label: 'Note', hint: 'e.g. Equal contribution. Optional.' },
        { key: 'links', label: 'Links', type: 'links', hint: 'One per line as: Label | https://url  (e.g. ACL Anthology | https://aclanthology.org/…)' }
      ]
    },
    education: {
      label: 'Education', icon: 'fa-graduation-cap', type: 'list', titleKey: 'degree', subKey: 'school',
      fields: [
        { key: 'degree', label: 'Degree' },
        { key: 'school', label: 'School' },
        { key: 'period', label: 'Period' },
        { key: 'location', label: 'Location' },
        { key: 'note', label: 'Note', type: 'textarea' }
      ]
    },
    experience: {
      label: 'Experience', icon: 'fa-briefcase', type: 'list', titleKey: 'role', subKey: 'org',
      fields: [
        { key: 'role', label: 'Role' },
        { key: 'org', label: 'Organization' },
        { key: 'period', label: 'Period' },
        { key: 'location', label: 'Location' },
        { key: 'points', label: 'Highlights', type: 'lines', hint: 'One bullet per line.' }
      ]
    },
    projects: {
      label: 'Projects', icon: 'fa-diagram-project', type: 'list', titleKey: 'title', subKey: 'status',
      fields: [
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'tags', label: 'Tags', type: 'csv', hint: 'Comma separated.' },
        { key: 'status', label: 'Status', hint: 'e.g. Ongoing (shows a pulsing dot). Optional.' },
        { key: 'icon', label: 'Icon', hint: 'Font Awesome free solid icon name, e.g. fa-database, fa-comments, fa-flask.' },
        { key: 'links', label: 'Links', type: 'links', hint: 'One per line as: Label | https://url' }
      ]
    },
    skills: {
      label: 'Skills', icon: 'fa-layer-group', type: 'list', titleKey: 'category', subKey: 'icon',
      fields: [
        { key: 'category', label: 'Category' },
        { key: 'icon', label: 'Icon', hint: 'A Font Awesome free solid icon name, e.g. fa-code, fa-brain, fa-database.' },
        { key: 'items', label: 'Items', type: 'csv', hint: 'Comma separated.' }
      ]
    },
    certificates: {
      label: 'Certificates', icon: 'fa-certificate', type: 'list', titleKey: 'title', subKey: 'issuer', addTop: true,
      hint: 'Shown as thumbnails in Miscellaneous. Put the image in the repo (e.g. assets/certs/name.jpg) and enter its path.',
      fields: [
        { key: 'title', label: 'Title' },
        { key: 'issuer', label: 'Issuer' },
        { key: 'date', label: 'Date', hint: 'YYYY-MM or YYYY.' },
        { key: 'image', label: 'Image path', hint: 'e.g. assets/certs/name.jpg' },
        { key: 'note', label: 'Note', type: 'textarea', hint: 'Optional.' }
      ]
    },
    misc: {
      label: 'Miscellaneous', icon: 'fa-star', type: 'list', titleKey: 'group', subKey: 'icon',
      hint: 'Service, awards, certificates, talks, anything else. Each group is a card.',
      fields: [
        { key: 'group', label: 'Group title' },
        { key: 'icon', label: 'Icon', hint: 'Font Awesome free solid icon name, e.g. fa-award, fa-certificate, fa-microphone.' },
        { key: 'items', label: 'Items', type: 'lines', hint: 'One per line. Supports [text](https://link).' }
      ]
    }
  };

  var cfg = null;       // { repo, branch, token }
  var cur = null;       // { key, data, sha, dirty }
  var dirtyKeys = {};
  var editing = null;   // index being edited, or -1 for new

  /* ---------- helpers ---------- */

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { el.appendChild(c); });
    return el;
  }

  function setStatus(msg, kind) {
    var s = $('status');
    s.textContent = msg || '';
    s.className = 'status' + (kind ? ' ' + kind : '');
  }

  function b64enc(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64dec(b64) { return decodeURIComponent(escape(atob(b64.replace(/\s/g, '')))); }

  function gh(method, path, body) {
    return fetch(API + path, {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + cfg.token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var e = new Error(j.message || ('HTTP ' + r.status));
          e.status = r.status;
          throw e;
        }
        return j;
      });
    });
  }

  function contentsPath(key) {
    return '/repos/' + cfg.repo + '/contents/data/' + key + '.json';
  }
  function refQuery() { return cfg.branch ? '?ref=' + encodeURIComponent(cfg.branch) : ''; }

  /* ---------- sign in ---------- */

  function saveCfg(remember) {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(cfg));
      if (remember) localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
      else localStorage.removeItem(STORE_KEY);
    } catch (e) {}
  }
  function loadCfg() {
    try {
      return JSON.parse(sessionStorage.getItem(STORE_KEY) || localStorage.getItem(STORE_KEY) || 'null');
    } catch (e) { return null; }
  }

  function connect() {
    return gh('GET', '/repos/' + cfg.repo).then(function (repo) {
      if (!repo.permissions || !repo.permissions.push) {
        throw new Error('This token cannot write to ' + cfg.repo + '. Grant "Contents: Read and write".');
      }
      $('login').hidden = true;
      $('editor').hidden = false;
      $('logout').hidden = false;
      buildTabs();
      openFile('publications');
    });
  }

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, err = $('login-error');
    err.hidden = true;
    cfg = {
      repo: f.repo.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, ''),
      branch: f.branch.value.trim(),
      token: f.token.value.trim()
    };
    connect().then(function () { saveCfg(f.remember.checked); }).catch(function (ex) {
      err.textContent = ex.status === 401 ? 'Token rejected. Check that it is correct and has not expired.'
        : ex.status === 404 ? 'Repository not found, or the token has no access to it.' : ex.message;
      err.hidden = false;
      cfg = null;
    });
  });

  $('logout').addEventListener('click', function () {
    try { sessionStorage.removeItem(STORE_KEY); localStorage.removeItem(STORE_KEY); } catch (e) {}
    location.reload();
  });

  /* ---------- tabs & loading ---------- */

  function buildTabs() {
    var tabs = $('tabs');
    tabs.innerHTML = '';
    Object.keys(SCHEMAS).forEach(function (key) {
      var s = SCHEMAS[key];
      var b = h('button', { class: 'tab' + (cur && cur.key === key ? ' active' : ''), 'data-key': key, role: 'tab' }, [
        h('i', { class: 'fa-solid ' + s.icon }),
        h('span', { text: s.label })
      ]);
      if (dirtyKeys[key]) b.appendChild(h('span', { class: 'dot', title: 'Unsaved changes' }));
      b.onclick = function () { switchTo(key); };
      tabs.appendChild(b);
    });
  }

  function switchTo(key) {
    if (cur && cur.key === key) return;
    if (cur && dirtyKeys[cur.key] && !confirm('You have unsaved changes in "' + SCHEMAS[cur.key].label + '". Discard them?')) return;
    if (cur) delete dirtyKeys[cur.key];
    openFile(key);
  }

  function openFile(key) {
    setStatus('Loading…');
    $('ed-body').innerHTML = '';
    gh('GET', contentsPath(key) + refQuery()).then(function (res) {
      cur = { key: key, data: JSON.parse(b64dec(res.content)), sha: res.sha };
      delete dirtyKeys[key];
      setStatus('');
      render();
    }).catch(function (ex) {
      cur = { key: key, data: null, sha: null };
      setStatus('Could not load data/' + key + '.json: ' + ex.message, 'err');
    });
  }

  /* ---------- rendering ---------- */

  function markDirty() {
    dirtyKeys[cur.key] = true;
    $('btn-save').disabled = false;
    buildTabs();
  }

  function render() {
    var s = SCHEMAS[cur.key];
    buildTabs();
    $('ed-title').textContent = s.label;
    $('ed-hint').textContent = s.hint || '';
    $('btn-add').hidden = s.type === 'object';
    $('btn-save').disabled = !dirtyKeys[cur.key];

    var body = $('ed-body');
    body.innerHTML = '';
    if (s.type === 'object') {
      var f = h('div', { class: 'form' });
      s.fields.forEach(function (fd) { f.appendChild(fieldEl(fd, cur.data[fd.key])); });
      f.addEventListener('input', function () {
        s.fields.forEach(function (fd) { cur.data[fd.key] = readField(f, fd); });
        markDirty();
      });
      body.appendChild(f);
      return;
    }

    var rows = h('div', { class: 'rows' });
    cur.data.forEach(function (item, i) {
      var title = String(item[s.titleKey] || '(untitled)');
      var sub = [item.year || item.date, item[s.subKey] && item[s.subKey] !== item.date ? item[s.subKey] : '']
        .filter(Boolean).join(' · ');
      var acts = h('div', { class: 'row-actions' }, [
        iconBtn('fa-pen', 'Edit', function () { openDialog(i); }),
        iconBtn('fa-arrow-up', 'Move up', function () { move(i, -1); }, i === 0),
        iconBtn('fa-arrow-down', 'Move down', function () { move(i, 1); }, i === cur.data.length - 1),
        iconBtn('fa-trash', 'Delete', function () { remove(i); }, false, 'danger')
      ]);
      rows.appendChild(h('div', { class: 'row' }, [
        h('div', { class: 'grow' }, [h('div', { class: 'r-title', text: title }), h('div', { class: 'r-sub', text: sub })]),
        acts
      ]));
    });
    if (!cur.data.length) rows.appendChild(h('p', { class: 'muted', text: 'Nothing here yet. Use Add to create the first entry.' }));
    body.appendChild(rows);
  }

  function iconBtn(icon, title, fn, disabled, cls) {
    var b = h('button', { type: 'button', title: title, 'aria-label': title, class: cls || '' }, [h('i', { class: 'fa-solid ' + icon })]);
    b.disabled = !!disabled;
    b.onclick = fn;
    return b;
  }

  function move(i, d) {
    var a = cur.data, j = i + d;
    var t = a[i]; a[i] = a[j]; a[j] = t;
    markDirty(); render();
  }
  function remove(i) {
    var s = SCHEMAS[cur.key];
    if (!confirm('Delete "' + String(cur.data[i][s.titleKey]).slice(0, 80) + '"?')) return;
    cur.data.splice(i, 1);
    markDirty(); render();
  }

  /* ---------- fields ---------- */

  function toText(fd, v) {
    if (v == null) return '';
    if (fd.type === 'csv') return (v || []).join(', ');
    if (fd.type === 'lines') return (v || []).join('\n');
    if (fd.type === 'links') return (v || []).map(function (l) { return l.label + ' | ' + l.url; }).join('\n');
    return String(v);
  }

  function fromText(fd, t) {
    if (fd.type === 'csv') return t.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    if (fd.type === 'lines') return t.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    if (fd.type === 'links') {
      return t.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).map(function (line) {
        var k = line.indexOf('|');
        return k < 0 ? { label: 'Link', url: line } : { label: line.slice(0, k).trim(), url: line.slice(k + 1).trim() };
      });
    }
    return t;
  }

  function fieldEl(fd, value) {
    var input;
    if (fd.type === 'select') {
      input = h('select', { name: fd.key });
      var opts = fd.options.slice();
      if (value && opts.indexOf(value) < 0) opts.push(value);
      opts.forEach(function (o) { var op = h('option', { value: o, text: o }); if (o === value) op.selected = true; input.appendChild(op); });
    } else if (fd.type && fd.type !== 'text') {
      input = h('textarea', { name: fd.key, class: fd.type === 'tall' ? 'tall' : '' });
      input.value = toText(fd, value);
    } else {
      input = h('input', { name: fd.key, type: 'text' });
      input.value = toText(fd, value);
    }
    var lab = h('label', { text: fd.label }, [input]);
    // label text node must come before the control
    lab.insertBefore(document.createTextNode(''), input);
    if (fd.hint) lab.appendChild(h('span', { class: 'hint', text: fd.hint }));
    return lab;
  }

  function readField(root, fd) {
    var el = root.querySelector('[name="' + fd.key + '"]');
    return fromText(fd, el.value);
  }

  /* ---------- dialog for list items ---------- */

  var dlg = $('dlg');

  function openDialog(index) {
    var s = SCHEMAS[cur.key];
    editing = index;
    var item = index >= 0 ? cur.data[index] : {};
    $('dlg-title').textContent = (index >= 0 ? 'Edit ' : 'Add ') + s.label.toLowerCase().replace(/s$/, '') + ' entry';
    var box = $('dlg-fields');
    box.innerHTML = '';
    s.fields.forEach(function (fd) { box.appendChild(fieldEl(fd, item[fd.key])); });
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }

  function closeDialog() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }

  $('btn-add').onclick = function () { openDialog(-1); };
  $('dlg-cancel').onclick = closeDialog;
  $('dlg-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var s = SCHEMAS[cur.key], item = {};
    s.fields.forEach(function (fd) { item[fd.key] = readField($('dlg-fields'), fd); });
    if (editing >= 0) cur.data[editing] = item;
    else if (s.addTop) cur.data.unshift(item);
    else cur.data.push(item);
    closeDialog();
    markDirty(); render();
  });

  /* ---------- save ---------- */

  $('btn-save').onclick = function () {
    var key = cur.key, btn = $('btn-save');
    btn.disabled = true;
    setStatus('Saving…');
    var body = {
      message: 'Update ' + key + ' via admin',
      content: b64enc(JSON.stringify(cur.data, null, 2) + '\n'),
      sha: cur.sha
    };
    if (cfg.branch) body.branch = cfg.branch;
    gh('PUT', contentsPath(key), body).then(function (res) {
      cur.sha = res.content.sha;
      delete dirtyKeys[key];
      buildTabs();
      setStatus('Saved. GitHub Pages usually shows the change within a minute or two.', 'ok');
    }).catch(function (ex) {
      btn.disabled = false;
      setStatus(ex.status === 409 || ex.status === 422
        ? 'Save failed: the file changed on GitHub since you opened it. Reload this tab (switch away and back) and re-apply your edit.'
        : 'Save failed: ' + ex.message, 'err');
    });
  };

  window.addEventListener('beforeunload', function (e) {
    if (Object.keys(dirtyKeys).length) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ---------- auto sign-in ---------- */

  var saved = loadCfg();
  if (saved && saved.token) {
    cfg = saved;
    connect().catch(function () { cfg = null; });
  }
})();
