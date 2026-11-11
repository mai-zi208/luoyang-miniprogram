/* ===== 状态 ===== */
const KEY = 'ly-redesign-v1';
const DEFAULT = {
  screen: 'intro', stage: 'duration', count: 5, order: [1, 2, 3],
  idx: 0, active: null, messages: [], waiting: false, failed: false, notice: '', finished: false, failedVoice: false,
  playing: false, pos: 0, locating: false, located: false, mapErr: false, expanded: false,
  tw: { motion: true, rail: true, route: true, contrast: false, petals: 6, mode: 'local', breakQA: false }
};
let S = load();
function load() {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}'), tw: { ...DEFAULT.tw, ...(JSON.parse(localStorage.getItem(KEY) || '{}').tw || {}) } }; }
  catch (e) { return { ...DEFAULT }; }
}
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }

const SCREENS = [
  ['intro', '01', '启动页'], ['choose', '02', '游历选择'], ['dialogue', '03', '对话页'],
  ['map', '04', '游历地图'], ['story', '05', '听卷'], ['spec', '06', '组件规范']
];
const route = () => resolve(S.order);
const cur = () => route()[S.idx] || route()[0];
const NAV = { intro: '', choose: '武则天带你游洛阳', dialogue: '武则天带你游洛阳', map: '神都 · 点位', story: '听卷', spec: '组件规范' };

const $ = s => document.querySelector(s);
const vp = () => $('#viewport');
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const dur = st => Math.max(18, Math.round(st.story.length / 3.4));

/* ===== 路由 ===== */
function go(screen, opts = {}) {
  if (S.screen === screen && !opts.force) { render(); return; }
  clearInterval(timer); S.playing = false;
  const stream = document.createElement('div');
  stream.className = 'goldstream';
  vp().appendChild(stream);
  setTimeout(() => {
    S.screen = screen;
    if (screen === 'dialogue' && opts.restart) { S.idx = 0; S.messages = []; seed(); }
    if (screen === 'story') S.active = opts.id ?? (S.active || cur().id);
    stream.remove(); render(); save();
  }, S.tw.motion ? 340 : 0);
}

/* ===== 各屏 ===== */
const noRoute = () => `<div class="scroll" style="display:flex;align-items:center;justify-content:center">
  <div class="card" style="width:100%;background:var(--ink-0)">
    <div class="row"><div class="section">还没选定景点</div><span class="chip">空</span></div>
    <div class="muted" style="margin-top:6px">先择时长，再勾景点，朕陪你走。</div>
    <button class="btn ghost sm" data-act="to-choose" style="margin-top:10px">返回游历选择</button>
  </div></div>`;
function vIntro() {
  const petals = Array.from({ length: S.tw.petals }, (_, i) =>
    `<span class="petal" style="left:${8 + i * 14}%;animation-delay:-${i * 1.5}s"></span>`).join('');
  const rows = [1, 2, 3, 4, 5].map(n =>
    `<img src="../assets/palace-${n}.webp" alt="" style="animation-delay:${300 + n * 180}ms">`).join('');
  return `<div class="opening">
    <div class="mist mist-a"></div><div class="mist mist-b"></div>
    <div class="inscription"><div class="kicker">武周 · 洛阳</div><div class="display" style="margin-top:8px">神都筑影</div></div>
    <div class="buildings">${rows}</div>
    <div class="empress-full"><img src="../assets/empress.webp" alt="武则天立绘"></div>
    ${petals}
    <div class="invite">女皇邀你，共览神都洛阳</div>
    <button class="skip" data-act="to-choose">跳过 · 进入游历选择</button>
  </div>`;
}

