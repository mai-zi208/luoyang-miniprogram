/* anime.js 只认 DOM，而小程序逻辑层拿不到 WXSS 元素，所以这里只用它的值模式：
   被驱动的是普通数字，逐帧结果只落到 setData 或 canvas。元素级的位移和错峰仍归 WXSS keyframes。 */

// 逻辑层没有 window / document / requestAnimationFrame，libs/anime.min.js 内已把这些裸引用
// 换成 typeof 守卫与 setTimeout 兜底，因此这里无需再向全局打桩。
const anime = require('../libs/anime.min.js')

// 与 app.wxss 的 --ease 同一套手感；CSS 表达不了的弹簧曲线留在这里。
const EASE = {
  out: 'easeOutCubic',
  soft: 'easeOutExpo',
  inOut: 'easeInOutSine',
  spring: 'spring(1, 80, 12, 0)',
  springy: 'spring(1, 140, 13, 0)'
}

// 转场时序集中一处：退场、导航、入场按节拍重叠，不再每页各写一份数字。
const BEAT = { exit: 200, handoff: 140, sweep: 690, enter: 420, stagger: 70, flip: 240 }

// 绑定到某个 Page 或 Component：它名下的动画可在 onUnload / detached 一次收回。
const bind = scope => {
  const live = new Set()
  const play = params => {
    const done = params.complete
    const anim = anime({
      ...params,
      complete: instance => {
        live.delete(anim)
        if (done) done(instance)
      }
    })
    live.add(anim)
    return anim
  }

  return {
    // 把 data 上的一个数字补间到新值：只在取值真的变了时才 setData。
    number(key, to, options = {}) {
      const holder = { value: Number(scope.data[key]) || 0 }
      let last = holder.value
      const anim = play({
        targets: holder,
        value: to,
        round: options.round || 1,
        duration: options.duration === undefined ? BEAT.enter : options.duration,
        easing: options.easing || EASE.out,
        update: () => {
          if (holder.value === last) return
          last = holder.value
          scope.setData({ [key]: last })
        },
        complete: () => {
          if (last !== to) scope.setData({ [key]: to })
        }
      })
      return anim
    },
    // 交出一串进度值，每个各自从 from 走到 to，起始按 step 递增；调用方按序读取。
    stagger(count, options = {}) {
      const holders = Array.from({ length: count }, () => ({ value: options.from || 0 }))
      play({
        targets: holders,
        value: options.to === undefined ? 1 : options.to,
        duration: options.duration || BEAT.enter,
        delay: anime.stagger(options.step || BEAT.stagger, { start: options.start || 0 }),
        easing: options.easing || EASE.out,
        complete: options.onComplete
      })
      return holders
    },
    // 直接补间调用方持有的对象，供 canvas 与立绘这类不经 setData 的帧循环读取。
    drive(target, options) {
      return play({ targets: target, ...options })
    },
    // 编排节拍：steps 形如 [{ gap, run }]，gap 是距上一步的等待毫秒。
    // 用 complete 而非 begin 收拍：begin 只表示"已起头"，同一 tick 里所有子项都会一起触发。
    cue(steps) {
      const tl = anime.timeline({ autoplay: false })
      steps.forEach(step => tl.add({ targets: {}, duration: Math.max(1, step.gap || 0), complete: () => step.run && step.run() }))
      tl.play()
      live.add(tl)
      return tl
    },
    kill() {
      live.forEach(anim => anim.pause())
      live.clear()
    }
  }
}

module.exports = { bind, EASE, BEAT, anime }
