const { bind, EASE, BEAT } = require('../../utils/motion')
const names = ['应天门', '明堂', '天堂', '九洲池', '龙门石窟奉先寺']

Page({
  data: { leaving: false, failed: false, ready: false, petals: [{id:1,left:9,delay:-600},{id:2,left:31,delay:-2200},{id:3,left:73,delay:-3800},{id:4,left:90,delay:-1500}] },
  onReady() {
    this.motion = bind(this)
    this.glow = { value: 0 }
    this.motion.cue([
      // 辉光走一遍「起—盛—收」，收束后画布不再需要逐帧重绘。
      { gap: 2250, run: () => this.motion.drive(this.glow, { value: [0, 1, 0], duration: 280, easing: EASE.inOut }) },
      { gap: 300, run: () => { this.revealed = true } },
      // 显影与辉光收束后停住：邀约行入树成为入口，等用户点击才换页。
      { gap: 230, run: () => this.setData({ ready: true }) }
    ])
    this.createSelectorQuery().select('#silhouettes').fields({ node: true, size: true }).exec(results => {
      const result = results && results[0]
      if (this.closed || !result || !result.node) return
      const { node, width, height } = result
      const ratio = Math.min(2, wx.getWindowInfo ? wx.getWindowInfo().pixelRatio || 1 : 1)
      node.width = width * ratio
      node.height = height * ratio
      const ctx = node.getContext('2d')
      if (!ctx) return
      ctx.scale(ratio, ratio)
      const plates = names.map((name, index) => {
        const art = node.createImage()
        const plate = { art, name, ready: false }
        art.onload = () => { plate.ready = true }
        art.src = '/assets/palace-' + (index + 1) + '.webp'
        return plate
      })
      // 显影进度交给 anime：错峰由 stagger 给，曲线由 easing 给，画布只读结果。
      this.reveal = this.motion.stagger(plates.length, { start: 260, step: 350, duration: 570, easing: EASE.soft })
      const draw = () => {
        if (this.closed) return
        ctx.clearRect(0, 0, width, height)
        const row = height / 5
        plates.forEach(({ art, name, ready }, index) => {
          const p = this.reveal[index].value
          if (!p || !ready) return
          const w = width * .97
          const h = row * .79
          const y = index * row
          const scale = Math.min(w / art.width, h / art.height)
          const dx = art.width * scale
          const dy = art.height * scale
          const left = (width - dx) / 2
          const top = y + (h - dy) / 2
          // 使用错开的扫描带露出已有画笔纹理，笔触边缘呈不规则推进。
          ctx.save()
          ctx.globalAlpha = .42 + p * .53
          if (this.glow.value) { ctx.shadowColor = "#d6b678"; ctx.shadowBlur = 9 * this.glow.value }
          if (p < 1) {
            ctx.beginPath()
            for (let band = 0; band < 14; band++) {
              const shift = Math.sin(band * 2.25) * .09 * Math.sin(Math.PI * p)
              ctx.rect(left, top + band * dy / 14, dx * Math.max(0, Math.min(1, p + shift)), dy / 14 + .6)
            }
            ctx.clip()
          }
          ctx.drawImage(art, left, top, dx, dy)
          ctx.restore()
          ctx.globalAlpha = p
          ctx.fillStyle = '#e1cba4'
          ctx.font = '10px serif'
          ctx.fillText(name, 7, y + row * .94)
          ctx.globalAlpha = 1
        })
        if (!this.revealed) this.frameTimer = setTimeout(draw, 32)
      }
      draw()
    })
  },
  advance() {
    // 显影收束前的点击一律忽略：那时页面上还没有入口，误触不应换页。
    if (this.data.leaving || (!this.data.ready && !this.data.failed)) return
    this.setData({ leaving: true, failed: false })
    // 退场淡出与重定向重叠：淡到一半就换页，由选择页的入场接着往上抬，中间不留黑场。
    this.motion.cue([{ gap: BEAT.handoff, run: () => wx.redirectTo({
      url: '/pages/choose/index',
      fail: () => this.setData({ leaving: false, failed: true })
    }) }])
  },
  onUnload() {
    this.closed = true
    if (this.motion) this.motion.kill()
    clearTimeout(this.frameTimer)
  },
  glow: { value: 0 }
})