function vChoose() {
  const stops = route();
  const stage1 = `<div class="card enter" data-card>
    <div class="row"><div class="kicker">第一折</div><span class="chip"><span class="dot"></span>本地已存</span></div>
    <div class="section" style="margin-top:6px">游历时长</div>
    <div class="three" style="margin-top:12px">
      ${DURATIONS.map(d => `<button class="choice dur" data-act="dur" data-count="${d.count}" aria-pressed="${d.count === S.count}">
        <div style="font-size:14px">${d.title}</div><div class="muted">${d.count} 站</div></button>`).join('')}
    </div>
  </div>`;
  const stage2 = `<div class="card enter" data-card>
    <div class="row"><div class="kicker">第二折 · ${S.count} 站</div>
      <button class="btn text" data-act="to-duration">‹ 重选时长</button></div>
    <div class="row" style="margin-top:8px"><div class="section">景点勾选</div>
      <div class="muted counter">已选 <b>${S.order.length}</b> / ${S.count}</div></div>
    <div class="two" style="margin-top:12px">
      ${STOPS.map(st => { const o = S.order.indexOf(st.id) + 1;
        return `<button class="choice" data-act="toggle" data-id="${st.id}" aria-pressed="${!!o}">
          <span class="badge">${o || '＋'}</span><span>${st.name}</span></button>`; }).join('')}
    </div>
    <div class="route">${routePreview()}</div>
    ${S.notice ? `<div class="errline" style="color:var(--text-mid)">— ${esc(S.notice)}</div>` : ''}
  </div>`;
  const ready = S.order.length === S.count;
  return `<div class="scroll" style="padding-bottom:96px">
    <div class="watermark" style="top:-14px;left:-30px;width:450px;height:190px;opacity:.13">
      <img src="../assets/palace-1.webp" style="width:100%;height:100%;object-fit:contain"></div>
    <div class="welcome">
      <img src="../assets/empress.webp" alt="">
      <div><div class="kicker">武周 · 神都游历</div>
        <div class="title" style="font-size:22px;margin:6px 0 8px">请与朕选定本次游历</div>
        <div class="muted">${S.stage === 'duration' ? '先择游历时长' : '依照想走的顺序勾选景点'}</div></div>
    </div>
    ${rail(S.stage === 'duration' ? 1 : 2)}
    ${S.stage === 'duration' ? stage1 : stage2}
    ${S.stage === 'stops' ? `<div class="muted" style="margin-top:12px">缩短时长会保留前几站；换选时先取消某一处。</div>` : ''}
  </div>
  ${S.stage === 'stops' ? `<button class="btn primary block sticky" data-act="start" ${ready ? '' : 'disabled'}>启程入神都</button>` : ''}`;
}

function routePreview() {
  const r = route();
  if (!r.length) return `<span class="faint">路线预览：尚未勾选</span>`;
  return r.map((st, i) => `${i ? '<span class="arrow">›</span>' : ''}
    <span class="node" style="animation-delay:${i * 60}ms"><i>${i + 1}</i>${st.name}</span>`).join('');
}

function rail(now) {
  if (!S.tw.rail) return '';
  const L = [['壹', '时长'], ['贰', '景点'], ['叁', '启程']];
  return `<div class="step-rail">${L.map(([n, lb], i) => {
    const st = i + 1 === now ? 'now' : i + 1 < now ? 'done' : '';
    return `<span class="st ${st}"><b>${n}</b><span class="lb">${lb}</span></span>${i < 2 ? '<span class="bar"></span>' : ''}`;
  }).join('')}</div>`;
}

function railStops() {
  if (!S.tw.rail) return '';
  const r = route();
  return `<div class="step-rail">${r.map((st, i) => {
    const cls = i === S.idx ? 'now' : i < S.idx ? 'done' : '';
    return `<span class="st ${cls}" title="${st.name}"><b>${i + 1}</b></span>${i < r.length - 1 ? '<span class="bar"></span>' : ''}`;
  }).join('')}</div>`;
}

