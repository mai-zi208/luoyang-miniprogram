const fs = require('fs')
const path = require('path')
const { css, parse, children, ROOT } = require('./mini-wx')
const { stops } = require('../data/tour')

/* 给每条规则的选择器加上 .f-<page> 前缀，让五个页面的 wxss 在同一份文档里互不污染 */
function scope(cssText, mark) {
  const out = []
  let i = 0
  while (i < cssText.length) {
    const at = cssText.indexOf('@', i)
    const brace = cssText.indexOf('{', i)
    if (brace === -1) break
    if (at !== -1 && at < brace) {
      // @keyframes / @font-face：整块保留，找到与之匹配的收尾 }
      const head = cssText.slice(i, brace)
      let depth = 1, j = brace + 1
      while (j < cssText.length && depth) { if (cssText[j] === '{') depth++; else if (cssText[j] === '}') depth--; j++ }
      out.push(head + '{' + cssText.slice(brace + 1, j))
      i = j
      continue
    }
    const sel = cssText.slice(i, brace)
    let depth = 1, j = brace + 1
    while (j < cssText.length && depth) { if (cssText[j] === '{') depth++; else if (cssText[j] === '}') depth--; j++ }
    const prefixed = sel.replace(/(^|,|\n)\s*([^,{}\n]+)/g, (m, g, s) => `${g}${mark} ${s.trim()}`)
    out.push(prefixed + cssText.slice(brace, j).replace(/position:fixed/g, 'position:absolute'))
    i = j
  }
  return out.join('\n')
}

