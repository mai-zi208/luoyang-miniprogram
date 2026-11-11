const { resolveStops, durations } = require('../../data/tour')
const { endpoint, askGuide, localAnswer } = require('../../services/dialogue')

const { bind, BEAT } = require('../../utils/motion')

Page({
  data: { route: [], stop: null, index: 0, messages: [], draft: '', waiting: false, failedQuestion: '', online: Boolean(endpoint), flipping: false },
  onLoad(options) {
    this.motion = bind(this)
    const route = resolveStops((options.ids || '').split(','))
    if (!durations.some(mode => mode.count === route.length)) return
    this.setData({ route })
    this.showStop(0)
  },
  onUnload() {
    this.closed = true
    this.motion.kill()
    if (this.task) this.task.abort()
  },
  addMessage(role, content) {
    const id = (this.messageId || 0) + 1
    this.messageId = id
    // 只保留近期消息，避免长时间使用时反复传输很大的页面数据。
    const messages = [...this.data.messages.slice(-59), { id, role, content }]
    this.setData({ messages, anchor: 'message-' + id })
  },
  showStop(index) {
    const stop = this.data.route[index]
    this.setData({ index, stop, failedQuestion: '', flipping: true })
    // 故事文稿常驻讲解卡，消息流只留问答与传说；标题先沉再起，传说隔一拍落下。
    // 连点站点轨时掐掉上一站没讲完的那一拍，不补发旧站点的传说。
    if (this.reveal) this.reveal.pause()
    this.reveal = this.motion.cue([
      { gap: BEAT.flip, run: () => this.setData({ flipping: false }) },
      { gap: 260, run: () => { if (stop.legend) this.addMessage('assistant', '【传说】' + stop.legend) } }
    ])
  },
  jumpStop(event) {
    const index = Number(event.currentTarget.dataset.i)
    if (index !== this.data.index && this.data.route[index]) this.showStop(index)
  },
  typeQuestion(event) { this.setData({ draft: event.detail.value }) },
  send(event) { this.ask(((event.detail && event.detail.value) || this.data.draft).trim()) },
  askPreset(event) { this.ask(event.currentTarget.dataset.question) },
  retry() { this.ask(this.data.failedQuestion, true) },
  ask(question, retry = false) {
    const { stop, route, index, waiting, messages } = this.data
    if (!stop || waiting || !question) return
    const history = (retry ? messages.slice(0, -1) : messages).slice(-8).map(({ role, content }) => ({ role, content }))
    if (!retry) this.addMessage('user', question)
    this.setData({ draft: '', failedQuestion: '' })
    if (!endpoint) return this.addMessage('assistant', localAnswer(stop, question, route[index + 1], route))
    this.setData({ waiting: true })
    this.task = askGuide(stop, question, history, answer => {
      if (this.closed) return
      this.setData({ waiting: false })
      this.addMessage('assistant', answer)
    }, () => {
      if (!this.closed) this.setData({ waiting: false, failedQuestion: question })
    })
  },
  openMap() {
    const ids = this.data.route.map(stop => stop.id)
    wx.navigateTo({ url: '/pages/map/index?ids=' + ids.join(','), fail: () => wx.showToast({ title: '地图没打开，请再试', icon: 'none' }) })
  }
})
