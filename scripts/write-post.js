'use strict';

/* =========================================================
 * 本地写文章功能（仅 hexo server 时可用，部署到 GitHub Pages 后不生效）
 * - 新建：文章保存到 source/_posts/<slug>.md，front matter 自动带日期
 * - 编辑：文章页出现「编辑 / 删除」按钮，保存时保留原日期与路径
 * - 删除：直接删除本地 Markdown 源文件
 * ========================================================= */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { slugize } = require('hexo-util');
const EOL = '\n';

// 仅在 hexo server 模式下标记本地编辑器可用，供模板隐藏「写文章」入口
if (hexo.env && (hexo.env.cmd === 'server' || hexo.env.cmd === 's')) {
  hexo.config.write_editor = true;
}

hexo.extend.filter.register('server_middleware', function (app) {
  const root = hexo.config.root || '/';

  // 写文章编辑器页面
  app.use((req, res, next) => {
    const clean = req.url.split('?')[0];
    if (clean === (root + 'write') || clean === (root + 'write/')) {
      if (req.method !== 'GET') return next();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(editorHTML(root));
      return;
    }
    next();
  });

  // 提供本地 Markdown 编辑器资源（EasyMDE + marked）
  app.use((req, res, next) => {
    const clean = req.url.split('?')[0];
    const files = {
      [root + 'write/lib/easymde.min.css']: ['easymde/dist', 'easymde.min.css'],
      [root + 'write/lib/easymde.min.js']: ['easymde/dist', 'easymde.min.js'],
      [root + 'write/lib/marked.min.js']: ['marked', 'marked.min.js']
    };
    const entry = files[clean];
    if (entry) {
      if (req.method !== 'GET') return next();
      const filePath = path.join(hexo.base_dir, 'node_modules', entry[0], entry[1]);
      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end('not found');
        return;
      }
      res.setHeader('Content-Type', entry[1].endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8');
      res.end(fs.readFileSync(filePath));
      return;
    }
    next();
  });

  // 加载文章内容（编辑用）
  app.use((req, res, next) => {
    if (req.url.split('?')[0] === (root + 'write/load')) {
      if (req.method !== 'GET') return next();
      const q = new URLSearchParams((req.url.split('?')[1] || ''));
      const fileRel = q.get('file') || '';
      const result = loadPost(fileRel);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (result.error) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: result.error }));
      } else {
        res.end(JSON.stringify({ ok: true, ...result }));
      }
      return;
    }
    next();
  });

  // 保存文章接口（新建或更新）
  app.use((req, res, next) => {
    if (req.url === (root + 'write/save')) {
      if (req.method !== 'POST') return next();
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let payload = {};
        try { payload = JSON.parse(body); } catch (e) { /* ignore */ }
        const result = savePost(payload);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (result.error) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: result.error }));
        } else {
          res.end(JSON.stringify({ ok: true, ...result }));
        }
      });
      return;
    }
    next();
  });

  // 删除文章接口
  app.use((req, res, next) => {
    if (req.url === (root + 'write/delete')) {
      if (req.method !== 'POST') return next();
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let payload = {};
        try { payload = JSON.parse(body); } catch (e) { /* ignore */ }
        const fileRel = String(payload.file || '');
        const result = deletePost(fileRel);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (result.error) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: result.error }));
        } else {
          res.end(JSON.stringify({ ok: true }));
        }
      });
      return;
    }
    next();
  });

  // 在文章 / 独立页面里注入「编辑 / 删除」浮动按钮
  app.use((req, res, next) => {
    const source = matchSource(req.url, root);
    if (!source) return next();

    const chunks = [];
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);
    let ended = false;

    res.write = function (chunk, encoding, cb) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else if (chunk !== undefined && chunk !== null) {
        chunks.push(Buffer.from(chunk, encoding));
      }
      if (typeof cb === 'function') cb();
      return true;
    };
    res.end = function (chunk, encoding, cb) {
      if (ended) return origEnd(chunk, encoding, cb);
      ended = true;
      if (chunk !== undefined && chunk !== null) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      const buf = Buffer.concat(chunks);
      if (buf.toString('utf8', 0, Math.min(buf.length, 64)).toLowerCase().indexOf('<!doctype html') === 0) {
        let html = buf.toString('utf8');
        if (html.indexOf('</body>') !== -1) {
          html = injectAdminBar(html, source, root);
        }
        return origEnd(Buffer.from(html, 'utf8'), 'utf8', cb);
      }
      return origEnd(buf, 'utf8', cb);
    };
    next();
  });
}, 1);

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function nowParts() {
  const d = new Date();
  return {
    year: d.getFullYear(),
    month: pad(d.getMonth() + 1),
    day: pad(d.getDate()),
    hour: pad(d.getHours()),
    minute: pad(d.getMinutes()),
    second: pad(d.getSeconds())
  };
}