const asset = p => p.replace(/^\/assets\//, '../assets/')
const page = f => parse(fs.readFileSync(path.join(ROOT, f), 'utf8'))

const empress = cls => `<empress class="${cls}"><div class="figure"><img class="fallback" src="${asset('/assets/empress.webp')}"></div></empress>`
const narratorHost = (inner, cls) => `<narrator class="${cls}">${inner}</narrator>`

function render(file, scopeData, comps) {
  const tree = page(file)
  return children(tree.kids, scopeData, comps)
}

/* ---------- 各页 mock ---------- */
const D = stops.slice(0, 5).map(s => s.id)
const picked = new Map(D.map((id, i) => [id, i + 1]))
const chooseMock = {
  durations: [{ count: 3, title: '半日轻游' }, { count: 5, title: '一日漫游' }, { count: 7, title: '深度寻访' }],
  choices: stops.map(s => ({ id: s.id, name: s.name, order: picked.get(s.id) || 0 })),
  route: stops.filter(s => picked.has(s.id)),
  count: 5, ids: D, picked: 5, notice: '', opening: false, turning: false, saved: false, stage: 'stops'
}
const dialRoute = stops.slice(0, 3)
const dialogueMock = {
  route: dialRoute, stop: dialRoute[0], index: 0, online: false, waiting: false, failedQuestion: '', draft: '', flipping: false,
  anchor: 'message-2',
  messages: [
    { id: 1, role: 'user', content: '这里有什么传说？' },
    { id: 2, role: 'assistant', content: '民间传说卢舍那大佛依朕的面容雕成。此说流传甚广，现有材料能确认的是出资记录，面容原型仍无定论。' }
  ]
}
const mapMock = {
  route: stops.slice(0, 5), points: [], markers: [], visible: true, mapNotice: '', locating: false,
  active: stops[1], activeNo: 2, flipping: false, canOpenSettings: true,
  notice: '请在微信设置中允许定位，或直接查看景点。', latitude: 34.66, longitude: 112.46
}
const storyMock = { stop: stops[4], sourceHost: 'ir.pku.edu.cn', legendHost: 'www.edb.gov.hk' }
const introMock = { leaving: false, failed: false, ready: true, petals: [{ id: 1, left: 9, delay: -600 }, { id: 2, left: 31, delay: -2200 }, { id: 3, left: 73, delay: -3800 }, { id: 4, left: 90, delay: -1500 }] }

const narrCss = css(['components/narrator/index.wxss'])
function narratorMarkup(state) {
  const mock = Object.assign({ playing: false, loading: false, mouth: 0, position: 0, duration: 0, notice: '' }, state)
  const inner = render('components/narrator/index.wxml', mock, { empress: (s, c) => empress(c) })
  return inner
}

const frames = [
  ['intro', '01 启动页', 'pages/intro/index.wxss', render('pages/intro/index.wxml', introMock, { empress: (s, c) => empress(c) })],
  ['choose', '02 游历选择 · 第二折', 'pages/choose/index.wxss', render('pages/choose/index.wxml', chooseMock, {
    empress: (s, c) => empress(c),
    
  })],
  ['dialogue', '03 对话页', 'pages/dialogue/index.wxss', render('pages/dialogue/index.wxml', Object.assign({}, dialogueMock, {
    __narr: narratorMarkup({ playing: true, mouth: 5, position: 12, duration: 19, script: dialRoute[0].story })
  }), { empress: (s, c) => empress(c), narrator: sc => narratorHost('<div class="narr-slot">' + sc.__narr + '</div>') })],
  ['map', '04 游历地图', 'pages/map/index.wxss', render('pages/map/index.wxml', mapMock, { empress: (s, c) => empress(c) })],
  ['story', '05 听卷', 'pages/story/index.wxss', render('pages/story/index.wxml', Object.assign({}, storyMock, {
    __narr: narratorMarkup({ playing: false, position: 7, duration: 19 })
  }), { empress: (s, c) => empress(c), narrator: sc => narratorHost('<div class="narr-slot">' + sc.__narr + '</div>') })]
]

let style = css(['app.wxss']) + '\n'
for (const [mark] of frames) style += scope(css([`pages/${mark}/index.wxss`]), '.f-' + mark) + '\n'
style += scope(narrCss, 'narrator') + '\n'
style += scope(css(['components/empress/index.wxss']), 'empress') + '\n'
style += `.f-intro,.f-choose,.f-dialogue,.f-map,.f-story { display:flex;flex-direction:column;min-height:0;flex:1 }
.img-el { display:block }
[data-canvas],[data-map] { background:repeating-linear-gradient(45deg,rgba(198,164,107,.08) 0 8px,transparent 8px 16px) }
.narr-slot { display:contents }
empress,narrator { display:block;position:relative }`

const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>落地检查</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#061114;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#F0E6D4;padding:24px 28px 80px}
h1{font:600 16px serif;color:#F4E6CA;margin-bottom:16px}
.strip{display:flex;gap:20px;align-items:flex-start;overflow-x:auto}
.cell{width:390px;flex:0 0 390px}
.cell>h2{font:500 12px/1.6 sans-serif;color:#8A9B95;letter-spacing:2px;margin-bottom:8px}
.phone{width:390px;height:844px;border:1px solid rgba(198,164,107,.16);border-radius:34px;overflow:hidden;display:flex;flex-direction:column;position:relative}
.navbar{height:44px;flex:0 0 44px;display:flex;align-items:center;justify-content:center;font-size:15px;color:#fff;background:var(--ink-0,#0A1A1D);border-bottom:1px solid rgba(198,164,107,.16)}
${style}
</style></head><body>
<h1>武则天带你游洛阳 · 落地渲染检查（真实 WXML + 真实 WXSS）</h1>
<div class="strip">${frames.map(([mark, label, , body]) => `
<div class="cell"><h2>${label}</h2><div class="phone f-${mark}"><div class="navbar">${label.replace(/^0\d /, '')}</div><div class="f-${mark}-root">${body}</div></div></div>`).join('')}</div>
</body></html>`

fs.writeFileSync(path.join(__dirname, 'landing-check.html'), html)
console.log('written design/landing-check.html', (html.length / 1024).toFixed(1) + 'kb')
