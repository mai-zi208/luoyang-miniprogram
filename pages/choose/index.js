const { stops, durations, resolveStops } = require('../../data/tour')
const { readRecord, writeRecord, failureMessage } = require('../../utils/record')

const { bind, EASE, BEAT } = require('../../utils/motion')

Page({
  data: { durations, choices: stops, route: [], count: 0, ids: [], picked: 0, notice: '', opening: false, turning: false, saved: false, stage: 'duration' },
  onLoad() {
    this.motion = bind(this)
    const saved = readRecord().tour
    if (!saved || !Array.isArray(saved.ids) || !durations.some(mode => mode.count === saved.count)) return
    this.updateChoices(saved.count, resolveStops(saved.ids).slice(0, saved.count).map(stop => stop.id))
    this.setData({ saved: true })
  },
  onUnload() { this.motion.kill() },
  updateChoices(count, ids) {
    const choices = stops.map(stop => ({ id: stop.id, name: stop.name, order: ids.indexOf(stop.id) + 1 }))
    const route = ids.map(id => stops.find(stop => stop.id === id)).filter(Boolean)
    this.setData({ count, ids, choices, route, notice: '', saved: false })
    this.motion.number('picked', ids.length, { duration: 420, easing: EASE.springy })
  },
  // 用退场时间隔开两个阶段，页面任一时刻只显示一张选择卡（与 --t-2 对齐）。
  turn(stage) {
    if (this.data.turning || this.data.opening) return
    this.setData({ turning: true })
    this.motion.cue([{ gap: BEAT.flip, run: () => this.setData({ stage, turning: false }) }])
  },
  chooseDuration(event) {
    if (this.data.turning || this.data.stage !== 'duration') return
    const count = Number(event.currentTarget.dataset.count)
    if (!durations.some(mode => mode.count === count)) return
    const previous = this.data.ids
    const ids = previous.slice(0, count)
    this.updateChoices(count, ids)
    if (ids.length < previous.length) this.setData({ notice: '已按新时长保留前 ' + count + ' 站。' })
    this.turn('stops')
  },
  editDuration() { this.turn('duration') },
  // 进度轨三段皆可点：回到时长、进入景点、或直接启程，省去找按钮。
  jumpStage(event) {
    const stage = event.currentTarget.dataset.stage
    if (stage === 'duration') return this.data.stage === 'duration' ? undefined : this.turn('duration')
    if (stage === 'stops') {
      if (!this.data.count) return this.setData({ notice: '先择一个游历时长。' })
      return this.data.stage === 'stops' ? undefined : this.turn('stops')
    }
    this.startTour()
  },
  backToIntro() {
    wx.reLaunch({ url: '/pages/intro/index', fail: () => wx.showToast({ title: '没回到欢迎页，请再试', icon: 'none' }) })
  },
  toggleStop(event) {
    const id = Number(event.currentTarget.dataset.id)
    const { count, ids, stage, opening, turning } = this.data
    if (stage !== 'stops' || opening || turning || !stops.some(stop => stop.id === id)) return
    if (ids.includes(id)) return this.updateChoices(count, ids.filter(item => item !== id))
    if (ids.length === count) return this.setData({ notice: '已选满，取消一处后可换选。' })
    this.updateChoices(count, [...ids, id])
  },
  startTour() {
    const { ids, count, opening, stage, turning } = this.data
    if (opening || turning || stage !== 'stops' || !count || ids.length !== count) return
    const saved = writeRecord({ tour: { ids, count } })
    this.setData({ opening: true, notice: saved ? '' : failureMessage })
    // 扫光走到六成便发起导航：原生推入压在扫光尾段上，两段动作叠成一次位移而不是先后两下。
    this.motion.cue([{ gap: Math.round(BEAT.sweep * .62), run: () => wx.navigateTo({
      url: '/pages/dialogue/index?ids=' + ids.join(','),
      fail: () => this.setData({ notice: '对话页没打开，请再试一次。' }),
      complete: () => this.setData({ opening: false })
    }) }])
  }
})