function narrator(st, compact, forced) {
  const playing = forced ? forced === 'playing' : S.playing;
  const pos = forced === 'playing' ? 12 : (forced ? 0 : S.pos);
  const total = dur(st);
  const pct = Math.min(100, (pos / total) * 100);
  const mouth = playing ? `<span class="mouth">${('<u style="height:' + (3 + Math.random() * 7) + 'px"></u>').repeat(5)}</span>` : '';
  return `<div class="narrator">
    <div class="ink"><img src="../assets/palace-${st.palace}.webp" style="width:100%;height:100%;object-fit:contain"></div>
    <img class="p" src="../assets/empress.webp" alt="">
    <div class="v">
      <div class="row"><div class="kicker">${playing ? '播放中 · 口型随音轨' : '女皇 · 语音讲解'}</div>${compact ? '' : mouth}</div>
      <div class="row" style="margin-top:8px;justify-content:flex-start">
        <button class="btn ghost sm" data-act="${forced ? '' : 'voice'}" ${S.failedVoice ? 'disabled' : ''}>${playing ? '暂停讲解' : (pos ? '继续讲解' : '聆听此站')}</button>
        ${compact ? '' : `<span class="chip"><span class="dot ${S.tw.mode === 'ai' ? 'live' : ''}"></span>${S.tw.mode === 'ai' ? 'AI 文字对话' : '本地导览'}</span>`}
      </div>
      ${pos || playing ? `<div class="meter"><span>${mmss(pos)}</span><span class="track"><span class="fill" style="width:${pct}%"></span></span><span>${mmss(total)}</span></div>` : ''}
      ${S.failedVoice ? `<div class="errline" data-act="retry-voice">语音暂不可用，点此重试本段音频</div>` : ''}
    </div>
  </div>`;
}

function vDialogue() {
  if (!route().length) return noRoute();
  const st = cur(), r = route(), last = S.idx === r.length - 1;
  const done = S.finished;
  return `
  <div class="top">
    <div class="grow"><div class="kicker">第 ${S.idx + 1} / ${r.length} 站</div>
      <div class="title" style="font-size:20px;margin-top:4px">${st.name}</div></div>
    <button class="btn ghost sm" data-act="to-map">游历地图</button>
  </div>
  <div style="padding:0 var(--s-4)">${railStops()}${narrator(st)}</div>
  <div class="msgs" id="msgs">${S.messages.map(m => `
    <div class="msg ${m.role}"><div class="who">${m.role === 'me' ? '你' : '武则天'}</div>
      <div class="bubble">${esc(m.text)}</div></div>`).join('')}
    ${S.waiting ? `<div class="thinking"><u></u><u></u><u></u>女皇正在思索…</div>` : ''}
    ${S.failed ? `<div class="errline" data-act="retry">讲解暂时没回应，点此重试</div>` : ''}
  </div>
  <div class="controls">
    <div class="acts">
      <button class="btn ghost sm" data-act="ask" data-q="讲讲这里的故事" ${S.waiting ? 'disabled' : ''}>此站故事</button>
      <button class="btn ghost sm" data-act="ask" data-q="这里有什么传说？" ${S.waiting ? 'disabled' : ''}>问传说</button>
      <button class="btn ${done ? 'ghost' : 'primary'} sm" data-act="next" style="margin-left:auto"
        ${S.waiting ? 'disabled' : ''}>${done ? '游历已完成' : (last ? '完成游历' : '前往下一站')}</button>
    </div>
    <div class="composer">
      <div class="field ${S.failed ? 'fail' : ''}"><input id="q" name="question" maxlength="300" placeholder="想问朕些什么？" enterkeyhint="send" aria-label="向女皇提问"></div>
      <button class="btn ghost" style="padding:0 var(--s-4)" data-act="send" ${S.waiting ? 'disabled' : ''}>发送</button>
    </div>
  </div>`;
}

