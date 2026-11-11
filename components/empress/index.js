const { bind, EASE } = require('../../utils/motion')
const pulse = (time, center, width) => Math.max(0, 1 - Math.abs(time - center) / width)
const smooth = value => value * value * (3 - 2 * value)

Component({
  properties: {
    closeup: { type: Boolean, value: false },
    mouth: { type: Number, value: 0 },
    // 挥手高度交给弹簧曲线：原先的指数平滑没有回落，抬起来就硬停在那里。
    greet: { type: Boolean, value: false, observer(on) {
      if (this.motion) this.motion.drive(this.lift, { value: on ? 1 : 0, easing: EASE.spring })
    } }
  },
  data: { ready: false },
  lifetimes: {
    ready() {
      this.motion = bind(this)
      this.lift = { value: 0 }
      this.createSelectorQuery().select('#figure').fields({ node: true, size: true }).exec(results => {
        const result = results && results[0]
        if (this.detached || !result || !result.node || !result.width || !result.height) return
        const { node, width, height } = result
        const ratio = Math.min(2, wx.getWindowInfo ? wx.getWindowInfo().pixelRatio || 1 : 1)
        node.width = width * ratio
        node.height = height * ratio
        const ctx = node.getContext('2d')
        if (!ctx) return
        ctx.scale(ratio, ratio)
        const art = node.createImage()
        art.onload = () => {
          if (this.detached) return
          this.scene = { ctx, art, width, height, started: Date.now() }
          this.paint()
          this.setData({ ready: true })
        }
        art.src = '/assets/empress.webp'
      })
    },
    detached() { this.detached = true; clearTimeout(this.frame); if (this.motion) this.motion.kill() }
  },
  pageLifetimes: {
    hide() { this.hidden = true; clearTimeout(this.frame) },
    show() { this.hidden = false; if (this.scene) this.paint() }
  },
  methods: {
    paint() {
      clearTimeout(this.frame)
      if (this.detached || this.hidden) return
      const { ctx, art, width, height, started } = this.scene
      const time = (Date.now() - started) / 1000
      const w = this.properties.closeup ? Math.min(width * 1.42, height * 1.02) : Math.min(width * .97, height * .592)
      const h = w / .6
      const x = (width - w) / 2
      const y = this.properties.closeup ? 5 : height - h
      const breath = Math.sin(time * 1.52) * .003
      const head = Math.sin(time * .78) * .007
      const sleeve = Math.sin(time * 1.31 + .6) * .009
      const liftNow = this.lift.value * .017
      ctx.clearRect(0, 0, width, height)

      // 将一张连续插画分成细带并缓动，保留脸部、衣料和手部原有纹理。
      const pose = f => ({
        x: head * Math.max(0, 1 - f / .27) + sleeve * pulse(f, .52, .27),
        y: -breath * (1 - f) - (liftNow + Math.sin(time * .95) * .003) * pulse(f, .40, .17)
      })
      for (let i = 0; i < 48; i++) {
        const from = i / 48
        const to = (i + 1) / 48
        const a = pose(from)
        const b = pose(to)
        ctx.drawImage(art, 0, from * art.height, art.width, (to - from) * art.height,
          x + (a.x + b.x) * w / 2, y + (from + a.y) * h, w, (to + b.y - from - a.y) * h + .32)
      }

      // 眼部在一次眨眼中短暂压合。唇部开合由真实讲解音轨驱动。
      const blink = smooth(pulse(time % 4.9, 2.15, .13))
      if (blink > .02) {
        for (const eye of [{x:.493,y:.120,w:.040},{x:.551,y:.122,w:.034}]) {
          const eyePose = pose(eye.y)
          const left = x + (eye.x - eye.w / 2 + eyePose.x) * w
          const top = y + (eye.y + eyePose.y - .003) * h
          ctx.save()
          ctx.beginPath()
          ctx.ellipse(left + eye.w * w / 2, top + .003 * h, eye.w * w / 2, .005 * h, 0, 0, Math.PI * 2)
          ctx.clip()
          ctx.globalAlpha = blink
          ctx.drawImage(art, (eye.x - eye.w / 2) * art.width, (eye.y - .010) * art.height,
            eye.w * art.width, .006 * art.height, left, top - .003 * h, eye.w * w, .013 * h)
          ctx.fillStyle = '#4c2728'
          ctx.fillRect(left + .004 * w, top + .004 * h, (eye.w - .008) * w, Math.max(.4, .0011 * h))
          ctx.restore()
        }
      }
      const mouth = this.properties.mouth / 9
      if (mouth > 0) {
        const mouthPose = pose(.155)
        const mx = x + (.522 + mouthPose.x) * w
        const my = y + (.156 + mouthPose.y) * h
        ctx.fillStyle = '#431e26'
        ctx.beginPath()
        ctx.ellipse(mx, my, (.011 + .006 * mouth) * w, (.0008 + .0063 * mouth) * h, -.06, 0, Math.PI * 2)
        ctx.fill()
        if (mouth > .55) {
          ctx.fillStyle = '#ba8d7f'
          ctx.beginPath()
          ctx.ellipse(mx, my + h * .001, w * .008, h * .0014, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      this.frame = setTimeout(() => this.paint(), 45)
    }
  }
})
