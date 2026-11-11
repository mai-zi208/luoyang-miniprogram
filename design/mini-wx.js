// 把真实的 WXML + WXSS 渲染成 390pt 检查页：验证 token 解析、盒模型与容量，而非原型 CSS。
const fs = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '..')
const R = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
const PX = 390 / 750

/* ---------- WXSS -> CSS ---------- */
function css(files) {
  let out = files.map(f => R(f)).join('\n')
  // 注释必须先剥掉：scope() 会把独占一行的 /* … */ 当作选择器，和下一条规则拼成
  // .f-map .f-map .point 这种永不命中的后代选择器，整条规则被静默丢弃。
  out = out.replace(/\/\*[\s\S]*?\*\//g, '')
  out = out.replace(/@import[^;]*;/g, '')
  out = out.replace(/env\(safe-area-inset-\w+\)/g, '0px')
  out = out.replace(/(-?\d*\.?\d+)rpx/g, (_, n) => (parseFloat(n) * PX).toFixed(2) + 'px')
  out = out.replace(/(\d+(?:\.\d+)?)vh/g, (_, n) => (parseFloat(n) * 8.44).toFixed(2) + 'px')
  out = out.replace(/\bpage\s*\{/g, '.phone {')
  out = out.replace(/\bbutton::after\s*\{[^}]*\}/g, '')
  return out
}

/* ---------- WXML -> HTML ---------- */
const VOID = ['image', 'input']
const TAGS = { view: 'div', text: 'span', 'scroll-view': 'div', navigator: 'div', input: 'input', image: 'img', canvas: 'div', map: 'div' }

const un = v => String(v).replace(/^\s*\{\{|\}\}\s*$/g, '').trim()
const asset = p => String(p).replace(/^\/assets\//, '../assets/')
const ev = (expr, scope) => {
  try { return new Function('with(this){return (' + un(expr) + ')}').call(scope) } catch (e) { return undefined }
}
const bind = (str, scope) => String(str).replace(/\{\{([^}]*)\}\}/g, (_, e) => {
  const v = ev(e, scope)
  return v === undefined || v === null ? '' : v
})

// 属性值里的 {{a > b ? x : y}} 带尖括号，必须按引号状态扫描，不能匹配到第一个 >
function scan(src) {
  const out = []
  let i = 0
  while (i < src.length) {
    if (src[i] === '<') {
      let j = i + 1, q = ''
      while (j < src.length) {
        const c = src[j]
        if (q) { if (c === q) q = '' }
        else if (c === '"' || c === "'") q = c
        else if (c === '>') break
        j++
      }
      out.push(src.slice(i, Math.min(j + 1, src.length)))
      i = j + 1
    } else {
      let j = src.indexOf('<', i)
      if (j === -1) j = src.length
      out.push(src.slice(i, j))
      i = j
    }
  }
  return out
}

function parse(src) {
  const tokens = scan(src.replace(/<!--[\s\S]*?-->/g, ''))
  const root = { tag: '#root', attrs: {}, kids: [] }
  const stack = [root]
  for (const t of tokens) {
    if (t.startsWith('<')) {
      if (/^<\//.test(t)) { stack.pop(); continue }
      const tag = /^<([\w-]+)/.exec(t)[1]
      const attrs = {}
      const inner = t.replace(/^</, '').replace(/\/?>$/, '')
      // 同时支持 key="value" 与裸属性（wx:else / selectable）
      ;(inner.match(/[\w:.-]+="[^"]*"|[\w:.-]+/g) || []).forEach(a => {
        const i = a.indexOf('=')
        if (i === -1) { attrs[a] = '' ; return }
        attrs[a.slice(0, i)] = a.slice(i + 2, -1)
      })
      Object.keys(attrs).forEach(k => { if (attrs[k] === '' && !/^[\w:.-]+$/.test(k)) delete attrs[k] })
      const node = { tag, attrs, kids: [] }
      stack[stack.length - 1].kids.push(node)
      if (!/\/>$/.test(t) && !VOID.includes(tag)) stack.push(node)
    } else {
      const text = t.replace(/^\s+|\s+$/g, '')
      if (text) stack[stack.length - 1].kids.push({ tag: '#text', attrs: {}, kids: [], text: t })
    }
  }
  return root
}

// wx:if / wx:elif / wx:else 必须作为相邻兄弟成组判断
function children(nodes, scope, comps) {
  let html = ''
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (n.attrs['wx:if'] !== undefined) {
      const group = [n]
      while (nodes[i + 1] && (nodes[i + 1].attrs['wx:elif'] !== undefined || nodes[i + 1].attrs['wx:else'] !== undefined)) group.push(nodes[++i])
      const hit = group.find(g => g.attrs['wx:else'] !== undefined || ev(g.attrs['wx:if'] !== undefined ? g.attrs['wx:if'] : g.attrs['wx:elif'], scope))
      if (hit) html += one(hit, scope, comps)
      continue
    }
    html += emit(n, scope, comps)
  }
  return html
}

function emit(n, scope, comps) {
  const a = n.attrs
  if (n.tag === '#text') return bind(n.text, scope)
  if (a['wx:for'] !== undefined) {
    const list = ev(a['wx:for'], scope) || []
    const key = a['wx:for-item'] || 'item'
    const idx = a['wx:for-index'] || 'index'
    return list.map((v, i) => {
      const inner = Object.assign({}, scope, { [key]: v, [idx]: i, item: v, index: i })
      return one(n, inner, comps)
    }).join('')
  }
  if (a['wx:if'] !== undefined && !ev(a['wx:if'], scope)) return ''
  if (a['wx:else'] !== undefined || a['wx:elif'] !== undefined) return ''
  return one(n, scope, comps)
}

function one(n, scope, comps) {
  const a = n.attrs
  if (comps[n.tag]) return comps[n.tag](scope, a['class'] || '')
  const tag = TAGS[n.tag] || 'div'
  const cls = bind(a['class'] || '', scope)
  const style = a.style ? bind(a.style, scope) : ''
  const bits = [cls && `class="${cls}"`, style && `style="${style}"`].filter(Boolean)
  if (n.tag === 'image') bits.push(`src="${asset(bind(a.src, scope))}"`)
  if (n.tag === 'input') bits.push(`placeholder="${bind(a.placeholder || '', scope)}" value="${bind(a.value || '', scope)}"`)
  if (n.tag === 'canvas') bits.push(`data-canvas="${a.id || ''}"`)
  if (n.tag === 'map') bits.push('data-map="1"')
  const open = `<${tag} ${bits.join(' ')}>`
  if (VOID.includes(n.tag) || tag === 'input' || tag === 'img') return open
  return open + children(n.kids, scope, comps) + `</${tag}>`
}

module.exports = { css, parse, children, R, ROOT, PX }