function vMap() {
  const r = route();
  if (!r.length) return noRoute();
  const lats = r.map(s => s.lat), lngs = r.map(s => s.lng);
  const [la0, la1] = [Math.min(...lats), Math.max(...lats)], [lo0, lo1] = [Math.min(...lngs), Math.max(...lngs)];
  const px0 = s => 12 + ((s.lng - lo0) / ((lo1 - lo0) || 1)) * 76;
  const py0 = s => 14 + ((la1 - s.lat) / ((la1 - la0) || 1)) * 66;
  const placed = [];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const free = (x, y) => !placed.some(p => Math.hypot(p.x - x, p.y - y) < 11);
  r.forEach(s => {
    let x = px0(s), y = py0(s);
    if (!(x >= 8 && x <= 92 && y >= 10 && y <= 86 && free(x, y))) {
      for (let rad = 7; rad <= 34 && !(x >= 8 && x <= 92 && y >= 10 && y <= 86 && free(x, y)); rad += 7) {
        for (let a = 0; a < 360; a += 45) {
          const nx = clamp(px0(s) + rad * Math.cos(a * Math.PI / 180), 8, 92);
          const ny = clamp(py0(s) + rad * Math.sin(a * Math.PI / 180) * .8, 10, 86);
          if (free(nx, ny)) { x = nx; y = ny; break; }
        }
      }
    }
    placed.push({ id: s.id, x, y });
  });
  const pos = s => placed.find(p => p.id === s.id);
  const act = byId(S.active) || cur();
  const shown = S.expanded ? r : r.slice(0, 3);
  return `<div class="scroll" style="padding-bottom:214px">
    <div class="watermark" style="top:-6px;left:0;width:100%;height:96px;opacity:.10">
      <img src="../assets/palace-4.webp" style="width:100%;height:100%;object-fit:contain"></div>
    <div class="kicker" style="margin-top:var(--s-4)">神都 · 点位</div>
    <div class="title" style="font-size:24px;margin:4px 0 0">游历地图</div>
    <div class="mapbox">
      <div class="grid"></div>
      ${r.map((s, i) => `<button class="mk ${s.id === act.id ? 'on' : ''}" data-act="mk" data-id="${s.id}"
        style="left:${pos(s).x}%;top:${pos(s).y}%" aria-label="${s.name}">${i + 1}</button>`).join('')}
      ${S.located ? `<span class="me-dot" style="left:${pos(act).x + 5}%;top:${pos(act).y + 7}%"></span>` : ''}
    </div>
    <div class="card">
      <div class="row"><div class="section">本次景点</div><span class="chip">${r.length} 站</span></div>
      <div style="margin-top:6px">
        ${shown.map(s => `<button class="list-row ${s.id === act.id ? 'on' : ''}" data-act="mk" data-id="${s.id}">
          <span class="num">${r.indexOf(s) + 1}</span>${s.name}
          ${r.indexOf(s) < S.idx ? '<span class="tag-done">已到</span>' : r.indexOf(s) === S.idx ? '<span class="tag-now">当前</span>' : ''}
        </button>`).join('')}
        ${r.length > 3 ? `<button class="btn text" data-act="expand" style="margin-top:8px">${S.expanded ? '收起 ‹' : `展开其余 ${r.length - 3} 站 ›`}</button>` : ''}
      </div>
    </div>
    <div class="muted" style="margin-top:10px">景点坐标为参考点位，出行前请核对实际入口。</div>
  </div>
  <div class="scrim"></div>
  <div class="card raised panel">
    ${S.mapErr ? `<div class="row"><div class="section" style="color:var(--alert)">定位未授权</div><span class="chip alert">授权</span></div>
      <div class="muted" style="margin-top:6px">不授权也可以看景点，只是不显示你的位置。</div>
      <div class="row" style="margin-top:10px;justify-content:flex-start">
        <button class="btn ghost sm" data-act="settings">打开定位设置</button>
        <button class="btn text" data-act="dismiss-err" style="margin-left:10px">仍只看景点</button>
      </div>`
    : `<div class="row" style="margin-bottom:10px">
        <div><div class="kicker">第 ${r.indexOf(act) + 1} 站</div><div class="section" style="margin-top:4px">${act.name}</div></div>
        <button class="btn ghost sm" data-act="to-story" data-id="${act.id}">打开听卷</button></div>
      <button class="btn primary block ${S.locating ? 'loading' : ''}" data-act="locate" ${S.locating ? 'disabled' : ''}>${S.located ? '已定位 · 重新定位' : '我的位置'}</button>`}
  </div>`;
}