function toList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split(/[,，、\s]+/).filter(Boolean);
}

function yamlQuote(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/^[\w\u4e00-\u9fa5.\- ]+$/.test(s)) return s;
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function srcDir() {
  return path.join(hexo.source_dir, hexo.config.post_dir || '_posts');
}

function safeJoin(base, rel) {
  const full = path.resolve(base, rel);
  if (full.indexOf(base) !== 0) return null;
  return full;
}

/* ---------- 解析 / 生成 Markdown 源文件 ---------- */

function parseFront(raw) {
  let meta = {};
  let content = raw;
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n?---\r?\n?/);
  if (m) {
    try { meta = yaml.load(m[1]) || {}; } catch (e) { meta = {}; }
    content = raw.slice(m[0].length);
  }
  if (!meta.tags) meta.tags = [];
  if (!meta.categories) meta.categories = [];
  if (!Array.isArray(meta.tags)) meta.tags = [meta.tags];
  if (!Array.isArray(meta.categories)) meta.categories = [meta.categories];
  return { meta, content };
}

// 从 front matter 原文中提取 date 字符串，保持原样（避免 js-yaml 解析成 Date）
function rawFrontDate(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n?---\r?\n?/);
  if (!m) return null;
  const dm = m[1].match(/^date:\s*(.+)$/m);
  return dm ? dm[1].trim() : null;
}

function buildFront(meta, haveUpdateDate) {
  let front = '---' + EOL;
  if (meta.title) front += `title: ${yamlQuote(meta.title)}${EOL}`;
  if (meta.date) front += `date: ${meta.date}${EOL}`;
  if (haveUpdateDate) front += `updated: ${nowParts().year}-${nowParts().month}-${nowParts().day} ${nowParts().hour}:${nowParts().minute}:${nowParts().second}${EOL}`;
  if (meta.tags) {
    const t = Array.isArray(meta.tags) ? meta.tags : [meta.tags];
    if (t.length) {
      front += 'tags:' + EOL;
      t.filter(Boolean).forEach(tag => { front += `  - ${yamlQuote(tag)}${EOL}`; });
    }
  }
  if (meta.categories) {
    const c = Array.isArray(meta.categories) ? meta.categories : [meta.categories];
    if (c.length) {
      front += 'categories:' + EOL;
      c.filter(Boolean).forEach(cat => { front += `  - ${yamlQuote(cat)}${EOL}`; });
    }
  }
  if (meta.cover) front += `cover: ${yamlQuote(meta.cover)}${EOL}`;
  front += '---' + EOL + EOL;
  return front;
}

/* ---------- 加载 ---------- */

