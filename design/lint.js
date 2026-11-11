const fs = require('fs')
const read = f => fs.readFileSync(f, 'utf8')

const appCss = read('app.wxss')
const classesOf = css => {
  const set = new Set()
  css.split('\n').forEach(line => {
    if (!line.includes('{')) return
    const sel = line.split('{')[0]
    ;(sel.match(/\.([A-Za-z][\w-]*)/g) || []).forEach(s => set.add(s.slice(1)))
  })
  return set
}
const usedIn = wxml => {
  const set = new Set()
  const t = wxml
  ;(t.match(/(hover-)?class="[^"]*"/g) || []).forEach(a => {
    const body = a.replace(/^(hover-)?class="/, '').replace(/"$/, '')
    const exprs = body.match(/\{\{[^}]*\}\}/g) || []
    exprs.forEach(e => {
      // 先摘掉比较运算的右操作数：{{stage === 'duration' ? 'now' : ''}} 里 'duration' 是状态值，不是 class
      const cls = e.replace(/[=!]==?\s*('[^']*'|"[^"]*")/g, ' ')
      ;(cls.match(/'([^']*)'/g) || []).concat(cls.match(/"[^"]*"/g) || []).forEach(q =>
        (q.slice(1, -1).match(/[A-Za-z][\w-]*/g) || []).forEach(w => set.add(w)))
    })
    const statics = body.replace(/\{\{[^}]*\}\}/g, ' ')
    statics.split(/\s+/).forEach(w => { if (/^[A-Za-z][\w-]*$/.test(w)) set.add(w) })
  })
  return set
}
const appCls = classesOf(appCss)
const groups = [
  ...['intro', 'choose', 'dialogue', 'map', 'story'].map(p => [`pages/${p}/`, 'page:' + p]),
  ...['narrator', 'empress'].map(c => [`components/${c}/`, 'comp:' + c])
]
for (const [dir, name] of groups) {
  const css = read(dir + 'index.wxss')
  let wxml
  try { wxml = read(dir + 'index.wxml') } catch (e) { continue }
  const bal = (css.match(/{/g) || []).length - (css.match(/}/g) || []).length
  const own = classesOf(css)
  const avail = new Set([...own, ...appCls])
  const used = usedIn(wxml)
  const missing = [...used].filter(x => !avail.has(x))
  const hex = [...new Set(css.match(/#[0-9a-fA-F]{3,8}\b/g) || [])]
  const rgba = [...new Set((css.match(/rgba\([^)]*\)/g) || []).filter(v => !v.includes('var(')))]
  console.log(`\n== ${name} == braces:${bal === 0 ? 'ok' : 'UNBALANCED ' + bal} | own:${own.size} | used:${used.size}`)
  if (missing.length) console.log('   ?? 未定义的 class:', missing.join(', '))
  if (hex.length) console.log('   字面 hex:', hex.join(' '))
  if (rgba.length) console.log('   字面 rgba:', rgba.join(' '))
}