function vStory() {
  if (!route().length) return noRoute();
  const st = byId(S.active) || cur();
  return `<div class="scroll">
    <div class="kicker" style="margin-top:var(--s-4)">神都 · 听卷</div>
    <div class="title" style="font-size:26px;margin:6px 0 0">${st.name}</div>
    <img class="hero" src="../assets/palace-${st.palace}.webp" alt="">
    ${narrator(st, true)}
    <div class="card">
      <div class="row"><div class="section">此站讲解</div><span class="chip">底稿</span></div>
      <div class="body" style="margin-top:10px">${esc(st.story)}</div>
      <div class="src">来源：${esc(st.source)}</div>
    </div>
    ${st.legend ? `<div class="card featured">
      <div class="row"><div class="section">传说</div><span class="chip"><span class="dot" style="background:var(--peony-500)"></span>非正史</span></div>
      <div class="body" style="margin-top:10px;color:var(--text-mid)">${esc(st.legend)}</div>
      <div class="src">来源：${esc(st.legendSource)}</div>
    </div>` : `<div class="card"><div class="row"><div class="section">传说</div><span class="chip">无</span></div>
      <div class="muted" style="margin-top:10px">此处暂无可靠传说记录，不作演绎。</div></div>`}
    <button class="btn ghost block" data-act="to-dialogue" style="margin-top:var(--s-4)">回到本站对话</button>
  </div>`;
}

function vSpec() {
  const fig = (cap, close) => `<figure><img class="${close ? 'crop' : ''}" src="../assets/empress.webp"><figcaption>${cap}</figcaption></figure>`;
  return `<div class="scroll">
    <div class="spec" style="margin-top:var(--s-4)"><b>EMPRESS 立绘</b>
      <div class="grid">${fig('全身 · 静息')}${fig('近景 · 口型开', 1)}${fig('加载失败 · 静态回退')}</div>
      <div class="muted" style="margin-top:10px">Canvas 变形动效不动，仅统一尺寸 token：全身 216×350rpx，近景 206×230rpx。</div>
    </div>
    <div class="spec"><b>NARRATOR 语音条 · 三态</b>
      ${narrator(STOPS[2], false, 'idle')}
      <div style="height:8px"></div>${narrator(STOPS[2], false, 'playing')}
      <div style="height:8px"></div>${narratorFailed()}</div>
    <div class="spec"><b>BUTTON 五态</b>
      <div class="grid">
        <button class="btn primary sm">primary</button><button class="btn primary sm" style="transform:scale(.98);filter:brightness(1.07)">按压</button>
        <button class="btn ghost sm">ghost</button><button class="btn sm" disabled>禁用</button>
        <button class="btn ghost sm loading">加载中</button>
      </div></div>
    <div class="spec"><b>STATE 模板（空 / 错 / 授权）</b>
      <div class="card" style="background:var(--ink-0);margin-top:0">
        <div class="row"><div class="section">还没选定景点</div><span class="chip">空</span></div>
        <div class="muted" style="margin-top:6px">先择时长，再勾景点，朕陪你走。</div>
        <button class="btn ghost sm" data-act="to-choose" style="margin-top:10px">返回游历选择</button>
      </div>
      <div class="card" style="background:var(--ink-0);border-color:rgba(235,169,175,.32)">
        <div class="row"><div class="section" style="color:var(--alert)">讲解暂时没回应</div><span class="chip alert">错</span></div>
        <div class="muted" style="margin-top:6px">提问与近期对话会发给后端；本次重试不会重复计费。</div>
        <button class="btn ghost sm" style="margin-top:10px">重试</button>
      </div>
      <div class="muted" style="margin-top:10px">alert 色全站只用于错误与重试；三块共用同一容器与间距。</div>
    </div>
  </div>`;
}
function narratorFailed() {
  return `<div class="narrator"><div class="ink"><img src="../assets/palace-2.webp" style="width:100%;height:100%;object-fit:contain"></div>
    <img class="p" src="../assets/empress.webp" alt="">
    <div class="v"><div class="kicker">讲解暂不可用</div>
      <div class="errline" style="margin-top:8px">点此重试本段音频</div></div></div>`;
}