function loadPost(fileRel) {
  const filePath = safeJoin(hexo.source_dir, fileRel);
  if (!fileRel || !filePath || !fs.existsSync(filePath)) {
    return { error: '文件不存在：' + fileRel };
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const { meta, content } = parseFront(raw);
  return {
    file: path.relative(hexo.source_dir, filePath).split(path.sep).join('/'),
    title: meta.title || '',
    categories: Array.isArray(meta.categories) ? meta.categories.join(',') : '',
    tags: Array.isArray(meta.tags) ? meta.tags.join(',') : '',
    cover: meta.cover || '',
    content: content.replace(/\r\n/g, EOL).trimEnd()
  };
}

/* ---------- 保存 ---------- */

function savePost(data) {
  const title = String(data.title || '').trim();
  if (!title) return { error: '标题不能为空' };

  // 编辑已有文章：保留原日期与路径，仅更新内容
  if (data.file) {
    const filePath = safeJoin(hexo.source_dir, data.file);
    if (!filePath || !fs.existsSync(filePath)) {
      return { error: '原文件不存在：' + data.file };
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const { meta } = parseFront(raw);
    const rawDate = rawFrontDate(raw);

    const newMeta = {
      title,
      date: rawDate || meta.date || String(data.date || ''),
      updated: true,
      categories: toList(data.categories),
      tags: toList(data.tags),
      cover: data.cover ? String(data.cover) : meta.cover
    };
    const body = String(data.content || '').replace(/\r\n/g, EOL);
    fs.writeFileSync(filePath, buildFront(newMeta, true) + body.trimEnd() + EOL, 'utf8');

    const dateStr = String(newMeta.date).trim();
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const y = m ? m[1] : nowParts().year;
    const mo = m ? m[2] : nowParts().month;
    const da = m ? m[3] : nowParts().day;
    const slugPath = path.basename(filePath, '.md');

    return {
      file: path.relative(hexo.base_dir, filePath),
      url: hexo.config.root + `${y}/${mo}/${da}/${slugPath}/`,
      title,
      date: dateStr,
      updated: true
    };
  }

  // 新建文章
  const now = nowParts();
  const slug = (data.slug || title).trim();
  const slugPath = slugize(slug, { transform: hexo.config.filename_case || 0 });

  const tags = toList(data.tags);
  const categories = toList(data.categories);

  const dateStr = `${now.year}-${now.month}-${now.day} ${now.hour}:${now.minute}:${now.second}`;

  const newMeta = {
    title,
    date: dateStr,
    categories,
    tags,
    cover: data.cover ? String(data.cover) : ''
  };

  const body = String(data.content || '').replace(/\r\n/g, EOL);
  const content = buildFront(newMeta, false) + body.trimEnd() + EOL;

  const dir = srcDir();
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${slugPath}.md`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, 'utf8');

  return {
    file: path.relative(hexo.base_dir, filePath),
    url: hexo.config.root + `${now.year}/${now.month}/${now.day}/${slugPath}/`,
    title,
    date: dateStr
  };
}

/* ---------- 删除 ---------- */

function deletePost(fileRel) {
  const filePath = safeJoin(hexo.source_dir, fileRel);
  if (!fileRel || !filePath) return { error: '非法文件路径' };
  if (!fs.existsSync(filePath)) return { error: '文件不存在：' + fileRel };

  const postsDir = srcDir();
  fs.unlinkSync(filePath);

  // 清理空的日期目录
  try {
    let dir = path.dirname(filePath);
    while (dir !== postsDir && dir.indexOf(postsDir) === 0) {
      const entries = fs.readdirSync(dir);
      if (entries.length) break;
      fs.rmdirSync(dir);
      dir = path.dirname(dir);
    }
  } catch (e) { /* ignore */ }

  return { ok: true };
}

/* ---------- 定位当前页面对应的源文件 ---------- */

function matchSource(urlPath, root) {
  const clean = decodeURIComponent(urlPath).split('?')[0].replace(/^\/+/, '');
  const rootClean = String(root).replace(/^\/+/, '').replace(/\/+$/, '');
  let rel = clean;
  if (rootClean && rel.indexOf(rootClean + '/') === 0) rel = rel.slice(rootClean.length + 1);

  let source = null;
  const posts = hexo.locals.get('posts');
  for (const p of posts.toArray()) {
    if (p.path === rel || p.path === rel + '/') { source = p.source; break; }
  }
  if (!source) {
    const pages = hexo.locals.get('pages');
    for (const p of pages.toArray()) {
      if (p.path === rel || p.path === rel + '/') { source = p.source; break; }
    }
  }
  return source;
}

/* ---------- 注入管理按钮 ---------- */

function injectAdminBar(html, source, root) {
  const srcJson = JSON.stringify(String(source)).replace(/</g, '\\u003c');
  const rootJson = JSON.stringify(String(root));
  return html.replace('</body>', `
<script>
(function () {
  var file = ${srcJson};
  var root = ${rootJson};
  var txt = { edit: '编辑', del: '删除', tip: '本地管理（仅 hexo server 可用）' };

  var el = document.createElement('div');
  el.id = 'local-admin-bar';
  var tip = document.createElement('span');
  tip.className = 'admin-tip';
  tip.textContent = txt.tip;
  var edit = document.createElement('a');
  edit.className = 'admin-btn';
  edit.textContent = txt.edit;
  edit.target = '_blank';
  edit.href = root + 'write/?file=' + encodeURIComponent(file);
  var del = document.createElement('button');
  del.className = 'admin-btn admin-danger';
  del.type = 'button';
  del.textContent = txt.del;
  del.addEventListener('click', function () {
    if (!window.confirm('确定删除这篇文章吗？删除后不可恢复。')) return;
    fetch(root + 'write/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: file })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) { window.location.href = root; }
        else { window.alert(d.error || '删除失败'); }
      })
      .catch(function (err) { window.alert('Error: ' + err.message); });
  });
  el.appendChild(tip);
  el.appendChild(edit);
  el.appendChild(del);
  document.body.appendChild(el);

  var css = document.createElement('style');
  css.textContent = '#local-admin-bar{position:fixed;right:16px;bottom:16px;z-index:9999;display:flex;align-items:center;gap:8px;padding:8px 10px;background:#ffffff;color:#24292f;border:1px solid #d0d7de;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.1);font-size:13px;font-family:Consolas,Menlo,monospace}#local-admin-bar .admin-tip{color:#57606a;margin-right:2px;font-size:12px}#local-admin-bar .admin-btn{display:inline-block;padding:5px 12px;border:none;border-radius:4px;background:#0969da;color:#fff;font-size:12.5px;font-weight:600;font-family:inherit;cursor:pointer;text-decoration:none;transition:opacity .2s}#local-admin-bar .admin-btn:hover{opacity:.85}#local-admin-bar .admin-danger{background:transparent;border:1px solid #fecaca;color:#dc2626}#local-admin-bar .admin-danger:hover{background:#fef2f2;opacity:1}';
  document.head.appendChild(css);
})();
</script>
</body>`, { });
}

/* ---------- 编辑器页面 ---------- */

function editorHTML(root) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>写文章 · ${hexo.config.title}</title>
<style>
:root {
  --bg: #f6f7f9; --card: #fff; --text: #1f2328; --text2: #57606a;
  --border: #e4e7ec; --accent: #4f6ef7; --accent2: #8a5cf6;
  --mono: Consolas, Menlo, monospace;
}
* { box-sizing: border-box; }
body {
  margin: 0; font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  background: var(--bg); color: var(--text); line-height: 1.6;
}
.topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; background: #fff; border-bottom: 1px solid var(--border);
}
.topbar h1 { font-size: 18px; margin: 0; }
.topbar .actions { display: flex; gap: 10px; }
.container { max-width: 980px; margin: 0 auto; padding: 24px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field.full { grid-column: 1 / -1; }
.field label { font-size: 13px; font-weight: 600; color: var(--text2); }
input, textarea {
  font: inherit; color: inherit;
  border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px;
  background: #fff; outline: none; transition: border-color .2s;
}
input:focus, textarea:focus { border-color: var(--accent); }
textarea#content { min-height: 420px; font-family: var(--mono); font-size: 14px; resize: vertical; }
.Editor {
  background: #fff; border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
}
.EasyMDEContainer .CodeMirror { border: 0; }
.EasyMDEContainer .editor-toolbar { border-color: var(--border); background: #fff; }
.EasyMDEContainer .editor-statusbar { font-size: 12px; color: var(--text2); }
.EasyMDEContainer .CodeMirror { font-family: var(--mono); font-size: 14px; line-height: 1.7; }
.EasyMDEContainer .editor-preview { font-family: inherit; font-size: 14px; }
.EasyMDEContainer .editor-preview pre { background: #f2f3f5; padding: 12px; border-radius: 8px; overflow-x: auto; }
.EasyMDEContainer .editor-preview code { background: #f2f3f5; padding: 2px 5px; border-radius: 4px; font-size: .9em; }
.EasyMDEContainer .editor-preview pre code { background: none; padding: 0; }
.EasyMDEContainer .editor-preview blockquote { border-left: 3px solid var(--accent); margin: 12px 0; padding: 2px 14px; color: var(--text2); }
.EasyMDEContainer .editor-preview img { max-width: 100%; }
.btn {
  border: 0; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: opacity .2s;
}
.btn-primary { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; }
.btn:hover { opacity: .85; }
.toast {
  position: fixed; top: 70px; right: 24px; max-width: 340px;
  background: #111; color: #fff; padding: 10px 16px; border-radius: 10px;
  font-size: 13px; opacity: 0; transform: translateY(-8px);
  transition: all .25s; pointer-events: none; z-index: 20;
}
.toast.show { opacity: 1; transform: translateY(0); }
.toast.error { background: #d93025; }
.hint { font-size: 12px; color: #8b949e; margin: 8px 0 0; }
</style>
<link rel="stylesheet" href="${root}write/lib/easymde.min.css">
</head>
<body>
<div class="topbar">
  <h1>✍ 写文章（本地编辑器 · 保存后提交 GitHub 即可上线）</h1>
  <div class="actions">
    <button class="btn btn-primary" id="save-btn" onclick="save()">保存文章</button>
  </div>
</div>
<div class="container">
  <div class="form-grid">
    <div class="field full">
      <label>标题 *</label>
      <input id="title" placeholder="请输入文章标题">
    </div>
    <div class="field">
      <label>分类</label>
      <input id="categories" placeholder="如：技术笔记（逗号分隔多个）">
    </div>
    <div class="field">
      <label>标签</label>
      <input id="tags" placeholder="如：Hexo, 前端（逗号分隔多个）">
    </div>
    <div class="field full">
      <label>封面图 URL</label>
      <input id="cover" placeholder="可选，文章列表页显示的封面图">
    </div>
    <div class="field full">
      <label>正文（Markdown，使用 <!-- more --> 可设置摘要分隔）</label>
      <textarea id="content" placeholder="开始写作…"></textarea>
    </div>
  </div>
  <p class="hint">文章将自动保存到 <code>source/_posts/<标题>.md</code>，保存成功后可在新页面预览。确认无误后 <code>git add . && git commit -m "新文章" && git push</code> 即可发布到线上。</p>
</div>
<div id="toast" class="toast"></div>

<script src="${root}write/lib/marked.min.js"></script>
<script src="${root}write/lib/easymde.min.js"></script>
<script>
var titleEl = document.getElementById('title');
var catEl = document.getElementById('categories');
var tagEl = document.getElementById('tags');
var coverEl = document.getElementById('cover');
var toastEl = document.getElementById('toast');
var saveBtn = document.getElementById('save-btn');

var EDITING_FILE = null;

var editor = new EasyMDE({
  element: document.getElementById('content'),
  autofocus: false,
  spellChecker: false,
  sideBySideFullscreen: false,
  status: ['lines', 'words', 'cursor'],
  minHeight: '420px',
  placeholder: '开始写作…',
  toolbar: [
    'bold', 'italic', 'strikethrough', 'heading', '|',
    'code', 'quote', '|',
    'unordered-list', 'ordered-list', 'task-list', '|',
    'link', 'image', 'table', 'horizontal-rule', '|',
    {
      name: 'more',
      action: function (ed) {
        var cm = ed.codemirror;
        cm.replaceSelection('\\n<!-- more -->\\n');
        cm.focus();
      },
      className: 'fa fa-scissors',
      title: '插入摘要分隔符 <!-- more -->',
      text: 'more'
    },
    '|', 'preview', 'side-by-side', 'fullscreen', 'guide'
  ],
  autoSave: { enabled: false }
});

(function () {
  var params = new URLSearchParams(location.search);
  var file = params.get('file');
  if (!file) return;
  EDITING_FILE = file;
  fetch('${root}write/load?file=' + encodeURIComponent(file))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.ok) { toast('加载失败：' + d.error, true); return; }
      titleEl.value = d.title || '';
      catEl.value = (d.categories || []).join ? d.categories.join(', ') : d.categories || '';
      tagEl.value = (d.tags || []).join ? d.tags.join(', ') : d.tags || '';
      coverEl.value = d.cover || '';
      editor.value(d.content || '');
      saveBtn.textContent = '更新文章';
      document.querySelector('.topbar h1').textContent = '✍ 编辑文章';
      toast('已加载：' + d.file);
    })
    .catch(function (e) { toast('加载失败：' + e.message, true); });
})();

function toast(msg, isError) {
  toastEl.textContent = msg;
  toastEl.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(function(){ toastEl.className = 'toast'; }, 3200);
}

async function save() {
  var title = titleEl.value.trim();
  if (!title) { toast('请先填写标题', true); titleEl.focus(); return; }
  var payload = {
    title: title,
    categories: catEl.value.trim(),
    tags: tagEl.value.trim(),
    cover: coverEl.value.trim(),
    content: editor.value()
  };
  if (EDITING_FILE) payload.file = EDITING_FILE;
  try {
    var resp = await fetch('${root}write/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var data = await resp.json();
    if (!data.ok) { toast(data.error || '保存失败', true); return; }
    toast('保存成功：' + data.file);
    setTimeout(function(){ window.open(data.url, '_blank'); }, 600);
  } catch (e) {
    toast('保存失败：' + e.message, true);
  }
}

document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
});
</script>
</body>
</html>`;
}

module.exports = {};