/* ===== 交互 ===== */
const ACTIONS = {
  'to-choose': () => go('choose'),
  'to-dialogue': () => go('dialogue'),
  'to-map': () => go('map'),
  'to-story': (el) => go('story', { id: +el.dataset.id }),
  'to-duration': () => turn('duration'),
  'expand': () => { S.expanded = !S.expanded; render(); },
  dur: (el) => {
    S.count = +el.dataset.count;
    S.order = S.order.slice(0, S.count);
    S.notice = '';
    turn('stops');
  },
  toggle: (el) => {
    const id = +el.dataset.id, at = S.order.indexOf(id);
    if (at >= 0) { S.order.splice(at, 1); S.notice = ''; }
    else if (S.order.length >= S.count) { S.notice = `已选满 ${S.count} 站，先取消一处再换选`; }
    else { S.order.push(id); S.notice = ''; S._pop = id; }
    render();
  },
  start: () => { S.finished = false; S.idx = 0; S.messages = []; seed(); go('dialogue', { force: true }); },
  voice: () => {
    S.playing = !S.playing;
    if (S.playing) tick(); else clearInterval(timer);
    render();
  },
  'retry-voice': () => { S.failedVoice = false; render(); },
  ask: (el) => send(el.dataset.q),
  send: () => {
    const i = $('#q'); const t = (i && i.value.trim()) || '';
    send(t || '想问朕些什么？');
  },
  next: () => {
    const r = route();
    if (S.idx >= r.length - 1) { S.finished = true; render(); return; }
    S.idx++; S.pos = 0; S.playing = false; S.messages = []; S.failed = false; seed(); render(); save();
  },
  retry: () => { S.failed = false; replay(); },
  mk: (el) => { S.active = +el.dataset.id; render(); },
  locate: () => {
    S.locating = true; render();
    setTimeout(() => {
      S.locating = false;
      if (S.tw.breakQA) { S.mapErr = true; S.located = false; }
      else { S.located = true; }
      render(); save();
    }, 900);
  },
  'dismiss-err': () => { S.mapErr = false; render(); },
  settings: () => { S.mapErr = false; S.notice = '落地时调用 wx.openSetting'; render(); }
};

function turn(stage) {
  const card = $('[data-card]');
  if (card && S.tw.motion) {
    card.classList.add('turn-out');
    setTimeout(() => { S.stage = stage; render(); save(); }, 200);
  } else { S.stage = stage; render(); save(); }
}

function seed() {
  const st = cur();
  S.messages = [{ role: 'empress', text: st.story }];
}
function send(q) {
  S.messages.push({ role: 'me', text: q });
  S.waiting = true; S.failed = false; render();
  setTimeout(() => {
    S.waiting = false;
    if (S.tw.breakQA) { S.failed = true; render(); return; }
    const st = cur();
    let a;
    if (q === '讲讲这里的故事') a = st.story;
    else if (q === '这里有什么传说？') a = st.legend || '此处暂无可靠传说记录，朕不作演绎。';
    else a = S.tw.mode === 'ai'
      ? '［接入 services/dialogue.js 后，此处为千问基于本站底稿的角色演绎回复。］'
      : '［本地导览：仅能回答与本站相关的问题。落地时此处为基于当前站的有限回复。］';
    S.messages.push({ role: 'empress', text: a });
    render(); save();
  }, 900);
}
function replay() { const last = S.messages[S.messages.length - 1]; S.messages.pop(); if (last && last.role === 'me') send(last.text); else render(); }

let timer = null;
function tick() {
  clearInterval(timer);
  timer = setInterval(() => {
    const total = dur(cur());
    S.pos += 0.2;
    if (S.pos >= total) { S.pos = 0; S.playing = false; clearInterval(timer); render(); return; }
    const m = $('.mouth'), f = $('.meter .fill');
    if (f) f.style.width = (S.pos / total * 100) + '%';
    if (m) [...m.children].forEach(u => u.style.height = (3 + Math.random() * 7) + 'px');
    const t = $('.meter span'); if (t) t.textContent = mmss(S.pos);
  }, 200);
}

/* ===== 渲染 ===== */
const VIEWS = { intro: vIntro, choose: vChoose, dialogue: vDialogue, map: vMap, story: vStory, spec: vSpec };
function render() {
  document.documentElement.classList.toggle('no-motion', !S.tw.motion);
  document.documentElement.classList.toggle('contrast', S.tw.contrast);
  document.documentElement.classList.toggle('hide-rail', !S.tw.rail);
  document.documentElement.classList.toggle('hide-route', !S.tw.route);
  const nav = $('#navbar');
  const back = ['dialogue', 'map', 'story'].includes(S.screen);
  nav.innerHTML = `${back ? '<button class="nback" data-act="' + (S.screen === 'dialogue' ? 'to-choose' : 'to-dialogue') + '">‹ 返回</button>' : ''}${NAV[S.screen]}`;
  const before = $('#msgs') ? $('#msgs').scrollTop : 0;
  vp().innerHTML = VIEWS[S.screen]();
  const msgs = $('#msgs'); if (msgs) msgs.scrollTop = msgs.scrollHeight;
  if (S._pop) { const b = $(`.choice[data-id="${S._pop}"] .badge`); if (b) b.classList.add('pop'); S._pop = null; }
  $('#nav').innerHTML = SCREENS.map(([k, n, l]) =>
    `<button data-screen="${k}" aria-current="${k === S.screen}"><i>${n}</i>${l}</button>`).join('');
  save();
}

/* ===== 事件 ===== */
document.addEventListener('click', e => {
  const act = e.target.closest('[data-act]');
  if (act) { e.preventDefault(); ACTIONS[act.dataset.act](act); return; }
  const scr = e.target.closest('[data-screen]');
  if (scr) go(scr.dataset.screen, { force: true });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'q') { e.preventDefault(); ACTIONS.send(); }
});
$('#resetBtn').onclick = () => { localStorage.removeItem(KEY); S = load(); S.screen = 'intro'; render(); };

/* ===== Tweaks ===== */
const TW = [
  ['motion', '动效', 'switch'], ['rail', '折次进度条 #4', 'switch'], ['route', '路线预览 #11', 'switch'],
  ['contrast', '高对比金字', 'switch'], ['breakQA', '模拟失败态', 'switch'],
  ['petals', '花瓣数量', ['0', '6', '12']], ['mode', '问答模式', ['local', 'ai']]
];
function buildTweaks() {
  $('#tweaksPanel').innerHTML = `<h3>Tweaks</h3>` + TW.map(([k, label, kind]) => {
    if (kind === 'switch') return `<label><span>${label}</span>
      <button class="switch" data-tw="${k}" role="switch" aria-checked="${S.tw[k]}"></button></label>`;
    return `<label><span>${label}</span><select data-tw="${k}">
      ${kind.map(o => `<option value="${o}" ${String(S.tw[k]) === o ? 'selected' : ''}>${o === 'local' ? '本地导览' : o === 'ai' ? 'AI 文字' : o}</option>`).join('')}
    </select></label>`;
  }).join('') + `<div class="rule" style="margin:10px 0"></div>
    <div class="faint">高对比档用于验证「金字提亮」这一最高风险改动；模拟失败态用于检查错误与授权三态。</div>`;
}
$('#tweaksBtn').onclick = () => { const t = $('#tweaks'); t.classList.toggle('open'); $('#tweaksBtn').setAttribute('aria-expanded', t.classList.contains('open')); };
$('#tweaksPanel').addEventListener('click', e => {
  const b = e.target.closest('[data-tw]'); if (!b) return;
  S.tw[b.dataset.tw] = !S.tw[b.dataset.tw]; buildTweaks(); render();
});
$('#tweaksPanel').addEventListener('change', e => {
  const s = e.target.closest('[data-tw]'); if (!s) return;
  S.tw[s.dataset.tw] = s.value; render();
});

/* ===== 启动 ===== */
const hashScreen = (location.hash || '').replace('#', '');
if (SCREENS.some(s => s[0] === hashScreen)) S.screen = hashScreen;
buildTweaks(); render();
if (S.screen === 'intro' && S.tw.motion) setTimeout(() => { if (S.screen === 'intro') go('choose', { force: true }); }, 3600);
